import { describe, it, expect } from "vitest";
import { nameAfterLogin, needsAdminRelogin, type User } from "../lib/auth";

const viewer: User = {
  name: "Adminmegatron3082",
  email: "megatron3082@gmail.com",
  role: "viewer",
};

describe("needsAdminRelogin — sesi penonton vs daftar admin", () => {
  it("email sudah admin tapi sesi masih viewer -> true", () => {
    expect(needsAdminRelogin(viewer, true)).toBe(true);
  });

  it("sudah sesi admin -> false", () => {
    expect(needsAdminRelogin({ ...viewer, role: "admin" }, true)).toBe(false);
  });

  it("bukan admin di daftar -> false", () => {
    expect(needsAdminRelogin(viewer, false)).toBe(false);
  });

  it("belum login -> false", () => {
    expect(needsAdminRelogin(null, true)).toBe(false);
  });
});

describe("nameAfterLogin — jangan timpa nama kustom", () => {
  it("email sama -> pakai nama sesi lama", () => {
    expect(
      nameAfterLogin("Megatron3082", "megatron3082@gmail.com", viewer),
    ).toBe("Adminmegatron3082");
  });

  it("email beda -> pakai nama dari server", () => {
    expect(nameAfterLogin("Baru", "lain@gmail.com", viewer)).toBe("Baru");
  });

  it("tidak ada sesi lama -> pakai nama dari server", () => {
    expect(nameAfterLogin("Baru", "a@b.c", null)).toBe("Baru");
  });
});
