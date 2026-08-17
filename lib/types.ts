export type Category =
  | "Semua"
  | "Romance"
  | "Tycoon"
  | "Harem"
  | "Time Travel"
  | "Action"
  | "Comedy"
  | "Fantasy";

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
  /** Status penayangan drama: sedang berjalan atau sudah selesai. */
  status?: "Ongoing" | "Completed";
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
