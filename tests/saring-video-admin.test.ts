// Penjaga SARINGAN "sudah / belum ada IMDb" di panel admin — owner 2026-11-05:
// "tambahkan filter mana yang sudah ada imdb mana yang belum biar mudah".
//
// ⚠️ Yang paling mahal kalau salah: video yang SEBENARNYA belum dicocokkan
// tidak muncul di daftar "Belum". Admin menyangka pekerjaannya sudah habis
// padahal belum — dan tidak ada error apa pun yang memberi tahu.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  LABEL_SARING,
  SARING_BAWAAN,
  hitungImdb,
  saringVideoImdb,
  sudahAdaImdb,
} from "../lib/saring-video-admin";

const PANEL = readFileSync(
  "app/components/admin/PlaylyVisibilityManager.tsx",
  "utf8",
);

const v = (id: string) => ({ id, title: `Judul ${id}` });
const DAFTAR = [v("a"), v("b"), v("c"), v("d")];
// Meniru keadaan nyata: sebagian sudah dicocokkan, sebagian belum.
const IMDB = { a: { poster: "x" }, c: { poster: "y" } };

describe("aturan saringan IMDb", () => {
  it("'sudah' hanya memulangkan yang punya entri IMDb", () => {
    expect(saringVideoImdb(DAFTAR, IMDB, "sudah").map((x) => x.id)).toEqual([
      "a",
      "c",
    ]);
  });

  it("'belum' hanya memulangkan yang BELUM punya entri", () => {
    expect(saringVideoImdb(DAFTAR, IMDB, "belum").map((x) => x.id)).toEqual([
      "b",
      "d",
    ]);
  });

  it("'semua' memulangkan seluruhnya, dalam urutan asli", () => {
    expect(saringVideoImdb(DAFTAR, IMDB, "semua").map((x) => x.id)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
    expect(SARING_BAWAAN).toBe("semua");
  });

  it("'sudah' + 'belum' SELALU berjumlah sama dengan 'semua'", () => {
    // Pagar paling penting di berkas ini: kalau sebuah video entah bagaimana
    // tidak masuk ke salah satu dari dua kelompok, ia jadi TAK TERLIHAT di
    // kedua saringan — hilang dari pandangan admin tanpa gejala.
    const n = hitungImdb(DAFTAR, IMDB);
    expect(n.sudah + n.belum).toBe(n.semua);
    expect(n).toEqual({ semua: 4, sudah: 2, belum: 2 });
  });

  it("peta kosong = semuanya dihitung BELUM", () => {
    const n = hitungImdb(DAFTAR, {});
    expect(n).toEqual({ semua: 4, sudah: 0, belum: 4 });
    expect(saringVideoImdb(DAFTAR, {}, "belum")).toHaveLength(4);
  });

  it("tidak mengubah daftar milik pemanggil", () => {
    // Daftar yang sama dipakai untuk MENGHITUNG angka di tombol. Menyaring di
    // tempat membuat angkanya ikut salah, dan salahnya tidak kelihatan.
    const asli = [...DAFTAR];
    saringVideoImdb(DAFTAR, IMDB, "belum");
    expect(DAFTAR).toEqual(asli);
  });

  it("entri kosong/null dihitung BELUM, bukan sudah", () => {
    // `{}` yang tersimpan tanpa isi berarti pencocokannya tak pernah selesai.
    expect(sudahAdaImdb("a", { a: null })).toBe(false);
    expect(sudahAdaImdb("a", { a: undefined })).toBe(false);
    expect(sudahAdaImdb("a", {})).toBe(false);
    expect(sudahAdaImdb("a", { a: { poster: "x" } })).toBe(true);
  });
});

describe("saringan tersambung ke daftar yang digambar", () => {
  it("daftar memakai hasil saringan, BUKAN daftar mentah", () => {
    // Kalau ini lepas, tombol saringan tetap bisa diklik dan angkanya berubah,
    // tapi daftarnya tidak ikut menyaring — tombol yang berbohong.
    //
    // Sejak paginasi ditambahkan (owner 2026-11-06) rantainya satu mata lebih
    // panjang: videos -> saringVideoImdb -> videoTampil -> potongHalaman ->
    // videoHalaman -> .map. Yang DIJAGA tetap sama — daftar yang digambar
    // wajib turunan dari hasil saringan — jadi kedua mata rantai itu dituntut
    // sekaligus, bukan diturunkan jadi pemeriksaan yang lebih longgar.
    expect(PANEL).toContain("potongHalaman(videoTampil");
    expect(PANEL).toContain("videoHalaman.map(");
    expect(
      PANEL,
      "daftar masih memetakan `videos` mentah — saringan tidak akan terasa",
    ).not.toMatch(/\{videos\.map\(/);
  });

  it("punya pesan khusus saat saringan menghasilkan daftar kosong", () => {
    // "Tidak ada video" dan "tidak ada yang cocok dengan saringan" adalah dua
    // keadaan berbeda; menyamakannya membuat panel terbaca seperti rusak.
    expect(PANEL).toContain("videoTampil.length === 0");
  });

  it("tiap pilihan saringan punya labelnya", () => {
    for (const k of Object.keys(LABEL_SARING)) {
      expect(LABEL_SARING[k as keyof typeof LABEL_SARING]).toBeTruthy();
    }
    expect(LABEL_SARING.belum.toLowerCase()).toContain("belum");
  });
});
