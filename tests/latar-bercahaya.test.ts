// Penjaga CAHAYA LATAR halaman penonton (owner 2026-11-24).
//
// KENAPA PERLU PENJAGA SENDIRI: cahayanya bisa hilang DIAM-DIAM dari dua arah,
// dan dua-duanya tidak memunculkan satu pun error — build hijau, halaman 200,
// cuma halaman yang kembali kusam:
//   1. kelas `latar-bercahaya` dilepas dari `BADAN_SITUS`, atau definisinya
//      di app/globals.css dihapus saat merapikan;
//   2. sebuah seksi di dalam halaman mengecat latar PEKAT di atasnya. Ini yang
//      sudah terbukti terjadi: tiga seksi (`FeaturedRow`, `TabKatalogTampilan`,
//      `StripKatalog`) dulu memakai `bg-gelap-950`/`bg-black` dan menutupi
//      seluruh cahaya. Siapa pun yang "mengembalikan"-nya mengira sedang
//      membereskan latar yang hilang.
//
// Owner memilih versi bercahaya SESUDAH menolak versi rata yang angka
// warnanya SUDAH cocok dengan mockup di lima titik ukur. Jadi ini bukan
// hiasan opsional — warna yang sama tidak menghasilkan kesan yang sama.
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { BADAN_SITUS } from "../app/components/beranda/shell";
import { tanpaKomentar } from "./bantu/tanpa-komentar";

const css = readFileSync("app/globals.css", "utf8");

/** Seksi yang duduk DI ATAS pembungkus bercahaya di halaman katalog. */
const SEKSI_DI_ATAS_CAHAYA = [
  "app/components/beranda/FeaturedRow.tsx",
  "app/components/beranda/TabKatalogTampilan.tsx",
  "app/components/beranda/StripKatalog.tsx",
];

describe("cahaya latar halaman penonton", () => {
  it("BADAN_SITUS membawa kelas cahayanya, berpasangan dengan warna dasar", () => {
    // Keduanya WAJIB ada: `latar-bercahaya` cuma mengatur background-image,
    // jadi tanpa warna dasar halaman jadi tembus ke latar <body>.
    expect(BADAN_SITUS).toContain("latar-bercahaya");
    expect(BADAN_SITUS).toMatch(/\bbg-gelap-\d+\b/);
  });

  it("kelasnya benar-benar didefinisikan, dan isinya memang gradasi", () => {
    const blok = css.match(/\.latar-bercahaya\s*\{[^}]*\}/);
    expect(blok, "`.latar-bercahaya` tidak ada di app/globals.css").not.toBeNull();
    // ENAM sapuan (2026-11-24 sore, naik dari 3). Jumlahnya dipatok karena
    // tiap sapuan punya tugas sendiri yang diukur dari mockup: pojok
    // kiri-atas, kiri-bawah, kanan-bawah, kanan-tengah, kanan-atas, dan satu
    // yang nyaris tak terlihat di kiri-tengah. Membuang salah satunya
    // "supaya rapi" akan menggelapkan satu sudut tanpa satu pun error.
    expect(blok![0].match(/radial-gradient/g) ?? []).toHaveLength(6);

    // Dua sapuan terkuat WAJIB di pojok BAWAH, bukan tengah-bawah. Versi
    // pertama menaruhnya `at 50% 100%` dan di sana ia tertutup bar menu yang
    // menempel di dasar layar — terukur merah 48 di tempat yang mockup-nya
    // 197. Owner menolak versi itu.
    expect(blok![0]).toMatch(/at 0% 88%/);
    expect(blok![0]).toMatch(/at 100% 88%/);
    // `fixed` bukan selera: tanpa ini cahayanya merenggang mengikuti tinggi
    // halaman jadi pita pudar, dan elemen bersarang tidak lagi sejajar.
    expect(blok![0]).toContain("background-attachment: fixed");
  });

  it.each(SEKSI_DI_ATAS_CAHAYA)("%s tidak menutupi cahayanya dengan latar pekat", (berkas) => {
    const kode = tanpaKomentar(readFileSync(berkas, "utf8"));
    // Yang dilarang hanya latar PEKAT. Nada bertransparansi (`/80`) masih boleh
    // — cahayanya tetap tembus, dan beberapa panel memang butuh peredup.
    expect(kode).not.toMatch(/"[^"]*\bbg-gelap-950(?![/\w-])/);
    expect(kode).not.toMatch(/"[^"]*\bbg-black(?![/\w-])/);
  });

  it("pembanding: larangan di atas memang bisa MERAH", () => {
    // Tanpa baris ini, tiga patokan `not.toMatch` di atas akan tetap hijau
    // walaupun polanya salah tulis dan tak pernah cocok dengan apa pun.
    const contohBuruk = '<section className="bg-gelap-950 py-3">';
    expect(contohBuruk).toMatch(/"[^"]*\bbg-gelap-950(?![/\w-])/);
    const contohBaik = '<section className="bg-gelap-950/80 py-3">';
    expect(contohBaik).not.toMatch(/"[^"]*\bbg-gelap-950(?![/\w-])/);
  });
});
