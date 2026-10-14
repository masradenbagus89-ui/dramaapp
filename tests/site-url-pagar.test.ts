// Tes penjaga untuk pagar NEXT_PUBLIC_SITE_URL di lib/site.ts.
//
// Latar: SITE_URL adalah satu-satunya sumber alamat situs untuk canonical,
// sitemap, robots.txt, dan preview share. Kalau variabelnya hilang/salah ketik,
// kode TIDAK error — ia jatuh ke DEFAULT_SITE_URL. Sesudah Vercel dipensiunkan,
// itu berarti Google diarahkan ke alamat MATI tanpa satu pun gejala di layar
// (kerusakan senyap). Lihat docs/migrasi-railway-tahap6-pindah-domain.md.
//
// Dua perilaku yang dikunci di sini, dan keduanya pernah jadi keputusan sadar:
//   1. Nilai KOSONG harus DITERIMA. Selama Tahap 2-5 migrasi Railway, kosong =
//      benar. Pagar yang berbunyi tiap build akan berhenti dibaca orang sebelum
//      migrasi sungguhan terjadi.
//   2. Nilai RUSAK harus DITOLAK, dengan pesan yang menyebut nama variabelnya —
//      bukan "Invalid URL" buntu dari new URL() di app/layout.tsx.
import { describe, expect, it, vi } from "vitest";
import { periksaAlamatSitus } from "../lib/site";

describe("periksaAlamatSitus — nilai yang harus DITERIMA", () => {
  it("kosong = sah (belum pindah domain), bukan alarm", () => {
    expect(periksaAlamatSitus("")).toBeNull();
  });

  it("blank/spasi diperlakukan sama dengan kosong", () => {
    // Variabel yang dibuat di panel hosting tapi dibiarkan blank tak bisa
    // dibedakan dari tak ada — menggagalkan build karenanya lebih merugikan.
    expect(periksaAlamatSitus("   ")).toBeNull();
  });

  it("domain https yang wajar diterima", () => {
    expect(periksaAlamatSitus("https://dramaku.com")).toBeNull();
  });

  it("alamat Railway diterima (kalau sewaktu-waktu dipakai)", () => {
    expect(
      periksaAlamatSitus("https://dramaapp-production-9e88.up.railway.app"),
    ).toBeNull();
  });

  it("http://localhost diterima untuk next dev di komputer sendiri", () => {
    expect(periksaAlamatSitus("http://localhost:3000")).toBeNull();
    expect(periksaAlamatSitus("http://127.0.0.1:3000")).toBeNull();
  });
});

describe("periksaAlamatSitus — nilai yang harus DITOLAK", () => {
  it("teks yang bukan URL ditolak dan pesannya menyebut nama variabel", () => {
    const pesan = periksaAlamatSitus("dramaku.com");
    expect(pesan).toContain("NEXT_PUBLIC_SITE_URL");
    expect(pesan).toContain("dramaku.com");
  });

  it("skema salah ketik ditolak", () => {
    expect(periksaAlamatSitus("htps://dramaku.com")).toContain(
      "NEXT_PUBLIC_SITE_URL",
    );
  });

  it("http polos di domain publik ditolak — Google menghitungnya situs lain", () => {
    const pesan = periksaAlamatSitus("http://dramaku.com");
    expect(pesan).toContain("https://");
  });

  it("nilai yang masih berisi perintah/teks acak ditolak", () => {
    // Jebakan nyata yang sudah terjadi saat memindah secret ke PC backup:
    // clipboard tertimpa, yang tersimpan ke env justru teks perintahnya.
    expect(periksaAlamatSitus("Get-Clipboard | Set-Item env:FOO")).toContain(
      "NEXT_PUBLIC_SITE_URL",
    );
  });
});

describe("pagar benar-benar MELEMPAR saat modul dimuat, bukan cuma mengembalikan pesan", () => {
  // KENAPA diuji terpisah: fungsi yang mengembalikan pesan tapi tak pernah
  // dipanggil di tingkat modul = pagar yang tak pernah menutup. "Ditulis ≠
  // terbukti jalan."
  it("nilai rusak di env membuat impor lib/site.ts gagal", async () => {
    const asli = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "bukan-alamat";
    vi.resetModules();
    try {
      await expect(import("../lib/site")).rejects.toThrow(
        /NEXT_PUBLIC_SITE_URL/,
      );
    } finally {
      if (asli === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = asli;
      vi.resetModules();
    }
  });

  it("env kosong membuat impor BERHASIL — bukti tes di atas bukan tautologi", async () => {
    const asli = process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    vi.resetModules();
    try {
      const modul = await import("../lib/site");
      expect(modul.SITE_URL).toBe("https://dramaapp.vercel.app");
    } finally {
      if (asli !== undefined) process.env.NEXT_PUBLIC_SITE_URL = asli;
      vi.resetModules();
    }
  });
});
