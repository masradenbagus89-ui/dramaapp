// -------------------------------------------------------------------------
// BARIS BERANDA yang isinya CAMPURAN drama + video.
//
// KENAPA BERKAS TERPISAH, bukan mengubah lib/beranda-catalog.ts:
// `homeCatalogRows` di sana dipakai TIGA halaman — /beranda, / (halaman
// depan), dan /shorts. Owner 2026-09-26 meminta videonya masuk BERANDA;
// mengubah fungsi bersama itu akan menyeret dua halaman lain ikut berubah
// tanpa diminta, dan /shorts khususnya salah tempat (isinya cuplikan pendek,
// sedangkan video Playly berdurasi sampai 1,5 jam). Berkas ini MEMBUNGKUS
// hasil `homeCatalogRows` apa adanya — nol perilaku lama yang berubah.
//
// Semuanya fungsi MURNI (tanpa jaringan/DOM) supaya aturannya bisa diuji di
// tests/beranda-video.test.ts. Aturan penempatan baris inilah yang menentukan
// sebuah video KETEMU atau tidak oleh penonton, dan kalau salah kerusakannya
// senyap: tak ada error, cuma video yang tak pernah muncul di mana pun.
// -------------------------------------------------------------------------
import type { Drama } from "./types";
import type { PlaylyVideoPublik } from "./playly-publik";
import { ROW_MAX_ITEMS, homeCatalogRows } from "./beranda-catalog";

/**
 * Satu kartu di baris beranda. Dibungkus bertanda `jenis` (bukan disatukan
 * jadi satu bentuk "kartu universal") karena keduanya memang beda: drama punya
 * episode, poster tegak asli, dan halaman detail; video punya durasi, sampul
 * melintang, dan halaman tonton. Memaksakan satu bentuk berarti salah satunya
 * harus diisi nilai karangan.
 */
export type KartuKatalog =
  | { jenis: "drama"; drama: Drama }
  | { jenis: "video"; video: PlaylyVideoPublik };

export type BarisBeranda = {
  /** Kunci stabil untuk React — tidak ikut berubah walau judulnya diganti. */
  key: string;
  title: string;
  /** Tujuan tautan "Lihat semua" di ujung kanan baris. */
  href: string;
  items: KartuKatalog[];
};

/**
 * Judul baris video. Sengaja TIDAK menyebut "Playly" — itu nama penyedia, dan
 * owner 2026-09-26: "viewer tidak perlu tahu darimana asal video di upload".
 * Ditulis sebagai konstanta supaya owner bisa mengganti seleranya di satu
 * tempat, bukan diburu di beberapa berkas.
 */
export const JUDUL_BARIS_VIDEO = "Film Terbaru";

/** Kunci baris video — dipakai React dan dipatok tes, jadi jangan diubah asal. */
export const KUNCI_BARIS_VIDEO = "video-terbaru";

/** Awalan kunci baris genre milik `homeCatalogRows` (mis. "genre-Action"). */
const AWALAN_GENRE = "genre-";

const bungkusDrama = (d: Drama): KartuKatalog => ({ jenis: "drama", drama: d });
const bungkusVideo = (v: PlaylyVideoPublik): KartuKatalog => ({
  jenis: "video",
  video: v,
});

/**
 * Susun baris beranda dari katalog drama + daftar video.
 *
 * Tiga aturan, masing-masing punya alasan:
 *
 * 1. BARIS VIDEO DI PALING ATAS, berisi SELURUH video apa pun kategorinya.
 *    Inilah yang menjamin permintaan owner terpenuhi apa adanya ("semua video
 *    langsung masuk ke beranda"): video yang belum dipilihkan kategori pun
 *    tetap ketemu penonton. Kalau baris ini hanya memuat yang berkategori,
 *    seluruh 46 video hari ini akan hilang dari beranda — sebab NOL di
 *    antaranya punya kategori (diukur di produksi 2026-09-26).
 *
 * 2. VIDEO BERKATEGORI IKUT KE BARIS GENRENYA, di DEPAN. Di depan, bukan di
 *    belakang: baris memuat sampai 40 kartu, dan yang ditaruh di ekor praktis
 *    tak pernah terlihat tanpa menggeser jauh — admin yang baru saja mengisi
 *    kategori akan menyimpulkan fiturnya tidak jalan.
 *
 * 3. Judul boleh muncul di DUA baris (baris video + baris genrenya). Itu
 *    perilaku yang sudah berlaku untuk drama (lib/beranda-catalog.ts:272-275),
 *    bukan pengecualian baru — barisnya menjawab pertanyaan yang berbeda.
 *
 * ⚠️ Baris video SENGAJA tidak tunduk pada `ROW_MIN_ITEMS` yang dipakai baris
 * drama. Aturan itu ada supaya kategori yang cuma berisi 1-3 judul tidak
 * digambar sebagai baris bolong — dan itu aman, sebab judulnya tetap terjangkau
 * lewat strip genre & /discover. Untuk video, alternatifnya bukan "terjangkau
 * di tempat lain" melainkan HILANG dari beranda sama sekali. Baris yang agak
 * kosong jauh lebih baik daripada video yang tak bisa ditemukan.
 */
export function barisBerandaGabungan(
  dramas: Drama[],
  videos: PlaylyVideoPublik[],
): BarisBeranda[] {
  const barisDrama: BarisBeranda[] = homeCatalogRows(dramas).map((row) => ({
    key: row.key,
    title: row.title,
    href: row.href,
    items: row.items.map(bungkusDrama),
  }));

  if (videos.length === 0) return barisDrama;

  const denganVideo = barisDrama.map((baris) => {
    if (!baris.key.startsWith(AWALAN_GENRE)) return baris;
    const kategori = baris.key.slice(AWALAN_GENRE.length);
    const cocok = videos.filter((v) => v.kategori === kategori);
    if (cocok.length === 0) return baris;
    return {
      ...baris,
      items: [...cocok.map(bungkusVideo), ...baris.items].slice(
        0,
        ROW_MAX_ITEMS,
      ),
    };
  });

  const barisVideo: BarisBeranda = {
    key: KUNCI_BARIS_VIDEO,
    title: JUDUL_BARIS_VIDEO,
    href: "/playly",
    items: videos.slice(0, ROW_MAX_ITEMS).map(bungkusVideo),
  };

  return [barisVideo, ...denganVideo];
}
