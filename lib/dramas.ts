// -------------------------------------------------------------------------
// Katalog drama. Dual-mode (sama seperti store.ts):
//   - DENGAN SUPABASE : tabel `dramas` (PostgreSQL via PostgREST).
//   - TANPA (lokal/dev): file data/dramas.json.
//
// Fungsi baca (getAllDramas/getDrama) kini ASYNC karena bisa query Supabase.
// -------------------------------------------------------------------------
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Drama } from "./types";
import { useSupabase, sbSelect, sbUpsert, sbDelete, eq } from "./supabase";
import { slugify } from "./format";

const DATA_FILE = join(process.cwd(), "data", "dramas.json");

const FALLBACK_GRADIENTS = [
  "from-rose-500 via-pink-700 to-purple-900",
  "from-amber-600 via-orange-800 to-red-950",
  "from-emerald-600 via-teal-800 to-slate-900",
  "from-indigo-700 via-purple-800 to-slate-900",
  "from-fuchsia-700 via-rose-800 to-stone-900",
  "from-stone-600 via-zinc-800 to-black",
  "from-violet-600 via-indigo-800 to-blue-950",
  "from-red-600 via-rose-800 to-purple-950",
  "from-yellow-500 via-amber-700 to-orange-900",
  "from-pink-600 via-rose-700 to-red-900",
];

// --- Pemetaan baris Supabase (snake_case) <-> Drama (camelCase) -------------
type DramaRow = {
  id: string;
  title: string;
  category: string;
  episodes: number;
  views: string | null;
  synopsis: string | null;
  gradient: string | null;
  poster_image: string | null;
  hero_image: string | null;
  hero_dim: boolean;
  exclusive: boolean;
  premium: boolean;
  subtitles: string[] | null;
  sort_index: number;
  imdb_id: string | null;
  year: string | null;
  content_rating: string | null;
  runtime: string | null;
  imdb_rating: string | null;
  imdb_votes: string | null;
  genre: string | null;
  director: string | null;
  writer: string | null;
  stars: string | null;
  country: string | null;
  language: string | null;
};

function rowToDrama(r: DramaRow): Drama {
  const d: Drama = {
    id: r.id,
    title: r.title,
    category: r.category as Drama["category"],
    episodes: r.episodes ?? 0,
    views: r.views ?? "",
    synopsis: r.synopsis ?? "",
    gradient: r.gradient ?? "",
  };
  // Field opsional hanya disertakan kalau terisi (samakan dengan bentuk JSON lama).
  if (r.poster_image) d.posterImage = r.poster_image;
  if (r.hero_image) d.heroImage = r.hero_image;
  if (r.hero_dim) d.heroDim = true;
  if (r.exclusive) d.exclusive = true;
  if (r.subtitles && r.subtitles.length) d.subtitles = r.subtitles;
  if (r.premium) d.premium = true;
  if (r.imdb_id) d.imdbId = r.imdb_id;
  if (r.year) d.year = r.year;
  if (r.content_rating) d.contentRating = r.content_rating;
  if (r.runtime) d.runtime = r.runtime;
  if (r.imdb_rating) d.imdbRating = r.imdb_rating;
  if (r.imdb_votes) d.imdbVotes = r.imdb_votes;
  if (r.genre) d.genre = r.genre;
  if (r.director) d.director = r.director;
  if (r.writer) d.writer = r.writer;
  if (r.stars) d.stars = r.stars;
  if (r.country) d.country = r.country;
  if (r.language) d.language = r.language;
  return d;
}

function dramaToRow(d: Drama, sortIndex: number): DramaRow {
  return {
    id: d.id,
    title: d.title,
    category: d.category,
    episodes: d.episodes ?? 0,
    views: d.views ?? "",
    synopsis: d.synopsis ?? "",
    gradient: d.gradient ?? "",
    poster_image: d.posterImage ?? null,
    hero_image: d.heroImage ?? null,
    hero_dim: Boolean(d.heroDim),
    exclusive: Boolean(d.exclusive),
    premium: Boolean(d.premium),
    subtitles: d.subtitles ?? [],
    sort_index: sortIndex,
    imdb_id: d.imdbId ?? null,
    year: d.year ?? null,
    content_rating: d.contentRating ?? null,
    runtime: d.runtime ?? null,
    imdb_rating: d.imdbRating ?? null,
    imdb_votes: d.imdbVotes ?? null,
    genre: d.genre ?? null,
    director: d.director ?? null,
    writer: d.writer ?? null,
    stars: d.stars ?? null,
    country: d.country ?? null,
    language: d.language ?? null,
  };
}

// --- Akses file lokal -------------------------------------------------------
function readLocalDramas(): Drama[] {
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf-8")) as Drama[];
  } catch {
    return [];
  }
}

function writeLocalDramas(dramas: Drama[]): void {
  writeFileSync(DATA_FILE, JSON.stringify(dramas, null, 2), "utf-8");
}

// Seed sekali dari data/dramas.json kalau tabel masih kosong (sekali per proses).
let seedChecked = false;
async function seedDramasIfEmpty(): Promise<void> {
  if (seedChecked) return;
  seedChecked = true;
  const probe = await sbSelect<{ id: string }>("dramas?select=id&limit=1");
  if (probe.length === 0) {
    const local = readLocalDramas();
    if (local.length) {
      await sbUpsert(
        "dramas",
        local.map((d, i) => dramaToRow(d, i)),
        "id",
      );
    }
  }
}

// =====================  BACA  ==============================================
export async function getAllDramas(): Promise<Drama[]> {
  if (useSupabase) {
    await seedDramasIfEmpty();
    const rows = await sbSelect<DramaRow>(
      "dramas?select=*&order=sort_index.asc",
    );
    return rows.map(rowToDrama);
  }
  return readLocalDramas();
}

export async function getDrama(id: string): Promise<Drama | undefined> {
  if (useSupabase) {
    const rows = await sbSelect<DramaRow>(
      `dramas?id=${eq(id)}&select=*&limit=1`,
    );
    return rows.length ? rowToDrama(rows[0]) : undefined;
  }
  return readLocalDramas().find((d) => d.id === id);
}

/**
 * Berapa lama katalog boleh basi di halaman publik. Dipakai bersama
 * `export const revalidate` di halaman — samakan angkanya supaya tak
 * membingungkan.
 */
export const CATALOG_TTL_SECONDS = 60;

/**
 * Versi ber-cache dari `getAllDramas` untuk HALAMAN PUBLIK.
 *
 * Beda dengan `getAllDramas`: (1) hasilnya boleh basi maksimal
 * CATALOG_TTL_SECONDS detik, (2) TIDAK menjalankan `seedDramasIfEmpty` —
 * menyemai database adalah urusan jalur admin, bukan efek samping dari
 * seseorang membuka beranda.
 *
 * Jalur tulis, admin, dan koin TETAP pakai `getAllDramas`/`getDrama`.
 */
export async function getAllDramasCached(): Promise<Drama[]> {
  if (useSupabase) {
    const rows = await sbSelect<DramaRow>(
      "dramas?select=*&order=sort_index.asc",
      { revalidate: CATALOG_TTL_SECONDS },
    );
    return rows.map(rowToDrama);
  }
  return readLocalDramas();
}

/** Versi ber-cache dari `getDrama` untuk halaman publik. Lihat catatan di atas. */
export async function getDramaCached(id: string): Promise<Drama | undefined> {
  if (useSupabase) {
    const rows = await sbSelect<DramaRow>(
      `dramas?id=${eq(id)}&select=*&limit=1`,
      { revalidate: CATALOG_TTL_SECONDS },
    );
    return rows.length ? rowToDrama(rows[0]) : undefined;
  }
  return readLocalDramas().find((d) => d.id === id);
}

// =====================  TULIS  ============================================
/** Tulis SELURUH katalog (upsert semua + hapus yang tak ada). Dipakai upload lokal. */
export async function writeAllDramas(dramas: Drama[]): Promise<void> {
  if (useSupabase) {
    if (dramas.length) {
      await sbUpsert(
        "dramas",
        dramas.map((d, i) => dramaToRow(d, i)),
        "id",
      );
    }
    const keep = new Set(dramas.map((d) => d.id));
    const current = await sbSelect<{ id: string }>("dramas?select=id");
    for (const r of current) {
      if (!keep.has(r.id)) await sbDelete("dramas", `id=${eq(r.id)}`);
    }
    return;
  }
  writeLocalDramas(dramas);
}

/** Tambah/ubah satu drama. `toFront` = taruh paling depan (untuk drama baru). */
export async function upsertDrama(drama: Drama, toFront = false): Promise<void> {
  if (useSupabase) {
    // Pertahankan sort_index lama kalau drama sudah ada; kalau baru, taruh depan/belakang.
    const existing = await sbSelect<{ sort_index: number }>(
      `dramas?id=${eq(drama.id)}&select=sort_index&limit=1`,
    );
    let sortIndex: number;
    if (existing.length) {
      sortIndex = existing[0].sort_index;
    } else {
      const edge = await sbSelect<{ sort_index: number }>(
        `dramas?select=sort_index&order=sort_index.${toFront ? "asc" : "desc"}&limit=1`,
      );
      sortIndex = edge.length ? edge[0].sort_index + (toFront ? -1 : 1) : 0;
    }
    await sbUpsert("dramas", dramaToRow(drama, sortIndex), "id");
    return;
  }
  const all = readLocalDramas();
  const idx = all.findIndex((d) => d.id === drama.id);
  if (idx === -1) {
    if (toFront) all.unshift(drama);
    else all.push(drama);
  } else {
    all[idx] = drama;
  }
  writeLocalDramas(all);
}

/** Hapus satu drama. Kembalikan true kalau ada yang terhapus. */
export async function removeDrama(id: string): Promise<boolean> {
  if (useSupabase) {
    const existing = await sbSelect<{ id: string }>(
      `dramas?id=${eq(id)}&select=id&limit=1`,
    );
    if (!existing.length) return false;
    await sbDelete("dramas", `id=${eq(id)}`);
    return true;
  }
  const all = readLocalDramas();
  const idx = all.findIndex((d) => d.id === id);
  if (idx === -1) return false;
  all.splice(idx, 1);
  writeLocalDramas(all);
  return true;
}

// =====================  HELPER (sinkron, murni)  ===========================
export { slugify };

export function generateUniqueId(title: string, existing: Drama[]): string {
  const base = slugify(title) || "drama";
  if (!existing.some((d) => d.id === base)) return base;
  let n = 2;
  while (existing.some((d) => d.id === `${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export function pickRandomGradient(): string {
  return FALLBACK_GRADIENTS[Math.floor(Math.random() * FALLBACK_GRADIENTS.length)];
}

export type { Drama, Category } from "./types";
export { CATEGORIES } from "./types";
