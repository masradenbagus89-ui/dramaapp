// Tes pengunci perilaku untuk computeAdminStats (lib/admin-stats.ts).
// Mengunci cara dashboard admin menghitung ringkasan, supaya pemisahan dari
// app/admin/page.tsx tidak diam-diam mengubah angka yang tampil.
import { describe, it, expect } from "vitest";
import { computeAdminStats } from "../lib/admin-stats";
import type { Drama } from "../lib/types";

function drama(
  id: string,
  opts: {
    category?: Drama["category"];
    episodes?: number;
    views?: string;
    posterImage?: string;
  } = {},
): Drama {
  return {
    id,
    title: id,
    category: opts.category ?? "Romance",
    episodes: opts.episodes ?? 0,
    views: opts.views ?? "0",
    synopsis: "",
    gradient: "",
    ...(opts.posterImage ? { posterImage: opts.posterImage } : {}),
  };
}

const sample: Drama[] = [
  drama("a", { category: "Romance", episodes: 10, views: "1.2M", posterImage: "/a.png" }),
  drama("b", { category: "Romance", episodes: 5, views: "800K" }),
  drama("c", { category: "Action", episodes: 3, views: "0", posterImage: "/c.png" }),
];

describe("computeAdminStats — ringkasan dashboard admin", () => {
  it("daftar kosong menghasilkan semua nol", () => {
    expect(computeAdminStats([])).toEqual({
      totalEpisode: 0,
      totalViews: 0,
      withPoster: 0,
      byCategory: [],
    });
  });

  it("menjumlahkan total episode", () => {
    expect(computeAdminStats(sample).totalEpisode).toBe(18);
  });

  it("menjumlahkan total views (teks satuan diubah jadi angka)", () => {
    expect(computeAdminStats(sample).totalViews).toBe(2_000_000);
  });

  it("menghitung berapa drama yang punya poster", () => {
    expect(computeAdminStats(sample).withPoster).toBe(2);
  });

  it("mengelompokkan per kategori, diurut dari terbanyak", () => {
    expect(computeAdminStats(sample).byCategory).toEqual([
      ["Romance", 2],
      ["Action", 1],
    ]);
  });
});
