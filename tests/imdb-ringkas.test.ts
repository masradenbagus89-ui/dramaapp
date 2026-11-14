// Penjaga PEMANGKASAN data IMDb yang dikirim ke browser admin (owner
// 2026-11-14: "panel admin loading lama").
//
// Yang dijaga bukan "fungsinya jalan" — itu bagian mudahnya. Yang dijaga:
// daftar-putih `FIELD_IMDB_ADMIN` tetap COCOK dengan apa yang benar-benar
// dibaca komponen. Kalau suatu saat ada yang menulis `imdb[id]?.synopsis`,
// nilainya `undefined` — NOL error, kolomnya cuma kosong. Tes inilah satu-
// satunya yang bisa menangkapnya.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  FIELD_IMDB_ADMIN,
  ringkasImdbUntukAdmin,
  videoBelumDicocokkan,
  type PlaylyImdbMap,
} from "../lib/playly-imdb";

/** Satu entri IMDb lengkap, seperti yang benar-benar tersimpan di database. */
const ENTRI_PENUH = {
  imdbId: "tt9224104",
  title: "Contoh Film",
  year: "2024",
  poster: "https://m.media-amazon.com/images/contoh.jpg",
  genre: "Action, Drama",
  rating: "7.4",
  contentRating: "PG-13",
  runtime: "118 min",
  synopsis: "Sinopsis panjang yang sengaja tidak pernah dibaca layar admin.",
  director: "Sutradara",
  writer: "Penulis",
  stars: "A, B, C",
  country: "Indonesia",
  language: "Indonesian",
  imdbVotes: "105,613",
  sumber: "manual",
  dicocokkanPada: "2026-11-14T00:00:00.000Z",
} as const;

const PETA: PlaylyImdbMap = { "123": { ...ENTRI_PENUH } };

describe("ringkasImdbUntukAdmin memangkas payload, bukan datanya", () => {
  it("menyisakan PERSIS field yang ada di daftar-putih", () => {
    const hasil = ringkasImdbUntukAdmin(PETA);
    expect(Object.keys(hasil["123"]).sort()).toEqual([...FIELD_IMDB_ADMIN].sort());
  });

  it("membuang field terbesar yang tak pernah dibaca layar admin", () => {
    const entri = ringkasImdbUntukAdmin(PETA)["123"] as Record<string, unknown>;
    // `synopsis` sendirian 188 KB dari 479 KB dokumen produksi — alasan utama
    // pemangkasan ini ada. Kalau ia muncul lagi, penghematannya lenyap.
    for (const dibuang of ["synopsis", "poster", "stars", "writer", "imdbId"]) {
      expect(entri[dibuang], `${dibuang} ikut terkirim lagi ke browser`).toBeUndefined();
    }
  });

  it("nilainya tidak berubah, cuma lebih sedikit", () => {
    expect(ringkasImdbUntukAdmin(PETA)["123"]).toEqual({
      title: "Contoh Film",
      year: "2024",
      rating: "7.4",
      genre: "Action, Drama",
    });
  });

  it("KEANGGOTAAN peta dipertahankan walau keempat nilainya kosong", () => {
    // Pagar paling penting di fungsi ini. Panel "Cocokkan semua" menilai dari
    // ADA/TIDAKNYA entri; kalau entri bernilai kosong ikut dibuang, video yang
    // sudah dicocokkan akan dicocokkan ULANG — menimpa koreksi tangan admin,
    // tanpa satu pun error.
    const kosong: PlaylyImdbMap = {
      "999": { ...ENTRI_PENUH, title: "", year: "", rating: "", genre: "" },
    };
    const hasil = ringkasImdbUntukAdmin(kosong);
    expect(Object.keys(hasil)).toEqual(["999"]);
    expect(videoBelumDicocokkan([{ id: "999" }], hasil)).toEqual([]);
  });

  it("peta kosong tetap peta kosong, bukan error", () => {
    expect(ringkasImdbUntukAdmin({})).toEqual({});
  });
});

// ===========================================================================
// PENJAGA DAFTAR-PUTIH — membaca komponen SUNGGUHAN, bukan tiruan.
// ===========================================================================
describe("daftar-putih cocok dengan yang dibaca komponen", () => {
  /**
   * Kelima berkas yang menerima peta IMDb, diaudit satu per satu 2026-11-14.
   * Berkas BARU yang memakai peta ini wajib ditambahkan ke sini — kalau tidak,
   * pemakaian fieldnya tak pernah diperiksa siapa pun.
   */
  const PEMAKAI = [
    "app/components/admin/PlaylyVisibilityManager.tsx",
    "app/components/admin/PlaylyIsiCepat.tsx",
    "app/components/admin/PlaylyImdbPicker.tsx",
    "app/components/admin/PlaylyCocokkanSemua.tsx",
    "lib/kategori-otomatis.ts",
  ];

  /** Nama field yang dibaca dari peta/entri IMDb di satu berkas. */
  function fieldDibaca(sumber: string): string[] {
    const hasil = new Set<string>();
    // `imdb[apa pun]?.field` — pola di manager & isi-cepat.
    for (const m of sumber.matchAll(/\bimdb\[[^\]]+\]\??\.(\w+)/g)) hasil.add(m[1]);
    // `meta.field` / `meta?.field` — prop di picker, variabel lokal di
    // kategori-otomatis (`const meta = imdb[id]`).
    for (const m of sumber.matchAll(/\bmeta\??\.(\w+)/g)) hasil.add(m[1]);
    return [...hasil];
  }

  for (const berkas of PEMAKAI) {
    it(`${berkas} hanya membaca field yang ada di FIELD_IMDB_ADMIN`, () => {
      const dibaca = fieldDibaca(readFileSync(berkas, "utf-8"));
      const liar = dibaca.filter(
        (f) => !(FIELD_IMDB_ADMIN as readonly string[]).includes(f),
      );
      expect(
        liar,
        `${berkas} membaca ${liar.join(", ")} dari data IMDb, tapi field itu ` +
          `TIDAK ikut dikirim ke browser (lihat FIELD_IMDB_ADMIN di ` +
          `lib/playly-imdb.ts). Nilainya akan undefined tanpa satu pun error — ` +
          `tambahkan fieldnya ke daftar-putih, atau jangan dibaca di browser.`,
      ).toEqual([]);
    });
  }

  it("penyusurnya sendiri benar-benar menemukan sesuatu", () => {
    // Jaring pengaman untuk tes di atas: regex yang rusak memulangkan daftar
    // KOSONG, dan daftar kosong membuat kelima tes itu hijau tanpa memeriksa
    // apa pun — kegagalan paling senyap. Sudah pernah terjadi di sesi ini.
    const manager = fieldDibaca(
      readFileSync("app/components/admin/PlaylyVisibilityManager.tsx", "utf-8"),
    );
    expect(manager).toContain("rating");
    expect(manager).toContain("year");
  });

  it("tak ada komponen browser yang memakai peta PENUH lagi", () => {
    // Pagar di tingkat TIPE. Tanpa ini, satu `PlaylyImdbMap` yang dipasang
    // kembali membuat 479 KB mengalir lagi ke browser — dan tes field di atas
    // tetap hijau, karena fieldnya memang sah dibaca.
    for (const berkas of PEMAKAI.filter((b) => b.startsWith("app/"))) {
      expect(
        readFileSync(berkas, "utf-8"),
        `${berkas} kembali memakai PlaylyImdbMap (peta penuh 17 field) — ` +
          `komponen browser harus memakai PlaylyImdbMapRingkas`,
      ).not.toMatch(/\bPlaylyImdbMap\b/);
    }
  });

  it("endpoint /api/admin/playly/imdb memangkas KETIGA balasannya", () => {
    // Panel "Cocokkan semua" memanggil endpoint ini sekali per video, jadi
    // satu balasan yang lupa dipangkas mengirim 479 KB ratusan kali.
    const sumber = readFileSync("app/api/admin/playly/imdb/route.ts", "utf-8");
    expect((sumber.match(/ringkasImdbUntukAdmin\(/g) ?? []).length).toBe(3);
  });
});
