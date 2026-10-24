// Gerbang paywall SISI SERVER untuk route yang menunjuk berkas episode.
//
// KENAPA ADA (audit keamanan 2026-10-24): sampai hari ini paywall HANYA
// ditegakkan di browser — app/components/FeedPlayer.tsx:315 memanggil
// `v.pause()` pada episode terkunci, sementara /api/teaser & /api/download
// menyerahkan alamat `.mp4` untuk episode APA PUN kepada pemanggil anonim.
// Bukan teoretis: diuji di produksi, episode 99 judul premium dijawab 307
// tanpa satu pun cookie. Pagar yang hanya ada di klien bukan pagar — ini
// broken access control, nomor 1 di OWASP Top 10:2025 (rak owasp §1).
//
// ⚠️ BATAS JUJUR — berkas ini TIDAK menutup seluruh bypass, dan jangan dicatat
// sebagai "paywall sudah aman". FeedPlayer tetap menulis alamat tunnel LANGSUNG
// ke dalam halaman (lib/video.ts:12 lewat `videoSrc`, dipakai di
// FeedPlayer.tsx:114,519), jadi alamat episode terkunci masih terbaca dari View
// Source dan TIDAK melewati gerbang ini sama sekali. Penutupan penuh menuntut
// tunnel di PC backup menolak permintaan tanpa tanda tangan (URL bertanda
// tangan berumur pendek) — pekerjaan di `pc-backup-agent/`, bukan di sini.
// Yang ditutup berkas ini: jalur API yang paling mudah ditemukan, paling mudah
// dibagikan ulang, dan satu-satunya yang ikut membocorkan alamat tunnel.

import { getDramaCached } from "@/lib/dramas";
import { resolveUserEmail } from "@/lib/session";
import { getUnlocks } from "@/lib/store";
import { FREE_EPISODES, PAYWALL_ENABLED, isEpisodeLocked } from "@/lib/coins";

/**
 * Hasil gerbang. Empat nilai, bukan boolean, karena tiap sebab butuh jawaban
 * HTTP yang berbeda — dan rak owasp §2 butir 2 menegaskan 401 (belum login)
 * TIDAK boleh tertukar dengan 403 (tak berhak):
 *   - "perlu-login"         → 401, klien tahu harus menampilkan form masuk
 *   - "terkunci"            → 403, sudah login tapi episode belum dibeli
 *   - "tak-bisa-dipastikan" → 503, SERVER kita yang sakit, bukan salah penonton
 * Menyatukannya jadi satu boolean membuat gangguan database terlihat seperti
 * tuduhan "kamu belum bayar" kepada pelanggan yang sudah bayar.
 */
export type AksesEpisode =
  | "boleh"
  | "perlu-login"
  | "terkunci"
  | "tak-bisa-dipastikan";

/**
 * Apakah permintaan ini boleh menerima alamat berkas episode `ep` milik
 * `dramaId`? Aturannya SAMA PERSIS dengan yang dipakai UI — sengaja memakai
 * ulang `isEpisodeLocked` (lib/coins.ts:64) alih-alih menulis aturan kedua,
 * supaya server dan tampilan tak pernah bisa berbeda pendapat.
 *
 * Fungsi ini MEMBACA saja: nol tulis, nol efek samping — aman dipanggil dari
 * route GET, dan pemanggil tak ikut mengubah keadaan hanya karena bertanya.
 */
export async function periksaAksesEpisode(
  req: Request,
  dramaId: string,
  ep: number,
): Promise<AksesEpisode> {
  // Jalan pintas SENGAJA — jangan dihapus demi "biar seragam".
  //
  // Episode dalam jatah gratis tidak mungkin terkunci (lib/coins.ts:72), jadi
  // nol query. Ini bukan optimasi kosmetik: teaser hero & cuplikan hover kartu
  // SELALU ep 1 (lib/hero-teaser.ts:77 — `ep = 1` bawaan, dan ketiga
  // pemanggilnya tak pernah mengisinya), dan tombol unduh halaman detail dipaku
  // ep 1 (lib/video.ts:64). Ketiganya dipakai pengunjung yang BELUM login di
  // halaman paling ramai. Menambah query database di situ = menambah latensi
  // plus titik gagal baru pada jalur yang sebelumnya tak pernah menyentuh
  // database sama sekali.
  if (!PAYWALL_ENABLED || ep <= FREE_EPISODES) return "boleh";

  try {
    // Dicoba apa adanya DULU, baru huruf kecil. KENAPA dua kali: `ID_RE` di
    // kedua route menerima huruf besar (`/^[a-z0-9-]+$/i`) sedangkan id katalog
    // umumnya slug huruf kecil. Tanpa percobaan huruf kecil, "Judul-Premium"
    // lolos gerbang — katalognya tak ketemu sehingga `premium` terbaca false,
    // padahal filesystem Windows di PC backup tetap menyajikan berkasnya.
    // Lookup kedua hanya terjadi di jalur episode BERBAYAR (sudah lewat jalan
    // pintas di atas), jadi tak membebani halaman publik.
    const kecil = dramaId.toLowerCase();
    const drama =
      (await getDramaCached(dramaId)) ??
      (kecil === dramaId ? undefined : await getDramaCached(kecil));

    // Drama non-premium — atau yang tak ada di katalog — tak punya paywall
    // untuk ditegakkan. Aturan yang sama dipakai app/api/coins/unlock/route.ts:47.
    //
    // Batas yang DIKETAHUI: drama yang id-nya ber-huruf besar DI KATALOG tetap
    // tak bisa dicocokkan dari permintaan huruf kecil. Dibiarkan karena
    // app/api/admin/drama/route.ts:185 memang belum memaksa pola id, dan
    // menutupnya di sini berarti memuat SELURUH katalog tiap permintaan
    // berbayar. Cara naik kelas yang benar: paksa pola `^[a-z0-9-]+$` di
    // gerbang TULIS, bukan menambal di gerbang baca.
    if (!drama?.premium) return "boleh";

    const id = await resolveUserEmail(req);
    if (!id) return "perlu-login";
    if (id.isAdmin) return "boleh"; // admin bebas, sama seperti aturan UI

    const tokens = await getUnlocks(id.email);
    const awalan = `${kecil}:`;
    const dibuka = new Set<number>();
    for (const t of tokens) {
      // Dicocokkan TANPA peduli huruf besar/kecil: token disimpan apa adanya
      // dari body pemanggil (app/api/coins/unlock/route.ts:36 hanya `trim`,
      // tidak `toLowerCase`), jadi perbandingan sensitif-huruf bisa memblokir
      // penonton yang SUDAH MEMBAYAR. Salah di sisi ini merugikan pelanggan,
      // jadi kelonggarannya di sini disengaja.
      if (!t.toLowerCase().startsWith(awalan)) continue;
      const n = Number(t.slice(awalan.length));
      if (Number.isInteger(n)) dibuka.add(n);
    }

    return isEpisodeLocked(ep, {
      premium: true,
      isAdmin: false,
      unlocked: dibuka,
    })
      ? "terkunci"
      : "boleh";
  } catch {
    // GAGAL-TUTUP, dan ini keputusan sadar (rak owasp §1 — A10:2025
    // fail-open DILARANG): kalau katalog atau dompet tak terjangkau, kita TIDAK
    // TAHU apakah episode ini sudah dibayar. Meloloskannya berarti gangguan
    // database menjadi tombol "semua episode gratis" — dan gangguan semacam itu
    // bisa dipicu dari luar. Harganya jujur: selama gangguan, penonton yang
    // sudah bayar ikut tertahan. Karena itu pemanggil membalas 503 (sementara),
    // BUKAN 403 — supaya penonton tidak dituduh belum bayar oleh server yang
    // sedang sakit.
    return "tak-bisa-dipastikan";
  }
}

/**
 * Balasan HTTP baku untuk hasil gerbang yang bukan "boleh".
 *
 * Dipisah supaya kedua route (/api/teaser & /api/download) tak pernah berbeda
 * kode status maupun kata-kata — pesan yang beda-beda per endpoint membuat bug
 * paywall sulit dikenali dari log.
 */
export function balasanAksesDitolak(hasil: Exclude<AksesEpisode, "boleh">): {
  pesan: string;
  status: 401 | 403 | 503;
} {
  switch (hasil) {
    case "perlu-login":
      return {
        pesan: "Masuk dulu untuk menonton episode ini.",
        status: 401,
      };
    case "terkunci":
      return {
        pesan: "Episode ini terkunci. Buka dulu dengan koin untuk menontonnya.",
        status: 403,
      };
    case "tak-bisa-dipastikan":
      return {
        pesan:
          "Belum bisa memastikan episode ini sudah dibuka. Coba lagi sebentar lagi.",
        status: 503,
      };
  }
}
