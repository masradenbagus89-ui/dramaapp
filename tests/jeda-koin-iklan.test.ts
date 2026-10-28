// @vitest-environment jsdom
//
// Penjaga keadaan JEDA — koin & iklan dimatikan (owner, 2026-10-28:
// "koin kita pending saja, semua fitur koin & iklan dihapus, simpan filenya
// biar sewaktu-waktu bisa diaktifkan kembali").
//
// KENAPA keadaan "mati" perlu dijaga mesin, bukan cukup dilihat sekali. Fitur
// yang dimatikan lewat saklar TIDAK hilang dari kode — ia cuma berhenti
// dipanggil. Satu pemanggil yang terlewat (satu halaman yang masih menggambar
// banner, satu route yang masih melayani) tidak menimbulkan error apa pun:
// halamannya tetap 200, build tetap hijau, dan yang bocor hanya terlihat kalau
// ada orang membukanya. Berkas ini yang menutup celah itu.
//
// Pembagian tugasnya sengaja dibalik dari berkas tes lain: tes paywall/iklan
// yang lama memaku saklarnya MENYALA lewat `vi.mock` (supaya jalur "nyalakan
// kembali" tetap terbukti), sedangkan berkas ini sengaja TIDAK meniru apa pun —
// ia membaca nilai SUNGGUHAN dari lib/saklar-fitur.ts.
import { describe, it, expect, vi } from "vitest";
import { createElement as h, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ADS_ENABLED, PAYWALL_ENABLED } from "../lib/saklar-fitur";
import { isEpisodeLocked } from "../lib/coins";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyGlobal = globalThis as any;
anyGlobal.IS_REACT_ACT_ENVIRONMENT = true;

// Lapisan data & sesi ditiru supaya tes tak butuh env/database. Gerbang saklar
// berjalan SEBELUM keduanya disentuh, jadi kalau gerbangnya hilang route akan
// lanjut memakai tiruan ini dan membalas 200 — tes di bawah tetap merah.
vi.mock("@/lib/store", () => ({
  getBalance: async () => 0,
  getUnlocks: async () => [],
  getCoinMeta: async () => ({}),
  setCoinMeta: async () => {},
  addCoins: async () => 0,
  addUnlocks: async () => {},
  spendUnlock: async () => ({ ok: true, balance: 0 }),
  getAds: async () => [{ id: "a1", imageUrl: "x", linkUrl: "y" }],
  incrementAdStat: async () => {},
  addAd: async () => ({ id: "a2" }),
  removeAd: async () => {},
  getOrder: async () => null,
  setOrder: async () => {},
}));
vi.mock("@/lib/session", () => ({
  resolveUserEmail: async () => ({ email: "uji@contoh.test", isAdmin: true }),
  isAdminRequest: async () => true,
}));

/** Permintaan dari domain sendiri — supaya yang menolak bukan penjaga CSRF. */
function minta(path: string, method = "GET", body?: unknown) {
  return new Request("http://localhost" + path, {
    method,
    headers: {
      origin: "http://localhost",
      host: "localhost",
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("TRIPWIRE saklar — keadaan yang sedang berlaku", () => {
  it("koin & iklan sedang DIJEDA (keputusan owner 2026-10-28)", () => {
    // 🔴 TES INI MERAH = saklarnya dinyalakan kembali.
    //
    // Itu BOLEH — tapi harus disengaja, bukan tersenggol. Kalau memang sedang
    // menyalakan kembali (lib/saklar-fitur.ts), ubah dua harapan di bawah jadi
    // `true` dan perbarui docs/lintasai/rencana/2026-10-28-jeda-koin-dan-iklan.md.
    //
    // Tripwire ini menggantikan dua tripwire lama yang berbunyi sebaliknya
    // ("paywall sedang menyala") di tests/coins.test.ts dan
    // tests/download-button.test.ts; keduanya dipindah ke sini karena di sana
    // saklarnya sekarang dipaku menyala, jadi tak akan pernah bisa merah.
    expect(PAYWALL_ENABLED).toBe(false);
    expect(ADS_ENABLED).toBe(false);
  });

  it("konsekuensinya: tak ada episode yang terkunci lagi", () => {
    // Akibat langsung yang owner diberi tahu: tanpa koin tak ada cara membuka
    // episode, jadi paywall ikut dilepas. Kalau ini `true` padahal koin mati,
    // penonton menabrak dinding mati yang tak bisa dibuka dengan cara apa pun.
    expect(
      isEpisodeLocked(99, { premium: true, isAdmin: false, unlocked: new Set() }),
    ).toBe(false);
  });
});

describe("route koin & iklan menolak melayani selama dijeda", () => {
  it("6 route koin + 3 route iklan membalas 404", async () => {
    const { GET: coinsGet } = await import("../app/api/coins/route");
    const { POST: unlock } = await import("../app/api/coins/unlock/route");
    const { POST: unlockAll } = await import("../app/api/coins/unlock-all/route");
    const { POST: reward } = await import("../app/api/coins/reward/route");
    const { POST: checkin } = await import("../app/api/coins/checkin/route");
    const { POST: topup } = await import("../app/api/coins/topup/route");
    const { GET: history } = await import("../app/api/coins/history/route");
    const { GET: adsGet } = await import("../app/api/ads/route");
    const { POST: adsEvent } = await import("../app/api/ads/event/route");
    const { POST: adminAds } = await import("../app/api/admin/ads/route");

    const hasil = [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await coinsGet(minta("/api/coins?dramaId=x") as any),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await unlock(minta("/api/coins/unlock", "POST", { dramaId: "x", ep: 9 }) as any),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await unlockAll(minta("/api/coins/unlock-all", "POST", { dramaId: "x" }) as any),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await reward(minta("/api/coins/reward", "POST", {}) as any),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await checkin(minta("/api/coins/checkin", "POST", {}) as any),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await topup(minta("/api/coins/topup", "POST", { packId: "starter" }) as any),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await history(minta("/api/coins/history") as any),
      await adsGet(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await adsEvent(minta("/api/ads/event", "POST", { id: "a1", type: "view" }) as any),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await adminAds(minta("/api/admin/ads", "POST", { imageUrl: "https://a/b.png", linkUrl: "https://a" }) as any),
    ];

    expect(hasil.map((r) => r.status)).toEqual(Array(10).fill(404));
  });

  it("badan jawabannya menjelaskan SEBABNYA, bukan 404 kosong", async () => {
    // Supaya kalau suatu saat ada yang bingung "kenapa koin error", jawabannya
    // langsung terbaca dari responsnya — bukan harus membaca kode dulu (§1.7).
    const { GET } = await import("../app/api/coins/route");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await GET(minta("/api/coins") as any);
    expect(await res.json()).toEqual({ error: "Fitur koin sedang tidak aktif." });
  });

  it("404-nya TIDAK boleh tersimpan cache — kalau tidak, fitur yang sudah hidup terlihat mati", async () => {
    const { GET } = await import("../app/api/ads/route");
    const res = await GET();
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("webhook Midtrans TETAP HIDUP — pengecualian yang disengaja", async () => {
    // Kalau ada pembayaran yang sudah berjalan sebelum saklar dimatikan,
    // webhook inilah yang mencatatnya. Mematikannya = ada orang membayar lalu
    // koinnya tak pernah masuk, dan itu lebih buruk daripada fitur yang jeda.
    const { POST } = await import("../app/api/coins/webhook/route");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(minta("/api/coins/webhook", "POST", { order_id: "x" }) as any);
    expect(res.status).not.toBe(404);
    expect(JSON.stringify(await res.json())).not.toContain("tidak aktif");
  });
});

describe("tampilan: nol jejak koin & iklan di layar", () => {
  async function gambar(nama: string, el: Parameters<Root["render"]>[0]) {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => root.render(el));
    const isi = container.textContent ?? "";
    const anak = container.innerHTML;
    await act(async () => root.unmount());
    container.remove();
    return { nama, isi, anak };
  }

  it("CoinChip, CoinWallet, AdBanner & RewardedAdModal tidak menggambar apa pun", async () => {
    const { default: CoinChip } = await import("../app/components/CoinChip");
    const { default: CoinWallet } = await import("../app/components/CoinWallet");
    const { default: AdBanner } = await import("../app/components/AdBanner");
    const { default: RewardedAdModal } = await import(
      "../app/components/RewardedAdModal"
    );

    const hasil = [
      await gambar("CoinChip", h(CoinChip)),
      await gambar("CoinWallet", h(CoinWallet)),
      await gambar("AdBanner", h(AdBanner)),
      // `open: true` dengan sengaja — kalau modalnya cuma bergantung pada prop
      // itu dan bukan pada saklar, tes ini yang menangkapnya.
      await gambar(
        "RewardedAdModal",
        h(RewardedAdModal, { open: true, onClose: () => {} }),
      ),
    ];

    expect(hasil.filter((r) => r.anak !== "").map((r) => r.nama)).toEqual([]);
  });

  it("menu profil tidak lagi punya pintu 'Premium / Koin'", async () => {
    const { default: DashboardMenu } = await import(
      "../app/components/profile/DashboardMenu"
    );
    const { isi } = await gambar("DashboardMenu", h(DashboardMenu, {}));

    expect(isi).not.toContain("Koin");
    expect(isi).not.toContain("Top-up");
    // Dua arah: menunya memang masih digambar, cuma pintu koinnya yang hilang.
    // Tanpa pemeriksaan ini, komponen yang kosong melompong juga lulus.
    expect(isi).toContain("Riwayat Tontonan");
  });
});
