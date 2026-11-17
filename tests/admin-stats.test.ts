// Tes pengunci perilaku untuk computeAdminStats (lib/admin-stats.ts).
// Mengunci cara dashboard admin menghitung ringkasan, supaya pemisahan dari
// app/admin/page.tsx tidak diam-diam mengubah angka yang tampil.
import { describe, it, expect } from "vitest";
import {
  computeAdminStats,
  hitungKategoriFilm,
  lengkapiDistribusiKategori,
  persenDariJumlah,
} from "../lib/admin-stats";
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

describe("lengkapiDistribusiKategori — grafik memakai daftar resmi", () => {
  const daftar = ["Romance", "Action", "Fantasy"];

  it("kategori yang belum dipakai tetap muncul dengan angka nol, di bawah yang terisi", () => {
    expect(
      lengkapiDistribusiKategori(
        [
          ["Action", 1],
          ["Romance", 2],
        ],
        daftar,
      ),
    ).toEqual([
      ["Romance", 2],
      ["Action", 1],
      ["Fantasy", 0],
    ]);
  });

  it("kategori di data yang tidak ada di daftar resmi tidak dibuang", () => {
    expect(lengkapiDistribusiKategori([["Lawas", 3]], ["Romance"])).toEqual([
      ["Lawas", 3],
      ["Romance", 0],
    ]);
  });

  it("tanpa drama, urutannya mengikuti daftar resmi dan semuanya nol", () => {
    expect(lengkapiDistribusiKategori([], daftar)).toEqual([
      ["Romance", 0],
      ["Action", 0],
      ["Fantasy", 0],
    ]);
  });
});

describe("persenDariJumlah — batang kategori tetap satu baris", () => {
  it("persen bulat berjumlah 100 dan urutannya tidak berubah", () => {
    expect(persenDariJumlah([22, 12, 4, 1, 1, 1])).toEqual([54, 29, 10, 3, 2, 2]);
  });

  it("dua banding satu menjadi 67 dan 33", () => {
    expect(persenDariJumlah([2, 1])).toEqual([67, 33]);
  });

  it("total nol tidak membagi", () => {
    expect(persenDariJumlah([0, 0])).toEqual([0, 0]);
    expect(persenDariJumlah([])).toEqual([]);
  });
});

describe("hitungKategoriFilm — grafik mengikuti film IMDb", () => {
  it("peta kosong tidak punya kategori aktif", () => {
    expect(hitungKategoriFilm({})).toEqual([]);
  });

  it("menghitung film per kategori dan mengabaikan yang kosong", () => {
    expect(
      hitungKategoriFilm({
        a: "Mystery",
        b: "Action",
        c: "Mystery",
        d: "  ",
        e: "Fantasy",
      }),
    ).toEqual([
      ["Mystery", 2],
      ["Action", 1],
      ["Fantasy", 1],
    ]);
  });
});
