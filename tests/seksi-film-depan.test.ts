// Penjaga seksi "Film Terbaru" di HALAMAN DEPAN — owner 2026-10-09:
// "tambahin film terbaru jadi khusus buat film bukan drama, karena dramaku
// sudah ada 164 film".
//
// ⚠️ KENAPA TES INI WAJIB ADA, bukan cukup dilihat di layar: film datang dari
// penyedia video LUAR yang butuh kunci API, dan kunci itu hanya ada di server
// produksi. Di komputer mana pun daftarnya SELALU kosong, jadi seksi ini
// MUSTAHIL dibuktikan lewat localhost maupun screenshot. Tes dengan film
// buatan adalah satu-satunya cara membuktikan ia benar-benar tergambar
// sebelum tayang.
//
// Diuji DUA ARAH dengan sengaja: "seksi tidak muncul saat film kosong" kalau
// berdiri sendiri TIDAK bisa dibedakan dari "seksinya tak pernah dibuat".
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TabKatalogTampilan from "../app/components/beranda/TabKatalogTampilan";
import { KUNCI_BARIS_VIDEO, JUDUL_BARIS_VIDEO } from "../lib/beranda-video";
import { TAB_BAWAAN } from "../lib/tab-katalog";
import type { Drama } from "../lib/types";
import type { PlaylyVideoPublik } from "../lib/playly-publik";

const KATALOG: Drama[] = Array.from({ length: 12 }, (_, i) => ({
  id: `d${i}`,
  title: `Drama Serial ${i}`,
  category: "Action",
  episodes: 10,
  views: `${i}K`,
  synopsis: "",
  gradient: "from-zinc-800 to-black",
  year: "2025",
  imdbRating: "8.0",
}));

const film = (i: number): PlaylyVideoPublik => ({
  id: `v${i}`,
  title: `Film Layar Lebar ${i}`,
  durationSeconds: 7200,
  durationLabel: "2:00:00",
  creator: "",
  embedUrl: "https://contoh.test/embed",
  thumbnail: null,
  dramaTitle: null,
  dramaHref: null,
  episode: null,
  year: "2026",
  genre: null,
  kategori: null,
  rating: null,
  contentRating: null,
  country: null,
  quality: null,
});

const render = (videos: PlaylyVideoPublik[]) =>
  renderToStaticMarkup(
    createElement(TabKatalogTampilan, {
      dramas: KATALOG,
      tab: TAB_BAWAAN,
      semua: false,
      seksiLengkap: true,
      videos,
    }),
  );

describe('seksi "Film Terbaru" di halaman depan', () => {
  it("tergambar saat ada film, dengan judul & tujuan SEMUA ke /film", () => {
    const html = render([film(1), film(2), film(3)]);

    expect(html).toContain(`id="seksi-${KUNCI_BARIS_VIDEO}"`);
    expect(html).toContain(JUDUL_BARIS_VIDEO);
    expect(html).toContain('href="/film"');
    expect(html).toContain("Film Layar Lebar 1");
    expect(html).toContain("Film Layar Lebar 3");
  });

  it("berisi FILM saja — tak ada drama yang menyelinap ke dalamnya", () => {
    const html = render([film(1)]);
    const mulai = html.indexOf(`id="seksi-${KUNCI_BARIS_VIDEO}"`);
    const series = html.indexOf('id="seksi-terbaru"');
    // ⚠️ BATAS AKHIRNYA dicari sebagai "seksi BERIKUTNYA apa pun", bukan
    // dipaku ke `seksi-unggulan` (2026-11-24). Seksi itu memang tidak lagi
    // digambar di beranda sejak owner menentukan lima seksi saja, dan
    // patokan yang dipaku ke satu nama akan patah lagi tiap kali urutannya
    // disusun ulang — merah karena alasan yang salah.
    const berikut = html.indexOf('id="seksi-', mulai + 1);

    // Seksi pertama ("Nonton Bareng", kunci `terbaru`) tetap di ATAS Film
    // Terbaru — urutan owner 2026-11-17, dipertahankan 2026-11-24.
    expect(series).toBeGreaterThanOrEqual(0);
    expect(mulai).toBeGreaterThan(series);
    expect(berikut, "tak ada seksi apa pun sesudah Film Terbaru").toBeGreaterThan(mulai);
    const isiSeksiFilm = html.slice(mulai, berikut);
    expect(isiSeksiFilm).toContain("Film Layar Lebar 1");
    expect(isiSeksiFilm).not.toContain("Drama Serial");
  });

  it("MENGHILANG saat sumber film kosong, dan seksi drama tetap utuh", () => {
    // Keadaan NORMAL di lokal & saat penyedia luar sedang mati. Halaman depan
    // tidak boleh ikut rusak — ini pagarnya.
    const html = render([]);

    expect(html).not.toContain(`id="seksi-${KUNCI_BARIS_VIDEO}"`);
    expect(html).not.toContain('href="/film"');
    expect(html).toContain('id="seksi-terbaru"');
    expect(html).toContain("Drama Serial 0");
  });

  it("seksi drama TIDAK ikut kemasukan film", () => {
    const html = render([film(1)]);
    const mulaiDrama = html.indexOf('id="seksi-terbaru"');
    const mulaiFilm = html.indexOf(`id="seksi-${KUNCI_BARIS_VIDEO}"`);
    const isiSeksiDrama = html.slice(mulaiDrama, mulaiFilm);

    expect(isiSeksiDrama).toContain("Drama Serial 0");
    expect(isiSeksiDrama).not.toContain("Film Layar Lebar");
  });
});
