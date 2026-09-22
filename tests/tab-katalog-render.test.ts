// Penjaga TAMPILAN deret tab halaman depan.
//
// Bedanya dengan tests/tab-katalog.test.ts: di sana yang diuji fungsi penyusun
// daftarnya; DI SINI komponennya benar-benar DIRENDER lalu HTML-nya diperiksa.
// Lapisan ini perlu karena daftar yang benar masih bisa gagal sampai ke layar —
// mis. tab digambar tapi isinya tidak ikut berganti, atau tautannya salah tulis
// sehingga semua tab menuju halaman yang sama. Kegagalan seperti itu SENYAP.
//
// Yang diuji `TabKatalogTampilan` (bukan `TabKatalog`) karena di sanalah seluruh
// bentuknya berada; `TabKatalog` hanya menerjemahkan alamat jadi dua nilai, dan
// penerjemahnya (`parseTab`) sudah diuji terpisah.
//
// BATAS JUJUR: isi menu FILTER TIDAK diperiksa di sini. Menu Radix baru menulis
// isinya ke HTML saat dibuka — pelajaran yang sudah tercatat di project ini
// (2026-09-21), dan tes yang "memeriksa" isinya lewat HTML statis sebenarnya
// tidak menguji apa pun. Yang diuji: tombolnya ada.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Drama } from "../lib/types";
import type { TabKey } from "../lib/tab-katalog";

const { default: TabKatalogTampilan } = await import(
  "../app/components/beranda/TabKatalogTampilan"
);

function stub(partial: Partial<Drama> & Pick<Drama, "id">): Drama {
  return {
    title: `Judul ${partial.id}`,
    category: "Action",
    episodes: 10,
    views: "1.0K",
    synopsis: "",
    gradient: "from-zinc-800 to-black",
    posterImage: "https://contoh.test/p.jpg",
    ...partial,
  };
}

const KATALOG: Drama[] = [
  stub({ id: "s1", views: "1.0K", imdbRating: "7.8", year: "2024" }),
  stub({ id: "s2", views: "1.0K", imdbRating: "7.8", year: "2024", premium: true }),
  stub({ id: "s3", views: "9.9M", imdbRating: "7.8", year: "2024", status: "Ongoing" }),
  stub({ id: "f1", kind: "movie", episodes: 1, views: "2.0K", imdbRating: "9.1", year: "2008" }),
  stub({ id: "f2", kind: "movie", episodes: 1, views: "1.0K", imdbRating: "8.1", year: "2026" }),
];

function render(tab: TabKey, semua = false): string {
  return renderToStaticMarkup(
    createElement(TabKatalogTampilan, { dramas: KATALOG, tab, semua }),
  );
}

/** Judul drama yang benar-benar tergambar, sesuai urutan kemunculannya. */
function judulTergambar(html: string): string[] {
  return [...html.matchAll(/>Judul ([a-z0-9]+)</g)].map((m) => m[1]);
}

describe("TabKatalogTampilan — deret tab tergambar", () => {
  it("keenam tab yang diminta owner ada di HTML", () => {
    const html = render("terbaru");
    for (const label of [
      "TERBARU",
      "SERIES UNGGULAN",
      "SERIES UPDATE",
      "TERPOPULER",
      "REKOMENDASI",
      "2026", // tab tahun, dihitung dari katalog
    ]) {
      expect(html).toContain(`>${label}<`);
    }
  });

  it("tombol FILTER ada", () => {
    expect(render("terbaru")).toContain(">Filter<");
  });

  it("tiap tab punya alamatnya sendiri — bukan semua menuju tempat yang sama", () => {
    const html = render("terbaru");
    for (const href of [
      'href="/"',
      'href="/?tab=unggulan"',
      'href="/?tab=update"',
      'href="/?tab=terpopuler"',
      'href="/?tab=rekomendasi"',
      'href="/?tab=tahun"',
    ]) {
      expect(html).toContain(href);
    }
  });

  it("tab yang sedang dibuka ditandai untuk pembaca layar & mata", () => {
    const html = render("terpopuler");
    // Urutan atribut di HTML hasil React TIDAK dijamin (di sini `aria-current`
    // justru ditulis sebelum `href`), jadi polanya tidak boleh mengandaikannya.
    const tagAktif = html.match(/<a[^>]*aria-current="page"[^>]*>/)?.[0] ?? "";
    expect(tagAktif).toContain('href="/?tab=terpopuler"');
    // Hanya SATU tab yang boleh ditandai aktif.
    expect([...html.matchAll(/aria-current="page"/g)].length).toBe(1);
  });
});

describe("mengganti tab BENAR-BENAR mengganti isinya", () => {
  it("tiap tab menggambar susunan judul yang berbeda", () => {
    const kunci: TabKey[] = [
      "terbaru",
      "unggulan",
      "update",
      "terpopuler",
      "rekomendasi",
      "tahun",
    ];
    const hasil = kunci.map((t) => judulTergambar(render(t)).join(","));
    expect(new Set(hasil).size).toBe(kunci.length);
  });

  it("judul bagian ikut berganti, bukan tetap 'Terbaru'", () => {
    expect(render("terbaru")).toContain(">Terbaru Ditambahkan<");
    expect(render("unggulan")).toContain(">Series Unggulan<");
    expect(render("terpopuler")).toContain(">Paling Banyak Ditonton<");
    expect(render("tahun")).toContain(">Rilis 2026<");
  });

  it("tab SERIES UNGGULAN hanya menggambar serial yang ditandai/berbayar", () => {
    expect(judulTergambar(render("unggulan"))).toEqual(["s2"]);
  });

  it("tab tahun hanya menggambar judul bertahun itu", () => {
    expect(judulTergambar(render("tahun"))).toEqual(["f2"]);
  });
});

describe("tombol Semua", () => {
  it("tidak digambar kalau isi tab masih muat satu baris", () => {
    // Katalog uji cuma 5 judul — di bawah batas baris, jadi tombolnya percuma.
    expect(render("terbaru")).not.toContain(">Semua<");
  });

  it("muncul begitu isinya melebihi satu baris, dan menuju ?semua=1", () => {
    const banyak = Array.from({ length: 20 }, (_, i) => stub({ id: `x${i}` }));
    const html = renderToStaticMarkup(
      createElement(TabKatalogTampilan, { dramas: banyak, tab: "terbaru", semua: false }),
    );
    expect(html).toContain(">Semua<");
    expect(html).toContain('href="/?semua=1"');
  });

  it("saat terbuka penuh, tombolnya berubah jadi Ringkas dan bisa dikembalikan", () => {
    const banyak = Array.from({ length: 20 }, (_, i) => stub({ id: `x${i}` }));
    const html = renderToStaticMarkup(
      createElement(TabKatalogTampilan, { dramas: banyak, tab: "terbaru", semua: true }),
    );
    expect(html).toContain(">Ringkas<");
    expect(html).toContain('href="/"');
  });
});
