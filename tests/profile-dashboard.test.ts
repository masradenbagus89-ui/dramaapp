import { describe, it, expect } from "vitest";
import {
  getFavoriteDramas,
  getContinueWatching,
} from "../lib/profile-dashboard";
import type { Drama } from "../lib/types";
import type { HistoryItem } from "../lib/progress";

function stub(
  partial: Partial<Drama> & Pick<Drama, "id" | "title">,
): Drama {
  return {
    category: "Action",
    episodes: 1,
    views: "0",
    synopsis: "",
    gradient: "from-zinc-800 to-black",
    ...partial,
  };
}

const DRAMAS: Drama[] = [
  stub({ id: "a", title: "Alpha" }),
  stub({ id: "b", title: "Beta" }),
  stub({ id: "c", title: "Gamma" }),
];

describe("getFavoriteDramas", () => {
  it("memetakan id favorit ke objek drama", () => {
    const result = getFavoriteDramas(["b", "a"], DRAMAS);
    expect(result.map((d) => d.id)).toEqual(["b", "a"]);
  });

  it("membatasi jumlah hasil", () => {
    const result = getFavoriteDramas(["a", "b", "c"], DRAMAS, 2);
    expect(result.map((d) => d.id)).toEqual(["a", "b"]);
  });

  it("mengabaikan id yang tidak punya drama", () => {
    const result = getFavoriteDramas(["x", "a", "y"], DRAMAS);
    expect(result.map((d) => d.id)).toEqual(["a"]);
  });
});

describe("getContinueWatching", () => {
  const items: HistoryItem[] = [
    { dramaId: "a", episode: 3, lastWatchedAt: "2026-08-17T10:00:00Z", positionSec: 120, durationSec: 600 },
    { dramaId: "x", episode: 1, lastWatchedAt: "2026-08-17T09:00:00Z", positionSec: 0, durationSec: 0 },
    { dramaId: "b", episode: 2, lastWatchedAt: "2026-08-17T08:00:00Z", positionSec: 300, durationSec: 600 },
    { dramaId: "c", episode: 5, lastWatchedAt: "2026-08-17T07:00:00Z", positionSec: 0, durationSec: 0 },
  ];

  it("hanya mengembalikan item yang dramanya ada", () => {
    const result = getContinueWatching(items, DRAMAS);
    expect(result.map((i) => i.dramaId)).toEqual(["a", "b", "c"]);
  });

  it("membatasi jumlah hasil", () => {
    const result = getContinueWatching(items, DRAMAS, 2);
    expect(result.map((i) => i.dramaId)).toEqual(["a", "b"]);
  });
});
