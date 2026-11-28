// Penjaga PAGINATION di halaman /discover — owner 2026-11-28:
// *"di menu terpopuler kamu buatkan pagination agar lebih mudah (pagination
// seperti yang diadmin/imdb biar seragam"*.
//
// ⚠️ TIGA kerusakan yang dijaga di sini, ketiganya SENYAP — halaman tetap 200,
// build tetap hijau, tak satu pun error muncul:
//   1. grid kembali menggambar SELURUH hasil (ratusan kartu satu gulungan);
//   2. pagination dibuat ULANG sebagai komponen kedua, lalu menyimpang dari
//      yang di panel admin — padahal "biar seragam" itu permintaannya;
//   3. ganti penyaring tidak memulangkan ke halaman 1, sehingga penonton
//      mendarat di tengah daftar baru dan melewatkan halaman-halaman awal.
//
// Dibaca dari SUMBER, bukan dari render: komponennya memakai
// `useSearchParams()` sehingga butuh router Next yang tidak ada di vitest, dan
// yang mau dikunci memang keputusan strukturnya.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  HALAMAN_PERTAMA,
  UKURAN_BAWAAN,
  hitungJumlahHalaman,
  jepitHalaman,
  potongHalaman,
} from "../lib/paginasi";

const BROWSER = readFileSync("app/components/DramaBrowser.tsx", "utf-8");

/** Buang komentar: tiap patokan "tidak boleh ada" di bawah bisa lulus palsu
 *  karena menemukan kalimatnya di dalam komentar yang justru menerangkannya. */
const KODE = BROWSER.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("/discover memakai pagination yang SAMA dengan panel admin", () => {
  it("memakai komponen admin, bukan bikin yang kedua", () => {
    expect(
      KODE,
      "PaginasiDaftar tidak dipasang — owner meminta pagination di sini",
    ).toContain("<PaginasiDaftar");
    expect(
      KODE,
      "komponennya tidak diimpor dari panel admin, jadi tampilannya bisa " +
        'menyimpang — owner meminta "biar seragam"',
    ).toMatch(/import PaginasiDaftar from "\.\/admin\/PaginasiDaftar"/);
  });

  it("grid menggambar SATU halaman, bukan seluruh hasil", () => {
    // Inilah inti permintaannya. `hasil.map` yang kembali = pagination jadi
    // hiasan: tombolnya ada, tapi semua kartu tetap tergambar sekaligus.
    expect(
      KODE,
      "grid kembali menggambar seluruh hasil — pagination jadi hiasan",
    ).not.toMatch(/\{hasil\.map\(/);
    expect(KODE).toMatch(/\{hasilHalaman\.map\(/);
  });

  it("nomor halaman dijepit, tidak dipakai mentah", () => {
    // Jumlah hasil berubah terus (penyaring, pencarian). Nomor halaman yang
    // tertinggal di luar jangkauan menggambar grid KOSONG — terbaca seperti
    // katalog habis.
    expect(KODE).toContain("jepitHalaman(");
    expect(KODE).toContain("potongHalaman(");
  });

  it("ganti penyaring memulangkan ke halaman pertama", () => {
    expect(
      KODE,
      "tidak ada yang memulangkan ke halaman 1 saat penyaring berubah",
    ).toMatch(/setHalaman\(HALAMAN_PERTAMA\)/);
  });

  it("kontrolnya disembunyikan kalau hasilnya cuma satu halaman", () => {
    // Tombol yang mati semua untuk 12 judul cuma menambah barang di layar.
    expect(KODE).toMatch(/hasil\.length > ukuran/);
  });
});

describe("warnanya mengikuti latar, bentuknya tetap satu", () => {
  // Komponennya lahir untuk panel admin yang berlatar PUTIH, lalu dipakai
  // ulang di /discover yang berlatar anggur tua. Dipasang apa adanya,
  // kontrasnya TERUKUR 3.28:1 (tulisan "Baris:") dan 2.37:1 (nomor halaman
  // aktif) — di bawah ambang WCAG AA 4.5:1, alias teks nyaris tak terbaca.
  // Sesudah varian gelap: 10.7:1 dan 7.68:1.
  //
  // ⚠️ Kerusakannya SENYAP sepenuhnya: tidak ada error, tidak ada tes lain
  // yang merah, halaman tetap 200. Yang terjadi cuma penonton tidak bisa
  // membaca nomor halamannya.
  const KOMPONEN = readFileSync(
    "app/components/admin/PaginasiDaftar.tsx",
    "utf-8",
  );

  it("/discover meminta varian gelap", () => {
    expect(
      KODE,
      "/discover memakai warna versi admin (latar putih) di latar gelap",
    ).toMatch(/varian="gelap"/);
  });

  it("varian bawaannya TERANG, jadi panel admin tidak ikut berubah", () => {
    // Pagar terpenting blok ini: menambah varian baru tidak boleh menggeser
    // satu piksel pun di halaman admin yang sudah dipakai sehari-hari.
    expect(KOMPONEN).toMatch(/varian = "terang"/);
  });

  it("tak satu pun pemakai admin mengirim varian", () => {
    const PEMAKAI_ADMIN = [
      "app/components/admin/DramaList.tsx",
      "app/components/admin/PlaylyIsiCepat.tsx",
      "app/components/admin/PlaylyUnduhanManager.tsx",
      "app/components/admin/PlaylyVideoPicker.tsx",
      "app/components/admin/PlaylyVisibilityManager.tsx",
    ];
    for (const berkas of PEMAKAI_ADMIN) {
      const sumber = readFileSync(berkas, "utf-8");
      expect(
        sumber,
        berkas + " mengirim varian — tampilan admin ikut berubah",
      ).not.toMatch(/varian=/);
    }
  });
});
describe("aturan hitung halaman — dipakai bersama panel admin", () => {
  // Diuji lagi di sini (walau lib/paginasi punya tesnya sendiri) karena
  // /discover kini bergantung padanya: kalau salah satu aturan bergeser,
  // halaman inilah yang ikut salah tanpa menyebut nama berkas mana pun.
  const total = 237;

  it("ukuran bawaan 50 memecah 237 judul jadi 5 halaman", () => {
    expect(UKURAN_BAWAAN).toBe(50);
    expect(hitungJumlahHalaman(total, UKURAN_BAWAAN)).toBe(5);
  });

  it("halaman terakhir berisi SISA-nya, bukan dipaksa penuh", () => {
    const isi = Array.from({ length: total }, (_, i) => i);
    const terakhir = potongHalaman(isi, 5, UKURAN_BAWAAN);
    expect(terakhir).toHaveLength(37);
    expect(terakhir[0]).toBe(200);
  });

  it("nomor di luar jangkauan dijepit, tidak memulangkan halaman kosong", () => {
    expect(jepitHalaman(99, total, UKURAN_BAWAAN)).toBe(5);
    expect(jepitHalaman(0, total, UKURAN_BAWAAN)).toBe(HALAMAN_PERTAMA);
    expect(potongHalaman(Array.from({ length: total }), 99, UKURAN_BAWAAN).length)
      .toBeGreaterThan(0);
  });

  it("hasil kosong tetap memulangkan halaman 1, bukan 0 atau negatif", () => {
    expect(jepitHalaman(3, 0, UKURAN_BAWAAN)).toBe(HALAMAN_PERTAMA);
  });
});
