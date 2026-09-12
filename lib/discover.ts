import type { Category, Drama } from "./types";
import { CATEGORIES, isMovie } from "./types";
import { parseViews } from "./format";
import { cocokSemuaKata, pecahKataKunci } from "./pencarian";

export const SORT_OPTIONS = [
  { value: "relevance", label: "Paling sesuai" },
  { value: "terbaru", label: "Terbaru Ditambah" },
  { value: "populer", label: "Paling Banyak Ditonton" },
  { value: "rating", label: "Rating Tertinggi" },
  { value: "year", label: "Tahun Terbaru" },
  { value: "episodes", label: "Episode Terbanyak" },
  { value: "title", label: "A-Z" },
] as const;

export type SortBy = (typeof SORT_OPTIONS)[number]["value"];

export function parseSort(value: string | null): SortBy {
  const found = SORT_OPTIONS.find((o) => o.value === value);
  return found ? found.value : "relevance";
}

export type RatingKey = "all" | "7" | "8" | "9";

export const RATING_OPTIONS: { value: RatingKey; label: string }[] = [
  { value: "all", label: "Semua rating" },
  { value: "7", label: "IMDb ≥ 7.0" },
  { value: "8", label: "IMDb ≥ 8.0" },
  { value: "9", label: "IMDb ≥ 9.0" },
];

// --- Penyaring tambahan (dipakai menu navigasi gaya situs katalog) ---------
// Semuanya memakai field yang BENAR-BENAR ada di `Drama`; tidak ada penyaring
// negara/kualitas video karena datanya memang tidak disimpan DramaKu.

/** Jenis tayangan. "all" = tidak menyaring (perilaku lama). */
export type KindKey = "all" | "series" | "movie";
/** Status penayangan, huruf kecil supaya aman jadi isi alamat URL. */
export type StatusKey = "all" | "ongoing" | "completed";
/** Cara membuka episode: gratis, atau perlu koin (`premium`). */
export type AksesKey = "all" | "gratis" | "koin";
/** Ketersediaan subtitle. Nilainya = kode bahasa di `Drama.subtitles`. */
export type SubKey = "all" | "id";

/**
 * Kolom `country` datang dari OMDb sebagai DAFTAR GABUNGAN dipisah koma
 * ("United States, Canada, United Kingdom"), bukan satu negara. Satu-satunya
 * tempat yang memecahnya — dipakai penyaring DAN penyusun menu, supaya
 * keduanya tak pernah memecah dengan aturan berbeda.
 */
export function negaraDari(drama: Drama): string[] {
  return (drama.country ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
}

export function parseKind(value?: string | null): KindKey {
  return value === "series" || value === "movie" ? value : "all";
}

export function parseStatusKey(value?: string | null): StatusKey {
  return value === "ongoing" || value === "completed" ? value : "all";
}

export function parseAkses(value?: string | null): AksesKey {
  return value === "gratis" || value === "koin" ? value : "all";
}

export function parseSub(value?: string | null): SubKey {
  return value === "id" ? value : "all";
}

/** Negara tidak punya daftar tetap (datanya teks bebas dari OMDb). */
export function parseNegara(value?: string | null): string {
  const bersih = value?.trim();
  return bersih ? bersih : "all";
}

export function parseImdb(value?: string | null): number {
  if (!value) return 0;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function getYearOptions(dramas: Drama[]): string[] {
  const set = new Set<string>();
  for (const d of dramas) {
    if (d.year) set.add(d.year);
  }
  return Array.from(set).sort((a, b) => Number(b) - Number(a));
}

/**
 * Negara yang BENAR-BENAR punya isi di katalog, urut dari yang terbanyak.
 * Sejajar dengan `availableGenres` di lib/beranda-catalog.ts.
 */
export function getCountryOptions(dramas: Drama[]): string[] {
  const jumlah = new Map<string, number>();
  for (const d of dramas) {
    for (const n of negaraDari(d)) jumlah.set(n, (jumlah.get(n) ?? 0) + 1);
  }
  return [...jumlah.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "id"))
    .map(([negara]) => negara);
}

export type FilterDramaOptions = {
  query?: string;
  category?: Category;
  year?: string;
  minRating?: RatingKey;
  sortBy?: SortBy;
  /** Penyaring tambahan; semuanya default "all" = tidak menyaring apa pun. */
  kind?: KindKey;
  status?: StatusKey;
  akses?: AksesKey;
  sub?: SubKey;
  /** Nama SATU negara; dicocokkan ke daftar gabungan lewat `negaraDari`. */
  negara?: string;
};

// --- Pencocok satu-satu, dipisah supaya `filterAndSortDramas` tetap terbaca
// sebagai daftar syarat, bukan tumpukan operator ternary. -------------------

function cocokKind(d: Drama, kind: KindKey): boolean {
  if (kind === "all") return true;
  // Judul lama tanpa `kind` = serial (lihat catatan di lib/types.ts), jadi
  // "series" ikut menangkapnya — kalau tidak, filter Serial akan memulangkan
  // nol judul di katalog lama.
  return kind === "movie" ? isMovie(d) : !isMovie(d);
}

function cocokStatus(d: Drama, status: StatusKey): boolean {
  if (status === "all") return true;
  return status === "completed"
    ? d.status === "Completed"
    : d.status === "Ongoing";
}

function cocokAkses(d: Drama, akses: AksesKey): boolean {
  if (akses === "all") return true;
  return akses === "koin" ? Boolean(d.premium) : !d.premium;
}

function cocokSub(d: Drama, sub: SubKey): boolean {
  if (sub === "all") return true;
  return Boolean(d.subtitles?.includes(sub));
}

function cocokNegara(d: Drama, negara: string): boolean {
  if (negara === "all") return true;
  return negaraDari(d).includes(negara);
}

export function filterAndSortDramas(
  dramas: Drama[],
  options: FilterDramaOptions = {},
): Drama[] {
  const {
    query = "",
    category = "Semua",
    year = "all",
    minRating = "all",
    sortBy = "relevance",
    kind = "all",
    status = "all",
    akses = "all",
    sub = "all",
    negara = "all",
  } = options;

  // Dipecah SEKALI di sini, bukan di dalam perulangan: aturannya sama untuk
  // seluruh katalog, jadi tak ada gunanya menghitung ulang tiap drama.
  const kataCari = pecahKataKunci(query);
  const ratingThreshold = minRating === "all" ? 0 : Number(minRating);

  let result = dramas.filter((d) => {
    const matchCat = category === "Semua" ? true : d.category === category;
    const matchYear = year === "all" ? true : d.year === year;
    const matchRating =
      ratingThreshold === 0
        ? true
        : parseImdb(d.imdbRating) >= ratingThreshold;
    // Field yang dicari sengaja TETAP tiga ini; yang berubah cuma CARA
    // mencocokkannya (lib/pencarian.ts), supaya hasil pencarian tidak
    // tiba-tiba melebar ke kolom yang tak pernah dimaksud penonton.
    const matchQ = cocokSemuaKata(kataCari, d.title, d.category, d.synopsis);
    return (
      matchCat &&
      matchYear &&
      matchRating &&
      matchQ &&
      cocokKind(d, kind) &&
      cocokStatus(d, status) &&
      cocokAkses(d, akses) &&
      cocokSub(d, sub) &&
      cocokNegara(d, negara)
    );
  });

  switch (sortBy) {
    // Katalog datang urut `sort_index` naik dan judul BARU ditaruh di ujung
    // (lib/dramas.ts `upsertDrama`), jadi yang paling belakang = paling baru.
    // Nama & artinya sengaja sama dengan `sortCatalog` di lib/beranda-catalog.ts.
    case "terbaru":
      result = result.slice().reverse();
      break;
    case "populer":
      result = result.slice().sort((a, b) => {
        const va = parseViews(a.views);
        const vb = parseViews(b.views);
        if (vb !== va) return vb - va;
        return a.title.localeCompare(b.title);
      });
      break;
    case "rating":
      result = result.slice().sort((a, b) => {
        const ra = parseImdb(a.imdbRating);
        const rb = parseImdb(b.imdbRating);
        if (rb !== ra) return rb - ra;
        return b.views.localeCompare(a.views);
      });
      break;
    case "year":
      result = result.slice().sort((a, b) => {
        const ya = Number(a.year) || 0;
        const yb = Number(b.year) || 0;
        if (yb !== ya) return yb - ya;
        return a.title.localeCompare(b.title);
      });
      break;
    case "episodes":
      result = result.slice().sort((a, b) => {
        if (b.episodes !== a.episodes) return b.episodes - a.episodes;
        return a.title.localeCompare(b.title);
      });
      break;
    case "title":
      result = result.slice().sort((a, b) => a.title.localeCompare(b.title));
      break;
    default:
      // relevance = urutan asli dari server
      break;
  }

  return result;
}

// =====================  PENYARING <-> ALAMAT URL  ========================
// SATU tempat yang memutuskan nama parameter alamat ("?kind=movie") dan
// artinya. Dipakai bersama oleh halaman /discover DAN penyusun menu
// (lib/nav-katalog.ts) — kalau dua pihak menuliskannya sendiri-sendiri, menu
// bisa mengirim "?negara=" sementara halaman membaca "?country=", dan tautannya
// mati TANPA pesan error.

/** Penyaring katalog memakai nama KUNCI ALAMAT, bukan nama field internal. */
export type CatalogFilter = {
  q: string;
  cat: Category;
  year: string;
  rating: RatingKey;
  sort: SortBy;
  kind: KindKey;
  status: StatusKey;
  akses: AksesKey;
  sub: SubKey;
  negara: string;
};

/** Nilai "tidak menyaring apa-apa" — nilai inilah yang DIHAPUS dari alamat. */
export const FILTER_KOSONG: CatalogFilter = {
  q: "",
  cat: "Semua",
  year: "all",
  rating: "all",
  sort: "relevance",
  kind: "all",
  status: "all",
  akses: "all",
  sub: "all",
  negara: "all",
};

function parseCategory(value?: string | null): Category {
  if (!value) return "Semua";
  return CATEGORIES.includes(value as Category) ? (value as Category) : "Semua";
}

function parseRatingKey(value?: string | null): RatingKey {
  return value === "7" || value === "8" || value === "9" ? value : "all";
}

/**
 * Alamat URL -> penyaring. Nilai asing (mis. `?kind=abcd` yang diketik sendiri)
 * jatuh ke "all", bukan menghasilkan grid kosong tanpa penjelasan.
 */
export function bacaFilter(sp: URLSearchParams | null): CatalogFilter {
  return {
    q: sp?.get("q") ?? "",
    cat: parseCategory(sp?.get("cat")),
    year: sp?.get("year") ?? "all",
    rating: parseRatingKey(sp?.get("rating")),
    sort: parseSort(sp?.get("sort") ?? null),
    kind: parseKind(sp?.get("kind")),
    status: parseStatusKey(sp?.get("status")),
    akses: parseAkses(sp?.get("akses")),
    sub: parseSub(sp?.get("sub")),
    negara: parseNegara(sp?.get("negara")),
  };
}

/**
 * Penyaring -> potongan alamat. Nilai yang sama dengan FILTER_KOSONG dibuang
 * supaya alamat yang dibagikan tetap pendek dan terbaca.
 */
export function tulisFilter(f: CatalogFilter): string {
  const params = new URLSearchParams();
  for (const kunci of Object.keys(FILTER_KOSONG) as (keyof CatalogFilter)[]) {
    const nilai = f[kunci];
    if (nilai && nilai !== FILTER_KOSONG[kunci]) params.set(kunci, nilai);
  }
  return params.toString();
}

/** Penyaring -> argumen `filterAndSortDramas`. Sekadar ganti nama, tanpa logika. */
export function filterOptions(f: CatalogFilter): FilterDramaOptions {
  return {
    query: f.q,
    category: f.cat,
    year: f.year,
    minRating: f.rating,
    sortBy: f.sort,
    kind: f.kind,
    status: f.status,
    akses: f.akses,
    sub: f.sub,
    negara: f.negara,
  };
}

/** Jalan pintas: alamat -> daftar drama tersaring. Dipakai tes & pemanggil sederhana. */
export function filterDariUrl(dramas: Drama[], sp: URLSearchParams | null): Drama[] {
  return filterAndSortDramas(dramas, filterOptions(bacaFilter(sp)));
}
