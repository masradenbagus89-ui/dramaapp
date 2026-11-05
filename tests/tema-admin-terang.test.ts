// Penjaga PANEL ADMIN BERLATAR TERANG — owner 2026-11-05: "di admin kamu buat
// juga latar belakangnya sama dengan beranda jadi semua dashboard semua sinkron".
//
// ⚠️ KENAPA TES INI ADA. Panel admin memakai 477 kemunculan kelas warna gelap di
// 4 halaman + 18 komponen. Menyuntingnya satu per satu mustahil dijaga, jadi
// temanya dibalik lewat VARIABEL CSS di satu pembungkus. Cara itu hemat, tapi
// punya beberapa titik yang kalau lepas merusak dengan SENYAP — tanpa error,
// tanpa build merah, tanpa tes lain yang peduli. Tiga di antaranya sudah
// benar-benar terjadi saat fitur ini dibuat (lihat tiap tes di bawah).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const CSS = readFileSync("app/globals.css", "utf8");
const LAYOUT = readFileSync("app/admin/layout.tsx", "utf8");

/**
 * Isi blok `.tema-admin-terang { ... }` — KOMENTARNYA DIBUANG lebih dulu.
 *
 * 🪤 Membuang komentar bukan kerapian: versi pertama tes ini memeriksa teks
 * blok apa adanya, dan ia LOLOS PALSU. Sebabnya komentar di dalam blok itu
 * MENJELASKAN aturan yang sedang dicari ("`body` memasang `color:
 * var(--foreground)`"), jadi pencariannya menemukan kalimat penjelasnya, bukan
 * aturan CSS-nya. Dibuktikan dengan melepas baris aslinya: tes tetap hijau.
 * Pelajaran umumnya — tes yang membaca teks berkas bisa tertipu oleh komentar
 * yang mengutip pola yang dicari.
 */
const blokPalet = () => {
  const mulai = CSS.indexOf(".tema-admin-terang {");
  expect(mulai, "blok .tema-admin-terang hilang dari globals.css").toBeGreaterThan(0);
  return CSS.slice(mulai, CSS.indexOf("}", mulai)).replace(/\/\*[\s\S]*?\*\//g, "");
};

/** Seluruh CSS tanpa komentar — alasannya sama seperti `blokPalet` di atas. */
const CSS_TANPA_KOMENTAR = CSS.replace(/\/\*[\s\S]*?\*\//g, "");

describe("saklar tema admin terpasang", () => {
  it("layout /admin memakai pembungkusnya", () => {
    // Dipasang di LAYOUT, bukan tiap halaman: halaman admin baru ikut terang
    // sendiri. Kalau ini lepas, seluruh panel balik gelap sekaligus.
    expect(LAYOUT.replace(/\/\*[\s\S]*?\*\//g, "")).toContain("tema-admin-terang");
  });

  it("punya latar sendiri — bukan cuma membalik warna teks", () => {
    // Tanpa background, bg-black di <body> menembus dari belakang dan teks
    // yang sudah digelapkan jadi tak terbaca di atas hitam.
    expect(blokPalet()).toMatch(/background-color:\s*#/);
  });
});

describe("tiga jebakan yang SUDAH terjadi saat fitur ini dibuat", () => {
  it("1. menyatakan ulang `color` — kalau tidak, isi kotak isian HILANG", () => {
    // `body` memasang `color: var(--foreground)`; nilainya dihitung SEKALI di
    // <body> tempat --foreground masih terang, lalu diwariskan sebagai putih
    // yang sudah jadi. Akibatnya isi <input>, <label>, dan teks dalam Card
    // tampil putih di atas kertas putih. Ketahuan hanya karena hasilnya
    // DIPANDANG — nol error, nol tes merah.
    expect(blokPalet()).toMatch(/color:\s*var\(--foreground\)/);
  });

  it("2. tombol kuning TIDAK ikut digelapkan", () => {
    // Percobaan pertama menggeser `--color-amber-400` jadi cokelat tua. Itu
    // salah: amber-400 juga jadi latar 10 TOMBOL UTAMA yang tulisannya
    // text-black — tombolnya berubah jadi cokelat bertulisan hitam, nyaris tak
    // terbaca. Yang boleh digelapkan HANYA warna teksnya.
    expect(blokPalet()).not.toMatch(/--color-amber-400:/);
    expect(CSS_TANPA_KOMENTAR).toMatch(/\.tema-admin-terang \.text-amber-400\s*\{/);
  });

  it("3. token shadcn ikut dibalik — Input/Card/Table tak memakai kelas zinc", () => {
    // components/ui/* memakai token (bg-card, border-input, text-foreground),
    // bukan kelas zinc. Tanpa blok ini kotak isian dan tabel tetap hitam di
    // tengah halaman putih.
    const palet = blokPalet();
    for (const token of ["--background", "--foreground", "--card", "--input", "--muted"]) {
      expect(palet, `token ${token} belum dibalik untuk panel admin`).toContain(
        `${token}:`,
      );
    }
  });

  it("`--color-black` sengaja TIDAK dibalik", () => {
    // Panel admin memakai text-black di 12 tempat, semuanya di atas tombol
    // kuning. Membalikkannya membuat tulisan tombol jadi putih di atas kuning.
    expect(blokPalet()).not.toMatch(/--color-black:/);
  });

  it("`--color-white` DIBALIK — itu yang menggelapkan judul panel", () => {
    // Dihitung sebelum diubah: nol bg-white/fill-white di seluruh admin, jadi
    // membalikkannya aman dan justru yang membuat judul terbaca.
    expect(blokPalet()).toMatch(/--color-white:\s*#/);
  });
});
