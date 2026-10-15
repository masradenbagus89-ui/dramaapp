/**
 * Identitas situs untuk SEO — SATU sumber, jangan hardcode URL di tempat lain.
 * Dipakai metadataBase, canonical, sitemap, robots, dan preview share (OG).
 *
 * Pindah domain cukup set NEXT_PUBLIC_SITE_URL di panel hosting — tanpa ubah kode.
 * Prosedur + urutan yang tak boleh dibalik: docs/migrasi-railway-tahap6-pindah-domain.md
 */

/**
 * Alamat cadangan kalau NEXT_PUBLIC_SITE_URL tidak diisi.
 *
 * Diubah 2026-10-15 dari `https://dramaapp.vercel.app` ke alamat Railway.
 * KENAPA: Vercel sejak 2026-10-15 hanya mengalihkan (308) ke Railway, dan akan
 * DITUTUP. Alamat cadangan yang menunjuk situs mati = canonical, sitemap, dan
 * robots.txt mengarahkan Google ke ketiadaan — tanpa satu pun gejala di layar.
 *
 * ⚠️ Ini SATU dari beberapa tempat yang menyimpan alamat situs sebagai nilai
 * cadangan. Saat domain berganti lagi, ubah SEMUANYA sekaligus — daftar
 * lengkapnya ada di docs/migrasi-railway-tahap6-pindah-domain.md
 * ("Daftar nilai cadangan").
 */
const DEFAULT_SITE_URL = "https://dramaapp-production-9e88.up.railway.app";

/**
 * Pagar untuk nilai NEXT_PUBLIC_SITE_URL. Mengembalikan pesan masalah, atau null
 * kalau tak ada masalah. Pola ini meniru periksaSetelanSupabase (lib/supabase.ts:50)
 * supaya cara kerja pagar di project ini seragam.
 *
 * KENAPA ADA: alamat situs yang salah merusak SEO secara SENYAP. Kalau nilainya
 * rusak, `new URL(SITE_URL)` di app/layout.tsx:23 memang sudah melempar — tapi
 * pesannya cuma "Invalid URL" tanpa menyebut variabel mana yang salah. Pagar ini
 * tidak menambah kegagalan baru; ia menukar pesan buntu itu dengan pesan yang
 * menyebut nama variabel + cara memperbaikinya.
 *
 * KENAPA DIAM saat nilainya KOSONG (ini keputusan, bukan kelalaian): kosong =
 * jatuh ke DEFAULT_SITE_URL, dan selama Tahap 2-5 migrasi Railway itu memang yang
 * BENAR (situs uji sengaja memberi tahu Google "aku bukan yang asli"). Pagar yang
 * berbunyi di tiap build hari ini akan berhenti dibaca orang jauh sebelum migrasi
 * sungguhan terjadi — persis penyakit yang sudah tercatat soal KEEPALIVE_SITES.
 * Kasus "lupa mengisi saat migrasi" ditangkap verifikasi curl di prosedur, bukan
 * di sini.
 *
 * KENAPA tidak bergantung NODE_ENV: Railway sengaja TIDAK menyetelnya
 * (docs/migrasi-railway-daftar-env.md, "Keputusan teknis saat eksekusi"), dan
 * aturan di bawah memang berlaku sama di komputer maupun di hosting.
 *
 * Batasnya jujur: yang diperiksa cuma BENTUKNYA. Alamat yang bentuknya sah tapi
 * SALAH SITUS (mis. masih menunjuk host lama sesudah domain pindah) TIDAK bisa
 * ketahuan dari dalam kode — hanya dari mengukur situs yang hidup.
 */
export function periksaAlamatSitus(nilai: string): string | null {
  // Belum diisi — sah, lihat "KENAPA DIAM" di atas. Variabel yang dibuat di panel
  // hosting tapi dibiarkan blank ikut ke sini: tak bisa dibedakan dari tak ada,
  // dan menggagalkan build karenanya lebih merugikan daripada jatuh ke default.
  if (!nilai.trim()) return null;

  let alamat: URL;
  try {
    alamat = new URL(nilai.trim());
  } catch {
    return `NEXT_PUBLIC_SITE_URL bukan alamat yang sah: "${nilai}". Contoh yang benar: https://dramaku.com`;
  }

  // Google menganggap http:// dan https:// sebagai dua situs berbeda, jadi skema
  // yang salah memecah peringkat pencarian. localhost dikecualikan untuk
  // `next dev` di komputer sendiri.
  const lokal = alamat.hostname === "localhost" || alamat.hostname === "127.0.0.1";
  if (alamat.protocol !== "https:" && !lokal) {
    return `NEXT_PUBLIC_SITE_URL harus https:// — dapat "${alamat.protocol}//". Google menghitung http dan https sebagai dua situs berbeda`;
  }

  return null;
}

const masalahAlamat = periksaAlamatSitus(process.env.NEXT_PUBLIC_SITE_URL ?? "");
if (masalahAlamat) {
  throw new Error(
    `[site] Alamat situs belum benar: ${masalahAlamat}. ` +
      "Perbaiki di .env.local (lokal) atau panel hosting -> Variables (produksi). " +
      "Kosongkan sama sekali kalau belum pindah domain — itu sah.",
  );
}

/** Alamat resmi situs, tanpa garis miring di ujung supaya penggabungan URL konsisten. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL
).replace(/\/+$/, "");

export const SITE_NAME = "DramaKu";

/** Batas meta description yang dipakai mesin pencari; lebih dari ini dipotong "...". */
const MAX_DESCRIPTION = 160;

/**
 * Rapikan sinopsis jadi meta description: satu baris, dipotong di batas kata
 * supaya tidak terputus di tengah kata.
 */
export function toMetaDescription(text: string, fallback: string): string {
  const clean = text?.replace(/\s+/g, " ").trim();
  if (!clean) return fallback;
  if (clean.length <= MAX_DESCRIPTION) return clean;
  const cut = clean.slice(0, MAX_DESCRIPTION);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : cut.length).trimEnd()}…`;
}

/** Ubah path relatif jadi URL absolut — OG image wajib absolut, relatif diabaikan pemindai. */
export function absoluteUrl(path: string): string {
  return path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}
