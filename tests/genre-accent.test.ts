import { describe, it, expect } from "vitest";
import {
  genreTextClass,
  genreChipClass,
  genreBarClass,
} from "../lib/genre-accent";

describe("genre accent", () => {
  it("Romance pakai aksen merah-muda, bukan emas default", () => {
    expect(genreTextClass("Romance")).toContain("rose");
    expect(genreChipClass("Romance")).toContain("rose");
    expect(genreBarClass("Romance")).toContain("rose");
  });

  it("Action pakai aksen oranye", () => {
    expect(genreTextClass("Action")).toContain("orange");
  });

  it("nama tak dikenal jatuh ke putih/emas, bukan crash", () => {
    expect(genreTextClass("Western")).toBe("text-white");
    expect(genreBarClass("Western")).toContain("amber");
  });
});
