// Tes pengunci untuk kartu status Playly di admin (lib/playly-status.ts).
// Fokus: admin harus bisa MEMBEDAKAN "belum dipasang" dari "rusak" — kalau
// pembedaan ini hilang, kartunya kehilangan seluruh gunanya.
import { describe, it, expect } from "vitest";
import { ringkasStatusPlayly } from "../lib/playly-status";

describe("ringkasStatusPlayly", () => {
  it("503 = belum diatur, bukan gagal", () => {
    const r = ringkasStatusPlayly(503, {
      error: "DASHBOARD_API_URL belum di-set.",
    });
    expect(r.status).toBe("belum-diatur");
    expect(r.pesan).toContain("DASHBOARD_API_URL");
  });

  it("502 (kunci ditolak / dashboard mati) = gagal, pesan aslinya dipertahankan", () => {
    const r = ringkasStatusPlayly(502, {
      error: "Dashboard menolak kunci kita (HTTP 401).",
    });
    expect(r.status).toBe("gagal");
    expect(r.pesan).toContain("menolak kunci");
  });

  it("200 + ada video = tersambung dengan jumlahnya", () => {
    const r = ringkasStatusPlayly(200, { ok: true, count: 5, skipped: 2 });
    expect(r).toMatchObject({
      status: "tersambung",
      jumlahVideo: 5,
      dilewati: 2,
    });
  });

  it("200 + dashboard kosong = tetap tersambung, dijelaskan apa adanya", () => {
    const r = ringkasStatusPlayly(200, { ok: true, count: 0 });
    expect(r.status).toBe("tersambung");
    expect(r.jumlahVideo).toBe(0);
    expect(r.pesan).toContain("belum berisi video");
  });

  // Gagal-AMAN: kondisi aneh TIDAK boleh menghasilkan "tersambung".
  it.each([
    ["body kosong", 200, null],
    ["ok:false walau HTTP 200", 200, { ok: false }],
    ["server kita sendiri tak terjangkau (status 0)", 0, null],
    ["500 tanpa pesan", 500, null],
  ])("%s -> gagal, bukan tersambung", (_nama, status, body) => {
    expect(ringkasStatusPlayly(status as number, body as never).status).toBe(
      "gagal",
    );
  });

  it("angka ngawur dari luar tidak bocor ke tampilan", () => {
    const r = ringkasStatusPlayly(200, {
      ok: true,
      count: -3,
      skipped: Number.NaN,
    });
    expect(r.jumlahVideo).toBe(0);
    expect(r.dilewati).toBe(0);
  });
});
