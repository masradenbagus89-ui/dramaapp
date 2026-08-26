// Penjaga permanen untuk /api/teaser (dipasang 2026-08-26).
//
// BUG YANG DIJAGA: route ini dulu MENYALURKAN isi video lewat server
// (`new NextResponse(upstream.body)`). Akibatnya tiap byte cuplikan dihitung
// Vercel sebagai "Fast Origin Transfer" — 29,71 GB dari jatah 10 GB terbakar
// dalam ~11 hari dan SELURUH project di-pause, situs mati total.
//
// Kerusakannya SENYAP di mata developer: kodenya jalan sempurna, tesnya hijau,
// situsnya cepat. Yang jebol adalah tagihan — dan itu baru ketahuan setelah
// Vercel mematikan semuanya. Karena itu batas ini dikunci di tes, bukan cuma
// di komentar: siapa pun (termasuk AI sesi berikutnya) yang mengembalikan
// route ini jadi proxy akan langsung melihat tes MERAH.
import { describe, it, expect, beforeEach, vi } from "vitest";

/** Alamat tunnel palsu — bisa diubah per-tes tanpa menyentuh jaringan. */
const state = { base: "https://contoh-tunnel.trycloudflare.com" };

vi.mock("@/lib/video-base", () => ({
  getVideoBaseUrl: async () => state.base,
}));

const { GET } = await import("../app/api/teaser/route");

function minta(query: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return GET(new Request(`http://localhost/api/teaser${query}`) as any);
}

beforeEach(() => {
  state.base = "https://contoh-tunnel.trycloudflare.com";
});

describe("GET /api/teaser — WAJIB menunjuk, bukan menyalurkan", () => {
  it("membalas 307 dengan Location ke berkas di tunnel", async () => {
    const res = await minta("?id=drama-uji&ep=3");
    expect(res.status).toBe(307);
    expect(res.headers.get("Location")).toBe(
      "https://contoh-tunnel.trycloudflare.com/drama-uji/3.mp4",
    );
  });

  it("badan respons KOSONG — nol byte video lewat server", async () => {
    const res = await minta("?id=drama-uji&ep=1");
    expect(await res.text()).toBe("");
  });

  it("ep default 1 kalau tidak disebut", async () => {
    const res = await minta("?id=drama-uji");
    expect(res.headers.get("Location")).toContain("/drama-uji/1.mp4");
  });
});

describe("GET /api/teaser — cache WAJIB pendek", () => {
  // Alamat tunnel berganti tiap PC backup restart (5 kali kambuh, lihat
  // HANDOFF.md). Cache panjang = teaser menunjuk alamat mati berhari-hari.
  it("tidak immutable dan s-maxage tidak lebih dari 5 menit", async () => {
    const res = await minta("?id=drama-uji&ep=1");
    const cc = res.headers.get("Cache-Control") ?? "";
    expect(cc).not.toContain("immutable");
    const sMaxAge = Number(/s-maxage=(\d+)/.exec(cc)?.[1] ?? "0");
    expect(sMaxAge).toBeGreaterThan(0);
    expect(sMaxAge).toBeLessThanOrEqual(300);
  });
});

describe("GET /api/teaser — gagal-AMAN, tak pernah redirect asal", () => {
  it("id dengan path traversal ditolak 400 tanpa Location", async () => {
    const res = await minta("?id=..%2F..%2Fetc%2Fpasswd&ep=1");
    expect(res.status).toBe(400);
    expect(res.headers.get("Location")).toBeNull();
  });

  it("id kosong ditolak 400", async () => {
    const res = await minta("?id=&ep=1");
    expect(res.status).toBe(400);
  });

  it("ep di luar rentang ditolak 400", async () => {
    expect((await minta("?id=drama-uji&ep=0")).status).toBe(400);
    expect((await minta("?id=drama-uji&ep=1000")).status).toBe(400);
    expect((await minta("?id=drama-uji&ep=abc")).status).toBe(400);
  });

  it("alamat tunnel belum di-set → 404, BUKAN redirect ke tempat lain", async () => {
    state.base = "";
    const res = await minta("?id=drama-uji&ep=1");
    expect(res.status).toBe(404);
    expect(res.headers.get("Location")).toBeNull();
  });
});
