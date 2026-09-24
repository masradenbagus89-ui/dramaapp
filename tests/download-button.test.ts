// Penjaga tombol Unduh di halaman detail drama (/drama/[id]).
//
// Dua hal yang dikunci di sini, keduanya kerusakan SENYAP kalau lepas:
//
// 1) PAYWALL. Tombol ini hanya boleh menawarkan episode yang memang gratis
//    untuk semua orang. Kalau suatu saat ada yang menaikkan DETAIL_DOWNLOAD_EP
//    ke episode berbayar, halaman detail berubah jadi pintu belakang yang
//    melewati koin — tanpa pesan error, tanpa ada yang melapor.
//
// 2) JALUR UNDUH. Alamatnya wajib relatif (lewat /api/download), BUKAN alamat
//    tunnel yang ditempel langsung. Halaman detail di-cache (revalidate = 60 +
//    generateStaticParams), sedangkan alamat tunnel berganti tiap PC backup
//    restart — alamat yang dibakar ke HTML akan menunjuk ke tempat yang sudah
//    mati. Route-nya force-dynamic, jadi ia selalu bertanya ulang.
//
// Route /api/download sendiri sudah punya penjaga terpisah di
// tests/download-redirect.test.ts (wajib menunjuk, bukan menyalurkan).
//
// DIPULIHKAN 2026-09-24. Berkas ini sempat dihapus utuh oleh 2af96b6 bersama
// tombolnya; owner meminta tombolnya kembali, jadi penjaganya ikut kembali —
// fitur yang hidup tanpa penjaga adalah persis keadaan yang melahirkan cacat
// 2026-09-22 (komponen ada, tes hijau, tapi tak pernah tergambar).
//
// SENGAJA TIDAK IKUT DIPULIHKAN: tiga tes "tombolnya benar-benar terpasang"
// yang dulu ada di bawah berkas ini. Penggantinya sudah ada dan LEBIH ketat di
// tests/unduhan-pemasangan.test.ts — ia menjaga import + render + prop provider
// + posisi (di bawah badge subtitle) + kelas sticky sekaligus. Menyalinnya ke
// sini lagi cuma membuat dua berkas yang harus disunting bersamaan tiap kali
// tata letaknya bergeser.
import { describe, it, expect } from "vitest";
import { FREE_EPISODES, PAYWALL_ENABLED, isEpisodeLocked } from "@/lib/coins";
import {
  DETAIL_DOWNLOAD_EP,
  detailDownloadUrl,
  downloadFileName,
} from "@/lib/video";

describe("tombol Unduh halaman detail — TIDAK boleh melewati paywall", () => {
  it("episode yang ditawarkan masih di dalam jatah gratis", () => {
    expect(DETAIL_DOWNLOAD_EP).toBeGreaterThanOrEqual(1);
    expect(DETAIL_DOWNLOAD_EP).toBeLessThanOrEqual(FREE_EPISODES);
  });

  it("episode itu tidak terkunci walau dramanya premium & penonton bukan admin", () => {
    const terkunci = isEpisodeLocked(DETAIL_DOWNLOAD_EP, {
      premium: true,
      isAdmin: false,
      unlocked: new Set<number>(),
    });
    expect(terkunci).toBe(false);
  });

  it("paywall memang menyala — kalau mati, tes di atas jadi hijau palsu", () => {
    // Bukan menguji tombol, tapi menguji PREMIS tes di atasnya. Tanpa baris ini
    // mematikan PAYWALL_ENABLED membuat tes ini lulus untuk alasan yang salah.
    expect(PAYWALL_ENABLED).toBe(true);
  });
});

describe("alamat unduh — wajib lewat route, bukan alamat tunnel", () => {
  it("relatif ke situs sendiri (tak ada http/tunnel yang ditempel)", () => {
    const url = detailDownloadUrl("drama-uji");
    expect(url.startsWith("/api/download?")).toBe(true);
    expect(url.includes("://")).toBe(false);
  });

  it("membawa id + ep yang benar", () => {
    expect(detailDownloadUrl("drama-uji")).toBe(
      `/api/download?id=drama-uji&ep=${DETAIL_DOWNLOAD_EP}`,
    );
  });

  it("id yang mengandung karakter aneh di-encode, tidak menyuntik query baru", () => {
    // Tanpa encodeURIComponent, id berisi "&" bisa menambahkan parameter
    // sendiri ke alamat dan menggeser arti ep.
    const url = detailDownloadUrl("aneh&ep=99");
    expect(url).toBe(`/api/download?id=aneh%26ep%3D99&ep=${DETAIL_DOWNLOAD_EP}`);
    expect(url.split("ep=").length - 1).toBe(1);
  });
});

describe("nama berkas unduhan", () => {
  it("seragam dengan tombol unduh di player: <id>-ep<n>.mp4", () => {
    expect(downloadFileName("drama-uji", 1)).toBe("drama-uji-ep1.mp4");
  });
});
