// Penjaga jalur SIMPAN tahun & durasi manual (/api/admin/playly/meta).
//
// Endpoint ini MENULIS ke katalog produksi, dan nilainya tergambar di pojok
// poster yang dilihat penonton. Kerusakannya senyap: angka ngawur tidak
// melempar error — ia cuma tayang.
//
// Database & sesi admin dipalsukan (vi.mock) — tes ini tidak menyentuh
// Supabase maupun berkas apa pun. Pola mengikuti tests/admin-durasi-route.test.ts.
import { describe, it, expect, beforeEach, vi } from "vitest";

type Meta = { tahun?: string; durasiDetik?: number };
let tersimpan: Record<string, Meta> = {};

vi.mock("@/lib/session", () => ({
  isAdminRequest: async () => true,
  getAdminEmail: async () => "admin@contoh.test",
}));

vi.mock("@/lib/request-guard", () => ({
  guardMutation: () => null,
}));

vi.mock("@/lib/store", () => ({
  getPlaylyMetaManual: async () => tersimpan,
  setPlaylyVideoMetaManual: async (
    videoId: string,
    meta: { tahun?: string | null; durasiDetik?: number | null },
  ) => {
    const entri: Meta = { ...(tersimpan[videoId] ?? {}) };
    if (meta.tahun !== undefined) {
      if (meta.tahun) entri.tahun = meta.tahun;
      else delete entri.tahun;
    }
    if (meta.durasiDetik !== undefined) {
      if (meta.durasiDetik) entri.durasiDetik = meta.durasiDetik;
      else delete entri.durasiDetik;
    }
    tersimpan = { ...tersimpan };
    if (entri.tahun || entri.durasiDetik) tersimpan[videoId] = entri;
    else delete tersimpan[videoId];
    return tersimpan;
  },
}));

const { POST } = await import("../app/api/admin/playly/meta/route");

function kirim(body: unknown) {
  return POST(
    new Request("http://localhost/api/admin/playly/meta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any,
  );
}

beforeEach(() => {
  tersimpan = {};
});

describe("POST /api/admin/playly/meta", () => {
  it("menyimpan tahun & durasi bersamaan", async () => {
    const res = await kirim({ videoId: "v1", tahun: "2024", durasi: "2.25" });
    expect(res.status).toBe(200);
    expect(tersimpan["v1"]).toEqual({ tahun: "2024", durasiDetik: 145 });
  });

  it("field yang TIDAK dikirim tidak tersentuh", async () => {
    // 🪤 Pagar terpenting di sini. Panel admin mengirim field yang diubah
    // saja; tanpa pembedaan `undefined` vs `null`, membetulkan durasi akan
    // ikut MENGHAPUS tahun yang sudah benar — nol error, dan baru ketahuan
    // saat posternya kehilangan tahun.
    await kirim({ videoId: "v1", tahun: "2024", durasi: "2.25" });
    await kirim({ videoId: "v1", durasi: "3.00" });

    expect(tersimpan["v1"]).toEqual({ tahun: "2024", durasiDetik: 180 });
  });

  it("dikirim KOSONG = hapus, kembali ikut sumber otomatis", async () => {
    await kirim({ videoId: "v1", tahun: "2024", durasi: "2.25" });
    await kirim({ videoId: "v1", tahun: "" });

    expect(tersimpan["v1"]).toEqual({ durasiDetik: 145 });
  });

  it("entri yang habis DIHAPUS seluruhnya, bukan ditinggal objek kosong", async () => {
    // `{}` yang tertinggal terbaca sebagai "sudah dikoreksi jadi tanpa
    // apa-apa" oleh pembaca berikutnya, dan membuat peta menumpuk sampah.
    await kirim({ videoId: "v1", tahun: "2024" });
    await kirim({ videoId: "v1", tahun: "" });

    expect(tersimpan["v1"]).toBeUndefined();
  });

  it("nilai ngawur TIDAK tersimpan — disaring di server, bukan cuma di layar", async () => {
    // UI bukan pagar: siapa pun yang memegang sesi admin bisa mengirim body
    // apa saja. Tahun karangan yang lolos akan tergambar di poster.
    const res = await kirim({ videoId: "v1", tahun: "2024abc", durasi: "panjang" });
    expect(res.status).toBe(200); // bukan penolakan — artinya "kembali ke IMDb"
    expect(tersimpan["v1"]).toBeUndefined();
  });

  it("menolak body tanpa videoId", async () => {
    const res = await kirim({ tahun: "2024" });
    expect(res.status).toBe(400);
    expect(Object.keys(tersimpan)).toHaveLength(0);
  });

  it("menolak body yang bukan JSON", async () => {
    const res = await POST(
      new Request("http://localhost/api/admin/playly/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{bukan json",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
    );
    expect(res.status).toBe(400);
  });

  it("memulangkan peta TERBARU supaya layar tak perlu memanggil GET lagi", async () => {
    const res = await kirim({ videoId: "v1", tahun: "2024" });
    const body = (await res.json()) as { meta?: Record<string, Meta> };
    expect(body.meta?.["v1"]).toEqual({ tahun: "2024" });
  });

  it("bentuk durasi dari IMDb ikut diterima", async () => {
    // Admin sering menyalin "95 min" langsung dari halaman IMDb.
    await kirim({ videoId: "v1", durasi: "95 min" });
    expect(tersimpan["v1"]).toEqual({ durasiDetik: 95 * 60 });
  });
});
