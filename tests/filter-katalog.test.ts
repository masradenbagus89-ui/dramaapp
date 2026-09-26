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
import StripKatalog from "../app/components/beranda/StripKatalog";
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
describe("FILTER benar-benar terpasang di KEDUA halaman", () => {
  const PEMASANG = [
    {
      berkas: "app/components/beranda/TabKatalogTampilan.tsx",
      halaman: "halaman depan `/` (baris tab)",
    },
    {
      berkas: "app/components/beranda/CatalogBrowser.tsx",
      halaman: "`/beranda` (ujung kanan strip kuning)",
    },
  ];

  for (const { berkas, halaman } of PEMASANG) {
    it(`${halaman} memasangnya`, () => {
      const sumber = readFileSync(berkas, "utf-8");
      const impor = sumber.match(/^import[\s\S]*?;$/gm)?.join(" ") ?? "";
      expect(impor, `${berkas} tidak mengimpor FilterKatalog`).toContain(
        "FilterKatalog",
      );
      expect(
        sumber,
        `${berkas} mengimpor tapi tidak merender — penonton di ${halaman} ` +
          `tidak akan melihat tombol filter sama sekali, dan tidak ada error ` +
          `apa pun yang memberi tahu`,
      ).toMatch(/<FilterKatalog\s+dramas=/);
    });
  }

  it("komponennya punya SATU sumber, bukan disalin ke dua tempat", () => {
    // Sampai 2026-09-26 tombolnya ditulis langsung di dalam
    // TabKatalogTampilan. Menyalinnya ke tempat kedua berarti dua tombol yang
    // isinya pelan-pelan berbeda — dan yang satu pasti tertinggal.
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

describe("strip kuning: tombol di kanan tidak ikut tergeser", () => {
  const stripHtml = (aksiKanan?: React.ReactNode) =>
    renderToStaticMarkup(
      createElement(StripKatalog, {
        items: [{ href: "/discover?cat=Action", label: "ACTION" }],
        aksiKanan,
      }),
    );

  it("menggambar isi slot kanan yang dioper", () => {
    const html = stripHtml(createElement(FilterKatalog, { dramas: KATALOG }));
    expect(html).toContain("ACTION");
    expect(html).toContain("bg-emerald-600");
  });

  it("tanpa slot, strip persis seperti sebelumnya", () => {
    // Penjaga untuk halaman depan & /discover yang TIDAK mengisi slot ini —
    // keduanya tidak boleh ikut berubah.
    const html = stripHtml();
    expect(html).toContain("ACTION");
    expect(html).not.toContain("bg-emerald-600");
  });

  it("area geser dibatasi ke chip saja, tombolnya di luar", () => {
    // Kalau tombol ikut masuk area `overflow-x-auto`, di layar HP ia terdorong
    // keluar pandangan dan penonton mengira filternya tidak ada — persis
    // masalah yang sedang diperbaiki, cuma bentuk lain.
    const sumber = readFileSync(
      "app/components/beranda/StripKatalog.tsx",
      "utf-8",
    );
    expect(sumber).toMatch(/flex flex-1 items-center overflow-x-auto/);
    expect(sumber).toMatch(/aksiKanan && <div className="shrink-0/);
  });
});
