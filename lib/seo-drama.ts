// -------------------------------------------------------------------------
// SEO per drama: generator template + penyaring isian admin. MURNI (tanpa
// database/jaringan) supaya dipakai bersama oleh form admin (pratinjau &
// tombol "Generate SEO Otomatis") dan halaman publik (generateMetadata).
//
// ATURAN JUJUR: generator HANYA merangkai data yang sudah ada di drama. Tahun
// kosong = tak ditulis tahun; drama berbayar = tak ditulis "gratis"; tak ada
// sinopsis = deskripsi lebih pendek, bukan diisi kalimat karangan.
// -------------------------------------------------------------------------
import { SITE_NAME } from "./site";
import { isMovie, type Drama, type SeoDrama } from "./types";

/** Batas yang ditampilkan Google; lebih dari ini dipotong "...". */
export const SEO_TITLE_MAX = 60;
export const SEO_DESCRIPTION_MIN = 150;
export const SEO_DESCRIPTION_MAX = 160;
export const SEO_KEYWORDS_MIN = 5;
export const SEO_KEYWORDS_MAX = 10;

/**
 * Batas KERAS isian admin di server. Sengaja lebih longgar dari batas ideal di
 * atas: admin boleh menulis sedikit lebih panjang (form memperingatkannya),
 * tapi body raksasa dari luar form tidak ikut tersimpan.
 */
const TITLE_KERAS = 100;
const DESCRIPTION_KERAS = 300;
const KEYWORD_SATU_KERAS = 60;

const MEREK = ` | ${SITE_NAME}`;
/** Sisa ruang potongan sinopsis di bawah ini tak layak dibaca → tak dipakai. */
const POTONGAN_SINOPSIS_MIN = 20;

/** Data drama yang dibaca generator — sengaja sebatas ini, bukan Drama utuh. */
// `category` dilonggarkan ke string: form admin menyimpannya sebagai teks biasa,
// dan generator memang hanya membacanya sebagai teks.
export type SumberSeo = Pick<
  Drama,
  "title" | "synopsis" | "episodes" | "kind" | "premium" | "year" | "genre" | "country"
> & { category: string };

/** Satu baris, spasi rapat. */
function rapikan(teks: string | undefined): string {
  return (teks ?? "").replace(/\s+/g, " ").trim();
}

/** Potong di batas kata dengan "…" — hasil TERMASUK "…" tetap ≤ maks. */
function potongKata(teks: string, maks: number): string {
  if (teks.length <= maks) return teks;
  const cut = teks.slice(0, maks - 1);
  const spasi = cut.lastIndexOf(" ");
  return `${(spasi > 0 ? cut.slice(0, spasi) : cut).replace(/[\s,.;:–-]+$/, "")}…`;
}

/** Film = selalu gratis (resolveKindRules); serial = gratis kalau tak berbayar. */
function gratis(d: SumberSeo): boolean {
  return isMovie(d) || !d.premium;
}

/** Daftar genre: genre OMDb kalau ada, kalau tidak kategori katalog DramaKu. */
function daftarGenre(d: SumberSeo): string[] {
  const sumber = rapikan(d.genre) || rapikan(d.category);
  return sumber
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);
}

/** "Judul (2024)" — tahun kosong = judul saja. */
function judulTahun(d: SumberSeo): string {
  const tahun = rapikan(d.year);
  return tahun ? `${rapikan(d.title)} (${tahun})` : rapikan(d.title);
}

export function buatJudulSeo(d: SumberSeo): string {
  const jt = judulTahun(d);
  // Kandidat dari yang paling kaya ke paling ringkas; dipakai yang pertama muat.
  const kandidat = [
    `Nonton ${jt} Sub Indo${gratis(d) ? " Gratis" : ""}${MEREK}`,
    `${jt} Sub Indo${MEREK}`,
    `${jt}${MEREK}`,
  ];
  const muat = kandidat.find((k) => k.length <= SEO_TITLE_MAX);
  return muat ?? `${potongKata(jt, SEO_TITLE_MAX - MEREK.length)}${MEREK}`;
}

/** "Nonton <judul> … di <SITE_NAME>." dengan judul yang sudah ditentukan. */
function rangkaiPembuka(d: SumberSeo, judul: string): string {
  const tahun = rapikan(d.year);
  const jenis = isMovie(d)
    ? `film ${judul}${tahun ? ` (${tahun})` : ""} sub Indo`
    : `${judul}${tahun ? ` (${tahun})` : ""} sub Indo${d.episodes > 1 ? ` ${d.episodes} episode` : ""}`;
  return `Nonton ${jenis}${gratis(d) ? " gratis" : ""} di ${SITE_NAME}.`;
}

/**
 * Pembuka yang SELALU utuh sampai nama situs: kalau kepanjangan, judulnya yang
 * dipendekkan. Dulu seluruh kalimat dipotong dari belakang, jadi nama situs
 * yang pertama terbuang ("… 60 episode di…").
 */
function pembukaMuat(d: SumberSeo): string {
  const judul = rapikan(d.title);
  const utuh = rangkaiPembuka(d, judul);
  if (utuh.length <= SEO_DESCRIPTION_MAX) return utuh;
  const ruangJudul = SEO_DESCRIPTION_MAX - (utuh.length - judul.length);
  return rangkaiPembuka(d, potongKata(judul, ruangJudul));
}

/** Tambah "Genre A, B." sebanyak genre yang muat — dibuang per genre, bukan dipotong di tengah. */
function tambahGenre(pembuka: string, genre: string[]): string {
  for (let n = genre.length; n > 0; n--) {
    const kalimat = `${pembuka} Genre ${genre.slice(0, n).join(", ")}.`;
    if (kalimat.length <= SEO_DESCRIPTION_MAX) return kalimat;
  }
  return pembuka;
}

export function buatDeskripsiSeo(d: SumberSeo): string {
  const dasar = tambahGenre(pembukaMuat(d), daftarGenre(d));

  const sinopsis = rapikan(d.synopsis);
  const sisa = SEO_DESCRIPTION_MAX - dasar.length - 1;
  if (!sinopsis || sisa < POTONGAN_SINOPSIS_MIN) return dasar;
  return `${dasar} ${potongKata(sinopsis, sisa)}`;
}

/**
 * Keyword dari judul, jenis, tahun, genre, negara. Selalu ≥5: judul sendiri
 * sudah menghasilkan 3, ditambah genre/kategori (selalu ada) dan jenis.
 *
 * Sinopsis SENGAJA tidak ditambang: memilih "kata penting" dari kalimat bebas
 * tanpa model bahasa menghasilkan kata acak ("dia", "kemudian") — keyword
 * sampah lebih buruk daripada tidak ada.
 */
export function buatKeywordSeo(d: SumberSeo): string {
  // Koma di judul WAJIB dibuang: koma = pemisah keyword, jadi judul
  // "A, B" akan terpecah jadi dua keyword setengah-judul. Tanda seru/tanya
  // ikut dibuang — orang tak mengetiknya di kotak pencarian.
  const judul = rapikan(d.title.replace(/[,!?]+/g, " ")).toLowerCase();
  const tahun = rapikan(d.year);
  const jenis = isMovie(d) ? "film" : "drama";
  const negara = rapikan(d.country).split(",")[0]?.trim().toLowerCase();
  const daftar = [
    judul,
    `${judul} sub indo`,
    `nonton ${judul}`,
    tahun && `${judul} ${tahun}`,
    ...daftarGenre(d).slice(0, 2).map((g) => `${jenis} ${g.toLowerCase()} sub indo`),
    negara && `${jenis} ${negara}`,
    tahun && `${jenis} ${tahun}`,
    `${jenis} sub indo`,
  ];
  return normalKeyword(daftar.filter(Boolean).join(","));
}

/** Ketiga kolom sekaligus — dipakai tombol "Generate SEO Otomatis". */
export function buatSeoOtomatis(d: SumberSeo): Required<SeoDrama> {
  return {
    title: buatJudulSeo(d),
    description: buatDeskripsiSeo(d),
    keywords: buatKeywordSeo(d),
  };
}

/** Rapikan daftar keyword: huruf kecil, tanpa kosong/kembar, maks SEO_KEYWORDS_MAX. */
export function normalKeyword(teks: string): string {
  const unik = new Set<string>();
  for (const k of teks.split(",")) {
    const bersih = rapikan(k).toLowerCase().slice(0, KEYWORD_SATU_KERAS);
    if (bersih) unik.add(bersih);
  }
  return [...unik].slice(0, SEO_KEYWORDS_MAX).join(", ");
}

/** Berapa keyword di teks (untuk penghitung di form). */
export function hitungKeyword(teks: string): number {
  return teks.split(",").filter((k) => k.trim()).length;
}

/**
 * Saring isian SEO dari body/dokumen — DATA TAK-TEPERCAYA (UI bukan pagar).
 * Kolom kosong DIBUANG; semua kosong = `undefined` (kembali "otomatis").
 */
export function parseSeoDrama(raw: unknown): SeoDrama | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  const teks = (v: unknown, maks: number) =>
    typeof v === "string" ? rapikan(v).slice(0, maks) : "";

  const out: SeoDrama = {};
  const title = teks(r.title, TITLE_KERAS);
  const description = teks(r.description, DESCRIPTION_KERAS);
  const keywords = typeof r.keywords === "string" ? normalKeyword(r.keywords) : "";
  if (title) out.title = title;
  if (description) out.description = description;
  if (keywords) out.keywords = keywords;
  return Object.keys(out).length ? out : undefined;
}

/**
 * SEO yang DIPAKAI halaman: isian admin per kolom, kolom kosong diisi
 * generator. Dihitung saat tampil (bukan disimpan) supaya ikut data terbaru —
 * sinopsis diedit, deskripsi otomatisnya ikut berubah.
 */
export function seoTerpakai(d: SumberSeo & Pick<Drama, "seo">): Required<SeoDrama> {
  const otomatis = buatSeoOtomatis(d);
  return {
    title: d.seo?.title || otomatis.title,
    description: d.seo?.description || otomatis.description,
    keywords: d.seo?.keywords || otomatis.keywords,
  };
}
