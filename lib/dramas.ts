import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Drama } from "./types";

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

export function getAllDramas(): Drama[] {
  const raw = readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw) as Drama[];
}

export function writeAllDramas(dramas: Drama[]): void {
  writeFileSync(DATA_FILE, JSON.stringify(dramas, null, 2), "utf-8");
}

export function getDrama(id: string): Drama | undefined {
  return getAllDramas().find((d) => d.id === id);
}

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
