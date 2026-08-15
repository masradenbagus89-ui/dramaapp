// Tes pengunci perilaku untuk jembatan ke dashboard upload
// (lib/dashboard-videos.ts). Fokus: penerjemah bentuk JSON + aturan alamat.
import { describe, it, expect } from "vitest";
import {
  normalizeVideoDetail,
  normalizeVideos,
  parseAllowedHosts,
  readDashboardConfig,
} from "../lib/dashboard-videos";

const URL_VIDEO = "https://xyz.supabase.co/storage/v1/object/public/videos/a.mp4";

describe("normalizeVideos — penerjemah daftar video", () => {
  it("bentuk Supabase biasa (array + snake_case)", () => {
    const raw = [
      {
        id: "v1",
        title: "Episode 1",
        description: "Awal cerita",
        video_url: URL_VIDEO,
        thumbnail_url: "https://xyz.supabase.co/storage/v1/object/public/thumbs/a.jpg",
        created_at: "2026-08-12T00:00:00Z",
      },
    ];
    const { videos, rejected } = normalizeVideos(raw);
    expect(rejected).toHaveLength(0);
    expect(videos[0]).toEqual({
      id: "v1",
      title: "Episode 1",
      description: "Awal cerita",
      videoUrl: URL_VIDEO,
      thumbnail: "https://xyz.supabase.co/storage/v1/object/public/thumbs/a.jpg",
      createdAt: "2026-08-12T00:00:00Z",
    });
  });

  it("daftar dibungkus { data: [...] } + nama field camelCase", () => {
    const raw = { data: [{ id: "v2", judul: "Judul ID", videoUrl: URL_VIDEO }] };
    const { videos } = normalizeVideos(raw);
    expect(videos).toHaveLength(1);
    expect(videos[0].title).toBe("Judul ID");
  });

  it("daftar bersarang { result: { rows: [...] } }", () => {
    const raw = { result: { rows: [{ url: URL_VIDEO }] } };
    expect(normalizeVideos(raw).videos).toHaveLength(1);
  });

  it("tanpa judul -> judul cadangan, tanpa deskripsi -> teks kosong", () => {
    const { videos } = normalizeVideos([{ url: URL_VIDEO }]);
    expect(videos[0].title).toBe("Video 1");
    expect(videos[0].description).toBe("");
    expect(videos[0].thumbnail).toBeNull();
  });

  it("tanpa alamat video -> dibuang + alasan dicatat", () => {
    const { videos, rejected } = normalizeVideos([{ title: "Kosong" }]);
    expect(videos).toHaveLength(0);
    expect(rejected[0].reason).toBe("tidak ada alamat video");
  });

  it("alamat http (bukan https) -> ditolak", () => {
    const { videos, rejected } = normalizeVideos([{ url: "http://xyz.co/a.mp4" }]);
    expect(videos).toHaveLength(0);
    expect(rejected[0].reason).toBe("alamat video harus https");
  });

  it("thumbnail http -> dibuang jadi null, videonya tetap lolos", () => {
    const { videos } = normalizeVideos([
      { url: URL_VIDEO, thumbnail: "http://gambar.com/a.jpg" },
    ]);
    expect(videos[0].thumbnail).toBeNull();
    expect(videos[0].videoUrl).toBe(URL_VIDEO);
  });

  it("daftar izin KOSONG -> semua https diterima (beda dari jalur iframe)", () => {
    expect(normalizeVideos([{ url: URL_VIDEO }], []).videos).toHaveLength(1);
  });

  it("daftar izin DIISI -> hanya domain itu yang lolos", () => {
    const izin = ["xyz.supabase.co"];
    expect(normalizeVideos([{ url: URL_VIDEO }], izin).videos).toHaveLength(1);

    const asing = normalizeVideos([{ url: "https://lain.com/a.mp4" }], izin);
    expect(asing.videos).toHaveLength(0);
    expect(asing.rejected[0].reason).toBe("domain video belum diizinkan");
  });

  it("domain yang cuma MIRIP -> tetap ditolak", () => {
    const izin = ["xyz.supabase.co"];
    const hasil = normalizeVideos([{ url: "https://xyz.supabase.co.evil.id/a.mp4" }], izin);
    expect(hasil.videos).toHaveLength(0);
  });

  it("JSON tak dikenal -> kosong, tidak error", () => {
    expect(normalizeVideos({ pesan: "halo" }).videos).toHaveLength(0);
    expect(normalizeVideos(null).videos).toHaveLength(0);
  });
});

describe("normalizeVideoDetail — penerjemah detail 1 video", () => {
  it("objek polos", () => {
    const v = normalizeVideoDetail({ id: "v9", title: "Satu", video_url: URL_VIDEO });
    expect(v?.id).toBe("v9");
  });

  it("dibungkus { data: {...} }", () => {
    const v = normalizeVideoDetail({ data: { id: "v10", url: URL_VIDEO } });
    expect(v?.id).toBe("v10");
  });

  it("dibungkus { video: {...} }", () => {
    const v = normalizeVideoDetail({ video: { id: "v11", url: URL_VIDEO } });
    expect(v?.id).toBe("v11");
  });

  it("tidak ada alamat video -> null", () => {
    expect(normalizeVideoDetail({ title: "kosong" })).toBeNull();
  });
});

describe("parseAllowedHosts & readDashboardConfig", () => {
  it("daftar domain dirapikan", () => {
    expect(parseAllowedHosts("https://A.co/x, b.co")).toEqual(["a.co", "b.co"]);
  });

  it("garis miring di ujung alamat API dipotong", () => {
    const cfg = readDashboardConfig({
      DASHBOARD_API_URL: " https://playly-dashboard.vercel.app/api/videos/ ",
    });
    expect(cfg.apiUrl).toBe("https://playly-dashboard.vercel.app/api/videos");
  });

  it("env kosong -> apiUrl kosong (nanti dibalas 503 oleh route)", () => {
    expect(readDashboardConfig({}).apiUrl).toBe("");
  });
});
