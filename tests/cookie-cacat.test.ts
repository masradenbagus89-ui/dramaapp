// Tes pengunci: cookie CACAT tidak boleh menjatuhkan server.
//
// Lahir dari audit keamanan 2026-11-14 (SEC-001). Sebelum perbaikan,
// `readCookie` memanggil decodeURIComponent langsung atas nilai cookie. Nilai
// itu datang dari permintaan, jadi bentuknya tak pernah terjamin: "%" sendirian
// sudah cukup membuat decodeURIComponent MELEMPAR URIError. Error itu lolos ke
// route handler dan keluar sebagai 500 — padahal jawaban yang benar adalah
// "tidak ada sesi" (rak owasp §1 A10:2025 — gagal-AMAN, bukan jatuh).
//
// Yang ikut jatuh ada tiga jalur, dan satu di antaranya PUBLIK: identitas tamu
// (lib/tamu.ts:124) dipakai komentar & rating yang menyala untuk semua
// pengunjung. Cookie tamu berumur 1 tahun, jadi satu nilai cacat membuat
// komentar rusak terus-menerus bagi pengunjung itu sampai ia menghapus cookie.
//
// Tes ini MERAH kalau try/catch di lib/session.ts dilepas.
import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.AUTH_SECRET = "rahasia-uji-jangan-dipakai-produksi";
});

const { readCookie, getViewerEmail, VIEWER_COOKIE, ADMIN_COOKIE } =
  await import("../lib/session");

/**
 * Nilai cookie yang membuat decodeURIComponent melempar. Sengaja ditulis
 * MENTAH (tanpa encodeURIComponent) — justru bentuk cacat itulah yang diuji.
 */
const NILAI_CACAT = ["%", "%E0%A4%A", "abc%ZZ", "%FF", "%%", "100%"];

describe("readCookie — nilai cookie cacat", () => {
  it("tidak melempar, dan memulangkan null (gagal-MENGUNCI)", () => {
    for (const nilai of NILAI_CACAT) {
      const header = `${VIEWER_COOKIE}=${nilai}`;
      expect(() => readCookie(header, VIEWER_COOKIE), nilai).not.toThrow();
      expect(readCookie(header, VIEWER_COOKIE), nilai).toBeNull();
    }
  });

  it("cookie cacat di SEBELAH cookie sehat tidak menulari yang sehat", () => {
    // Penting: penyerang/browser bisa menitipkan beberapa cookie sekaligus.
    // Yang cacat harus diabaikan sendiri, bukan menjatuhkan pembacaan lain.
    const header = `${ADMIN_COOKIE}=%; ${VIEWER_COOKIE}=nilai-sehat`;
    expect(readCookie(header, ADMIN_COOKIE)).toBeNull();
    expect(readCookie(header, VIEWER_COOKIE)).toBe("nilai-sehat");
  });

  it("nilai sah yang ter-encode tetap ter-decode seperti semula", () => {
    // Pagar anti-perbaikan-kebablasan: menangkap error TIDAK boleh berubah
    // jadi "berhenti men-decode". Email memuat "@" yang lazim ter-encode.
    const header = `${VIEWER_COOKIE}=${encodeURIComponent("budi@contoh.com")}`;
    expect(readCookie(header, VIEWER_COOKIE)).toBe("budi@contoh.com");
  });
});

describe("pembaca sesi — cookie cacat", () => {
  it("getViewerEmail memulangkan null, bukan melempar", () => {
    for (const nilai of NILAI_CACAT) {
      const req = new Request("http://localhost/api/uji", {
        headers: { cookie: `${VIEWER_COOKIE}=${nilai}` },
      });
      expect(() => getViewerEmail(req), nilai).not.toThrow();
      expect(getViewerEmail(req), nilai).toBeNull();
    }
  });
});
