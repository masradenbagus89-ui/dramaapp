import { describe, it, expect } from "vitest";
import {
  calculateUnlockAllPrice,
  COIN_PER_EPISODE,
  FREE_EPISODES,
} from "../lib/coins";

describe("calculateUnlockAllPrice", () => {
  it("menghitung harga sisa episode dengan diskon", () => {
    // total 10, unlocked 2 → sisa = 10 - 3 - 2 = 5
    // harga = ceil(5 * 8 * 0.8) = ceil(32) = 32
    expect(calculateUnlockAllPrice(10, 2)).toBe(32);
  });

  it("tanpa diskon = harga penuh", () => {
    // total 10, unlocked 0 → sisa = 7
    // harga = ceil(7 * 8 * 1.0) = 56
    expect(calculateUnlockAllPrice(10, 0, 1.0)).toBe(56);
  });

  it("semua episode sudah gratis/dibuka = 0", () => {
    expect(calculateUnlockAllPrice(3, 0)).toBe(0);
    expect(calculateUnlockAllPrice(10, 7)).toBe(0);
  });

  it("episode <= FREE_EPISODES = 0", () => {
    expect(calculateUnlockAllPrice(FREE_EPISODES, 0)).toBe(0);
  });

  it("diskon tidak pernah membuat harga 0", () => {
    expect(calculateUnlockAllPrice(4, 0)).toBeGreaterThanOrEqual(1);
  });
});
