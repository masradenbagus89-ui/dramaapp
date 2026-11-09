// Penjaga isian manual tahun & durasi video (lib/meta-video-manual.ts).
//
// Angka-angka ini DILIHAT PENONTON di pojok poster. Nilai ngawur yang lolos
// tidak melempar error — ia cuma tergambar sebagai tahun atau durasi yang
// salah, dan tak ada yang melapor.
import { describe, it, expect } from "vitest";
import {
  parseDurasiManual,
  parseTahunManual,
  TAHUN_MAKS,
  TAHUN_MIN,
} from "../lib/meta-video-manual";
import { formatDuration } from "../lib/playly";

describe("parseTahunManual", () => {
  it("menerima tahun 4 angka yang wajar", () => {
    expect(parseTahunManual("2024")).toBe("2024");
    expect(parseTahunManual("1999")).toBe("1999");
    expect(parseTahunManual(2024)).toBe("2024");
    expect(parseTahunManual(" 2024 ")).toBe("2024");
  });

  it("kosong = HAPUS tahun manual, bukan error", () => {
    // Menghapus berarti video kembali memakai tahun dari IMDb kalau ada —
    // aturan yang sama dengan rating manual (lib/rating-video.ts).
    expect(parseTahunManual("")).toBeNull();
    expect(parseTahunManual("   ")).toBeNull();
    expect(parseTahunManual(null)).toBeNull();
    expect(parseTahunManual(undefined)).toBeNull();
  });

  it("teks bercampur DITOLAK, bukan dipotong jadi angka", () => {
    // Memotong "2024abc" jadi "2024" berarti menebak maksud orang. Kalau yang
    // diketik sebenarnya salah, tahun karangan tergambar di poster tanpa satu
    // pun error.
    expect(parseTahunManual("2024abc")).toBeNull();
    expect(parseTahunManual("abc")).toBeNull();
    expect(parseTahunManual("20 24")).toBeNull();
    expect(parseTahunManual("2024.5")).toBeNull();
  });

  it("jumlah angka selain 4 ditolak", () => {
    expect(parseTahunManual("24")).toBeNull();
    expect(parseTahunManual("202")).toBeNull();
    expect(parseTahunManual("20245")).toBeNull();
  });

  it("di luar rentang masuk akal ditolak", () => {
    expect(parseTahunManual(String(TAHUN_MIN))).toBe(String(TAHUN_MIN));
    expect(parseTahunManual(String(TAHUN_MAKS))).toBe(String(TAHUN_MAKS));
    expect(parseTahunManual(String(TAHUN_MIN - 1))).toBeNull();
    expect(parseTahunManual(String(TAHUN_MAKS + 1))).toBeNull();
    expect(parseTahunManual("0000")).toBeNull();
  });
});

describe("parseDurasiManual", () => {
  it("menit.detik — aturan yang SAMA dengan kolom Durasi drama", () => {
    // Owner memilih bentuk ini supaya tidak ada dua cara yang harus diingat.
    expect(parseDurasiManual("2.25")).toBe(145);
    expect(parseDurasiManual("2:25")).toBe(145);
    expect(parseDurasiManual("95.00")).toBe(95 * 60);
  });

  it("MENIT:DETIK menang atas angka-polos — jebakan yang mudah terlewat", () => {
    // "2.25" juga cocok dengan pola angka-polos di `menitDariRuntime`, dan di
    // sana ia terbaca 2 MENIT (120 detik), bukan 2:25 (145 detik). Urutan
    // pemeriksaan di lib/meta-video-manual.ts yang menentukan — tes ini yang
    // merah kalau urutannya dibalik.
    expect(parseDurasiManual("2.25")).toBe(145);
    expect(parseDurasiManual("2.25")).not.toBe(120);
  });

  it("bentuk bersatuan dari IMDb ikut diterima", () => {
    // Admin sering menyalin angka dari halaman IMDb yang menulisnya begini;
    // menolaknya berarti ia harus menghitung ulang di kepala.
    expect(parseDurasiManual("95 min")).toBe(95 * 60);
    expect(parseDurasiManual("95 menit")).toBe(95 * 60);
    expect(parseDurasiManual("2 jam 15 menit")).toBe(135 * 60);
  });

  it("kosong = HAPUS durasi manual", () => {
    expect(parseDurasiManual("")).toBeNull();
    expect(parseDurasiManual("   ")).toBeNull();
    expect(parseDurasiManual(null)).toBeNull();
    expect(parseDurasiManual(undefined)).toBeNull();
  });

  it("teks tanpa angka ditolak", () => {
    expect(parseDurasiManual("panjang")).toBeNull();
    expect(parseDurasiManual("N/A")).toBeNull();
  });

  it("nol tidak pernah jadi durasi", () => {
    // "0:00" di poster terbaca seperti nilai sungguhan padahal artinya
    // "kami tidak tahu".
    expect(parseDurasiManual("0.00")).toBeNull();
    expect(parseDurasiManual("0 min")).toBeNull();
  });

  it("hasilnya benar-benar terbaca kembali jadi label kartu", () => {
    // Rantai utuh: yang diketik admin -> detik -> label di pojok poster.
    expect(formatDuration(parseDurasiManual("2.25")!)).toBe("2:25");
    expect(formatDuration(parseDurasiManual("95 min")!)).toBe("1:35:00");
  });
});
