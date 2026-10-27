// PENJAGA PALING PENTING DI TAHAP B — kecocokan dua sisi.
//
// Tanda tangan dibuat di SITUS (`lib/video-signature.ts`, TypeScript) dan
// diperiksa di PC BACKUP (`pc-backup-agent/hardlink-agent.js`, JavaScript
// biasa). Keduanya WAJIB sepakat sampai ke byte terakhir.
//
// Kenapa ini tidak bisa diserahkan ke compiler: berkas agent **disalin MANUAL**
// ke PC backup, tidak ikut `npm`, tidak ikut build, dan tidak pernah dilihat
// `tsc`. Jadi satu-satunya hal yang bisa menangkap kedua sisi melenceng adalah
// tes ini. Kalau melenceng, akibatnya bukan error yang rapi — **SELURUH video
// mati**, termasuk episode gratis.
//
// Caranya sengaja ujung-ke-ujung: tanda tangan DIBUAT dengan kode situs yang
// sesungguhnya, lalu DIPERIKSA dengan fungsi agent yang sesungguhnya. Tidak ada
// nilai harapan yang ditulis tangan — kalau salah satu sisi berubah format,
// tes ini merah tanpa perlu ada yang ingat memperbaruinya.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRequire } from "node:module";
import {
  tandaTanganiUrlVideo,
  UMUR_TANDA_TANGAN_DETIK,
} from "../lib/video-signature";

const require_ = createRequire(import.meta.url);
const agent = require_("../pc-backup-agent/hardlink-agent.js") as {
  periksaTandaTanganVideo: (
    uri: string | undefined,
    rahasia: string,
    sekarangDetik: number,
  ) => { boleh: boolean; sebab: string };
};
const { periksaTandaTanganVideo } = agent;

const RAHASIA = "rahasia-uji-dua-sisi";
const BASE = "https://contoh.trycloudflare.com";
const SEKARANG = 1_800_000_000;

/** Ambil bagian yang dikirim Caddy di X-Forwarded-Uri: path + query saja. */
function sebagaiUri(urlPenuh: string): string {
  const u = new URL(urlPenuh);
  return u.pathname + u.search;
}

let envAsli: string | undefined;
beforeEach(() => {
  envAsli = process.env.VIDEO_SIGNING_SECRET;
  process.env.VIDEO_SIGNING_SECRET = RAHASIA;
});
afterEach(() => {
  if (envAsli === undefined) delete process.env.VIDEO_SIGNING_SECRET;
  else process.env.VIDEO_SIGNING_SECRET = envAsli;
});

describe("situs menandatangani -> PC backup menerima", () => {
  it("alamat video biasa", () => {
    const uri = sebagaiUri(tandaTanganiUrlVideo(`${BASE}/drama-1/40.mp4`, SEKARANG));
    expect(periksaTandaTanganVideo(uri, RAHASIA, SEKARANG)).toEqual({
      boleh: true,
      sebab: "sah",
    });
  });

  it("alamat unduh ber-?dl=1", () => {
    const uri = sebagaiUri(tandaTanganiUrlVideo(`${BASE}/drama-1/7.mp4?dl=1`, SEKARANG));
    expect(periksaTandaTanganVideo(uri, RAHASIA, SEKARANG).boleh).toBe(true);
  });

  it("alamat ber-resolusi (nama berkas bertitik dua kali)", () => {
    const uri = sebagaiUri(tandaTanganiUrlVideo(`${BASE}/d/3.720p.mp4`, SEKARANG));
    expect(periksaTandaTanganVideo(uri, RAHASIA, SEKARANG).boleh).toBe(true);
  });

  it("masih sah sesaat SEBELUM kedaluwarsa", () => {
    const uri = sebagaiUri(tandaTanganiUrlVideo(`${BASE}/d/1.mp4`, SEKARANG));
    const detikTerakhir = SEKARANG + UMUR_TANDA_TANGAN_DETIK;
    expect(periksaTandaTanganVideo(uri, RAHASIA, detikTerakhir).boleh).toBe(true);
  });
});

describe("yang WAJIB ditolak", () => {
  it("lewat satu detik dari masa berlaku -> kedaluwarsa", () => {
    const uri = sebagaiUri(tandaTanganiUrlVideo(`${BASE}/d/1.mp4`, SEKARANG));
    const hasil = periksaTandaTanganVideo(
      uri,
      RAHASIA,
      SEKARANG + UMUR_TANDA_TANGAN_DETIK + 1,
    );
    expect(hasil).toEqual({ boleh: false, sebab: "kedaluwarsa" });
  });

  it("tanpa tanda tangan sama sekali (alamat polos lama yang beredar)", () => {
    const hasil = periksaTandaTanganVideo("/drama-1/40.mp4", RAHASIA, SEKARANG);
    expect(hasil).toEqual({ boleh: false, sebab: "tanpa-tanda-tangan" });
  });

  // INI INTI PERBAIKANNYA: menebak nomor episode tidak lagi menolong.
  it("nomor episode diganti setelah ditandatangani", () => {
    const uri = sebagaiUri(tandaTanganiUrlVideo(`${BASE}/drama-1/3.mp4`, SEKARANG));
    const dicurangi = uri.replace("/3.mp4", "/40.mp4");
    expect(periksaTandaTanganVideo(dicurangi, RAHASIA, SEKARANG)).toEqual({
      boleh: false,
      sebab: "tanda-tangan-salah",
    });
  });

  it("drama lain dengan tanda tangan milik drama ini", () => {
    const uri = sebagaiUri(tandaTanganiUrlVideo(`${BASE}/drama-a/1.mp4`, SEKARANG));
    const dicurangi = uri.replace("/drama-a/", "/drama-b/");
    expect(periksaTandaTanganVideo(dicurangi, RAHASIA, SEKARANG).boleh).toBe(false);
  });

  it("masa berlaku diperpanjang sendiri oleh penyerang", () => {
    const uri = sebagaiUri(tandaTanganiUrlVideo(`${BASE}/d/1.mp4`, SEKARANG));
    const asli = Number(new URLSearchParams(uri.split("?")[1]).get("expires"));
    const dicurangi = uri.replace(`expires=${asli}`, `expires=${asli + 99999}`);
    expect(periksaTandaTanganVideo(dicurangi, RAHASIA, SEKARANG).boleh).toBe(false);
  });

  it("tanda tangan diutak-atik satu huruf", () => {
    const uri = sebagaiUri(tandaTanganiUrlVideo(`${BASE}/d/1.mp4`, SEKARANG));
    const p = new URLSearchParams(uri.split("?")[1]);
    const sig = p.get("signature")!;
    const rusak = (sig[0] === "A" ? "B" : "A") + sig.slice(1);
    expect(sig).not.toBe(rusak); // buktikan benar-benar berubah
    p.set("signature", rusak);
    const hasil = periksaTandaTanganVideo(
      `${uri.split("?")[0]}?${p.toString()}`,
      RAHASIA,
      SEKARANG,
    );
    expect(hasil.boleh).toBe(false);
  });

  it("ditandatangani dengan rahasia LAIN", () => {
    process.env.VIDEO_SIGNING_SECRET = "rahasia-penyerang";
    const uri = sebagaiUri(tandaTanganiUrlVideo(`${BASE}/d/1.mp4`, SEKARANG));
    expect(periksaTandaTanganVideo(uri, RAHASIA, SEKARANG).boleh).toBe(false);
  });

  it("uri ngawur / tak terkirim", () => {
    expect(periksaTandaTanganVideo(undefined, RAHASIA, SEKARANG).boleh).toBe(false);
    expect(periksaTandaTanganVideo("bukan-path", RAHASIA, SEKARANG).boleh).toBe(false);
  });
});

describe("SAKLAR DARURAT — rahasia kosong di PC backup", () => {
  // Ini jalan mundur paling cepat kalau Tahap B bermasalah: hapus env var di
  // PC backup, jalankan ulang agent, video kembali seperti sebelum Tahap B —
  // tanpa menyentuh Caddyfile, tanpa menunggu rilis.
  it("alamat POLOS pun diloloskan saat rahasia kosong", () => {
    expect(periksaTandaTanganVideo("/drama-1/40.mp4", "", SEKARANG)).toEqual({
      boleh: true,
      sebab: "pemeriksaan-mati",
    });
  });

  it("alamat kedaluwarsa pun diloloskan saat rahasia kosong", () => {
    const uri = sebagaiUri(tandaTanganiUrlVideo(`${BASE}/d/1.mp4`, SEKARANG));
    expect(periksaTandaTanganVideo(uri, "", SEKARANG + 999_999).boleh).toBe(true);
  });
});
