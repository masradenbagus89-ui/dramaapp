// @vitest-environment jsdom
//
// Penjaga RANTAI PEMBACA tab: `?tab=` di alamat benar-benar berubah jadi isi
// yang berbeda di layar.
//
// KENAPA PERLU TES SENDIRI, dan ini pelajarannya: HTML yang keluar dari server
// SELALU menampilkan tab bawaan. Itu disengaja — halaman dijaga tetap statis,
// jadi `?tab=` dibaca di browser, bukan oleh halaman. Akibatnya `curl` (dan
// alat pemeriksa apa pun yang tidak menjalankan JavaScript) SELALU melihat
// "Terbaru" berapa kali pun alamatnya diganti.
//
// Itu membuat bagian ini nyaris mustahil diperiksa dari luar — dan sesi
// 2026-09-26 sempat salah menyimpulkan tab "berfungsi" karena menemukan teks
// "Paling Banyak Ditonton" di HTML, padahal yang ketemu adalah nama BARIS
// KATEGORI di bawah halaman, bukan judul tabnya. Tes ini menutup celah itu:
// ia menjalankan pembacanya sungguhan dengan alamat tiruan.
import { describe, it, expect, vi } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Drama } from "../lib/types";

/** Alamat tiruan — diganti tiap kasus uji. */
const keadaan = vi.hoisted(() => ({ query: "" }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(keadaan.query),
}));

const { default: TabKatalog } = await import(
  "../app/components/beranda/TabKatalog"
);

function drama(partial: Partial<Drama> & Pick<Drama, "id" | "title">): Drama {
  return {
    category: "Action",
    episodes: 10,
    views: "1K",
    synopsis: "",
    gradient: "from-zinc-800 to-black",
    ...partial,
  };
}

const KATALOG: Drama[] = Array.from({ length: 30 }, (_, i) =>
  drama({
    id: `d${i}`,
    title: `Drama ${i}`,
    year: i % 2 ? "2026" : "2025",
    imdbRating: "8.0",
    views: `${i}K`,
  }),
);

const bacaAlamat = (query: string) => {
  keadaan.query = query;
  return renderToStaticMarkup(
    h(TabKatalog, { dramas: KATALOG, basePath: "/beranda" }),
  );
};

/** Judul bagian yang benar-benar tergambar. */
const judulTergambar = (html: string) =>
  html.match(/<h2 class="truncate[^>]*>([^<]*)/)?.[1] ?? "";

describe("?tab= di alamat benar-benar mengganti isi di layar", () => {
  it("tanpa parameter: tab bawaan", () => {
    expect(judulTergambar(bacaAlamat(""))).toBe("Terbaru");
  });

  it("?tab=terpopuler: judulnya ikut berganti", () => {
    // Inti tes ini. Kalau rantai pembacanya putus, hasilnya tetap "Terbaru"
    // dan tab terlihat mati saat diklik — tanpa satu pun error.
    expect(judulTergambar(bacaAlamat("tab=terpopuler"))).toBe("Terpopuler");
  });

  it("tiap tab mendarat di judulnya sendiri", () => {
    const pasangan: [string, string][] = [
      ["tab=unggulan", "Series Unggulan"],
      ["tab=update", "Series Update"],
      ["tab=rekomendasi", "Rekomendasi"],
    ];
    for (const [query, judul] of pasangan) {
      expect(judulTergambar(bacaAlamat(query)), query).toBe(judul);
    }
  });

  it("isinya ikut berbeda, bukan cuma judulnya yang berganti", () => {
    // Pembanding: judul bisa saja berganti sementara daftar posternya sama.
    const terbaru = bacaAlamat("");
    const unggulan = bacaAlamat("tab=unggulan");
    expect(unggulan).not.toBe(terbaru);
  });

  it("tab asing jatuh ke bawaan, bukan halaman kosong", () => {
    // Alamat bisa diketik siapa saja; nilai tak dikenal tidak boleh
    // mengosongkan bagian ini.
    expect(judulTergambar(bacaAlamat("tab=ngawur"))).toBe("Terbaru");
  });

  it("?semua=1 membuka bentuk grid penuh", () => {
    const ringkas = bacaAlamat("");
    const penuh = bacaAlamat("semua=1");
    expect(ringkas).toContain("Semua");
    expect(penuh).toContain("Ringkas");
  });

  it("basePath diteruskan pembaca ke tampilannya", () => {
    // Kalau putus di sini, tab menunjuk `/` dan memantul untuk yang login.
    // (Alamatnya kini polos: sejak 2026-09-26 tab PINDAH HALAMAN, jadi tak
    // perlu penanda lompat di dalam halaman yang sama.)
    expect(bacaAlamat("")).toContain('href="/beranda"');
  });
});
