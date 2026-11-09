// Penjaga FRAMING GAMBAR BESAR halaman drama — owner 2026-11-09
// ("bagian atas tidak kepotong ... kalau mau potong, potong dari bawah agar
// UI tetap enak dilihat, tidak kepala yang terpotong").
//
// KERUSAKAN YANG DIJAGA: kotak hero ber-rasio 16/9, sedangkan poster drama
// hampir selalu lebih TINGGI dari itu. `object-cover` sendirian memotong rata
// atas-bawah, jadi yang hilang justru wajah tokoh — satu hal yang paling
// menentukan orang mengklik atau tidak. `object-top` menempelkan gambar ke
// tepi atas sehingga kelebihannya dibuang dari BAWAH.
//
// ⚠️ KENAPA TES INI MEMBACA SUMBER, BUKAN MERENDER: kerusakannya murni soal
// PEMOTONGAN gambar, dan jsdom tidak punya mesin tata letak — ia tidak
// menghitung object-fit sama sekali, jadi merender komponennya akan hijau
// bahkan saat kepalanya terpotong. Pola yang sama dipakai
// tests/tombol-aksi-drama.test.ts.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sumberHalaman = readFileSync(
  join(process.cwd(), "app/drama/[id]/page.tsx"),
  "utf8",
);
const sumberMedia = readFileSync(
  join(process.cwd(), "app/components/HeroDramaMedia.tsx"),
  "utf8",
);

/**
 * Potongan sumber satu elemen, dari penanda sampai penutup `/>`, dengan
 * KOMENTAR DIBUANG.
 *
 * ⚠️ Pembuangan komentar itu inti tes ini, bukan kerapian. Versi pertama tes
 * ini mengembalikan potongan apa adanya, dan karena komentar di atas
 * `className` ikut menyebut kata "object-top", tes tetap HIJAU walau kelasnya
 * sudah hilang dari kode — hijau palsu yang justru menyembunyikan kerusakan
 * yang mau dijaga. Ketahuan saat tesnya sengaja dirusak untuk diuji-balik.
 */
function elemen(sumber: string, penanda: string): string {
  const mulai = sumber.indexOf(penanda);
  expect(mulai, `penanda "${penanda}" tidak ditemukan`).toBeGreaterThan(-1);
  const akhir = sumber.indexOf("/>", mulai);
  return sumber
    .slice(mulai, akhir)
    .replace(/\/\*[\s\S]*?\*\//g, "") // komentar blok  /* ... */
    .replace(/^\s*\/\/.*$/gm, ""); // komentar baris //
}

describe("gambar besar hero: kepala tidak boleh terpotong", () => {
  it("gambar utama ditempel ke ATAS, bukan dipusatkan", () => {
    const gambarUtama = elemen(sumberHalaman, "alt={drama.title}");
    expect(gambarUtama).toContain("object-cover");
    expect(gambarUtama).toContain("object-top");
  });

  it("video trailer memakai framing yang SAMA dengan gambarnya", () => {
    // Beda framing = tampilan melompat tepat saat video muncul; penonton
    // melihatnya sebagai gambar bergeser, bukan trailer yang mulai.
    const video = elemen(sumberMedia, "<video");
    expect(video).toContain("object-cover");
    expect(video).toContain("object-top");
  });

  it("latar blur SENGAJA tetap dipusatkan", () => {
    // Dia dekoratif (aria-hidden) dan di-blur berat — tak ada wajah untuk
    // diselamatkan, dan menempelkannya ke atas malah menyisakan tepi kosong.
    const latar = elemen(sumberHalaman, "aria-hidden");
    expect(latar).toContain("blur-2xl");
    expect(latar).not.toContain("object-top");
  });
});
