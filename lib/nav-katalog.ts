// -------------------------------------------------------------------------
// ISI MENU NAVIGASI KATALOG — deretan dropdown di bar cari + pintasan di strip
// kuning, meniru pola situs katalog streaming (permintaan owner 2026-09-10).
//
// Semuanya fungsi MURNI (tanpa DOM, tanpa jaringan) supaya bisa dites di
// tests/nav-katalog.test.ts. Tampilannya ada di
// app/components/beranda/NavMenus.tsx — berkas ini hanya memutuskan APA yang
// layak muncul, bukan bagaimana bentuknya.
//
// ATURAN JUJUR (lanjutan pelajaran docs/lintasai/rencana/2026-09-07-beranda-lk21.md):
// tiap pilihan HARUS memulangkan minimal satu judul di katalog yang sedang
// dipakai. Menu yang diklik lalu memulangkan halaman hampa terbaca seperti
// situs rusak. Karena itu tidak ada satu pun daftar tetap di sini — semua
// dihitung dari katalog, sehingga menu ikut tumbuh sendiri saat owner
// melengkapi data dan ikut menghilang saat datanya belum ada.
// -------------------------------------------------------------------------
import type { Drama } from "./types";
import { isMovie } from "./types";
import { availableGenres, countWithRating, countWithYear } from "./beranda-catalog";
import { getCountryOptions, getYearOptions } from "./discover";

/** Satu baris yang bisa diklik. `href` sudah lengkap & siap dipakai `<Link>`. */
export type NavItem = { label: string; href: string };

/** Satu tombol dropdown beserta isinya. */
export type NavMenu = {
  /** Kunci stabil untuk React — tidak ikut berubah walau labelnya diganti. */
  key: string;
  label: string;
  items: NavItem[];
};

/**
 * Semua tautan menuju /discover. KENAPA satu tujuan: hanya halaman itu yang
 * membaca penyaring dari alamat URL (app/components/DramaBrowser.tsx). /beranda
 * menyimpan penyaringnya di state lokal, jadi `?sort=populer` ke sana akan
 * diabaikan DIAM-DIAM — menu terlihat hidup padahal mati. Ini juga perilaku
 * situs katalog aslinya: klik Genre > Action = pindah ke halaman daftar Action.
 */
const TUJUAN = "/discover";

function tautan(params: Record<string, string>): string {
  const q = new URLSearchParams(params).toString();
  return q ? `${TUJUAN}?${q}` : TUJUAN;
}

/**
 * Menu perlu minimal 2 pilihan supaya berarti. Menu berisi 1 pilihan cuma
 * menambah satu klik untuk sampai ke tempat yang sama.
 */
export const MIN_ITEM_MENU = 2;

function hitung(dramas: Drama[], cocok: (d: Drama) => boolean): number {
  return dramas.filter(cocok).length;
}

/**
 * Rakit satu menu, buang pilihan yang tidak ada isinya, lalu buang menunya
 * sendiri kalau sisa pilihannya kurang dari MIN_ITEM_MENU.
 *
 * `items` bertipe (NavItem | null)[] supaya pemanggil bisa menulis syaratnya
 * sebaris (`ada ? item : null`) tanpa merakit array bertahap.
 */
function menu(
  key: string,
  label: string,
  items: (NavItem | null)[],
): NavMenu | null {
  const isi = items.filter((i): i is NavItem => i !== null);
  return isi.length >= MIN_ITEM_MENU ? { key, label, items: isi } : null;
}

/**
 * Deretan menu dropdown untuk bar cari — enam slot, sejajar dengan situs
 * katalog pembanding: Genre · Jenis · Populer · Negara · Tahun · Lainnya.
 *
 * Slot yang datanya belum terisi HILANG dengan sendirinya (mis. Negara &
 * Tahun hanya muncul kalau ada judul yang punya kolom itu), jadi daftar ini
 * tak pernah menjanjikan sesuatu yang tidak dipunyai katalog.
 */
export function buildNavMenus(dramas: Drama[]): NavMenu[] {
  // Katalog kosong = TIDAK ada menu sama sekali. Beberapa pilihan di bawah
  // (urutan A-Z, "Semua Judul") tidak bergantung isi katalog, jadi tanpa pagar
  // ini menunya tetap tergambar lalu memulangkan halaman hampa saat diklik.
  if (dramas.length === 0) return [];

  const adaTahun = countWithYear(dramas) > 0;
  const adaRating = countWithRating(dramas) > 0;

  const serial = hitung(dramas, (d) => !isMovie(d));
  const film = hitung(dramas, (d) => isMovie(d));
  const tamat = hitung(dramas, (d) => d.status === "Completed");
  const tayang = hitung(dramas, (d) => d.status === "Ongoing");
  const gratis = hitung(dramas, (d) => !d.premium);
  const koin = hitung(dramas, (d) => Boolean(d.premium));
  const subIndo = hitung(dramas, (d) => Boolean(d.subtitles?.includes("id")));

  const kandidat: (NavMenu | null)[] = [
    menu(
      "genre",
      "Genre",
      // availableGenres & kedua daftar di bawah sudah dihitung dari katalog,
      // jadi tiap pilihannya dijamin berisi — tak perlu disaring ulang.
      availableGenres(dramas).map((g) => ({ label: g, href: tautan({ cat: g }) })),
    ),
    menu("jenis", "Jenis", [
      serial > 0 ? { label: "Serial", href: tautan({ kind: "series" }) } : null,
      film > 0 ? { label: "Film", href: tautan({ kind: "movie" }) } : null,
    ]),
    menu("populer", "Populer", [
      { label: "Paling Banyak Ditonton", href: tautan({ sort: "populer" }) },
      { label: "Episode Terbanyak", href: tautan({ sort: "episodes" }) },
      adaRating
        ? { label: "Rating Tertinggi", href: tautan({ sort: "rating" }) }
        : null,
      adaTahun ? { label: "Tahun Terbaru", href: tautan({ sort: "year" }) } : null,
    ]),
    menu(
      "negara",
      "Negara",
      getCountryOptions(dramas).map((n) => ({
        label: n,
        href: tautan({ negara: n }),
      })),
    ),
    menu(
      "tahun",
      "Tahun",
      getYearOptions(dramas).map((y) => ({ label: y, href: tautan({ year: y }) })),
    ),
    // Tempat sisa — padanan "+ More". Pilihan Gratis hanya berarti kalau
    // katalog memuat KEDUANYA; kalau semua judul gratis, ia cuma memulangkan
    // katalog utuh.
    menu("lainnya", "Lainnya", [
      subIndo > 0 ? { label: "Sub Indo", href: tautan({ sub: "id" }) } : null,
      gratis > 0 && koin > 0
        ? { label: "Gratis", href: tautan({ akses: "gratis" }) }
        : null,
      koin > 0 ? { label: "Pakai Koin", href: tautan({ akses: "koin" }) } : null,
      tamat > 0
        ? { label: "Sudah Tamat", href: tautan({ status: "completed" }) }
        : null,
      tayang > 0
        ? { label: "Masih Tayang", href: tautan({ status: "ongoing" }) }
        : null,
      { label: "Judul A-Z", href: tautan({ sort: "title" }) },
      { label: "Semua Judul", href: TUJUAN },
    ]),
  ];

  return kandidat.filter((m): m is NavMenu => m !== null);
}

/**
 * Pintasan cepat di ujung strip genre kuning — padanan "TERPOPULER"/"2025" di
 * situs pembanding, tapi isinya hal yang datanya ada di DramaKu.
 *
 * Sama seperti menu: pilihan yang tidak ada isinya tidak digambar.
 */
export function catalogShortcuts(dramas: Drama[]): NavItem[] {
  // Alasan yang sama dengan buildNavMenus: Terbaru & Terpopuler tidak
  // bergantung isi katalog, jadi pagar ini yang mencegahnya tergambar sia-sia.
  if (dramas.length === 0) return [];

  const tamat = hitung(dramas, (d) => d.status === "Completed");
  const film = hitung(dramas, (d) => isMovie(d));
  const gratis = hitung(dramas, (d) => !d.premium);
  const koin = hitung(dramas, (d) => Boolean(d.premium));

  const kandidat: (NavItem | null)[] = [
    // Keduanya tidak butuh field opsional apa pun (`views` & urutan katalog
    // selalu ada), jadi selalu aman digambar.
    { label: "Terbaru", href: tautan({ sort: "terbaru" }) },
    { label: "Terpopuler", href: tautan({ sort: "populer" }) },
    film > 0 ? { label: "Film", href: tautan({ kind: "movie" }) } : null,
    tamat > 0 ? { label: "Tamat", href: tautan({ status: "completed" }) } : null,
    gratis > 0 && koin > 0
      ? { label: "Gratis", href: tautan({ akses: "gratis" }) }
      : null,
  ];

  return kandidat.filter((i): i is NavItem => i !== null);
}
