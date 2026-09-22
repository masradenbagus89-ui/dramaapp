export type Category =
  | "Semua"
  | "Romance"
  | "Tycoon"
  | "Harem"
  | "Time Travel"
  | "Action"
  | "Comedy"
  | "Fantasy";

/** Jenis tayangan: serial berepisode, atau film 1 video utuh. */
export type DramaKind = "series" | "movie";

/** Status penayangan drama. Nilainya sengaja sama dengan isi kolom DB `status`. */
export type DramaStatus = "Ongoing" | "Completed";

/** Pilihan status untuk form admin — label yang dibaca owner, bukan istilah DB. */
export const DRAMA_STATUS_OPTIONS: { value: DramaStatus; label: string }[] = [
  { value: "Ongoing", label: "Masih tayang (episode masih nambah)" },
  { value: "Completed", label: "Tamat (semua episode sudah lengkap)" },
];

/**
 * SATU tempat yang memutuskan status kiriman sah atau tidak.
 *
 * Dipakai di SERVER: form admin memang cuma menyediakan dua pilihan, tapi UI
 * bukan pagar — siapa pun bisa mengirim body apa saja ke endpoint admin. Nilai
 * di luar dua itu dipulangkan `undefined` (dianggap kosong), bukan disimpan
 * apa adanya — kolom status yang berisi teks ngawur membuat kartu drama
 * memasang label yang tak berarti.
 */
export function parseDramaStatus(value: unknown): DramaStatus | undefined {
  return value === "Ongoing" || value === "Completed" ? value : undefined;
}

/**
 * Kualitas video yang boleh dipajang di lencana kanan-atas poster.
 *
 * Urut dari paling buruk ke paling bagus — itu urutan yang dilihat owner di
 * dropdown panel admin, dan urutan yang dipahami penonton situs streaming
 * (CAM = rekaman bioskop, buram; BluRay/4K = sumber cakram, paling tajam).
 *
 * Daftar ini SUMBER TUNGGAL. Salinannya ada sebagai CHECK constraint di
 * `supabase_migrations/add_quality_to_dramas.sql` — dua tempat ini WAJIB sama;
 * penjaganya `tests/lencana-kartu.test.ts` yang benar-benar membaca berkas SQL
 * itu lalu membandingkannya (bukan sekadar percaya komentar).
 */
export const DRAMA_QUALITY_OPTIONS = [
  "CAM",
  "HDCAM",
  "HD",
  "HDTV",
  "WEB-DL",
  "WEBRip",
  "BluRay",
  "4K",
] as const;

export type DramaQuality = (typeof DRAMA_QUALITY_OPTIONS)[number];

/**
 * SATU tempat yang memutuskan kiriman kualitas sah atau tidak — kembaran
 * `parseDramaStatus` di atas, dan alasannya sama: dropdown admin memang cuma
 * menyediakan 8 pilihan, TAPI UI bukan pagar (siapa pun bisa mengirim body apa
 * saja ke endpoint admin). Nilai di luar daftar dipulangkan `undefined`
 * (dianggap kosong), bukan disimpan apa adanya — poster yang memajang label
 * ngawur lebih merugikan penonton daripada poster tanpa label.
 *
 * Sengaja PERSIS huruf-besarnya: "hd" ditolak, bukan diam-diam dibetulkan jadi
 * "HD". Alasannya CHECK constraint di database juga persis — memperbaiki di
 * sini berarti kode & database punya dua aturan yang menyimpang.
 */
export function parseDramaQuality(value: unknown): DramaQuality | undefined {
  return DRAMA_QUALITY_OPTIONS.find((q) => q === value);
}

export type Drama = {
  id: string;
  title: string;
  category: Exclude<Category, "Semua">;
  episodes: number;
  views: string;
  synopsis: string;
  gradient: string;
  posterImage?: string;
  heroImage?: string;
  heroDim?: boolean;
  exclusive?: boolean;
  /** Kode bahasa subtitle yang tersedia untuk drama ini, mis. ["id", "en"]. */
  subtitles?: string[];
  /**
   * true = drama berbayar (pakai koin untuk buka episode di atas gratis).
   * Drama lama tanpa field ini = GRATIS. Biasanya hanya drama BARU yang di-set
   * premium, supaya koleksi lama tetap bisa ditonton gratis.
   */
  premium?: boolean;
  /**
   * Status penayangan: masih tayang atau sudah tamat. Boleh KOSONG — drama
   * lama belum punya nilai ini, dan tampilan wajib DIAM kalau kosong (jangan
   * menebak "Ongoing"; itu memberi tahu penonton bahwa drama tamat masih
   * berjalan). Lihat parseDramaStatus di bawah.
   */
  status?: DramaStatus;
  /**
   * Jenis tayangan: serial berepisode (default) atau film 1 video utuh.
   * Judul lama tanpa field ini = "series" — itulah sebabnya tandanya "movie"
   * yang eksplisit, bukan tebakan dari `episodes === 1` (serial yang baru
   * punya 1 episode juga bernilai 1, jadi tebakan itu akan salah).
   * Nilainya sengaja sama dengan `OmdbTitleKind` di lib/imdb-tool.ts.
   */
  kind?: DramaKind;
  /**
   * Kualitas sumber video ("CAM", "HD", "WEB-DL", …) — dipajang di lencana
   * kanan-atas poster. Boleh KOSONG, dan itu keadaan normal: kolomnya baru
   * ditambahkan 2026-09-22 dan 41 judul yang sudah ada sengaja dibiarkan kosong
   * (keputusan owner). Kosong = lencananya TIDAK digambar — jangan menebak "HD",
   * sebab itu menjanjikan ketajaman yang belum tentu ada ke penonton.
   * Lihat parseDramaQuality di atas.
   */
  quality?: DramaQuality;
  /** Metadata IMDb (opsional; dari OMDb). Drama lama tanpa field ini = valid. */
  imdbId?: string;
  year?: string;
  contentRating?: string;
  runtime?: string;
  imdbRating?: string;
  imdbVotes?: string;
  /** Genre teks dari OMDb (boleh beda dari `category` katalog DramaKu). */
  genre?: string;
  director?: string;
  writer?: string;
  stars?: string;
  country?: string;
  language?: string;
};

// --- Subtitle / multi-bahasa ---------------------------------------------
// File .vtt disajikan dari folder video yang sama di PC backup, dengan pola
// nama: <drama-id>/<ep>.<kode>.vtt  (mis. "1.id.vtt", "1.en.vtt").
export type SubtitleLang = {
  code: string; // BCP-47, dipakai juga sebagai srcLang & suffix nama file
  label: string; // teks yang tampil di menu pemilih subtitle
};

export const SUBTITLE_LANGS: SubtitleLang[] = [
  { code: "id", label: "Indonesia" },
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "ms", label: "Melayu" },
  { code: "ar", label: "العربية" },
  { code: "es", label: "Español" },
];

export function subtitleLabel(code: string): string {
  return SUBTITLE_LANGS.find((l) => l.code === code)?.label ?? code.toUpperCase();
}

// --- Film vs serial ---------------------------------------------------------

/** Film = 1 berkas video (`1.mp4`), jadi jumlah episodenya selalu ini. */
export const MOVIE_EPISODE_COUNT = 1;

/**
 * Satu-satunya tempat yang memutuskan "ini film atau serial". Semua tampilan
 * (kartu, halaman detail, pemutar, data Google) memanggil ini supaya tidak ada
 * dua aturan yang menyimpang.
 */
export function isMovie(drama: Pick<Drama, "kind">): boolean {
  return drama.kind === "movie";
}

/** Hasil pembacaan aturan jenis tayangan dari data form (lihat `resolveKindRules`). */
export type KindRules = {
  kind: DramaKind;
  /** Jumlah episode final. `null` = angka dari form tidak sah (serial < 1). */
  episodes: number | null;
  /** `undefined` = tidak dikirim → jangan diubah. Film selalu `false` (gratis). */
  premium: boolean | undefined;
};

/**
 * SATU tempat yang menerjemahkan pilihan "Serial / Film" jadi angka & tanda
 * yang disimpan. Murni (tanpa database/jaringan) supaya bisa dites, dan dipakai
 * di SERVER — form admin memang menyembunyikan kolom yang tak berlaku, tapi UI
 * bukan pagar: siapa pun bisa mengirim body apa saja ke endpoint admin.
 *
 * Dua aturan film: (1) selalu 1 video (`1.mp4`), berapa pun isi kolom episode;
 * (2) selalu gratis — aturan koin menggratiskan episode 1..FREE_EPISODES
 * (lib/coins.ts), jadi tanda berbayar pada film cuma akan berbohong.
 */
export function resolveKindRules(body: {
  kind?: unknown;
  episodes?: unknown;
  premium?: unknown;
}): KindRules {
  const kind: DramaKind = body.kind === "movie" ? "movie" : "series";
  if (kind === "movie") {
    return { kind, episodes: MOVIE_EPISODE_COUNT, premium: false };
  }
  const n = Number(body.episodes);
  return {
    kind,
    episodes: Number.isFinite(n) && n >= 1 ? Math.floor(n) : null,
    premium: typeof body.premium === "boolean" ? body.premium : undefined,
  };
}

export const CATEGORIES: Category[] = [
  "Semua",
  "Romance",
  "Tycoon",
  "Harem",
  "Time Travel",
  "Action",
  "Comedy",
  "Fantasy",
];
