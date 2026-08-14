// -------------------------------------------------------------------------
// Helper untuk mengambil metadata drama dari IMDb lewat OMDb API.
// Hanya membaca data publik (judul, sinopsis, poster, tahun, genre, rating,
// sutradara, writer, stars, dll.) lalu mengubahnya menjadi draft yang siap
// diisi ke form admin DramaKu.
//
// Catatan: IMDb tidak menyediakan API gratis untuk aplikasi kecil. Kita
// pakai OMDb (Open Movie Database) yang legal dan murah: daftar key gratis
// di https://www.omdbapi.com/apikey.aspx.
// Banner lebar (hero) tidak ada di OMDb — opsional lewat TMDB_API_KEY.
// -------------------------------------------------------------------------
import { slugify } from "./format";

const OMDB_FETCH_MS = 8_000;
const MAX_SEASONS_TO_COUNT = 15;

/**
 * Ambil kunci OMDb dari env. Kalau yang tertempel URL lengkap
 * (contoh dari omdbapi.com), ambil parameter apikey-nya saja.
 */
export function resolveOmdbApiKey(raw: string | undefined): string {
  const v = (raw ?? "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) {
    try {
      const fromQuery = new URL(v).searchParams.get("apikey")?.trim();
      if (fromQuery) return fromQuery;
    } catch {
      return "";
    }
    return "";
  }
  return v;
}

const OMDB_API_KEY = resolveOmdbApiKey(process.env.OMDB_API_KEY);
const TMDB_API_KEY = (process.env.TMDB_API_KEY ?? "").trim();

const CATEGORY_OPTIONS = [
  "Romance",
  "Tycoon",
  "Harem",
  "Time Travel",
  "Action",
  "Comedy",
  "Fantasy",
];

export type OmdbTitleKind = "movie" | "series" | "episode" | "game" | "";

export type OmdbDramaDraft = {
  imdbId: string;
  slug: string;
  title: string;
  year: string;
  synopsis: string;
  posterImage: string | null;
  banner: string;
  genre: string;
  genreList: string[];
  stars: string;
  starList: string[];
  director: string;
  writer: string;
  writerList: string[];
  runtime: string;
  contentRating: string;
  imdbRating: string;
  imdbVotes: string;
  country: string;
  language: string;
  kind: OmdbTitleKind;
  totalSeasons: string;
  episodeCount: number | null;
  suggestedCategory: string | null;
};

/** JSON metadata sesuai kontrak admin (plus episodeCount untuk series). */
export type ImdbMetadataJson = {
  title: string;
  year: string;
  poster: string;
  banner: string;
  genre: string[];
  rating: string;
  runtime: string;
  country: string;
  language: string;
  description: string;
  director: string;
  writers: string[];
  stars: string[];
  episodeCount?: number;
};

export type OmdbTitlePayload = {
  Response?: string;
  Error?: string;
  Title?: string;
  Year?: string;
  Rated?: string;
  Runtime?: string;
  Plot?: string;
  Poster?: string;
  Genre?: string;
  Actors?: string;
  Director?: string;
  Writer?: string;
  Language?: string;
  Country?: string;
  Type?: string;
  totalSeasons?: string;
  imdbRating?: string;
  imdbVotes?: string;
  imdbID?: string;
};

export class ImdbLookupError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ImdbLookupError";
    this.status = status;
  }
}

/** Cek format ID IMDb: harus diawali 'tt' lalu angka. */
export function isValidImdbId(id: string): boolean {
  return /^tt\d+$/i.test(id.trim());
}

/** Normalisasi nilai OMDb: "N/A" / kosong → string kosong. */
export function omdbText(value: string | undefined): string {
  const v = (value ?? "").trim();
  if (!v || v.toUpperCase() === "N/A") return "";
  return v;
}

/** Pecah daftar OMDb yang dipisah koma ("A, B, C") jadi array bersih. */
export function splitOmdbList(value: string | undefined): string[] {
  const raw = omdbText(value);
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/** OMDb poster default kecil (SX300). Naikkan lebar supaya tidak pecah di hero. */
export function enlargeOmdbImage(url: string, width = 1200): string {
  const src = omdbText(url);
  if (!src) return "";
  if (/m\.media-amazon\.com/i.test(src) && /_V1_/i.test(src)) {
    return src.replace(/_V1_[^./]*/i, `_V1_SX${width}`);
  }
  return src;
}

export function parseOmdbKind(type: string | undefined): OmdbTitleKind {
  const t = omdbText(type).toLowerCase();
  if (t === "movie" || t === "series" || t === "episode" || t === "game") {
    return t;
  }
  return "";
}

/** Coba cocokkan genre OMDb dengan kategori yang tersedia di DramaKu. */
function guessCategory(genre: string): string | null {
  const parts = genre.split(",").map((g) => g.trim().toLowerCase());
  for (const c of CATEGORY_OPTIONS) {
    if (parts.includes(c.toLowerCase())) return c;
  }
  return null;
}

export function toImdbMetadata(draft: OmdbDramaDraft): ImdbMetadataJson {
  const json: ImdbMetadataJson = {
    title: draft.title,
    year: draft.year,
    poster: draft.posterImage ?? "",
    banner: draft.banner,
    genre: draft.genreList,
    rating: draft.imdbRating,
    runtime: draft.runtime,
    country: draft.country,
    language: draft.language,
    description: draft.synopsis,
    director: draft.director,
    writers: draft.writerList,
    stars: draft.starList,
  };
  if (draft.episodeCount != null && draft.episodeCount > 0) {
    json.episodeCount = draft.episodeCount;
  }
  return json;
}

export function mapOmdbPayloadToDraft(
  data: OmdbTitlePayload,
  extras: { banner?: string; episodeCount?: number | null } = {},
): OmdbDramaDraft {
  const title = omdbText(data.Title);
  const genreList = splitOmdbList(data.Genre);
  const writerList = splitOmdbList(data.Writer);
  const starList = splitOmdbList(data.Actors);
  const genre = genreList.join(", ");
  const posterRaw = enlargeOmdbImage(omdbText(data.Poster), 600);
  const kind = parseOmdbKind(data.Type);

  return {
    imdbId: omdbText(data.imdbID),
    slug: slugify(title),
    title,
    year: omdbText(data.Year),
    synopsis: omdbText(data.Plot),
    posterImage: posterRaw || null,
    banner: extras.banner ?? "",
    genre,
    genreList,
    stars: starList.join(", "),
    starList,
    director: omdbText(data.Director),
    writer: writerList.join(", "),
    writerList,
    runtime: omdbText(data.Runtime),
    contentRating: omdbText(data.Rated),
    imdbRating: omdbText(data.imdbRating),
    imdbVotes: omdbText(data.imdbVotes),
    country: omdbText(data.Country),
    language: omdbText(data.Language),
    kind,
    totalSeasons: omdbText(data.totalSeasons),
    episodeCount: extras.episodeCount ?? null,
    suggestedCategory: guessCategory(genre),
  };
}

function omdbUrl(params: Record<string, string>): string {
  const url = new URL("https://www.omdbapi.com/");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url.toString();
}

async function fetchOmdbJson(params: Record<string, string>): Promise<unknown> {
  if (!OMDB_API_KEY) {
    throw new ImdbLookupError(
      "OMDB_API_KEY belum di-set. Daftar gratis di omdbapi.com/apikey.aspx.",
      503,
    );
  }
  const res = await fetch(omdbUrl({ ...params, apikey: OMDB_API_KEY }), {
    signal: AbortSignal.timeout(OMDB_FETCH_MS),
    next: { revalidate: 0 },
  });
  const data = (await res.json().catch(() => ({}))) as OmdbTitlePayload;
  const omdbError = (data.Error ?? "").trim();
  if (res.status === 401 || /invalid api key/i.test(omdbError)) {
    throw new ImdbLookupError(
      "Kunci OMDb ditolak. Di .env.local, OMDB_API_KEY harus berisi kunci dari omdbapi.com/apikey.aspx (bukan URL lengkap), lalu aktifkan lewat email. Setelah ganti, restart server lokal.",
      401,
    );
  }
  if (!res.ok) {
    throw new ImdbLookupError(
      `Gagal menghubungi OMDb (HTTP ${res.status}).`,
      502,
    );
  }
  return data;
}

async function countSeriesEpisodes(
  imdbId: string,
  totalSeasonsRaw: string,
): Promise<number | null> {
  const seasons = Number.parseInt(totalSeasonsRaw, 10);
  if (!Number.isFinite(seasons) || seasons < 1) return null;
  const n = Math.min(seasons, MAX_SEASONS_TO_COUNT);
  const counts = await Promise.all(
    Array.from({ length: n }, (_, i) =>
      fetchSeasonEpisodeCount(imdbId, i + 1),
    ),
  );
  let total = 0;
  for (const c of counts) total += c ?? 0;
  return total > 0 ? total : null;
}

async function fetchSeasonEpisodeCount(
  imdbId: string,
  season: number,
): Promise<number | null> {
  try {
    const data = (await fetchOmdbJson({
      i: imdbId,
      Season: String(season),
    })) as { Response?: string; Episodes?: unknown[] };
    if (data.Response === "False" || !Array.isArray(data.Episodes)) return null;
    return data.Episodes.length;
  } catch {
    return null;
  }
}

async function fetchTmdbBanner(imdbId: string): Promise<string> {
  if (!TMDB_API_KEY) return "";
  try {
    const url = new URL(
      `https://api.themoviedb.org/3/find/${encodeURIComponent(imdbId)}`,
    );
    url.searchParams.set("external_source", "imdb_id");
    url.searchParams.set("api_key", TMDB_API_KEY);
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(OMDB_FETCH_MS),
      next: { revalidate: 0 },
    });
    if (!res.ok) return "";
    const data = (await res.json().catch(() => ({}))) as {
      movie_results?: { backdrop_path?: string | null }[];
      tv_results?: { backdrop_path?: string | null }[];
    };
    const path =
      data.movie_results?.find((r) => r.backdrop_path)?.backdrop_path ||
      data.tv_results?.find((r) => r.backdrop_path)?.backdrop_path ||
      "";
    if (!path) return "";
    return `https://image.tmdb.org/t/p/w1280${path}`;
  } catch {
    return "";
  }
}

/**
 * Ambil draft drama dari OMDb berdasarkan ID IMDb.
 * @throws ImdbLookupError kalau key belum di-set, ID invalid, atau OMDb tidak menemukan data.
 */
export async function fetchImdbDraft(imdbId: string): Promise<OmdbDramaDraft> {
  if (!OMDB_API_KEY) {
    throw new ImdbLookupError(
      "OMDB_API_KEY belum di-set. Daftar gratis di omdbapi.com/apikey.aspx.",
      503,
    );
  }
  if (!isValidImdbId(imdbId)) {
    throw new ImdbLookupError(
      "ID IMDb tidak valid — contoh yang benar: tt19869990 (The Glory).",
      400,
    );
  }

  const data = (await fetchOmdbJson({
    i: imdbId.trim(),
    plot: "full",
  })) as OmdbTitlePayload;

  const omdbError = (data.Error ?? "").trim();
  if (data.Response === "False" || !data.imdbID) {
    throw new ImdbLookupError(
      omdbError || "Drama/film tidak ditemukan di database OMDb.",
      404,
    );
  }

  const kind = parseOmdbKind(data.Type);
  const [banner, episodeCount] = await Promise.all([
    fetchTmdbBanner(data.imdbID),
    kind === "series"
      ? countSeriesEpisodes(data.imdbID, omdbText(data.totalSeasons))
      : Promise.resolve(null),
  ]);

  return mapOmdbPayloadToDraft(data, { banner, episodeCount });
}
