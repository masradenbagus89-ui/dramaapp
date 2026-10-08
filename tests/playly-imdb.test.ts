// Penjaga PEMBERSIH JUDUL + pagar host poster untuk metadata IMDb video Playly.
//
// Kenapa dijaga tes, dan kenapa justru di sini:
//
//  1. PEMBERSIH JUDUL menentukan film mana yang dicocokkan. Salahnya SENYAP —
//     tidak ada error, cuma poster dan sinopsis film LAIN yang tayang ke
//     pengunjung. "Blade Runner 2049" yang terpotong jadi "Blade Runner" akan
//     memasang poster film 1982 pada video 2017, dan tak ada yang melapor.
//
//  2. PAGAR HOST POSTER adalah satu-satunya yang menahan alamat gambar dari
//     host sembarangan masuk ke halaman publik (rak owasp §1 A10 gagal-aman).
//
// Semua judul di bawah NYATA, disalin dari katalog Playly produksi 2026-10-08 —
// bukan contoh karangan. Itu disengaja: aturan ini dibuat dari data nyata, jadi
// yang menjaganya harus data yang sama.
import { describe, it, expect } from "vitest";
import { bersihkanJudulRilis, posterAman } from "../lib/playly-imdb";

describe("bersihkanJudulRilis — potong di tahun", () => {
  it("membuang embel-embel rilis yang menempel SESUDAH tahun", () => {
    // Inilah aturan intinya: embel-embel (YIFY, 1080p, -compressed, AMZN)
    // selalu di belakang tahun, jadi satu aturan posisi cukup — tak perlu
    // daftar nama grup rilis yang pasti tertinggal zaman.
    const kasus: [string, string, string][] = [
      ["The Gunman 2015 YIFY", "The Gunman", "2015"],
      ["Passengers 2016 x264", "Passengers", "2016"],
      ["High Rollers (2025) - 1080p-001", "High Rollers", "2025"],
      ["Blade Of Fury (2024)-compressed", "Blade Of Fury", "2024"],
      ["Blue Moon (2025) - WAN™", "Blue Moon", "2025"],
      ["Deva (2025) Hindi ESub", "Deva", "2025"],
      ["The Box in the Attic 2026 AMZN AVC1", "The Box in the Attic", "2026"],
      ["Blind War 2022 CHINESE x264-Mkvking", "Blind War", "2022"],
      ["Kantara A Legend Chapter 1 2025 -WORLD", "Kantara A Legend Chapter 1", "2025"],
      [
        "Speed And Battle 2026 Chinese Hc Bone-compressed",
        "Speed And Battle",
        "2026",
      ],
    ];
    for (const [mentah, judul, tahun] of kasus) {
      expect(bersihkanJudulRilis(mentah), mentah).toEqual({ judul, tahun });
    }
  });

  it("menangani '(Unknown Year)' yang ikut tertulis sesudah tahun aslinya", () => {
    // Pola khas unggahan: tahun asli di depan, lalu penanda "tahun tak dikenal"
    // dari alat pengunduh. Tahun yang benar adalah yang DEPAN.
    expect(
      bersihkanJudulRilis("Attack Of The Meth Gator 2023 (Unknown Year)"),
    ).toEqual({ judul: "Attack Of The Meth Gator", tahun: "2023" });
  });

  it("menerima tahun berkurung maupun telanjang", () => {
    expect(bersihkanJudulRilis("The Beekeeper (2024)")).toEqual({
      judul: "The Beekeeper",
      tahun: "2024",
    });
    expect(bersihkanJudulRilis("Jurassic World Rebirth 2025")).toEqual({
      judul: "Jurassic World Rebirth",
      tahun: "2025",
    });
  });

  it("memotong di penanda episode untuk potongan serial", () => {
    // Judul serial sering tanpa tahun sama sekali; penanda S01E04 yang jadi
    // batas judulnya. Tanpa aturan ini, seluruh nama berkas ikut jadi kata
    // pencarian dan tak pernah cocok.
    expect(
      bersihkanJudulRilis(
        "Its Always Sunny in Philadelphia S09E02 Gun Fever Too Still Hot x264-OFT",
      ),
    ).toEqual({ judul: "Its Always Sunny in Philadelphia", tahun: "" });
  });

  it("membuang kata pembuka unggahan di AWAL judul", () => {
    expect(
      bersihkanJudulRilis(
        "Nonton RESIDENT EVIL Infinite Darkness S01E04 NF x264-GalaxyTV Sub Indo",
      ),
    ).toEqual({ judul: "RESIDENT EVIL Infinite Darkness", tahun: "" });
  });

  it("TIDAK memotong angka 4 digit yang bagian dari judul", () => {
    // Pelindung paling penting di berkas ini. "Blade Runner 2049" dipotong =
    // mencocokkan film 1982, dan poster yang salah tayang tanpa error apa pun.
    expect(bersihkanJudulRilis("Blade Runner 2049")).toEqual({
      judul: "Blade Runner 2049",
      tahun: "",
    });
  });

  it("membiarkan judul tanpa tahun apa adanya", () => {
    // Angka di "Meg 2" bukan tahun — jangan sampai ikut dijadikan batas potong.
    expect(bersihkanJudulRilis("Meg 2 The Trench")).toEqual({
      judul: "Meg 2 The Trench",
      tahun: "",
    });
  });

  it("tidak pernah mengembalikan judul kosong untuk masukan berisi", () => {
    // Kalau pemotongan menyisakan kosong (judul yang isinya cuma tahun),
    // judul aslinya dipakai — lebih baik mencari dengan kata seadanya daripada
    // mengirim pencarian kosong ke OMDb.
    const hasil = bersihkanJudulRilis("2012");
    expect(hasil.judul).not.toBe("");
  });

  it("aman untuk masukan kosong", () => {
    expect(bersihkanJudulRilis("")).toEqual({ judul: "", tahun: "" });
    expect(bersihkanJudulRilis("   ")).toEqual({ judul: "", tahun: "" });
  });
});

describe("posterAman — gagal-aman, bukan fail-open", () => {
  const sah =
    "https://m.media-amazon.com/images/M/MV5BOGNi@._V1_SX600.jpg";

  it("meloloskan host resmi OMDb", () => {
    expect(posterAman(sah)).toBe(sah);
  });

  it("menolak host asing", () => {
    expect(posterAman("https://contoh-jahat.id/poster.jpg")).toBe("");
  });

  it("menolak host yang MENYERUPAI host resmi", () => {
    // Pencocokan akhiran akan meloloskan keduanya. Itu sebabnya hostname
    // dicocokkan persis, bukan dengan endsWith.
    expect(posterAman("https://jahat-m.media-amazon.com/p.jpg")).toBe("");
    expect(posterAman("https://m.media-amazon.com.contoh.id/p.jpg")).toBe("");
  });

  it("menolak http polos", () => {
    expect(posterAman("http://m.media-amazon.com/p.jpg")).toBe("");
  });

  it("menolak alamat rusak / kosong tanpa melempar", () => {
    // Yang tak bisa diurai TIDAK boleh diloloskan "karena mungkin benar".
    expect(posterAman("bukan-alamat")).toBe("");
    expect(posterAman("")).toBe("");
  });
});
