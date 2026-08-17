import type { Category, Drama } from "./types";

export const SORT_OPTIONS = [
  { value: "relevance", label: "Paling sesuai" },
  { value: "rating", label: "Rating Tertinggi" },
  { value: "year", label: "Tahun Terbaru" },
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

export type FilterDramaOptions = {
  query?: string;
  category?: Category;
  year?: string;
  minRating?: RatingKey;
  sortBy?: SortBy;
};

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
  } = options;

  const q = query.toLowerCase().trim();
  const ratingThreshold = minRating === "all" ? 0 : Number(minRating);

  let result = dramas.filter((d) => {
    const matchCat = category === "Semua" ? true : d.category === category;
    const matchYear = year === "all" ? true : d.year === year;
    const matchRating =
      ratingThreshold === 0
        ? true
        : parseImdb(d.imdbRating) >= ratingThreshold;
    const matchQ =
      !q ||
      d.title.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q) ||
      d.synopsis.toLowerCase().includes(q);
    return matchCat && matchYear && matchRating && matchQ;
  });

  switch (sortBy) {
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
    case "title":
      result = result.slice().sort((a, b) => a.title.localeCompare(b.title));
      break;
    default:
      // relevance = urutan asli dari server
      break;
  }

  return result;
}
