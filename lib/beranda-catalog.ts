// -------------------------------------------------------------------------
// Logika KATALOG BERANDA — grid poster padat ber-paginasi gaya situs streaming
// klasik (bar cari + strip genre + grid + nomor halaman).
//
// Semuanya fungsi MURNI (tanpa DOM, tanpa jaringan) supaya bisa dites di
// tests/beranda-catalog.test.ts. Penyaringnya sendiri TIDAK ditulis ulang di
// sini — dipakai ulang dari lib/discover.ts yang sudah dipakai /discover.
// -------------------------------------------------------------------------
import type { Drama } from "./types";
import { isMovie } from "./types";
import { parseRating, parseViews } from "./format";

/**
 * Poster per halaman di grid. 24 = 3 baris penuh saat 8 kolom (layar lebar),
 * 8 baris saat 3 kolom (HP) — dua-duanya masih nyaman digulir.
 */
export const CATALOG_PER_PAGE = 24;

// ============================  LENCANA KARTU  ============================
/**
 * Label yang boleh ditempel di kartu poster.
 *
 * ATURAN JUJUR: tiap nilai HARUS berasal dari field yang benar-benar ada di
 * `Drama`. DramaKu TIDAK menyimpan kualitas video, jadi TIDAK ADA badge
 * "HD"/"CAM" di sini — memasangnya cuma akan berbohong ke penonton. Field yang
 * kosong menghasilkan `null`, dan kartu tinggal tidak menggambarnya.
 */
export type CardBadges = {
  /** Kiri-atas: "FILM" atau "56 EPS". Selalu ada (episodes wajib di katalog). */
  format: string;
  /** Kanan-atas: rating IMDb apa adanya ("8.4"). null = drama belum punya rating. */
  rating: string | null;
  /** Pita bawah: "ONGOING"/"TAMAT". null = status belum diisi admin. */
  status: string | null;
  /** true = katalog mencatat subtitle Indonesia untuk drama ini. */
  subIndo: boolean;
  /** true = drama berbayar koin (dipakai jalur koin, bukan tebakan tampilan). */
  premium: boolean;
};

export function cardBadges(d: Drama): CardBadges {
  return {
    format: isMovie(d) ? "FILM" : `${d.episodes} EPS`,
    rating: d.imdbRating?.trim() ? d.imdbRating.trim() : null,
    // "Completed" ditampilkan sebagai "TAMAT" — kata yang dipakai penonton
    // Indonesia di situs streaming, bukan istilah database.
    status:
      d.status === "Completed" ? "TAMAT" : d.status === "Ongoing" ? "ONGOING" : null,
    subIndo: Boolean(d.subtitles?.includes("id")),
    premium: Boolean(d.premium),
  };
}

// ==============================  URUTAN  =================================
export const CATALOG_SORTS = [
  { value: "terbaru", label: "Terbaru ditambah" },
  { value: "populer", label: "Paling banyak ditonton" },
  { value: "rating", label: "Rating tertinggi" },
  { value: "judul", label: "Judul A-Z" },
] as const;

export type CatalogSort = (typeof CATALOG_SORTS)[number]["value"];

export function parseCatalogSort(value: string | null | undefined): CatalogSort {
  const found = CATALOG_SORTS.find((o) => o.value === value);
  return found ? found.value : "terbaru";
}

/**
 * Urutkan katalog untuk grid beranda. Selalu menyalin dulu — mengurutkan array
 * dari pemanggil akan diam-diam mengubah urutan katalog milik halaman.
 *
 * "terbaru" = kebalikan urutan katalog: `getAllDramas` memulangkan baris urut
 * `sort_index` naik, dan drama BARU ditaruh di ujung (lib/dramas.ts
 * `upsertDrama`, `toFront = false`). Jadi yang paling belakang = paling baru.
 */
export function sortCatalog(dramas: Drama[], sort: CatalogSort): Drama[] {
  const list = [...dramas];
  switch (sort) {
    case "populer":
      return list.sort((a, b) => parseViews(b.views) - parseViews(a.views));
    case "rating":
      return list.sort(
        (a, b) => parseRating(b.imdbRating) - parseRating(a.imdbRating),
      );
    case "judul":
      return list.sort((a, b) => a.title.localeCompare(b.title, "id"));
    default:
      return list.reverse();
  }
}

// =============================  PAGINASI  ================================
export type CatalogPage = {
  /** Nomor halaman yang BENAR-BENAR dipakai (sudah dijepit ke rentang sah). */
  page: number;
  totalPages: number;
  items: Drama[];
  /** Nomor poster pertama & terakhir di halaman ini (1-based), untuk teks "1-24 dari 120". */
  from: number;
  to: number;
  total: number;
};

/**
 * Potong satu halaman dari daftar. Nomor halaman di luar rentang DIJEPIT
 * (bukan dianggap error): halaman bisa saja mengecil setelah penonton menyaring
 * genre, dan grid kosong tanpa penjelasan lebih membingungkan daripada
 * dikembalikan ke halaman terakhir yang masih ada.
 */
export function pageOfCatalog(
  items: Drama[],
  page: number,
  perPage: number = CATALOG_PER_PAGE,
): CatalogPage {
  const total = items.length;
  const size = Math.max(1, Math.floor(perPage));
  const totalPages = Math.max(1, Math.ceil(total / size));
  const safe = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (safe - 1) * size;
  const slice = items.slice(start, start + size);
  return {
    page: safe,
    totalPages,
    items: slice,
    from: total === 0 ? 0 : start + 1,
    to: start + slice.length,
    total,
  };
}

/** Penanda "…" pada deretan nomor halaman. Bukan angka, jadi tak bisa diklik. */
export const PAGE_GAP = "…" as const;

/**
 * Deretan tombol nomor halaman: selalu memuat halaman 1, halaman terakhir, dan
 * tetangga halaman aktif; sisanya diringkas jadi "…". Tanpa ini katalog 120
 * halaman akan menggambar 120 tombol yang meluber keluar layar HP.
 */
export function pageNumbers(
  page: number,
  totalPages: number,
  windowSize = 1,
): (number | typeof PAGE_GAP)[] {
  const last = Math.max(1, totalPages);
  const current = Math.min(Math.max(1, page), last);
  const keep = new Set<number>([1, last]);
  for (let i = current - windowSize; i <= current + windowSize; i++) {
    if (i >= 1 && i <= last) keep.add(i);
  }
  const sorted = [...keep].sort((a, b) => a - b);
  const out: (number | typeof PAGE_GAP)[] = [];
  let prev = 0;
  for (const n of sorted) {
    // Lompatan tepat 1 halaman TIDAK diringkas: "…" memakan tempat yang sama
    // dengan angkanya sendiri, jadi menyembunyikannya cuma bikin penonton
    // kehilangan satu tombol tanpa menghemat apa pun.
    if (prev && n - prev === 2) out.push(prev + 1);
    else if (prev && n - prev > 2) out.push(PAGE_GAP);
    out.push(n);
    prev = n;
  }
  return out;
}

// ==========================  OPSI FILTER  ================================
/**
 * Genre yang BENAR-BENAR punya isi di katalog, urut dari yang terbanyak.
 *
 * KENAPA dihitung, bukan memakai daftar tetap `CATEGORIES`: strip genre yang
 * memajang kategori kosong membuat penonton mengklik lalu mendapat halaman
 * hampa — terasa seperti situs rusak, padahal katalognya saja yang belum diisi.
 */
export function availableGenres(dramas: Drama[]): string[] {
  const count = new Map<string, number>();
  for (const d of dramas) count.set(d.category, (count.get(d.category) ?? 0) + 1);
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "id"))
    .map(([genre]) => genre);
}

/**
 * Berapa drama yang punya nilai di field tertentu. Dipakai bar filter untuk
 * MENYEMBUNYIKAN dropdown yang datanya nol (lihat pre-mortem di
 * docs/lintasai/rencana/2026-09-07-beranda-lk21.md): katalog sekarang belum
 * punya `year` sama sekali, jadi dropdown Tahun tak boleh dipaksa tampil.
 */
export function countWithYear(dramas: Drama[]): number {
  return dramas.filter((d) => Boolean(d.year?.trim())).length;
}

export function countWithRating(dramas: Drama[]): number {
  return dramas.filter((d) => parseRating(d.imdbRating) > 0).length;
}
