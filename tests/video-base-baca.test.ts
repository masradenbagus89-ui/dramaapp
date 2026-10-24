// Penjaga permanen: alamat sumber video dari DATABASE wajib divalidasi saat
// DIBACA, bukan cuma saat ditulis (dipasang 2026-10-24).
//
// BUG YANG DIJAGA — temuan audit 2026-10-24. Allowlist host hanya dipasang di
// jalur tulis (app/api/agent/video-base/route.ts:136), sementara
// `getVideoBaseUrl` memakai nilai dari database APA ADANYA. Jadi baris yang
// pernah terisi lewat jalur lain — SQL langsung, migrasi, dashboard Supabase,
// atau sebelum allowlist dipasang — dipakai tanpa diperiksa.
//
// Kenapa itu serius: `/api/admin/hardlink` MENGIRIM `HARDLINK_AGENT_SECRET` ke
// host ini. Satu nilai jahat di database = rahasia itu dikirim ke server
// penyerang, dan seluruh penonton diarahkan ke sana.
//
// Tes ini menjaga DUA arah sekaligus, dan arah kedua sama pentingnya:
// jangan sampai pengetatan ini MEMATIKAN alamat yang sah — termasuk yang sah
// hanya karena ditambahkan lewat env `VIDEO_BASE_ALLOWED_SUFFIXES`.
import { describe, it, expect, beforeEach, vi } from "vitest";

const state = { rec: null as { url: string } | null, meledak: false };

vi.mock("../lib/store", () => ({
  getVideoBaseRecord: async () => {
    if (state.meledak) throw new Error("database mati");
    return state.rec;
  },
}));

const { getVideoBaseUrl } = await import("../lib/video-base");

const ENV_SAH = "https://cadangan-dari-env.trycloudflare.com";

beforeEach(() => {
  state.rec = null;
  state.meledak = false;
  process.env.NEXT_PUBLIC_VIDEO_BASE_URL = ENV_SAH;
  delete process.env.VIDEO_BASE_ALLOWED_SUFFIXES;
});

describe("getVideoBaseUrl — nilai database yang SAH tetap dipakai", () => {
  it("quick tunnel cloudflare dari database dipakai", async () => {
    state.rec = { url: "https://abc-def.trycloudflare.com" };
    expect(await getVideoBaseUrl()).toBe("https://abc-def.trycloudflare.com");
  });

  it("garis miring di akhir dibersihkan, bukan ditolak", async () => {
    state.rec = { url: "https://abc-def.trycloudflare.com/" };
    expect(await getVideoBaseUrl()).toBe("https://abc-def.trycloudflare.com");
  });

  it("host yang sah lewat VIDEO_BASE_ALLOWED_SUFFIXES TIDAK ikut diblokir", async () => {
    // Pemeriksaan paling penting di arah "jangan merusak": daftar suffix di
    // jalur baca HARUS sama dengan jalur tulis. Kalau di sini dipakai daftar
    // bawaan saja, alamat yang sengaja diizinkan owner lewat env akan ditolak
    // dan video mati tanpa sebab yang terlihat.
    process.env.VIDEO_BASE_ALLOWED_SUFFIXES = "video.contoh-baru.com";
    state.rec = { url: "https://pc1.video.contoh-baru.com" };
    expect(await getVideoBaseUrl()).toBe("https://pc1.video.contoh-baru.com");
  });
});

describe("getVideoBaseUrl — nilai database yang TIDAK SAH diabaikan", () => {
  it("host asing diabaikan, jatuh ke env", async () => {
    state.rec = { url: "https://situs-jahat.example" };
    expect(await getVideoBaseUrl()).toBe(ENV_SAH);
  });

  it("http polos diabaikan", async () => {
    state.rec = { url: "http://abc-def.trycloudflare.com" };
    expect(await getVideoBaseUrl()).toBe(ENV_SAH);
  });

  it("alamat berpath diabaikan (base URL wajib origin telanjang)", async () => {
    state.rec = { url: "https://abc-def.trycloudflare.com/jahat" };
    expect(await getVideoBaseUrl()).toBe(ENV_SAH);
  });

  it("user:password@ diabaikan (bentuk penyamaran host)", async () => {
    state.rec = { url: "https://admin:x@abc.trycloudflare.com" };
    expect(await getVideoBaseUrl()).toBe(ENV_SAH);
  });

  it("host menyamar mirip diabaikan", async () => {
    state.rec = { url: "https://evil-trycloudflare.com" };
    expect(await getVideoBaseUrl()).toBe(ENV_SAH);
  });

  it("api.trycloudflare.com diabaikan — itu endpoint API, bukan tunnel", async () => {
    state.rec = { url: "https://api.trycloudflare.com" };
    expect(await getVideoBaseUrl()).toBe(ENV_SAH);
  });
});

describe("getVideoBaseUrl — perilaku lama yang TIDAK boleh berubah", () => {
  it("database mati tetap jatuh ke env, bukan mematikan video", async () => {
    state.meledak = true;
    expect(await getVideoBaseUrl()).toBe(ENV_SAH);
  });

  it("belum ada baris di database → pakai env", async () => {
    state.rec = null;
    expect(await getVideoBaseUrl()).toBe(ENV_SAH);
  });

  it("database jahat DAN env kosong → string kosong, bukan alamat jahat", async () => {
    // Pemanggil memperlakukan string kosong sebagai "sumber belum di-set" dan
    // membalas 404 (app/api/teaser/route.ts:53). Lebih baik video tak tampil
    // daripada penonton diarahkan ke server penyerang.
    process.env.NEXT_PUBLIC_VIDEO_BASE_URL = "";
    state.rec = { url: "https://situs-jahat.example" };
    expect(await getVideoBaseUrl()).toBe("");
  });
});
