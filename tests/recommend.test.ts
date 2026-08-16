import { describe, it, expect } from "vitest";
import { favoriteGenre, recommendDramas } from "../lib/recommend";
import type { Drama } from "../lib/types";

function drama(id: string, category: Drama["category"]): Drama {
  return {
    id,
    title: id,
    category,
    episodes: 10,
    views: "1K",
    synopsis: "",
    gradient: "from-zinc-800 to-black",
  };
}

const catalog = [
  drama("r1", "Romance"),
  drama("r2", "Romance"),
  drama("a1", "Action"),
  drama("c1", "Comedy"),
];

describe("recommendDramas", () => {
  it("memilih genre yang paling sering di riwayat", () => {
    expect(favoriteGenre(catalog, ["r1", "r2"], [])).toBe("Romance");
  });

  it("menawarkan judul genre yang sama yang belum disentuh", () => {
    const { genre, items } = recommendDramas(catalog, ["r1"], [], 12);
    expect(genre).toBe("Romance");
    expect(items.map((d) => d.id)).toEqual(["r2"]);
  });

  it("tanpa riwayat: judul apa pun dari katalog", () => {
    const { genre, items } = recommendDramas(catalog, [], [], 2);
    expect(genre).toBeNull();
    expect(items).toHaveLength(2);
  });
});
