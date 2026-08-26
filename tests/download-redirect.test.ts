// Penjaga permanen untuk /api/download (dipasang 2026-08-26).
//
// SAUDARA KEMBAR dari tests/teaser-redirect.test.ts, bug yang dijaga sama:
// route ini dulu MENYALURKAN isi episode lewat server, jadi satu unduhan 300 MB
// membakar 3% jatah bulanan Vercel sekaligus. Bedanya, jalur ini JARANG dipakai
// (lib/video.ts:21 sudah mengarahkan tombol Unduh langsung ke tunnel) — dan
// justru itu yang membuatnya berbahaya: cadangan yang menyala saat keadaan
// kacau, ketika tak ada yang sedang mengawasi kuota.
//
// Yang dikunci di sini: (1) tetap redirect, bukan proxy; (2) `?dl=1` tidak boleh
// hilang — tanpa itu HP cuma MEMBUKA video, tidak mengunduhnya.
import { describe, it, expect, beforeEach, vi } from "vitest";

const state = { base: "https://contoh-tunnel.trycloudflare.com" };

vi.mock("@/lib/video-base", () => ({
  getVideoBaseUrl: async () => state.base,
}));

const { GET } = await import("../app/api/download/route");

function minta(query: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return GET(new Request(`http://localhost/api/download${query}`) as any);
}

beforeEach(() => {
  state.base = "https://contoh-tunnel.trycloudflare.com";
});

describe("GET /api/download — WAJIB menunjuk, bukan menyalurkan", () => {
  it("membalas 307 ke tunnel, badan respons KOSONG", async () => {
    const res = await minta("?id=drama-uji&ep=2");
    expect(res.status).toBe(307);
    expect(await res.text()).toBe("");
  });

  it("?dl=1 IKUT di alamat tujuan — tanpa ini HP tidak mengunduh", async () => {
    const res = await minta("?id=drama-uji&ep=2");
    expect(res.headers.get("Location")).toBe(
      "https://contoh-tunnel.trycloudflare.com/drama-uji/2.mp4?dl=1",
    );
  });

  it("cache pendek — alamat tunnel berganti tiap PC backup restart", async () => {
    const cc = (await minta("?id=drama-uji&ep=1")).headers.get("Cache-Control") ?? "";
    expect(cc).not.toContain("immutable");
    const sMaxAge = Number(/s-maxage=(\d+)/.exec(cc)?.[1] ?? "0");
    expect(sMaxAge).toBeGreaterThan(0);
    expect(sMaxAge).toBeLessThanOrEqual(300);
  });
});

describe("GET /api/download — gagal-AMAN", () => {
  it("id dengan path traversal ditolak 400 tanpa Location", async () => {
    const res = await minta("?id=..%2F..%2Fetc&ep=1");
    expect(res.status).toBe(400);
    expect(res.headers.get("Location")).toBeNull();
  });

  it("ep tidak masuk akal ditolak 400", async () => {
    expect((await minta("?id=drama-uji&ep=0")).status).toBe(400);
    expect((await minta("?id=drama-uji&ep=1000")).status).toBe(400);
    expect((await minta("?id=drama-uji")).status).toBe(400);
  });

  it("tanpa alamat tunnel & tanpa berkas lokal → 502, BUKAN redirect asal", async () => {
    state.base = "";
    const res = await minta("?id=drama-yang-tidak-ada&ep=1");
    expect(res.status).toBe(502);
    expect(res.headers.get("Location")).toBeNull();
  });
});
