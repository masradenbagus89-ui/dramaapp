import { describe, it, expect } from "vitest";
import {
  filterAndSortDramas,
  getYearOptions,
  parseImdb,
} from "../lib/discover";
import type { Drama } from "../lib/types";

function stub(
  partial: Partial<Drama> & Pick<Drama, "id" | "title">,
): Drama {
  return {
    category: "Action",
    episodes: 1,
    views: "0",
    synopsis: "",
    gradient: "from-zinc-800 to-black",
    ...partial,
  };
}

const DRAMAS: Drama[] = [
  stub({
    id: "a",
    title: "Alpha Romance",
    category: "Romance",
    year: "2024",
    imdbRating: "8.5",
    views: "100",
  }),
  stub({
    id: "b",
    title: "Beta Action",
    category: "Action",
    year: "2023",
    imdbRating: "7.2",
    views: "200",
  }),
  stub({
    id: "c",
    title: "Gamma Comedy",
    category: "Comedy",
    year: "2024",
    imdbRating: "6.8",
    views: "50",
  }),
  stub({ id: "d", title: "Delta Tycoon", category: "Tycoon", year: "2022" }),
];

describe("parseImdb", () => {
  it("mengembalikan angka dari string rating", () => {
    expect(parseImdb("8.5")).toBe(8.5);
  });

  it("mengembalikan 0 untuk nilai kosong atau tidak valid", () => {
    expect(parseImdb("")).toBe(0);
    expect(parseImdb(null)).toBe(0);
    expect(parseImdb("n/a")).toBe(0);
  });
});

describe("getYearOptions", () => {
  it("mengembalikan tahun unik urut descending", () => {
    expect(getYearOptions(DRAMAS)).toEqual(["2024", "2023", "2022"]);
  });

  it("mengabaikan data tanpa tahun", () => {
    expect(getYearOptions([stub({ id: "x", title: "X" })])).toEqual([]);
  });
});

describe("filterAndSortDramas", () => {
  it("filter kategori", () => {
    const result = filterAndSortDramas(DRAMAS, { category: "Romance" });
    expect(result.map((d) => d.id)).toEqual(["a"]);
  });

  it("filter tahun", () => {
    const result = filterAndSortDramas(DRAMAS, { year: "2024" });
    expect(result.map((d) => d.id)).toEqual(["a", "c"]);
  });

  it("filter rating minimum", () => {
    const result = filterAndSortDramas(DRAMAS, { minRating: "8" });
    expect(result.map((d) => d.id)).toEqual(["a"]);
  });

  it("filter pencarian teks", () => {
    const result = filterAndSortDramas(DRAMAS, { query: "beta" });
    expect(result.map((d) => d.id)).toEqual(["b"]);
  });

  it("gabungan filter aktif", () => {
    const result = filterAndSortDramas(DRAMAS, {
      category: "Romance",
      year: "2024",
      minRating: "8",
    });
    expect(result.map((d) => d.id)).toEqual(["a"]);
  });

  it("gabungan filter kosong", () => {
    const result = filterAndSortDramas(DRAMAS, {
      category: "Action",
      year: "2024",
    });
    expect(result).toEqual([]);
  });

  it("sort rating descending", () => {
    const result = filterAndSortDramas(DRAMAS, { sortBy: "rating" });
    expect(result.map((d) => d.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("sort year descending", () => {
    const result = filterAndSortDramas(DRAMAS, { sortBy: "year" });
    expect(result.map((d) => d.id)).toEqual(["a", "c", "b", "d"]);
  });

  it("sort title ascending", () => {
    const result = filterAndSortDramas(DRAMAS, { sortBy: "title" });
    expect(result.map((d) => d.id)).toEqual(["a", "b", "d", "c"]);
  });

  it("relevance mempertahankan urutan asli", () => {
    const result = filterAndSortDramas(DRAMAS, { sortBy: "relevance" });
    expect(result.map((d) => d.id)).toEqual(["a", "b", "c", "d"]);
  });
});
