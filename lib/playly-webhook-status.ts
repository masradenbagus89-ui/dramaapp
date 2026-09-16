// Peringkas keadaan webhook Playly untuk halaman /admin/webhooks/playly.
//
// KENAPA dipisah dari komponen: percabangan "kosong karena kunci belum
// dipasang" vs "kosong karena Playly belum pernah mengirim" adalah inti guna
// halaman itu — keduanya terlihat sama di layar (daftar kosong) tapi langkah
// perbaikannya berbeda total. Sebagai fungsi murni ia bisa diuji tanpa database
// maupun React, persis pola lib/playly-status.ts.
//
// 🔒 KEAMANAN — kontrak yang TIDAK BOLEH dilanggar: fungsi di berkas ini
// menerima `kunciTerpasang: boolean`, BUKAN nilai PLAYLY_WEBHOOK_SECRET-nya.
// Hasil fungsi ini menyeberang ke browser, jadi bentuk boolean itulah yang
// menjamin kuncinya tak punya jalan untuk ikut terbawa — bukan sekadar
// "kita ingat untuk tidak mengirimnya".
import type { PlaylyWebhookVideo } from "./store";

/**
 * Tiga keadaan yang perlu dibedakan admin, karena LANGKAHNYA berbeda:
 * - "kunci-belum-dipasang" -> endpoint membalas 503 ke Playly; pasang env dulu.
 * - "belum-ada-kiriman"    -> pintunya siap, tapi Playly belum pernah mengetuk.
 * - "menerima"             -> sudah ada video yang masuk lewat webhook.
 */
export type StatusWebhook = "kunci-belum-dipasang" | "belum-ada-kiriman" | "menerima";

/** Satu baris webhook dalam bentuk yang AMAN dikirim ke browser admin. */
export type WebhookVideoTampil = {
  videoId: string;
  title: string;
  status: PlaylyWebhookVideo["status"];
  /** Sudah diformat di server (WIB) supaya tak ada beda server-vs-browser. */
  diterimaLabel: string;
  durasiLabel: string | null;
  creator: string | null;
};

// Catatan sengaja: "sedang disembunyikan atau tidak" TIDAK ditaruh di bentuk di
// atas. Daftar sembunyi berubah saat admin menekan tombol, jadi kalau nilainya
// ikut menempel di tiap baris akan ada DUA sumber untuk satu fakta yang sama —
// dan dua sumber itu pasti berbeda begitu salah satunya diperbarui. Komponen
// menerima daftar id tersembunyi secara terpisah dan itulah satu-satunya acuan.

export type RingkasanWebhook = {
  status: StatusWebhook;
  /** Video berstatus published DAN tidak disembunyikan admin — yang benar-benar tampil. */
  jumlahTampil: number;
  /** Published tapi disembunyikan admin. */
  jumlahDisembunyikan: number;
  /** Sudah ditarik Playly (unpublished). Barisnya sengaja disimpan, bukan dihapus. */
  jumlahDitarik: number;
  /** Notifikasi terakhir yang pernah diterima (sudah diformat WIB); null = belum pernah. */
  terakhirLabel: string | null;
  pesan: string;
};

/**
 * Zona waktu dipaku ke WIB, bukan mengikuti mesin yang merender.
 *
 * Halaman ini adalah server component: kalau formatnya mengikuti zona waktu
 * server (Vercel = UTC), admin di Indonesia membaca jam yang meleset 7 jam dan
 * mengira notifikasi datang di waktu yang salah. Dipaku juga berarti hasilnya
 * sama setiap kali dirender — tidak ada beda server-vs-browser yang membuat
 * React mengeluh saat hydration.
 */
const ZONA_WIB = "Asia/Jakarta";

/** Ubah ISO jadi "16 Sep 2026, 14.05 WIB". Tanggal rusak -> null, bukan "Invalid Date". */
export function formatWaktuWIB(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return null;
  const teks = t.toLocaleString("id-ID", {
    timeZone: ZONA_WIB,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${teks} WIB`;
}

/** Detik -> "12:34" / "1:02:03". Null/negatif -> null (jangan karang "0:00"). */
export function formatDurasi(detik: number | null): string | null {
  if (detik === null || !Number.isFinite(detik) || detik <= 0) return null;
  const total = Math.floor(detik);
  const j = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const d = total % 60;
  const dd = String(d).padStart(2, "0");
  return j > 0 ? `${j}:${String(m).padStart(2, "0")}:${dd}` : `${m}:${dd}`;
}

/**
 * Ubah baris simpanan jadi bentuk siap tampil — sekaligus GERBANG KOLOM.
 *
 * Yang diambil hanya field yang benar-benar digambar. `description`,
 * `embedUrl`, dan `thumbnailUrl` sengaja TIDAK ikut: ketiganya tidak dipakai di
 * layar ini, dan apa pun yang ikut terkirim tetap terbaca di network tab
 * browser walau tak tergambar (rak admin-panel §2 butir 3 — whitelist kolom,
 * bukan blacklist).
 */
export function keBentukTampil(v: PlaylyWebhookVideo): WebhookVideoTampil {
  return {
    videoId: v.videoId,
    title: v.title,
    status: v.status,
    diterimaLabel: formatWaktuWIB(v.receivedAt) ?? "waktu tidak terbaca",
    durasiLabel: formatDurasi(v.durationSeconds),
    creator: v.creator,
  };
}

/**
 * Ringkas keadaan webhook jadi satu objek yang menjawab "kenapa daftarnya
 * begini" — bukan sekadar menghitung baris.
 *
 * Urutan pemeriksaannya disengaja: kunci diperiksa DULUAN, sebelum jumlah
 * video. Alasannya, tanpa kunci endpoint membalas 503 ke Playly sehingga daftar
 * PASTI kosong — melaporkan "belum ada kiriman" di keadaan itu menyesatkan,
 * karena membuat admin menunggu sesuatu yang tak akan pernah datang.
 */
export function ringkasWebhookPlayly(
  kunciTerpasang: boolean,
  videos: PlaylyWebhookVideo[],
  hiddenIds: string[],
): RingkasanWebhook {
  const hidden = new Set(hiddenIds);
  const published = videos.filter((v) => v.status === "published");
  const jumlahDisembunyikan = published.filter((v) => hidden.has(v.videoId)).length;
  const jumlahTampil = published.length - jumlahDisembunyikan;
  const jumlahDitarik = videos.filter((v) => v.status === "unpublished").length;

  // Notifikasi TERAKHIR = receivedAt terbesar. Dihitung dari seluruh baris
  // (termasuk yang ditarik), sebab notifikasi unpublish juga bukti pintunya
  // hidup — itulah yang ingin diketahui admin dari angka ini.
  const terakhirIso = videos.reduce<string | null>((paling, v) => {
    if (!v.receivedAt) return paling;
    return paling === null || v.receivedAt > paling ? v.receivedAt : paling;
  }, null);

  if (!kunciTerpasang) {
    return {
      status: "kunci-belum-dipasang",
      jumlahTampil,
      jumlahDisembunyikan,
      jumlahDitarik,
      terakhirLabel: formatWaktuWIB(terakhirIso),
      pesan:
        "Kunci PLAYLY_WEBHOOK_SECRET belum dipasang di server, jadi setiap " +
        "notifikasi dari Playly ditolak dengan balasan 503 — termasuk yang asli.",
    };
  }

  if (videos.length === 0) {
    return {
      status: "belum-ada-kiriman",
      jumlahTampil: 0,
      jumlahDisembunyikan: 0,
      jumlahDitarik: 0,
      terakhirLabel: null,
      pesan:
        "Kunci sudah terpasang dan pintunya siap menerima, tapi Playly belum " +
        "pernah mengirim notifikasi ke alamat ini.",
    };
  }

  return {
    status: "menerima",
    jumlahTampil,
    jumlahDisembunyikan,
    jumlahDitarik,
    terakhirLabel: formatWaktuWIB(terakhirIso),
    pesan: "",
  };
}
