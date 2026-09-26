// Penjaga PEMASANGAN kartu video — owner 2026-09-26.
//
// Kenapa terpisah dari tests/beranda-video.test.ts: di sana yang diuji ATURAN
// penyusunan barisnya (fungsi murni), dan aturan itu bisa benar sempurna
// sementara kartunya tidak pernah tergambar di layar. Celah itu bukan
// hipotetis — `DownloadButton` pernah tayang lengkap dengan 9 tes hijau
// sementara NOL halaman mengimpornya (pelajaran 2026-09-23), dan build, tsc,
// serta npm test semuanya diam.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import FeaturedRow from "../app/components/beranda/FeaturedRow";
import type { KartuKatalog } from "../lib/beranda-video";
import type { PlaylyVideoPublik } from "../lib/playly-publik";

function video(
  id: string,
  ubah: Partial<PlaylyVideoPublik> = {},
): PlaylyVideoPublik {
  return {
    id,
    title: `Video ${id}`,
    durationSeconds: 140,
    durationLabel: "2:20",
    creator: "coklat",
    embedUrl: `https://playly-dashboard.vercel.app/id/${id}/embed`,
    thumbnail: "https://contoh.test/sampul.jpg",
    dramaTitle: null,
    dramaHref: null,
    episode: null,
    year: null,
    genre: null,
    kategori: null,
    rating: null,
    contentRating: null,
    quality: null,
    ...ubah,
  };
}

const kartuVideo = (v: PlaylyVideoPublik): KartuKatalog => ({
  jenis: "video",
  video: v,
});

const render = (items: KartuKatalog[]) =>
  renderToStaticMarkup(
    createElement(FeaturedRow, { title: "Film Terbaru", items }),
  );

describe("baris beranda menggambar kartu video", () => {
  it("judul videonya benar-benar tergambar", () => {
    const html = render([kartuVideo(video("v1", { title: "Arcadian" }))]);
    expect(
      html,
      "kartu video tidak tergambar — barisnya akan terlihat kosong di beranda",
    ).toContain("Arcadian");
  });

  it("kartunya menuju halaman tonton, bukan halaman drama", () => {
    const html = render([kartuVideo(video("98765", { title: "Arcadian" }))]);
    expect(html).toContain('href="/tonton/arcadian-98765"');
    // Pagar: jangan sampai video diarahkan ke /drama/<id> — halaman itu
    // membaca katalog Supabase dan akan membalas 404 untuk id video.
    expect(html).not.toContain('href="/drama/98765"');
  });

  it("sampulnya dipasang dari alamat Playly apa adanya", () => {
    const html = render([kartuVideo(video("v1"))]);
    expect(html).toContain('src="https://contoh.test/sampul.jpg"');
  });

  it("video tanpa sampul tetap tergambar (ikon, bukan gambar rusak)", () => {
    const html = render([kartuVideo(video("v1", { thumbnail: null, title: "Tanpa Sampul" }))]);
    expect(html).toContain("Tanpa Sampul");
    expect(html).not.toContain("src=\"null\"");
  });

  it("durasi dipajang, dan '-' berarti JANGAN dipajang", () => {
    expect(render([kartuVideo(video("v1"))])).toContain("2:20");
    // Pembanding: tanpa ini, "durasi tidak muncul" tak bisa dibedakan dari
    // "durasinya tak pernah digambar sama sekali".
    const tanpaDurasi = render([
      kartuVideo(video("v1", { durationLabel: "-" })),
    ]);
    expect(tanpaDurasi).not.toContain(">-<");
  });

  it("baris kosong tidak menggambar apa pun", () => {
    expect(render([])).toBe("");
  });
});

// ===========================================================================
// PEMASANGAN di halaman yang benar.
// ===========================================================================
describe("beranda benar-benar memakai baris gabungan", () => {
  const sumber = readFileSync(
    "app/components/beranda/CatalogBrowser.tsx",
    "utf-8",
  );

  it("menyusun barisnya dengan barisBerandaGabungan", () => {
    expect(
      sumber,
      "beranda kembali memakai homeCatalogRows langsung — videonya hilang " +
        "dari baris kategori tanpa satu pun error",
    ).toContain("barisBerandaGabungan(dramas, playlyVideos)");
  });

  it("mengoper isinya lewat prop `items`, bukan `dramas`", () => {
    // `dramas={row.items}` akan gagal typecheck sekarang, tapi penjaga ini ada
    // untuk arah sebaliknya: seseorang "merapikan" dengan membongkar bungkusnya
    // jadi daftar drama saja, dan kartu video lenyap diam-diam.
    expect(sumber).toMatch(/items=\{row\.items\}/);
  });
});

describe("halaman depan & Shorts SENGAJA tidak ikut berubah", () => {
  // Owner meminta videonya masuk BERANDA. Halaman depan dan Shorts memanggil
  // homeCatalogRows langsung, dan itu harus tetap begitu — Shorts khususnya
  // salah tempat: isinya cuplikan pendek, sedangkan video ini sampai 1,5 jam.
  for (const berkas of ["app/page.tsx", "app/shorts/page.tsx"]) {
    it(`${berkas} masih memakai homeCatalogRows apa adanya`, () => {
      const isi = readFileSync(berkas, "utf-8");
      expect(isi).toContain("homeCatalogRows");
      expect(
        isi,
        `${berkas} ikut memakai baris gabungan — itu perubahan cakupan yang ` +
          `belum diminta owner`,
      ).not.toContain("barisBerandaGabungan");
    });
  }
});
