// Penjaga pindah-alamat Playly (Vercel -> Railway, 2026-09-29).
//
// KENAPA tes ini ada, dan kenapa ia tidak boleh dihapus selama env belum
// dibereskan: setelan alamat di panel Vercel (`PLAYLY_API_URL`,
// `DASHBOARD_API_URL`) MENANG atas bawaan di kode, isinya masih alamat lama,
// dan tak seorang pun di tim ini punya akses untuk menyuntingnya. Penambal di
// lib/playly-alamat.ts adalah satu-satunya yang menahan itu — dan kalau ia
// lepas, kerusakannya SENYAP: tidak ada error, cuma video yang berhenti muncul
// pada hari Playly mematikan alamat lamanya.
import { describe, expect, it } from "vitest";
import {
  HOST_PLAYLY_PENSIUN,
  PLAYLY_BASE_URL,
  pindahkanAlamatPlaylyPensiun,
} from "../lib/playly-alamat";
import { readPlaylyConfig } from "../lib/playly";
import { readDashboardConfig } from "../lib/dashboard-videos";

describe("pindahkanAlamatPlaylyPensiun — menambal alamat yang sudah ditinggalkan", () => {
  it("alamat Playly lama ditukar ke host baru", () => {
    expect(pindahkanAlamatPlaylyPensiun("https://playly-dashboard.vercel.app")).toBe(
      "https://playly-hosting-video.up.railway.app/",
    );
  });

  it("jalur dan query DIPERTAHANKAN — yang ditukar hanya hostnya", () => {
    // Ini inti perbaikannya: DASHBOARD_API_URL menunjuk endpoint, bukan akar.
    // Kalau jalurnya ikut terbuang, jalur "Video terbaru" tetap rusak.
    expect(
      pindahkanAlamatPlaylyPensiun(
        "https://playly-dashboard.vercel.app/api/videos?limit=100",
      ),
    ).toBe("https://playly-hosting-video.up.railway.app/api/videos?limit=100");
  });

  it("subdomain alamat lama ikut ditambal", () => {
    expect(
      pindahkanAlamatPlaylyPensiun("https://cdn.playly-dashboard.vercel.app/x"),
    ).toBe("https://playly-hosting-video.up.railway.app/x");
  });

  it("alamat yang BUKAN Playly pensiun dibiarkan apa adanya", () => {
    // Batas yang disengaja: fungsi ini menambal, bukan memaksakan. Setelan yang
    // menunjuk ke tempat lain tetap dihormati.
    for (const lain of [
      "https://playly-hosting-video.up.railway.app/api/videos",
      "https://dashboard-lain.example.com/api/videos",
      "https://jahatplayly-dashboard.vercel.app/x", // bukan subdomain — hanya mirip
    ]) {
      expect(pindahkanAlamatPlaylyPensiun(lain)).toBe(lain);
    }
  });

  it("nilai kosong dan potongan relatif tidak dikarang-karang", () => {
    expect(pindahkanAlamatPlaylyPensiun("")).toBe("");
    expect(pindahkanAlamatPlaylyPensiun("   ")).toBe("");
    expect(pindahkanAlamatPlaylyPensiun("/id/123/embed")).toBe("/id/123/embed");
  });

  it("daftar pensiun memuat alamat Vercel lama", () => {
    expect(HOST_PLAYLY_PENSIUN).toContain("playly-dashboard.vercel.app");
    expect(PLAYLY_BASE_URL).toBe("https://playly-hosting-video.up.railway.app");
  });
});

describe("env berisi alamat lama TIDAK BISA lagi menjatuhkan situs", () => {
  it("PLAYLY_API_URL berisi alamat pensiun tetap berujung ke alamat baru", () => {
    const c = readPlaylyConfig({
      PLAYLY_API_URL: "https://playly-dashboard.vercel.app",
    });
    expect(c.videosUrl).toBe(
      "https://playly-hosting-video.up.railway.app/api/videos",
    );
    expect(c.catalogUrl).toBe(
      "https://playly-hosting-video.up.railway.app/api/catalog",
    );
  });

  it("DASHBOARD_API_URL berisi alamat pensiun ikut pindah, jalurnya utuh", () => {
    // Nilai persis yang tercatat dipasang di Vercel (HANDOFF.md:3967).
    const c = readDashboardConfig({
      DASHBOARD_API_URL: "https://playly-dashboard.vercel.app/api/videos",
    });
    expect(c.apiUrl).toBe(
      "https://playly-hosting-video.up.railway.app/api/videos",
    );
  });

  it("DASHBOARD_API_URL kosong tetap dianggap kosong, bukan diisi diam-diam", () => {
    // Kalau kosong berubah jadi ada isinya, bagian "Video terbaru" akan muncul
    // di /discover pada pemasangan yang memang sengaja tidak memakainya.
    expect(readDashboardConfig({}).apiUrl).toBe("");
  });
});
