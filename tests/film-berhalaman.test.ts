// Penjaga NOMOR HALAMAN di /film (owner 2026-10-10: "ketika diklik lainnya
// semua berfungsi" — tombol Lainnya harus mendarat di daftar yang benar-benar
// bisa ditelusuri, bukan satu halaman berisi ratusan film sekaligus).
//
// Diuji di sini, bukan di layar, karena daftar film datang dari penyedia luar
// yang butuh kunci API — di komputer mana pun daftarnya selalu kosong, jadi
// paginasinya MUSTAHIL dibuktikan lewat localhost.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import DaftarFilmBerhalaman, {
  FILM_PER_HALAMAN,
} from "../app/components/film/DaftarFilmBerhalaman";
import NomorHalaman from "../app/components/NomorHalaman";
import { pageOfCatalog } from "../lib/beranda-catalog";
import type { PlaylyVideoPublik } from "../lib/playly-publik";

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
  quality: null,
});

const daftar = (jumlah: number) =>
  Array.from({ length: jumlah }, (_, i) => film(i));

const render = (jumlah: number) =>
  renderToStaticMarkup(
    createElement(DaftarFilmBerhalaman, { videos: daftar(jumlah) }),
  );

describe("pageOfCatalog memotong daftar FILM, bukan cuma drama", () => {
  // Pembuktian bahwa penggenerikan 2026-10-10 benar-benar berlaku: sebelum itu
  // fungsinya terpaku pada `Drama[]` dan daftar film tak bisa dipotong sama
  // sekali.
  it("memulangkan potongan bertipe film dengan hitungan yang benar", () => {
    const p = pageOfCatalog(daftar(50), 2, 24);

    expect(p.items).toHaveLength(24);
    expect(p.items[0].title).toBe("Film Layar Lebar 24");
    expect(p.page).toBe(2);
    expect(p.totalPages).toBe(3);
    expect(p.from).toBe(25);
    expect(p.to).toBe(48);
    expect(p.total).toBe(50);
  });
});

describe("/film — daftar berhalaman", () => {
  it(`menggambar paling banyak ${FILM_PER_HALAMAN} film di halaman pertama`, () => {
    const html = render(60);

    expect(html).toContain("Film Layar Lebar 0");
    expect(html).toContain(`Film Layar Lebar ${FILM_PER_HALAMAN - 1}`);
    // Judul tepat SESUDAH batas tidak boleh ikut tergambar.
    expect(html).not.toContain(`Film Layar Lebar ${FILM_PER_HALAMAN}<`);
  });

  it("menampilkan nomor halaman saat filmnya lebih dari satu halaman", () => {
    const html = render(60);

    expect(html).toContain('aria-label="Halaman film"');
    expect(html).toContain('aria-label="Halaman berikutnya"');
  });

  it("memberi tahu penonton sedang melihat bagian yang mana", () => {
    const html = render(60);

    expect(html).toContain("dari 60");
  });

  it("film sedikit: nomor halaman TIDAK digambar sama sekali", () => {
    // Deret nomor berisi angka "1" sendirian memberi kesan ada halaman lain
    // yang sebenarnya tidak ada.
    const html = render(5);

    expect(html).toContain("Film Layar Lebar 4");
    expect(html).not.toContain('aria-label="Halaman film"');
  });
});

describe("NomorHalaman — komponen bersama /film & /beranda", () => {
  const gambar = (halaman: number, total: number) =>
    renderToStaticMarkup(
      createElement(NomorHalaman, {
        halaman,
        totalHalaman: total,
        onPindah: () => {},
      }),
    );

  it("meringkas halaman yang banyak dengan '…', bukan mencetak semuanya", () => {
    const html = gambar(10, 20);

    expect(html).toContain("…");
    expect(html).toContain(">10<");
    expect(html).not.toContain(">15<");
  });

  it("menandai halaman yang sedang dibuka untuk pembaca layar", () => {
    expect(gambar(3, 9)).toContain('aria-current="page"');
  });

  it("satu halaman saja: tidak digambar", () => {
    expect(gambar(1, 1)).toBe("");
  });
});
