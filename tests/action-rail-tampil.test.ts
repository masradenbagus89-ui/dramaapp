// Penjaga rail kanan pemutar drama: memudar saat video berputar (kontrol
// tersembunyi). Kalau `visible` lepas, rail menutupi film terus-menerus; kalau
// pointer-events tak ikut mati, rail yang tak terlihat masih menelan ketukan
// penonton — dua-duanya senyap.
// Volume + Layar penuh pindah ke panel bawah (PlayerControls) 2026-11-12:
// rail kanan sengaja TIDAK lagi punya tombol Volume.
import { describe, it, expect } from "vitest";
import { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const { default: ActionRail } = await import("../app/components/ActionRail");
const { default: PlayerControls } = await import("../app/components/player/PlayerControls");

const sound = { volume: 0.5, muted: false, onChange: () => {} };

describe("ActionRail — sembunyi saat diputar", () => {
  it("visible=false → transparan DAN tembus ketukan", () => {
    const html = renderToStaticMarkup(
      createElement(ActionRail, { dramaId: "d1", title: "Uji", visible: false }),
    );
    expect(html).toContain("opacity-0");
    expect(html).toContain("pointer-events-none");
  });

  it("default (tanpa prop visible) tetap tampil, tanpa tombol Volume", () => {
    const html = renderToStaticMarkup(createElement(ActionRail, { dramaId: "d1", title: "Uji" }));
    expect(html).toContain("opacity-100");
    expect(html).not.toContain('aria-label="Volume"');
  });
});

describe("PlayerControls — Volume + Layar penuh di atas timer", () => {
  const props = {
    title: "Uji",
    currentEp: 1,
    episodes: 10,
    cueText: "",
    lockedActive: false,
    controlsVisible: true,
    curTime: 3,
    dur: 120,
    seekBarRef: createRef<HTMLDivElement>(),
    onSeekDown: () => {},
    onSeekMove: () => {},
    onSeekUp: () => {},
    onOpenEpisodes: () => {},
    sound,
    isFullscreen: false,
    onToggleFullscreen: () => {},
  };

  it("Volume di kiri, Layar penuh di kanan, keduanya sebelum bar posisi", () => {
    const html = renderToStaticMarkup(createElement(PlayerControls, props));
    const vol = html.indexOf('aria-label="Volume"');
    const fs = html.indexOf('aria-label="Layar penuh"');
    const bar = html.indexOf('aria-label="Posisi video"');
    expect(vol).toBeGreaterThan(-1);
    expect(fs).toBeGreaterThan(vol);
    expect(bar).toBeGreaterThan(fs);
  });

  it("sedang layar penuh → label tombol berganti 'Keluar layar penuh'", () => {
    const html = renderToStaticMarkup(
      createElement(PlayerControls, { ...props, isFullscreen: true }),
    );
    expect(html).toContain('aria-label="Keluar layar penuh"');
  });
});
