// Penjaga untuk SELURUH tombol cari di situs (owner 2026-11-07: "tombol search
// belum berfungsi sempurna kamu perbaiki semua tombol search").
//
// Situs ini punya pencarian di DUA bentuk, dan keduanya punya cara gagal yang
// SENYAP — tidak ada error, tidak ada tes merah, halaman tetap 200:
//
//   A. Navbar hitam (TopNav). Kaca pembesarnya dulu `pointer-events-none`:
//      MURNI hiasan yang terlihat persis seperti tombol. Penonton mengkliknya,
//      tidak terjadi apa-apa, dan satu-satunya cara mencari adalah menekan
//      Enter yang tak pernah diberitahukan.
//
//   B. Bar merah (SearchBar) di empat pemakainya. `action` + `namaKolom`
//      membuat form tetap mencari lewat browser walau JavaScript gagal.
//      Pagarnya cuma terpasang di DUA dari empat pemakai — dan yang
//      terlindungi malah KERANGKA pemuatannya, sementara bar sungguhannya
//      telanjang. Perbedaan diam-diam seperti itu yang membuat dua bar "sama"
//      berperilaku beda.
//
//      ⚠️ BATAS JUJUR (diukur 2026-11-07, bukan diasumsikan): di `modeTombol`
//      formnya BELUM tergambar sampai kotaknya dibuka — dibuktikan dengan
//      menghitung `action="/discover"` di HTML `/`, `/beranda`, `/discover`,
//      dan `/film`: NOL di keempatnya. Jadi di halaman-halaman itu `action`
//      bukan penyelamat untuk jendela sebelum JS aktif. Jangan mengklaim
//      sebaliknya; yang dijaga di sini KESERAGAMAN propnya.
//
// Keduanya mustahil ketahuan dari `npm run build` atau dari jumlah tes yang
// hijau. Yang menemukannya cuma orang yang benar-benar mengklik.
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { TUJUAN_CARI } from "../lib/nav-katalog";

// Alamat halaman yang sedang "dibuka" — pola yang sama dengan
// tests/kepala-situs.test.ts, supaya TopNav bisa dirender tanpa browser.
const keadaan = vi.hoisted(() => ({ path: "/my-list" }));

vi.mock("next/navigation", () => ({
  usePathname: () => keadaan.path,
  useSearchParams: () => new URLSearchParams(""),
  useRouter: () => ({ replace: () => {}, push: () => {} }),
}));

const { default: TopNav } = await import("../app/components/TopNav");

/**
 * Halaman tempat navbar hitam memang digambar.
 *
 * 🪤 BUKAN "/discover": halaman berkatalog (beranda, discover, film, katalog)
 * kepalanya dipegang bar merah, dan TopNav sengaja MENYEMBUNYIKAN DIRI di sana
 * supaya tidak ada dua baris kepala. Merendernya di alamat itu memulangkan
 * string KOSONG — dan tes yang memeriksa string kosong akan "lulus" untuk
 * assertion `not.toContain` apa pun, yaitu hijau tanpa membuktikan apa-apa.
 */
const HALAMAN_BERNAVBAR = "/my-list";

const htmlNavbar = () => {
  keadaan.path = HALAMAN_BERNAVBAR;
  const html = renderToStaticMarkup(createElement(TopNav));
  // Pagar untuk tes ini sendiri: kalau suatu saat TopNav ikut disembunyikan
  // di alamat ini, seluruh pemeriksaan di bawah akan memeriksa string kosong
  // dan sebagiannya tetap hijau — hijau tanpa membuktikan apa pun.
  if (!html) throw new Error(`TopNav tidak digambar di ${HALAMAN_BERNAVBAR}`);
  return html;
};

describe("kotak cari navbar hitam (TopNav)", () => {
  it("kaca pembesarnya TOMBOL sungguhan, bukan hiasan", () => {
    const html = htmlNavbar();

    // Dua arah sekaligus: tombolnya ada, DAN ia tidak dimatikan lagi oleh
    // pointer-events-none. Memeriksa satu saja meloloskan tombol yang
    // tergambar tapi tak bisa diklik.
    expect(html).toContain('aria-label="Cari"');
    expect(html).toContain('type="submit"');

    const sumber = readFileSync("app/components/TopNav.tsx", "utf-8");
    expect(
      sumber,
      "kaca pembesar di kotak cari dimatikan lagi dengan pointer-events-none — " +
        "ia akan terlihat seperti tombol tapi diklik tidak terjadi apa-apa",
    ).not.toMatch(/pointer-events-none[^\n]*Search|Search[^\n]*pointer-events-none/);
  });

  it("formnya tetap mencari walau JavaScript belum aktif", () => {
    const html = htmlNavbar();

    // `action` + `name` adalah SATU-SATUNYA yang bekerja di jendela sebelum
    // React memasang penangannya. Keduanya harus ada bersama: `action` tanpa
    // `name` mengirim form KOSONG, jadi penonton mendarat di /discover tanpa
    // kata kunci — terbaca seperti pencarian yang menghapus ketikannya.
    expect(html).toContain(`action="${TUJUAN_CARI}"`);
    expect(html).toContain('name="q"');
  });
});

describe("bar cari merah (SearchBar) — keempat pemakainya seragam", () => {
  /**
   * Keempat berkas yang merender SearchBar. Daftar ini sengaja ditulis
   * lengkap: menambah pemakai baru tanpa memasukkannya ke sini berarti bar
   * baru itu lahir tanpa penyelamat tanpa-JS, dan tak ada yang memberi tahu.
   */
  const PEMAKAI = [
    "app/components/beranda/PublicTopBars.tsx",
    "app/components/beranda/KepalaBeranda.tsx",
    "app/components/beranda/KerangkaKepalaKatalog.tsx",
    "app/components/DramaBrowser.tsx",
  ];

  for (const berkas of PEMAKAI) {
    it(`${berkas.split("/").pop()} memasang action + namaKolom`, () => {
      const sumber = readFileSync(berkas, "utf-8");
      expect(
        sumber,
        `${berkas} merender SearchBar tanpa 'action' — begitu kotaknya terbuka, ` +
          `Enter tidak lagi mencari kalau JavaScript gagal`,
      ).toContain("action={TUJUAN_CARI}");
      expect(
        sumber,
        `${berkas} merender SearchBar tanpa 'namaKolom' — formnya terkirim ` +
          `KOSONG, jadi penonton mendarat di hasil pencarian tanpa kata kunci`,
      ).toContain('namaKolom="q"');
    });
  }

  it("daftar PEMAKAI di atas benar-benar mencakup semua perender SearchBar", () => {
    // 🪤 Penjaga anti-ketinggalan-zaman: tanpa ini, pemakai BARU bisa lahir
    // tanpa penyelamat tanpa-JS dan daftar tulis-tangan tetap hijau.
    // Hanya file yang me-RENDER `<SearchBar` yang dihitung; yang sekadar
    // mengimpor konstantanya (TEKS_KOTAK_CARI, KELAS_MENEMPEL_KEPALA) tidak.
    const semua = [
      "app/components/beranda/PublicTopBars.tsx",
      "app/components/beranda/KepalaBeranda.tsx",
      "app/components/beranda/KerangkaKepalaKatalog.tsx",
      "app/components/DramaBrowser.tsx",
      "app/components/beranda/CatalogBrowser.tsx",
    ].filter((f) => readFileSync(f, "utf-8").includes("<SearchBar"));

    // CatalogBrowser YATIM sejak /beranda memakai KepalaBeranda (2026-10-28):
    // nol berkas merendernya, jadi bar cari di dalamnya tak pernah terlihat
    // penonton. Ia sengaja TIDAK dituntut lengkap — tapi tetap didaftar di
    // sini supaya kalau suatu saat ia dipakai lagi, perbedaannya ketahuan.
    const YATIM = ["app/components/beranda/CatalogBrowser.tsx"];

    expect(semua.filter((f) => !YATIM.includes(f)).sort()).toEqual(
      [...PEMAKAI].sort(),
    );
  });
});

describe("alamat hasil pencarian hanya punya SATU sumber", () => {
  it('tidak ada lagi "/discover" tulis-tangan sebagai tujuan form cari', () => {
    // Dulu nilainya ada di TIGA tempat: lib/nav-katalog.ts (jalur dengan JS,
    // lewat alamatCari) dan dua `const TUJUAN_CARI = "/discover"` tulis-tangan
    // (jalur tanpa JS, lewat `action`). Kalau alamatnya pindah, kedua jalur
    // bisa menyimpang tanpa error: pencarian jalan saat JS aktif, dan mendarat
    // di 404 saat belum.
    for (const berkas of [
      "app/components/beranda/KepalaBeranda.tsx",
      "app/components/beranda/KerangkaKepalaKatalog.tsx",
      "app/components/beranda/PublicTopBars.tsx",
      "app/components/DramaBrowser.tsx",
      "app/components/TopNav.tsx",
    ]) {
      expect(
        readFileSync(berkas, "utf-8"),
        `${berkas} menulis sendiri alamat hasil pencarian — impor TUJUAN_CARI`,
      ).not.toMatch(/=\s*"\/discover"/);
    }
  });

  it("alamatCari memakai konstanta yang sama dengan action form", async () => {
    const { alamatCari } = await import("../lib/nav-katalog");
    expect(alamatCari("")).toBe(TUJUAN_CARI);
    expect(alamatCari("naga")).toBe(`${TUJUAN_CARI}?q=naga`);
  });
});
