// Tes pengunci untuk sesi PENONTON (Tahap 6).
//
// Yang dikunci di sini adalah inti perbaikan keamanan: identitas hanya boleh
// berasal dari cookie bertanda tangan, dan token penonton TIDAK BOLEH bisa
// dipakai sebagai admin walaupun tanda tangannya sah.
import { describe, it, expect, beforeAll } from "vitest";

// secret() membaca process.env saat dipanggil, jadi cukup di-set sebelum tes.
beforeAll(() => {
  process.env.AUTH_SECRET = "rahasia-uji-jangan-dipakai-produksi";
});

const {
  signViewerSession,
  signAdminSession,
  getViewerEmail,
  resolveUserEmail,
  VIEWER_COOKIE,
  ADMIN_COOKIE,
} = await import("../lib/session");

/** Request palsu yang membawa satu cookie. */
function reqWithCookie(name: string, value: string): Request {
  return new Request("http://localhost/api/uji", {
    headers: { cookie: `${name}=${encodeURIComponent(value)}` },
  });
}

describe("sesi penonton — tanda tangan cookie", () => {
  it("token sah -> email penonton terbaca kembali", () => {
    const token = signViewerSession("Penonton@Contoh.COM");
    const email = getViewerEmail(reqWithCookie(VIEWER_COOKIE, token));
    // Email dinormalkan ke huruf kecil supaya "A@x" dan "a@x" = orang yang sama.
    expect(email).toBe("penonton@contoh.com");
  });

  it("tanpa cookie -> null (bukan menebak dari mana pun)", () => {
    const req = new Request("http://localhost/api/uji");
    expect(getViewerEmail(req)).toBeNull();
  });

  it("tanda tangan dirusak -> ditolak", () => {
    const token = signViewerSession("penonton@contoh.com");
    const rusak = token.slice(0, -3) + "xyz";
    expect(getViewerEmail(reqWithCookie(VIEWER_COOKIE, rusak))).toBeNull();
  });

  it("isi payload diganti tanpa tanda tangan baru -> ditolak", () => {
    const token = signViewerSession("penonton@contoh.com");
    const sig = token.slice(token.indexOf(".") + 1);
    const palsu = Buffer.from(
      JSON.stringify({
        email: "korban@contoh.com",
        role: "viewer",
        exp: Date.now() + 60_000,
      }),
    ).toString("base64url");
    expect(getViewerEmail(reqWithCookie(VIEWER_COOKIE, `${palsu}.${sig}`))).toBeNull();
  });

  it("🔒 token ADMIN tidak lolos sebagai penonton (role dicek)", () => {
    const tokenAdmin = signAdminSession("admin@contoh.com");
    expect(getViewerEmail(reqWithCookie(VIEWER_COOKIE, tokenAdmin))).toBeNull();
  });
});

describe("resolveUserEmail — identitas HANYA dari cookie", () => {
  it("cookie penonton sah -> identitas penonton", async () => {
    const token = signViewerSession("penonton@contoh.com");
    const id = await resolveUserEmail(reqWithCookie(VIEWER_COOKIE, token));
    expect(id).toEqual({ email: "penonton@contoh.com", isAdmin: false });
  });

  it("🔒 tanpa cookie -> null, walaupun email disebut di URL", async () => {
    // Inti lubang IDOR sebelum Tahap 6: email di query dipakai sebagai identitas.
    const req = new Request("http://localhost/api/coins?email=korban@contoh.com");
    expect(await resolveUserEmail(req)).toBeNull();
  });

  it("🔒 token penonton di slot cookie ADMIN tidak menaikkan hak akses", async () => {
    const tokenViewer = signViewerSession("penonton@contoh.com");
    const id = await resolveUserEmail(reqWithCookie(ADMIN_COOKIE, tokenViewer));
    expect(id).toBeNull();
  });
});
