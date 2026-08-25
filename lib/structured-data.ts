import { isMovie, type Drama } from "./types";

/**
 * Data terstruktur (JSON-LD) untuk halaman detail drama.
 *
 * PENTING — hanya memakai `imdbRating`/`imdbVotes` dari OMDb, yaitu angka NYATA
 * dari pihak ketiga. Rating penonton DramaKu sengaja TIDAK dipakai di sini:
 * identitas viewer belum aman (lihat BATAS JUJUR di lib/store.ts), dan mengirim
 * rating yang bisa dipalsukan ke Google berisiko penalti.
 *
 * Blok aggregateRating dihilangkan sama sekali kalau datanya tak ada — lebih
 * baik tanpa bintang daripada mengirim angka karangan.
 */
export function dramaJsonLd(drama: Drama, url: string): Record<string, unknown> {
  // Film dan serial punya tipe schema.org yang berbeda. Mengirim "TVSeries"
  // untuk film (apalagi dengan numberOfEpisodes) = memberi Google keterangan
  // yang salah tentang halaman ini.
  const film = isMovie(drama);
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": film ? "Movie" : "TVSeries",
    name: drama.title,
    url,
    description: drama.synopsis,
    ...(film ? {} : { numberOfEpisodes: drama.episodes }),
    inLanguage: "id",
  };

  const image = drama.heroImage || drama.posterImage;
  if (image) data.image = image;
  if (drama.genre) data.genre = drama.genre.split(",").map((g) => g.trim());
  if (drama.year) data.datePublished = drama.year;
  if (drama.director) data.director = { "@type": "Person", name: drama.director };
  if (drama.stars) {
    data.actor = drama.stars.split(",").map((n) => ({
      "@type": "Person",
      name: n.trim(),
    }));
  }

  const rating = Number(drama.imdbRating);
  const votes = Number(String(drama.imdbVotes ?? "").replace(/[^0-9]/g, ""));
  if (Number.isFinite(rating) && rating > 0 && votes > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: rating,
      ratingCount: votes,
      bestRating: 10, // skala IMDb, bukan skala 5 bintang milik DramaKu
      worstRating: 1,
    };
  }

  return data;
}

/**
 * Serialisasi aman untuk ditanam di dalam <script>. Tanpa ini, judul drama
 * yang mengandung "</script>" bisa menutup tag lebih awal dan menyuntikkan
 * HTML (XSS). Karakter kurung-buka diganti escape unicode yang tetap valid JSON.
 */
export function toJsonLdScript(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
