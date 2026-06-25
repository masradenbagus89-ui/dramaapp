// Tes pengunci perilaku untuk hash & verifikasi password admin (lib/admin-password.ts).
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../lib/admin-password";

describe("admin-password — hash & verifikasi password admin", () => {
  it("password benar -> verify true", () => {
    const rec = hashPassword("kangDed$1122");
    expect(verifyPassword("kangDed$1122", rec)).toBe(true);
  });

  it("password salah -> verify false", () => {
    const rec = hashPassword("kangDed$1122");
    expect(verifyPassword("salah", rec)).toBe(false);
  });

  it("salt sama -> hash sama (deterministik)", () => {
    const a = hashPassword("rahasia", "saltku123");
    const b = hashPassword("rahasia", "saltku123");
    expect(a.salt).toBe("saltku123");
    expect(a.hash).toBe(b.hash);
  });

  it("salt acak -> tiap hash beda, tapi tetap bisa diverifikasi", () => {
    const a = hashPassword("rahasia");
    const b = hashPassword("rahasia");
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
    expect(verifyPassword("rahasia", a)).toBe(true);
    expect(verifyPassword("rahasia", b)).toBe(true);
  });

  it("record kosong/null -> false (tidak crash)", () => {
    expect(verifyPassword("apa", null)).toBe(false);
    expect(verifyPassword("apa", undefined)).toBe(false);
    expect(verifyPassword("apa", { hash: "", salt: "" })).toBe(false);
  });
});
