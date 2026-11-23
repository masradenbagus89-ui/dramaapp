// Penjaga TOMBOL FILTER — owner 2026-09-26.
//
// KENAPA PENJAGA INI ADA, dan ini pelajarannya sendiri: tombol FILTER sudah
// dibuat 2026-09-22 dan berfungsi sempurna, TAPI cuma terpasang di halaman
// depan `/`. Siapa pun yang sudah login selalu dilempar ke `/beranda`
// (app/components/RedirectIfAuthed.tsx:9), jadi owner tidak pernah melihatnya
// sama sekali dan menyimpulkan fiturnya belum dibuat. Empat hari berlalu
// sebelum ketahuan.
//
// Pelajarannya: "komponennya ada dan teruji" TIDAK sama dengan "orangnya bisa
// melihatnya". Penjaga di bawah menuntut tombol itu benar-benar terpasang di
// KEDUA halaman, bukan sekadar ada berkasnya.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import FilterKatalog from "../app/components/beranda/FilterKatalog";
// Sumber kebenaran nilai `sort` — diimpor, BUKAN disalin sebagai daftar teks.
// Daftar salinan akan basi diam-diam begitu /discover menambah urutan baru,
// dan tes yang basi memberi rasa aman palsu.
import { SORT_OPTIONS } from "../lib/discover";
// Komentar DIBUANG sebelum sumbernya diperiksa — penjelasan di berkas ini
// mengutip nilai sort yang salah sebagai contoh, dan tanpa ini kutipan itu
// sendiri yang membuat patokannya merah.
import { tanpaKomentar } from "./bantu/tanpa-komentar";
import type { Drama } from "../lib/types";

function drama(partial: Partial<Drama> & Pick<Drama, "id" | "title">): Drama {
  return {
    category: "Action",
    episodes: 10,
    views: "0",
    synopsis: "",
    gradient: "from-zinc-800 to-black",
    ...partial,
  };
}

const KATALOG: Drama[] = [
  drama({ id: "a", title: "A", category: "Action", year: "2025" }),
  drama({ id: "b", title: "B", category: "Romance", year: "2026" }),
];

const renderFilter = (dramas: Drama[] = KATALOG) =>
  renderToStaticMarkup(createElement(FilterKatalog, { dramas }));

describe("tombol FILTER", () => {
  it("tergambar sebagai tombol berwarna merek bertuliskan Filter", () => {
    const html = renderFilter();
    expect(html).toContain("Filter");
    // YANG DIJAGA: tombol ini BERWARNA PENUH — itu inti permintaan owner
    // ("persis seperti LK21"), bukan warnanya yang mana. Warnanya sendiri
    // sudah berganti tiga kali: `emerald-600` → `sage-600` (tema soft sage,
    // 2026-11-23) → `emas-500` (tema gelap+emas, hari yang sama).
    expect(html).toContain("bg-emas-500");
    expect(html, "nada hijau lama kembali").not.toContain("bg-emerald-600");
    expect(html, "nada sage lama kembali").not.toContain("bg-sage-600");
    // ⚠️ TEKSNYA WAJIB GELAP, dan ini bukan selera: emas itu warna TERANG.
    // Teks putih di `emas-500` = 2,04:1 — tulisan tombolnya praktis lenyap,
    // tanpa satu pun error. Refleks "tombol berwarna = teks putih" terbawa
    // dari dua tema sebelumnya yang warnanya memang gelap.
    //
    // Polanya TANPA `\b` dengan sengaja. Versi pertama penjaga ini memakainya
    // dan langsung MATI: `\b` tertulis sebagai karakter backspace sungguhan
    // (0x08) karena berkasnya ditulis lewat string Python biasa, sehingga
    // polanya mustahil cocok dan tes ini hijau walau tombolnya berteks putih.
    // Ketahuan hanya karena diuji-balik — bukan karena ada yang error.
    expect(
      html,
      "tulisan tombol jadi putih di atas emas — kontras 2,04:1, tak terbaca",
    ).not.toMatch(/bg-emas-500[^"]*text-white/);
  });

  it("isi dropdown-nya TIDAK tergambar sampai menunya dibuka", () => {
    // Bukan bug, melainkan cara kerja Radix. Ditulis sebagai tes supaya sesi
    // berikutnya tidak mengira tombolnya rusak saat memeriksa HTML mentah —
    // dan supaya jelas kenapa alamat tujuannya diperiksa dari SUMBER di bawah.
    expect(renderFilter()).not.toContain("/discover?sort=populer");
  });
});

describe("isi filter hanya menawarkan yang BENAR-BENAR ada di katalog", () => {
  // Aturan project sejak 2026-09-21: tombol yang diklik lalu menampilkan
  // seluruh katalog seolah bekerja LEBIH menyesatkan daripada tombol yang
  // tidak ada. Diperiksa dari sumbernya karena isi dropdown Radix tidak
  // tergambar (lihat tes di atas).
  const sumber = readFileSync(
    "app/components/beranda/FilterKatalog.tsx",
    "utf-8",
  );

  it("genre & tahun DIHITUNG dari katalog, bukan daftar tulis-tangan", () => {
    expect(sumber).toContain("availableGenres(dramas)");
    expect(sumber).toContain("getYearOptions(dramas)");
  });

  it("menyembunyikan seksinya kalau datanya nol", () => {
    // Katalog tanpa tahun sama sekali tidak boleh memunculkan judul "Tahun"
    // yang di bawahnya kosong.
    expect(sumber).toContain("genre.length > 0");
    expect(sumber).toContain("tahun.length > 0");
  });

  it("setiap tujuannya benar-benar MENYARING, bukan sekadar membuka katalog", () => {
    // Nama parameter yang salah ketik diabaikan diam-diam oleh /discover, dan
    // chip-nya lalu menampilkan SELURUH katalog seolah bekerja — lebih
    // menyesatkan daripada kosong (pelajaran 2026-09-21).
    for (const param of ["sort=", "?cat=", "?year="]) {
      expect(sumber, `parameter ${param} hilang dari filter`).toContain(param);
    }
  });

  it("tiap nilai `sort` benar-benar DIKENALI /discover", () => {
    // ⚠️ TES INI MENGGANTI patokan lama yang berbunyi `toContain("sort=judul")`
    // — dan patokan itu justru MENGESAHKAN BUG-nya: `judul` bukan nilai yang
    // dikenal, jadi `parseSort` (lib/discover.ts:18) menjatuhkannya diam-diam
    // ke "relevance" dan pilihan "Judul A-Z" menampilkan katalog apa adanya.
    // Nilai yang benar `title`. Tes lama memeriksa teksnya ADA, bukan nilainya
    // SAH — jadi ia hijau selama berminggu-minggu di atas tombol yang mati.
    //
    // Sekarang dicocokkan ke SORT_OPTIONS, sumber kebenaran yang sama yang
    // dibaca /discover. Salah ketik BARU apa pun akan merah di sini, bukan
    // cuma yang satu ini.
    const sah = SORT_OPTIONS.map((o) => o.value) as readonly string[];
    const dipakai = [...tanpaKomentar(sumber).matchAll(/sort=([a-z]+)/g)].map(
      (m) => m[1],
    );

    expect(dipakai.length, "tak ada satu pun tautan sort di filter").toBeGreaterThan(0);
    const nyasar = [...new Set(dipakai)].filter((v) => !sah.includes(v));
    expect(
      nyasar,
      `nilai sort tak dikenal /discover — tombolnya akan diklik lalu ` +
        `menampilkan seluruh katalog. Nilai yang sah: ${sah.join(", ")}`,
    ).toEqual([]);
  });
});

// ===========================================================================
// PEMASANGAN — inti berkas ini.
// ===========================================================================
describe("FILTER menempel pada BARIS TAB, dan baris tab dipasang dua halaman", () => {
  // Sejarah singkat, supaya tak ada yang memindahkannya lagi tanpa sadar:
  //   2026-09-22  tombol lahir di dalam TabKatalogTampilan, cuma di `/`.
  //   2026-09-26  owner melapor "belum ada" — ternyata RedirectIfAuthed
  //               memantulkan yang sudah login dari `/`, jadi ia tak pernah
  //               terlihat. Tombolnya lalu dipasang di ujung strip kuning.
  //   2026-09-26  owner menunjuk contohnya lagi: yang dia mau SELURUH baris
  //               tab. Baris tab dipasang di /beranda — dan tombol di strip
  //               jadi DOBEL, jadi yang di strip dilepas.
  it("baris tab merender tombolnya", () => {
    const sumber = readFileSync(
      "app/components/beranda/TabKatalogTampilan.tsx",
      "utf-8",
    );
    const impor = sumber.match(/^import[\s\S]*?;$/gm)?.join(" ") ?? "";
    expect(impor).toContain("FilterKatalog");
    expect(sumber).toMatch(/<FilterKatalog\s+dramas=/);
  });

  for (const { berkas, halaman } of [
    { berkas: "app/page.tsx", halaman: "halaman depan `/`" },
    { berkas: "app/beranda/page.tsx", halaman: "`/beranda`" },
  ]) {
    it(`${halaman} memasang baris tabnya`, () => {
      // Sejak 2026-10-28 kedua halaman memasangnya lewat badan bersama
      // (BadanKatalog), bukan masing-masing. Rantainya diperiksa SAMPAI UJUNG:
      // berhenti di "halaman memasang BadanKatalog" akan tetap hijau walau
      // badan itu berhenti menggambar baris tabnya.
      const sumber = readFileSync(berkas, "utf-8");
      const impor = sumber.match(/^import[\s\S]*?;$/gm)?.join(" ") ?? "";
      expect(impor, `${berkas} tidak mengimpor BadanKatalog`).toContain(
        "BadanKatalog",
      );
      expect(
        sumber,
        `${berkas} mengimpor tapi tidak merender — penonton di ${halaman} ` +
          `tidak akan melihat baris tab MAUPUN tombol filternya, dan tidak ` +
          `ada error apa pun yang memberi tahu`,
      ).toMatch(/<BadanKatalog\s/);

      const badan = readFileSync(
        "app/components/beranda/BadanKatalog.tsx",
        "utf-8",
      );
      expect(badan).toMatch(/<TabKatalog\s+dramas=/);
    });
  }

  it("TIDAK ada tombol FILTER kedua di strip kuning /beranda", () => {
    // Dua tombol identik di satu halaman persis keluhan "dobel" yang owner
    // sampaikan 2026-09-21. Di contoh yang owner tunjuk pun FILTER menempel
    // pada baris tab, bukan pada strip.
    const browser = readFileSync(
      "app/components/beranda/CatalogBrowser.tsx",
      "utf-8",
    );
    expect(
      browser,
      "tombol FILTER dipasang lagi di strip kuning — di /beranda ia jadi " +
        "DOBEL dengan yang sudah ada di baris tab",
    ).not.toContain("FilterKatalog");
  });

  it("komponennya punya SATU sumber, bukan disalin ke dua tempat", () => {
    const tab = readFileSync(
      "app/components/beranda/TabKatalogTampilan.tsx",
      "utf-8",
    );
    expect(
      tab,
      "TabKatalogTampilan merakit tombol filternya sendiri lagi",
    ).not.toContain("SlidersHorizontal");
  });
});
