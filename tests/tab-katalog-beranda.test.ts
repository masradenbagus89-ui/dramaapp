// Penjaga DERET TAB DI /beranda — owner 2026-09-26.
//
// Owner meminta bentuk situs katalog pembanding: baris TERBARU · SERIES
// UNGGULAN · SERIES UPDATE · TERPOPULER · REKOMENDASI · <tahun> dengan tombol
// FILTER hijau di ujung kanan. Barisnya SUDAH ada sejak 2026-09-22 — tapi cuma
// di halaman depan `/`, dan `RedirectIfAuthed` memantulkan siapa pun yang sudah
// login dari sana ke `/beranda`. Jadi owner tidak pernah melihatnya.
//
// ⚠️ JEBAKAN UTAMA yang dijaga berkas ini: kalau tab di /beranda menunjuk `/`,
// mengkliknya melempar penonton yang login ke `/` lalu DIPANTULKAN balik ke
// /beranda — tabnya terlihat MATI, tanpa satu pun error. Itu bentuk lain dari
// bug yang sedang diperbaiki.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import TabKatalogTampilan from "../app/components/beranda/TabKatalogTampilan";
import { TAB_BAWAAN, daftarTab } from "../lib/tab-katalog";
import type { Drama } from "../lib/types";

function drama(partial: Partial<Drama> & Pick<Drama, "id" | "title">): Drama {
  return {
    category: "Action",
    episodes: 10,
    views: "1.2K",
    synopsis: "",
    gradient: "from-zinc-800 to-black",
    ...partial,
  };
}

/** Katalog yang cukup berisi supaya tiap tab punya isi & tombol SEMUA muncul. */
const KATALOG: Drama[] = Array.from({ length: 30 }, (_, i) =>
  drama({
    id: `d${i}`,
    title: `Drama ${i}`,
    year: i % 2 ? "2026" : "2025",
    imdbRating: "8.0",
    views: `${i}K`,
  }),
);

const render = (opsi: { basePath?: string; semua?: boolean } = {}) =>
  renderToStaticMarkup(
    createElement(TabKatalogTampilan, {
      dramas: KATALOG,
      tab: TAB_BAWAAN,
      semua: opsi.semua ?? false,
      ...(opsi.basePath ? { basePath: opsi.basePath } : {}),
    }),
  );

describe("bentuk baris tab sesuai contoh owner", () => {
  const html = render();

  it("membawa SEMUA label tab yang diminta", () => {
    for (const t of daftarTab(KATALOG)) {
      expect(html, `tab ${t.label} hilang`).toContain(t.label);
    }
  });

  it("tombol FILTER hijau ada di baris yang sama", () => {
    expect(html).toContain("Filter");
    expect(html).toContain("bg-emerald-600");
  });
});

describe("alamat tab mengikuti halaman tempatnya dipasang", () => {
  it("di /beranda, tiap tab menunjuk /beranda — BUKAN /", () => {
    // Inti perbaikannya. Tab yang menunjuk `/` akan dipantulkan
    // RedirectIfAuthed untuk penonton yang sudah login, dan tabnya terlihat
    // mati tanpa error apa pun.
    const html = render({ basePath: "/beranda" });
    expect(html).toContain('href="/beranda?tab=unggulan"');
    expect(html).toContain('href="/beranda?tab=terpopuler"');
    // Tab bawaan tidak perlu parameter — alamatnya halaman itu sendiri.
    expect(html).toContain('href="/beranda"');
    expect(
      html,
      "masih ada tab yang menunjuk halaman depan — akan memantul untuk " +
        "penonton yang sudah login",
    ).not.toMatch(/href="\/\?tab=/);
  });

  it("tanpa basePath, perilaku halaman depan TIDAK berubah", () => {
    // Pembanding wajib: halaman depan `/` memakai bawaannya dan harus tetap
    // seperti sebelum hari ini.
    const html = render();
    expect(html).toContain('href="/?tab=unggulan"');
    expect(html).toContain('href="/"');
  });
});

describe("tombol SEMUA merakit alamat yang SAH", () => {
  // Versi lama menyambung "?" / "&" dengan menebak dari `key === "terbaru"`.
  // Begitu basePath berbeda atau tab bertambah, tebakan itu menghasilkan
  // alamat rusak seperti `/beranda?tab=x?semua=1` — dan akibatnya cuma
  // terlihat sebagai tombol yang diklik lalu tidak terjadi apa-apa.
  it("pada tab bawaan: satu tanda tanya, bukan dua", () => {
    const html = render({ basePath: "/beranda" });
    expect(html).toContain('href="/beranda?semua=1"');
    expect(html).not.toMatch(/href="[^"]*\?[^"]*\?/);
  });

  it("pada tab lain: parameter disambung dengan &, bukan ?", () => {
    const html = renderToStaticMarkup(
      createElement(TabKatalogTampilan, {
        dramas: KATALOG,
        tab: "terpopuler",
        semua: false,
        basePath: "/beranda",
      }),
    );
    expect(html).toContain('href="/beranda?tab=terpopuler&amp;semua=1"');
    expect(html).not.toMatch(/href="[^"]*\?[^"]*\?/);
  });

  it("saat sedang 'Semua', tombolnya kembali ke bentuk ringkas", () => {
    const html = render({ basePath: "/beranda", semua: true });
    expect(html).toContain("Ringkas");
    expect(html).toContain('href="/beranda"');
  });
});

// ===========================================================================
// PEMASANGAN — barisnya benar-benar tergambar di /beranda.
//
// Pelajaran 2026-09-23 & 2026-09-26: komponen bisa sempurna dan teruji
// sementara orangnya tidak pernah melihatnya. Untuk baris tab ini hal itu
// SUDAH TERJADI — ia ada empat hari di halaman depan tanpa pernah terbuka
// untuk owner.
// ===========================================================================
describe("deret tab benar-benar DIPASANG di /beranda", () => {
  const halaman = readFileSync("app/beranda/page.tsx", "utf-8");

  it("halaman beranda merender TabKatalog", () => {
    const impor = halaman.match(/^import[\s\S]*?;$/gm)?.join(" ") ?? "";
    expect(impor).toContain("TabKatalog");
    expect(halaman).toMatch(/<TabKatalog\s+dramas=/);
  });

  it("mengoper basePath=/beranda pada ELEMEN TabKatalog itu sendiri", () => {
    // ⚠️ Diperiksa dari elemennya, BUKAN dari "apakah teks basePath ada di
    // berkas". Versi pertama tes ini cuma mencari teks, dan itu LOLOS saat
    // diuji-rusak: isi `<Suspense fallback>` juga memuat basePath yang sama,
    // jadi melepasnya dari `<TabKatalog>` tetap hijau. Penjaga palsu —
    // bentuk kelemahan yang sudah berulang di repo ini.
    const elemen = halaman.match(/<TabKatalog\s[\s\S]*?\/>/);
    expect(elemen, "<TabKatalog … /> tidak ditemukan").toBeTruthy();
    expect(
      elemen![0],
      'tab di /beranda menunjuk "/" — penonton yang sudah login akan ' +
        "dipantulkan RedirectIfAuthed dan tabnya terlihat mati",
    ).toMatch(/basePath="\/beranda"/);
  });

  it("fallback-nya JUGA memakai basePath yang sama", () => {
    // Kalau fallback memakai alamat berbeda, tab sempat menunjuk `/` selama
    // sepersekian detik sebelum bagian browsernya menyusul — cukup untuk
    // diklik dan memantul.
    const fb = halaman.match(/<TabKatalogTampilan[\s\S]*?\/>/);
    expect(fb, "<TabKatalogTampilan … /> di fallback tidak ditemukan").toBeTruthy();
    expect(fb![0]).toMatch(/basePath="\/beranda"/);
  });

  it("dibungkus <Suspense> — syarat Next untuk useSearchParams", () => {
    // Tanpa ini `next build` GAGAL, bukan sekadar peringatan.
    expect(halaman).toContain("<Suspense");
    expect(halaman).toContain("fallback=");
  });

  it("isi fallback-nya bentuk yang SAMA, supaya halaman tidak melompat", () => {
    expect(halaman).toContain("TabKatalogTampilan");
    expect(halaman).toContain("TAB_BAWAAN");
  });

  it("CatalogBrowser menggambar slotnya, bukan menelannya diam-diam", () => {
    const browser = readFileSync(
      "app/components/beranda/CatalogBrowser.tsx",
      "utf-8",
    );
    expect(browser).toContain("tabSlot");
    expect(browser).toMatch(/\{tabSlot\}/);
  });
});

describe("halaman depan TIDAK ikut berubah", () => {
  it("app/page.tsx tetap memakai bawaannya (tanpa basePath)", () => {
    // Di sana `/` memang alamat yang benar, dan RedirectIfAuthed baru bekerja
    // SESUDAH halaman terbuka — jadi pengunjung yang belum login tetap wajar.
    const depan = readFileSync("app/page.tsx", "utf-8");
    expect(depan).toContain("<TabKatalog dramas={dramas} />");
    expect(depan).not.toContain('basePath="/beranda"');
  });
});
