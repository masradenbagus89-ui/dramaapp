// Tes pengunci perilaku untuk videoSrc + downloadUrl (lib/video.ts).
import { describe, it, expect } from "vitest";
import { videoSrc, downloadUrl } from "../lib/video";

describe("videoSrc — bikin alamat file video", () => {
  it("resolusi asli (kode kosong) -> <ep>.mp4", () => {
    expect(videoSrc("https://x.trycloudflare.com", "drama-1", 3, "")).toBe(
      "https://x.trycloudflare.com/drama-1/3.mp4",
    );
  });

  it("ada resolusi -> <ep>.<res>.mp4", () => {
    expect(videoSrc("https://x", "d", 1, "720p")).toBe("https://x/d/1.720p.mp4");
  });

  it("baseUrl kosong (mode lokal) -> folder publik /videos/", () => {
    expect(videoSrc("", "d", 2, "")).toBe("/videos/d/2.mp4");
    expect(videoSrc("", "d", 2, "480p")).toBe("/videos/d/2.480p.mp4");
  });
});

describe("downloadUrl — bikin alamat unduh episode", () => {
  it("ada tunnel -> unduh langsung dari tunnel dengan ?dl=1", () => {
    expect(downloadUrl("https://x.trycloudflare.com", "drama-1", 3)).toBe(
      "https://x.trycloudflare.com/drama-1/3.mp4?dl=1",
    );
  });

  it("tunnel dengan garis miring di ujung -> garis miring dipotong dulu", () => {
    expect(downloadUrl("https://x.trycloudflare.com/", "d", 1)).toBe(
      "https://x.trycloudflare.com/d/1.mp4?dl=1",
    );
  });

  it("tanpa tunnel (mode lokal) -> lewat proxy /api/download", () => {
    expect(downloadUrl("", "drama-1", 2)).toBe(
      "/api/download?id=drama-1&ep=2",
    );
  });

  it("tanpa tunnel + id ada karakter spesial -> id di-encode aman", () => {
    expect(downloadUrl("", "drama a&b", 5)).toBe(
      "/api/download?id=drama%20a%26b&ep=5",
    );
  });
});
