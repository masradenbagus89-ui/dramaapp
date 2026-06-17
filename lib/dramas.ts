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
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

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
