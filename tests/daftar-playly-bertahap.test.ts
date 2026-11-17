// @vitest-environment jsdom
//
// Penjaga: daftar video Playly di admin menggambar halaman PERTAMA sebelum
// halaman berikutnya selesai. Owner 2026-11-17: loading lama, layar kosong.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createElement as h, act } from "react";
import { createRoot, type Root } from "react-dom/client";

vi.setConfig({ testTimeout: 20_000, hookTimeout: 20_000 });

import PlaylyVideoPicker from "../app/components/admin/PlaylyVideoPicker";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const video = (id: string, title: string) => ({
  id,
  title,
  durationSeconds: 90,
  durationLabel: "1:30",
  creator: "dramaku",
  embedUrl: "https://playly.example/embed",
  thumbnail: null,
});

const PERTAMA = video("a1", "Film Halaman Pertama");
const KEDUA = video("b2", "Film Halaman Berikutnya");

let lepasHalamanDua: (() => void) | null = null;
let halamanDua: Promise<void> = Promise.resolve();

function balas(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function pasangFetch() {
  halamanDua = new Promise<void>((selesai) => {
    lepasHalamanDua = selesai;
  });
  vi.stubGlobal("fetch", async (url: string) => {
    const offset = new URL(url, "http://lokal").searchParams.get("offset");
    if (offset === "0") {
      return balas({
        ok: true,
        videos: [PERTAMA],
        source: "mitra",
        note: null,
        offsetBerikutnya: 100,
      });
    }
    await halamanDua;
    return balas({
      ok: true,
      videos: [KEDUA],
      source: "mitra",
      note: null,
      offsetBerikutnya: null,
    });
  });
}

let wadah: HTMLDivElement | null = null;
let akar: Root | null = null;

async function pasang() {
  wadah = document.createElement("div");
  document.body.appendChild(wadah);
  akar = createRoot(wadah);
  await act(async () => {
    akar!.render(h(PlaylyVideoPicker, { dramas: [], initialEmbeds: [] }));
  });
  return wadah;
}

beforeEach(() => {
  pasangFetch();
});

afterEach(async () => {
  lepasHalamanDua?.();
  if (akar) await act(async () => akar!.unmount());
  wadah?.remove();
  vi.unstubAllGlobals();
});

async function tungguTeks(el: HTMLElement, teks: string) {
  const batas = Date.now() + 8_000;
  while (!el.textContent?.includes(teks)) {
    if (Date.now() > batas) throw new Error(`tidak menemukan “${teks}”`);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
  }
}

describe("daftar Playly tampil bertahap", () => {
  it("menampilkan film halaman pertama selagi halaman berikutnya belum jawab", async () => {
    const el = await pasang();
    await tungguTeks(el, PERTAMA.title);

    expect(el.textContent).not.toContain(KEDUA.title);
    expect(el.textContent).toContain("Sisanya menyusul");
  });

  it("menyambung film berikutnya setelah jawabannya tiba", async () => {
    const el = await pasang();
    await tungguTeks(el, PERTAMA.title);
    lepasHalamanDua?.();

    await tungguTeks(el, KEDUA.title);

    expect(el.textContent).toContain(PERTAMA.title);
    expect(el.textContent).not.toContain("Sisanya menyusul");
  });
});
