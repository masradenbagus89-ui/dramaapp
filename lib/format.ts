// Helper format angka tampilan (views) — dipakai bersama oleh halaman admin,
// beranda, dan katalog beranda (lib/beranda-catalog.ts). Fungsi murni (tanpa
// DOM/server), jadi aman dipakai di server component maupun client component.

/** Ubah teks views ("1.2M", "850K", "1.5B", "1200") jadi angka. */
export function parseViews(s: string): number {
  const m = s.trim().match(/^([0-9.]+)\s*([kKmMbB]?)$/);
  if (!m) return Number(s) || 0;
  const num = parseFloat(m[1]);
  const u = m[2].toLowerCase();
  const mult = u === "b" ? 1_000_000_000 : u === "m" ? 1_000_000 : u === "k" ? 1_000 : 1;
  return num * mult;
}

/** Ubah angka jadi teks ringkas ("1.2M", "850.0K", ...). */
export function formatViews(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

/** Ubah judul jadi slug URL-aman ("Drama Keren!" -> "drama-keren"). */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Ubah detik jadi waktu tampilan "m:ss" (mis. 83 -> "1:23"). Negatif/NaN -> "0:00". */
export function fmtTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** Ubah teks rating IMDb ("7.8", "7,8") jadi angka. Kosong/tidak valid -> 0. */
export function parseRating(s?: string): number {
  if (!s) return 0;
  const n = parseFloat(s.trim().replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

// --- Durasi tayangan --------------------------------------------------------
// Katalog menyimpan durasi apa adanya dari OMDb, dalam bentuk teks "165 min"
// (lihat lib/imdb-tool.ts -> `runtime`). Lencana poster memintanya dalam bentuk
// jam:menit ("02:45"), jadi terjemahannya ditaruh di sini — bukan di komponen —
// supaya satu aturan dipakai semua tampilan dan bisa diuji tanpa browser.

/**
 * Baca durasi dalam MENIT dari teks bebas. `null` = tidak bisa dibaca.
 *
 * Bentuk yang ditangani: "165 min" (OMDb), "165min", "165 menit", "165",
 * "2h 45m", "2 jam 45 menit". Bentuk yang SENGAJA dipulangkan `null`: "N/A"
 * (nilai kosong khas OMDb), teks tanpa angka, dan 0/negatif.
 *
 * Kenapa `null`, bukan 0: 0 akan tergambar sebagai "00:00" di poster — sebuah
 * angka yang terlihat sah padahal artinya "kami tak tahu". `null` membuat
 * lencananya hilang, dan itu jujur.
 */
export function menitDariRuntime(runtime?: string | null): number | null {
  if (!runtime) return null;
  const teks = runtime.trim().toLowerCase();
  if (!teks || teks === "n/a") return null;

  // Bentuk berjam dulu ("2h 45m", "2 jam 45 menit", "2 hours 45") — kalau dicek
  // belakangan, pola angka-polos di bawah akan menelan "2" dan mengira durasinya
  // 2 menit. Satuan jam ditulis lengkap variannya sejak kolom Durasi bisa
  // diketik bebas owner di panel admin — bukan lagi cuma "165 min" dari OMDb.
  const berjam = teks.match(/(\d+)\s*(?:h(?:r|rs|our|ours)?|jam)\b\s*(\d+)?/);
  if (berjam) {
    const jam = Number(berjam[1]);
    const menit = berjam[2] ? Number(berjam[2]) : 0;
    const total = jam * 60 + menit;
    return total > 0 ? total : null;
  }

  const angka = teks.match(/(\d+)/);
  if (!angka) return null;
  const total = Number(angka[1]);
  return Number.isFinite(total) && total > 0 ? total : null;
}

/**
 * Ubah menit jadi teks lencana "jam:menit" berpadding — 165 -> "02:45".
 *
 * Sengaja BUKAN `fmtTime` di atas: yang itu memformat posisi pemutar dalam
 * DETIK ("1:23" = 1 menit 23 detik). Dua satuan berbeda dengan bentuk keluaran
 * mirip = sumber salah pakai, jadi keduanya dipisah dan diberi nama yang
 * menyebut satuannya.
 */
export function formatJamMenit(menit: number): string {
  const aman = Math.max(0, Math.floor(menit));
  const jam = Math.floor(aman / 60);
  const sisa = aman % 60;
  return `${String(jam).padStart(2, "0")}:${String(sisa).padStart(2, "0")}`;
}
