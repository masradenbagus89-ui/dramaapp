// -------------------------------------------------------------------------
// Helper untuk mengambil metadata drama dari IMDb lewat OMDb API.
// Hanya membaca data publik (judul, sinopsis, poster, tahun, genre) lalu
// mengubahnya menjadi draft yang siap diisi ke form admin DramaKu.
//
// Catatan: IMDb tidak menyediakan API gratis untuk aplikasi kecil. Kita
// pakai OMDb (Open Movie Database) yang legal dan murah: daftar key gratis
// di https://www.omdbapi.com/apikey.aspx.
// -------------------------------------------------------------------------
import { slugify } from "./format";

const OMDB_API_KEY = process.env.OMDB_API_KEY;

const CATEGORY_OPTIONS = [
  "Romance",
  "Tycoon",
  "Harem",
  "Time Travel",
  "Action",
  "Comedy",
  "Fantasy",
];

export type OmdbDramaDraft = {
  imdbId: string;
  slug: string;
  title: string;
  year: string;
  synopsis: string;
  posterImage: string | null;
  genre: string;
  actors: string;
  director: string;
  suggestedCategory: string | null;
};

/** Cek format ID IMDb: harus diawali 'tt' lalu angka. */
export function isValidImdbId(id: string): boolean {
  return /^tt\d+$/i.test(id.trim());
}

/** Coba cocokkan genre OMDb dengan kategori yang tersedia di DramaKu. */
function guessCategory(genre: string): string | null {
  const parts = genre.split(",").map((g) => g.trim().toLowerCase());
  for (const c of CATEGORY_OPTIONS) {
    if (parts.includes(c.toLowerCase())) return c;
  }
  return null;
}

/**
 * Ambil draft drama dari OMDb berdasarkan ID IMDb.
 * @throws Error kalau key belum di-set, ID invalid, atau OMDb tidak menemukan data.
 */
export async function fetchImdbDraft(imdbId: string): Promise<OmdbDramaDraft> {
  if (!OMDB_API_KEY) {
    throw new Error(
      "OMDB_API_KEY belum di-set. Daftar gratis di omdbapi.com/apikey.aspx.",
    );
  }
  if (!isValidImdbId(imdbId)) {
    throw new Error(
      "ID IMDb tidak valid — contoh yang benar: tt19869990 (The Glory).",
    );
  }

  const url = new URL("https://www.omdbapi.com/");
  url.searchParams.set("i", imdbId.trim());
  url.searchParams.set("apikey", OMDB_API_KEY);

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) {
    throw new Error(`Gagal menghubungi OMDb (HTTP ${res.status}).`);
  }

  const data = (await res.json()) as {
    Response?: string;
    Error?: string;
    Title?: string;
    Year?: string;
    Plot?: string;
    Poster?: string;
    Genre?: string;
    Actors?: string;
    Director?: string;
    imdbID?: string;
  };

  if (data.Response === "False" || !data.imdbID) {
    throw new Error(
      data.Error || "Drama/film tidak ditemukan di database OMDb.",
    );
  }

  const title = data.Title ?? "";
  const posterImage =
    data.Poster && data.Poster !== "N/A" ? data.Poster : null;

  return {
    imdbId: data.imdbID,
    slug: slugify(title),
    title,
    year: data.Year ?? "",
    synopsis: data.Plot ?? "",
    posterImage,
    genre: data.Genre ?? "",
    actors: data.Actors ?? "",
    director: data.Director ?? "",
    suggestedCategory: guessCategory(data.Genre ?? ""),
  };
}
