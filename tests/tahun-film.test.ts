// Penjaga urutan seksi "Film Terbaru" — owner 2026-11-14: "film terbaru kamu
// rubah daftarnya lihat dari tahunnya bukan dari yang baru di upload biar
// terupdate film yang benar benar baru".
//
// ⚠️ KENAPA TES INI WAJIB ADA, bukan cukup dilihat di layar: daftar filmnya
// datang dari penyedia LUAR yang butuh kunci API, dan kunci itu hanya ada di
// server produksi. Di komputer mana pun barisnya SELALU kosong, jadi urutan
// mustahil dibuktikan lewat localhost maupun screenshot (alasan yang sama
// dengan tests/jenis-video.test.ts).
//
// Angka-angka yang dipakai di bawah BUKAN karangan — semuanya terukur dari
// 481 video yang tayang di produksi pada 2026-11-14, dan tiap kelompok mewakili
// satu bentuk data yang benar-benar ada di sana.
//
// 📌 Angkanya POTRET SESAAT (admin sedang melengkapi metadata; terukur bergerak
// dalam setengah jam yang sama). Yang dikunci tes ini adalah PERILAKU-nya, bukan
// jumlahnya — tak satu pun `expect` di bawah bergantung pada angka itu, supaya
// penjaganya tidak merah hanya karena katalog bertambah.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  tahunDariJudul,
  tahunDariKolom,
  tahunRilis,
  urutMenurutTahunRilis,
} from "../lib/tahun-film";

const film = (title: string, year: string | null = null) => ({ title, year });

describe("tahunDariJudul — membaca tahun yang tertulis di nama berkas", () => {
  it("mengambil tahun dalam kurung", () => {
    expect(tahunDariJudul("The Mongoose (2026)")).toBe(2026);
    expect(tahunDariJudul("Hitman's Wife's Bodyguard (2021)")).toBe(2021);
  });

  it("tetap terbaca walau ada embel-embel sesudah kurungnya", () => {
    // Lima judul di produksi berbentuk begini — sisa nama berkas.
    expect(tahunDariJudul("Thudarum (2025) ESub")).toBe(2025);
    expect(tahunDariJudul("Imitation (2023) - E02")).toBe(2023);
    expect(tahunDariJudul("Shelby Oaks (2024) - WAN™")).toBe(2024);
  });

  it("MENOLAK 4 angka yang tidak dalam kurung", () => {
    // Pagar utamanya. Tanpa ini "Blade Runner 2049" jadi film tahun 2049 dan
    // menguasai urutan teratas selamanya.
    expect(tahunDariJudul("Blade Runner 2049")).toBeNull();
    expect(tahunDariJudul("1917")).toBeNull();
    expect(tahunDariJudul("72 HOURS")).toBeNull();
  });

  it("menolak angka dalam kurung yang jelas bukan tahun", () => {
    expect(tahunDariJudul("Ocean's (0000)")).toBeNull();
    expect(tahunDariJudul("Film (1812)")).toBeNull();
  });

  it("judul kosong / tak ada = null, bukan lempar error", () => {
    expect(tahunDariJudul("")).toBeNull();
    expect(tahunDariJudul(null)).toBeNull();
    expect(tahunDariJudul(undefined)).toBeNull();
  });

  it("mengambil yang PERTAMA kalau ada dua kurung tahun", () => {
    expect(tahunDariJudul("Dune (2021) remaster (1984)")).toBe(2021);
  });
});

describe("tahunDariKolom — tahun tersimpan, termasuk bentuk rentang IMDb", () => {
  it("membaca 4 angka biasa", () => {
    expect(tahunDariKolom("2024")).toBe(2024);
  });

  it("rentang serial diambil tahun MULAI-nya", () => {
    // Bentuk yang benar-benar ada di produksi: 2022–, 2024–2027, 2014–2026.
    expect(tahunDariKolom("2024–2027")).toBe(2024);
    expect(tahunDariKolom("2022–")).toBe(2022);
    expect(tahunDariKolom("2014–2026")).toBe(2014);
  });

  it("kosong / null = null", () => {
    expect(tahunDariKolom(null)).toBeNull();
    expect(tahunDariKolom("")).toBeNull();
    expect(tahunDariKolom("-")).toBeNull();
  });
});

describe("tahunRilis — kolom tersimpan MENANG atas judul", () => {
  it("pakai kolom year kalau ada", () => {
    // Ketikan admin sudah menang atas IMDb sebelum sampai ke sini
    // (lib/durasi-video-publik.ts), jadi ia tak boleh kalah oleh nama berkas.
    expect(tahunRilis(film("Old Guy (2024)", "2025"))).toBe(2025);
  });

  it("jatuh ke judul kalau kolomnya kosong", () => {
    // Inilah kasus puluhan film di produksi — dan 12 di antaranya justru yang
    // paling depan saat owner melapor, karena upload terbaru selalu yang paling
    // belakangan dicocokkan metadatanya.
    expect(tahunRilis(film("The Mongoose (2026)", null))).toBe(2026);
  });

  it("null kalau tidak ada tahun di mana pun", () => {
    expect(tahunRilis(film("Novocaine", null))).toBeNull();
  });
});

describe("urutMenurutTahunRilis — inti permintaan owner", () => {
  it("tahun terbaru naik ke depan, tahun lama turun", () => {
    const hasil = urutMenurutTahunRilis([
      film("Hitman's Wife's Bodyguard (2021)"),
      film("The Mongoose (2026)"),
      film("The Lair (2022)"),
      film("The Naked Gun (2025)"),
    ]);
    expect(hasil.map((v) => v.title)).toEqual([
      "The Mongoose (2026)",
      "The Naked Gun (2025)",
      "The Lair (2022)",
      "Hitman's Wife's Bodyguard (2021)",
    ]);
  });

  it("KELUHAN ASLI owner: film lama yang baru di-upload tidak lagi di depan", () => {
    // Urutan masuk = urutan tayang SEBELUM perbaikan (terbaru-upload dulu).
    // Film 2021 diunggah paling akhir, jadi dulu ia yang paling depan.
    const sepertiDiLayar = [
      film("Hitman's Wife's Bodyguard (2021)"),
      film("The Killer's Game (2024)"),
      film("The Lair (2022)"),
      film("The Mongoose (2026)"),
    ];
    const hasil = urutMenurutTahunRilis(sepertiDiLayar);
    expect(hasil[0].title).toBe("The Mongoose (2026)");
    expect(hasil[hasil.length - 1].title).toBe("Hitman's Wife's Bodyguard (2021)");
  });

  it("tahun SAMA = urutan upload dipertahankan (yang baru tetap di depan)", () => {
    const hasil = urutMenurutTahunRilis([
      film("Upload paling baru (2026)"),
      film("Upload kemarin (2026)"),
      film("Upload bulan lalu (2026)"),
    ]);
    expect(hasil.map((v) => v.title)).toEqual([
      "Upload paling baru (2026)",
      "Upload kemarin (2026)",
      "Upload bulan lalu (2026)",
    ]);
  });

  it("film tanpa tahun ke BELAKANG, tapi TIDAK dibuang", () => {
    // Sebagian film di produksi tidak punya tahun di mana pun. Membuangnya
    // berarti judul-judul itu lenyap dari situs gara-gara metadatanya belum
    // lengkap — kehilangan yang jauh lebih parah daripada urutan yang kurang pas.
    const masuk = [
      film("Novocaine"),
      film("The Lair (2022)"),
      film("Land Of Bad"),
      film("The Mongoose (2026)"),
    ];
    const hasil = urutMenurutTahunRilis(masuk);
    expect(hasil).toHaveLength(masuk.length);
    expect(hasil.map((v) => v.title)).toEqual([
      "The Mongoose (2026)",
      "The Lair (2022)",
      "Novocaine",
      "Land Of Bad",
    ]);
  });

  it("daftar aslinya TIDAK diubah di tempat", () => {
    const asli = [film("A (2021)"), film("B (2026)")];
    const salinan = [...asli];
    urutMenurutTahunRilis(asli);
    expect(asli).toEqual(salinan);
  });

  it("daftar kosong tetap kosong, bukan error", () => {
    expect(urutMenurutTahunRilis([])).toEqual([]);
  });
});

describe("penjaga URUTAN LANGKAH — urut dulu, potong belakangan", () => {
  it("memotong 20 lebih dulu akan menyembunyikan film terbaru (buktinya)", () => {
    // Diuji-balik: ini membuktikan KENAPA urutannya dipasang di titik rakit,
    // bukan sesudah halaman memotong daftarnya. 20 film lama yang baru
    // diunggah, lalu 1 film 2026 yang diunggah lebih lama.
    const daftar = [
      ...Array.from({ length: 20 }, (_, i) => film(`Film lama ${i} (2015)`)),
      film("Film benar-benar baru (2026)"),
    ];

    const SALAH = urutMenurutTahunRilis(daftar.slice(0, 20));
    expect(SALAH.some((v) => v.title.includes("benar-benar baru"))).toBe(false);

    const BENAR = urutMenurutTahunRilis(daftar).slice(0, 20);
    expect(BENAR[0].title).toBe("Film benar-benar baru (2026)");
  });
});

describe("penjaga SATU TEMPAT — aturannya tidak boleh tercecer ke halaman", () => {
  // Owner 2026-11-14 minta urutannya SERAGAM se-situs. Satu-satunya cara itu
  // bisa dijamin adalah satu pemanggil: begitu sebuah halaman mengurut sendiri,
  // ia boleh berbeda dari halaman lain dan tak ada error yang memberi tahu.
  //
  // Komentar DIBUANG sebelum diperiksa — pelajaran 2026-11-14 (ke-2) di
  // docs/lintasai/INDEX.md: penjaga teks bisa lulus dari komentarnya sendiri,
  // dan berkas-berkas ini memang menyebut nama fungsinya di komentar.
  const tanpaKomentar = (berkas: string) =>
    readFileSync(berkas, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "");

  it("lib/playly-gabungan.ts memanggil pengurutnya", () => {
    expect(tanpaKomentar("lib/playly-gabungan.ts")).toContain(
      "urutMenurutTahunRilis(",
    );
  });

  it("jalur CADANGAN ikut diurut, bukan cuma jalur normal", () => {
    // Kalau yang diurut cuma jalur normal, urutan situs diam-diam kembali ke
    // aturan lama persis saat sumber videonya sedang bermasalah.
    const isi = tanpaKomentar("lib/playly-gabungan.ts");
    const berapa = isi.split("urutMenurutTahunRilis(").length - 1;
    expect(berapa).toBeGreaterThanOrEqual(2);
  });

  it.each(["app/page.tsx", "app/beranda/page.tsx", "app/film/page.tsx"])(
    "%s TIDAK mengurut sendiri (sumbernya yang mengurut)",
    (berkas) => {
      expect(tanpaKomentar(berkas)).not.toContain("urutMenurutTahunRilis");
    },
  );
});
