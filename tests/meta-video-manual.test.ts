// Penjaga isian manual tahun & durasi video (lib/meta-video-manual.ts).
//
// Angka-angka ini DILIHAT PENONTON di pojok poster. Nilai ngawur yang lolos
// tidak melempar error — ia cuma tergambar sebagai tahun atau durasi yang
// salah, dan tak ada yang melapor.
import { describe, it, expect } from "vitest";
import {
  jelaskanDurasiManual,
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

  it("regresi: '1:47:00' disalin dari kartu terbaca 1 MENIT, bukan 1 jam 47", () => {
    // 🪤 Bug yang lolos ke produksi (owner menemukannya 2026-11-09, terukur
    // sebelum perbaikan: nilainya 60 detik). Tak satu pun pola lama cocok
    // dengan bentuk tiga-bagian, jadi ia jatuh ke `menitDariRuntime` yang
    // mengambil angka PERTAMA dan membacanya 1 menit. Nol error — film 1 jam
    // 47 menit tayang berlabel "1:00" ke penonton.
    //
    // Angka harapan dihitung TANGAN, bukan dari rumus kode: 1*3600 + 47*60.
    expect(parseDurasiManual("1:47:00")).toBe(6420);
    expect(parseDurasiManual("1:47:00")).not.toBe(60);
  });

  it("jam:menit:detik — bentuk yang tergambar di kartu film", () => {
    expect(parseDurasiManual("1:45:00")).toBe(6300);
    expect(parseDurasiManual("2:25:30")).toBe(8730);
    expect(parseDurasiManual("1.45.00")).toBe(6300); // pemisah titik ikut sah
    expect(parseDurasiManual("0:02:22")).toBe(142);
  });

  it("menyalin label kartu mana pun memulangkan durasi yang SAMA — pulang-pergi", () => {
    // Jaminan yang membuat aturan ini bisa dijelaskan dalam satu kalimat
    // ("tulis persis seperti di kartu"): apa pun yang digambar `formatDuration`
    // harus terbaca kembali jadi detik yang sama persis. Kalau suatu hari salah
    // satu bentuknya meleset, tes ini yang merah — bukan penonton yang
    // menemukannya.
    for (const detik of [142, 2700, 5700, 6420, 8730, 105]) {
      expect(parseDurasiManual(formatDuration(detik))).toBe(detik);
    }
  });

  it("menit & detik di atas 59 ditolak, bukan ditebak maksudnya", () => {
    // "1:70:00" = salah ketik. Membacanya 1 jam 70 menit berarti memajang
    // durasi karangan ke penonton tanpa seorang pun diberi tahu.
    expect(parseDurasiManual("1:70:00")).toBeNull();
    expect(parseDurasiManual("1:30:70")).toBeNull();
  });

  it("0:00:00 tidak pernah jadi durasi", () => {
    expect(parseDurasiManual("0:00:00")).toBeNull();
  });
});

describe("jelaskanDurasiManual — pratinjau yang dilihat admin sebelum menyimpan", () => {
  it("menerjemahkan ketikan jadi kalimat awam", () => {
    expect(jelaskanDurasiManual("1:47:00")).toBe("1 jam 47 menit");
    expect(jelaskanDurasiManual("2:25")).toBe("2 menit 25 detik");
    expect(jelaskanDurasiManual("95 min")).toBe("1 jam 35 menit");
    expect(jelaskanDurasiManual("2:25:30")).toBe("2 jam 25 menit 30 detik");
  });

  it("MEMBEDAKAN dua ketikan mirip yang artinya jauh berbeda", () => {
    // Inilah alasan pratinjau ini ada: keduanya cuma beda ":00" di ekor, dan
    // salah pilih tidak memunculkan error apa pun.
    expect(jelaskanDurasiManual("1:45")).toBe("1 menit 45 detik");
    expect(jelaskanDurasiManual("1:45:00")).toBe("1 jam 45 menit");
  });

  it("yang tak terbaca memulangkan null — panel tak boleh memajang tebakan", () => {
    expect(jelaskanDurasiManual("panjang")).toBeNull();
    expect(jelaskanDurasiManual("")).toBeNull();
    expect(jelaskanDurasiManual("1:70:00")).toBeNull();
  });
});
