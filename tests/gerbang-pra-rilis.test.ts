// Penjaga untuk gerbang pra-rilis satu-perintah (scripts/gerbang-pra-rilis.mjs).
//
// KENAPA BERKAS INI ADA: gerbang yang BERBOHONG lebih berbahaya daripada tidak
// punya gerbang sama sekali. Kalau ia melaporkan hijau padahal salah satu
// pemeriksaan gagal atau terlewat, rilis rusak lolos JUSTRU karena orang
// percaya pada gerbangnya.
//
// Dua hal yang dikunci di sini, keduanya kerusakan SENYAP — tidak mengeluarkan
// error apa pun kalau dilanggar:
//
//   1. Urutan `build` SEBELUM `tipe`. Dibalik, `npx tsc --noEmit` selalu
//      melaporkan 4 error PALSU (TS2304: Cannot find name 'PageProps') karena
//      next-env.d.ts mengimpor berkas tipe yang baru DIBUAT oleh `next build`.
//      Jebakan ini tercatat menipu tiga sesi. Membalik urutannya di LANGKAH
//      tidak akan merusak apa pun secara terlihat — ia cuma membuat gerbangnya
//      merah terus tanpa sebab, lalu orang berhenti memakainya.
//
//   2. Pemeriksa berkas rahasia harus MEMBEDAKAN. Pemeriksa yang selalu bilang
//      "aman" terlihat persis sama dengan pemeriksa yang bekerja — sampai hari
//      berkas .env sungguhan ikut terdorong ke repo PUBLIK.
//
// Pelajaran yang sama sudah tertulis di tests/uji-pulihkan-backup.test.ts:
// pagar yang tak pernah diuji dengan masukan BURUK belum membuktikan dirinya
// bekerja.
import { describe, expect, it } from "vitest";
import {
  LANGKAH,
  cariBerkasRahasia,
  periksaUrutanLangkah,
} from "../scripts/gerbang-pra-rilis.mjs";

describe("urutan langkah gerbang", () => {
  it("daftar bawaannya lolos pemeriksaan urutan", () => {
    expect(periksaUrutanLangkah().lulus).toBe(true);
  });

  it("build berada SEBELUM tipe di daftar bawaan", () => {
    const nama = LANGKAH.map((l: { nama: string }) => l.nama);
    expect(nama.indexOf("build")).toBeLessThan(nama.indexOf("tipe"));
  });

  it("kelima langkah §6 ada, tidak ada yang diam-diam hilang", () => {
    // Langkah yang dihapus = pemeriksaan yang berhenti dijalankan, sementara
    // gerbangnya tetap melaporkan "LOLOS". Persis bentuk kebohongan yang
    // berkas ini jaga.
    const nama = LANGKAH.map((l: { nama: string }) => l.nama);
    expect(nama).toEqual(["bersihkan", "build", "tipe", "tes", "rahasia"]);
  });

  it("urutan TERBALIK ditolak — diuji dengan masukan buruk", () => {
    const terbalik = [
      { nama: "bersihkan" },
      { nama: "tipe" },
      { nama: "build" },
      { nama: "tes" },
      { nama: "rahasia" },
    ];
    const hasil = periksaUrutanLangkah(terbalik);
    expect(hasil.lulus).toBe(false);
    expect(hasil.masalah.join(" ")).toContain("TERBALIK");
  });

  it("langkah yang hilang ditolak, bukan dianggap lulus", () => {
    const tanpaBuild = [{ nama: "bersihkan" }, { nama: "tipe" }];
    expect(periksaUrutanLangkah(tanpaBuild).lulus).toBe(false);
  });

  it("tiap langkah punya alasan tertulis", () => {
    // Langkah tanpa "kenapa" akan dibuang orang berikutnya yang tidak tahu
    // untuk apa ia ada.
    for (const l of LANGKAH as { judul: string; kenapa: string }[]) {
      expect(l.kenapa.length, `langkah "${l.judul}" tanpa alasan`).toBeGreaterThan(20);
    }
  });
});

describe("pemeriksa berkas rahasia", () => {
  it("menangkap .env asli beserta varian bersufiks", () => {
    const tersangka = cariBerkasRahasia([
      ".env",
      ".env.local",
      ".env.production",
      // Varian ini LOLOS dari pola ".env*.local" di .gitignore karena
      // sufiksnya ada SESUDAH ".local" — nyaris ter-commit 2026-09-22.
      ".env.local.cadangan",
    ]);
    expect(tersangka).toHaveLength(4);
  });

  it("menangkap berkas rahasia khas project ini", () => {
    const tersangka = cariBerkasRahasia([
      "data/twofa.json",
      "data/admins.json",
      "data/playly.json",
      "cookies.txt",
      "pc-backup-agent/config.yml",
      "supabase_export_2026.sql",
      "migrasi-full.sql",
      "backup-recovery-codes.txt",
      "kode-pemulihan-admin.txt",
    ]);
    expect(tersangka).toHaveLength(9);
  });

  it("MEMBIARKAN contoh/placeholder lewat — bukan sekadar menolak semuanya", () => {
    // Pemeriksa yang menolak segalanya sama tak bergunanya dengan yang
    // meloloskan segalanya: orang akan belajar mengabaikannya.
    expect(
      cariBerkasRahasia([
        ".env.example",
        ".env.sample",
        ".env.template",
        "cloudflared-config.example.yml",
      ]),
    ).toEqual([]);
  });

  it("MEMBIARKAN berkas biasa lewat", () => {
    expect(
      cariBerkasRahasia([
        "app/components/player/PlaylyPlayer.tsx",
        "lib/playly.ts",
        "data/dramas.json",
        "HANDOFF.md",
      ]),
    ).toEqual([]);
  });

  it("mengerti path bergaya Windows dan baris kosong", () => {
    // `git diff --name-only` memulangkan garis miring maju, tapi daftar bisa
    // datang dari sumber lain; baris kosong di ekor keluaran itu normal.
    expect(cariBerkasRahasia(["data\\twofa.json", "", "  "])).toEqual([
      "data/twofa.json",
    ]);
  });
});
