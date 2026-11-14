// Penjaga pembuangan cache halaman publik (2026-11-14).
//
// Yang dikunci:
//  1. segarkanCachePublik membuang cache SELURUH situs ("/", "layout") dan
//     GAGAL-TERBUKA: kalau pembuangan melempar, penyimpanan admin tidak ikut
//     dianggap gagal (data sudah tersimpan; batas revalidate yang menyegarkan).
//  2. Tombol manual /api/admin/cache hanya untuk admin dari domain sendiri —
//     tiap panggilan memaksa seluruh halaman dibangun ulang.
//  3. Simpan lewat panel admin benar-benar memicu pembuangan (contoh: durasi).
//     Kalau baris itu hilang, admin kembali melihat data lama 1-5 menit tanpa
//     ada error apa pun.
//
// `next/cache` & sesi admin dipalsukan — tes tidak butuh server Next.js.
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Drama } from "../lib/types";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath }));

let admin: string | null = "admin@contoh.test";
vi.mock("@/lib/session", () => ({
  getAdminEmail: async () => admin,
  isAdminRequest: async () => admin !== null,
}));

const drama = { id: "drama-uji", title: "Drama Uji", runtime: "119 min" } as Drama;
vi.mock("@/lib/dramas", async () => ({
  ...(await vi.importActual<typeof import("../lib/dramas")>("../lib/dramas")),
  getDrama: async (id: string) => (id === drama.id ? drama : undefined),
  upsertDrama: async () => {},
}));

const { segarkanCachePublik } = await import("../lib/cache-publik");
const { POST: tombolCache } = await import("../app/api/admin/cache/route");
const { POST: simpanDurasi } = await import("../app/api/admin/durasi/route");

/** Permintaan dari domain sendiri. IP dibedakan per tes supaya pembatas laju tak saling memengaruhi. */
function permintaan(url: string, opts: { origin?: string; ip: string; body?: unknown }) {
  return new Request(url, {
    method: "POST",
    headers: {
      host: "localhost",
      origin: opts.origin ?? "http://localhost",
      "x-forwarded-for": opts.ip,
      "Content-Type": "application/json",
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}

beforeEach(() => {
  revalidatePath.mockReset();
  admin = "admin@contoh.test";
});

describe("segarkanCachePublik", () => {
  it("membuang cache seluruh halaman di bawah layout akar", () => {
    expect(segarkanCachePublik()).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("gagal-terbuka: error pembuangan tidak dilempar ke pemanggil", () => {
    revalidatePath.mockImplementation(() => {
      throw new Error("Invariant: static generation store missing");
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(segarkanCachePublik()).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("POST /api/admin/cache — tombol Segarkan cache", () => {
  it("admin dari domain sendiri -> 200 dan cache dibuang", async () => {
    const res = await tombolCache(permintaan("http://localhost/api/admin/cache", { ip: "10.0.0.1" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });

  it("bukan admin -> 401 dan cache TIDAK disentuh", async () => {
    admin = null;
    const res = await tombolCache(permintaan("http://localhost/api/admin/cache", { ip: "10.0.0.2" }));
    expect(res.status).toBe(401);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("dari situs lain (CSRF) -> 403 walau cookie admin ikut terkirim", async () => {
    const res = await tombolCache(
      permintaan("http://localhost/api/admin/cache", { ip: "10.0.0.3", origin: "https://jahat.test" }),
    );
    expect(res.status).toBe(403);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("pembuangan gagal -> 500 dengan pesan, bukan 200 palsu", async () => {
    revalidatePath.mockImplementation(() => {
      throw new Error("rusak");
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await tombolCache(permintaan("http://localhost/api/admin/cache", { ip: "10.0.0.4" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBeTruthy();
    warn.mockRestore();
  });
});

describe("simpan di panel admin memicu pembuangan cache", () => {
  it("POST /api/admin/durasi sukses -> cache dibuang", async () => {
    const res = await simpanDurasi(
      permintaan("http://localhost/api/admin/durasi", {
        ip: "10.0.0.5",
        body: { id: drama.id, runtime: "1.47" },
      }),
    );
    expect(res.status).toBe(200);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("POST /api/admin/durasi gagal (drama tak ada) -> cache TIDAK dibuang", async () => {
    const res = await simpanDurasi(
      permintaan("http://localhost/api/admin/durasi", {
        ip: "10.0.0.6",
        body: { id: "tidak-ada", runtime: "1.47" },
      }),
    );
    expect(res.status).not.toBe(200);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
