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
import { countWithRating, countWithYear } from "./beranda-catalog";
import { getGenreOptions, parseImdb } from "./discover";
import { labelGenre } from "./genre";
import { labelNegara } from "./negara";
import { opsiNegaraGabungan } from "./film-jelajah";
import type { PlaylyVideoPublik } from "./playly-publik";
import { tahunRilis } from "./tahun-film";
import { PAYWALL_ENABLED } from "./saklar-fitur";

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
  /**
   * Berapa KOLOM saat dropdown ini digambar di layar lebar (owner 2026-11-14:
   * "genre, populer, tahun kamu tampilkan semua, buat yang rapi").
   *
   * Tujuannya satu: seluruh pilihan terlihat SEKALIGUS, tanpa menggulir di
   * dalam kotak kecil. Angkanya mengikuti panjang label, bukan selera —
   * `KOLOM_TAHUN` muat 4 karena "2026" pendek, sementara nama genre seperti
   * "Dokumenter" cuma muat 3.
   *
   * Di layar HP jumlahnya diturunkan sendiri oleh NavMenus.tsx; kolom banyak
   * pada lebar 393px membuat tiap nama terpotong, dan nama terpotong lebih
   * buruk daripada daftar yang sedikit lebih panjang. Berkas ini hanya
   * menyatakan NIAT; kelas CSS-nya ada di sana.
   *
   * Tidak diisi = satu kolom (menu pendek: Series, Populer, Lainnya).
   */
  kolom?: 2 | 3 | 4;
};

/**
 * GENRE FILM resmi — menu "Genre" hanya memuat nama dari daftar ini
 * (owner 2026-11-14: "untuk genre kamu buat khusus genre film").
 *
 * Isinya daftar genre baku IMDb/OMDb, bukan karangan sendiri: pencocokan
 * otomatis (`PETA_GENRE` di lib/kategori-otomatis.ts) memakai ejaan yang sama,
 * jadi nama yang menyimpang di sini membuat sebuah genre film diam-diam
 * terbuang dari menu walau katalognya punya isi.
 *
 * ⚠️ Yang SENGAJA tidak ada di sini: kategori khas drama Asia (Tycoon, Harem,
 * Time Travel, Wuxia, Cultivation, …). Ia bukan genre film, dan tempatnya di
 * menu "Lainnya" — lihat `KATEGORI_DRAMA` di bawah.
 */
export const GENRE_FILM: readonly string[] = [
  "Action",
  "Adventure",
  "Animation",
  "Biography",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "Film-Noir",
  "Game-Show",
  "History",
  "Horror",
  "Music",
  "Musical",
  "Mystery",
  "News",
  "Reality-TV",
  "Romance",
  "Sci-Fi",
  "Short",
  "Sport",
  "Talk-Show",
  "Thriller",
  "War",
  "Western",
];

const SET_GENRE_FILM = new Set(GENRE_FILM.map((g) => g.toLowerCase()));

/**
 * Jumlah kolom tiap dropdown panjang, dipilih dari PANJANG LABELNYA.
 *
 * Diuji dengan nama terpanjang yang benar-benar ada di katalog:
 *   - Genre  : "Dokumenter", "Fiksi Ilmiah", "Reality TV"  -> 3 kolom
 *   - Tahun  : "2026" (4 huruf)                            -> 4 kolom
 *   - Negara : "Selandia Baru"                             -> 3 kolom sejak
 *     daftarnya dinaikkan 12 -> 24 (owner 2026-11-14); 2 kolom membuatnya
 *     12 baris, lebih panjang daripada menu Genre di sebelahnya.
 * Menaikkan angkanya membuat nama terpanjang terpotong — dan nama genre yang
 * terpotong membuat penonton tidak tahu apa yang akan diklik.
 */
export const KOLOM_GENRE = 3 as const;
export const KOLOM_TAHUN = 4 as const;
export const KOLOM_NEGARA = 3 as const;

/**
 * Baris DRAMA ASIA di menu "Lainnya" (owner 2026-11-14: "lainnya isi dengan
 * dracin, k-drama dan sejenisnya").
 *
 * Tiap baris = serial DARI negara itu, bukan film-nya: `kind=series` ikut
 * dipasang supaya nama "Dracin" (drama China) tidak memulangkan film Hollywood
 * yang kebetulan ber-negara-produksi China.
 *
 * ⚠️ BARISNYA BELUM TENTU MUNCUL, dan itu disengaja. Syaratnya ada serial yang
 * kolom `country`-nya memang terisi. Diukur 2026-11-14: kolom itu terisi pada
 * 1 dari 41 drama, karena isiannya di panel admin MUSTAHIL dicapai (lihat
 * catatan di DramaForm.tsx). Sesudah kuncinya dibuka hari ini, owner tinggal
 * mengisi negara tiap drama dan baris-baris ini menyala sendiri — tanpa
 * menyentuh berkas ini lagi.
 */
const DRAMA_ASIA: readonly { label: string; negara: string }[] = [
  { label: "Dracin", negara: "China" },
  { label: "K-Drama", negara: "South Korea" },
  { label: "J-Drama", negara: "Japan" },
  { label: "Drama Thailand", negara: "Thailand" },
  { label: "Drama Taiwan", negara: "Taiwan" },
];

/**
 * Apakah drama ini diproduksi di negara tersebut? Kolomnya berisi DAFTAR
 * ("United States, China, Thailand"), jadi dicocokkan per potongan — bukan
 * disamakan utuh, yang akan melewatkan hampir semua judul ko-produksi.
 */
function dramaDariNegara(d: Drama, negara: string): boolean {
  return String(d.country ?? "")
    .split(",")
    .some((n) => n.trim().toLowerCase() === negara.toLowerCase());
}

/** Apakah nama ini genre film (bukan kategori khas drama)? */
function genreFilmResmi(nama: string): boolean {
  return SET_GENRE_FILM.has(nama.toLowerCase());
}

/**
 * Semua tautan menuju /discover. KENAPA satu tujuan: hanya halaman itu yang
 * membaca penyaring dari alamat URL (app/components/DramaBrowser.tsx). /beranda
 * menyimpan penyaringnya di state lokal, jadi `?sort=populer` ke sana akan
 * diabaikan DIAM-DIAM — menu terlihat hidup padahal mati. Ini juga perilaku
 * situs katalog aslinya: klik Genre > Action = pindah ke halaman daftar Action.
 */
/**
 * Alamat halaman hasil pencarian — SATU sumber untuk seluruh situs.
 *
 * ⚠️ Diekspor 2026-11-07. Sebelumnya nilainya ditulis TIGA kali: di sini
 * (dipakai `alamatCari()`, yaitu jalur ketika JavaScript sudah aktif) dan
 * sebagai `TUJUAN_CARI` tulis-tangan di KepalaBeranda.tsx serta
 * KerangkaKepalaKatalog.tsx (dipakai `action` form, yaitu jalur ketika JS
 * BELUM aktif). Kalau alamatnya suatu saat pindah, kedua jalur itu bisa
 * menyimpang tanpa satu pun error: pencarian jalan saat JS aktif, dan
 * mendarat di halaman 404 saat belum.
 */
export const TUJUAN_CARI = "/discover";
const TUJUAN = TUJUAN_CARI;

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
/**
 * Baris penutup "Lainnya" di dasar tiap dropdown (owner 2026-11-14: "genre di
 * bawah tulisan perang kamu tambahkan lainnya ... tambahkan juga tulisan
 * lainnya" untuk menu yang lain).
 *
 * Ia menuju halaman jelajah TANPA penyaring — satu-satunya halaman yang
 * memuat SELURUH judul sekaligus, lengkap dengan bar penyaringnya sendiri.
 * Jadi "Lainnya" di sini berarti "tidak satu pun dari pilihan di atas; lihat
 * semuanya lalu saring sendiri".
 *
 * 🪤 Sengaja TIDAK memasang alamat berbeda-beda per menu hanya supaya
 * kelihatan berbeda: tiap menu menawarkan sumbu yang berbeda (genre, negara,
 * tahun), tapi "selain yang di atas" bermuara ke tempat yang sama. Alamat
 * karangan yang terlihat spesifik tapi memulangkan hasil yang sama persis
 * justru itu yang dikeluhkan owner.
 */
const BARIS_LAINNYA: NavItem = { label: "Lainnya", href: TUJUAN };

function menu(
  key: string,
  label: string,
  items: (NavItem | null)[],
  hiasan: { kolom?: 2 | 3 | 4; tanpaLainnya?: boolean } = {},
): NavMenu | null {
  const isi = items.filter((i): i is NavItem => i !== null);
  if (isi.length < MIN_ITEM_MENU) return null;
  // Ditambahkan SESUDAH ambang MIN_ITEM_MENU dinilai: baris penutup bukan
  // "isi" menu, dan menu berisi satu pilihan + "Lainnya" tetap cuma menambah
  // satu klik untuk sampai ke tempat yang sama.
  const { tanpaLainnya, ...sisa } = hiasan;
  return {
    key,
    label,
    items: tanpaLainnya ? isi : [...isi, BARIS_LAINNYA],
    ...sisa,
  };
}

/**
 * Urutkan nilai dari peta hitungan: terbanyak dulu, lalu abjad Indonesia.
 * Aturan yang sama dengan `availableGenres` — ditulis sekali di sini supaya
 * daftar gabungan di bawah tidak punya urutan sendiri.
 */
function urutTerbanyak(hitungan: Map<string, number>): string[] {
  return [...hitungan.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "id"))
    .map(([nilai]) => nilai);
}

/**
 * KATEGORI KURASI yang benar-benar punya isi — dari katalog drama DAN video.
 *
 * 🪤 KENAPA VIDEO WAJIB IKUT DIHITUNG (owner 2026-11-14: "seragamkan semua
 * genre karena yang di beranda masih sedikit, bisa lihat di admin"). Sebelum
 * hari ini menu Genre dihitung dari `dramas` SAJA. Diukur di produksi: katalog
 * drama cuma 41 judul dengan **6** kategori, sedangkan video Playly 397 judul
 * dengan **24** kategori. Jadi menunya memang jujur — ia cuma melihat 7% isi
 * situs. Nol error, dan tidak ada yang bisa menebaknya dari layar.
 *
 * `/discover` SUDAH menyaring video (`saringFilm` di lib/film-jelajah.ts
 * mengenal `category`), jadi tiap kategori yang ditambahkan di sini tetap
 * memulangkan hasil — aturan "menu tak boleh memulangkan halaman hampa" di
 * kepala berkas ini TIDAK dilonggarkan.
 */
function kategoriBerisi(dramas: Drama[], videos: PlaylyVideoPublik[]): string[] {
  const hitungan = new Map<string, number>();
  const tambah = (nilai: string | null | undefined) => {
    const v = (nilai ?? "").trim();
    if (v) hitungan.set(v, (hitungan.get(v) ?? 0) + 1);
  };
  for (const d of dramas) tambah(d.category);
  // Hanya `kategori` (pilihan admin dari daftar resmi) — BUKAN `genre` teks
  // bebas OMDb. `?cat=` divalidasi `parseCategory` terhadap CATEGORIES, jadi
  // nama di luar daftar itu jatuh ke "Semua" dan menunya memulangkan katalog
  // utuh: terlihat hidup, padahal tidak menyaring apa pun.
  for (const v of videos) tambah(v.kategori);
  return urutTerbanyak(hitungan);
}

/**
 * Genre sinema OMDb yang BELUM terwakili kategori kurasi DramaKu.
 *
 * Katalog memuat dua sistem genre sekaligus (lihat `genreDari` di
 * lib/discover.ts). Yang namanya bertabrakan dibuang di sini SEKALI, supaya
 * menu dropdown dan chip strip tak pernah menyimpang aturannya.
 *
 * Ikut menghitung video sejak 2026-11-14, alasan sama dengan `kategoriBerisi`.
 */
function genreSinema(
  dramas: Drama[],
  videos: PlaylyVideoPublik[] = [],
): string[] {
  const kategori = new Set(
    kategoriBerisi(dramas, videos).map((g) => g.toLowerCase()),
  );
  const hitungan = new Map<string, number>();
  for (const g of getGenreOptions(dramas)) {
    hitungan.set(g, (hitungan.get(g) ?? 0) + 1);
  }
  for (const v of videos) {
    // `genre` OMDb bisa berisi DAFTAR ("Action, Sci-Fi") — dipecah supaya tiap
    // nama bisa jadi satu pilihan menu, sejajar dengan `genreFilm`.
    for (const g of (v.genre ?? "").split(",")) {
      const nama = g.trim();
      if (nama) hitungan.set(nama, (hitungan.get(nama) ?? 0) + 1);
    }
  }
  return urutTerbanyak(hitungan).filter((g) => !kategori.has(g.toLowerCase()));
}

/**
 * Tahun rilis yang benar-benar punya isi, terbaru dulu — drama DAN video.
 *
 * Memakai `tahunRilis` (lib/tahun-film.ts), bukan kolom `year` mentah: 70 dari
 * 481 video tayang menyimpan tahunnya HANYA di dalam judul `(2026)`. Membaca
 * kolomnya saja membuat tahun-tahun itu hilang dari menu padahal filmnya ada.
 */
function tahunBerisi(dramas: Drama[], videos: PlaylyVideoPublik[]): string[] {
  const set = new Set<string>();
  for (const d of dramas) if (d.year) set.add(d.year);
  for (const v of videos) {
    const t = tahunRilis({ title: v.title, year: v.year });
    if (t) set.add(String(t));
  }
  return [...set].sort((a, b) => Number(b) - Number(a));
}

/**
 * Deretan menu dropdown untuk bar cari — enam slot, sejajar dengan situs
 * katalog pembanding: Genre · Jenis · Populer · Negara · Tahun · Lainnya.
 *
 * Slot yang datanya belum terisi HILANG dengan sendirinya (mis. Negara &
 * Tahun hanya muncul kalau ada judul yang punya kolom itu), jadi daftar ini
 * tak pernah menjanjikan sesuatu yang tidak dipunyai katalog.
 */
export function buildNavMenus(
  dramas: Drama[],
  /**
   * Katalog FILM, untuk menu "Negara". OPSIONAL dan bawaannya kosong supaya
   * seluruh pemanggil lama tetap berlaku apa adanya.
   *
   * KENAPA menu Negara butuh ini (owner 2026-10-31): diukur hari itu, dari 40
   * drama hanya SATU yang punya kolom negara — sehingga isi menunya selama ini
   * adalah daftar negara produksi satu film saja. Film punya kolom negara yang
   * jauh lebih rapat lewat metadata IMDb. Alasan lengkap di
   * `opsiNegaraGabungan` (lib/film-jelajah.ts).
   */
  videos: PlaylyVideoPublik[] = [],
): NavMenu[] {
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
  // Jumlah drama berbayar. Saklar koin mati (lib/saklar-fitur.ts) → DIPAKSA 0,
  // dan kedua chip filter ("Gratis" + "Pakai Koin") hilang sendiri lewat syarat
  // `koin > 0` yang sudah ada di bawah — tanpa percabangan baru.
  //
  // KENAPA dipaksa di sini, bukan di tempat chip-nya digambar: angka inilah
  // artinya "ada judul yang perlu koin". Selama koin dijeda, tak ada. Memilah di
  // tempat gambar berarti dua aturan yang bisa melenceng (§3.3).
  const koin = PAYWALL_ENABLED
    ? hitung(dramas, (d) => Boolean(d.premium))
    : 0;
  const subIndo = hitung(dramas, (d) => Boolean(d.subtitles?.includes("id")));

  /**
   * SELURUH genre berisi, urut terbanyak. Dipecah dua di bawah: 20 pertama di
   * menu "Genre", sisanya di menu "Genre Lainnya" (owner 2026-11-14 memilih
   * bentuk dua kolom sesudah menu Genre tumbuh dari 6 jadi 24+ pilihan).
   *
   * 🪤 Tombol "GENRE LAINNYA" di DASAR dropdown sengaja TIDAK dipakai, walau
   * itu bentuk yang dikirim owner. Satu-satunya halaman yang bisa dituju
   * tombol itu (`/discover`) menyusun daftar genrenya sendiri dari katalog
   * DRAMA saja (FilterKatalog.tsx:44) — jadi tombolnya akan menjanjikan
   * "genre lainnya" lalu memulangkan daftar yang justru LEBIH PENDEK. Menu
   * bersebelahan memberi teks yang sama tanpa tautan yang berbohong.
   */
  const semuaGenre: (NavItem & { nilai: string })[] = [
    ...kategoriBerisi(dramas, videos).map((g) => ({
      nilai: g,
      label: labelGenre(g),
      href: tautan({ cat: g }),
    })),
    ...genreSinema(dramas, videos).map((g) => ({
      nilai: g,
      label: labelGenre(g),
      href: tautan({ genre: g }),
    })),
  ];
  /**
   * Dipecah menurut JENISNYA, bukan menurut jumlah (owner 2026-11-14).
   * Putaran sebelumnya memotong di angka 20 lalu menaruh sisanya di menu
   * "Genre Lainnya" — owner menilai pembagian itu tak bermakna bagi penonton:
   * yang dicari orang di menu Genre adalah genre FILM.
   */
  const genreFilmMenu = semuaGenre.filter((i) => genreFilmResmi(i.nilai));
  const kategoriDramaMenu = semuaGenre.filter((i) => !genreFilmResmi(i.nilai));

  const kandidat: (NavMenu | null)[] = [
    menu(
      "genre",
      "Genre",
      // Dua sumber yang SENGAJA digabung dalam satu daftar: kategori kurasi
      // DramaKu (?cat=) lebih dulu, lalu genre sinema OMDb (?genre=) yang
      // BELUM terwakili kategori mana pun. Tanpa penyaringan itu, "Action"
      // akan muncul dua kali dengan arti berbeda — penonton mengira menunya
      // rusak. Keduanya sudah dihitung dari katalog, jadi tiap pilihannya
      // dijamin berisi.
      // Label diterjemahkan, alamatnya TIDAK — lihat catatan di `NavItem`.
      genreFilmMenu,
      { kolom: KOLOM_GENRE },
    ),
    // ⚠️ SEJARAH KEPUTUSAN — jangan "dikembalikan" oleh sesi berikutnya.
    // 2026-09-21 owner meminta label "Series" & "+ More" ditulis PERSIS seperti
    // situs katalog pembanding (ditegaskan dua kali). 2026-10-30 owner
    // MENGOREKSI "+ More" jadi "Lainnya" ("more kamu ganti dengan bahasa
    // indonesia"). "Series" TIDAK ikut diubah — tidak diminta.
    // `key`-nya sengaja TIDAK ikut berubah ("jenis"/"lainnya"): itu kunci
    // internal yang dipakai React & tes, dan menggantinya cuma menambah risiko
    // tanpa satu pun perubahan yang terlihat penonton.
    // Diperluas 2026-11-14 (owner: "series kamu tambahkan ex. daftar series").
    // Tiap baris di sini MENGGABUNG dua penyaring yang sudah ada (`kind` +
    // `status`/`sort`), bukan fitur baru — `bacaFilter` di lib/discover.ts
    // membaca keduanya dari alamat yang sama, jadi gabungannya memang bekerja.
    // Syarat `> 0` dipertahankan supaya baris yang belum ada isinya hilang
    // sendiri, bukan jadi halaman hampa.
    menu("jenis", "Series", [
      serial > 0 ? { label: "Daftar Serial", href: tautan({ kind: "series" }) } : null,
      serial > 0 && adaTahun
        ? {
            label: "Serial Terbaru",
            href: tautan({ kind: "series", sort: "year" }),
          }
        : null,
      serial > 0 && tayang > 0
        ? {
            label: "Serial Masih Tayang",
            href: tautan({ kind: "series", status: "ongoing" }),
          }
        : null,
      serial > 0 && tamat > 0
        ? {
            label: "Serial Sudah Tamat",
            href: tautan({ kind: "series", status: "completed" }),
          }
        : null,
      film > 0 ? { label: "Daftar Film", href: tautan({ kind: "movie" }) } : null,
      film > 0 && adaTahun
        ? {
            label: "Film Terbaru",
            href: tautan({ kind: "movie", sort: "year" }),
          }
        : null,
    ]),
    // Diperbaiki 2026-11-14 (owner: "populer juga perbaiki"). Labelnya
    // diseragamkan dengan kata yang dipakai situs katalog pembanding
    // ("Terpopuler", "Rating"), dan "Judul A-Z" dipindahkan KE SINI dari menu
    // "Lainnya" — ia memang pengurutan, bukan penyaring, jadi tempatnya di
    // sini. ⚠️ Yang TIDAK bisa dibuat: "Komen Terbanyak" & "Baru Diupload" —
    // `sortCatalog` (lib/discover.ts) tidak punya kedua urutan itu, dan
    // menambahkannya butuh jumlah komentar per judul ikut dibawa ke katalog.
    // Menulis tautannya tanpa itu = menu yang terlihat hidup tapi memulangkan
    // urutan apa adanya.
    // Menampung DUA hal sejak 2026-11-14: pengurutan (sort) + penyaring yang
    // dulu tinggal di menu "Lainnya". Menu itu dipakai ulang untuk sisa genre
    // atas pilihan owner, jadi isinya pindah ke sini supaya nol fitur hilang.
    // MURNI PENGURUTAN sejak 2026-11-14 (owner: "populer jangan dimasukkan
    // IMDB"). Penyaring — Sub Indo, ambang IMDb, akses, status — pindah ke
    // menu "Lainnya" di bawah; nol pilihan hilang dari situs.
    menu("populer", "Populer", [
      { label: "Terpopuler", href: tautan({ sort: "populer" }) },
      adaRating
        ? { label: "Rating Tertinggi", href: tautan({ sort: "rating" }) }
        : null,
      adaTahun ? { label: "Tahun Terbaru", href: tautan({ sort: "year" }) } : null,
      { label: "Episode Terbanyak", href: tautan({ sort: "episodes" }) },
      { label: "Judul A-Z", href: tautan({ sort: "title" }) },
    ]),
    menu(
      "negara",
      "Negara",
      opsiNegaraGabungan(dramas, videos).map((n) => ({
        // Label diterjemahkan, alamatnya TIDAK — lihat catatan di `NavItem`.
        label: labelNegara(n),
        href: tautan({ negara: n }),
      })),
      { kolom: KOLOM_NEGARA },
    ),
    // Owner 2026-11-14: "tahun mulai dari tahun terbaru". Urutannya SUDAH
    // menurun sejak dulu (`tahunBerisi` & `getYearOptions` sama-sama
    // `Number(b) - Number(a)`); yang benar-benar salah adalah strip kuning di
    // bawah — lihat catatan di STRIP_KATALOG. Yang diperbaiki di sini:
    // daftarnya kini ikut menghitung tahun dari katalog VIDEO, jadi tahun yang
    // hanya dipunyai film tidak lagi hilang dari menu.
    menu(
      "tahun",
      "Tahun",
      tahunBerisi(dramas, videos).map((y) => ({
        label: y,
        href: tautan({ year: y }),
      })),
      { kolom: KOLOM_TAHUN },
    ),
    // Tempat sisa — padanan "+ More". Pilihan Gratis hanya berarti kalau
    // katalog memuat KEDUANYA; kalau semua judul gratis, ia cuma memulangkan
    // katalog utuh.
    // "LAINNYA" — owner 2026-11-14: "lainnya isi dengan dracin, k-drama dan
    // sejenisnya dan cukup tulisan lainnya (jangan genre lainnya)".
    //
    // Isinya dua kelompok, kategori khas drama Asia LEBIH DULU:
    //   1. Kategori yang BUKAN genre film (Tycoon, Harem, Time Travel, dan
    //      kelak Wuxia/Cultivation/dll begitu owner memakainya di admin) —
    //      inilah "dan sejenisnya" yang bisa dibangun dari data hari ini.
    //   2. Penyaring yang dikeluarkan dari menu Populer, supaya tidak hilang
    //      dari situs: Sub Indo, akses, status, ambang IMDb, Semua Judul.
    //
    // ⚠️ "Dracin"/"K-Drama" sebagai baris TERSENDIRI belum dibuat, dan itu
    // keputusan sadar: satu-satunya data asal-negara yang kita punya ada di
    // kolom `country`, dan kolom itu KOSONG untuk 40 dari 41 drama (diukur
    // 2026-11-14). Membuat baris "Dracin" dari `?negara=China` hari ini
    // memulangkan 9 FILM yang kebetulan ber-negara-produksi China — bukan
    // drama China yang dimaksud. Begitu kolom negara diisi dari panel admin,
    // barisnya bisa ditambahkan dan langsung benar.
    // "LAINNYA" — owner 2026-11-14.
    //
    // ⚠️ ATURAN KERAS BARU: tiap baris di sini WAJIB memakai penyaring yang
    // ikut mengenai DAFTAR FILM (`saringFilm` di lib/film-jelajah.ts mengenal
    // category, genre, negara, year, kind). Owner melaporkan "setiap di klik
    // yang muncul halaman sama" — sebabnya penyaring khas drama (Sub Indo,
    // ambang IMDb, akses koin, status tamat/tayang) TIDAK dikenal daftar
    // film, sementara daftar itulah yang memenuhi layar. Menu yang bekerja
    // dengan benar jadi terlihat seperti menu yang mati.
    //
    // Yang DIBUANG dari menu ini pada hari itu, beserta sebabnya:
    //   - IMDb 7+/8+/9+  -> diminta owner langsung ("hapus yang ada IMDBnya")
    //   - Sub Indo       -> `sub` tak dikenal saringFilm
    //   - Gratis / Pakai Koin -> `akses` tak dikenal saringFilm (lagipula
    //                      koin sedang dijeda, jadi keduanya sudah nol)
    //   - Sudah Tamat / Masih Tayang -> `status` tak dikenal saringFilm
    // Keempatnya TIDAK hilang dari situs: alamatnya tetap hidup
    // (`?sub=id`, `?rating=7`, `?status=completed`) dan bar filter di
    // /discover masih menyediakannya. Yang dilepas cuma tombolnya di navbar.
    menu("lainnya", "Lainnya", [
      // Drama Asia menurut negara — paling atas karena inilah yang owner cari.
      ...DRAMA_ASIA.map(({ label, negara }) =>
        hitung(dramas, (d) => !isMovie(d) && dramaDariNegara(d, negara)) > 0
          ? { label, href: tautan({ negara, kind: "series" }) }
          : null,
      ),
      ...kategoriDramaMenu,
      // Menu ini TIDAK ikut dapat baris penutup "Lainnya": namanya sudah
      // "Lainnya", dan "Semua Judul" di bawah ini alamatnya sama persis —
      // dua baris kembar di satu dropdown.
      { label: "Semua Judul", href: TUJUAN },
    ], { tanpaLainnya: true }),
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
 * URUTAN chip tetap PERSIS seperti yang ditulis owner. LABEL-nya kini lewat
 * `labelGenre`/`labelNegara` (owner 2026-10-30: "ubah bagian genre ke bahasa
 * indonesia agar sinkron semua") — jadi ejaan Indonesia ditentukan di SATU
 * tempat (lib/genre.ts), bukan ditulis ulang di sini. Tanpa itu strip dan menu
 * dropdown bisa menyebut genre yang sama dengan dua nama berbeda.
 *
 * Label ditulis huruf biasa; strip yang membesarkannya jadi huruf kapital
 * (CSS `uppercase`).
 */
export const STRIP_KATALOG: NavItem[] = [
  { label: labelGenre("Action"), href: tautan({ cat: "Action" }) },
  // OMDb menamai genre animasi "Animation" — "Anime" bukan nilai yang dikenal
  // di sana, jadi chip ini menyaring Animation tapi ditampilkan sebagai ANIME:
  // itu nama yang dicari penonton. Label sengaja ditulis tetap, BUKAN
  // labelGenre("Animation") yang akan memulangkan "Animasi".
  { label: "Anime", href: tautan({ genre: "Animation" }) },
  { label: labelGenre("Horror"), href: tautan({ genre: "Horror" }) },
  { label: labelGenre("Comedy"), href: tautan({ cat: "Comedy" }) },
  { label: labelGenre("Sci-Fi"), href: tautan({ genre: "Sci-Fi" }) },
  { label: labelGenre("Romance"), href: tautan({ cat: "Romance" }) },
  // Nama negara di alamat WAJIB memakai ejaan OMDb (bahasa Inggris) — itu yang
  // dicocokkan `cocokNegara`. Labelnya diterjemahkan lewat lib/negara.ts.
  { label: labelNegara("China"), href: tautan({ negara: "China" }) },
  { label: labelNegara("India"), href: tautan({ negara: "India" }) },
  { label: labelNegara("Japan"), href: tautan({ negara: "Japan" }) },
  { label: labelNegara("South Korea"), href: tautan({ negara: "South Korea" }) },
  { label: labelNegara("Thailand"), href: tautan({ negara: "Thailand" }) },
  // ⚠️ TERBARU DULU (owner 2026-11-14: "tahun mulai dari tahun terbaru").
  // Sebelumnya 2025 berdiri di depan 2026 — satu-satunya tempat di situs
  // yang tahunnya menaik, dan itulah yang terlihat owner di strip kuning.
  // Menu dropdown "Tahun" sudah menurun sejak dulu.
  { label: "2026", href: tautan({ year: "2026" }) },
  { label: "2025", href: tautan({ year: "2025" }) },
  { label: "Terpopuler", href: tautan({ sort: "populer" }) },
];
