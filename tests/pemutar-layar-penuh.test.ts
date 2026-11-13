// @vitest-environment jsdom
//
// Penjaga TOMBOL LAYAR PENUH di baris durasi pemutar feed.
//
// Asalnya branch rekan `feat/link-unduhan-provider-kualitas` (`bde27ee`).
// Branch itu TIDAK ditarik utuh — di dalamnya ada desain volume versi lama
// yang akan membatalkan kapsul geser + "Eps" di baris bawah + rail 36px yang
// sudah tayang. Atas keputusan owner 2026-11-13 yang diambil hanya IDE tombol
// ini, dibangun ulang di atas `main` terbaru supaya nol bentrok.
//
// Yang dijaga di sini rusak SENYAP, tak satu pun memunculkan error:
//   A. tombol tanpa `pointer-events-auto` TERLIHAT NORMAL tapi tidak bisa
//      diklik — panel bawah pemutar `pointer-events-none` permanen;
//   B. ikon yang tidak ikut berubah saat sudah layar penuh membuat penonton
//      tidak punya petunjuk cara keluar;
//   C. tombol yang menyelinap ke pemanggil TANPA prop `fullscreen` akan
//      memanggil fungsi yang tidak ada.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import PlayerControls from "../app/components/player/PlayerControls";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let diketuk = 0;

const dasar = {
  title: "Napi Baru, Jurus Master Menggemparkan Dunia",
  currentEp: 3,
  episodes: 52,
  cueText: "",
  lockedActive: false,
  controlsVisible: true,
  curTime: 19,
  dur: 122,
  seekBarRef: { current: null },
  onSeekDown: () => {},
  onSeekMove: () => {},
  onSeekUp: () => {},
  onOpenEpisodes: () => {},
  sound: { volume: 1, muted: false, onChange: () => {} },
};

function pasang(ubah: Record<string, unknown> = {}) {
  act(() => {
    root.render(
      createElement(PlayerControls, {
        ...dasar,
        fullscreen: { active: false, onToggle: () => diketuk++ },
        ...ubah,
      } as Parameters<typeof PlayerControls>[0]),
    );
  });
}

function cari(sel: string): HTMLElement {
  const el = container.querySelector(sel);
  if (!el) throw new Error(`tidak ada di layar: ${sel}`);
  return el as HTMLElement;
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  diketuk = 0;
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("tombol Layar penuh di baris durasi", () => {
  it("duduk di baris yang SAMA dengan angka durasi, SESUDAH tombol volume", () => {
    // Urutannya bagian dari keputusan owner: garis geser → durasi → volume →
    // layar penuh. Kalau layar penuh menyelip sebelum volume, kapsul volume
    // yang membuka ke atas tidak lagi menempel di tepi kanan layar.
    pasang();
    const baris = cari(".mb-2.flex.items-center");
    expect(baris.textContent, "angka durasi tidak di baris ini").toContain("0:19");

    const html = baris.innerHTML;
    const volume = html.indexOf('aria-label="Volume"');
    const penuh = html.indexOf('aria-label="Layar penuh"');
    expect(volume, "tombol volume hilang dari baris durasi").toBeGreaterThan(-1);
    expect(penuh, "tombol layar penuh tidak ada di baris durasi").toBeGreaterThan(-1);
    expect(penuh, "layar penuh mendahului volume — urutannya tertukar").toBeGreaterThan(volume);
  });

  it("🪤 bisa diklik — panel bawah pemutar pointer-events-none permanen", () => {
    // Tanpa `pointer-events-auto` tombolnya terlihat normal tapi ketukan
    // menembus ke video di belakangnya. Nol error; gejalanya cuma "kok tidak
    // ngapa-ngapain".
    pasang();
    expect(cari('[aria-label="Layar penuh"]').className).toContain(
      "pointer-events-auto",
    );
  });

  it("diketuk → memanggil onToggle pemutar", () => {
    pasang();
    act(() => {
      cari('[aria-label="Layar penuh"]').dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });
    expect(diketuk, "ketukan tidak sampai ke pemutar").toBe(1);
  });

  it("sudah layar penuh → labelnya berubah jadi jalan KELUAR", () => {
    // Satu-satunya petunjuk cara keluar. Di HP tombol "kembali" sistem memang
    // bisa dipakai, tapi di laptop penonton hanya punya tombol ini.
    pasang({ fullscreen: { active: true, onToggle: () => diketuk++ } });
    expect(container.querySelector('[aria-label="Layar penuh"]')).toBeNull();
    expect(cari('[aria-label="Keluar layar penuh"]')).toBeTruthy();
  });

  it("ukurannya sama dengan tombol volume di sebelahnya", () => {
    // Dua tombol bersebelahan dengan tinggi berbeda membuat seluruh baris
    // terlihat miring sebelah.
    pasang();
    expect(cari('[aria-label="Layar penuh"]').className).toContain("h-9");
    expect(cari('[aria-label="Volume"]').className).toContain("h-9");
  });

  it("🪤 ikonnya SERAGAM dengan pemutar film: panah diagonal, bukan kurung sudut", () => {
    // Owner 2026-11-13: "untuk layar diperbesar kamu seragamkan jadi seperti
    // yang di film berbentuk panah". Pemutar film (PlaylyPlayer) memakai
    // Maximize2/Minimize2 — panah diagonal. Dua ikon berbeda untuk satu
    // fungsi yang sama membuat penonton mengira keduanya berbeda guna, dan
    // tidak ada error apa pun yang menandainya.
    pasang();
    const masuk = cari('[aria-label="Layar penuh"]').querySelector("svg");
    expect(masuk?.getAttribute("class") ?? "").toContain("maximize-2");

    pasang({ fullscreen: { active: true, onToggle: () => diketuk++ } });
    const keluar = cari('[aria-label="Keluar layar penuh"]').querySelector("svg");
    expect(keluar?.getAttribute("class") ?? "").toContain("minimize-2");
  });

  it("tanpa prop fullscreen → tanpa tombol (pemanggil lama aman)", () => {
    act(() => {
      root.render(
        createElement(PlayerControls, dasar as Parameters<typeof PlayerControls>[0]),
      );
    });
    expect(container.querySelector('[aria-label="Layar penuh"]')).toBeNull();
    expect(container.querySelector('[aria-label="Keluar layar penuh"]')).toBeNull();
  });
});
