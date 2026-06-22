// Tes pengunci perilaku untuk videoSrc (lib/video.ts).
import { describe, it, expect } from "vitest";
import { videoSrc } from "../lib/video";

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
