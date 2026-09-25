// @vitest-environment jsdom
//
// Penjaga SAMBUNGAN: kotak keterangan benar-benar muncul saat video diklik.
//
// Bedanya dengan tests/playly-info-video.test.ts: di sana komponen kotaknya
// diuji SENDIRIAN. Di sini yang diuji jalurnya — klik kartu -> kotak tergambar.
// Celah di antara keduanya nyata: komponen bisa sempurna tapi tidak pernah
// dipasang, dan tes komponen tetap hijau sementara layar penonton kosong.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createElement as h, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import PlaylyVideoGrid from "../app/components/PlaylyVideoGrid";
import type { PlaylyVideoPublik } from "../lib/playly-publik";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom tidak punya keduanya. scrollIntoView dipakai saat kartu diklik, dan
// fetch dipakai pemutar untuk menjemput alamat video — tanpa penggantinya, yang
// gagal adalah perkakas tesnya, bukan kode yang sedang diuji.
Element.prototype.scrollIntoView = () => {};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("tidak dipakai di tes ini"))));
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

const VIDEO: PlaylyVideoPublik = {
  id: "v1",
  title: "MOVIE_TITAN WAR THE LAST KING",
  durationSeconds: 1088,
  durationLabel: "18:08",
  creator: "coklat",
  embedUrl: "https://playly-dashboard.vercel.app/id/v1/embed",
  thumbnail: null,
  dramaTitle: "Drama A",
  dramaHref: "/drama/drama-a",
  episode: 3,
  year: "2026",
  genre: "Action, Sci-Fi",
  rating: "8.1",
  contentRating: "PG-13",
  quality: "WEB-DL",
};

describe("PlaylyVideoGrid — kotak keterangan muncul setelah video dipilih", () => {
  it("sebelum diklik: belum ada kotak maupun tombolnya", () => {
    act(() => root.render(h(PlaylyVideoGrid, { videos: [VIDEO] })));
    expect(container.textContent).not.toContain("DOWNLOAD");
  });

  it("sesudah kartu diklik: kotak + ketiga tombol tergambar", () => {
    act(() => root.render(h(PlaylyVideoGrid, { videos: [VIDEO] })));
    const kartu = container.querySelector("li button") as HTMLButtonElement;
    act(() => kartu.click());

    const teks = container.textContent ?? "";
    expect(teks).toContain("PG-13");
    expect(teks).toContain("WEB-DL");
    expect(teks).toContain("18:08");
    expect(teks).toContain("DOWNLOAD");
    expect(teks).toContain("Bagikan");
    expect(teks).toContain("Simpan");
  });

  it("nama kreator TIDAK lagi digambar di bawah pemutar", () => {
    // Diganti kotak keterangan atas permintaan owner 2026-09-25. Dikunci supaya
    // tidak diam-diam kembali saat komponen ini dirapikan lain waktu.
    act(() => root.render(h(PlaylyVideoGrid, { videos: [VIDEO] })));
    act(() => (container.querySelector("li button") as HTMLButtonElement).click());
    // "coklat" hanya boleh hilang dari AREA PEMUTAR; kartu di bawahnya memang
    // tak pernah memuatnya.
    expect(container.textContent).not.toContain("coklat");
  });

  it("tautan ke drama induk TETAP ada (jalan satu-satunya ke halaman drama)", () => {
    act(() => root.render(h(PlaylyVideoGrid, { videos: [VIDEO] })));
    act(() => (container.querySelector("li button") as HTMLButtonElement).click());
    const tautan = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(tautan).toContain("/drama/drama-a");
  });
});
