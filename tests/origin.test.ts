// Tes untuk penjaga asal permintaan (anti-CSRF) + pembaca IP klien (lib/origin).
import { describe, it, expect } from "vitest";
import { isSameOrigin, clientIp } from "../lib/origin";

describe("isSameOrigin — penjaga asal permintaan (anti-CSRF)", () => {
  it("sesama domain → true (aman)", () => {
    expect(
      isSameOrigin("https://dramaapp.vercel.app", "dramaapp.vercel.app"),
    ).toBe(true);
  });

  it("domain berbeda → false (kemungkinan CSRF)", () => {
    expect(
      isSameOrigin("https://situs-jahat.com", "dramaapp.vercel.app"),
    ).toBe(false);
  });

  it("dev localhost dengan port cocok → true", () => {
    expect(isSameOrigin("http://localhost:3001", "localhost:3001")).toBe(true);
  });

  it("port berbeda dianggap host berbeda → false", () => {
    expect(isSameOrigin("http://localhost:3000", "localhost:3001")).toBe(false);
  });

  it("tanpa Origin (klien non-browser) → true (diizinkan)", () => {
    expect(isSameOrigin(null, "dramaapp.vercel.app")).toBe(true);
  });

  it("ada Origin tapi tanpa Host → false", () => {
    expect(isSameOrigin("https://dramaapp.vercel.app", null)).toBe(false);
  });

  it("Origin tak bisa di-parse → false (anggap mencurigakan)", () => {
    expect(isSameOrigin("bukan-url", "dramaapp.vercel.app")).toBe(false);
  });
});

describe("clientIp — baca alamat IP dari header proxy", () => {
  const h = (obj: Record<string, string>) => new Headers(obj);

  it("ambil IP pertama dari x-forwarded-for (rantai proxy)", () => {
    expect(clientIp(h({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe(
      "1.2.3.4",
    );
  });

  it("x-forwarded-for tunggal", () => {
    expect(clientIp(h({ "x-forwarded-for": "9.9.9.9" }))).toBe("9.9.9.9");
  });

  it("jatuh ke x-real-ip kalau x-forwarded-for kosong", () => {
    expect(clientIp(h({ "x-real-ip": "5.5.5.5" }))).toBe("5.5.5.5");
  });

  it("tanpa header IP → 'unknown'", () => {
    expect(clientIp(h({}))).toBe("unknown");
  });
});
