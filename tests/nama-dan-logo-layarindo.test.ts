// Penjaga IDENTITAS SITUS — owner 2026-11-26: "telusuri apakah semua sudah
// diganti ke layarindo termasuk brand, logo".
//
// Latar: nama situs diganti DramaKu → Layarindo pada 2026-11-24 dan teksnya
// memang bersih (0 kemunculan "DramaKu" di HTML produksi). Yang TERTINGGAL dan
// baru ketahuan dua hari kemudian adalah hal-hal yang tidak ikut tersapu saat
// mengganti teks:
//
//   1. BERKAS GAMBAR. `public/logo.png` masih bertuliskan "DRAMA KU" utuh dan
//      tampil BESAR di halaman Login & Daftar; `public/logo-mark.png` berisi
//      huruf "D" bermahkota dan dipakai TopNav + Login + Daftar + Profil.
//      Mengganti teks tidak pernah menyentuh isi berkas .png — jadi penggantian
//      nama bisa terasa "selesai" sambil logo lama tetap terpampang.
//   2. TEKS DI FITUR YANG JARANG DIBUKA. Nonton Bareng menuliskan nama situs
//      secara TANGAN di dua tempat; yang satu adalah kalimat ajakan yang
//      DISALIN penonton lalu dikirim ke temannya — jadi nama lama ikut tersebar
//      ke luar situs setiap kali ada yang mengajak nobar.
//
// Keduanya rusak SENYAP: nol error, nol tes merah, dan halaman tetap tampil
// normal. Yang menangkapnya cuma mata yang sengaja membuka gambarnya.
//
// ⚠️ Komentar dibuang dulu sebelum memeriksa (pola yang sama dipakai
// tests/action-rail-tampil.test.ts:66). Tanpa itu, komentar di berkas-berkas ini
// yang MENYEBUT "DramaKu" atau "/logo-mark.png" sebagai catatan sejarah akan
// membuat tes hijau palsu — padahal komentar sejarah memang sengaja disimpan
// (lihat app/components/beranda/KepalaKatalog.tsx:85).
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** Buang komentar blok dan komentar baris, supaya yang diperiksa hanya kode. */
function tanpaKomentar(sumber: string): string {
  return sumber
    .split("/*")
    .map((b, i) => (i === 0 ? b : b.split("*/").slice(1).join("*/")))
    .join("")
    .split("\n")
    .map((baris) => {
      // Potong `//` hanya bila BUKAN bagian dari "https://" / "file://".
      const i = baris.search(/(^|[^:])\/\//);
      return i === -1 ? baris : baris.slice(0, i === 0 ? 0 : i + 1);
    })
    .join("\n");
}

/** Semua berkas .ts/.tsx di bawah `akar`. */
function berkasKode(akar: string, hasil: string[] = []): string[] {
  for (const nama of readdirSync(akar)) {
    const p = join(akar, nama);
    if (statSync(p).isDirectory()) berkasKode(p, hasil);
    else if (/\.tsx?$/.test(nama)) hasil.push(p);
  }
  return hasil;
}

const BERKAS = [...berkasKode("app"), ...berkasKode("lib")];

describe("identitas situs — nol sisa DramaKu di yang dilihat penonton", () => {
  it("logo lama /logo.png & /logo-mark.png TIDAK dirujuk lagi di kode", () => {
    const pemakai: string[] = [];
    for (const f of BERKAS) {
      const kode = tanpaKomentar(readFileSync(f, "utf8"));
      if (/["'`]\/logo(-mark)?\.png["'`]/.test(kode)) pemakai.push(f);
    }
    // Kedua berkas itu BERISI nama lama: logo.png bertuliskan "DRAMA KU",
    // logo-mark.png huruf "D" bermahkota. Penggantinya sudah ada di public/:
    // logo-layarindo.png (mendatar) & logo-layarindo-lambang.png (lambang saja).
    expect(pemakai, `masih memakai logo lama: ${pemakai.join(", ")}`).toEqual([]);
  });

  it("logo pengganti benar-benar ada di public/", () => {
    for (const f of ["public/logo-layarindo.png", "public/logo-layarindo-lambang.png"]) {
      expect(() => statSync(f), `${f} hilang`).not.toThrow();
    }
  });

  it("nama situs di Nonton Bareng dibaca dari SITE_NAME, bukan ditulis tangan", () => {
    for (const f of ["app/components/nobar/UndanganNobar.tsx", "app/api/watch-room/route.ts"]) {
      const kode = tanpaKomentar(readFileSync(f, "utf8"));
      expect(kode, `${f} masih menulis "DramaKu"`).not.toMatch(/DramaKu/);
      expect(kode, `${f} tidak memakai SITE_NAME`).toContain("SITE_NAME");
    }
  });

  it("tak ada teks tampil yang menulis DramaKu di dalam tanda kutip", () => {
    const temuan: string[] = [];
    for (const f of BERKAS) {
      const kode = tanpaKomentar(readFileSync(f, "utf8"));
      for (const baris of kode.split("\n")) {
        if (/["'`][^"'`]*DramaKu/.test(baris)) temuan.push(`${f}: ${baris.trim().slice(0, 70)}`);
      }
    }
    expect(temuan, `teks "DramaKu" masih tampil:\n${temuan.join("\n")}`).toEqual([]);
  });
});
