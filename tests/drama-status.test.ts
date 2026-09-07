import { describe, it, expect } from "vitest";
import { DRAMA_STATUS_OPTIONS, parseDramaStatus } from "../lib/types";
import { cardBadges } from "../lib/beranda-catalog";
import type { Drama } from "../lib/types";

function stub(partial: Partial<Drama> = {}): Drama {
  return {
    id: "d",
    title: "Drama",
    category: "Action",
    episodes: 10,
    views: "0",
    synopsis: "",
    gradient: "from-zinc-800 to-black",
    ...partial,
  };
}

describe("parseDramaStatus — penjaga di sisi server", () => {
  it("menerima dua nilai yang sah", () => {
    expect(parseDramaStatus("Ongoing")).toBe("Ongoing");
    expect(parseDramaStatus("Completed")).toBe("Completed");
  });

  it("nilai ngawur dianggap KOSONG, bukan disimpan apa adanya", () => {
    // Form admin cuma punya 2 pilihan, tapi endpoint admin bisa dikirimi body
    // apa saja — ini pagarnya.
    expect(parseDramaStatus("Tamat")).toBeUndefined();
    expect(parseDramaStatus("ongoing")).toBeUndefined(); // beda huruf besar
    expect(parseDramaStatus("DROP TABLE dramas")).toBeUndefined();
    expect(parseDramaStatus(123)).toBeUndefined();
    expect(parseDramaStatus(true)).toBeUndefined();
    expect(parseDramaStatus({})).toBeUndefined();
  });

  it("kosong tetap kosong", () => {
    expect(parseDramaStatus("")).toBeUndefined();
    expect(parseDramaStatus(null)).toBeUndefined();
    expect(parseDramaStatus(undefined)).toBeUndefined();
  });

  it("pilihan form hanya berisi nilai yang lolos penjaga", () => {
    for (const opt of DRAMA_STATUS_OPTIONS) {
      expect(parseDramaStatus(opt.value)).toBe(opt.value);
      expect(opt.label.length).toBeGreaterThan(0);
    }
  });
});

describe("status kosong TIDAK BOLEH ditebak jadi Ongoing", () => {
  // Ini penjaga bug yang pernah lolos ke produksi: HomeHero dulu menulis
  // `hero.status || "Ongoing"`, sehingga SEMUA judul — termasuk yang sudah
  // tamat — dilabeli ONGOING. Tidak ada error, jadi tak ada yang melapor.
  it("drama tanpa status tidak menghasilkan label apa pun", () => {
    expect(cardBadges(stub()).status).toBeNull();
  });

  it("status yang terisi tetap tampil apa adanya", () => {
    expect(cardBadges(stub({ status: "Ongoing" })).status).toBe("ONGOING");
    expect(cardBadges(stub({ status: "Completed" })).status).toBe("TAMAT");
  });
});
