import { describe, it, expect } from "vitest";
import {
  favoriteGenre,
  latestHistoryDrama,
  recommendDramas,
  similarToDrama,
  similarityScore,
  trendingInGenre,
} from "../lib/recommend";
import type { Drama } from "../lib/types";

function drama(
  id: string,
  category: Drama["category"],
  partial: Partial<Drama> = {},
): Drama {
  return {
    id,
    title: id,
    category,
    episodes: 10,
    views: "1K",
    synopsis: "",
    gradient: "from-zinc-800 to-black",
    ...partial,
  };
}

const catalog = [
  drama("r1", "Romance", { year: "2024", imdbRating: "8.5", views: "5K" }),
  drama("r2", "Romance", { year: "2024", imdbRating: "8.0", views: "2K" }),
  drama("r3", "Romance", { year: "2023", imdbRating: "7.0", views: "8K" }),
  drama("a1", "Action", { year: "2024", imdbRating: "8.5", views: "10K" }),
  drama("c1", "Comedy", { year: "2022", imdbRating: "6.5", views: "3K" }),
];

describe("recommendDramas", () => {
  it("memilih genre yang paling sering di riwayat", () => {
    expect(favoriteGenre(catalog, ["r1", "r2"], [])).toBe("Romance");
  });

  it("menawarkan judul genre yang sama yang belum disentuh", () => {
    const { genre, items } = recommendDramas(catalog, ["r1"], [], 12);
    expect(genre).toBe("Romance");
    expect(items.map((d) => d.id)).toEqual(["r2", "r3"]);
  });

  it("tanpa riwayat: judul apa pun dari katalog", () => {
    const { genre, items } = recommendDramas(catalog, [], [], 2);
    expect(genre).toBeNull();
    expect(items).toHaveLength(2);
  });
});

describe("similarityScore", () => {
  it("kategori + tahun + rating sama = skor tinggi", () => {
    const a = catalog[0];
    const b = catalog[1];
    expect(similarityScore(a, b)).toBeGreaterThan(6);
  });

  it("kategori beda = skor lebih rendah", () => {
    const a = catalog[0];
    const b = catalog[3];
    const sameCat = catalog[1];
    expect(similarityScore(a, b)).toBeLessThan(similarityScore(a, sameCat));
  });
});

describe("similarToDrama", () => {
  it("menghasilkan drama mirip berdasarkan drama terakhir", () => {
    const { base, items } = similarToDrama("r1", catalog, ["r1"], [], 12);
    expect(base?.id).toBe("r1");
    expect(items.map((d) => d.id)).toContain("r2");
    expect(items.map((d) => d.id)).not.toContain("r1");
  });

  it("mengabaikan drama yang sudah di riwayat/favorit", () => {
    const { items } = similarToDrama("r1", catalog, ["r1", "r2"], ["r3"], 12);
    expect(items.map((d) => d.id)).not.toContain("r2");
    expect(items.map((d) => d.id)).not.toContain("r3");
  });

  it("mengembalikan kosong kalau drama dasar tidak ada", () => {
    const { base, items } = similarToDrama("tidak-ada", catalog, [], [], 12);
    expect(base).toBeNull();
    expect(items).toEqual([]);
  });
});

describe("trendingInGenre", () => {
  it("mengurutkan berdasarkan views", () => {
    const items = trendingInGenre("Romance", catalog, 12);
    expect(items.map((d) => d.id)).toEqual(["r3", "r1", "r2"]);
  });

  it("mengembalikan kosong untuk genre null", () => {
    expect(trendingInGenre(null, catalog, 12)).toEqual([]);
  });
});

describe("latestHistoryDrama", () => {
  it("mengambil drama terakhir dari riwayat", () => {
    const d = latestHistoryDrama(catalog, ["r1", "a1"]);
    expect(d?.id).toBe("r1");
  });

  it("mengembalikan null kalau riwayat kosong", () => {
    expect(latestHistoryDrama(catalog, [])).toBeNull();
  });
});
