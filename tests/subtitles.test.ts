// @vitest-environment jsdom
//
// Tes pengunci perilaku untuk lib/subtitles.ts.
// Berkas ini pakai lingkungan "jsdom" (browser palsu) karena beberapa fungsi
// membaca/menulis window.localStorage. localStorage dibersihkan sebelum tiap
// tes supaya tidak saling memengaruhi.
import { describe, it, expect, beforeEach } from "vitest";
import {
  OFF,
  readSubtitlePref,
  writeSubtitlePref,
  initialSubtitle,
  subtitleUrl,
} from "../lib/subtitles";

beforeEach(() => {
  window.localStorage.clear();
});

describe("subtitleUrl — alamat subtitle yang di-proxy app", () => {
  it("menyusun query id/ep/lang dengan urutan tetap", () => {
    expect(subtitleUrl("drama-1", 3, "id")).toBe(
      "/api/subtitle?id=drama-1&ep=3&lang=id",
    );
  });

  it("meng-encode karakter spesial", () => {
    expect(subtitleUrl("a b", 1, "en")).toBe(
      "/api/subtitle?id=a+b&ep=1&lang=en",
    );
  });
});

describe("preferensi bahasa subtitle (localStorage)", () => {
  it("default 'id' kalau belum pernah diset", () => {
    expect(readSubtitlePref()).toBe("id");
  });

  it("menyimpan & membaca kembali pilihan user", () => {
    writeSubtitlePref("en");
    expect(readSubtitlePref()).toBe("en");
  });
});

describe("initialSubtitle — pilih bahasa awal yang tampil", () => {
  it("hormati preferensi user kalau tersedia di drama ini", () => {
    writeSubtitlePref("en");
    expect(initialSubtitle(["id", "en"])).toBe("en");
  });

  it("kalau preferensi tak tersedia, pakai bahasa pertama yang ada", () => {
    writeSubtitlePref("zh");
    expect(initialSubtitle(["id", "en"])).toBe("id");
  });

  it("kalau user memilih OFF, tetap OFF", () => {
    writeSubtitlePref(OFF);
    expect(initialSubtitle(["id", "en"])).toBe(OFF);
  });

  it("kalau drama tak punya subtitle sama sekali, jadi OFF", () => {
    expect(initialSubtitle([])).toBe(OFF);
  });
});
