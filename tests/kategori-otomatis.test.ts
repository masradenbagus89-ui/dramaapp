// Penjaga tebakan kategori dari genre IMDb (lib/kategori-otomatis.ts).
//
// Kerusakan yang dijaga di sini SENYAP semua: kategori yang salah tidak pernah
// melempar error — videonya cuma muncul di baris beranda yang keliru, atau
// hilang dari semua baris. Tidak ada yang melapor.
import { describe, it, expect } from "vitest";
import {
  PETA_GENRE,
  kategoriPetaSah,
  pecahGenre,
  susunUsulKategori,
  tebakKategori,
} from "../lib/kategori-otomatis";
import { KATEGORI_ISI } from "../lib/types";

describe("tebakKategori — genre IMDb jadi kategori DramaKu", () => {
  it("memakai nilai NYATA dari katalog Playly", () => {
    // Keempatnya disalin apa adanya dari data produksi 2026-11-09.
    expect(tebakKategori("Action, Drama, Western")).toBe("Action");
    expect(tebakKategori("Comedy")).toBe("Comedy");
    expect(tebakKategori("Fantasy")).toBe("Fantasy");
    expect(tebakKategori("Romance")).toBe("Romance");
  });

  it("PRIORITAS: yang lebih spesifik menang atas Action", () => {
    // Inti rancangannya. 279 dari 466 film bergenre Action, jadi kalau Action
    // diperiksa lebih dulu, hampir semua film berakhir di satu kategori dan
    // fiturnya jadi tidak berguna untuk menjelajah.
    expect(tebakKategori("Action, Romance")).toBe("Romance");
    expect(tebakKategori("Action, Comedy")).toBe("Comedy");
    expect(tebakKategori("Action, Sci-Fi")).toBe("Fantasy");
    // Dan Action tetap menang atas genre yang TIDAK dipetakan.
    expect(tebakKategori("Drama, Action")).toBe("Action");
  });

  it("genre tanpa padanan memulangkan null, BUKAN kategori asal-asalan", () => {
    // 53 video nyata berakhir di sini. Memaksakan Horror jadi "Fantasy"
    // membuat penonton yang membuka Fantasy menemukan film yang salah.
    expect(tebakKategori("Horror")).toBeNull();
    expect(tebakKategori("Documentary")).toBeNull();
    expect(tebakKategori("Drama, Western")).toBeNull();
    expect(tebakKategori("Animation")).toBeNull();
    expect(tebakKategori("Short")).toBeNull();
  });

  it("teks kosong / rusak tidak menghasilkan tebakan", () => {
    expect(tebakKategori("")).toBeNull();
    expect(tebakKategori("   ")).toBeNull();
    expect(tebakKategori(null)).toBeNull();
    expect(tebakKategori(undefined)).toBeNull();
    expect(tebakKategori(",,,")).toBeNull();
  });

  it("bentuk teks yang berantakan dari layanan luar tetap terbaca", () => {
    expect(tebakKategori("  action ,  drama ")).toBe("Action");
    expect(tebakKategori("ACTION")).toBe("Action");
    expect(tebakKategori("Action,")).toBe("Action");
  });
});

describe("pecahGenre", () => {
  it("membuang spasi dan bagian kosong", () => {
    expect(pecahGenre("Action, Drama, Western")).toEqual([
      "Action",
      "Drama",
      "Western",
    ]);
    expect(pecahGenre("Action,,Drama,")).toEqual(["Action", "Drama"]);
    expect(pecahGenre(null)).toEqual([]);
  });
});

describe("PETA_GENRE — penjaga keselarasan dengan daftar kategori resmi", () => {
  it("tiap kategori di peta ADA di CATEGORIES", () => {
    // Kalau lib/types.ts mengganti nama kategori dan peta ini tidak ikut,
    // hasil tebakan tersimpan sebagai kategori yang tak dikenal siapa pun —
    // videonya lenyap dari SEMUA baris beranda, tanpa error.
    expect(kategoriPetaSah()).toBe(true);
    for (const [kategori] of PETA_GENRE) {
      expect(KATEGORI_ISI).toContain(kategori);
    }
  });

  it("Tycoon, Harem, Time Travel SENGAJA tidak dipetakan", () => {
    // Ketiganya untuk drama pendek Cina dan tidak punya padanan genre IMDb.
    // Tes ini mengunci keputusan itu: kalau suatu saat ada yang memetakan
    // "Drama" ke Tycoon, ia harus menghapus tes ini lebih dulu — dan itu
    // memaksa keputusannya disengaja, bukan tergelincir.
    const dipetakan = PETA_GENRE.map(([k]) => k);
    expect(dipetakan).not.toContain("Tycoon");
    expect(dipetakan).not.toContain("Harem");
    expect(dipetakan).not.toContain("Time Travel");
  });
});

describe("susunUsulKategori — usulan untuk seluruh katalog", () => {
  const videos = [
    { id: "1", title: "Film Aksi" },
    { id: "2", title: "Film Horor" },
    { id: "3", title: "Film Tanpa IMDb" },
    { id: "4", title: "Film Sudah Berkategori" },
  ];
  const imdb = {
    "1": { genre: "Action, Thriller" },
    "2": { genre: "Horror" },
    "4": { genre: "Comedy" },
  };

  it("mengusulkan hanya yang bisa ditebak", () => {
    const { usul, lewat } = susunUsulKategori(videos, imdb, { "4": "Romance" });
    expect(usul).toHaveLength(1);
    expect(usul[0]).toMatchObject({ videoId: "1", kategori: "Action" });
    expect(lewat).toEqual({
      "sudah-punya": 1,
      "tanpa-imdb": 1,
      "genre-tak-cocok": 1,
    });
  });

  it("TIDAK menimpa kategori yang sudah diisi tangan", () => {
    // Pagar yang sama dengan pengisian durasi massal. Video 4 bergenre Comedy,
    // tapi admin sudah menaruhnya di Romance — tebakan mesin tidak boleh
    // membatalkan keputusan itu.
    const { usul } = susunUsulKategori(videos, imdb, { "4": "Romance" });
    expect(usul.map((u) => u.videoId)).not.toContain("4");
  });

  it("genre ikut dibawa supaya admin bisa menilai tebakannya", () => {
    // Tanpa genre aslinya di layar, admin cuma bisa percaya atau tidak —
    // tidak bisa MEMERIKSA.
    const { usul } = susunUsulKategori(videos, imdb, {});
    expect(usul.find((u) => u.videoId === "1")?.genre).toBe("Action, Thriller");
  });

  it("katalog kosong tidak melempar error", () => {
    const { usul, lewat } = susunUsulKategori([], {}, {});
    expect(usul).toEqual([]);
    expect(lewat["sudah-punya"]).toBe(0);
  });
});
