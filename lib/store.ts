// -------------------------------------------------------------------------
// Penyimpanan data dual-mode:
//   - DI VERCEL  : pakai Upstash Redis / Vercel KV (filesystem read-only).
//   - DI LOKAL   : tetap pakai file JSON di folder data/ (seperti semula).
//
// Saklarnya otomatis: kalau env var KV ada -> pakai KV, kalau tidak -> file.
// Tidak ada dependency tambahan; akses KV lewat REST API bawaan (fetch).
//
// Catatan konkurensi:
//   - likes    : pakai Redis HASH + HINCRBY (atomik) -> tidak ada hitungan hilang.
//   - comments : disimpan per-drama (key "comments:<id>") -> komentar antar-drama
//                tidak saling menimpa. (Dua komentar pada drama YANG SAMA dalam
//                ~puluhan ms bersamaan masih bisa balapan; sangat jarang & sama
//                seperti perilaku versi file lama.)
//   - admins   : objek tunggal; penambahan admin sangat jarang -> last-writer-wins
//                dapat diterima.
// -------------------------------------------------------------------------
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

export type Admin = { email: string; name: string; addedAt: string };
export type AdminsFile = { admins: Admin[] };

export type Comment = {
  id: string;
  user: string;
  email: string;
  role: "admin" | "viewer";
  text: string;
  time: string;
};
export type CommentsFile = { comments: Record<string, Comment[]> };

export type InteractionsFile = { likes: Record<string, number> };

// Vercel KV maupun Upstash menyuntikkan salah satu pasangan env var ini.
const KV_URL =
  process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? "";
const KV_TOKEN =
  process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
const useKV = Boolean(KV_URL && KV_TOKEN);

// --- Klien KV minimal (Upstash REST: POST body berisi array perintah) -------
// Mengembalikan field `result` mentah dari respons (bisa string, number, array).
async function kvCommand(cmd: (string | number)[]): Promise<unknown> {
  const res = await fetch(KV_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cmd.map(String)),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`KV error ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { result?: unknown; error?: string };
  if (data.error) throw new Error(`KV error: ${data.error}`);
  return data.result ?? null;
}

async function kvGet<T>(key: string): Promise<T | null> {
  const result = await kvCommand(["GET", key]);
  if (result == null) return null;
  try {
    return JSON.parse(result as string) as T;
  } catch {
    return null;
  }
}

async function kvSet<T>(key: string, value: T): Promise<void> {
  await kvCommand(["SET", key, JSON.stringify(value)]);
}

// --- Akses file lokal (dipakai saat dev / KV belum di-set) ------------------
function localPath(file: string): string {
  return join(process.cwd(), "data", file);
}

function readLocal<T>(file: string, fallback: T): T {
  const p = localPath(file);
  if (!existsSync(p)) return fallback;
  try {
    return JSON.parse(readFileSync(p, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(file: string, value: T): void {
  const p = localPath(file);
  mkdirSync(dirname(p), { recursive: true }); // pastikan folder data/ ada
  writeFileSync(p, JSON.stringify(value, null, 2), "utf-8");
}

// --- Pembungkus generik objek-penuh: KV bila tersedia, kalau tidak file -----
async function readData<T>(key: string, file: string, fallback: T): Promise<T> {
  if (useKV) {
    const fromKV = await kvGet<T>(key);
    if (fromKV !== null) return fromKV;
    // Belum ada di KV: ambil dari file JSON bawaan (read-only di Vercel = OK),
    // simpan sebagai seed awal, lalu kembalikan.
    const seed = readLocal<T>(file, fallback);
    try {
      await kvSet(key, seed);
    } catch {
      /* abaikan kegagalan seed; tetap kembalikan datanya */
    }
    return seed;
  }
  return readLocal<T>(file, fallback);
}

async function writeData<T>(key: string, file: string, value: T): Promise<void> {
  if (useKV) {
    await kvSet(key, value);
    return;
  }
  writeLocal<T>(file, value);
}

// =====================  ADMINS (objek tunggal)  =============================
const DEFAULT_ADMINS: AdminsFile = {
  admins: [
    { email: "admin@dramaku.com", name: "Admin Utama", addedAt: "2026-05-06" },
  ],
};

export function getAdmins(): Promise<AdminsFile> {
  return readData<AdminsFile>("admins", "admins.json", DEFAULT_ADMINS);
}
export function setAdmins(data: AdminsFile): Promise<void> {
  return writeData("admins", "admins.json", data);
}

/** True jika email termasuk admin terdaftar (sumber sama dengan getAdmins). */
export async function isAdminEmail(
  email: string | null | undefined,
): Promise<boolean> {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  const { admins } = await getAdmins();
  return admins.some((a) => a.email.trim().toLowerCase() === e);
}

// =====================  LIKES (Redis HASH, atomik)  =========================
const LIKES_HASH = "likes";

/** Semua jumlah like: { dramaId: count }. */
export async function getLikes(): Promise<Record<string, number>> {
  if (useKV) {
    const flat = (await kvCommand(["HGETALL", LIKES_HASH])) as unknown[] | null;
    const map: Record<string, number> = {};
    if (Array.isArray(flat)) {
      for (let i = 0; i + 1 < flat.length; i += 2) {
        map[String(flat[i])] = Number(flat[i + 1]) || 0;
      }
    }
    // Seed sekali dari file lama kalau hash masih kosong.
    if (Object.keys(map).length === 0) {
      const seed = readLocal<InteractionsFile>("interactions.json", {
        likes: {},
      }).likes;
      const entries = Object.entries(seed);
      if (entries.length) {
        try {
          for (const [id, count] of entries) {
            await kvCommand(["HSET", LIKES_HASH, id, count]);
          }
        } catch {
          /* abaikan kegagalan seed */
        }
        return seed;
      }
    }
    return map;
  }
  return readLocal<InteractionsFile>("interactions.json", { likes: {} }).likes;
}

/** Tambah/kurang like secara atomik; mengembalikan jumlah terbaru. */
export async function changeLike(
  dramaId: string,
  action: "like" | "unlike",
): Promise<number> {
  if (useKV) {
    if (action === "unlike") {
      let n = Number(
        await kvCommand(["HINCRBY", LIKES_HASH, dramaId, -1]),
      );
      if (n < 0) {
        await kvCommand(["HSET", LIKES_HASH, dramaId, 0]);
        n = 0;
      }
      return n;
    }
    return Number(await kvCommand(["HINCRBY", LIKES_HASH, dramaId, 1]));
  }
  // Mode lokal: read-modify-write file (proses tunggal, aman).
  const data = readLocal<InteractionsFile>("interactions.json", { likes: {} });
  const current = data.likes[dramaId] ?? 0;
  data.likes[dramaId] = action === "unlike" ? Math.max(0, current - 1) : current + 1;
  writeLocal("interactions.json", data);
  return data.likes[dramaId];
}

// =====================  COMMENTS (per-drama)  ===============================
function commentsKey(dramaId: string): string {
  return `comments:${dramaId}`;
}

/** Komentar untuk satu drama (terbaru di depan). */
export async function getCommentsFor(dramaId: string): Promise<Comment[]> {
  if (useKV) {
    const v = await kvGet<Comment[]>(commentsKey(dramaId));
    if (v !== null) return v;
    // Seed sekali dari file lama (kalau ada komentar untuk drama ini).
    const seed =
      readLocal<CommentsFile>("comments.json", { comments: {} }).comments[
        dramaId
      ] ?? [];
    if (seed.length) {
      try {
        await kvSet(commentsKey(dramaId), seed);
      } catch {
        /* abaikan kegagalan seed */
      }
    }
    return seed;
  }
  return (
    readLocal<CommentsFile>("comments.json", { comments: {} }).comments[
      dramaId
    ] ?? []
  );
}

/** Tambah komentar (disisipkan paling depan). */
export async function addComment(
  dramaId: string,
  comment: Comment,
): Promise<void> {
  const list = await getCommentsFor(dramaId);
  list.unshift(comment);
  await setCommentsFor(dramaId, list);
}

/** Ganti seluruh daftar komentar satu drama (dipakai saat hapus). */
export async function setCommentsFor(
  dramaId: string,
  list: Comment[],
): Promise<void> {
  if (useKV) {
    await kvSet(commentsKey(dramaId), list);
    return;
  }
  const data = readLocal<CommentsFile>("comments.json", { comments: {} });
  data.comments[dramaId] = list;
  writeLocal("comments.json", data);
}

/** Mode penyimpanan aktif — berguna untuk debugging/health check. */
export const storageMode = useKV ? "kv" : "file";
