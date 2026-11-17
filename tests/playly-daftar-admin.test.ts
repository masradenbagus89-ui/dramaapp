// Penjaga ingatan daftar video panel admin (lib/playly-daftar-admin.ts).
//
// Kalau ingatan ini diam-diam mati, halaman IMDb tetap benar — cuma kembali
// mengunduh seluruh katalog tiap kali dibuka, dan layarnya lama lagi.
// Playly dipalsukan. Tes ini nol menyentuh jaringan.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { PlaylyConfig, PlaylyMitraResult } from "../lib/playly";

const panggil = vi.fn<(...args: unknown[]) => Promise<PlaylyMitraResult>>();

vi.mock("@/lib/playly", () => ({
  fetchPlaylyVideosKita: (...args: unknown[]) => panggil(...args),
}));

import {
  UMUR_DAFTAR_ADMIN_MS,
  ambilDaftarPlaylyAdmin,
  lupakanDaftarPlaylyAdmin,
} from "../lib/playly-daftar-admin";

const konfigurasi = { creators: ["dramaku"] } as PlaylyConfig;

let sekarang = 1_000_000;

function daftar(id: string, error: string | null = null): PlaylyMitraResult {
  return {
    videos: error
      ? []
      : [
          {
            id,
            title: id,
            durationSeconds: 60,
            durationLabel: "1:00",
            creator: "dramaku",
            embedUrl: "https://playly.contoh/e/x",
            thumbnail: null,
          },
        ],
    error,
    source: "mitra",
  };
}

beforeEach(() => {
  lupakanDaftarPlaylyAdmin();
  panggil.mockReset();
  sekarang = 1_000_000;
  vi.spyOn(Date, "now").mockImplementation(() => sekarang);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("daftar Playly admin tidak diunduh ulang tiap halaman dibuka", () => {
  it("bukaan kedua dalam semenit tidak menyentuh Playly", async () => {
    panggil.mockResolvedValue(daftar("a"));

    const pertama = await ambilDaftarPlaylyAdmin(konfigurasi);
    const kedua = await ambilDaftarPlaylyAdmin(konfigurasi);

    expect(pertama.videos.map((v) => v.id)).toEqual(["a"]);
    expect(kedua.videos.map((v) => v.id)).toEqual(["a"]);
    expect(panggil).toHaveBeenCalledTimes(1);
  });

  it("sesudah semenit, daftar lama tampil dulu dan Playly disegarkan di latar", async () => {
    panggil.mockResolvedValueOnce(daftar("lama")).mockResolvedValueOnce(daftar("baru"));

    await ambilDaftarPlaylyAdmin(konfigurasi);
    sekarang = 1_000_000 + UMUR_DAFTAR_ADMIN_MS;

    const langsung = await ambilDaftarPlaylyAdmin(konfigurasi);
    expect(langsung.videos.map((v) => v.id)).toEqual(["lama"]);

    await vi.waitFor(() => expect(panggil).toHaveBeenCalledTimes(2));

    const sesudahnya = await ambilDaftarPlaylyAdmin(konfigurasi);
    expect(sesudahnya.videos.map((v) => v.id)).toEqual(["baru"]);
    expect(panggil).toHaveBeenCalledTimes(2);
  });

  it("gagal tidak menimpa salinan yang sudah ada", async () => {
    panggil
      .mockResolvedValueOnce(daftar("aman"))
      .mockResolvedValueOnce(daftar("kosong", "Playly tidak menjawab"));

    await ambilDaftarPlaylyAdmin(konfigurasi);
    sekarang = 1_000_000 + UMUR_DAFTAR_ADMIN_MS;
    await ambilDaftarPlaylyAdmin(konfigurasi);
    await vi.waitFor(() => expect(panggil).toHaveBeenCalledTimes(2));

    // Salinan yang gagal disegarkan tetap berumur muda dari sudut "sekarang",
    // jadi bukaan ini tidak boleh memicu unduhan ketiga.
    sekarang = 1_000_000 + 1_000;
    const tetap = await ambilDaftarPlaylyAdmin(konfigurasi);
    expect(tetap.videos.map((v) => v.id)).toEqual(["aman"]);
  });
});
