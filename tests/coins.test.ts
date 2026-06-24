// Tes pengunci perilaku untuk isEpisodeLocked (lib/coins.ts) — gerbang paywall.
// Mengunci aturan "episode mana yang terkunci" yang dulu hidup di FeedPlayer.
import { describe, it, expect } from "vitest";
import { isEpisodeLocked, FREE_EPISODES, PAYWALL_ENABLED } from "../lib/coins";

const noneUnlocked = new Set<number>();

describe("isEpisodeLocked — gerbang episode terkunci (paywall)", () => {
  it("drama non-premium: tidak pernah terkunci walau episode jauh", () => {
    expect(
      isEpisodeLocked(99, { premium: false, isAdmin: false, unlocked: noneUnlocked }),
    ).toBe(false);
  });

  it("admin: bebas, tidak pernah terkunci", () => {
    expect(
      isEpisodeLocked(99, { premium: true, isAdmin: true, unlocked: noneUnlocked }),
    ).toBe(false);
  });

  it("episode dalam jatah gratis (ep <= FREE_EPISODES): tidak terkunci", () => {
    expect(
      isEpisodeLocked(FREE_EPISODES, {
        premium: true,
        isAdmin: false,
        unlocked: noneUnlocked,
      }),
    ).toBe(false);
  });

  it("episode di luar jatah gratis & belum dibuka: TERKUNCI", () => {
    expect(
      isEpisodeLocked(FREE_EPISODES + 1, {
        premium: true,
        isAdmin: false,
        unlocked: noneUnlocked,
      }),
    ).toBe(true);
  });

  it("episode di luar jatah gratis tapi SUDAH dibuka: tidak terkunci", () => {
    const unlocked = new Set<number>([FREE_EPISODES + 1]);
    expect(
      isEpisodeLocked(FREE_EPISODES + 1, { premium: true, isAdmin: false, unlocked }),
    ).toBe(false);
  });

  it("tripwire konfigurasi: paywall sedang menyala (PAYWALL_ENABLED=true)", () => {
    // Kalau suatu saat paywall sengaja dimatikan, tes ini menyala-merah sebagai
    // pengingat bahwa SEMUA episode jadi gratis (isEpisodeLocked selalu false).
    expect(PAYWALL_ENABLED).toBe(true);
  });
});
