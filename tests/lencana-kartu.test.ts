import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { lencanaKartu } from "../lib/lencana-kartu";
import { durasiTayangan, formatJamMenit, menitDariRuntime } from "../lib/format";
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

  it("membaca jam digital tanpa satuan — PENJAGA BUG 2026-11-09", () => {
    // Owner mengetik "1.47" di panel admin untuk durasi serial, maksudnya
    // 1 jam 47 menit. Sebelum perbaikan ini pola angka-polos menelan "1" saja
    // dan poster memajang "00:01" — salah, tapi terlihat sah, jadi tidak ada
    // yang melapor. Bentuk ":" ikut dikunci karena sama lazimnya diketik.
    expect(menitDariRuntime("1.47")).toBe(107);
    expect(menitDariRuntime("1:47")).toBe(107);
    expect(menitDariRuntime("0.45")).toBe(45);
    expect(menitDariRuntime("12:30")).toBe(750);
    expect(formatJamMenit(menitDariRuntime("1.47")!)).toBe("01:47");
  });

  it("bentuk yang ARTINYA mendua tidak dipaksa jadi jam", () => {
    // "1.5" bisa berarti 1,5 jam (90) atau 1 jam 5 menit (65). Menebak di
    // antaranya = memajang angka karangan ke penonton, jadi aturan jam digital
    // sengaja hanya menerima menit 2 digit 00–59 dan sisanya jatuh ke pola
    // angka-polos yang lama.
    expect(menitDariRuntime("1.5")).toBe(1);
    expect(menitDariRuntime("1.60")).toBe(1);
    // Angka polos TANPA titik tetap dibaca sebagai menit, seperti data OMDb.
    expect(menitDariRuntime("147")).toBe(147);
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

describe("durasiTayangan — satu aturan untuk poster, halaman detail & episode", () => {
  it("teks yang SAMA berarti beda pada film dan pada episode serial", () => {
    // Ini inti aturannya, dan sengaja dikunci berdampingan supaya tidak ada
    // yang "merapikan" keduanya jadi satu nanti. Owner mengetik "1.47":
    // pada FILM itu 1 jam 47 menit, pada EPISODE drama pendek 1 menit 47 detik
    // (owner 2026-11-09, dikoreksi setelah melihat drama 55 episode).
    expect(durasiTayangan("1.47", true)).toBe("01:47");
    expect(durasiTayangan("1.47", false)).toBe("1:47");
  });

  it("PENJAGA 119 min — isian massal tidak boleh tergambar sebagai durasi episode", () => {
    // 25 dari 40 serial di katalog produksi berisi "119 min": isian massal
    // keputusan owner 2026-09-22 (supabase_migrations/isi_lencana_awal_dramas.sql),
    // yang berkas SQL-nya sendiri menyebut BUKAN hasil pembacaan berkas video
    // atau sumber mana pun. Waktu itu aman karena poster serial belum memajang
    // durasi sama sekali. Begitu serial ikut memajangnya (2026-11-09), beranda
    // lokal menampilkan "01:59" di 147 tempat — hampir 2 jam per episode untuk
    // drama yang sebenarnya 1-3 menit.
    //
    // Yang menolaknya adalah ATURAN UMUM (durasi episode ditulis menit:detik),
    // bukan daftar nilai buruk: angka "119" sengaja TIDAK ada di dalam kode,
    // supaya film yang benar-benar 119 menit tidak ikut hilang.
    expect(durasiTayangan("119 min", false)).toBeNull();
    expect(durasiTayangan("2 jam 45 menit", false)).toBeNull();
    // Film TETAP membacanya — sisi inilah yang membuktikan penolakan di atas
    // bukan sekadar "menolak semuanya".
    expect(durasiTayangan("119 min", true)).toBe("01:59");
  });

  it("bentuk menit:detik yang wajar terbaca untuk episode", () => {
    expect(durasiTayangan("2.05", false)).toBe("2:05");
    expect(durasiTayangan("2:05", false)).toBe("2:05");
    expect(durasiTayangan("22.37", false)).toBe("22:37");
  });

  it("kosong & tak terbaca tetap null — jangan diganti “—” atau “0:00”", () => {
    for (const jenis of [true, false]) {
      expect(durasiTayangan("", jenis)).toBeNull();
      expect(durasiTayangan("   ", jenis)).toBeNull();
      expect(durasiTayangan(undefined, jenis)).toBeNull();
      // "N/A" = nilai kosong khas OMDb, bukan durasi bernama "N/A".
      expect(durasiTayangan("N/A", jenis)).toBeNull();
      expect(durasiTayangan("belum diukur", jenis)).toBeNull();
    }
    // 0 detik bukan durasi — "0:00" terbaca seperti nilai sungguhan.
    expect(durasiTayangan("0.00", false)).toBeNull();
  });
});

describe("lencanaKartu — label kartu hanya dari data yang benar-benar ada", () => {
  it("serial memajang jumlah episode di pojok KANAN-ATAS", () => {
    // Dipindah dari kanan-bawah 2026-10-16 atas permintaan owner.
    expect(lencanaKartu(stub({ episodes: 62 })).episodeKananAtas).toBe("62 EPS");
    expect(lencanaKartu(stub({ episodes: 1 })).episodeKananAtas).toBe("1 EPS");
  });

  it("jumlah episode TIDAK ikut tertulis lagi di pojok kanan-bawah", () => {
    // Sisi sebaliknya, dan ini yang membuat tes di atas berarti: kalau nilainya
    // cuma DISALIN ke atas tanpa dilepas dari bawah, poster memajang jumlah
    // episode DUA KALI dan kartunya jadi lebih penuh, bukan lebih rapi.
    // Stub ini sengaja TANPA runtime — pojok kanan-bawah serial kini milik
    // durasi (owner 2026-11-09), jadi yang dikunci di sini adalah "tidak ada
    // EPS kedua di bawah", bukan "pojoknya harus kosong".
    expect(lencanaKartu(stub({ episodes: 62 })).kananBawah).toBeNull();
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

  it("serial memajang durasi per episode DI SAMPING jumlah episodenya", () => {
    // Permintaan owner 2026-11-09 — membatalkan aturan 2026-10-16 yang
    // mengosongkan pojok kanan-bawah untuk serial. Kedua pojok dikunci
    // sekaligus: yang dituju adalah TAMBAH durasi, bukan menukar EPS dengan
    // durasi. Kalau suatu saat salah satunya hilang, tes ini yang merah.
    const l = lencanaKartu(stub({ episodes: 55, runtime: "1.47" }));
    expect(l.episodeKananAtas).toBe("55 EPS");
    // "1:47" = 1 menit 47 detik, BUKAN "01:47" (1 jam 47 menit). Nilai nyata
    // drama "Putrinya Disakiti, Dewa Perang Akhirnya Bangkit" di produksi.
    expect(l.kananBawah).toBe("1:47");
  });

  it("serial TANPA durasi tidak mengarang label cadangan di kanan-bawah", () => {
    // Beda sengaja dari film: film yang durasinya kosong tetap menulis "FILM"
    // karena pojok itu merangkap penanda jenis. Serial sudah ditandai "1 EPS"
    // di kanan-atas, jadi label cadangan di sini cuma mengulang — dan "00:00"
    // jauh lebih buruk: terbaca seperti durasi sungguhan.
    expect(lencanaKartu(stub({ episodes: 1 })).kananBawah).toBeNull();
    expect(
      lencanaKartu(stub({ episodes: 1, runtime: "N/A" })).kananBawah,
    ).toBeNull();
    expect(
      lencanaKartu(stub({ episodes: 1, runtime: "entah" })).kananBawah,
    ).toBeNull();
  });

  it("`kind` tetap satu-satunya pemisah film vs serial", () => {
    // Pemisahnya tanda `kind`, bukan tebakan dari jumlah episode: serial yang
    // baru punya 1 episode juga bernilai 1. Dikunci di sini karena sekarang
    // KEDUA jenis memakai pojok kanan-bawah, dan teks runtime yang SAMA
    // menghasilkan hasil berbeda tergantung jenisnya.
    const teks = "2.30";

    const serial = lencanaKartu(stub({ episodes: 1, runtime: teks }));
    expect(serial.episodeKananAtas).toBe("1 EPS");
    expect(serial.kananBawah).toBe("2:30"); // 2 menit 30 detik

    const film = lencanaKartu(stub({ kind: "movie", episodes: 1, runtime: teks }));
    expect(film.episodeKananAtas).toBeNull();
    expect(film.kananBawah).toBe("02:30"); // 2 jam 30 menit

    // Bentuk bersatuan: terbaca pada film, dan pada serial jatuh ke "FILM"-nya
    // sendiri — yaitu tidak digambar sama sekali.
    expect(lencanaKartu(stub({ episodes: 1, runtime: "45 min" })).kananBawah).toBeNull();
    expect(
      lencanaKartu(stub({ kind: "movie", episodes: 1, runtime: "45 min" })).kananBawah,
    ).toBe("00:45");
  });

  it("film TIDAK punya lencana episode di kanan-atas", () => {
    // Kalau film ikut memajangnya, poster film akan menulis "1 EPS" — angka
    // yang benar secara data tapi menyesatkan bagi penonton.
    expect(
      lencanaKartu(stub({ kind: "movie", episodes: 1, runtime: "165 min" }))
        .episodeKananAtas,
    ).toBeNull();
  });

  it("rating kosong TIDAK dikarang jadi angka", () => {
    expect(lencanaKartu(stub()).rating).toBeNull();
    expect(lencanaKartu(stub({ imdbRating: "   " })).rating).toBeNull();
    expect(lencanaKartu(stub({ imdbRating: "8.4" })).rating).toBe("8.4");
  });

  it("kualitas kosong TIDAK ditebak jadi HD (film)", () => {
    // Kosong tetap kosong: kode TIDAK pernah menebak sendiri. Pengisian massal
    // "HD" untuk 34 serial (2026-09-22 sore) dilakukan lewat SQL atas keputusan
    // owner yang tahu isi berkas videonya — bukan oleh tampilan.
    const film = { kind: "movie" } as const;
    expect(lencanaKartu(stub(film)).kualitas).toBeNull();
    expect(lencanaKartu(stub({ ...film, quality: "CAM" })).kualitas).toBe("CAM");
    expect(lencanaKartu(stub({ ...film, quality: "WEB-DL" })).kualitas).toBe(
      "WEB-DL",
    );
  });

  it("SERIAL tidak punya kualitas maupun eksklusif di kartu", () => {
    // Permintaan owner 2026-10-17: pojok kanan-atas serial milik jumlah
    // episode saja. Nilainya sengaja DIISI di stub — kalau dikosongkan, tes
    // ini lulus karena datanya kosong, bukan karena aturannya bekerja.
    const l = lencanaKartu(stub({ quality: "HD", exclusive: true }));
    expect(l.kualitas).toBeNull();
    expect(l.exclusive).toBe(false);
    expect(l.episodeKananAtas).toBe("10 EPS");
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

  it("penanda koin & eksklusif ikut apa adanya (film)", () => {
    expect(lencanaKartu(stub()).premium).toBe(false);
    expect(lencanaKartu(stub({ premium: true })).premium).toBe(true);
    // `exclusive` hanya dipajang pada FILM sejak 2026-10-17; serial diuji di
    // "SERIAL tidak punya kualitas maupun eksklusif di kartu" di atas.
    expect(
      lencanaKartu(stub({ kind: "movie", exclusive: true })).exclusive,
    ).toBe(true);
  });
});
