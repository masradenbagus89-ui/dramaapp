// -------------------------------------------------------------------------
// LENCANA KARTU POSTER — label kecil yang menempel di empat pojok poster,
// pola yang dipakai situs streaming katalog (rating · kualitas · jumlah
// episode · tahun · durasi).
//
// Kenapa berkas SENDIRI (dipindah dari lib/beranda-catalog.ts, 2026-09-22):
// sampai kemarin lencana cuma digambar kartu grid beranda. Sekarang SEMUA
// kartu memakainya lewat komponen `Poster` — halaman depan, hasil cari,
// kategori, halaman detail, baris rekomendasi, riwayat, my-list. Membiarkan
// aturannya di berkas "beranda" membuat komponen umum mengimpor dari modul
// halaman tertentu: menyesatkan sesi berikutnya soal siapa memakai apa (§3.3).
//
// Semua fungsi MURNI (tanpa DOM, tanpa jaringan) supaya bisa diuji tanpa
// browser — tests/lencana-kartu.test.ts.
//
// ATURAN JUJUR (tak boleh dilanggar): tiap nilai HARUS berasal dari field yang
// benar-benar terisi di `Drama`. Field kosong menghasilkan `null` dan kartu
// tinggal TIDAK menggambar lencananya. Jangan pernah menebak — poster yang
// memajang "HD" atau tahun karangan berbohong ke penonton, dan kerusakannya
// senyap (tak ada error, cuma informasi salah yang dipercaya orang).
// -------------------------------------------------------------------------
import type { Drama, DramaQuality } from "./types";
import { isMovie } from "./types";
import { formatJamMenit, menitDariRuntime } from "./format";

export type LencanaKartu = {
  /** Kiri-atas: rating IMDb apa adanya ("8.4"). null = judul ini belum punya. */
  rating: string | null;
  /** Kanan-atas: kualitas video ("CAM"/"HD"/…). null = owner belum mengisinya. */
  kualitas: DramaQuality | null;
  /**
   * Kiri-bawah: tahun tayang ("2026"). null = judul ini belum punya tahun.
   *
   * Sampai siang 2026-09-22 pojok ini punya cadangan "SUB INDO" saat tahun
   * kosong. DIHAPUS atas permintaan owner sore harinya: pojok ini dibaca
   * penonton sebagai TAHUN, jadi mencampurnya dengan keterangan subtitle
   * membuat dua poster bersebelahan memajang dua jenis informasi berbeda di
   * tempat yang sama. Keterangan subtitle tetap ada di halaman detail drama.
   */
  kiriBawah: string | null;
  /**
   * Kanan-atas, DI BAWAH chip kualitas: jumlah episode serial ("62 EPS").
   * null untuk FILM — film memajang durasinya di kanan-bawah.
   *
   * Dipindah ke atas 2026-10-16 atas permintaan owner (contoh: situs katalog
   * pembanding menaruh jumlah episode di pojok kanan atas). Ini PINDAH, bukan
   * TAMBAH: serial kehilangan label kanan-bawahnya, jadi jumlah lencana di
   * poster tidak bertambah. Itu disengaja — chip "Premium" pernah dicabut dari
   * poster justru karena kartunya jadi terlalu penuh (lihat Poster.tsx).
   */
  episodeKananAtas: string | null;
  /**
   * Kanan-bawah: durasi film "02:45", atau "FILM" kalau durasinya tak terbaca.
   * null untuk SERIAL — jumlah episodenya pindah ke `episodeKananAtas`.
   */
  kananBawah: string | null;
  /** Pita bawah: "ONGOING"/"TAMAT". null = status belum diisi admin. */
  status: string | null;
  /** true = drama berbayar koin (dari jalur koin, bukan tebakan tampilan). */
  premium: boolean;
  /** true = drama ditandai eksklusif. Hanya dipajang kalau BUKAN premium. */
  exclusive: boolean;
};

/** Label kanan-bawah untuk film yang durasinya belum/tidak bisa dibaca. */
const LABEL_FILM = "FILM";

export function lencanaKartu(d: Drama): LencanaKartu {
  return {
    rating: d.imdbRating?.trim() ? d.imdbRating.trim() : null,
    kualitas: d.quality ?? null,
    kiriBawah: d.year?.trim() ? d.year.trim() : null,
    episodeKananAtas: isMovie(d) ? null : `${d.episodes} EPS`,
    kananBawah: isMovie(d) ? durasiFilm(d) : null,
    // "Completed" ditampilkan sebagai "TAMAT" — kata yang dipakai penonton
    // Indonesia di situs streaming, bukan istilah database.
    status:
      d.status === "Completed" ? "TAMAT" : d.status === "Ongoing" ? "ONGOING" : null,
    premium: Boolean(d.premium),
    exclusive: Boolean(d.exclusive),
  };
}

/**
 * Durasi film "01:45", atau "FILM" kalau runtime-nya tidak bisa dibaca.
 *
 * Hanya dipanggil untuk FILM. Pemisah film/serial di `lencanaKartu` memakai
 * `isMovie` (tanda `kind` yang eksplisit), BUKAN tebakan `episodes === 1` —
 * serial yang baru punya 1 episode juga bernilai 1, jadi tebakan itu akan
 * menampilkan durasi pada sesuatu yang sebenarnya serial.
 */
function durasiFilm(d: Drama): string {
  const menit = menitDariRuntime(d.runtime);
  return menit === null ? LABEL_FILM : formatJamMenit(menit);
}
