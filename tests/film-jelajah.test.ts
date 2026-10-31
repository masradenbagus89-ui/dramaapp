import { describe, expect, it } from "vitest";
import {
  BATAS_MENU_NEGARA,
  genreFilm,
  opsiNegaraGabungan,
  saringFilm,
} from "@/lib/film-jelajah";
import type { PlaylyVideoPublik } from "@/lib/playly-publik";
import type { Drama } from "@/lib/types";

function film(ubah: Partial<PlaylyVideoPublik> = {}): PlaylyVideoPublik {
  return {
    id: "v1",
    title: "Film Uji",
    durationSeconds: 5400,
    durationLabel: "1:30:00",
    creator: "uji",
    embedUrl: "https://playly-dashboard.vercel.app/id/v1/embed",
    thumbnail: null,
    dramaTitle: null,
    dramaHref: null,
    episode: null,
    year: "2024",
    genre: null,
    kategori: null,
    rating: null,
    contentRating: null,
    country: null,
    quality: null,
    ...ubah,
  };
}

const drama = (ubah: Partial<Drama> = {}) =>
  ({ id: "d1", title: "Drama Uji", ...ubah }) as Drama;

describe("genreFilm", () => {
  it("memecah daftar OMDb yang dipisah koma", () => {
    expect(genreFilm(film({ genre: "Action, Drama, History" }))).toEqual([
      "Action",
      "Drama",
      "History",
    ]);
  });

  it("kategori pilihan admin ikut terhitung sebagai genre", () => {
    expect(genreFilm(film({ kategori: "Romance", genre: "Comedy" }))).toEqual([
      "Romance",
      "Comedy",
    ]);
  });
});

describe("saringFilm", () => {
  // INI jebakan yang membuat seluruh perbaikan bisa nol guna. Tombol "Komedi"
  // mengirim `cat=Comedy`, sedangkan film tidak punya kategori kurasi sama
  // sekali — nilainya hanya ada di `genre` OMDb. Kalau tes ini merah, mengklik
  // genre akan memulangkan halaman kosong persis seperti sebelum diperbaiki,
  // TANPA satu pun error.
  it("cat=Comedy menemukan film yang Comedy-nya ada di genre OMDb", () => {
    const hasil = saringFilm([film({ genre: "Comedy, Family" })], {
      category: "Comedy",
    });
    expect(hasil).toHaveLength(1);
  });

  it("genre=Animation menemukan film beranimasi", () => {
    const daftar = [
      film({ id: "a", genre: "Animation, Adventure" }),
      film({ id: "b", genre: "Horror" }),
    ];
    expect(saringFilm(daftar, { genre: "Animation" }).map((v) => v.id)).toEqual(["a"]);
  });

  // OMDb tidak konsisten huruf besar-kecilnya; pencocokan yang kaku akan
  // menjatuhkan judul yang sebenarnya cocok.
  it("tidak peduli huruf besar-kecil", () => {
    expect(saringFilm([film({ genre: "action" })], { category: "Action" })).toHaveLength(1);
  });

  it("menyaring negara dari daftar gabungan", () => {
    const daftar = [
      film({ id: "a", country: "United States, China" }),
      film({ id: "b", country: "Japan" }),
    ];
    expect(saringFilm(daftar, { negara: "China" }).map((v) => v.id)).toEqual(["a"]);
  });

  it("menyaring tahun", () => {
    const daftar = [film({ id: "a", year: "2024" }), film({ id: "b", year: "2019" })];
    expect(saringFilm(daftar, { year: "2019" }).map((v) => v.id)).toEqual(["b"]);
  });

  it("tanpa penyaring, semua film lolos", () => {
    const daftar = [film({ id: "a" }), film({ id: "b" })];
    expect(saringFilm(daftar, {})).toHaveLength(2);
    expect(saringFilm(daftar, { category: "Semua", genre: "all" })).toHaveLength(2);
  });

  it("film tanpa genre tidak ikut saat genre disaring", () => {
    expect(saringFilm([film({ genre: null })], { genre: "Horror" })).toHaveLength(0);
  });
});

describe("opsiNegaraGabungan", () => {
  it("menggabungkan negara dari drama DAN film", () => {
    const hasil = opsiNegaraGabungan(
      [drama({ country: "China" })],
      [film({ country: "Japan" })],
    );
    expect(hasil).toContain("China");
    expect(hasil).toContain("Japan");
  });

  // Inti keluhan owner: satu film ko-produksi enam negara tidak boleh membuat
  // keenamnya terlihat sepenting negara yang benar-benar punya banyak judul.
  it("mengurutkan dari jumlah JUDUL terbanyak, bukan kemunculan", () => {
    const videos = [
      film({ id: "1", country: "United States, China, Thailand, Germany" }),
      film({ id: "2", country: "Japan" }),
      film({ id: "3", country: "Japan" }),
      film({ id: "4", country: "Japan" }),
    ];
    expect(opsiNegaraGabungan([], videos)[0]).toBe("Japan");
  });

  it("negara yang sama di dua sumber dihitung sekali per judul", () => {
    const hasil = opsiNegaraGabungan(
      [drama({ country: "Japan, Japan" })],
      [],
    );
    expect(hasil).toEqual(["Japan"]);
  });

  it("dibatasi supaya menu tidak jadi daftar raksasa", () => {
    const videos = Array.from({ length: 30 }, (_, i) =>
      film({ id: `v${i}`, country: `Negara${i}` }),
    );
    expect(opsiNegaraGabungan([], videos)).toHaveLength(BATAS_MENU_NEGARA);
  });

  it("katalog tanpa negara sama sekali menghasilkan daftar kosong", () => {
    expect(opsiNegaraGabungan([drama()], [film()])).toEqual([]);
  });
});
