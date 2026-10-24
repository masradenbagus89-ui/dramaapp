// -------------------------------------------------------------------------
// Alamat sumber video (base URL) — dibaca saat REQUEST, bukan dibakar saat build.
//
// KENAPA ADA: `NEXT_PUBLIC_VIDEO_BASE_URL` berawalan NEXT_PUBLIC_, jadi nilainya
// dicetak ke dalam bundle JavaScript saat build. Sumber video dramaapp memakai
// quick tunnel yang memberi alamat ACAK BARU tiap PC backup restart, sehingga
// tiap restart = video mati sampai alamat baru ditempel manual + redeploy
// (terjadi 3x dalam 3 hari, lihat HANDOFF.md). Dengan menyimpan alamat di
// database, PC backup bisa melapor sendiri dan video pulih tanpa redeploy.
//
// Env lama tetap dipakai sebagai FALLBACK, jadi kalau database kosong/mati
// perilakunya persis seperti sebelumnya — tidak ada yang jadi lebih buruk.
// -------------------------------------------------------------------------
import { getVideoBaseRecord } from "./store";

/**
 * Host yang boleh dijadikan sumber video. Ini PAGAR KEAMANAN, bukan kerapian:
 * endpoint /api/agent/video-base bisa mengubah alamat yang dipakai SELURUH
 * penonton, jadi tanpa daftar ini siapa pun yang memegang agent secret dapat
 * mengarahkan semua orang ke server mana pun (termasuk yang menyajikan berkas
 * berbahaya atau halaman phishing berkedok pemutar video).
 */
const DEFAULT_ALLOWED_SUFFIXES = [".trycloudflare.com", ".amasyaforum.com"];

/**
 * Host yang TIDAK PERNAH sah jadi sumber video, walau lolos suffix di atas.
 *
 * `api.trycloudflare.com` adalah endpoint API Cloudflare, bukan tunnel. Ia muncul
 * di dalam PESAN ERROR cloudflared saat pembuatan tunnel gagal:
 *   failed to request quick Tunnel: Post "https://api.trycloudflare.com/tunnel"
 * dan pernah tertangkap oleh pencari alamat di start-video-services.ps1 lalu
 * nyaris dilaporkan sebagai alamat video (kejadian nyata 2026-08-24 12:00:27).
 * Kalau tersimpan, ia menimpa alamat yang benar dan `/api/teaser` membalas 404 —
 * bukan 502 — sehingga diagnosisnya menyesatkan. Ditolak di sini sebagai lapis
 * kedua; lapis pertama ada di script PC backup.
 */
const HOST_TERLARANG = new Set(["api.trycloudflare.com"]);

/**
 * Baca daftar suffix tambahan dari env (dipisah koma). Dipakai kalau nanti
 * pindah penyedia tunnel tanpa perlu ubah kode.
 */
export function parseAllowedSuffixes(raw?: string): string[] {
  const extra = (raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    // Selalu diawali titik supaya "evil-trycloudflare.com" tidak lolos hanya
    // karena berakhiran "trycloudflare.com".
    .map((s) => (s.startsWith(".") ? s : `.${s}`));
  return [...DEFAULT_ALLOWED_SUFFIXES, ...extra];
}

/**
 * Apakah `raw` sah dipakai sebagai alamat sumber video? Fungsi MURNI supaya
 * bisa dites tanpa jaringan maupun database.
 *
 * Sengaja KETAT — base URL hanya boleh berupa origin telanjang:
 * - wajib https (http bisa disadap/diubah di tengah jalan)
 * - tanpa user:password@ (bentuk URL yang lazim dipakai menyamarkan host asli)
 * - tanpa path/query/fragment (kalau tidak, penyerang bisa menyelipkan awalan
 *   path yang mengarahkan permintaan ke tempat lain di server yang sama)
 * - tanpa port eksplisit (tunnel selalu 443; port aneh = sinyal salah pasang)
 * - host wajib berada di bawah salah satu suffix yang diizinkan
 */
export function isAllowedVideoBase(
  raw: string,
  suffixes: string[] = DEFAULT_ALLOWED_SUFFIXES,
): boolean {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 300) {
    return false;
  }

  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }

  if (u.protocol !== "https:") return false;
  if (u.username || u.password) return false;
  if (u.search || u.hash) return false;
  if (u.port) return false;
  if (u.pathname !== "/" && u.pathname !== "") return false;

  const host = u.hostname.toLowerCase();
  if (HOST_TERLARANG.has(host)) return false;
  return suffixes.some((s) => host.endsWith(s) && host.length > s.length);
}

/** Buang garis miring di akhir supaya penggabungan `${base}/${id}` tak dobel. */
export function normalizeVideoBase(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

/**
 * Alamat sumber video yang berlaku SEKARANG.
 *
 * @param opts.revalidate detik cache. Kosong = selalu segar (`no-store`).
 *   PENTING: satu fetch `no-store` membuat SELURUH halaman jadi dinamis
 *   (lihat catatan di lib/supabase.ts:51). Jadi halaman ISR seperti /beranda
 *   WAJIB mengoper angka yang sama dengan `revalidate` halamannya, supaya
 *   optimasi ISR-nya tidak ikut mati. Jalur yang wajib segar (player, route
 *   handler) memanggil tanpa opsi.
 */
export async function getVideoBaseUrl(
  opts: { revalidate?: number } = {},
): Promise<string> {
  const envFallback = normalizeVideoBase(
    process.env.NEXT_PUBLIC_VIDEO_BASE_URL ?? "",
  );

  try {
    const rec = await getVideoBaseRecord(opts);
    if (rec?.url) {
      const tersimpan = normalizeVideoBase(rec.url);

      // DIVALIDASI ULANG SAAT BACA, bukan hanya saat tulis (temuan audit
      // 2026-10-24). Sebelum ini nilai dari database dipakai apa adanya,
      // padahal allowlist cuma dipasang di jalur tulis
      // (app/api/agent/video-base/route.ts:136). Artinya baris yang pernah
      // terisi lewat jalur LAIN — SQL langsung, migrasi, dashboard Supabase,
      // atau sebelum allowlist dipasang — akan dipakai tanpa diperiksa.
      //
      // Kenapa itu serius, bukan sekadar rapi: `/api/admin/hardlink` MENGIRIM
      // `HARDLINK_AGENT_SECRET` ke host ini. Satu nilai jahat di database
      // berarti rahasia itu dikirim ke server penyerang. Pertahanan berlapis
      // (rak owasp §1) menuntut pemeriksaan di kedua sisi, bukan satu sisi.
      //
      // Daftar suffix-nya SAMA dengan jalur tulis — memakai daftar bawaan saja
      // di sini akan menolak alamat yang sah lewat VIDEO_BASE_ALLOWED_SUFFIXES
      // dan mematikan video tanpa sebab.
      const suffixes = parseAllowedSuffixes(
        process.env.VIDEO_BASE_ALLOWED_SUFFIXES,
      );
      if (isAllowedVideoBase(tersimpan, suffixes)) return tersimpan;

      // Tidak lolos → abaikan, jatuh ke env di bawah. Sengaja TIDAK dikosongkan
      // paksa: env diisi owner di panel hosting, jadi ia sumber yang lebih
      // tepercaya daripada baris database yang gagal periksa.
    }
  } catch {
    // Database mati/tak terjangkau bukan alasan mematikan video: jatuh ke env
    // (perilaku lama). Sengaja diam — jalur ini dipanggil tiap render halaman,
    // jadi mencatat log di sini akan membanjiri log tanpa menambah informasi.
  }

  return envFallback;
}
