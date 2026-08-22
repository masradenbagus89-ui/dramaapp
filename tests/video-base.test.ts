// Tes pengunci untuk PAGAR KEAMANAN alamat sumber video (lib/video-base.ts).
//
// Kenapa tes ini penting: /api/agent/video-base bisa mengganti alamat yang
// dipakai SELURUH penonton. Kalau isAllowedVideoBase bocor, siapa pun yang
// memegang agent secret bisa mengarahkan semua orang ke server mana pun.
// Tes ini yang menjaga pagarnya tetap rapat saat kode diubah nanti.
import { describe, it, expect } from "vitest";
import {
  isAllowedVideoBase,
  normalizeVideoBase,
  parseAllowedSuffixes,
} from "../lib/video-base";

describe("isAllowedVideoBase — alamat yang SAH", () => {
  it("quick tunnel cloudflare diterima", () => {
    expect(
      isAllowedVideoBase("https://therefore-donna-crops-doctors.trycloudflare.com"),
    ).toBe(true);
  });

  it("garis miring di akhir tetap diterima", () => {
    expect(isAllowedVideoBase("https://abc.trycloudflare.com/")).toBe(true);
  });

  it("named tunnel amasyaforum (rencana ke depan) diterima", () => {
    expect(isAllowedVideoBase("https://video.amasyaforum.com")).toBe(true);
  });
});

describe("isAllowedVideoBase — alamat yang HARUS DITOLAK", () => {
  it("http polos ditolak (bisa disadap/diubah di tengah jalan)", () => {
    expect(isAllowedVideoBase("http://abc.trycloudflare.com")).toBe(false);
  });

  it("host di luar daftar ditolak", () => {
    expect(isAllowedVideoBase("https://penyerang.com")).toBe(false);
    expect(isAllowedVideoBase("https://cdn.evil.net")).toBe(false);
  });

  it("host yang MENYAMAR mirip ditolak", () => {
    // Tanpa titik pemisah, endsWith polos akan meloloskan ini.
    expect(isAllowedVideoBase("https://evil-trycloudflare.com")).toBe(false);
    // Suffix asli ditaruh di tengah, domain sebenarnya milik penyerang.
    expect(isAllowedVideoBase("https://abc.trycloudflare.com.penyerang.com")).toBe(
      false,
    );
  });

  it("domain telanjang tanpa subdomain ditolak", () => {
    expect(isAllowedVideoBase("https://trycloudflare.com")).toBe(false);
  });

  it("user:password@ ditolak (dipakai menyamarkan host asli)", () => {
    expect(
      isAllowedVideoBase("https://abc.trycloudflare.com@penyerang.com"),
    ).toBe(false);
  });

  it("path/query/fragment ditolak (base URL harus origin telanjang)", () => {
    expect(isAllowedVideoBase("https://abc.trycloudflare.com/curian")).toBe(false);
    expect(isAllowedVideoBase("https://abc.trycloudflare.com/?x=1")).toBe(false);
    expect(isAllowedVideoBase("https://abc.trycloudflare.com/#x")).toBe(false);
  });

  it("port eksplisit ditolak (tunnel selalu 443)", () => {
    expect(isAllowedVideoBase("https://abc.trycloudflare.com:8443")).toBe(false);
  });

  it("string sampah / kosong / kepanjangan ditolak", () => {
    expect(isAllowedVideoBase("")).toBe(false);
    expect(isAllowedVideoBase("bukan-url")).toBe(false);
    expect(isAllowedVideoBase("javascript:alert(1)")).toBe(false);
    expect(isAllowedVideoBase(`https://${"a".repeat(320)}.trycloudflare.com`)).toBe(
      false,
    );
  });
});

describe("parseAllowedSuffixes — daftar host boleh ditambah lewat env", () => {
  it("tanpa env -> hanya bawaan", () => {
    const s = parseAllowedSuffixes();
    expect(s).toContain(".trycloudflare.com");
    expect(s).toContain(".amasyaforum.com");
  });

  it("suffix tambahan selalu diawali titik, walau ditulis tanpa titik", () => {
    const s = parseAllowedSuffixes("contoh.net, .lain.org");
    expect(s).toContain(".contoh.net");
    expect(s).toContain(".lain.org");
  });

  it("suffix tambahan benar-benar dipakai saat memvalidasi", () => {
    const s = parseAllowedSuffixes("contoh.net");
    expect(isAllowedVideoBase("https://video.contoh.net", s)).toBe(true);
    // Tetap ketat: domain telanjang tetap ditolak.
    expect(isAllowedVideoBase("https://contoh.net", s)).toBe(false);
  });
});

describe("normalizeVideoBase", () => {
  it("buang garis miring di akhir supaya penggabungan tak dobel", () => {
    expect(normalizeVideoBase("https://x.trycloudflare.com/")).toBe(
      "https://x.trycloudflare.com",
    );
    expect(normalizeVideoBase("https://x.trycloudflare.com///")).toBe(
      "https://x.trycloudflare.com",
    );
  });

  it("string kosong tetap kosong (mode lokal /videos/)", () => {
    expect(normalizeVideoBase("")).toBe("");
    expect(normalizeVideoBase("   ")).toBe("");
  });
});
