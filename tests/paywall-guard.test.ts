// Penjaga permanen untuk gerbang paywall sisi SERVER (dipasang 2026-10-24).
//
// BUG YANG DIJAGA — sudah LOLOS ke produksi, bukan hipotetis. Audit keamanan
// 2026-10-24 menguji situs sungguhan: `GET /api/download?id=<judul premium>&ep=99`
// TANPA satu pun cookie dijawab **307 beserta alamat .mp4**-nya. Penegakan
// paywall waktu itu cuma `v.pause()` di browser
// (app/components/FeedPlayer.tsx:315) — pagar kosmetik. Siapa pun yang membuka
// satu URL mendapat episode berbayar gratis.
//
// Kalau suatu saat seseorang "menyederhanakan" gerbang ini, berkas inilah yang
// berteriak — bukan penonton yang diam-diam menonton gratis.
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

type Drama = { id: string; premium?: boolean } | undefined;

const state = {
  drama: { id: "judul-premium", premium: true } as Drama,
  sesi: null as { email: string; isAdmin: boolean } | null,
  unlocks: [] as string[],
  katalogMeledak: false,
  hitungKatalog: 0,
  hitungUnlocks: 0,
};

vi.mock("@/lib/dramas", () => ({
  getDramaCached: async (id: string) => {
    state.hitungKatalog += 1;
    if (state.katalogMeledak) throw new Error("katalog mati");
    return state.drama && state.drama.id === id ? state.drama : undefined;
  },
}));

vi.mock("@/lib/session", () => ({
  resolveUserEmail: async () => state.sesi,
}));

vi.mock("@/lib/store", () => ({
  getUnlocks: async () => {
    state.hitungUnlocks += 1;
    return state.unlocks;
  },
}));

const { periksaAksesEpisode, balasanAksesDitolak } = await import(
  "../lib/paywall-guard"
);

const BERBAYAR = FREE_EPISODES + 1; // episode pertama yang BUKAN jatah gratis

function minta() {
  return new Request("http://localhost/api/teaser?id=judul-premium&ep=99");
}

beforeEach(() => {
  state.drama = { id: "judul-premium", premium: true };
  state.sesi = null;
  state.unlocks = [];
  state.katalogMeledak = false;
  state.hitungKatalog = 0;
  state.hitungUnlocks = 0;
});

describe("periksaAksesEpisode — jatah gratis tidak boleh ikut dipagari", () => {
  it("episode 1 lewat TANPA menyentuh database sama sekali", async () => {
    const hasil = await periksaAksesEpisode(minta(), "judul-premium", 1);
    expect(hasil).toBe("boleh");
    // Inilah yang membuat teaser hero & hover kartu tidak melambat: nol query.
    expect(state.hitungKatalog).toBe(0);
    expect(state.hitungUnlocks).toBe(0);
  });

  it(`episode terakhir jatah gratis (${FREE_EPISODES}) juga lewat tanpa query`, async () => {
    const hasil = await periksaAksesEpisode(
      minta(),
      "judul-premium",
      FREE_EPISODES,
    );
    expect(hasil).toBe("boleh");
    expect(state.hitungKatalog).toBe(0);
  });
});

describe("periksaAksesEpisode — episode berbayar WAJIB dipagari", () => {
  it("anonim → perlu-login (BUKAN boleh) — ini bug aslinya", async () => {
    const hasil = await periksaAksesEpisode(minta(), "judul-premium", BERBAYAR);
    expect(hasil).toBe("perlu-login");
  });

  it("episode 99 anonim → perlu-login (kasus persis yang bocor di produksi)", async () => {
    expect(await periksaAksesEpisode(minta(), "judul-premium", 99)).toBe(
      "perlu-login",
    );
  });

  it("sudah login tapi belum membuka episode → terkunci", async () => {
    state.sesi = { email: "penonton@contoh.com", isAdmin: false };
    expect(
      await periksaAksesEpisode(minta(), "judul-premium", BERBAYAR),
    ).toBe("terkunci");
  });

  it("sudah login DAN sudah membuka episode → boleh", async () => {
    state.sesi = { email: "penonton@contoh.com", isAdmin: false };
    state.unlocks = [`judul-premium:${BERBAYAR}`];
    expect(await periksaAksesEpisode(minta(), "judul-premium", BERBAYAR)).toBe(
      "boleh",
    );
  });

  it("episode LAIN yang dibuka tidak ikut membuka episode ini", async () => {
    state.sesi = { email: "penonton@contoh.com", isAdmin: false };
    state.unlocks = [`judul-premium:${BERBAYAR + 5}`];
    expect(await periksaAksesEpisode(minta(), "judul-premium", BERBAYAR)).toBe(
      "terkunci",
    );
  });

  it("unlock milik drama LAIN tidak ikut membuka drama ini", async () => {
    state.sesi = { email: "penonton@contoh.com", isAdmin: false };
    state.unlocks = [`drama-lain:${BERBAYAR}`];
    expect(await periksaAksesEpisode(minta(), "judul-premium", BERBAYAR)).toBe(
      "terkunci",
    );
  });

  it("admin bebas, sama seperti aturan di UI", async () => {
    state.sesi = { email: "admin@contoh.com", isAdmin: true };
    expect(await periksaAksesEpisode(minta(), "judul-premium", BERBAYAR)).toBe(
      "boleh",
    );
  });

  it("drama non-premium tetap gratis walau episodenya tinggi", async () => {
    state.drama = { id: "judul-premium", premium: false };
    expect(await periksaAksesEpisode(minta(), "judul-premium", 99)).toBe(
      "boleh",
    );
  });
});

describe("periksaAksesEpisode — jebakan yang mudah terlewat", () => {
  it("token unlock dicocokkan TANPA peduli huruf besar/kecil", async () => {
    // KENAPA DIJAGA: token disimpan apa adanya dari body pemanggil
    // (app/api/coins/unlock/route.ts:36 hanya trim). Kalau perbandingannya
    // sensitif-huruf, penonton yang SUDAH BAYAR ikut diblokir — kerugiannya
    // menimpa pelanggan, dan mereka belum tentu melapor.
    state.sesi = { email: "penonton@contoh.com", isAdmin: false };
    state.unlocks = [`Judul-Premium:${BERBAYAR}`];
    expect(await periksaAksesEpisode(minta(), "judul-premium", BERBAYAR)).toBe(
      "boleh",
    );
  });

  it("dramaId ber-huruf besar TETAP dipagari (anti bypass huruf)", async () => {
    // ID_RE di kedua route menerima huruf besar. Tanpa normalisasi, katalog tak
    // ketemu → `premium` terbaca false → lolos, padahal filesystem Windows di
    // PC backup tetap menyajikan berkasnya.
    expect(await periksaAksesEpisode(minta(), "Judul-Premium", 99)).toBe(
      "perlu-login",
    );
  });

  it("katalog mati → tak-bisa-dipastikan, BUKAN boleh (anti fail-open)", async () => {
    // rak owasp §1 A10:2025 — saat kondisi tak terduga, default MENOLAK.
    // Kalau blok catch meloloskan, gangguan database jadi tombol
    // "semua episode gratis", dan gangguan itu bisa dipicu dari luar.
    state.katalogMeledak = true;
    expect(await periksaAksesEpisode(minta(), "judul-premium", 99)).toBe(
      "tak-bisa-dipastikan",
    );
  });
});

describe("balasanAksesDitolak — 401 tidak boleh tertukar 403", () => {
  it("perlu-login = 401", () => {
    expect(balasanAksesDitolak("perlu-login").status).toBe(401);
  });

  it("terkunci = 403", () => {
    expect(balasanAksesDitolak("terkunci").status).toBe(403);
  });

  it("tak-bisa-dipastikan = 503, supaya penonton tak dituduh belum bayar", () => {
    expect(balasanAksesDitolak("tak-bisa-dipastikan").status).toBe(503);
  });

  it("pesannya bisa dibaca orang awam, bukan kode teknis", () => {
    for (const h of ["perlu-login", "terkunci", "tak-bisa-dipastikan"] as const) {
      expect(balasanAksesDitolak(h).pesan.length).toBeGreaterThan(10);
    }
  });
});
