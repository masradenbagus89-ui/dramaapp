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
  it("tergambar sebagai tombol hijau bertuliskan Filter", () => {
    const html = renderFilter();
    expect(html).toContain("Filter");
    // Warna hijau adalah bagian dari permintaan owner ("persis seperti LK21"),
    // bukan selera bebas — dipatok supaya tidak hilang saat kelasnya dirapikan.
    expect(html).toContain("bg-emerald-600");
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
    for (const param of ["sort=populer", "sort=rating", "sort=judul", "?cat=", "?year="]) {
      expect(sumber, `parameter ${param} hilang dari filter`).toContain(param);
    }
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
      const sumber = readFileSync(berkas, "utf-8");
      const impor = sumber.match(/^import[\s\S]*?;$/gm)?.join(" ") ?? "";
      expect(impor, `${berkas} tidak mengimpor TabKatalog`).toContain(
        "TabKatalog",
      );
      expect(
        sumber,
        `${berkas} mengimpor tapi tidak merender — penonton di ${halaman} ` +
          `tidak akan melihat baris tab MAUPUN tombol filternya, dan tidak ` +
          `ada error apa pun yang memberi tahu`,
      ).toMatch(/<TabKatalog\s+dramas=/);
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
