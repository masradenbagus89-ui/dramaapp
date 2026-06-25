// Tes pengunci perilaku untuk seekTime (lib/seek.ts).
import { describe, it, expect } from "vitest";
import { seekTime } from "../lib/seek";

// Bar contoh: mulai di x=100, lebar 200 (jadi tepi kanan di x=300), durasi 60 dtk.
describe("seekTime — posisi waktu tujuan saat seek bar digeser", () => {
  it("jari di tengah bar -> setengah durasi", () => {
    expect(seekTime(200, 100, 200, 60)).toBe(30);
  });

  it("jari di tepi kiri -> detik 0", () => {
    expect(seekTime(100, 100, 200, 60)).toBe(0);
  });

  it("jari di tepi kanan -> akhir durasi", () => {
    expect(seekTime(300, 100, 200, 60)).toBe(60);
  });

  it("jari di seperempat bar -> seperempat durasi", () => {
    expect(seekTime(150, 100, 200, 60)).toBe(15);
  });

  it("jari di kiri luar bar -> dijepit ke 0 (bukan negatif)", () => {
    expect(seekTime(50, 100, 200, 60)).toBe(0);
  });

  it("jari di kanan luar bar -> dijepit ke akhir (bukan lewat durasi)", () => {
    expect(seekTime(999, 100, 200, 60)).toBe(60);
  });

  it("lebar bar 0 -> kembalikan 0 (cegah bagi-nol)", () => {
    expect(seekTime(150, 100, 0, 60)).toBe(0);
  });

  it("durasi 0 -> kembalikan 0", () => {
    expect(seekTime(200, 100, 200, 0)).toBe(0);
  });
});
