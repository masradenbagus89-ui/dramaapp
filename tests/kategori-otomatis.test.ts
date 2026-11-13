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
    //
    // ⚠️ Nilai harapan baris pertama BERUBAH 2026-11-13 ("Action" -> "Western")
    // dan itu DISENGAJA, bukan tes yang dilonggarkan: sejak owner menambah 17
    // kategori, "Western" punya kamar sendiri dan diperiksa lebih dulu karena
    // jauh lebih khas. Film action-drama-koboi memang lebih berguna dicari di
    // rak Koboi daripada ikut tenggelam bersama 279 film Action lainnya.
    expect(tebakKategori("Action, Drama, Western")).toBe("Western");
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
    // Dulu "Fantasy" — Sci-Fi menumpang di sana karena belum punya kamar
    // sendiri. Sejak 2026-11-13 ia punya, jadi tebakannya kini tepat.
    expect(tebakKategori("Action, Sci-Fi")).toBe("Sci-Fi");
    // Action tetap menang atas "Drama", yang sengaja ditaruh PALING BAWAH:
    // hampir semua film serius ikut menyandang genre itu, jadi mendahulukannya
    // akan menyedot hampir seluruh katalog ke satu kamar.
    expect(tebakKategori("Drama, Action")).toBe("Action");
  });

  it("genre yang KINI punya kamar sendiri tidak lagi pulang kosong", () => {
    // Inilah yang owner keluhkan 2026-11-13 ("pilihan genrenya sedikit").
    // Sebelum hari itu kelima baris di bawah semuanya memulangkan null —
    // bukan karena genrenya tak terbaca, tapi karena DramaKu belum punya
    // kategori untuk menampungnya. Horror saja 82 film.
    expect(tebakKategori("Horror")).toBe("Horror");
    expect(tebakKategori("Documentary")).toBe("Documentary");
    expect(tebakKategori("Animation")).toBe("Animation");
    expect(tebakKategori("Drama, Western")).toBe("Western");
    expect(tebakKategori("Drama")).toBe("Drama");
  });

  it("genre tanpa padanan TETAP memulangkan null, bukan kategori asal-asalan", () => {
    // Pagar ini tidak ikut longgar. Genre di bawah sengaja tidak dipetakan
    // (alasannya di lib/types.ts), dan memaksakannya masuk kategori "aman"
    // akan menyembunyikan kegagalan: tak ada error, cuma rak berisi film yang
    // salah kamar.
    //
    // Tinggal DUA sejak owner menaikkan katalog ke 30 kategori (2026-11-13):
    // Short/Talk-Show/Reality-TV yang dulu di sini kini punya kamar sendiri.
    expect(tebakKategori("News")).toBeNull();
    expect(tebakKategori("Adult")).toBeNull();
  });

  it("'Short' kalah dari genre isi — ia penanda DURASI, bukan genre", () => {
    // Film pendek di IMDb hampir selalu berpasangan ("Short, Comedy"). Kalau
    // Short menang, seluruh film pendek menumpuk di satu rak dan penonton
    // kehilangan genre aslinya. Ia hanya dipakai saat berdiri sendirian.
    expect(tebakKategori("Short, Comedy")).toBe("Comedy");
    expect(tebakKategori("Short, Horror")).toBe("Horror");
    expect(tebakKategori("Short")).toBe("Short");
  });

  it("'Music' dan 'Musical' TIDAK lagi satu kamar", () => {
    // Dua genre IMDb yang berbeda: "Musical" = tokohnya bernyanyi (La La
    // Land), "Music" = film tentang musik (Bohemian Rhapsody). Sampai
    // 2026-11-13 Music menumpang di Musical, jadi semuanya salah kamar.
    expect(tebakKategori("Musical")).toBe("Musical");
    expect(tebakKategori("Music")).toBe("Music");
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
    // Dua usulan sejak 2026-11-13, bukan satu: video "2" bergenre Horror yang
    // dulu terpaksa dilewati ("genre-tak-cocok") kini punya kamarnya sendiri.
    // Yang TIDAK berubah: video 3 tetap dilewati karena tak punya data IMDb,
    // dan video 4 tetap dilewati karena kategorinya sudah diisi tangan.
    expect(usul).toHaveLength(2);
    expect(usul[0]).toMatchObject({ videoId: "1", kategori: "Thriller" });
    expect(usul[1]).toMatchObject({ videoId: "2", kategori: "Horror" });
    expect(lewat).toEqual({
      "sudah-punya": 1,
      "tanpa-imdb": 1,
      "genre-tak-cocok": 0,
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
