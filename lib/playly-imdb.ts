// -------------------------------------------------------------------------
// Metadata IMDb untuk video PLAYLY.
//
// KENAPA ADA (owner 2026-10-08): film yang dipasang lewat pintu DramaKu bisa
// menarik poster/sinopsis/rating dari IMDb lewat tombol di form admin, tapi
// video yang datang dari Playly tidak — dan datanya memang tidak pernah ada.
// Playly hanya mengirim judul, kreator, dan alamat embed; diukur hari itu, 186
// video punya `year`/`genre`/`rating`/`contentRating`/`quality`/`thumbnail`
// bernilai null SEMUA (lihat juga lib/playly-publik.ts:42-50 yang sudah
// menyatakan hal yang sama sejak awal).
//
// Jalur lama "kaitkan video->drama" sebenarnya bisa membawa data itu, tapi
// menuntut satu entri drama per video — 186 entri bayangan — dan dokumen
// `playly:embeds` memang kosong di produksi: nol kaitan pernah dibuat.
//
// Berkas ini SENGAJA berisi fungsi MURNI saja (tanpa jaringan/database).
// Pemanggilan OMDb ada di lib/imdb-tool.ts, penyimpanan di lib/store.ts.
// Pemisahan itu yang membuat aturan pembersih judul bisa diuji tanpa kunci API
// dan tanpa menyentuh Playly — dan aturan itulah yang paling rawan salah.
// -------------------------------------------------------------------------

/**
 * Satu baris metadata IMDb milik sebuah video Playly.
 *
 * Semua field bertipe string (bukan null) dan boleh kosong: kartu video sudah
 * memperlakukan string kosong sebagai "jangan digambar", sama seperti field
 * lain di PlaylyVideoPublik. Memakai null di sini berarti dua bentuk "tidak
 * ada" untuk satu arti.
 */
export type PlaylyImdbMeta = {
  imdbId: string;
  title: string;
  year: string;
  /** Poster ukuran besar. SUDAH lolos daftar host di bawah. */
  poster: string;
  genre: string;
  /** Nilai IMDb ("7.4"). Kosong kalau OMDb tidak punya. */
  rating: string;
  /** Rating usia ("PG-13"). Kosong = tampilan WAJIB diam, jangan menebak. */
  contentRating: string;
  runtime: string;
  synopsis: string;
  /**
   * Kredit & asal film — ditambahkan 2026-10-08 sesudah owner membandingkan
   * halaman video Playly dengan halaman film DramaKu dan menemukan yang pertama
   * jauh lebih miskin.
   *
   * SEMUANYA OPSIONAL, dan itu disengaja: baris yang sudah tersimpan sebelum
   * hari ini tidak punya field ini. Menandainya wajib berarti tiap pembacaan
   * baris lama harus diperlakukan sebagai data rusak, padahal ia baik-baik saja
   * — cuma lebih sedikit. Tampilan sudah tahu cara diam saat nilainya kosong.
   */
  director?: string;
  writer?: string;
  stars?: string;
  country?: string;
  language?: string;
  /** Jumlah pemilih di IMDb ("105,613") — dipajang di samping nilai ratingnya. */
  imdbVotes?: string;
  /**
   * Siapa yang memilih baris ini.
   *
   * WAJIB ADA: pencocokan massal (Tahap 2) hanya boleh menimpa baris
   * "otomatis". Tanpa penanda ini, sekali tombol "cocokkan semua" ditekan,
   * seluruh koreksi yang sudah dibuat admin dengan tangan ikut tertimpa hasil
   * tebakan mesin — dan tidak ada error yang muncul saat itu terjadi.
   */
  sumber: "manual" | "otomatis";
  dicocokkanPada: string;
};

/** Peta videoId -> metadata. Video tanpa entri = belum dicocokkan. */
export type PlaylyImdbMap = Record<string, PlaylyImdbMeta>;

/**
 * Video mana yang boleh ikut pencocokan MASSAL: yang belum punya data saja.
 *
 * PAGAR TERPENTING di fitur pencocokan massal, dan sebabnya bukan teori —
 * tanpa ini, sekali tombol "Cocokkan semua" ditekan, seluruh baris yang sudah
 * diperbaiki admin dengan tangan ikut tertimpa tebakan mesin. Tidak ada error
 * yang muncul saat itu terjadi, dan tidak ada jalan mengembalikannya: nilai
 * lamanya sudah hilang.
 *
 * Dipisah jadi fungsi murni (bukan dibiarkan sebagai `.filter()` di dalam
 * komponen) justru supaya aturan ini punya tempat yang bisa diuji langsung,
 * tanpa merender React — project ini belum punya @testing-library/react.
 */
export function videoBelumDicocokkan<T extends { id: string }>(
  videos: T[],
  imdb: PlaylyImdbMap,
): T[] {
  return videos.filter((v) => !imdb[v.id]);
}

/**
 * Host gambar yang boleh disimpan sebagai poster.
 *
 * PAGAR KEAMANAN, bukan kerapian — dua sebab, keduanya nyata:
 *   1. Alamat ini akhirnya dirender `next/image`, dan host di luar
 *      `next.config.ts` remotePatterns membuat gambarnya GAGAL TAMPIL. Menyimpan
 *      alamat yang pasti gagal berarti admin melihat "tersimpan" lalu bingung
 *      kenapa kartunya tetap kosong — rusak yang senyap.
 *   2. Isi balasan OMDb adalah data dari pihak luar. Memasang alamat gambar dari
 *      host sembarangan ke halaman publik berarti tiap pengunjung menembak
 *      server itu, membawa Referer situs kita.
 *
 * Nilainya sengaja sama dengan `next.config.ts:23`. Kalau suatu saat sumber
 * poster bertambah, DUA tempat itu harus diubah bersamaan — disebut di sini
 * supaya yang mengubahnya tahu.
 */
const HOST_POSTER_DIIZINKAN = ["m.media-amazon.com"];

/**
 * Kembalikan alamat poster kalau host-nya diizinkan, string kosong kalau tidak.
 *
 * Gagal-AMAN (skills/owasp/SKILL.md §1 A10): alamat yang tidak bisa diurai,
 * bukan https, atau host-nya asing TIDAK diloloskan "karena mungkin benar" —
 * dibuang, dan kartu videonya tampil tanpa poster seperti hari ini.
 */
export function posterAman(url: string): string {
  const v = (url ?? "").trim();
  if (!v) return "";
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    return "";
  }
  if (u.protocol !== "https:") return "";
  // Dicocokkan PERSIS, bukan dengan endsWith: pencocokan akhiran akan
  // meloloskan `jahat-m.media-amazon.com` dan `m.media-amazon.com.contoh.id`.
  return HOST_POSTER_DIIZINKAN.includes(u.hostname) ? v : "";
}

/**
 * Batas tahun yang masih masuk akal sebagai TAHUN RILIS.
 *
 * Kenapa ada batas atas: judul film bisa memuat angka 4 digit yang bukan tahun
 * ("Blade Runner 2049"). Tanpa batas, judulnya akan terpotong jadi "Blade
 * Runner" dan mencocokkan film yang salah. Batas bawah menahan angka seperti
 * "1917" tetap terbaca sebagai tahun — itu memang film tahun 2019 berjudul
 * angka, dan kalaupun salah baca, pencarian tanpa tahun masih jadi cadangan.
 */
const TAHUN_MIN = 1900;
const TAHUN_MAKS = 2035;

/**
 * Kata pembuka berbahasa Indonesia yang sering menempel di judul unggahan.
 * Dibuang hanya kalau berada di AWAL judul — "Download" di tengah judul film
 * (jarang, tapi mungkin) tidak ikut terbuang.
 */
const PEMBUKA_DIBUANG = /^(nonton|download|streaming|film|movie)\s+/i;

/** Hasil pembersihan: judul yang siap dicari + tahun kalau terbaca. */
export type JudulBersih = { judul: string; tahun: string };

/**
 * Pisahkan judul film dari embel-embel nama berkas rilis.
 *
 * ATURAN INTINYA SATU: potong di TAHUN. Diukur pada 60 judul nyata dari katalog
 * produksi, embel-embel rilis (`YIFY`, `1080p`, `x264-Mkvking`, `-compressed`,
 * `AMZN`, `(Unknown Year)`) SELALU berada SESUDAH tahun. Jadi satu aturan posisi
 * menggantikan daftar panjang kata-kata buangan — dan daftar seperti itu selalu
 * tertinggal di belakang nama grup rilis baru, sedangkan aturan posisi tidak.
 *
 * Aturan kedua: potong juga di penanda episode (`S01E04`), untuk potongan serial
 * yang namanya tidak memuat tahun sama sekali.
 *
 * Yang SENGAJA tidak dilakukan: menebak judul dari kalimat promosi ("Film
 * Survival Paling Mencekam Tahun Ini!"). Itu memang bukan judul film, dan
 * memaksakannya ke pencarian hanya menghasilkan kecocokan yang salah.
 */
export function bersihkanJudulRilis(judulMentah: string): JudulBersih {
  const asli = (judulMentah ?? "").trim();
  if (!asli) return { judul: "", tahun: "" };

  let tahun = "";
  let potongDi = -1;

  // Tahun DALAM KURUNG didahulukan: bentuk itu hampir selalu sengaja ditulis
  // sebagai tahun rilis, sedangkan angka telanjang bisa bagian dari judul.
  const dalamKurung = asli.match(/\((19|20)\d{2}\)/);
  if (dalamKurung && masukRentang(dalamKurung[0].slice(1, -1))) {
    tahun = dalamKurung[0].slice(1, -1);
    potongDi = dalamKurung.index ?? -1;
  } else {
    // Angka telanjang: ambil kemunculan PERTAMA yang masuk rentang. Pertama,
    // bukan terakhir — "Blind War 2022 CHINESE x264" punya satu, tapi judul
    // seperti "Top Gun 1986 2160p 2022-REMUX" punya dua dan yang benar di depan.
    for (const m of asli.matchAll(/\b(19|20)\d{2}\b/g)) {
      if (!masukRentang(m[0])) continue;
      tahun = m[0];
      potongDi = m.index ?? -1;
      break;
    }
  }

  // Penanda episode serial (S01E04). Dipakai kalau letaknya lebih DEPAN
  // daripada tahun — pada "…Infinite Darkness S01E04 NF x264" tak ada tahun
  // sama sekali, dan pada judul yang punya keduanya, yang lebih depan itulah
  // batas judul sebenarnya.
  const episode = asli.match(/\bS\d{1,2}E\d{1,3}\b/i);
  if (episode?.index !== undefined && (potongDi < 0 || episode.index < potongDi)) {
    potongDi = episode.index;
  }

  const dipotong = potongDi >= 0 ? asli.slice(0, potongDi) : asli;
  const judul = rapikan(dipotong) || rapikan(asli);
  return { judul, tahun };
}

function masukRentang(tahun: string): boolean {
  const n = Number.parseInt(tahun, 10);
  return Number.isFinite(n) && n >= TAHUN_MIN && n <= TAHUN_MAKS;
}

/**
 * Buang pemisah nama berkas + tanda baca menggantung di kedua ujung.
 *
 * Titik dan garis bawah diganti spasi karena banyak nama berkas memakainya
 * sebagai pemisah kata ("The.Gunman.2015"); tanpa ini pencarian OMDb menerima
 * satu kata panjang yang tak pernah cocok.
 */
function rapikan(teks: string): string {
  return teks
    .replace(/[._]+/g, " ")
    .replace(PEMBUKA_DIBUANG, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s\-:|[\]({]+/, "")
    .replace(/[\s\-:|[\]()}]+$/, "")
    .trim();
}
