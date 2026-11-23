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

// Tanpa prop sama sekali sejak 2026-11-23 — `dramas` dilepas supaya katalog
// tak ikut terkirim ke browser. Pop up isinya mengambil katalognya sendiri.
const renderFilter = () => renderToStaticMarkup(createElement(FilterKatalog));

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

  it("pop up-nya TIDAK ikut terpasang sebelum tombolnya diklik", () => {
    // DUA hal sekaligus dijaga di sini, keduanya nyata:
    //   1. Baris tab ini dirender di tiap halaman katalog. Kalau pop up-nya
    //      selalu terpasang, enam dropdown + pengambil katalognya ikut hidup
    //      untuk tombol yang mungkin tak pernah disentuh.
    //   2. Pop up itu memanggil `useRouter()`. Tanpa penjaga ini, berkas tes
    //      ini — dan lima berkas lain yang merender baris tab — harus mulai
    //      mem-mock `next/navigation` hanya karena satu tombol.
    // Dibuktikan dari HTML hasil render, bukan dari sumbernya: yang penting
    // bukan "ada kondisi di kode", melainkan tidak ada yang tergambar.
    const html = renderFilter();
    expect(html).toContain("Filter");
    expect(
      html,
      "isi pop up ikut tergambar padahal tombolnya belum diklik",
    ).not.toContain("Filter Movie");
  });
});

describe("tombol ini PEMICU pop up bersama, bukan dropdown sendiri", () => {
  // ⚠️ SELURUH BLOK INI DITULIS ULANG 2026-11-23 (owner: *"isi filter samakan
  // dengan filter di bawah"*). Patokan lamanya menjaga isi dropdown rakitan
  // sendiri — `availableGenres(dramas)`, `getYearOptions(dramas)`,
  // `genre.length > 0`, dan daftar tautan `?sort=`/`?cat=`/`?year=`. Dropdown
  // itu TIDAK ADA LAGI, jadi patokan-patokan tersebut kini menuntut kode yang
  // justru tidak boleh ada.
  //
  // Jaminannya TIDAK HILANG, cuma pindah rumah: isi penyaringnya sekarang milik
  // `FilterFilmPopup`, dan dijaga di tests/filter-film-popup.test.ts — termasuk
  // "tiap nilai sort dikenali /discover" yang dulu di sini.
  const sumber = tanpaKomentar(
    readFileSync("app/components/beranda/FilterKatalog.tsx", "utf-8"),
  );

  it("membuka pop up yang SAMA dengan tombol Filter di bar bawah HP", () => {
    // Inti permintaan owner. Dua alat penyaring berbeda untuk satu situs
    // membuat penonton HP dan penonton komputer punya KEMAMPUAN yang berbeda —
    // bukan sekadar tampilan yang berbeda.
    expect(sumber).toContain("FilterFilmPopup");
    const bottom = tanpaKomentar(
      readFileSync("app/components/BottomNav.tsx", "utf-8"),
    );
    expect(
      bottom,
      "bar bawah tak lagi memakai pop up yang sama — keduanya menyimpang",
    ).toContain("FilterFilmPopup");
  });

  it("TIDAK merakit daftar penyaringnya sendiri lagi", () => {
    // Penjaga arah sebaliknya: kalau suatu saat dropdown lama dihidupkan lagi
    // di sini, situs kembali punya dua penyaring yang isinya berbeda.
    for (const sisa of [
      "availableGenres",
      "getYearOptions",
      "DropdownMenuContent",
      "/discover?sort=",
    ]) {
      expect(
        sumber,
        `${sisa} muncul lagi — penyaring kedua tumbuh kembali di sini`,
      ).not.toContain(sisa);
    }
  });

  it("tidak menerima `dramas` — katalog tak ikut terkirim ke browser", () => {
    // BUKAN kerapian. Komponen ini ber-"use client" sedangkan pemanggilnya
    // komponen SERVER; prop apa pun yang menyeberang batas itu ikut tertanam
    // di HTML tiap halaman. `dramas` berisi SELURUH katalog + sinopsisnya.
    // Pop up-nya mengambil katalog sendiri lewat /api/dramas saat DIBUKA.
    expect(sumber).not.toContain("dramas");
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
    // Prop `dramas` DILEPAS 2026-11-23 — lihat alasannya di blok di atas.
    // Yang dijaga tinggal: baris tab benar-benar memasang tombolnya.
    expect(sumber).toMatch(/<FilterKatalog\s*\/>/);
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
