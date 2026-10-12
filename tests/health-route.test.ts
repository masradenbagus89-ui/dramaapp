// Penjaga permanen untuk GET /api/health — pintu tanya kesehatan aplikasi.
//
// KENAPA DIJAGA: endpoint ini adalah satu-satunya alat yang bisa membedakan
// "aplikasi tersambung database" dari "aplikasi diam-diam menulis ke berkas di
// dalam container". Tiga alat lain yang ada di project ini semuanya BUTA
// terhadap keadaan itu — kartu status katalog melaporkan "database"
// (lib/dramas.ts `periksaKatalogHidup` memulangkan true saat !useSupabase),
// robot keep-db-awake melaporkan "OK 42 drama", dan /api/dramas memang membalas
// 42 judul dari cadangan. Kalau endpoint ini ikut berbohong, nol alat tersisa.
//
// Empat hal yang dikunci di sini:
//   1. Sehat -> 200. Kalau bukan 200, healthcheck hosting menolak deploy yang
//      sebenarnya baik dan situs tak pernah naik.
//   2. Mode berkas -> 503, BUKAN 200 ber-flag. Healthcheck hosting menilai dari
//      kode status; 200 dengan `ok:false` akan lolos dan itu justru keadaan yang
//      paling ingin kita cegah naik ke produksi.
//   3. 503 wajib membawa `Retry-After` (rak backend §1) supaya pemanggil mundur
//      terjadwal, bukan menyerbu ulang.
//   4. Endpoint TIDAK menyentuh database. Kalau suatu saat ia menanyai Supabase,
//      gangguan Supabase akan membuat hosting me-restart aplikasi yang sehat
//      berulang-ulang (satu permintaan bisa makan 12,3 detik saat bermasalah).
import { describe, it, expect, beforeEach, vi } from "vitest";

/** Muat ulang route dengan nilai `useSupabase` yang ditentukan tes. */
async function muatRoute(useSupabase: boolean) {
  vi.resetModules();
  const sbSelect = vi.fn(async () => []);
  const sbRpc = vi.fn(async () => null);
  vi.doMock("@/lib/supabase", () => ({
    useSupabase,
    eq: (v: string) => `eq.${v}`,
    sbSelect,
    sbUpsert: vi.fn(async () => {}),
    sbDelete: vi.fn(async () => {}),
    sbRpc,
  }));
  const { GET } = await import("../app/api/health/route");
  return { GET, sbSelect, sbRpc };
}

beforeEach(() => {
  vi.resetModules();
});

describe("GET /api/health", () => {
  it("tersambung database: 200 dan menyebut sumberData database", async () => {
    const { GET } = await muatRoute(true);
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      sumberData: "database",
    });
  });

  it("mode berkas: 503 — bukan 200, supaya healthcheck hosting MENOLAKnya", async () => {
    const { GET } = await muatRoute(false);
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.sumberData).toBe("berkas");
    // Pesannya harus menyebut akibat nyatanya, bukan istilah teknis telanjang —
    // yang membacanya saat panik adalah owner, bukan programmer.
    expect(body.pesan).toContain("hilang");
  });

  it("503 membawa Retry-After (rak backend §1)", async () => {
    const { GET } = await muatRoute(false);
    const res = await GET();
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });

  it("jawabannya tak boleh disimpan-dan-dipakai-ulang", async () => {
    const { GET } = await muatRoute(true);
    const res = await GET();
    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });

  it("TIDAK menyentuh database — gangguan Supabase tak boleh memicu restart beruntun", async () => {
    const { GET, sbSelect, sbRpc } = await muatRoute(true);
    await GET();
    expect(sbSelect).not.toHaveBeenCalled();
    expect(sbRpc).not.toHaveBeenCalled();
  });

  it("tak membocorkan alamat atau detail dalam server (rak owasp)", async () => {
    const { GET } = await muatRoute(false);
    const teks = JSON.stringify(await (await GET()).json());
    expect(teks).not.toContain("supabase.co");
    expect(teks).not.toContain("http");
  });
});
