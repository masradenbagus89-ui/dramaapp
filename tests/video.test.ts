// Tes pengunci perilaku untuk videoSrc + decideVideoError
// (lib/video.ts).
import { describe, it, expect } from "vitest";
import { videoSrc, decideVideoError } from "../lib/video";

describe("videoSrc — bikin alamat file video", () => {
  it("resolusi asli (kode kosong) -> <ep>.mp4", () => {
    expect(videoSrc("https://x.trycloudflare.com", "drama-1", 3, "")).toBe(
      "https://x.trycloudflare.com/drama-1/3.mp4",
    );
  });

  it("ada resolusi -> <ep>.<res>.mp4", () => {
    expect(videoSrc("https://x", "d", 1, "720p")).toBe("https://x/d/1.720p.mp4");
    expect(videoSrc("https://x", "d", 1, "1080p")).toBe("https://x/d/1.1080p.mp4");
  });

  it("baseUrl kosong (mode lokal) -> folder publik /videos/", () => {
    expect(videoSrc("", "d", 2, "")).toBe("/videos/d/2.mp4");
    expect(videoSrc("", "d", 2, "480p")).toBe("/videos/d/2.480p.mp4");
  });
});

// Tes `downloadUrl` DIBUANG bersama fungsinya (2026-10-27) — lihat penanda di
// lib/video.ts. Yang dulu dijaga di sini tidak hilang: konvensi `?dl=1` sudah
// dikunci tests/download-redirect.test.ts (jalur /api/download), dan itu memang
// tempat yang lebih tepat karena di situlah gerbang paywall ikut diuji.

// PENJAGA REGRESI — bug yang pernah lolos ke penonton (2026-08-19/20):
// saat tunnel PC backup mati, player mengarahkan src ke "/sample.mp4" yang tidak
// pernah ada di public/ (malah diblokir .gitignore), jadi penonton cuma melihat
// kotak hitam tanpa keterangan. Sekarang jalur gagal WAJIB berakhir di
// "menyerah" supaya FeedPlayer menampilkan pesan + tombol Coba lagi.
describe("decideVideoError — keputusan saat <video> gagal", () => {
  it("varian resolusi gagal pertama kali -> turun ke resolusi Asli", () => {
    expect(
      decideVideoError({
        resolution: "720p",
        resolutionTried: "",
        alreadyFailed: false,
      }),
    ).toBe("turun-ke-asli");
  });

  it("resolusi yang sama gagal lagi -> menyerah (bukan loop turun-resolusi)", () => {
    expect(
      decideVideoError({
        resolution: "720p",
        resolutionTried: "720p",
        alreadyFailed: false,
      }),
    ).toBe("menyerah");
  });

  it("sudah di resolusi Asli lalu gagal -> menyerah (sumber memang mati)", () => {
    expect(
      decideVideoError({
        resolution: "",
        resolutionTried: "",
        alreadyFailed: false,
      }),
    ).toBe("menyerah");
  });

  it("sudah pernah menyerah -> abaikan, jangan proses error berulang", () => {
    expect(
      decideVideoError({
        resolution: "",
        resolutionTried: "",
        alreadyFailed: true,
      }),
    ).toBe("abaikan");
    // Berlaku juga saat masih ada varian resolusi yang belum dicoba.
    expect(
      decideVideoError({
        resolution: "1080p",
        resolutionTried: "",
        alreadyFailed: true,
      }),
    ).toBe("abaikan");
  });

  it("tidak pernah mengembalikan aksi yang menunjuk berkas fallback", () => {
    // Sengaja eksplisit: hasil yang sah cuma 3, tidak ada jalur "ganti src".
    const semuaHasil = [
      decideVideoError({ resolution: "", resolutionTried: "", alreadyFailed: false }),
      decideVideoError({ resolution: "720p", resolutionTried: "", alreadyFailed: false }),
      decideVideoError({ resolution: "720p", resolutionTried: "720p", alreadyFailed: true }),
    ];
    for (const hasil of semuaHasil) {
      expect(["turun-ke-asli", "menyerah", "abaikan"]).toContain(hasil);
    }
  });
});
