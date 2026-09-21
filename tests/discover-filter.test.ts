import { describe, it, expect } from "vitest";
import {
  bacaFilter,
  filterAndSortDramas,
  genreDari,
  getCountryOptions,
  getGenreOptions,
  getYearOptions,
  negaraDari,
  parseImdb,
  tulisFilter,
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

// --- Penyaring & urutan yang dipakai menu navigasi (2026-09-10) -----------
// Katalog terpisah supaya kasus lama di atas tidak ikut berubah artinya.
const RAGAM: Drama[] = [
  stub({
    id: "s1",
    title: "Serial Tamat Gratis",
    status: "Completed",
    subtitles: ["id"],
    episodes: 50,
    views: "5.0K",
  }),
  stub({
    id: "s2",
    title: "Serial Tayang Koin",
    status: "Ongoing",
    premium: true,
    episodes: 20,
    views: "1.0M",
  }),
  stub({ id: "m1", title: "Film Gratis", kind: "movie", episodes: 1, views: "100" }),
];

describe("penyaring menu navigasi", () => {
  it("filter jenis: film hanya menangkap kind movie", () => {
    const hasil = filterAndSortDramas(RAGAM, { kind: "movie" });
    expect(hasil.map((d) => d.id)).toEqual(["m1"]);
  });

  it("filter jenis: serial ikut menangkap judul lama tanpa kind", () => {
    // Judul lama tidak punya kolom `kind` sama sekali; kalau tidak ikut
    // tertangkap, filter Serial memulangkan nol judul di katalog nyata.
    const hasil = filterAndSortDramas(RAGAM, { kind: "series" });
    expect(hasil.map((d) => d.id)).toEqual(["s1", "s2"]);
  });

  it("filter status", () => {
    expect(
      filterAndSortDramas(RAGAM, { status: "completed" }).map((d) => d.id),
    ).toEqual(["s1"]);
    expect(
      filterAndSortDramas(RAGAM, { status: "ongoing" }).map((d) => d.id),
    ).toEqual(["s2"]);
  });

  it("filter akses: koin vs gratis", () => {
    expect(filterAndSortDramas(RAGAM, { akses: "koin" }).map((d) => d.id)).toEqual([
      "s2",
    ]);
    // Judul tanpa kolom `premium` dihitung GRATIS — itu arti kolom kosong.
    expect(
      filterAndSortDramas(RAGAM, { akses: "gratis" }).map((d) => d.id),
    ).toEqual(["s1", "m1"]);
  });

  it("filter sub Indo", () => {
    expect(filterAndSortDramas(RAGAM, { sub: "id" }).map((d) => d.id)).toEqual([
      "s1",
    ]);
  });

  it("sort populer membaca satuan K/M, bukan mengurutkan teks", () => {
    // "1.0M" harus di atas "5.0K" — kalau dibandingkan sebagai teks, "5" > "1"
    // dan urutannya terbalik tanpa ada yang melapor.
    const hasil = filterAndSortDramas(RAGAM, { sortBy: "populer" });
    expect(hasil.map((d) => d.id)).toEqual(["s2", "s1", "m1"]);
  });

  it("sort episode terbanyak", () => {
    const hasil = filterAndSortDramas(RAGAM, { sortBy: "episodes" });
    expect(hasil.map((d) => d.id)).toEqual(["s1", "s2", "m1"]);
  });

  it("sort terbaru = urutan katalog dibalik", () => {
    const hasil = filterAndSortDramas(RAGAM, { sortBy: "terbaru" });
    expect(hasil.map((d) => d.id)).toEqual(["m1", "s2", "s1"]);
  });

  it("penyaring baru DIAM kalau tidak diisi (pemanggil lama tak berubah)", () => {
    const hasil = filterAndSortDramas(RAGAM, {});
    expect(hasil.map((d) => d.id)).toEqual(["s1", "s2", "m1"]);
  });
});

describe("negara (kolom country gabungan dari OMDb)", () => {
  const FILM: Drama[] = [
    stub({ id: "f1", title: "Satu", country: "United States, Canada" }),
    stub({ id: "f2", title: "Dua", country: "Canada" }),
    stub({ id: "f3", title: "Tiga" }), // tanpa negara
  ];

  it("memecah daftar gabungan jadi nama negara satuan", () => {
    expect(negaraDari(FILM[0])).toEqual(["United States", "Canada"]);
    expect(negaraDari(FILM[2])).toEqual([]);
  });

  it("mendaftar negara urut dari yang paling banyak judulnya", () => {
    expect(getCountryOptions(FILM)).toEqual(["Canada", "United States"]);
  });

  it("filter negara menangkap judul yang negaranya hanya salah satu dari daftar", () => {
    expect(
      filterAndSortDramas(FILM, { negara: "Canada" }).map((d) => d.id),
    ).toEqual(["f1", "f2"]);
    expect(
      filterAndSortDramas(FILM, { negara: "United States" }).map((d) => d.id),
    ).toEqual(["f1"]);
  });

  it("negara yang tidak ada memulangkan nol judul, bukan seluruh katalog", () => {
    expect(filterAndSortDramas(FILM, { negara: "Indonesia" })).toEqual([]);
  });
});

describe("genre sinema (kolom genre gabungan dari OMDb)", () => {
  // `category` (kategori kurasi DramaKu) dan `genre` (genre sinema OMDb) adalah
  // DUA hal berbeda yang sengaja hidup berdampingan. Tes di bawah mengunci
  // pemisahan itu: menyatukannya akan menghapus arti salah satunya.
  const FILM: Drama[] = [
    stub({
      id: "g1",
      title: "Satu",
      category: "Action",
      genre: "Action, Sci-Fi",
    }),
    stub({ id: "g2", title: "Dua", category: "Romance", genre: "Horror" }),
    stub({ id: "g3", title: "Tiga", category: "Comedy" }), // tanpa genre OMDb
  ];

  it("memecah daftar gabungan jadi genre satuan", () => {
    expect(genreDari(FILM[0])).toEqual(["Action", "Sci-Fi"]);
    expect(genreDari(FILM[2])).toEqual([]);
  });

  it("mendaftar genre urut dari yang paling banyak judulnya", () => {
    expect(getGenreOptions(FILM)).toEqual(["Action", "Horror", "Sci-Fi"]);
  });

  it("filter genre menangkap judul yang genrenya salah satu dari daftar", () => {
    expect(
      filterAndSortDramas(FILM, { genre: "Sci-Fi" }).map((d) => d.id),
    ).toEqual(["g1"]);
    expect(
      filterAndSortDramas(FILM, { genre: "Horror" }).map((d) => d.id),
    ).toEqual(["g2"]);
  });

  it("genre TIDAK sama dengan category — keduanya menyaring kolom berbeda", () => {
    // g2 berkategori Romance tapi bergenre Horror. Kalau keduanya disatukan,
    // salah satu dari dua harapan di bawah pasti meleset.
    expect(
      filterAndSortDramas(FILM, { genre: "Horror" }).map((d) => d.id),
    ).toEqual(["g2"]);
    expect(
      filterAndSortDramas(FILM, { category: "Romance" }).map((d) => d.id),
    ).toEqual(["g2"]);
    expect(filterAndSortDramas(FILM, { category: "Comedy", genre: "Horror" })).toEqual(
      [],
    );
  });

  it("genre yang tidak ada memulangkan nol judul, bukan seluruh katalog", () => {
    expect(filterAndSortDramas(FILM, { genre: "Anime" })).toEqual([]);
  });

  it("genre ikut terbaca & tertulis di alamat URL", () => {
    // Pemetaan alamat inilah yang menghubungkan chip strip ke grid /discover.
    // Kalau salah satu arah tertinggal, chip-nya tergambar tapi grid diam.
    const f = bacaFilter(new URLSearchParams("genre=Horror"));
    expect(f.genre).toBe("Horror");
    expect(tulisFilter(f)).toBe("genre=Horror");
    // Tanpa parameter = "all", dan "all" TIDAK ikut ditulis ke alamat.
    expect(bacaFilter(new URLSearchParams("")).genre).toBe("all");
    expect(tulisFilter(bacaFilter(new URLSearchParams("")))).toBe("");
  });
});
