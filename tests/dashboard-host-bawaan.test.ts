// Tes pengunci: daftar host video dashboard TIDAK BOLEH kosong.
//
// Lahir dari audit keamanan 2026-11-14 (SEC-006). `hostAllowed` di
// lib/dashboard-videos.ts memperlakukan daftar KOSONG sebagai "izinkan semua",
// dan env pengisinya (DASHBOARD_VIDEO_HOSTS) memang tidak terpasang di panel
// hosting — diperiksa owner 2026-11-14. Jadi pagar itu sedang tidak berlaku:
// alamat video apa pun dari dashboard hulu diteruskan ke penonton lewat
// /api/videos, yang GET-nya publik.
//
// Kenapa perlu dijaga mesin: pagar yang mati NOL GEJALA di layar. Video tetap
// tampil, tak ada error, tak ada yang melapor. Satu-satunya yang bisa
// mengingatkan adalah tes.
//
// Yang dikunci di sini BUKAN isi daftarnya (itu boleh berubah saat host video
// pindah), melainkan tiga sifat yang tak boleh hilang: daftarnya tak pernah
// kosong, env yang lebih ketat benar-benar menggantikan bawaan, dan tidak ada
// entri yang begitu lebar sampai meloloskan seluruh penyedia hosting.
import { describe, it, expect } from "vitest";
import {
  DEFAULT_DASHBOARD_VIDEO_HOSTS,
  pilihDaftarHost,
  readDashboardConfig,
  normalizeVideos,
} from "../lib/dashboard-videos";

describe("daftar host video dashboard — tak pernah kosong (SEC-006)", () => {
  it("env tidak di-set -> jatuh ke daftar bawaan, BUKAN daftar kosong", () => {
    // Inilah keadaan produksi saat audit: DASHBOARD_VIDEO_HOSTS tidak ada.
    expect(pilihDaftarHost(undefined).length).toBeGreaterThan(0);
    expect(pilihDaftarHost(undefined)).toEqual(DEFAULT_DASHBOARD_VIDEO_HOSTS);
  });

  it("env ada tapi isinya sampah -> tetap jatuh ke bawaan", () => {
    // `","` dan spasi menghasilkan array kosong di parseAllowedHosts, dan
    // kosong justru keadaan yang dilarang.
    for (const sampah of ["", "   ", ",", " , , "]) {
      expect(pilihDaftarHost(sampah), JSON.stringify(sampah)).toEqual(
        DEFAULT_DASHBOARD_VIDEO_HOSTS,
      );
    }
  });

  it("env MENGGANTIKAN bawaan, supaya pengetatan benar-benar berlaku", () => {
    // Kalau env hanya MENAMBAHI, `supabase.co` yang lebar tak akan pernah bisa
    // dicabut lewat panel hosting — pengetatan jadi mustahil tanpa ubah kode.
    const ketat = pilihDaftarHost("abc123.supabase.co");
    expect(ketat).toEqual(["abc123.supabase.co"]);
    expect(ketat).not.toContain("supabase.co");
  });

  it("readDashboardConfig tanpa env apa pun tetap memulangkan daftar berisi", () => {
    const cfg = readDashboardConfig({});
    expect(cfg.allowedHosts.length).toBeGreaterThan(0);
  });

  it("nol entri yang meloloskan SELURUH penyedia hosting", () => {
    // Pencocokannya memakai AKHIRAN, jadi "up.railway.app" akan meloloskan
    // aplikasi Railway milik siapa pun. Host Railway/Vercel WAJIB ditulis
    // sampai subdomain penuh (alasan sama: lib/playly.ts:70-74).
    const TERLALU_LEBAR = [
      "up.railway.app",
      "railway.app",
      "vercel.app",
      "com",
      "co",
      "net",
      "id",
    ];
    for (const lebar of TERLALU_LEBAR) {
      expect(DEFAULT_DASHBOARD_VIDEO_HOSTS, lebar).not.toContain(lebar);
    }
  });
});

describe("daftar bawaan — efeknya pada video sungguhan", () => {
  const bawaan = pilihDaftarHost(undefined);

  it("meloloskan alamat video yang sah", () => {
    const sah = [
      "https://abc123.supabase.co/storage/v1/object/public/videos/a.mp4",
      "https://playly-hosting-video.up.railway.app/v/a.mp4",
      "https://cdn.amasyaforum.com/a.mp4",
    ];
    for (const url of sah) {
      expect(normalizeVideos([{ url }], bawaan).videos, url).toHaveLength(1);
    }
  });

  it("MENOLAK host asing — inilah lubang yang ditutup", () => {
    const jahat = [
      "https://penyerang.example/a.mp4",
      "https://169.254.169.254/latest/meta-data",
      "https://situs-lain.up.railway.app/a.mp4",
      // Serangan akhiran: host yang cuma BERAKHIRAN mirip, bukan subdomain.
      "https://abc123.supabase.co.evil.id/a.mp4",
      "https://jahat-amasyaforum.com/a.mp4",
    ];
    for (const url of jahat) {
      const hasil = normalizeVideos([{ url }], bawaan);
      expect(hasil.videos, url).toHaveLength(0);
      expect(hasil.rejected[0]?.reason, url).toBe("domain video belum diizinkan");
    }
  });
});
