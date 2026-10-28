// Penjaga permanen: /api/teaser & /api/download WAJIB menolak episode berbayar
// milik orang yang tak berhak (dipasang 2026-10-24).
//
// Saudara dari tests/paywall-guard.test.ts: di sana aturannya yang diuji, di
// sini KABELNYA — bahwa kedua route benar-benar memanggil gerbang itu, memakai
// kode status yang benar, dan yang paling penting: TIDAK menyertakan header
// `Location`. Lubang aslinya bukan "status salah", tapi "alamat .mp4 ikut
// diserahkan". Satu `return` yang lupa dipindahkan sudah cukup untuk
// membocorkannya lagi tanpa satu pun tes lain berubah warna.
import { describe, it, expect, beforeEach, vi } from "vitest";
// Tes ini menguji perilaku SAAT KOIN/IKLAN MENYALA, dan sejak 2026-10-28
// saklarnya DIJEDA di lib/saklar-fitur.ts (keputusan owner). Saklarnya dipaku
// MENYALA di sini dengan sengaja: perilaku paywall/iklan harus tetap terbukti
// hijau selama dijeda, kalau tidak jalur "nyalakan kembali" berangkat tanpa
// satu pun penjaga. Keadaan JEDA-nya diuji terpisah di tests/jeda-koin-iklan.test.ts.
vi.mock("@/lib/saklar-fitur", () => ({
  PAYWALL_ENABLED: true,
  ADS_ENABLED: true,
}));
import { FREE_EPISODES } from "../lib/coins";

const state = {
  premium: true,
  sesi: null as { email: string; isAdmin: boolean } | null,
  unlocks: [] as string[],
};

vi.mock("@/lib/video-base", () => ({
  getVideoBaseUrl: async () => "https://contoh-tunnel.trycloudflare.com",
}));

vi.mock("@/lib/dramas", () => ({
  getDramaCached: async (id: string) =>
    id === "judul-premium" ? { id, premium: state.premium } : undefined,
}));

vi.mock("@/lib/session", () => ({
  resolveUserEmail: async () => state.sesi,
}));

vi.mock("@/lib/store", () => ({
  getUnlocks: async () => state.unlocks,
}));

const { GET: GET_TEASER } = await import("../app/api/teaser/route");
const { GET: GET_DOWNLOAD } = await import("../app/api/download/route");

const BERBAYAR = FREE_EPISODES + 1;

function req(path: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Request(`http://localhost${path}`) as any;
}

beforeEach(() => {
  state.premium = true;
  state.sesi = null;
  state.unlocks = [];
});

describe.each([
  ["/api/teaser", (q: string) => GET_TEASER(req(`/api/teaser${q}`))],
  ["/api/download", (q: string) => GET_DOWNLOAD(req(`/api/download${q}`))],
])("%s — gerbang paywall tersambung", (_nama, panggil) => {
  it("ep 1 tetap 307 — hero & tombol unduh TIDAK boleh ikut rusak", async () => {
    const res = await panggil("?id=judul-premium&ep=1");
    expect(res.status).toBe(307);
    expect(res.headers.get("Location")).toContain("/1.mp4");
  });

  it("ep berbayar + anonim → 401 dan NOL alamat video yang keluar", async () => {
    const res = await panggil(`?id=judul-premium&ep=${BERBAYAR}`);
    expect(res.status).toBe(401);
    expect(res.headers.get("Location")).toBeNull();
    // Badan respons pun tak boleh memuat alamat tunnel-nya.
    expect(await res.text()).not.toContain("trycloudflare");
  });

  it("ep 99 + anonim → 401 (kasus yang bocor di produksi)", async () => {
    const res = await panggil("?id=judul-premium&ep=99");
    expect(res.status).toBe(401);
    expect(res.headers.get("Location")).toBeNull();
  });

  it("sudah login tapi belum bayar → 403, tetap nol alamat", async () => {
    state.sesi = { email: "penonton@contoh.com", isAdmin: false };
    const res = await panggil(`?id=judul-premium&ep=${BERBAYAR}`);
    expect(res.status).toBe(403);
    expect(res.headers.get("Location")).toBeNull();
  });

  it("sudah bayar → 307 lagi, penonton sah tidak ikut terblokir", async () => {
    state.sesi = { email: "penonton@contoh.com", isAdmin: false };
    state.unlocks = [`judul-premium:${BERBAYAR}`];
    const res = await panggil(`?id=judul-premium&ep=${BERBAYAR}`);
    expect(res.status).toBe(307);
    expect(res.headers.get("Location")).toContain(`/${BERBAYAR}.mp4`);
  });

  it("drama non-premium tidak ikut terpagari", async () => {
    state.premium = false;
    const res = await panggil("?id=judul-premium&ep=99");
    expect(res.status).toBe(307);
  });

  it("balasan episode berbayar TIDAK boleh masuk cache bersama", async () => {
    // KENAPA DIJAGA: jawaban untuk episode berbayar bergantung pada sesi. Kalau
    // header-nya `public`/`s-maxage`, satu redirect sah bisa disajikan ulang ke
    // orang lain oleh CDN — gerbangnya ditegakkan sekali lalu dilewati 60 detik
    // berikutnya. Itu membatalkan pagarnya, bukan cuma membocorkannya.
    state.sesi = { email: "penonton@contoh.com", isAdmin: false };
    state.unlocks = [`judul-premium:${BERBAYAR}`];
    const res = await panggil(`?id=judul-premium&ep=${BERBAYAR}`);
    const cache = res.headers.get("Cache-Control") ?? "";
    expect(cache).toContain("private");
    expect(cache).not.toContain("s-maxage");
  });

  it("jatah gratis TETAP boleh di-cache bersama (hemat kuota tak ikut hilang)", async () => {
    const res = await panggil("?id=judul-premium&ep=1");
    expect(res.headers.get("Cache-Control") ?? "").toContain("s-maxage");
  });
});
