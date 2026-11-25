// -------------------------------------------------------------------------
// FILM IKUT TERSARING di halaman jelajah (owner 2026-10-31).
//
// MASALAHNYA: penonton mengklik genre "Anime" lalu mendarat di halaman yang
// berbunyi "0 judul" — padahal katalog film kita berisi ratusan judul. Sebabnya
// penyaring hanya pernah berlaku untuk katalog DRAMA; film (video Playly) cuma
// disaring oleh KETIKAN kotak cari (`cariVideoPlayly`), tidak pernah oleh
// genre/negara/tahun. Karena itu pesan di layar sempat berbunyi "ada 443 video
// yang cocok" untuk genre apa pun — angka itu jumlah SELURUH film, bukan yang
// cocok.
//
// KENAPA BERKAS SENDIRI, bukan ditumpuk ke lib/discover.ts: aturan di sana
// bekerja atas `Drama` (punya `category` kurasi, `episodes`, `status`, akses
// koin), sedangkan film adalah `PlaylyVideoPublik` yang tak punya satu pun dari
// itu. Menyatukannya berarti satu fungsi dengan dua bentuk data dan serentetan
// cabang "kalau ini drama / kalau ini film" — persis yang dilarang §3.6.
//
// Yang DIPAKAI ULANG dari discover.ts: `pecahDaftar`. Aturan memecah nilai OMDb
// gabungan ("Action, Drama, History") WAJIB sama di kedua sisi.
//
// Semua fungsi MURNI (tanpa DOM/jaringan) — tests/film-jelajah.test.ts.
// -------------------------------------------------------------------------
import type { Drama } from "./types";
import type { PlaylyVideoPublik } from "./playly-publik";
import { negaraDari, pecahDaftar, type FilterDramaOptions } from "./discover";
import { benuaDari, labelNegara, namaKanonik, URUTAN_BENUA } from "./negara";

/**
 * Berapa negara yang boleh masuk menu.
 *
 * KENAPA DIBATASI: katalog memuat 62 negara, dan ekornya berisi puluhan
 * negara dengan satu-dua judul saja — daftar sepanjang itu membuat negara yang
 * benar-benar berisi jadi sulit ditemukan.
 *
 * ⚠️ ANGKANYA NAIK 12 -> 24 pada 2026-11-14 (owner: "negara bisa kamu
 * tambahkan lagi negaranya"). Alasan angka 12 yang lama — "jumlah baris yang
 * masih terbaca sekali pandang dalam satu dropdown, tanpa menggulir" — sudah
 * TIDAK berlaku: menu Negara digambar 4 kolom seperti Tahun (`KOLOM_NEGARA`
 * di lib/nav-katalog.ts), jadi 24 nama muat dalam 6 baris.
 *
 * Yang terpotong TIDAK hilang dari situs: negaranya tetap bisa dicapai lewat
 * alamat `?negara=<nama>` dan tetap ikut tersaring. Yang dibatasi cuma isi
 * menunya.
 */
export const BATAS_MENU_NEGARA = 24;

/** Samakan huruf besar-kecil sebelum dibandingkan. OMDb tidak konsisten. */
const samakan = (teks: string) => teks.trim().toLowerCase();

/**
 * Genre sebuah film, sebagai daftar.
 *
 * Menggabungkan DUA sumber yang artinya berbeda tapi sama-sama sah dipakai
 * mencari: `kategori` (pilihan admin, satu nilai, cocok dengan kategori kurasi
 * katalog) dan `genre` (teks bebas dari OMDb, bisa berisi daftar).
 */
export function genreFilm(v: PlaylyVideoPublik): string[] {
  return [...pecahDaftar(v.kategori), ...pecahDaftar(v.genre)];
}

/** Negara produksi sebuah film, sebagai daftar. */
export function negaraFilm(v: PlaylyVideoPublik): string[] {
  return pecahDaftar(v.country);
}

/**
 * Apakah film ini cocok dengan satu nilai penyaring genre?
 *
 * ⚠️ `category` dan `genre` dari penyaring DIADU ke daftar yang SAMA, dan itu
 * disengaja. Untuk drama keduanya memang beda arti (kategori kurasi vs genre
 * OMDb), tapi film tidak punya kategori kurasi — nol film pernah diberi
 * kategori oleh admin. Kalau `category` hanya diadu ke `v.kategori`, maka
 * mengklik "Komedi" (yang mengirim `cat=Comedy`) akan memulangkan NOL film
 * selamanya, dan halaman tetap kosong persis seperti sebelum perbaikan ini.
 */
function cocokSatuGenre(v: PlaylyVideoPublik, nilai: string): boolean {
  if (!nilai || nilai === "all" || nilai === "Semua") return true;
  const dicari = samakan(nilai);
  return genreFilm(v).some((g) => samakan(g) === dicari);
}

function cocokNegaraFilm(v: PlaylyVideoPublik, nilai: string): boolean {
  if (!nilai || nilai === "all") return true;
  // `namaKanonik` DULU, baru `samakan`: katalog memuat "USA" dan
  // "United States" untuk negara yang sama. Aturannya dibuat kembar dengan
  // `cocokNegara` (lib/discover.ts) — dua aturan berbeda untuk satu pertanyaan
  // berarti drama dan film bisa menjawab beda, dan itu tak memunculkan error.
  const dicari = samakan(namaKanonik(nilai));
  return negaraFilm(v).some((n) => samakan(namaKanonik(n)) === dicari);
}

function cocokTahunFilm(v: PlaylyVideoPublik, nilai: string): boolean {
  if (!nilai || nilai === "all") return true;
  return (v.year ?? "").trim() === nilai.trim();
}

/**
 * Saring daftar film dengan penyaring yang SAMA dengan katalog drama.
 *
 * Sengaja menerima `FilterDramaOptions` apa adanya — bentuk yang sudah dirakit
 * `filterOptions()` di halaman jelajah — supaya tidak ada bentuk filter kedua
 * yang harus ikut diperbarui tiap kali penyaringnya bertambah.
 *
 * Yang SENGAJA TIDAK diterapkan ke film, karena datanya memang tidak ada:
 * `kind` (serial/film — semua video di sini film), `status` (ongoing/tamat),
 * `akses` (koin), `sub`, dan `minRating`. Memaksakannya berarti menyaring
 * dengan nilai karangan.
 *
 * Ketikan kotak cari TIDAK ditangani di sini — itu tetap milik
 * `cariVideoPlayly` (HasilPlayly.tsx) yang sudah dipakai dan diuji. Pemanggil
 * merangkai keduanya.
 */
export function saringFilm(
  videos: PlaylyVideoPublik[],
  options: FilterDramaOptions = {},
): PlaylyVideoPublik[] {
  const {
    category = "Semua",
    genre = "all",
    negara = "all",
    year = "all",
    kind = "all",
  } = options;
  // 🪤 `kind` DULU DIABAIKAN di sini, dan itu bug yang dilaporkan owner
  // 2026-11-14: "ketika di klik harus bisa kebuka film filmnya, jangan setiap
  // di klik yang muncul halaman sama". Penyaring Serial/Film hanya mengenai
  // katalog drama, sementara daftar film di bawahnya tidak berubah sedikit
  // pun — dan daftar itulah yang memenuhi layar (ratusan judul). Jadi menu
  // yang bekerja dengan benar TERLIHAT seperti menu yang mati.
  //
  // Video Playly SELALU film, tak pernah serial: ia satuan tayang tunggal
  // tanpa nomor episode. Jadi "serial" = nol film, "film" = semuanya.
  if (kind === "series") return [];
  return videos.filter(
    (v) =>
      cocokSatuGenre(v, category) &&
      cocokSatuGenre(v, genre) &&
      cocokNegaraFilm(v, negara) &&
      cocokTahunFilm(v, year),
  );
}

/**
 * Daftar negara untuk menu "Negara", dihitung dari katalog drama DAN film.
 *
 * KENAPA HARUS GABUNGAN (owner 2026-10-31: "negara kamu perbaiki karena ada
 * indonesia juga, asia dll"): diukur hari itu, dari 40 drama hanya **1** yang
 * punya kolom negara — film "Meg 2 The Trench", yang negaranya berbunyi
 * "United States, China, Thailand, Germany, Canada, United Kingdom". Jadi
 * seluruh isi menu Negara selama ini adalah negara produksi SATU judul, dan
 * itulah persis daftar aneh yang dilihat owner. Film punya kolom negara yang
 * terisi jauh lebih rapat, lewat metadata IMDb-nya.
 *
 * Urut dari yang judulnya TERBANYAK, lalu abjad — aturan yang sama dengan
 * `getCountryOptions` untuk drama.
 */
export function opsiNegaraGabungan(
  dramas: Drama[],
  videos: PlaylyVideoPublik[] = [],
  batas = BATAS_MENU_NEGARA,
): string[] {
  return [...hitungNegara(dramas, videos).entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "id"))
    .slice(0, batas)
    .map(([negara]) => negara);
}

/**
 * Berapa JUDUL yang dimiliki tiap negara. Satu sumber hitungan untuk daftar
 * datar maupun daftar per-benua, jadi keduanya mustahil berbeda isi.
 */
function hitungNegara(
  dramas: Drama[],
  videos: PlaylyVideoPublik[],
): Map<string, number> {
  const jumlah = new Map<string, number>();
  const hitung = (daftar: string[]) => {
    // Dihitung per JUDUL, bukan per kemunculan: satu film ko-produksi enam
    // negara tidak boleh menenggelamkan negara yang benar-benar punya banyak
    // judul. Set menjaga satu judul = satu suara per negara.
    //
    // `namaKanonik` dipakai SEBELUM masuk Set: tanpa itu "USA" dan
    // "United States" terhitung dua negara berbeda, dan satu film yang
    // menyebut keduanya bahkan memberi dua suara untuk negara yang sama.
    for (const n of new Set(
      daftar.map((x) => namaKanonik(x)).filter(Boolean),
    )) {
      jumlah.set(n, (jumlah.get(n) ?? 0) + 1);
    }
  };
  for (const d of dramas) hitung(negaraDari(d));
  for (const v of videos) hitung(negaraFilm(v));
  return jumlah;
}

/** Satu kelompok benua beserta negara-negaranya (ejaan data, bukan label). */
export type KelompokNegara = { benua: string; negara: string[] };

/**
 * SELURUH negara yang punya isi, dikelompokkan per benua.
 *
 * ⚠️ TANPA BATAS JUMLAH — dan itu intinya. `opsiNegaraGabungan` di atas
 * memotong di 24 nama supaya daftar datarnya tetap terbaca; owner 2026-11-25
 * meminta SEMUA negara bisa muncul (*"atau kamu ada solusi lain agar semua
 * negara bisa muncul"*) dan memilih pengelompokan per benua dari 3 pilihan.
 * Pengelompokan itulah yang menggantikan peran pemotongan: 57 nama tetap
 * terbaca karena mata mencari lewat benuanya dulu.
 *
 * Urutan kelompok mengikuti `URUTAN_BENUA` (Asia lebih dulu), dan di dalam tiap
 * kelompok negara diurutkan dari yang paling banyak judulnya. Kelompok kosong
 * tidak ikut dipulangkan — judul benua tanpa satu pun negara di bawahnya
 * terbaca seperti daftar yang gagal dimuat.
 */
export function opsiNegaraPerBenua(
  dramas: Drama[],
  videos: PlaylyVideoPublik[] = [],
): KelompokNegara[] {
  const jumlah = hitungNegara(dramas, videos);
  const perBenua = new Map<string, string[]>();
  for (const negara of jumlah.keys()) {
    const benua = benuaDari(negara);
    const isi = perBenua.get(benua);
    if (isi) isi.push(negara);
    else perBenua.set(benua, [negara]);
  }

  return URUTAN_BENUA.map((benua) => ({
    benua,
    negara: (perBenua.get(benua) ?? []).sort(
      (a, b) =>
        (jumlah.get(b) ?? 0) - (jumlah.get(a) ?? 0) ||
        labelNegara(a).localeCompare(labelNegara(b), "id"),
    ),
  })).filter((k) => k.negara.length > 0);
}
