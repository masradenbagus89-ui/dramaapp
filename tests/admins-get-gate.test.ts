// Penjaga permanen: GET /api/admins TIDAK BOLEH membocorkan email admin
// (dipasang 2026-10-24).
//
// BUG YANG DIJAGA — sudah LOLOS ke produksi. Audit 2026-10-24 memanggil
// endpoint ini di situs sungguhan tanpa cookie apa pun dan dijawab **200 berisi
// nama + email 5 admin**. Dampaknya: brute-force login berubah dari "tebak
// email DAN password" jadi "tebak password saja", dan jalur login admin masih
// punya cadangan satu ADMIN_PASSWORD bersama (app/api/auth/login/route.ts:79).
// POST & DELETE di berkas yang sama sudah dipagari sejak awal — hanya GET yang
// terlewat, dan itu persis jenis kelalaian yang tes ini tangkap.
import { describe, it, expect, beforeEach, vi } from "vitest";

const DAFTAR = [
  { email: "admin1@contoh.com", name: "Admin Satu", addedAt: "2026-01-01" },
  { email: "admin2@contoh.com", name: "Admin Dua", addedAt: "2026-02-02" },
];

const state = {
  adminSesi: null as string | null,
  sesi: null as { email: string; isAdmin: boolean } | null,
};

vi.mock("@/lib/store", () => ({
  getAdmins: async () => ({ admins: DAFTAR }),
  isAdminEmail: async (e: string) =>
    DAFTAR.some((a) => a.email === e.toLowerCase()),
  setAdmins: async () => {},
  setAdminPassword: async () => {},
}));

vi.mock("@/lib/session", () => ({
  getAdminEmail: async () => state.adminSesi,
  resolveUserEmail: async () => state.sesi,
}));

vi.mock("@/lib/origin", () => ({
  clientIp: () => "10.0.0.1",
}));

const { GET } = await import("../app/api/admins/route");

function minta(query = "") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return GET(new Request(`http://localhost/api/admins${query}`) as any);
}

beforeEach(() => {
  state.adminSesi = null;
  state.sesi = null;
});

describe("GET /api/admins — daftar email HANYA untuk admin", () => {
  it("anonim tanpa ?email → 403 dan NOL email ikut keluar", async () => {
    const res = await minta();
    expect(res.status).toBe(403);
    const teks = await res.text();
    // Pemeriksaan paling penting di berkas ini: tidak boleh ada satu pun
    // alamat email di badan respons, bagaimanapun bentuk pesan errornya.
    expect(teks).not.toContain("@contoh.com");
    expect(teks).not.toContain("admin1");
  });

  it("anonim DENGAN ?email → 401, bukan jawaban ya/tidak", async () => {
    // Kalau ini meloloskan, endpoint berubah jadi alat pemeriksa tebakan:
    // "apakah budi@x.com admin?" — bocor lebih lambat, tapi tetap bocor.
    const res = await minta("?email=admin1@contoh.com");
    expect(res.status).toBe(401);
    expect(await res.text()).not.toContain("isAdmin");
  });

  it("sesi admin → daftar penuh, bentuk { admins } TIDAK berubah", async () => {
    // AdminManager.tsx:34 membaca bentuk ini; mengubahnya mematikan panel admin.
    state.adminSesi = "admin1@contoh.com";
    const res = await minta();
    expect(res.status).toBe(200);
    const data = (await res.json()) as { admins: { email: string }[] };
    expect(data.admins).toHaveLength(2);
    expect(data.admins[0].email).toBe("admin1@contoh.com");
  });
});

describe("GET /api/admins?email= — hanya boleh bertanya soal DIRI SENDIRI", () => {
  it("penonton menanyakan email ORANG LAIN → 403", async () => {
    state.sesi = { email: "penonton@contoh.com", isAdmin: false };
    const res = await minta("?email=admin1@contoh.com");
    expect(res.status).toBe(403);
    expect(await res.text()).not.toContain("isAdmin");
  });

  it("penonton menanyakan email sendiri → { isAdmin: false }", async () => {
    state.sesi = { email: "penonton@contoh.com", isAdmin: false };
    const res = await minta("?email=penonton@contoh.com");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ isAdmin: false });
  });

  it("email admin yang sesinya masih penonton → { isAdmin: true }", async () => {
    // INI yang membuat spanduk "kamu admin, masuk ulang" tetap hidup
    // (lib/auth.ts fetchUserRole → needsAdminRelogin, tampil di
    // TopNav.tsx:242 & KepalaKatalog.tsx:163). Kalau tes ini merah, fitur itu
    // mati diam-diam.
    state.sesi = { email: "admin1@contoh.com", isAdmin: false };
    const res = await minta("?email=admin1@contoh.com");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ isAdmin: true });
  });

  it("beda huruf besar/kecil tetap dianggap diri sendiri", async () => {
    state.sesi = { email: "admin1@contoh.com", isAdmin: false };
    const res = await minta("?email=Admin1@Contoh.com");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ isAdmin: true });
  });

  it("jawabannya HANYA isAdmin — nol nama, nol daftar, nol tanggal", async () => {
    state.sesi = { email: "admin1@contoh.com", isAdmin: false };
    const data = (await (await minta("?email=admin1@contoh.com")).json()) as
      Record<string, unknown>;
    expect(Object.keys(data)).toEqual(["isAdmin"]);
  });
});
