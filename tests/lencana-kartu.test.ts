import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { lencanaKartu } from "../lib/lencana-kartu";
import { formatJamMenit, menitDariRuntime } from "../lib/format";
import { DRAMA_QUALITY_OPTIONS, parseDramaQuality } from "../lib/types";
import type { Drama } from "../lib/types";

function stub(partial: Partial<Drama> = {}): Drama {
  return {
    id: "d",
    title: "Drama",
    category: "Action",
    episodes: 10,
    views: "0",
    synopsis: "",
    gradient: "from-zinc-800 to-black",
    ...partial,
  };
}

describe("menitDariRuntime — baca durasi dari teks bebas", () => {
  it("membaca bentuk OMDb yang benar-benar tersimpan di katalog", () => {
    // Nilai NYATA dari tabel dramaapp.dramas (dibaca 2026-09-22).
    expect(menitDariRuntime("165 min")).toBe(165);
    expect(menitDariRuntime("102 min")).toBe(102);
    expect(menitDariRuntime("154 min")).toBe(154);
  });

  it("membaca bentuk berjam yang mungkin diketik owner di panel admin", () => {
    expect(menitDariRuntime("2h 45m")).toBe(165);
    expect(menitDariRuntime("2 jam 45 menit")).toBe(165);
    expect(menitDariRuntime("1 hour 26")).toBe(86);
    expect(menitDariRuntime("2h")).toBe(120);
  });

  it("teks yang tak bisa dibaca memulangkan null, BUKAN 0", () => {
    // 0 akan tergambar "00:00" di poster — angka yang terlihat sah padahal
    // artinya "kami tak tahu". Ini penjaga aturan anti-ngarang.
    expect(menitDariRuntime("N/A")).toBeNull();
    expect(menitDariRuntime("n/a")).toBeNull();
    expect(menitDariRuntime("")).toBeNull();
    expect(menitDariRuntime("   ")).toBeNull();
    expect(menitDariRuntime(undefined)).toBeNull();
    expect(menitDariRuntime(null)).toBeNull();
    expect(menitDariRuntime("satu setengah jam")).toBeNull();
    expect(menitDariRuntime("0 min")).toBeNull();
  });
});

describe("formatJamMenit — bentuk jam:menit berpadding", () => {
  it("memakai contoh yang diminta owner", () => {
    expect(formatJamMenit(86)).toBe("01:26");
    expect(formatJamMenit(165)).toBe("02:45");
  });

  it("nilai isian massal owner (119 menit) tergambar 01:59", () => {
    // Penjaga angka yang ditulis supabase_migrations/isi_lencana_awal_dramas.sql:
    // owner meminta durasi "1:59", dan itu disimpan sebagai "119 min" supaya
    // dibaca penerjemah yang sama dengan durasi asli dari OMDb. Kalau salah satu
    // sisi diubah tanpa yang lain, poster memajang angka yang bukan diminta.
    expect(menitDariRuntime("119 min")).toBe(119);
    expect(formatJamMenit(119)).toBe("01:59");
  });

  it("kurang dari sejam tetap dua digit", () => {
    expect(formatJamMenit(45)).toBe("00:45");
    expect(formatJamMenit(5)).toBe("00:05");
    expect(formatJamMenit(0)).toBe("00:00");
  });

  it("angka pecahan & negatif tidak menghasilkan NaN di poster", () => {
    expect(formatJamMenit(90.7)).toBe("01:30");
    expect(formatJamMenit(-5)).toBe("00:00");
  });
});

describe("parseDramaQuality — pagar sisi server", () => {
  it("menerima persis nilai yang ada di daftar", () => {
    for (const q of DRAMA_QUALITY_OPTIONS) {
      expect(parseDramaQuality(q)).toBe(q);
    }
  });

  it("nilai ngawur dianggap KOSONG, bukan disimpan apa adanya", () => {
    // Dropdown admin cuma punya 8 pilihan, tapi endpoint admin bisa dikirimi
    // body apa saja — ini pagarnya.
    expect(parseDramaQuality("hd")).toBeUndefined(); // beda huruf besar
    expect(parseDramaQuality("bluray")).toBeUndefined();
    expect(parseDramaQuality("SUPER HD")).toBeUndefined();
    expect(parseDramaQuality("DROP TABLE dramas")).toBeUndefined();
    expect(parseDramaQuality("")).toBeUndefined();
    expect(parseDramaQuality(null)).toBeUndefined();
    expect(parseDramaQuality(undefined)).toBeUndefined();
    expect(parseDramaQuality(7)).toBeUndefined();
  });
});

describe("daftar kualitas di kode HARUS sama dengan CHECK di database", () => {
  // Kenapa tes ini ada: daftarnya hidup di DUA tempat (lib/types.ts dan berkas
  // migrasi SQL). Kalau keduanya menyimpang, kerusakannya SENYAP di panel admin
  // — owner memilih nilai yang sah menurut kode, database menolaknya, dan yang
  // terlihat cuma "gagal simpan" tanpa sebab. Komentar saja tidak cukup
  // menjaganya; tes ini benar-benar membaca berkas SQL-nya.
  it("tiap nilai di DRAMA_QUALITY_OPTIONS tertulis di constraint SQL", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase_migrations", "add_quality_to_dramas.sql"),
      "utf-8",
    );
    const daftarSql = sql
      .slice(sql.indexOf("dramas_quality_check"))
      .match(/quality in \(([^)]*)\)/i);
    expect(daftarSql).not.toBeNull();

    const nilaiSql = [...daftarSql![1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect([...nilaiSql].sort()).toEqual([...DRAMA_QUALITY_OPTIONS].sort());
  });
});

describe("lencanaKartu — label kartu hanya dari data yang benar-benar ada", () => {
  it("serial memakai jumlah episode di pojok kanan-bawah", () => {
    expect(lencanaKartu(stub({ episodes: 62 })).kananBawah).toBe("62 EPS");
    expect(lencanaKartu(stub({ episodes: 1 })).kananBawah).toBe("1 EPS");
  });

  it("film memakai durasi jam:menit", () => {
    expect(
      lencanaKartu(stub({ kind: "movie", episodes: 1, runtime: "165 min" }))
        .kananBawah,
    ).toBe("02:45");
  });

  it("film tanpa durasi yang terbaca tetap punya label, bukan kosong", () => {
    expect(lencanaKartu(stub({ kind: "movie", episodes: 1 })).kananBawah).toBe(
      "FILM",
    );
    expect(
      lencanaKartu(stub({ kind: "movie", episodes: 1, runtime: "N/A" })).kananBawah,
    ).toBe("FILM");
  });

  it("serial yang kebetulan punya runtime TIDAK memajang durasi", () => {
    // Pemisahnya tanda `kind`, bukan tebakan dari jumlah episode. Serial yang
    // baru punya 1 episode juga bernilai 1 — tebakan itu akan salah.
    expect(lencanaKartu(stub({ episodes: 1, runtime: "45 min" })).kananBawah).toBe(
      "1 EPS",
    );
  });

  it("rating kosong TIDAK dikarang jadi angka", () => {
    expect(lencanaKartu(stub()).rating).toBeNull();
    expect(lencanaKartu(stub({ imdbRating: "   " })).rating).toBeNull();
    expect(lencanaKartu(stub({ imdbRating: "8.4" })).rating).toBe("8.4");
  });

  it("kualitas kosong TIDAK ditebak jadi HD", () => {
    // Kosong tetap kosong: kode TIDAK pernah menebak sendiri. Pengisian massal
    // "HD" untuk 34 serial (2026-09-22 sore) dilakukan lewat SQL atas keputusan
    // owner yang tahu isi berkas videonya — bukan oleh tampilan.
    expect(lencanaKartu(stub()).kualitas).toBeNull();
    expect(lencanaKartu(stub({ quality: "CAM" })).kualitas).toBe("CAM");
    expect(lencanaKartu(stub({ quality: "WEB-DL" })).kualitas).toBe("WEB-DL");
  });

  it("kiri-bawah HANYA tahun — tidak pernah berisi keterangan subtitle", () => {
    // Penjaga permintaan owner 2026-09-22 sore: cadangan "SUB INDO" DIHAPUS.
    // Pojok ini dibaca penonton sebagai tahun; mencampurnya dengan jenis
    // informasi lain membuat dua poster bersebelahan berarti beda.
    expect(lencanaKartu(stub({ year: "2026" })).kiriBawah).toBe("2026");
    expect(lencanaKartu(stub({ subtitles: ["id", "en"] })).kiriBawah).toBeNull();
    expect(
      lencanaKartu(stub({ year: "2026", subtitles: ["id"] })).kiriBawah,
    ).toBe("2026");
    expect(lencanaKartu(stub()).kiriBawah).toBeNull();
    expect(lencanaKartu(stub({ year: "   " })).kiriBawah).toBeNull();
  });

  it("status diterjemahkan ke kata penonton, kosong tetap kosong", () => {
    expect(lencanaKartu(stub({ status: "Ongoing" })).status).toBe("ONGOING");
    expect(lencanaKartu(stub({ status: "Completed" })).status).toBe("TAMAT");
    expect(lencanaKartu(stub()).status).toBeNull();
  });

  it("penanda koin & eksklusif ikut apa adanya", () => {
    expect(lencanaKartu(stub()).premium).toBe(false);
    expect(lencanaKartu(stub({ premium: true })).premium).toBe(true);
    expect(lencanaKartu(stub({ exclusive: true })).exclusive).toBe(true);
  });
});
