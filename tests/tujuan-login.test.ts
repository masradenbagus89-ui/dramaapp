import { describe, expect, it } from "vitest";
import { nextAman, pesanGalatLogin, tujuanSetelahMasuk } from "../lib/tujuan-login";

describe("alamat balik sesudah login", () => {
  it("menolak alamat ke luar situs", () => {
    expect(nextAman("https://jahat.example/admin")).toBeNull();
    expect(nextAman("//jahat.example")).toBeNull();
    expect(nextAman("/admin/../rahasia")).toBeNull();
    expect(nextAman("/login")).toBeNull();
  });

  it("mengizinkan halaman admin di situs ini", () => {
    expect(nextAman("/admin/videos/playly")).toBe("/admin/videos/playly");
  });

  it("admin kembali ke panel, penonton tidak", () => {
    expect(tujuanSetelahMasuk("admin", "/admin/videos/playly")).toBe(
      "/admin/videos/playly",
    );
    expect(tujuanSetelahMasuk("viewer", "/admin/videos/playly")).toBe("/beranda");
    expect(tujuanSetelahMasuk("admin", null)).toBe("/beranda");
  });

  it("kode galat punya kalimat, kode asing tidak", () => {
    expect(pesanGalatLogin("admin")).toMatch(/password admin/i);
    expect(pesanGalatLogin("bukan-kode")).toBeNull();
  });
});
