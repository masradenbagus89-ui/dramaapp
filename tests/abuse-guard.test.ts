// Penjaga permanen: endpoint penulis-data publik WAJIB berpagar penyalahgunaan
// (dipasang 2026-10-24).
//
// BUG YANG DIJAGA — temuan audit 2026-10-24. Empat endpoint yang MENULIS ke
// database berjalan tanpa `guardMutation`: tanpa cek asal-domain dan tanpa
// batas laju. Akibat nyatanya dua: (1) situs mana pun bisa menyuruh browser
// pengunjungnya menembak endpoint kita; (2) satu skrip bisa memalsukan jumlah
// like judul apa pun dan menggelembungkan penghitung impresi iklan — dan angka
// impresi itu dasar tagihan ke sponsor, jadi ini soal uang, bukan angka hiasan.
//
// `/api/likes` punya bug kedua yang lebih senyap: `dramaId` tak pernah
// divalidasi, sementara `changeLike` memanggil fungsi database `like_change`
// (lib/store.ts:217) yang membuat baris untuk id APA PUN. Jadi id karangan
// menumbuhkan baris sampah selamanya tanpa ada yang menyadarinya.
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

const state = {
  dramaAda: true,
  katalogMeledak: false,
  likeDipanggil: 0,
  adStatDipanggil: 0,
};

vi.mock("@/lib/store", () => ({
  getLikes: async () => ({ "judul-ada": 3 }),
  changeLike: async () => {
    state.likeDipanggil += 1;
    return 4;
  },
  incrementAdStat: async () => {
    state.adStatDipanggil += 1;
  },
}));

vi.mock("@/lib/dramas", () => ({
  getDramaCached: async (id: string) => {
    if (state.katalogMeledak) throw new Error('relation "dramaapp.dramas" bla');
    return state.dramaAda && id === "judul-ada"
      ? { id, premium: false }
      : undefined;
  },
}));

const { POST: LIKES } = await import("../app/api/likes/route");
const { POST: ADS } = await import("../app/api/ads/event/route");

/**
 * Bangun permintaan POST. `ip` dibedakan tiap tes supaya ember pembatas laju
 * tidak bocor antar-tes — penyimpanannya tingkat-modul (lib/rate-limit.ts:63),
 * jadi tanpa ini tes yang jalan belakangan bisa merah karena kuota tes
 * sebelumnya, bukan karena kodenya salah.
 */
function post(
  path: string,
  body: unknown,
  opts: { origin?: string | null; ip: string },
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    host: "situs-kita.test",
    "x-forwarded-for": opts.ip,
  };
  if (opts.origin !== null) {
    headers.origin = opts.origin ?? "https://situs-kita.test";
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Request(`https://situs-kita.test${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }) as any;
}

beforeEach(() => {
  state.dramaAda = true;
  state.katalogMeledak = false;
  state.likeDipanggil = 0;
  state.adStatDipanggil = 0;
});

describe("POST /api/likes — pagar asal-domain & validasi", () => {
  it("permintaan dari domain LAIN ditolak 403, dan database TIDAK tersentuh", async () => {
    const res = await LIKES(
      post("/api/likes", { dramaId: "judul-ada", action: "like" }, {
        origin: "https://situs-jahat.example",
        ip: "10.1.0.1",
      }),
    );
    expect(res.status).toBe(403);
    expect(state.likeDipanggil).toBe(0);
  });

  it("permintaan dari domain sendiri lolos dan menaikkan hitungan", async () => {
    const res = await LIKES(
      post("/api/likes", { dramaId: "judul-ada", action: "like" }, {
        ip: "10.1.0.2",
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, count: 4 });
    expect(state.likeDipanggil).toBe(1);
  });

  it("dramaId karangan ditolak 404 — nol baris sampah masuk database", async () => {
    const res = await LIKES(
      post("/api/likes", { dramaId: "judul-karangan", action: "like" }, {
        ip: "10.1.0.3",
      }),
    );
    expect(res.status).toBe(404);
    expect(state.likeDipanggil).toBe(0);
  });

  it("dramaId berbentuk aneh ditolak 400 sebelum menyentuh katalog", async () => {
    for (const buruk of ["", "   ", "a/b", "../rahasia", "a".repeat(101), "judul spasi"]) {
      const res = await LIKES(
        post("/api/likes", { dramaId: buruk, action: "like" }, { ip: "10.1.0.4" }),
      );
      expect(res.status).toBe(400);
    }
    expect(state.likeDipanggil).toBe(0);
  });

  it("body bukan JSON ditolak 400, bukan 500", async () => {
    const req = new Request("https://situs-kita.test/api/likes", {
      method: "POST",
      headers: {
        host: "situs-kita.test",
        origin: "https://situs-kita.test",
        "x-forwarded-for": "10.1.0.5",
      },
      body: "bukan json",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await LIKES(req as any);
    expect(res.status).toBe(400);
  });

  it("pesan error database TIDAK diteruskan mentah ke browser", async () => {
    // Pesan asli bisa memuat nama tabel & bentuk query. Yang keluar harus
    // kalimat untuk manusia, dan statusnya 503 (sementara) bukan 500.
    state.katalogMeledak = true;
    const res = await LIKES(
      post("/api/likes", { dramaId: "judul-ada", action: "like" }, { ip: "10.1.0.6" }),
    );
    expect(res.status).toBe(503);
    expect(await res.text()).not.toContain("dramaapp.dramas");
  });

  it("banjir dari satu IP akhirnya kena 429", async () => {
    let kena429 = false;
    for (let i = 0; i < 130; i++) {
      const res = await LIKES(
        post("/api/likes", { dramaId: "judul-ada", action: "like" }, {
          ip: "10.9.9.9",
        }),
      );
      if (res.status === 429) {
        expect(res.headers.get("Retry-After")).toBeTruthy();
        kena429 = true;
        break;
      }
    }
    expect(kena429).toBe(true);
  });
});

describe("POST /api/ads/event — penghitung iklan tak boleh dipalsukan lintas-situs", () => {
  it("dari domain LAIN ditolak 403, penghitung TIDAK naik", async () => {
    const res = await ADS(
      post("/api/ads/event", { id: "iklan-1", type: "view" }, {
        origin: "https://situs-jahat.example",
        ip: "10.2.0.1",
      }),
    );
    expect(res.status).toBe(403);
    expect(state.adStatDipanggil).toBe(0);
  });

  it("dari domain sendiri tetap tercatat — impresi sah jangan ikut hilang", async () => {
    const res = await ADS(
      post("/api/ads/event", { id: "iklan-1", type: "view" }, { ip: "10.2.0.2" }),
    );
    expect(res.status).toBe(200);
    expect(state.adStatDipanggil).toBe(1);
  });

  it("type selain view/click ditolak 400", async () => {
    const res = await ADS(
      post("/api/ads/event", { id: "iklan-1", type: "apa-saja" }, { ip: "10.2.0.3" }),
    );
    expect(res.status).toBe(400);
    expect(state.adStatDipanggil).toBe(0);
  });
});

describe("BATAS JUJUR yang sudah diketahui — didokumentasikan, bukan dirahasiakan", () => {
  it("permintaan TANPA header Origin masih lolos (mis. curl/skrip)", async () => {
    // Ini keputusan sadar di lib/origin.ts:26 (`if (!origin) return true`) dan
    // benar untuk anti-CSRF: serangan dari browser SELALU membawa Origin.
    // Konsekuensinya jujur: skrip di luar browser melewati lapis pertama dan
    // hanya menghadapi batas laju. Tes ini ada supaya fakta itu TERLIHAT —
    // kalau suatu hari perilakunya diperketat, tes inilah yang memberi tahu,
    // bukan laporan pengguna.
    const res = await LIKES(
      post("/api/likes", { dramaId: "judul-ada", action: "like" }, {
        origin: null,
        ip: "10.3.0.1",
      }),
    );
    expect(res.status).toBe(200);
  });
});
