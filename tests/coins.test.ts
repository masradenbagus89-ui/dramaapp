// Tes pengunci perilaku untuk isEpisodeLocked (lib/coins.ts) — gerbang paywall.
// Mengunci aturan "episode mana yang terkunci" yang dulu hidup di FeedPlayer.
import { describe, it, expect, vi } from "vitest";
import { isEpisodeLocked, FREE_EPISODES } from "../lib/coins";
// Tes ini menguji perilaku SAAT KOIN/IKLAN MENYALA, dan sejak 2026-10-28
// saklarnya DIJEDA di lib/saklar-fitur.ts (keputusan owner). Saklarnya dipaku
// MENYALA di sini dengan sengaja: perilaku paywall/iklan harus tetap terbukti
// hijau selama dijeda, kalau tidak jalur "nyalakan kembali" berangkat tanpa
// satu pun penjaga. Keadaan JEDA-nya diuji terpisah di tests/jeda-koin-iklan.test.ts.
vi.mock("@/lib/saklar-fitur", () => ({
  PAYWALL_ENABLED: true,
  ADS_ENABLED: true,
}));

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

  // Tripwire "paywall sedang menyala" DIPINDAH ke tests/jeda-koin-iklan.test.ts
  // (2026-10-28). Harus pindah: berkas ini memaku saklarnya MENYALA lewat
  // vi.mock di atas, jadi tripwire di sini hanya akan membaca tiruannya sendiri
  // dan selamanya hijau — penjaga yang tak pernah bisa merah.
});
