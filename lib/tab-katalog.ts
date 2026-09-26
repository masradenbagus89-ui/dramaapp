// -------------------------------------------------------------------------
// TAB KATALOG halaman depan — deret tab gaya situs streaming katalog
// (TERBARU · SERIES UNGGULAN · SERIES UPDATE · TERPOPULER · REKOMENDASI · <tahun>).
//
// Semua fungsi MURNI (tanpa DOM, tanpa jaringan) supaya bisa diuji tanpa browser
// — tests/tab-katalog.test.ts.
//
// ATURAN YANG MENENTUKAN BENTUK BERKAS INI (pelajaran 2026-09-21 yang sudah
// tercatat di project): TIAP TAB WAJIB BENAR-BENAR MENYARING. Tab yang isinya
// sama persis dengan tab sebelah terbaca seperti tombol rusak — lebih
// menyesatkan daripada tab yang tidak ada. Karena itu tiap definisi di bawah
// dipilih dari data yang MEMANG ADA di katalog, bukan dari nama tabnya saja.
//
// PENANDA OWNER MENANG ATAS TEBAKAN OTOMATIS (keputusan owner 2026-09-22):
// dua tab memakai pola "pakai penanda owner kalau ada, kalau belum ada jatuh ke
// hitungan otomatis". Jadi tabnya berisi sejak hari pertama, DAN makin akurat
// begitu owner mulai menandai drama di panel admin — tanpa perlu ganti kode.
// -------------------------------------------------------------------------
import type { Drama } from "./types";
import { isMovie } from "./types";
import { sortCatalog } from "./beranda-catalog";
import { parseRating, parseViews } from "./format";

export type TabKey =
  | "terbaru"
  | "unggulan"
  | "update"
  | "terpopuler"
  | "rekomendasi"
  | "tahun";

/** Berapa poster yang tampil di baris geser sebuah tab (sebelum "SEMUA" ditekan). */
export const TAB_ROW_ITEMS = 14;

export type TabKatalog = {
  key: TabKey;
  /** Tulisan di tombol tab. */
  label: string;
  /** Judul bagian di bawah deret tab (mis. "Terbaru Ditambahkan"). */
  judul: string;
  /** Kalimat sebaris yang menjelaskan isi tab ini ke penonton awam. */
  keterangan: string;
};

/**
 * Tahun paling baru yang BENAR-BENAR ada di katalog — dipakai sebagai label tab
 * terakhir. Dihitung, bukan ditulis tetap: tab bertuliskan "2026" akan menjadi
 * bohong sendiri begitu katalog berisi judul 2027, dan tak ada error yang
 * memberi tahu. `null` = katalog belum punya tahun sama sekali → tab tahun tidak
 * digambar (lebih baik tak ada tab daripada tab kosong).
 */
export function tahunTerbaru(dramas: Drama[]): string | null {
  const tahun = dramas
    .map((d) => d.year?.trim())
    .filter((t): t is string => Boolean(t && /^\d{4}$/.test(t)));
  return tahun.length ? tahun.sort().at(-1)! : null;
}

/**
 * Susunan tab. Tab tahun hanya ikut kalau katalog punya tahun — lihat alasannya
 * di `tahunTerbaru`.
 */
/**
 * Judul bagian = NAMA TAB-nya, cuma diubah dari huruf besar semua jadi kapital
 * di awal kata. "SERIES UNGGULAN" → "Series Unggulan".
 *
 * ⚠️ DIHITUNG, bukan diketik ulang (owner 2026-09-26: "nama seperti series
 * unggulan harus sama dengan yang dibawah juga"). Sebelumnya keduanya ditulis
 * terpisah dan sudah menyimpang di EMPAT dari enam tab — tab "TERBARU"
 * berjudul "Terbaru Ditambahkan", "TERPOPULER" berjudul "Paling Banyak
 * Ditonton", dan seterusnya. Penonton mengklik satu nama lalu mendarat di
 * nama lain, dan mengira tabnya salah. Dengan diturunkan seperti ini, dua
 * nama itu MUSTAHIL berbeda lagi.
 *
 * Angka lewat apa adanya: "2024" tidak punya huruf untuk dikapitalkan.
 */
export function judulDariLabel(label: string): string {
  return label
    .toLowerCase()
    .split(" ")
    .map((kata) => (kata ? kata[0].toUpperCase() + kata.slice(1) : kata))
    .join(" ");
}

export function daftarTab(dramas: Drama[]): TabKatalog[] {
  /** Keterangan tetap menjelaskan isinya — yang WAJIB sama cuma judulnya. */
  const buat = (
    key: TabKey,
    label: string,
    keterangan: string,
  ): TabKatalog => ({ key, label, judul: judulDariLabel(label), keterangan });

  const tab: TabKatalog[] = [
    buat("terbaru", "TERBARU", "Judul yang paling baru masuk katalog DramaKu."),
    buat("unggulan", "SERIES UNGGULAN", "Serial pilihan — ditandai sendiri oleh admin."),
    buat("update", "SERIES UPDATE", "Serial yang episodenya masih bertambah."),
    buat("terpopuler", "TERPOPULER", "Diurutkan dari jumlah penonton terbanyak."),
    buat("rekomendasi", "REKOMENDASI", "Diurutkan dari rating tertinggi."),
  ];

  const th = tahunTerbaru(dramas);
  if (th) {
    tab.push(buat("tahun", th, `Judul yang tahun tayangnya ${th}.`));
  }
  return tab;
}

/** Tab yang dipakai kalau alamat belum menyebut apa-apa. */
export const TAB_BAWAAN: TabKey = "terbaru";

export function parseTab(value: string | null | undefined): TabKey {
  const sah: TabKey[] = [
    "terbaru",
    "unggulan",
    "update",
    "terpopuler",
    "rekomendasi",
    "tahun",
  ];
  return sah.find((t) => t === value) ?? TAB_BAWAAN;
}

// ---------------------------------------------------------------- isi tab ---
const serialSaja = (dramas: Drama[]) => dramas.filter((d) => !isMovie(d));

/**
 * Isi satu tab. SELALU memulangkan array baru — mengurutkan array milik
 * pemanggil akan diam-diam mengubah urutan katalog halaman lain.
 *
 * Tiap cabang menyebut penandanya sendiri supaya sesi berikutnya tahu dari mana
 * angkanya datang, bukan menebak dari nama tab.
 */
export function isiTab(dramas: Drama[], tab: TabKey): Drama[] {
  switch (tab) {
    case "unggulan":
      return isiUnggulan(dramas);
    case "update":
      return isiUpdate(dramas);
    case "terpopuler":
      // `views` teks bebas ("1.2M", "780k") — parseViews yang menerjemahkannya.
      return [...dramas].sort((a, b) => parseViews(b.views) - parseViews(a.views));
    case "rekomendasi":
      // Rating dulu, jumlah penonton sebagai pemecah seri. Tanpa pemecah seri,
      // katalog yang ratingnya seragam akan tampil dalam urutan acak yang
      // berubah-ubah tiap render — terlihat seperti daftar yang tak stabil.
      return [...dramas].sort(
        (a, b) =>
          parseRating(b.imdbRating) - parseRating(a.imdbRating) ||
          parseViews(b.views) - parseViews(a.views),
      );
    default:
      return sortCatalog(dramas, "terbaru");
  }
}

/**
 * SERIES UNGGULAN — serial yang DITANDAI unggulan oleh admin (`exclusive`).
 *
 * Kalau admin belum menandai satu pun, jatuh ke serial berbayar koin
 * (`premium`): itu judul yang memang sudah dipilih owner untuk disorot, jadi
 * paling dekat maknanya dengan "unggulan". Kalau itu pun nol, jatuh lagi ke
 * serial terbaru — supaya tabnya TIDAK PERNAH kosong (tab kosong = tombol yang
 * terbaca rusak).
 */
function isiUnggulan(dramas: Drama[]): Drama[] {
  const serial = serialSaja(dramas);
  const ditandai = serial.filter((d) => d.exclusive);
  if (ditandai.length) return sortCatalog(ditandai, "terbaru");
  const berbayar = serial.filter((d) => d.premium);
  return sortCatalog(berbayar.length ? berbayar : serial, "terbaru");
}

/**
 * SERIES UPDATE — serial yang episodenya masih bertambah (`status === "Ongoing"`).
 *
 * Belum ada yang diberi status → jatuh ke serial yang paling baru masuk katalog.
 * Alasannya sama dengan di atas: lebih baik daftar yang masuk akal daripada tab
 * kosong yang terbaca seperti fitur rusak.
 */
function isiUpdate(dramas: Drama[]): Drama[] {
  const serial = serialSaja(dramas);
  const ongoing = serial.filter((d) => d.status === "Ongoing");
  return sortCatalog(ongoing.length ? ongoing : serial, "terbaru");
}

/**
 * Isi tab tahun. Dipisah dari `isiTab` karena butuh tahunnya sebagai masukan —
 * memasukkannya ke `isiTab` berarti fungsi itu menerima dua hal yang tak selalu
 * terpakai (§3.6).
 */
export function isiTahun(dramas: Drama[], tahun: string | null): Drama[] {
  if (!tahun) return [];
  return sortCatalog(
    dramas.filter((d) => d.year?.trim() === tahun),
    "terbaru",
  );
}

/** Isi tab apa pun, termasuk tab tahun — satu pintu untuk pemanggil tampilan. */
export function isiTabLengkap(dramas: Drama[], tab: TabKey): Drama[] {
  return tab === "tahun" ? isiTahun(dramas, tahunTerbaru(dramas)) : isiTab(dramas, tab);
}
