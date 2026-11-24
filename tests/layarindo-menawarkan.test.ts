// Penjaga strip "Layarindo Menawarkan" — owner 2026-11-23, dengan gambar
// acuan: judul di tengah + tiga chip pintasan, menggantikan panel lipat
// "Lanjutkan Menonton" di /beranda.
//
// ⚠️ KENAPA PENJAGA INI ADA, dan pelajarannya datang dari berkas tetangganya
// sendiri: tombol "Judul A-Z" di `FilterKatalog` menunjuk `?sort=judul`
// berminggu-minggu, padahal nilai yang dikenal /discover adalah `title`. Nilai
// tak dikenal dijatuhkan DIAM-DIAM ke "relevance" oleh `parseSort`
// (lib/discover.ts:18), jadi tombolnya diklik lalu menampilkan seluruh katalog
// seolah bekerja. Tes penjaganya saat itu cuma memastikan teks "sort=judul"
// ADA — bukan bahwa nilainya SAH, sehingga ia hijau di atas tombol yang mati.
//
// Strip ini punya TIGA chip dengan kelemahan yang sama persis, jadi patokannya
// dicocokkan ke `SORT_OPTIONS` — sumber kebenaran yang dibaca /discover —
// bukan ke daftar teks yang disalin.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import LayarindoMenawarkan, {
  JudulMenawarkan,
} from "../app/components/beranda/LayarindoMenawarkan";
import { SORT_OPTIONS, parseSort } from "../lib/discover";
import { tanpaKomentar } from "./bantu/tanpa-komentar";

// ⚠️ DIRENDER DUA BAGIAN sejak 2026-11-24: owner meminta judulnya pindah ke
// TENGAH di baris sendiri, jadi `JudulMenawarkan` dipisah dari chipnya.
// Pemisahan itu syarat teknis: hanya sebagai anak LANGSUNG kisi, kelima chip
// (tiga dari sini + REKOMENDASI & <tahun>) bisa selebar kolom yang sama.
const htmlJudul = renderToStaticMarkup(createElement(JudulMenawarkan));
const htmlChip = renderToStaticMarkup(createElement(LayarindoMenawarkan));
const html = htmlJudul + htmlChip;
// KOMENTAR DIBUANG dari keduanya: kedua berkas memuat catatan riwayat yang
// MENGUTIP kode lama & nilai yang salah sebagai contoh. Tanpa ini, kutipan di
// komentar itulah yang dinilai penjaga — bukan kode yang benar-benar jalan.
const SUMBER = tanpaKomentar(
  readFileSync("app/components/beranda/LayarindoMenawarkan.tsx", "utf-8"),
);
const BERANDA = tanpaKomentar(readFileSync("app/beranda/page.tsx", "utf-8"));

describe("bentuk yang diminta owner", () => {
  it("judulnya 'Layarindo Menawarkan'", () => {
    expect(html).toContain("Menawarkan");
    expect(html).toContain("Layarindo");
  });

  it("tiga pintasan yang disebut di gambar acuan tergambar semua", () => {
    for (const label of ["Kualitas Terbaik", "Update Terbaru", "Terpopuler"]) {
      expect(html, `chip "${label}" hilang`).toContain(label);
    }
  });

  it("terpasang di /beranda — bukan sekadar ada berkasnya", () => {
    // Pelajaran mahal repo ini (tests/filter-katalog.test.ts): komponen yang
    // ada & teruji TIDAK sama dengan komponen yang bisa dilihat orangnya.
    // Tombol FILTER pernah sempurna selama empat hari tanpa pernah terlihat
    // owner karena cuma terpasang di halaman yang dia tak pernah buka.
    // ⚠️ TEMPATNYA PINDAH 2026-11-23 putaran kedua: dari `slotAtas` di
    // app/beranda/page.tsx ke `slotBarisTab` di BadanKatalog.tsx, saat owner
    // menyederetkannya dengan tombol tab. Diperiksa di BadanKatalog karena di
    // sanalah ia kini dipasang — DUA kali (isi <Suspense fallback> + versi
    // browsernya), dan keduanya wajib, kalau tidak barisnya berganti isi tepat
    // saat halaman selesai dimuat.
    const badan = tanpaKomentar(
      readFileSync("app/components/beranda/BadanKatalog.tsx", "utf-8"),
    );
    expect(badan).toContain(
      'import LayarindoMenawarkan, { JudulMenawarkan } from "./LayarindoMenawarkan"',
    );
    expect(
      (badan.match(/slotBarisTab=\{<LayarindoMenawarkan \/>\}/g) ?? []).length,
      "harus dipasang DUA kali: fallback Suspense + versi browser",
    ).toBe(2);
    expect(
      (badan.match(/slotJudulBaris=\{<JudulMenawarkan \/>\}/g) ?? []).length,
      "judulnya juga wajib DUA kali — kalau tidak, barisnya berganti isi tepat saat halaman selesai dimuat",
    ).toBe(2);
  });
});

describe("tiap chip benar-benar MENYARING", () => {
  it("semua nilai `sort` dikenali /discover", () => {
    const sah = SORT_OPTIONS.map((o) => o.value) as readonly string[];
    const dipakai = [...SUMBER.matchAll(/sort=([a-z]+)/g)].map((m) => m[1]);

    expect(dipakai.length, "tak ada satu pun tautan sort").toBe(3);
    const nyasar = dipakai.filter((v) => !sah.includes(v));
    expect(
      nyasar,
      `nilai sort tak dikenal — chip-nya akan diklik lalu menampilkan ` +
        `seluruh katalog. Yang sah: ${sah.join(", ")}`,
    ).toEqual([]);
  });

  it("ketiganya menunjuk urutan yang BERBEDA", () => {
    // Tiga chip bernama beda yang membuka halaman sama = tiga tombol yang
    // dua di antaranya berbohong. Gampang terjadi lewat salin-tempel.
    const dipakai = [...SUMBER.matchAll(/sort=([a-z]+)/g)].map((m) => m[1]);
    expect(new Set(dipakai).size, `ada nilai sort kembar: ${dipakai.join(", ")}`).toBe(3);
  });

  it("parseSort memulangkan nilai itu APA ADANYA, bukan jatuh ke relevance", () => {
    // Pemeriksaan terakhir, lewat fungsi yang SUNGGUHAN dipakai /discover —
    // bukan lewat daftar. Inilah yang akan merah kalau suatu saat
    // `SORT_OPTIONS` diubah tapi chip-nya tertinggal.
    for (const v of [...SUMBER.matchAll(/sort=([a-z]+)/g)].map((m) => m[1])) {
      expect(parseSort(v), `sort=${v} jatuh diam-diam ke relevance`).toBe(v);
    }
  });
});

describe("tak ada jalan yang terputus saat panel lama dilepas", () => {
  it("/history tetap bisa dicapai dari dalam situs", () => {
    // Panel lama memuat baris "Lanjut Menonton" yang menautkan ke /history.
    // Kalau itu satu-satunya jalan, melepas panelnya = mengubur halaman
    // riwayat hidup-hidup: ia sudah tidak ada di bar bawah HP maupun navbar.
    // Diperiksa SEBELUM panelnya ditukar, bukan sesudah ada yang melapor.
    const menu = readFileSync("app/components/MenuAkun.tsx", "utf-8");
    expect(
      menu,
      "/history tak punya jalan lain — melepas panel beranda menguburnya",
    ).toContain('href: "/history"');
  });
});
