import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { posisiGulungKeTujuan } from "../lib/gulung-daftar";

/**
 * DAFTAR EPISODE MENGGULUNG SENDIRI KE EPISODE TERAKHIR (owner 2026-11-02)
 *
 * Sesudah daftar episode pindah ke kolom sempit (rilis e90e967), serial 45
 * episode selalu terbuka di episode 1 — penonton yang sudah sampai episode 30
 * harus menggulung sendiri dari atas SETIAP kali membuka halaman.
 */
describe("posisiGulungKeTujuan — aritmatika gulungan", () => {
  const JARAK = 72;

  it("menggulung ke tujuan, menyisakan satu kartu sebagai konteks", () => {
    // Episode 30 dari 45: tujuannya 2.030px dari puncak isi daftar.
    expect(
      posisiGulungKeTujuan({
        atasTujuan: 2030,
        jarakKonteks: JARAK,
        scrollHeight: 3100,
        clientHeight: 420,
      }),
    ).toBe(2030 - JARAK);
  });

  it("🪤 kotak yang TIDAK bisa digulung dilewati (tata letak HP)", () => {
    // Di bawah `lg` daftarnya mengalir mengikuti halaman: isinya setinggi
    // kotaknya, jadi scrollHeight === clientHeight. Kalau fungsi ini tetap
    // memulangkan angka, percobaan berikutnya akan menduga gulungannya
    // "tidak jalan" lalu menggantinya dengan scrollIntoView — dan ITU
    // menggulung halamannya, melompatkan penonton melewati hero.
    expect(
      posisiGulungKeTujuan({
        atasTujuan: 2030,
        jarakKonteks: JARAK,
        scrollHeight: 3100,
        clientHeight: 3100,
      }),
    ).toBeNull();

    // scrollHeight < clientHeight (isi lebih pendek dari kotaknya) juga.
    expect(
      posisiGulungKeTujuan({
        atasTujuan: 100,
        jarakKonteks: JARAK,
        scrollHeight: 200,
        clientHeight: 420,
      }),
    ).toBeNull();
  });

  it("tujuan yang sudah terlihat di layar pertama TIDAK digulung", () => {
    // Episode 1 dan 2 sudah terlihat tanpa digulung. Menarik daftar ke posisi
    // negatif lalu dijepit jadi 0 adalah gerakan yang tak menghasilkan apa-apa
    // — tapi di layar terbaca sebagai kedutan saat halaman dibuka.
    for (const atas of [0, 40, 72]) {
      expect(
        posisiGulungKeTujuan({
          atasTujuan: atas,
          jarakKonteks: JARAK,
          scrollHeight: 3100,
          clientHeight: 420,
        }),
        `atasTujuan ${atas} seharusnya tidak memicu gulungan`,
      ).toBeNull();
    }
  });

  it("tidak pernah memulangkan angka negatif", () => {
    // Dijaga lewat ambang di atas, bukan lewat Math.max — kalau ambangnya
    // dilepas suatu hari, tes ini yang menangkap.
    for (const atas of [0, 1, 50, 71, 72, 73, 500, 5000]) {
      const hasil = posisiGulungKeTujuan({
        atasTujuan: atas,
        jarakKonteks: JARAK,
        scrollHeight: 3100,
        clientHeight: 420,
      });
      if (hasil !== null) expect(hasil).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("EpisodeList memakai gulungan yang tidak melompatkan halaman", () => {
  const SUMBER = readFileSync("app/components/EpisodeList.tsx", "utf-8");
  /** Komentar dibuang: di sana `scrollIntoView` disebut untuk menjelaskan
   *  kenapa ia DIHINDARI — penjelasan yang benar, bukan pelanggaran. Jebakan
   *  ini sudah memakan waktu di tests/film-terkait.test.ts. */
  const KODE = SUMBER.split("/*")
    .map((bagian, i) => (i === 0 ? bagian : bagian.split("*/").slice(1).join("*/")))
    .join("")
    .split("\n")
    .filter((baris) => !baris.trim().startsWith("//"))
    .join("\n");

  it("🪤 TIDAK memakai scrollIntoView", () => {
    // `scrollIntoView` menggulung SEMUA leluhur yang bisa digulung, termasuk
    // halaman itu sendiri. Penonton membuka halaman drama lalu halamannya
    // melompat ke tengah tanpa ia menyentuh apa pun — dan tak ada error apa
    // pun yang memberi tahu. Yang benar: geser `scrollTop` kotaknya saja.
    expect(
      KODE,
      "scrollIntoView akan menggulung halamannya, bukan cuma daftarnya",
    ).not.toContain("scrollIntoView");
    expect(KODE).toContain("daftar.scrollTop = posisi");
  });

  it("menggulung SEKALI saja per kunjungan", () => {
    // `entry` disegarkan tiap `dramaku:progress-changed` menyala. Tanpa pagar
    // ini daftar melompat sendiri tepat saat penonton menggulungnya dengan
    // jari — gangguan yang tidak akan dilaporkan siapa pun sebagai "bug".
    expect(KODE).toContain("if (sudahMenggulung.current) return;");
    expect(KODE).toContain("sudahMenggulung.current = true;");
  });

  it("mengukur sesudah satu frame, bukan langsung", () => {
    // Mengukur sebelum tata letak final menghasilkan nol, dan gulungannya
    // gagal diam-diam.
    expect(KODE).toContain("requestAnimationFrame");
    expect(KODE).toContain("cancelAnimationFrame");
  });

  it("aturan 'bisa digulung atau tidak' hidup di SATU tempat", () => {
    // Guard tinggi pernah ditulis dua kali (di komponen DAN di lib). Dua
    // salinan aturan yang sama pasti menyimpang suatu hari.
    expect(KODE).toContain("posisiGulungKeTujuan({");
    expect(
      KODE.includes("scrollHeight <= daftar.clientHeight"),
      "guard tinggi disalin kembali ke komponen",
    ).toBe(false);
  });

  it("tujuannya episode yang terakhir ditonton, bukan aturan baru", () => {
    // `entry.episode` adalah satu-satunya sumber "sampai mana penonton"
    // (lib/progress.ts). Menebaknya ulang di sini akan menyimpang dari
    // tombol "Lanjut Nonton" yang memakai sumber yang sama.
    expect(KODE).toContain("ep === entry?.episode ? tujuanRef : null");
  });
});
