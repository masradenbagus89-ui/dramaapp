// Tes pengunci untuk tanda tangan alamat video (lib/video-signature.ts).
//
// Yang dijaga di sini bukan "fungsinya mengembalikan string", melainkan dua hal
// yang kalau salah berakibat nyata:
//   1. tanpa rahasia, alamat TIDAK berubah — syarat Tahap A boleh tayang
//      sebelum env diisi & sebelum tunnel menegakkan, tanpa mematikan video;
//   2. FORMATNYA cocok dengan yang diperiksa plugin `caddy-signed-urls`.
//      Untuk butir 2 tanda tangan harapan dihitung ULANG di berkas tes ini
//      dengan langkah dari dokumentasi plugin — sengaja TIDAK memanggil fungsi
//      yang sedang diuji, supaya tesnya bukan tautologi (kalau implementasinya
//      salah format, tes ini merah; kalau ia cuma memanggil dirinya sendiri,
//      salah format pun akan hijau).
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import {
  tandaTanganiUrlVideo,
  penandaTanganVideoAktif,
  UMUR_TANDA_TANGAN_DETIK,
} from "../lib/video-signature";

const RAHASIA = "rahasia-uji-jangan-dipakai-produksi";
const BASE = "https://contoh.trycloudflare.com";
const SEKARANG = 1_800_000_000; // detik Unix tetap -> hasil bisa diprediksi

let envAsli: string | undefined;
beforeEach(() => {
  envAsli = process.env.VIDEO_SIGNING_SECRET;
});
afterEach(() => {
  if (envAsli === undefined) delete process.env.VIDEO_SIGNING_SECRET;
  else process.env.VIDEO_SIGNING_SECRET = envAsli;
});

/** Hitung ulang tanda tangan memakai langkah dokumentasi plugin, bukan kode kita. */
function tandaTanganHarapan(path: string, query: Record<string, string>) {
  const urut = Object.keys(query).sort();
  const qs = urut
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`)
    .join("&");
  return createHmac("sha256", RAHASIA).update(`${path}?${qs}`).digest("base64url");
}

describe("tanpa VIDEO_SIGNING_SECRET — wajib tidak mengubah apa pun", () => {
  beforeEach(() => {
    delete process.env.VIDEO_SIGNING_SECRET;
  });

  it("alamat dikembalikan APA ADANYA", () => {
    const u = `${BASE}/drama-1/40.mp4`;
    expect(tandaTanganiUrlVideo(u, SEKARANG)).toBe(u);
  });

  it("alamat ber-?dl=1 juga apa adanya", () => {
    const u = `${BASE}/drama-1/40.mp4?dl=1`;
    expect(tandaTanganiUrlVideo(u, SEKARANG)).toBe(u);
  });

  it("penandaTanganVideoAktif() melapor MATI", () => {
    expect(penandaTanganVideoAktif()).toBe(false);
  });
});

describe("dengan rahasia — format wajib cocok dengan plugin Caddy", () => {
  beforeEach(() => {
    process.env.VIDEO_SIGNING_SECRET = RAHASIA;
  });

  it("melapor AKTIF", () => {
    expect(penandaTanganVideoAktif()).toBe(true);
  });

  it("tanda tangan sama persis dengan hitungan independen", () => {
    const hasil = new URL(tandaTanganiUrlVideo(`${BASE}/drama-1/40.mp4`, SEKARANG));
    const harapan = tandaTanganHarapan("/drama-1/40.mp4", {
      issued: String(SEKARANG),
      expires: String(SEKARANG + UMUR_TANDA_TANGAN_DETIK),
    });
    expect(hasil.searchParams.get("signature")).toBe(harapan);
  });

  it("?dl=1 dipertahankan DAN ikut ditandatangani", () => {
    const hasil = new URL(tandaTanganiUrlVideo(`${BASE}/d/1.mp4?dl=1`, SEKARANG));
    expect(hasil.searchParams.get("dl")).toBe("1");
    const harapan = tandaTanganHarapan("/d/1.mp4", {
      dl: "1",
      issued: String(SEKARANG),
      expires: String(SEKARANG + UMUR_TANDA_TANGAN_DETIK),
    });
    expect(hasil.searchParams.get("signature")).toBe(harapan);
  });

  it("issued & expires terpasang, expires = issued + umur", () => {
    const hasil = new URL(
      tandaTanganiUrlVideo(`${BASE}/d/1.mp4`, SEKARANG, 120),
    );
    expect(hasil.searchParams.get("issued")).toBe(String(SEKARANG));
    expect(hasil.searchParams.get("expires")).toBe(String(SEKARANG + 120));
  });

  it("host & path tidak berubah — cuma query yang ditambah", () => {
    const hasil = new URL(tandaTanganiUrlVideo(`${BASE}/drama-1/40.mp4`, SEKARANG));
    expect(hasil.origin).toBe(BASE);
    expect(hasil.pathname).toBe("/drama-1/40.mp4");
  });

  // Inti perbaikannya: menebak nomor episode tidak lagi menolong, karena tanda
  // tangan episode lain PASTI berbeda.
  it("episode berbeda -> tanda tangan berbeda", () => {
    const a = new URL(tandaTanganiUrlVideo(`${BASE}/d/3.mp4`, SEKARANG));
    const b = new URL(tandaTanganiUrlVideo(`${BASE}/d/40.mp4`, SEKARANG));
    expect(a.searchParams.get("signature")).not.toBe(
      b.searchParams.get("signature"),
    );
  });

  it("drama berbeda -> tanda tangan berbeda", () => {
    const a = new URL(tandaTanganiUrlVideo(`${BASE}/drama-a/1.mp4`, SEKARANG));
    const b = new URL(tandaTanganiUrlVideo(`${BASE}/drama-b/1.mp4`, SEKARANG));
    expect(a.searchParams.get("signature")).not.toBe(
      b.searchParams.get("signature"),
    );
  });

  it("waktu berbeda -> tanda tangan berbeda (tautan lama tak bisa dipakai ulang)", () => {
    const a = new URL(tandaTanganiUrlVideo(`${BASE}/d/1.mp4`, SEKARANG));
    const b = new URL(tandaTanganiUrlVideo(`${BASE}/d/1.mp4`, SEKARANG + 1));
    expect(a.searchParams.get("signature")).not.toBe(
      b.searchParams.get("signature"),
    );
  });

  it("rahasia berbeda -> tanda tangan berbeda (kunci sungguhan menentukan)", () => {
    const a = new URL(tandaTanganiUrlVideo(`${BASE}/d/1.mp4`, SEKARANG));
    process.env.VIDEO_SIGNING_SECRET = "rahasia-lain";
    const b = new URL(tandaTanganiUrlVideo(`${BASE}/d/1.mp4`, SEKARANG));
    expect(a.searchParams.get("signature")).not.toBe(
      b.searchParams.get("signature"),
    );
  });

  it("alamat yang SUDAH bertanda tangan ditandatangani ulang, bukan ditumpuk", () => {
    const sekali = tandaTanganiUrlVideo(`${BASE}/d/1.mp4`, SEKARANG);
    const duaKali = tandaTanganiUrlVideo(sekali, SEKARANG);
    expect(duaKali).toBe(sekali);
    expect([...new URL(duaKali).searchParams.keys()].filter((k) => k === "signature"))
      .toHaveLength(1);
  });

  it("base64url: tanpa padding '=' dan tanpa karakter '+' / '/'", () => {
    const sig =
      new URL(tandaTanganiUrlVideo(`${BASE}/d/1.mp4`, SEKARANG)).searchParams.get(
        "signature",
      ) ?? "";
    expect(sig).not.toMatch(/[+/=]/);
    expect(sig.length).toBeGreaterThan(20);
  });
});
