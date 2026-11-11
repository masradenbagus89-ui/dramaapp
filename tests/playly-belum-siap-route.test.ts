// Penjaga GERBANG AKSES endpoint /api/admin/playly/belum-siap — owner 2026-11-11.
//
// 🪤 KENAPA TES INI ADA. Endpoint ini BARU, dan satu permintaan ke sini bisa
// memicu ratusan panggilan ke server Playly. Dua kerusakan yang mungkin,
// keduanya SENYAP (halaman admin tetap tampil normal):
//   1. Gerbang admin lupa dipasang / terbalik → siapa pun bisa menyuruh server
//      kita membanjiri Playly, dan ikut tahu id video kita.
//   2. Validasi isi dilonggarkan → id berbentuk aneh ikut dirangkai jadi alamat.
//
// Sesi admin & pemeriksa berkas dipalsukan (vi.mock) — tes ini nol menyentuh
// jaringan maupun database. Pola mengikuti tests/admin-playly-meta-route.test.ts.
import { describe, it, expect, beforeEach, vi } from "vitest";

let admin = true;
let idYangDiperiksa: string[] = [];

vi.mock("@/lib/session", () => ({
  isAdminRequest: async () => admin,
  getAdminEmail: async () => (admin ? "admin@contoh.test" : null),
}));

vi.mock("@/lib/request-guard", () => ({
  guardMutation: () => null,
}));

vi.mock("@/lib/playly-berkas-siap", () => ({
  idVideoBelumSiap: async (ids: string[]) => {
    idYangDiperiksa = ids;
    return { ids: ids.filter((id) => id.startsWith("rusak")), diperiksa: ids.length };
  },
}));

const { POST } = await import("../app/api/admin/playly/belum-siap/route");

function kirim(body: unknown, mentah?: string) {
  return POST(
    new Request("http://localhost/api/admin/playly/belum-siap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: mentah ?? JSON.stringify(body),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any,
  );
}

beforeEach(() => {
  admin = true;
  idYangDiperiksa = [];
});

describe("gerbang akses /api/admin/playly/belum-siap", () => {
  it("BUKAN admin → 401, dan Playly tidak disentuh sama sekali", async () => {
    admin = false;

    const res = await kirim({ ids: ["v1", "v2"] });

    expect(res.status).toBe(401);
    // Bukan cuma status: pekerjaannya pun tidak boleh terlanjur jalan.
    expect(idYangDiperiksa).toEqual([]);
  });

  it("admin → 200 + daftar video yang belum siap", async () => {
    const res = await kirim({ ids: ["v1", "rusak-9"] });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ ok: true, ids: ["rusak-9"], diperiksa: 2 });
  });

  it("jumlah yang BENAR-BENAR ditanyakan ikut dilaporkan", async () => {
    // `diperiksa` adalah satu-satunya cara membuktikan dari luar bahwa
    // ingatannya bekerja. Kalau field ini hilang, penghematannya jadi klaim.
    const res = await kirim({ ids: ["v1"] });
    const data = await res.json();

    expect(data).toHaveProperty("diperiksa");
  });
});

describe("validasi isi permintaan", () => {
  it("JSON rusak → 400, bukan 500", async () => {
    const res = await kirim(null, "{bukan json");
    expect(res.status).toBe(400);
  });

  it("`ids` bukan daftar → 400", async () => {
    const res = await kirim({ ids: "v1" });
    expect(res.status).toBe(400);
  });

  it("id berbentuk aneh DIBUANG, sisanya tetap diperiksa", async () => {
    // Satu id aneh tidak boleh mematikan penanda untuk video lain —
    // tapi juga tidak boleh ikut dirangkai jadi alamat ke Playly.
    const res = await kirim({
      ids: ["v1", "../../etc/passwd", "rusak-2", "a b c", 123, null, "x".repeat(200)],
    });

    expect(res.status).toBe(200);
    expect(idYangDiperiksa).toEqual(["v1", "rusak-2"]);
  });

  it("lebih dari 1000 id → 400, tidak dikerjakan", async () => {
    const res = await kirim({ ids: Array.from({ length: 1001 }, (_, i) => `v${i}`) });

    expect(res.status).toBe(400);
    expect(idYangDiperiksa).toEqual([]);
  });
});
