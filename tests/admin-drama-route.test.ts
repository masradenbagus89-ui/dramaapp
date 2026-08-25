// Penjaga jalur SIMPAN drama di /api/admin/drama untuk fitur Film (2026-08-25).
//
// Kenapa perlu tes terpisah dari tests/drama-kind.test.ts: yang diuji di sini
// bukan aturannya, tapi APA YANG BENAR-BENAR TERSIMPAN — termasuk kasus yang
// kerusakannya senyap: serial berbayar yang diubah jadi film harus KEHILANGAN
// tanda berbayarnya (kalau tidak, admin mengira film itu menghasilkan koin
// padahal aturan koin tetap menggratiskannya).
//
// Database & sesi admin dipalsukan (vi.mock) — tes ini tidak menyentuh Supabase
// maupun berkas apa pun.
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Drama } from "../lib/types";

const simpanan = new Map<string, Drama>();
/** Drama terakhir yang dikirim ke database oleh route. */
let tersimpan: Drama | null = null;

vi.mock("@/lib/session", () => ({
  isAdminRequest: async () => true,
}));

vi.mock("@/lib/dramas", async () => {
  const asli = await vi.importActual<typeof import("../lib/dramas")>(
    "../lib/dramas",
  );
  return {
    ...asli,
    getDrama: async (id: string) => simpanan.get(id),
    upsertDrama: async (drama: Drama) => {
      tersimpan = drama;
      simpanan.set(drama.id, drama);
    },
    removeDrama: async () => true,
  };
});

const { POST } = await import("../app/api/admin/drama/route");

/** Request POST ber-JSON seperti yang dikirim form admin. */
function kirim(body: Record<string, unknown>) {
  return POST(
    new Request("http://localhost/api/admin/drama", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any,
  );
}

const dasar = { title: "Judul Uji", category: "Romance" };

beforeEach(() => {
  simpanan.clear();
  tersimpan = null;
});

describe("POST /api/admin/drama — menyimpan film", () => {
  it("film baru tersimpan sebagai 1 video, tanpa tanda berbayar", async () => {
    const res = await kirim({
      ...dasar,
      kind: "movie",
      episodes: 40, // dikirim nakal dari luar form
      premium: true,
    });

    expect(res.status).toBe(200);
    expect(tersimpan?.kind).toBe("movie");
    expect(tersimpan?.episodes).toBe(1);
    expect(tersimpan).not.toHaveProperty("premium");
  });

  it("serial berbayar yang diubah jadi film kehilangan tanda berbayarnya", async () => {
    await kirim({ ...dasar, id: "uji", kind: "series", episodes: 20, premium: true });
    expect(tersimpan?.premium).toBe(true);

    await kirim({ ...dasar, id: "uji", kind: "movie", premium: true });
    expect(tersimpan?.kind).toBe("movie");
    expect(tersimpan?.episodes).toBe(1);
    expect(tersimpan).not.toHaveProperty("premium");
  });

  it("film yang diubah kembali jadi serial melepas tanda film", async () => {
    await kirim({ ...dasar, id: "uji", kind: "movie" });
    await kirim({ ...dasar, id: "uji", kind: "series", episodes: 8 });

    expect(tersimpan).not.toHaveProperty("kind");
    expect(tersimpan?.episodes).toBe(8);
  });
});

describe("POST /api/admin/drama — serial tidak berubah perilakunya", () => {
  it("serial tanpa jumlah episode yang sah ditolak", async () => {
    const res = await kirim({ ...dasar, kind: "series", episodes: 0 });
    expect(res.status).toBe(400);
    expect(tersimpan).toBeNull();
  });

  it("body lama tanpa field kind tetap tersimpan sebagai serial", async () => {
    const res = await kirim({ ...dasar, episodes: 12, premium: true });

    expect(res.status).toBe(200);
    expect(tersimpan).not.toHaveProperty("kind");
    expect(tersimpan?.episodes).toBe(12);
    expect(tersimpan?.premium).toBe(true);
  });
});
