// Tes pengunci perilaku untuk videoSrc + decideVideoError + decideVideoStuck
// (lib/video.ts).
import { describe, it, expect } from "vitest";
import {
  videoSrc,
  decideVideoError,
  decideVideoStuck,
  BATAS_MACET_MS,
} from "../lib/video";

describe("videoSrc — bikin alamat file video", () => {
  it("resolusi asli (kode kosong) -> <ep>.mp4", () => {
    expect(videoSrc("https://x.trycloudflare.com", "drama-1", 3, "")).toBe(
      "https://x.trycloudflare.com/drama-1/3.mp4",
    );
  });

  it("ada resolusi -> <ep>.<res>.mp4", () => {
    expect(videoSrc("https://x", "d", 1, "720p")).toBe("https://x/d/1.720p.mp4");
    expect(videoSrc("https://x", "d", 1, "1080p")).toBe("https://x/d/1.1080p.mp4");
  });

  it("baseUrl kosong (mode lokal) -> folder publik /videos/", () => {
    expect(videoSrc("", "d", 2, "")).toBe("/videos/d/2.mp4");
    expect(videoSrc("", "d", 2, "480p")).toBe("/videos/d/2.480p.mp4");
  });
});

// Tes `downloadUrl` DIBUANG bersama fungsinya (2026-10-27) — lihat penanda di
// lib/video.ts. Yang dulu dijaga di sini tidak hilang: konvensi `?dl=1` sudah
// dikunci tests/download-redirect.test.ts (jalur /api/download), dan itu memang
// tempat yang lebih tepat karena di situlah gerbang paywall ikut diuji.

// PENJAGA REGRESI — bug yang pernah lolos ke penonton (2026-08-19/20):
// saat tunnel PC backup mati, player mengarahkan src ke "/sample.mp4" yang tidak
// pernah ada di public/ (malah diblokir .gitignore), jadi penonton cuma melihat
// kotak hitam tanpa keterangan. Sekarang jalur gagal WAJIB berakhir di
// "menyerah" supaya FeedPlayer menampilkan pesan + tombol Coba lagi.
describe("decideVideoError — keputusan saat <video> gagal", () => {
  it("varian resolusi gagal pertama kali -> turun ke resolusi Asli", () => {
    expect(
      decideVideoError({
        resolution: "720p",
        resolutionTried: "",
        alreadyFailed: false,
      }),
    ).toBe("turun-ke-asli");
  });

  it("resolusi yang sama gagal lagi -> menyerah (bukan loop turun-resolusi)", () => {
    expect(
      decideVideoError({
        resolution: "720p",
        resolutionTried: "720p",
        alreadyFailed: false,
      }),
    ).toBe("menyerah");
  });

  it("sudah di resolusi Asli lalu gagal -> menyerah (sumber memang mati)", () => {
    expect(
      decideVideoError({
        resolution: "",
        resolutionTried: "",
        alreadyFailed: false,
      }),
    ).toBe("menyerah");
  });

  it("sudah pernah menyerah -> abaikan, jangan proses error berulang", () => {
    expect(
      decideVideoError({
        resolution: "",
        resolutionTried: "",
        alreadyFailed: true,
      }),
    ).toBe("abaikan");
    // Berlaku juga saat masih ada varian resolusi yang belum dicoba.
    expect(
      decideVideoError({
        resolution: "1080p",
        resolutionTried: "",
        alreadyFailed: true,
      }),
    ).toBe("abaikan");
  });

  it("tidak pernah mengembalikan aksi yang menunjuk berkas fallback", () => {
    // Sengaja eksplisit: hasil yang sah cuma 3, tidak ada jalur "ganti src".
    const semuaHasil = [
      decideVideoError({ resolution: "", resolutionTried: "", alreadyFailed: false }),
      decideVideoError({ resolution: "720p", resolutionTried: "", alreadyFailed: false }),
      decideVideoError({ resolution: "720p", resolutionTried: "720p", alreadyFailed: true }),
    ];
    for (const hasil of semuaHasil) {
      expect(["turun-ke-asli", "menyerah", "abaikan"]).toContain(hasil);
    }
  });
});

describe("decideVideoStuck - macet TANPA error (laporan owner 2026-11-27)", () => {
  // Keadaan dasar: episode aktif, tidak terkunci, belum ada metadata sama
  // sekali (persis layar `0:00 / 0:00` yang difoto owner).
  const macet = {
    locked: false,
    readyState: 0,
    alreadyRefreshed: false,
    alreadyFailed: false,
  };

  it("belum ada metadata & belum pernah disegarkan -> minta alamat BARU", () => {
    // Inilah inti perbaikannya: alamat quick tunnel berganti acak tiap PC
    // backup restart, jadi tebakan pertama yang benar adalah "alamat di tangan
    // halaman ini sudah basi" - bukan "sumbernya mati".
    expect(decideVideoStuck(macet)).toBe("ambil-alamat-baru");
  });

  it("sudah disegarkan tapi tetap kosong -> menyerah (panel + Coba lagi)", () => {
    expect(decideVideoStuck({ ...macet, alreadyRefreshed: true })).toBe("menyerah");
  });

  it("metadata sudah datang -> tunggu, JANGAN diganggu", () => {
    // readyState 1 = HAVE_METADATA: durasi sudah terbaca, artinya sumbernya
    // menjawab. Mengganggu di sini akan memutus tontonan yang sedang jalan.
    for (const readyState of [1, 2, 3, 4]) {
      expect(decideVideoStuck({ ...macet, readyState })).toBe("tunggu");
      expect(
        decideVideoStuck({ ...macet, readyState, alreadyRefreshed: true }),
      ).toBe("tunggu");
    }
  });

  it("episode terkunci paywall -> tunggu, panel koin yang bicara", () => {
    // Dua panel sekaligus (koin + gagal) membuat penonton tak tahu harus
    // menekan yang mana.
    expect(decideVideoStuck({ ...macet, locked: true })).toBe("tunggu");
    expect(
      decideVideoStuck({ ...macet, locked: true, alreadyRefreshed: true }),
    ).toBe("tunggu");
  });

  it("sudah dinyatakan gagal -> tunggu, jangan menumpuk panel/loop", () => {
    expect(decideVideoStuck({ ...macet, alreadyFailed: true })).toBe("tunggu");
    expect(
      decideVideoStuck({ ...macet, alreadyFailed: true, alreadyRefreshed: true }),
    ).toBe("tunggu");
  });

  it("terkunci MENANG atas segalanya, walau sudah disegarkan & gagal", () => {
    expect(
      decideVideoStuck({
        locked: true,
        readyState: 0,
        alreadyRefreshed: true,
        alreadyFailed: true,
      }),
    ).toBe("tunggu");
  });

  it("hasilnya selalu salah satu dari tiga aksi yang dikenal", () => {
    const semua = [0, 1, 4].flatMap((readyState) =>
      [false, true].flatMap((alreadyRefreshed) =>
        [false, true].flatMap((locked) =>
          [false, true].map((alreadyFailed) =>
            decideVideoStuck({ locked, readyState, alreadyRefreshed, alreadyFailed }),
          ),
        ),
      ),
    );
    for (const hasil of semua) {
      expect(["tunggu", "ambil-alamat-baru", "menyerah"]).toContain(hasil);
    }
  });

  it("batas tunggu masuk akal: lebih lama dari sumber sekarat, bukan selamanya", () => {
    // Diukur 2026-11-27: metadata (~137 KB) tiba <1 detik pada sumber sehat
    // (400-560 KB/dtk) dan ~7 detik pada sumber sekarat 21 KB/dtk. Ambangnya
    // harus di atas 7 detik supaya tidak menuduh penonton berinternet pelan,
    // dan di bawah 30 detik supaya tidak terasa seperti situs menggantung.
    expect(BATAS_MACET_MS).toBeGreaterThan(7_000);
    expect(BATAS_MACET_MS).toBeLessThanOrEqual(30_000);
  });
});
