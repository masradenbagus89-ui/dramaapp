// @vitest-environment jsdom
//
// Tes pengunci perilaku untuk lib/progress.ts (riwayat tontonan di localStorage).
import { describe, it, expect, beforeEach } from "vitest";
import {
  clearProgress,
  continueLabel,
  episodeMap,
  getProgress,
  getProgressEntry,
  groupHistoryByBucket,
  historyBucket,
  isEpisodeWatched,
  readHistory,
  removeProgress,
  resumePosition,
  setProgress,
  watchPercent,
} from "../lib/progress";

beforeEach(() => {
  window.localStorage.clear();
});

describe("format lama (angka episode) tetap terbaca", () => {
  it("membaca { id: nomor } sebagai episode tanpa tanggal", () => {
    window.localStorage.setItem(
      "dramaku:progress",
      JSON.stringify({ "drama-a": 3, "drama-b": 5 }),
    );
    expect(getProgress("drama-a")).toBe(3);
    expect(getProgress("drama-b")).toBe(5);
    const history = readHistory();
    expect(history).toHaveLength(2);
    expect(history.find((h) => h.dramaId === "drama-a")).toEqual({
      dramaId: "drama-a",
      episode: 3,
      lastWatchedAt: null,
      positionSec: 0,
      durationSec: 0,
    });
  });

  it("data tanpa tanggal masuk kelompok Lebih lama", () => {
    expect(historyBucket(null)).toBe("older");
  });
});

describe("set / get / hapus", () => {
  it("menyimpan episode dan timestamp ISO", () => {
    setProgress("d1", 4);
    expect(getProgress("d1")).toBe(4);
    const item = readHistory().find((h) => h.dramaId === "d1");
    expect(item?.episode).toBe(4);
    expect(item?.lastWatchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("drama yang belum pernah ditonton default episode 1", () => {
    expect(getProgress("tidak-ada")).toBe(1);
  });

  it("menolak episode di bawah 1", () => {
    setProgress("d1", 0);
    setProgress("d1", -2);
    expect(readHistory()).toHaveLength(0);
  });

  it("menghapus satu judul", () => {
    setProgress("d1", 2);
    setProgress("d2", 3);
    removeProgress("d1");
    expect(readHistory().map((h) => h.dramaId)).toEqual(["d2"]);
    expect(getProgress("d1")).toBe(1);
  });

  it("mengosongkan semua riwayat", () => {
    setProgress("d1", 2);
    setProgress("d2", 3);
    clearProgress();
    expect(readHistory()).toEqual([]);
  });
});

describe("urutan riwayat", () => {
  it("mengurutkan dari yang paling baru ditonton", () => {
    window.localStorage.setItem(
      "dramaku:progress",
      JSON.stringify({
        lama: { episode: 2, lastWatchedAt: "2026-08-15T10:00:00.000Z" },
        baru: { episode: 1, lastWatchedAt: "2026-08-15T12:00:00.000Z" },
      }),
    );
    expect(readHistory().map((h) => h.dramaId)).toEqual(["baru", "lama"]);
    expect(episodeMap()).toEqual({ lama: 2, baru: 1 });
  });
});

describe("kelompok tanggal", () => {
  const now = new Date(2026, 7, 15, 15, 0, 0); // 15 Agu 2026, waktu lokal mesin tes

  it("memetakan hari ini / kemarin / minggu ini / lebih lama", () => {
    expect(historyBucket(new Date(2026, 7, 15, 1, 0, 0).toISOString(), now)).toBe(
      "today",
    );
    expect(historyBucket(new Date(2026, 7, 14, 10, 0, 0).toISOString(), now)).toBe(
      "yesterday",
    );
    expect(historyBucket(new Date(2026, 7, 12, 10, 0, 0).toISOString(), now)).toBe(
      "thisWeek",
    );
    expect(historyBucket(new Date(2026, 7, 1, 10, 0, 0).toISOString(), now)).toBe(
      "older",
    );
    expect(historyBucket("bukan-tanggal", now)).toBe("older");
  });

  it("menyembunyikan kelompok yang kosong", () => {
    const groups = groupHistoryByBucket(
      [
        {
          dramaId: "a",
          episode: 1,
          lastWatchedAt: new Date(2026, 7, 15, 8, 0, 0).toISOString(),
          positionSec: 0,
          durationSec: 0,
        },
        {
          dramaId: "b",
          episode: 2,
          lastWatchedAt: new Date(2026, 7, 1, 8, 0, 0).toISOString(),
          positionSec: 0,
          durationSec: 0,
        },
      ],
      now,
    );
    expect(groups.map((g) => g.id)).toEqual(["today", "older"]);
    expect(groups[0].items.map((i) => i.dramaId)).toEqual(["a"]);
    expect(groups[1].items.map((i) => i.dramaId)).toEqual(["b"]);
  });
});

describe("posisi detik", () => {
  it("menyimpan positionSec dan durationSec tanpa merusak episode", () => {
    setProgress("d1", 18, { positionSec: 755, durationSec: 1200 });
    const item = readHistory().find((h) => h.dramaId === "d1");
    expect(item?.episode).toBe(18);
    expect(item?.positionSec).toBe(755);
    expect(item?.durationSec).toBe(1200);
    expect(continueLabel(item!)).toBe("Lanjut Menonton Episode 18 dari 12:35");
    expect(watchPercent(item!, 40)).toBe(63);
  });

  it("format lama tanpa detik tetap resume 0", () => {
    window.localStorage.setItem(
      "dramaku:progress",
      JSON.stringify({ d1: { episode: 4, lastWatchedAt: "2026-08-15T10:00:00.000Z" } }),
    );
    const entry = getProgressEntry("d1");
    expect(resumePosition(entry, 4)).toBe(0);
    expect(isEpisodeWatched(entry, 3)).toBe(true);
    expect(isEpisodeWatched(entry, 4)).toBe(false);
  });

  it("resume menolak posisi terlalu awal atau hampir habis", () => {
    setProgress("d1", 2, { positionSec: 3, durationSec: 100 });
    expect(resumePosition(getProgressEntry("d1"), 2)).toBe(0);
    setProgress("d1", 2, { positionSec: 96, durationSec: 100 });
    expect(resumePosition(getProgressEntry("d1"), 2)).toBe(0);
    setProgress("d1", 2, { positionSec: 40, durationSec: 100 });
    expect(resumePosition(getProgressEntry("d1"), 2)).toBe(40);
  });

  it("completed menandai episode selesai", () => {
    setProgress("d1", 1, { positionSec: 10, durationSec: 100, completed: true });
    expect(isEpisodeWatched(getProgressEntry("d1"), 1)).toBe(true);
  });
});
