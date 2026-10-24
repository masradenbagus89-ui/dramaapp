// Penjaga permanen: SELURUH /admin/* dijaga di SERVER lewat satu gerbang
// (dipasang 2026-10-24).
//
// BUG YANG DIJAGA — temuan audit 2026-10-24 (T-3). Halaman `/admin` dulu dijaga
// HANYA oleh pemeriksaan di browser: `app/admin/page.tsx` membaca
// `localStorage["dramaku:user"]` lalu mempercayai field `role` apa adanya
// (`lib/auth.ts:34`). Siapa pun bisa menanam `{"role":"admin"}` lewat console
// browsernya sendiri, dan seluruh isi panel terkirim ke dia — formulir drama,
// manajer admin, setelan 2FA, manajer iklan.
//
// Diperparah keadaan lama: `/admin` muncul sebagai `○ (Static)` di keluaran
// build, artinya kerangka halamannya DICETAK saat build lalu disajikan dari
// cache. Gerbang di layout membuatnya dirender per-permintaan dengan cookie
// diperiksa lebih dulu.
//
// Tes ini menjaga DUA arah: orang tanpa sesi admin tak pernah menerima isi
// panel, DAN admin yang sah tidak ikut terkunci dari panelnya sendiri.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const state = {
  nilaiCookie: undefined as string | undefined,
  emailSah: null as string | null,
  tokenYangDiperiksa: undefined as string | null | undefined,
};

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nama: string) =>
      nama === "dramaku_admin" && state.nilaiCookie !== undefined
        ? { name: nama, value: state.nilaiCookie }
        : undefined,
  }),
}));

vi.mock("@/lib/session", () => ({
  ADMIN_COOKIE: "dramaku_admin",
  verifyAdminSessionToken: async (token: string | null | undefined) => {
    state.tokenYangDiperiksa = token;
    return state.emailSah;
  },
}));

const AdminLayout = (await import("../app/admin/layout")).default;

const ISI_PANEL = "ISI-PANEL-ADMIN-RAHASIA";

async function render() {
  const el = await AdminLayout({ children: ISI_PANEL });
  return renderToStaticMarkup(createElement(() => el));
}

beforeEach(() => {
  state.nilaiCookie = undefined;
  state.emailSah = null;
  state.tokenYangDiperiksa = undefined;
});

describe("app/admin/layout — tanpa sesi admin, isi panel TIDAK dikirim", () => {
  it("tanpa cookie sama sekali → layar Akses ditolak, nol isi panel", async () => {
    const html = await render();
    expect(html).toContain("Akses ditolak");
    // Pemeriksaan paling penting di berkas ini: isi panelnya tidak boleh ikut
    // terkirim ke browser. "Disembunyikan sesudah sampai" bukan penjagaan.
    expect(html).not.toContain(ISI_PANEL);
  });

  it("cookie ada tapi tanda tangannya tidak sah → ditolak", async () => {
    state.nilaiCookie = "token-palsu-karangan";
    state.emailSah = null; // verifyAdminSessionToken menolak
    const html = await render();
    expect(html).toContain("Akses ditolak");
    expect(html).not.toContain(ISI_PANEL);
  });

  it("email yang sudah DIHAPUS dari daftar admin → ditolak", async () => {
    // `verifyAdminSessionToken` (lib/session.ts:122-129) memeriksa juga apakah
    // emailnya MASIH terdaftar sebagai admin, bukan cuma tanda tangannya. Jadi
    // admin yang dihapus kehilangan akses seketika — tidak menunggu sesi 7
    // harinya kedaluwarsa. Di sini dipalsukan sebagai "verify balas null".
    state.nilaiCookie = "token-admin-yang-sudah-dihapus";
    state.emailSah = null;
    const html = await render();
    expect(html).toContain("Akses ditolak");
    expect(html).not.toContain(ISI_PANEL);
  });

  it("layar penolakan menawarkan jalan keluar, bukan jalan buntu", async () => {
    const html = await render();
    expect(html).toContain("/login");
    expect(html).toContain("/beranda");
  });
});

describe("app/admin/layout — admin yang SAH jangan ikut terkunci", () => {
  it("sesi admin sah → isi panel dirender, nol layar penolakan", async () => {
    state.nilaiCookie = "token-admin-sah";
    state.emailSah = "admin@contoh.com";
    const html = await render();
    expect(html).toContain(ISI_PANEL);
    expect(html).not.toContain("Akses ditolak");
  });

  it("nilai cookie diteruskan APA ADANYA ke pemeriksa", async () => {
    // Kalau nilai ini pernah diubah/dipangkas di layout, tanda tangan HMAC-nya
    // tak akan cocok dan SEMUA admin terkunci — kegagalan yang terlihat seperti
    // "password saya salah" padahal bukan.
    state.nilaiCookie = "token-admin-sah";
    state.emailSah = "admin@contoh.com";
    await render();
    expect(state.tokenYangDiperiksa).toBe("token-admin-sah");
  });
});
