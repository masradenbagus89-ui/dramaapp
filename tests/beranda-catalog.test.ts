import { describe, it, expect } from "vitest";
import {
  CATALOG_PER_PAGE,
  PAGE_GAP,
  ROW_MAX_ITEMS,
  homeCatalogRows,
  availableGenres,
  cardBadges,
  countWithRating,
  countWithYear,
  pageNumbers,
  pageOfCatalog,
  parseCatalogSort,
  sortCatalog,
} from "../lib/beranda-catalog";
import type { Drama } from "../lib/types";

function stub(partial: Partial<Drama> & Pick<Drama, "id" | "title">): Drama {
  return {
    category: "Action",
    episodes: 10,
    views: "0",
    synopsis: "",
    gradient: "from-zinc-800 to-black",
    ...partial,
  };
}

describe("cardBadges — label kartu hanya dari data yang benar-benar ada", () => {
  it("serial memakai jumlah episode, film memakai label FILM", () => {
    expect(cardBadges(stub({ id: "a", title: "A", episodes: 56 })).format).toBe(
      "56 EPS",
    );
    expect(
      cardBadges(stub({ id: "b", title: "B", kind: "movie", episodes: 1 })).format,
    ).toBe("FILM");
  });

  it("rating kosong TIDAK dikarang jadi angka", () => {
    expect(cardBadges(stub({ id: "a", title: "A" })).rating).toBeNull();
    expect(cardBadges(stub({ id: "b", title: "B", imdbRating: "   " })).rating).toBeNull();
    expect(cardBadges(stub({ id: "c", title: "C", imdbRating: "8.4" })).rating).toBe("8.4");
  });

  it("status diterjemahkan ke kata penonton, kosong tetap kosong", () => {
    expect(cardBadges(stub({ id: "a", title: "A", status: "Ongoing" })).status).toBe(
      "ONGOING",
    );
    expect(
      cardBadges(stub({ id: "b", title: "B", status: "Completed" })).status,
    ).toBe("TAMAT");
    expect(cardBadges(stub({ id: "c", title: "C" })).status).toBeNull();
  });

  it("sub Indo hanya kalau katalog benar-benar mencatatnya", () => {
    expect(cardBadges(stub({ id: "a", title: "A", subtitles: ["id", "en"] })).subIndo).toBe(true);
    expect(cardBadges(stub({ id: "b", title: "B", subtitles: ["en"] })).subIndo).toBe(false);
    expect(cardBadges(stub({ id: "c", title: "C" })).subIndo).toBe(false);
  });
});

describe("sortCatalog", () => {
  const list = [
    stub({ id: "a", title: "Cinta", views: "1.2K", imdbRating: "7.0" }),
    stub({ id: "b", title: "Air", views: "3.5M", imdbRating: "6.0" }),
    stub({ id: "c", title: "Bunga", views: "900", imdbRating: "9.1" }),
  ];

  it("terbaru = kebalikan urutan katalog (drama baru ditaruh di ujung)", () => {
    expect(sortCatalog(list, "terbaru").map((d) => d.id)).toEqual(["c", "b", "a"]);
  });

  it("populer membaca satuan K/M, bukan mengurut teks", () => {
    expect(sortCatalog(list, "populer").map((d) => d.id)).toEqual(["b", "a", "c"]);
  });

  it("rating tertinggi di depan", () => {
    expect(sortCatalog(list, "rating").map((d) => d.id)).toEqual(["c", "a", "b"]);
  });

  it("judul A-Z", () => {
    expect(sortCatalog(list, "judul").map((d) => d.id)).toEqual(["b", "c", "a"]);
  });

  it("TIDAK mengubah array milik pemanggil", () => {
    const asli = list.map((d) => d.id);
    sortCatalog(list, "judul");
    expect(list.map((d) => d.id)).toEqual(asli);
  });

  it("nilai urutan yang tak dikenal jatuh ke terbaru", () => {
    expect(parseCatalogSort("ngawur")).toBe("terbaru");
    expect(parseCatalogSort(null)).toBe("terbaru");
    expect(parseCatalogSort("rating")).toBe("rating");
  });
});

describe("pageOfCatalog", () => {
  const list = Array.from({ length: 50 }, (_, i) =>
    stub({ id: `d${i}`, title: `Drama ${i}` }),
  );

  it("memotong sesuai ukuran halaman dan melaporkan rentangnya", () => {
    const p = pageOfCatalog(list, 2, 24);
    expect(p.items).toHaveLength(24);
    expect(p.items[0].id).toBe("d24");
    expect(p.from).toBe(25);
    expect(p.to).toBe(48);
    expect(p.total).toBe(50);
    expect(p.totalPages).toBe(3);
  });

  it("halaman di luar rentang DIJEPIT, bukan memulangkan grid kosong", () => {
    expect(pageOfCatalog(list, 99, 24).page).toBe(3);
    expect(pageOfCatalog(list, 0, 24).page).toBe(1);
    expect(pageOfCatalog(list, -5, 24).items).toHaveLength(24);
  });

  it("katalog kosong tetap sah: 1 halaman, rentang 0", () => {
    const p = pageOfCatalog([], 1, 24);
    expect(p.totalPages).toBe(1);
    expect(p.items).toHaveLength(0);
    expect(p.from).toBe(0);
    expect(p.to).toBe(0);
  });

  it("ukuran halaman bawaan dipakai kalau tidak disebut", () => {
    // Daftarnya dibuat SELALU lebih panjang dari CATALOG_PER_PAGE, berapa pun
    // angkanya. Versi lama memakai daftar 50 tetap dan langsung pecah begitu
    // angkanya dinaikkan ke 60 — yang diuji jadi angkanya, bukan perilakunya.
    const panjang = Array.from({ length: CATALOG_PER_PAGE + 5 }, (_, i) =>
      stub({ id: `p${i}`, title: `Panjang ${i}` }),
    );
    expect(pageOfCatalog(panjang, 1).items).toHaveLength(CATALOG_PER_PAGE);
    expect(pageOfCatalog(panjang, 2).items).toHaveLength(5);
  });
});

describe("pageNumbers", () => {
  it("halaman sedikit ditampilkan utuh tanpa titik-titik", () => {
    expect(pageNumbers(1, 4)).toEqual([1, 2, 3, 4]);
  });

  it("halaman banyak diringkas dengan titik-titik di dua sisi", () => {
    expect(pageNumbers(10, 20)).toEqual([1, PAGE_GAP, 9, 10, 11, PAGE_GAP, 20]);
  });

  it("selalu memuat halaman pertama dan terakhir", () => {
    const hasil = pageNumbers(2, 30);
    expect(hasil[0]).toBe(1);
    expect(hasil[hasil.length - 1]).toBe(30);
  });

  it("satu halaman = satu tombol", () => {
    expect(pageNumbers(1, 1)).toEqual([1]);
    expect(pageNumbers(1, 0)).toEqual([1]);
  });
});

describe("opsi filter dihitung dari data nyata", () => {
  const list = [
    stub({ id: "a", title: "A", category: "Romance" }),
    stub({ id: "b", title: "B", category: "Romance" }),
    stub({ id: "c", title: "C", category: "Action", year: "2024", imdbRating: "8.0" }),
  ];

  it("genre kosong tidak ikut tampil, yang terbanyak di depan", () => {
    expect(availableGenres(list)).toEqual(["Romance", "Action"]);
    expect(availableGenres(list)).not.toContain("Fantasy");
  });

  it("menghitung berapa drama yang punya tahun / rating", () => {
    expect(countWithYear(list)).toBe(1);
    expect(countWithRating(list)).toBe(1);
    expect(countWithYear([])).toBe(0);
  });
});

describe("homeCatalogRows — baris poster halaman depan", () => {
  const banyak = (genre: Drama["category"], n: number, awalan: string) =>
    Array.from({ length: n }, (_, i) =>
      stub({ id: `${awalan}${i}`, title: `${awalan} ${i}`, category: genre }),
    );

  it("kategori yang isinya di bawah ambang TIDAK dijadikan baris sendiri", () => {
    // Meniru kenyataan katalog: Action banyak, Comedy cuma 1.
    const list = [...banyak("Action", 10, "a"), ...banyak("Comedy", 1, "c")];
    const judul = homeCatalogRows(list).map((r) => r.title);
    expect(judul).toContain("Drama Action");
    expect(judul).not.toContain("Drama Comedy");
  });

  it("selalu diawali baris Terbaru lalu Paling Banyak Ditonton", () => {
    const rows = homeCatalogRows(banyak("Action", 10, "a"));
    expect(rows[0].title).toBe("Drama Terbaru");
    expect(rows[1].title).toBe("Paling Banyak Ditonton");
  });

  it("tiap baris dipotong di ROW_MAX_ITEMS", () => {
    const rows = homeCatalogRows(banyak("Action", 50, "a"));
    for (const r of rows) expect(r.items.length).toBeLessThanOrEqual(ROW_MAX_ITEMS);
  });

  it("genre paling berisi tampil lebih dulu", () => {
    const list = [...banyak("Romance", 5, "r"), ...banyak("Action", 9, "a")];
    const genreRows = homeCatalogRows(list)
      .filter((r) => r.key.startsWith("genre-"))
      .map((r) => r.title);
    expect(genreRows).toEqual(["Drama Action", "Drama Romance"]);
  });

  it("tautan 'lihat semua' genre membawa kategorinya", () => {
    const row = homeCatalogRows(banyak("Time Travel", 6, "t")).find((r) =>
      r.key.startsWith("genre-"),
    );
    expect(row?.href).toBe("/discover?cat=Time%20Travel");
  });

  it("katalog kosong = nol baris, bukan baris kosong", () => {
    expect(homeCatalogRows([])).toEqual([]);
  });

  it("katalog sangat sedikit tidak menghasilkan baris yang terlihat rusak", () => {
    expect(homeCatalogRows(banyak("Action", 2, "a"))).toEqual([]);
  });

  it("tiap baris punya kunci unik (React butuh ini)", () => {
    const rows = homeCatalogRows([
      ...banyak("Action", 8, "a"),
      ...banyak("Romance", 8, "r"),
    ]);
    expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
  });
});
