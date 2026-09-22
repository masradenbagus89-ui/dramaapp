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
import {
  getCountryOptions,
  getGenreOptions,
  getYearOptions,
  parseImdb,
} from "./discover";
import { labelNegara } from "./negara";

/**
 * Satu baris yang bisa diklik. `href` sudah lengkap & siap dipakai `<Link>`.
 *
 * `label` dan `href` SENGAJA dipisah: label boleh diterjemahkan ("Cina"), tapi
 * alamatnya wajib memakai nilai asli dari katalog ("?negara=China"). Kalau
 * label ikut masuk ke alamat, chip-nya tergambar rapi lalu memulangkan halaman
 * hampa — rusak tanpa satu pun pesan error.
 */
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
 * Alamat halaman hasil pencarian. SATU sumber untuk seluruh situs.
 *
 * ⚠️ Kenapa jadi fungsi (owner 2026-09-22): logika ini tadinya disalin di
 * `PublicTopBars` (kepala halaman depan) dan `KerangkaKepalaKatalog` (kerangka
 * /discover) — dua tempat yang harus selalu sepakat soal "ketikan penonton
 * dibawa ke mana". Kalau salah satu bergeser, pencarian dari satu halaman
 * mendarat di tempat berbeda dari halaman lain, dan tak ada error apa pun yang
 * memberi tahu.
 *
 * Sengaja memakai `encodeURIComponent`, BUKAN `URLSearchParams` seperti
 * `tautan()` di atas: keduanya sah, tapi yang ini mempertahankan bentuk alamat
 * yang sudah dipakai sejak 2026-09-10 (spasi jadi `%20`, bukan `+`) sehingga
 * tautan pencarian lama yang pernah dibagikan penonton tetap berarti sama.
 */
export function alamatCari(kataKunci: string): string {
  const q = kataKunci.trim();
  return q ? `${TUJUAN}?q=${encodeURIComponent(q)}` : TUJUAN;
}

/**
 * Menu perlu minimal 2 pilihan supaya berarti. Menu berisi 1 pilihan cuma
 * menambah satu klik untuk sampai ke tempat yang sama.
 */
export const MIN_ITEM_MENU = 2;

/**
 * Ambang rating IMDb yang ditawarkan menu. Nilainya WAJIB sama dengan yang
 * dikenali `parseRatingKey` di lib/discover.ts — ambang di luar daftar itu
 * diabaikan diam-diam, dan pilihannya akan memulangkan seluruh katalog seolah
 * penyaringnya bekerja.
 */
const AMBANG_IMDB = ["7", "8", "9"] as const;

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
 * Genre sinema OMDb yang BELUM terwakili kategori kurasi DramaKu.
 *
 * Katalog memuat dua sistem genre sekaligus (lihat `genreDari` di
 * lib/discover.ts). Yang namanya bertabrakan dibuang di sini SEKALI, supaya
 * menu dropdown dan chip strip tak pernah menyimpang aturannya.
 */
function genreSinema(dramas: Drama[]): string[] {
  const kategori = new Set(
    availableGenres(dramas).map((g) => g.toLowerCase()),
  );
  return getGenreOptions(dramas).filter((g) => !kategori.has(g.toLowerCase()));
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
      // Dua sumber yang SENGAJA digabung dalam satu menu: kategori kurasi
      // DramaKu (?cat=) lebih dulu, lalu genre sinema OMDb (?genre=) yang
      // BELUM terwakili kategori mana pun. Tanpa penyaringan itu, "Action"
      // akan muncul dua kali dengan arti berbeda — penonton mengira menunya
      // rusak. Keduanya sudah dihitung dari katalog, jadi tiap pilihannya
      // dijamin berisi.
      [
        ...availableGenres(dramas).map((g) => ({
          label: g,
          href: tautan({ cat: g }),
        })),
        ...genreSinema(dramas).map((g) => ({
          label: g,
          href: tautan({ genre: g }),
        })),
      ],
    ),
    // Label "Series" & "+ More" di bawah ditulis PERSIS seperti situs katalog
    // pembanding — permintaan owner 2026-09-21, ditegaskan dua kali. `key`-nya
    // sengaja TIDAK ikut berubah ("jenis"/"lainnya"): itu kunci internal yang
    // dipakai React & tes, dan menggantinya cuma menambah risiko tanpa satu pun
    // perubahan yang terlihat penonton.
    menu("jenis", "Series", [
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
        // Label diterjemahkan, alamatnya TIDAK — lihat catatan di `NavItem`.
        label: labelNegara(n),
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
    menu("lainnya", "+ More", [
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
      // Penyaring rating IMDb. Dulu berupa dropdown tersendiri di bar cari;
      // dropdown itu dilepas 2026-09-21 (owner: bar cari terlalu ramai), jadi
      // pilihannya pindah ke sini supaya fungsinya tidak ikut hilang. Ambang
      // yang tidak dipunyai satu judul pun tidak digambar.
      ...AMBANG_IMDB.map((r) =>
        hitung(dramas, (d) => parseImdb(d.imdbRating) >= Number(r)) > 0
          ? { label: `IMDb ${r}+`, href: tautan({ rating: r }) }
          : null,
      ),
      { label: "Judul A-Z", href: tautan({ sort: "title" }) },
      { label: "Semua Judul", href: TUJUAN },
    ]),
  ];

  return kandidat.filter((m): m is NavMenu => m !== null);
}

/**
 * ISI STRIP KUNING — DAFTAR TETAP, ditentukan langsung oleh owner (2026-09-21).
 *
 * ⚠️ Ini SATU-SATUNYA tempat di berkas ini yang TIDAK dihitung dari katalog,
 * dan itu disengaja. Versi sebelumnya menghitungnya sendiri sehingga strip
 * tumbuh jadi 29 chip berisi delapan negara (Amerika, Kanada, Jerman, Iran,
 * Selandia Baru, …) — owner menilai "terlalu banyak tulisan dan negara lainnya"
 * dan menyerahkan daftar pendeknya sendiri. Keputusan owner MENANG atas aturan
 * "hanya gambar yang ada isinya"; konsekuensinya ditulis terbuka di bawah.
 *
 * AKIBAT YANG HARUS DIKETAHUI: sebagian chip di sini memang BELUM ada isinya
 * (per 2026-09-21: Anime, India, Jepang, Korea, Thailand = 0 judul), jadi
 * diklik = halaman "Tidak ada drama yang cocok" + tombol Hapus filter. Itu
 * bukan kerusakan kode — chip-nya HIDUP SENDIRI begitu owner menambahkan judul
 * bernegara/bergenre tersebut dari panel admin, TANPA menyentuh berkas ini.
 *
 * Daftar LENGKAP (semua negara, semua tahun, semua genre yang benar-benar
 * berisi) tidak hilang — tetap tersedia di menu dropdown `buildNavMenus`
 * di atas, yang masih dihitung dari katalog seperti sebelumnya.
 *
 * Urutan & ejaan label sengaja PERSIS seperti yang ditulis owner. Label ditulis
 * huruf biasa; strip yang membesarkannya jadi huruf kapital (CSS `uppercase`).
 */
export const STRIP_KATALOG: NavItem[] = [
  { label: "Action", href: tautan({ cat: "Action" }) },
  // OMDb menamai genre animasi "Animation" — "Anime" bukan nilai yang dikenal
  // di sana, jadi chip ini menyaring Animation dan ditampilkan sebagai ANIME.
  { label: "Anime", href: tautan({ genre: "Animation" }) },
  { label: "Horror", href: tautan({ genre: "Horror" }) },
  // Kategori kurasi DramaKu bernama "Comedy"; labelnya yang diindonesiakan.
  { label: "Komedi", href: tautan({ cat: "Comedy" }) },
  { label: "Sci-Fi", href: tautan({ genre: "Sci-Fi" }) },
  { label: "Romance", href: tautan({ cat: "Romance" }) },
  // Nama negara di alamat WAJIB memakai ejaan OMDb (bahasa Inggris) — itu yang
  // dicocokkan `cocokNegara`. Labelnya diterjemahkan lewat lib/negara.ts.
  { label: labelNegara("China"), href: tautan({ negara: "China" }) },
  { label: labelNegara("India"), href: tautan({ negara: "India" }) },
  { label: labelNegara("Japan"), href: tautan({ negara: "Japan" }) },
  { label: labelNegara("South Korea"), href: tautan({ negara: "South Korea" }) },
  { label: labelNegara("Thailand"), href: tautan({ negara: "Thailand" }) },
  { label: "2025", href: tautan({ year: "2025" }) },
  { label: "2026", href: tautan({ year: "2026" }) },
  { label: "Terpopuler", href: tautan({ sort: "populer" }) },
];
