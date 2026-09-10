// Tes tampilan kartu video Playly (redesain 2026-09-10).
//
// Yang dikunci di sini adalah ISI kartu, bukan warnanya: baris di bawah judul
// harus berisi TAHUN + GENRE, dan TIDAK BOLEH lagi berisi nama uploader atau
// durasi kedua. Itu permintaan owner yang gampang hilang diam-diam kalau nanti
// ada yang merapikan komponennya.
//
// Dirender lewat `react-dom/server` (sudah terpasang) memakai `createElement`
// tanpa JSX, karena vitest.config hanya memuat berkas tes ber-akhiran .ts.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PlaylyVideoGrid from "../app/components/PlaylyVideoGrid";
import type { PlaylyVideoPublik } from "../lib/playly-publik";

function videoKartu(ubah: Partial<PlaylyVideoPublik> = {}): PlaylyVideoPublik {
  return {
    id: "v1",
    title: "MOVIE_TITAN WAR THE LAST KING",
    durationSeconds: 1088,
    durationLabel: "18:08",
    creator: "coklat",
    embedUrl: "https://playly-dashboard.vercel.app/id/v1/embed",
    thumbnail: "https://contoh.test/sampul.jpg",
    dramaTitle: null,
    dramaHref: null,
    episode: null,
    year: null,
    genre: null,
    rating: null,
    ...ubah,
  };
}

const render = (videos: PlaylyVideoPublik[]) =>
  renderToStaticMarkup(createElement(PlaylyVideoGrid, { videos }));

describe("PlaylyVideoGrid — isi kartu video", () => {
  it("menampilkan tahun + genre di bawah judul", () => {
    const html = render([
      videoKartu({ year: "2026", genre: "Action, Sci-Fi" }),
    ]);
    expect(html).toContain("2026 · Action, Sci-Fi");
    expect(html).toContain("MOVIE_TITAN WAR THE LAST KING");
  });

  it("TIDAK lagi menampilkan nama uploader di kartu", () => {
    // Inti permintaan owner: kotak di bawah judul dulu berisi "coklat · 18:08".
    const html = render([videoKartu({ year: "2026", genre: "Action" })]);
    expect(html).not.toContain("coklat");
  });

  it("durasi hanya muncul SEKALI (badge di sampul), bukan dua kali", () => {
    const html = render([videoKartu({ year: "2026", genre: "Action" })]);
    expect(html.split("18:08").length - 1).toBe(1);
  });

  it("tahun/genre kosong -> barisnya hilang, bukan jadi baris hampa berisi '·'", () => {
    const html = render([videoKartu()]);
    expect(html).not.toContain("·");
  });

  it("hanya tahun yang ada -> tampil tahun saja, tanpa pemisah menggantung", () => {
    const html = render([videoKartu({ year: "2026" })]);
    expect(html).toContain("2026");
    expect(html).not.toContain("2026 ·");
  });

  it("rating tampil sebagai badge kalau dramanya punya nilai IMDb", () => {
    const html = render([videoKartu({ rating: "8.1" })]);
    expect(html).toContain("8.1");
  });

  it("tanpa rating, badge bintang tidak ikut dirender", () => {
    const html = render([videoKartu()]);
    expect(html).not.toContain("lucide-star");
  });

  it("batas `limit` tetap dipatuhi (dipakai baris ringkas di /discover)", () => {
    const videos = Array.from({ length: 5 }, (_, i) =>
      videoKartu({ id: `v${i}`, title: `Judul ${i}` }),
    );
    const html = renderToStaticMarkup(
      createElement(PlaylyVideoGrid, { videos, limit: 3 }),
    );
    expect(html).toContain("Judul 2");
    expect(html).not.toContain("Judul 3");
  });
});
