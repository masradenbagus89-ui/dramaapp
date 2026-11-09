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
import { durasiTayangan } from "./format";

export type LencanaKartu = {
  /** Kiri-atas: rating IMDb apa adanya ("8.4"). null = judul ini belum punya. */
  rating: string | null;
  /**
   * Kanan-atas: kualitas video ("CAM"/"HD"/…) — HANYA untuk FILM.
   *
   * null untuk SERIAL sejak 2026-10-17 (permintaan owner). Pojok itu kini milik
   * jumlah episode, dan menumpuk dua chip di sana membuat kartu penuh. Alasan
   * isinya: kualitas paling menentukan pada film — penonton memutuskan
   * menontonnya sekali duduk, jadi "CAM atau bersih" itu pertanyaan pertama.
   * Untuk serial, yang lebih dicari adalah ada berapa episode.
   *
   * null juga kalau owner memang belum mengisi `quality` — tidak pernah ditebak.
   */
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
   * pembanding menaruh jumlah episode di pojok kanan atas).
   */
  episodeKananAtas: string | null;
  /**
   * Kanan-bawah: durasi "02:45" — untuk FILM maupun SERIAL.
   *
   * FILM: "FILM" kalau durasinya tak terbaca, karena pojok itu sekaligus
   * penanda jenisnya. SERIAL: `null` kalau durasinya belum diisi — serial sudah
   * punya penandanya sendiri ("62 EPS") di kanan-atas, jadi label cadangan di
   * sini cuma mengulang yang sudah ada.
   *
   * Serial IKUT memajang durasi sejak 2026-11-09 atas permintaan owner. Antara
   * 2026-10-16 dan tanggal itu pojok ini sengaja dikosongkan untuk serial
   * (jumlah episodenya baru pindah ke atas, dan kartu dijaga tidak bertambah
   * penuh). Yang membuat penambahan ini tetap aman: durasi HANYA digambar kalau
   * owner benar-benar mengisinya — katalog hari ini 34 dari 42 judul kosong,
   * jadi mayoritas kartu tidak berubah sama sekali.
   */
  kananBawah: string | null;
  /** Pita bawah: "ONGOING"/"TAMAT". null = status belum diisi admin. */
  status: string | null;
  /** true = drama berbayar koin (dari jalur koin, bukan tebakan tampilan). */
  premium: boolean;
  /**
   * true = ditandai eksklusif. Hanya dipajang kalau BUKAN premium.
   *
   * SELALU false untuk SERIAL sejak 2026-10-17 (permintaan owner): pojok
   * kanan-atas serial sudah berisi jumlah episode, dan menambahkan pita
   * EXCLUSIVE di bawahnya mengembalikan kepenuhan yang justru mau dihindari.
   * Penandanya sendiri TIDAK hilang dari data — tab "SERIES UNGGULAN" di
   * beranda masih memakai field `exclusive` yang sama.
   */
  exclusive: boolean;
};

/** Label kanan-bawah untuk film yang durasinya belum/tidak bisa dibaca. */
const LABEL_FILM = "FILM";

export function lencanaKartu(d: Drama): LencanaKartu {
  return {
    rating: d.imdbRating?.trim() ? d.imdbRating.trim() : null,
    // Kualitas & eksklusif: FILM saja. Lihat alasannya di tipe di atas.
    kualitas: isMovie(d) ? (d.quality ?? null) : null,
    kiriBawah: d.year?.trim() ? d.year.trim() : null,
    episodeKananAtas: isMovie(d) ? null : `${d.episodes} EPS`,
    kananBawah: isMovie(d) ? durasiFilm(d) : durasiSerial(d),
    // "Completed" ditampilkan sebagai "TAMAT" — kata yang dipakai penonton
    // Indonesia di situs streaming, bukan istilah database.
    status:
      d.status === "Completed" ? "TAMAT" : d.status === "Ongoing" ? "ONGOING" : null,
    premium: Boolean(d.premium),
    exclusive: isMovie(d) ? Boolean(d.exclusive) : false,
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
  return durasiTayangan(d.runtime, true) ?? LABEL_FILM;
}

/**
 * Durasi PER EPISODE serial "1:47" — `null` kalau belum diisi/tak terbaca.
 *
 * Sengaja TANPA label cadangan, beda dari `durasiFilm` di atas: pojok ini pada
 * film merangkap penanda jenis ("FILM"), sedangkan serial sudah ditandai
 * "62 EPS" di kanan-atas. Menulis "SERIAL" di sini cuma mengulang, dan menulis
 * "0:00" jauh lebih buruk — terbaca seperti durasi sungguhan padahal artinya
 * "kami tak tahu".
 */
function durasiSerial(d: Drama): string | null {
  return durasiTayangan(d.runtime, false);
}
