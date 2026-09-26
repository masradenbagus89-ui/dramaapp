// -------------------------------------------------------------------------
// Penyimpanan data dual-mode:
//   - DENGAN SUPABASE : kalau env SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY ada
//                       -> pakai Supabase (PostgreSQL via PostgREST REST API).
//   - TANPA (lokal/dev): pakai file JSON di folder data/ (seperti semula).
//
// Saklarnya otomatis lewat `useSupabase` di lib/supabase.ts.
//
// Pemetaan data di Supabase:
//   - Dokumen JSON  -> tabel `app_data` (key -> value jsonb):
//       "admins", "comments:<id>", "rating:<id>", "ads",
//       "coinmeta:<email>", "twofa:<email>", "adminpass:<email>",
//       "viewerpass:<email>", "order:<orderId>".
//   - Counter atomik -> tabel + RPC:
//       likes   (RPC like_change), wallets (RPC coin_add/coin_spend_unlock),
//       unlocks (tabel SET email+token).
//
// Konkurensi:
//   - likes & saldo koin : atomik via fungsi Postgres (tidak ada hitungan hilang).
//   - unlock episode     : INSERT ... ON CONFLICT DO NOTHING (idempoten).
//   - comments/admins    : dokumen per-key; balapan antar tulisan ke key YANG
//                          SAMA dalam ~ms masih mungkin (sangat jarang, sama
//                          seperti versi sebelumnya).
// -------------------------------------------------------------------------
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import {
  useSupabase,
  sbSelect,
  sbUpsert,
  sbDelete,
  sbRpc,
  eq,
} from "./supabase";
import { CATALOG_TTL_SECONDS } from "./dramas";

export type Admin = { email: string; name: string; addedAt: string };
export type AdminsFile = { admins: Admin[] };

export type Comment = {
  id: string;
  user: string;
  email: string;
  role: "admin" | "viewer";
  text: string;
  time: string;
  /**
   * Id komentar yang dibalas. Kosong/absen = komentar utama.
   * Sengaja OPSIONAL: komentar lama yang sudah tersimpan tidak punya field ini
   * dan harus tetap valid (tampil sebagai komentar utama), tanpa migrasi data.
   * Balasan dibatasi 1 tingkat — balasan tidak boleh punya balasan lagi.
   */
  parentId?: string;
};
export type CommentsFile = { comments: Record<string, Comment[]> };

export type InteractionsFile = { likes: Record<string, number> };

// --- Akses file lokal (dipakai saat dev / Supabase belum di-set) ------------
function localPath(file: string): string {
  return join(process.cwd(), "data", file);
}

function readLocal<T>(file: string, fallback: T): T {
  const p = localPath(file);
  // Fallback selalu DISALIN, tidak pernah dikembalikan apa adanya.
  //
  // Alasannya: pemanggil di bawah lazim mengubah hasil bacaan lalu menuliskannya
  // kembali (`file.embeds = ...`, `data.wallets[email] = ...`). Kalau yang
  // dikembalikan objek konstan bersama (EMPTY_PLAYLY / EMPTY_WALLET / ...),
  // perubahan itu menempel DI KONSTANTANYA dan ikut terbawa ke pembacaan
  // berikutnya yang filenya juga belum ada — data dari satu operasi muncul di
  // operasi lain. Kerusakannya senyap: tidak ada error, cuma isi yang salah.
  if (!existsSync(p)) return structuredClone(fallback);
  try {
    return JSON.parse(readFileSync(p, "utf-8")) as T;
  } catch {
    return structuredClone(fallback);
  }
}

function writeLocal<T>(file: string, value: T): void {
  const p = localPath(file);
  mkdirSync(dirname(p), { recursive: true }); // pastikan folder data/ ada
  writeFileSync(p, JSON.stringify(value, null, 2), "utf-8");
}

// --- Dokumen JSON di Supabase (tabel app_data: key -> value jsonb) ----------
/**
 * Baca dokumen JSON. Default TANPA cache (jalur admin/tulis wajib lihat data
 * terbaru). Halaman publik yang boleh sedikit basi mengoper `revalidate`
 * (satuan detik), yang diteruskan ke sbSelect — tanpa itu satu pembacaan saja
 * membuat SELURUH halaman dibangun ulang tiap pengunjung. Lihat catatan di
 * lib/supabase.ts.
 */
async function sbDocGet<T>(
  key: string,
  opts: { revalidate?: number } = {},
): Promise<T | null> {
  const rows = await sbSelect<{ value: T }>(
    `app_data?key=${eq(key)}&select=value&limit=1`,
    opts,
  );
  return rows.length ? rows[0].value : null;
}

async function sbDocSet<T>(key: string, value: T): Promise<void> {
  await sbUpsert("app_data", { key, value }, "key");
}

/**
 * Baca dokumen; kalau belum ada di Supabase, seed sekali dari file JSON bawaan
 * (file/ ikut ke deploy = read-only di Vercel, jadi aman dipakai sbg seed awal).
 */
async function sbDocGetOrSeed<T>(key: string, seed: () => T): Promise<T> {
  const v = await sbDocGet<T>(key);
  if (v !== null) return v;
  const seeded = seed();
  try {
    await sbDocSet(key, seeded);
  } catch {
    /* abaikan kegagalan seed; tetap kembalikan datanya */
  }
  return seeded;
}

// =====================  ADMINS (dokumen tunggal)  ==========================
const DEFAULT_ADMINS: AdminsFile = {
  admins: [
    { email: "admin@dramaku.com", name: "Admin Utama", addedAt: "2026-05-06" },
  ],
};

export async function getAdmins(): Promise<AdminsFile> {
  if (useSupabase) {
    return sbDocGetOrSeed<AdminsFile>("admins", () =>
      readLocal<AdminsFile>("admins.json", DEFAULT_ADMINS),
    );
  }
  return readLocal<AdminsFile>("admins.json", DEFAULT_ADMINS);
}

export async function setAdmins(data: AdminsFile): Promise<void> {
  if (useSupabase) {
    await sbDocSet("admins", data);
    return;
  }
  writeLocal("admins.json", data);
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

// =====================  LIKES (tabel + RPC atomik)  =========================
export async function getLikes(): Promise<Record<string, number>> {
  if (useSupabase) {
    const rows = await sbSelect<{ drama_id: string; count: number }>(
      "likes?select=drama_id,count",
    );
    const map: Record<string, number> = {};
    for (const r of rows) map[r.drama_id] = Number(r.count) || 0;
    // Seed sekali dari file lama kalau tabel masih kosong.
    if (rows.length === 0) {
      const seed = readLocal<InteractionsFile>("interactions.json", {
        likes: {},
      }).likes;
      const entries = Object.entries(seed);
      if (entries.length) {
        try {
          await sbUpsert(
            "likes",
            entries.map(([drama_id, count]) => ({ drama_id, count })),
            "drama_id",
          );
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
  if (useSupabase) {
    return sbRpc<number>("like_change", {
      p_drama_id: dramaId,
      p_delta: action === "unlike" ? -1 : 1,
    });
  }
  // Mode lokal: read-modify-write file (proses tunggal, aman).
  const data = readLocal<InteractionsFile>("interactions.json", { likes: {} });
  const current = data.likes[dramaId] ?? 0;
  data.likes[dramaId] = action === "unlike" ? Math.max(0, current - 1) : current + 1;
  writeLocal("interactions.json", data);
  return data.likes[dramaId];
}

// =====================  COMMENTS (dokumen per-drama)  =======================
function commentsKey(dramaId: string): string {
  return `comments:${dramaId}`;
}

/** Komentar untuk satu drama (terbaru di depan). */
export async function getCommentsFor(dramaId: string): Promise<Comment[]> {
  if (useSupabase) {
    const v = await sbDocGet<Comment[]>(commentsKey(dramaId));
    if (v !== null) return v;
    // Seed sekali dari file lama (kalau ada komentar untuk drama ini).
    const seed =
      readLocal<CommentsFile>("comments.json", { comments: {} }).comments[
        dramaId
      ] ?? [];
    if (seed.length) {
      try {
        await sbDocSet(commentsKey(dramaId), seed);
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
  if (useSupabase) {
    await sbDocSet(commentsKey(dramaId), list);
    return;
  }
  const data = readLocal<CommentsFile>("comments.json", { comments: {} });
  data.comments[dramaId] = list;
  writeLocal("comments.json", data);
}

// =====================  RATING PENONTON (dokumen per-drama)  ===============
// Dokumen app_data "rating:<dramaId>" -> { "<email>": <bintang> }.
//
// BATAS JUJUR (utang teknis yang disengaja): identitas viewer BELUM aman —
// email di-assert dari klien (lihat lib/session.ts resolveUserEmail), jadi
// angka ini TIDAK tahan pemalsuan. Cukup untuk mencegah satu orang menilai
// dua kali secara tidak sengaja, TAPI dilarang dipakai sebagai sumber
// structured data Google: rating palsu di schema.org berisiko penalti.
// Cara upgrade: setelah sesi penonton bertanda-tangan ada, ambil email dari
// cookie terverifikasi (seperti getAdminEmail) dan hapus catatan ini.

export type RatingMap = Record<string, number>;
type RatingsFile = { ratings: Record<string, RatingMap> };

export const RATING_MIN = 1;
export const RATING_MAX = 5;

function ratingKey(dramaId: string): string {
  return `rating:${dramaId}`;
}

/** Semua suara untuk satu drama: email -> bintang. */
export async function getRatingsFor(dramaId: string): Promise<RatingMap> {
  if (useSupabase) return (await sbDocGet<RatingMap>(ratingKey(dramaId))) ?? {};
  return (
    readLocal<RatingsFile>("ratings.json", { ratings: {} }).ratings[dramaId] ?? {}
  );
}

/**
 * Simpan suara satu penonton. Suara lamanya DITIMPA (1 email = 1 suara), jadi
 * menilai ulang berarti mengubah nilai — bukan menambah suara baru.
 */
export async function setRating(
  dramaId: string,
  email: string,
  stars: number,
): Promise<RatingMap> {
  const e = normEmail(email);
  const value = Math.min(RATING_MAX, Math.max(RATING_MIN, Math.trunc(stars)));
  const map = await getRatingsFor(dramaId);
  map[e] = value;
  if (useSupabase) {
    await sbDocSet(ratingKey(dramaId), map);
  } else {
    const file = readLocal<RatingsFile>("ratings.json", { ratings: {} });
    file.ratings[dramaId] = map;
    writeLocal("ratings.json", file);
  }
  return map;
}

/** Ringkasan siap tampil: rata-rata 1 angka di belakang koma + jumlah suara. */
export function summarizeRatings(map: RatingMap): {
  average: number;
  count: number;
} {
  const values = Object.values(map).filter((n) => Number.isFinite(n));
  if (values.length === 0) return { average: 0, count: 0 };
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    average: Math.round((sum / values.length) * 10) / 10,
    count: values.length,
  };
}

// =====================  WALLET / KOIN  =====================================
// - wallets : tabel "wallets" (email -> balance)  -> RPC coin_add (atomik).
// - unlocks : tabel "unlocks" (email, token).
// - meta    : dokumen app_data "coinmeta:<email>" -> check-in & kuota iklan.
// Mode lokal: semua disatukan di data/wallets.json (proses tunggal = aman).

export type CoinMeta = {
  lastCheckin?: string; // "YYYY-MM-DD"
  adDate?: string; // tanggal kuota iklan berjalan
  adCount?: number; // iklan yang sudah diklaim pada adDate
};

type WalletFile = {
  wallets: Record<string, number>;
  unlocks: Record<string, string[]>;
  meta: Record<string, CoinMeta>;
};

const EMPTY_WALLET: WalletFile = { wallets: {}, unlocks: {}, meta: {} };

function normEmail(email: string): string {
  return email.trim().toLowerCase();
}
function metaKey(email: string): string {
  return `coinmeta:${normEmail(email)}`;
}

export async function getBalance(email: string): Promise<number> {
  const e = normEmail(email);
  if (!e) return 0;
  if (useSupabase) {
    const rows = await sbSelect<{ balance: number }>(
      `wallets?email=${eq(e)}&select=balance&limit=1`,
    );
    return rows.length ? Number(rows[0].balance) || 0 : 0;
  }
  return readLocal<WalletFile>("wallets.json", EMPTY_WALLET).wallets[e] ?? 0;
}

/** Tambah (atau kurang, delta negatif) saldo; tak pernah di bawah 0. */
export async function addCoins(email: string, delta: number): Promise<number> {
  const e = normEmail(email);
  if (!e) return 0;
  const d = Math.trunc(delta);
  if (useSupabase) {
    return sbRpc<number>("coin_add", { p_email: e, p_delta: d });
  }
  const data = readLocal<WalletFile>("wallets.json", EMPTY_WALLET);
  const next = Math.max(0, (data.wallets[e] ?? 0) + d);
  data.wallets[e] = next;
  writeLocal("wallets.json", data);
  return next;
}

export async function getUnlocks(email: string): Promise<string[]> {
  const e = normEmail(email);
  if (!e) return [];
  if (useSupabase) {
    const rows = await sbSelect<{ token: string }>(
      `unlocks?email=${eq(e)}&select=token`,
    );
    return rows.map((r) => r.token);
  }
  return readLocal<WalletFile>("wallets.json", EMPTY_WALLET).unlocks[e] ?? [];
}

/**
 * Belanjakan koin untuk membuka 1 episode. Idempoten (kalau sudah terbuka,
 * tidak menarik koin lagi). Atomik lewat RPC coin_spend_unlock.
 */
export async function spendUnlock(
  email: string,
  token: string,
  cost: number,
): Promise<{ ok: boolean; balance: number; reason?: "insufficient" }> {
  const e = normEmail(email);
  if (useSupabase) {
    const rows = await sbRpc<{ ok: boolean; balance: number }[]>(
      "coin_spend_unlock",
      { p_email: e, p_token: token, p_cost: cost },
    );
    const r = rows[0] ?? { ok: false, balance: 0 };
    return r.ok
      ? { ok: true, balance: r.balance }
      : { ok: false, balance: r.balance, reason: "insufficient" };
  }
  // Mode lokal.
  const data = readLocal<WalletFile>("wallets.json", EMPTY_WALLET);
  if (data.unlocks[e]?.includes(token)) {
    return { ok: true, balance: data.wallets[e] ?? 0 };
  }
  const bal = data.wallets[e] ?? 0;
  if (bal < cost) return { ok: false, balance: bal, reason: "insufficient" };
  data.wallets[e] = bal - cost;
  data.unlocks[e] = Array.from(new Set([...(data.unlocks[e] ?? []), token]));
  writeLocal("wallets.json", data);
  return { ok: true, balance: data.wallets[e] };
}

/**
 * Tambahkan banyak token unlock sekaligus (mis. fitur "buka semua episode").
 * Idempoten: token yang sudah ada tidak ditambah ulang.
 */
export async function addUnlocks(email: string, tokens: string[]): Promise<void> {
  const e = normEmail(email);
  if (!e || tokens.length === 0) return;
  if (useSupabase) {
    const rows = tokens.map((token) => ({ email: e, token }));
    await sbUpsert("unlocks", rows, "email,token");
    return;
  }
  const data = readLocal<WalletFile>("wallets.json", EMPTY_WALLET);
  data.unlocks[e] = Array.from(new Set([...(data.unlocks[e] ?? []), ...tokens]));
  writeLocal("wallets.json", data);
}

export async function getCoinMeta(email: string): Promise<CoinMeta> {
  const e = normEmail(email);
  if (useSupabase) return (await sbDocGet<CoinMeta>(metaKey(e))) ?? {};
  return readLocal<WalletFile>("wallets.json", EMPTY_WALLET).meta[e] ?? {};
}

export async function setCoinMeta(email: string, meta: CoinMeta): Promise<void> {
  const e = normEmail(email);
  if (useSupabase) {
    await sbDocSet(metaKey(e), meta);
    return;
  }
  const data = readLocal<WalletFile>("wallets.json", EMPTY_WALLET);
  data.meta[e] = meta;
  writeLocal("wallets.json", data);
}

// =====================  2FA / TOTP (admin)  ================================
// Dokumen app_data "twofa:<email>". (Lokal: data/twofa.json, sudah .gitignore.)

export type TwoFA = {
  secret?: string; // aktif (terverifikasi)
  enabled?: boolean;
  pending?: string; // hasil setup, belum diverifikasi
};

type TwoFAFile = { twofa: Record<string, TwoFA> };

function twofaKey(email: string): string {
  return `twofa:${normEmail(email)}`;
}

export async function getTwoFA(email: string): Promise<TwoFA> {
  const e = normEmail(email);
  if (useSupabase) return (await sbDocGet<TwoFA>(twofaKey(e))) ?? {};
  return readLocal<TwoFAFile>("twofa.json", { twofa: {} }).twofa[e] ?? {};
}

export async function setTwoFA(email: string, data: TwoFA): Promise<void> {
  const e = normEmail(email);
  if (useSupabase) {
    await sbDocSet(twofaKey(e), data);
    return;
  }
  const file = readLocal<TwoFAFile>("twofa.json", { twofa: {} });
  file.twofa[e] = data;
  writeLocal("twofa.json", file);
}

export async function isTwoFAEnabled(email: string): Promise<boolean> {
  return Boolean((await getTwoFA(email)).enabled);
}

// =====================  PASSWORD ADMIN PER-AKUN  ===========================
// Dokumen app_data "adminpass:<email>" -> { hash, salt } (scrypt, lihat
// lib/admin-password.ts). Kalau admin BELUM punya record (atau record kosong),
// getAdminPassword balas null -> login jatuh ke ADMIN_PASSWORD bersama
// (jaring pengaman: tak ada admin yang terkunci). Lokal: data/adminpass.json.

export type AdminPasswordRecord = { hash: string; salt: string };
type AdminPassFile = { passwords: Record<string, AdminPasswordRecord> };

function adminPassKey(email: string): string {
  return `adminpass:${normEmail(email)}`;
}

/** Record password per-akun, atau null kalau belum di-set (pakai bersama). */
export async function getAdminPassword(
  email: string,
): Promise<AdminPasswordRecord | null> {
  const e = normEmail(email);
  if (!e) return null;
  const rec = useSupabase
    ? await sbDocGet<AdminPasswordRecord>(adminPassKey(e))
    : (readLocal<AdminPassFile>("adminpass.json", { passwords: {} }).passwords[e] ??
      null);
  // record kosong (hasil "clear") dianggap tidak ada -> fallback ke bersama.
  return rec && rec.hash && rec.salt ? rec : null;
}

export async function setAdminPassword(
  email: string,
  rec: AdminPasswordRecord,
): Promise<void> {
  const e = normEmail(email);
  if (useSupabase) {
    await sbDocSet(adminPassKey(e), rec);
    return;
  }
  const file = readLocal<AdminPassFile>("adminpass.json", { passwords: {} });
  file.passwords[e] = rec;
  writeLocal("adminpass.json", file);
}

/** Hapus password per-akun -> admin kembali memakai ADMIN_PASSWORD bersama. */
export async function clearAdminPassword(email: string): Promise<void> {
  const e = normEmail(email);
  if (useSupabase) {
    await sbDocSet(adminPassKey(e), { hash: "", salt: "" }); // dibaca sbg "tidak ada"
    return;
  }
  const file = readLocal<AdminPassFile>("adminpass.json", { passwords: {} });
  delete file.passwords[e];
  writeLocal("adminpass.json", file);
}

// =====================  AKUN PENONTON (viewer)  ============================
// Dokumen app_data "viewerpass:<email>" -> { hash, salt, name, createdAt }.
// Pola sama persis dengan "adminpass:<email>" di atas: yang disimpan HANYA hash
// scrypt + salt acak (lib/admin-password.ts). Password asli tak pernah disimpan.
//
// Sebelum Tahap 6, akun penonton TIDAK ADA di server sama sekali — identitas cuma
// ada di localStorage browser, sehingga siapa pun bisa mengaku jadi siapa pun dan
// membelanjakan koin orang lain. Dokumen inilah yang membuat identitas penonton
// bisa dibuktikan server.

export type ViewerAccount = {
  hash: string;
  salt: string;
  /** Nama tampilan saat mendaftar. Cuma label; identitas tetap emailnya. */
  name: string;
  createdAt: string;
  /**
   * Hash kode pemulihan (lihat lib/recovery-code.ts). SENGAJA opsional:
   * akun yang dibuat di Tahap 6 belum punya ini dan HARUS tetap valid —
   * pemiliknya membuat kode lewat halaman profil selagi masih bisa masuk.
   * Kode aslinya tak pernah disimpan.
   */
  recovery?: { hash: string; salt: string };
};

type ViewersFile = { viewers: Record<string, ViewerAccount> };

function viewerKey(email: string): string {
  return `viewerpass:${normEmail(email)}`;
}

/** Akun penonton, atau null kalau email itu belum pernah mendaftar. */
export async function getViewerAccount(
  email: string,
): Promise<ViewerAccount | null> {
  const e = normEmail(email);
  if (!e) return null;
  const rec = useSupabase
    ? await sbDocGet<ViewerAccount>(viewerKey(e))
    : (readLocal<ViewersFile>("viewers.json", { viewers: {} }).viewers[e] ?? null);
  // Record tanpa hash/salt dianggap tidak ada (jangan pernah meloloskan login).
  return rec && rec.hash && rec.salt ? rec : null;
}

export async function setViewerAccount(
  email: string,
  rec: ViewerAccount,
): Promise<void> {
  const e = normEmail(email);
  if (useSupabase) {
    await sbDocSet(viewerKey(e), rec);
    return;
  }
  const file = readLocal<ViewersFile>("viewers.json", { viewers: {} });
  file.viewers[e] = rec;
  writeLocal("viewers.json", file);
}

// =====================  ORDER KOIN (top-up Midtrans)  ======================
// Dokumen app_data "order:<orderId>". Idempoten: koin dikredit sekali per order.

export type CoinOrder = {
  email: string;
  coins: number;
  packId: string;
  amount: number;
  status: "pending" | "paid";
  createdAt: string;
};

type OrdersFile = { orders: Record<string, CoinOrder> };

function orderKey(orderId: string): string {
  return `order:${orderId}`;
}

export async function getOrder(orderId: string): Promise<CoinOrder | null> {
  if (useSupabase) return sbDocGet<CoinOrder>(orderKey(orderId));
  return readLocal<OrdersFile>("orders.json", { orders: {} }).orders[orderId] ?? null;
}

export async function setOrder(
  orderId: string,
  order: CoinOrder,
): Promise<void> {
  if (useSupabase) {
    await sbDocSet(orderKey(orderId), order);
    return;
  }
  const file = readLocal<OrdersFile>("orders.json", { orders: {} });
  file.orders[orderId] = order;
  writeLocal("orders.json", file);
}

// =====================  IKLAN SPONSOR (house ads)  =========================
// Dokumen app_data "ads" (array SponsorAd). views/clicks read-modify-write
// (jumlah iklan kecil & taruhannya rendah -> cukup).

export type SponsorAd = {
  id: string;
  title?: string;
  imageUrl: string;
  linkUrl: string;
  views: number;
  clicks: number;
  addedAt: string;
};

const ADS_KEY = "ads";
type AdsFile = { ads: SponsorAd[] };

export async function getAds(): Promise<SponsorAd[]> {
  if (useSupabase) return (await sbDocGet<SponsorAd[]>(ADS_KEY)) ?? [];
  return readLocal<AdsFile>("ads.json", { ads: [] }).ads;
}

async function saveAds(ads: SponsorAd[]): Promise<void> {
  if (useSupabase) {
    await sbDocSet(ADS_KEY, ads);
    return;
  }
  writeLocal("ads.json", { ads });
}

export async function addAd(input: {
  title?: string;
  imageUrl: string;
  linkUrl: string;
}): Promise<SponsorAd> {
  const ads = await getAds();
  const ad: SponsorAd = {
    id: `ad-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: input.title?.trim() || undefined,
    imageUrl: input.imageUrl.trim(),
    linkUrl: input.linkUrl.trim(),
    views: 0,
    clicks: 0,
    addedAt: new Date().toISOString().slice(0, 10),
  };
  ads.unshift(ad);
  await saveAds(ads);
  return ad;
}

export async function removeAd(id: string): Promise<void> {
  await saveAds((await getAds()).filter((a) => a.id !== id));
}

export async function incrementAdStat(
  id: string,
  type: "views" | "clicks",
): Promise<void> {
  const ads = await getAds();
  const ad = ads.find((a) => a.id === id);
  if (!ad) return;
  ad[type] = (ad[type] ?? 0) + 1;
  await saveAds(ads);
}

// =====================  ALAMAT SUMBER VIDEO  ===============================
// Dokumen app_data "videobase" -> { url, updatedAt, source }.
//
// KENAPA di database, bukan env: NEXT_PUBLIC_VIDEO_BASE_URL dibakar ke bundle
// saat build, sedangkan quick tunnel memberi alamat acak baru tiap PC backup
// restart -> tiap restart video mati sampai ditempel manual + redeploy. Disimpan
// di sini supaya PC backup bisa melapor sendiri (lihat lib/video-base.ts).
// Lokal (tanpa Supabase): data/videobase.json.

export type VideoBaseRecord = {
  url: string;
  updatedAt: string;
  /** Siapa yang terakhir menulis — "agent" (PC backup) atau "admin". */
  source?: string;
};

export async function getVideoBaseRecord(
  opts: { revalidate?: number } = {},
): Promise<VideoBaseRecord | null> {
  if (useSupabase) return await sbDocGet<VideoBaseRecord>("videobase", opts);
  return readLocal<VideoBaseRecord | null>("videobase.json", null);
}

export async function setVideoBaseRecord(rec: VideoBaseRecord): Promise<void> {
  if (useSupabase) {
    await sbDocSet("videobase", rec);
    return;
  }
  writeLocal("videobase.json", rec);
}

/**
 * Kosongkan alamat tersimpan supaya getVideoBaseUrl jatuh ke env lagi.
 *
 * WAJIB ADA: baris ini SELALU menang atas env dan tidak punya masa kedaluwarsa.
 * Tanpa jalan menghapus, alamat quick tunnel yang sudah lenyap akan terus dipakai
 * selamanya — termasuk sesudah pindah ke named tunnel — dan semua indikator yang
 * bisa dilihat owner (env var, status service, curl ke domain baru) tetap terlihat
 * hijau. Itu kerusakan senyap.
 */
export async function clearVideoBaseRecord(): Promise<void> {
  if (useSupabase) {
    await sbDelete("app_data", `key=${eq("videobase")}`);
    return;
  }
  writeLocal("videobase.json", null);
}

// =====================  INTEGRASI PLAYLY (kunci + kaitan embed)  ===========
// Dua dokumen app_data:
//   "playly:key"    -> kunci API Playly TERENKRIPSI + bentuk tersamarnya.
//   "playly:embeds" -> daftar video Playly yang sudah dikaitkan ke drama kita.
// Mode lokal (tanpa Supabase): keduanya di data/playly.json (sudah .gitignore).
//
// KENAPA app_data, bukan tabel baru: tabel app_data SUDAH ada, jadi fitur ini
// jalan tanpa perlu menjalankan SQL migrasi dulu di Supabase. Konsekuensinya
// sama seperti dokumen "ads"/"admins": dua admin yang menyimpan pada detik
// yang persis sama bisa saling menimpa (jarang, dan taruhannya rendah).

export type PlaylyKeyRecord = {
  /** Kunci API Playly dalam bentuk TERENKRIPSI (AES-256-GCM). Tak pernah polos. */
  secret: string;
  /** Bentuk tersamar untuk ditampilkan ke admin, mis. "plyk_••••••••json". */
  masked: string;
  /** Kapan terakhir diganti (ISO). */
  updatedAt: string;
  /** Email admin yang menggantinya (jejak audit sederhana). */
  updatedBy: string;
};

export type PlaylyEmbed = {
  /** Pengenal video di sisi Playly (unik; jadi kunci baris ini). */
  videoId: string;
  /** Drama DramaKu yang dikaitkan (dramas.id). */
  dramaId: string;
  /** Nomor episode, kalau admin mengisinya. */
  episode: number | null;
  /** Alamat player siap tempel — SUDAH lolos cek https + daftar domain. */
  embedUrl: string;
  title: string;
  durationLabel: string;
  creator: string;
  addedAt: string;
  addedBy: string;
};

const PLAYLY_KEY_DOC = "playly:key";
const PLAYLY_EMBEDS_DOC = "playly:embeds";
const PLAYLY_HIDDEN_DOC = "playly:hidden";
const PLAYLY_WEBHOOK_DOC = "playly:webhook";

type PlaylyFile = {
  key: PlaylyKeyRecord | null;
  embeds: PlaylyEmbed[];
  /** videoId yang SENGAJA disembunyikan admin dari halaman penonton. */
  hidden?: string[];
  /** Video yang DIDORONG Playly lewat webhook (opsional: file lama tak punya). */
  webhook?: PlaylyWebhookVideo[];
  /** Kategori pilihan admin per video (opsional: file lama tak punya). */
  genre?: Record<string, string>;
  /** Salinan daftar video terakhir yang berhasil (opsional: file lama tak punya). */
  cadangan?: PlaylyCadangan;
};
const EMPTY_PLAYLY: PlaylyFile = {
  key: null,
  embeds: [],
  hidden: [],
  webhook: [],
  genre: {},
};

/** Record kunci Playly tersimpan, atau null kalau admin belum memasangnya. */
export async function getPlaylyKeyRecord(): Promise<PlaylyKeyRecord | null> {
  const rec = useSupabase
    ? await sbDocGet<PlaylyKeyRecord>(PLAYLY_KEY_DOC)
    : readLocal<PlaylyFile>("playly.json", EMPTY_PLAYLY).key;
  // Record kosong (sisa penghapusan) dianggap "belum dipasang".
  return rec && rec.secret ? rec : null;
}

/**
 * Versi ber-cache untuk HALAMAN PUBLIK.
 *
 * Wajib ada: pembacaan tanpa cache walau SATU kali membuat seluruh halaman
 * dibangun ulang untuk tiap pengunjung, sehingga `revalidate` di halaman jadi
 * percuma (lihat catatan sbDocGet di atas). Kunci Playly nyaris tak pernah
 * berubah, jadi basi paling lama CATALOG_TTL_SECONDS tidak berbahaya: kalau
 * kunci dicabut, akibat terburuknya daftar video kosong beberapa puluh detik
 * lebih lama. Jalur admin tetap memakai getPlaylyKeyRecord (selalu segar).
 */
export async function getPlaylyKeyRecordCached(): Promise<PlaylyKeyRecord | null> {
  const rec = useSupabase
    ? await sbDocGet<PlaylyKeyRecord>(PLAYLY_KEY_DOC, {
        revalidate: CATALOG_TTL_SECONDS,
      })
    : readLocal<PlaylyFile>("playly.json", EMPTY_PLAYLY).key;
  return rec && rec.secret ? rec : null;
}

export async function setPlaylyKeyRecord(rec: PlaylyKeyRecord): Promise<void> {
  if (useSupabase) {
    await sbDocSet(PLAYLY_KEY_DOC, rec);
    return;
  }
  const file = readLocal<PlaylyFile>("playly.json", EMPTY_PLAYLY);
  file.key = rec;
  writeLocal("playly.json", file);
}

/** Cabut kunci (mis. kunci bocor) — kaitan video yang sudah ada TIDAK ikut hilang. */
export async function clearPlaylyKeyRecord(): Promise<void> {
  if (useSupabase) {
    await sbDocSet(PLAYLY_KEY_DOC, { secret: "", masked: "", updatedAt: "", updatedBy: "" });
    return;
  }
  const file = readLocal<PlaylyFile>("playly.json", EMPTY_PLAYLY);
  file.key = null;
  writeLocal("playly.json", file);
}

/** Semua video Playly yang sudah dikaitkan (terbaru di depan). */
export async function getPlaylyEmbeds(): Promise<PlaylyEmbed[]> {
  if (useSupabase) return (await sbDocGet<PlaylyEmbed[]>(PLAYLY_EMBEDS_DOC)) ?? [];
  return readLocal<PlaylyFile>("playly.json", EMPTY_PLAYLY).embeds;
}

/**
 * Versi ber-cache dari `getPlaylyEmbeds` untuk HALAMAN PUBLIK — boleh basi
 * maksimal CATALOG_TTL_SECONDS detik, sama seperti katalog drama, supaya
 * halaman tetap bisa disimpan-dan-dipakai-ulang (ISR). Jalur admin TETAP
 * memakai `getPlaylyEmbeds` supaya perubahan langsung terlihat.
 */
export async function getPlaylyEmbedsCached(): Promise<PlaylyEmbed[]> {
  if (useSupabase) {
    return (
      (await sbDocGet<PlaylyEmbed[]>(PLAYLY_EMBEDS_DOC, {
        revalidate: CATALOG_TTL_SECONDS,
      })) ?? []
    );
  }
  return readLocal<PlaylyFile>("playly.json", EMPTY_PLAYLY).embeds;
}

async function savePlaylyEmbeds(embeds: PlaylyEmbed[]): Promise<void> {
  if (useSupabase) {
    await sbDocSet(PLAYLY_EMBEDS_DOC, embeds);
    return;
  }
  const file = readLocal<PlaylyFile>("playly.json", EMPTY_PLAYLY);
  file.embeds = embeds;
  writeLocal("playly.json", file);
}

/**
 * Simpan/ubah kaitan satu video Playly -> satu drama.
 * Satu videoId = satu baris: mengaitkan ulang video yang sama ke drama lain
 * MEMINDAHKANNYA (bukan menggandakan), supaya di halaman publik tidak muncul dobel.
 */
export async function upsertPlaylyEmbed(embed: PlaylyEmbed): Promise<void> {
  const list = await getPlaylyEmbeds();
  const idx = list.findIndex((e) => e.videoId === embed.videoId);
  if (idx === -1) list.unshift(embed);
  else list[idx] = embed;
  await savePlaylyEmbeds(list);
}

/** Lepas kaitan satu video. True kalau memang ada yang dilepas. */
export async function removePlaylyEmbed(videoId: string): Promise<boolean> {
  const list = await getPlaylyEmbeds();
  const sisa = list.filter((e) => e.videoId !== videoId);
  if (sisa.length === list.length) return false;
  await savePlaylyEmbeds(sisa);
  return true;
}

// ---- Daftar video Playly yang disembunyikan dari halaman penonton ----
//
// Video Playly tampil OTOMATIS begitu di-upload; daftar ini adalah daftar
// PENGECUALIAN, bukan daftar izin. Bentuk ini dipilih supaya admin tidak perlu
// menyetujui apa pun untuk video baru muncul — kalau daftar izin yang dipakai,
// video baru akan diam-diam tidak tampil sampai ada yang ingat menyetujuinya,
// dan itu persis kegagalan senyap yang membuat fitur ini macet sebelumnya.

/** videoId yang disembunyikan admin. Kosong = semua video mitra tampil. */
export async function getPlaylyHiddenIds(): Promise<string[]> {
  if (useSupabase) return (await sbDocGet<string[]>(PLAYLY_HIDDEN_DOC)) ?? [];
  return readLocal<PlaylyFile>("playly.json", EMPTY_PLAYLY).hidden ?? [];
}

/** Versi ber-cache untuk HALAMAN PUBLIK — alasannya sama dengan getPlaylyEmbedsCached. */
export async function getPlaylyHiddenIdsCached(): Promise<string[]> {
  if (useSupabase) {
    return (
      (await sbDocGet<string[]>(PLAYLY_HIDDEN_DOC, {
        revalidate: CATALOG_TTL_SECONDS,
      })) ?? []
    );
  }
  return readLocal<PlaylyFile>("playly.json", EMPTY_PLAYLY).hidden ?? [];
}

/**
 * Sembunyikan (hidden=true) atau tampilkan lagi (hidden=false) satu video.
 * Mengembalikan daftar terbaru supaya pemanggil tak perlu membaca ulang.
 */
export async function setPlaylyVideoHidden(
  videoId: string,
  hidden: boolean,
): Promise<string[]> {
  const sekarang = await getPlaylyHiddenIds();
  const tanpa = sekarang.filter((id) => id !== videoId);
  // Set-like: menyembunyikan video yang sudah tersembunyi tidak menggandakan baris.
  const baru = hidden ? [...tanpa, videoId] : tanpa;

  if (useSupabase) {
    await sbDocSet(PLAYLY_HIDDEN_DOC, baru);
  } else {
    const file = readLocal<PlaylyFile>("playly.json", EMPTY_PLAYLY);
    file.hidden = baru;
    writeLocal("playly.json", file);
  }
  return baru;
}

// ===========  SALINAN DAFTAR VIDEO (playly:cadangan)  ======================
//
// KENAPA ADA (insiden 2026-09-26): Playly membalas **HTTP 402** (Payment
// Required — urusan pembayaran/kuota di akun kita, bukan kesalahan kode), dan
// seketika SELURUH video hilang dari /beranda, /film, /discover, serta setiap
// halaman tonton membalas 404. Tak ada satu pun kode yang bisa memperbaiki 402;
// yang bisa kita kendalikan adalah AKIBATNYA.
//
// Dokumen ini menyimpan daftar video terakhir yang berhasil diambil. Saat
// Playly menolak atau tersendat, halaman menyajikan salinan ini — jadi
// gangguan di pihak mereka berubah dari "video hilang total" menjadi "video
// tetap ada, cuma tidak bertambah". Pola `stale-if-error` dari
// skills/tahan-gagal/SKILL.md §2 lapis 2: "jangan hapus cache hanya karena
// sumbernya gagal; data basi yang jujur jauh lebih berguna daripada layar
// kosong".
//
// ⚠️ BATAS JUJUR — salinan ini TIDAK menggantikan gerbang izin. Ia dipakai
// HANYA untuk menggambar daftar. Izin memutar sebuah video tetap ditentukan
// daftar SEGAR (app/api/playly/video/route.ts), jadi video yang baru
// disembunyikan admin tidak bisa ditonton lewat salinan ini — paling jauh
// kartunya sempat terlihat.
const PLAYLY_CADANGAN_DOC = "playly:cadangan";

/** Isi salinan: daftar video + kapan disimpan (untuk menilai kesegarannya). */
export type PlaylyCadangan<T = unknown> = {
  videos: T[];
  /** ISO UTC. Dipakai log & panel admin untuk menyebut umur salinannya. */
  disimpanPada: string;
};

/**
 * Baca salinan terakhir. Memulangkan daftar KOSONG kalau belum pernah ada —
 * dan itu keadaan normal, bukan kerusakan.
 *
 * Sengaja versi BER-CACHE: pembacanya halaman penonton, dan satu pembacaan
 * tanpa cache membuat seluruh halaman pemanggilnya jadi dinamis
 * (lib/supabase.ts:204) — persis kemunduran yang dihindari 2026-09-18.
 */
export async function getPlaylyCadanganCached<T = unknown>(): Promise<
  PlaylyCadangan<T>
> {
  const kosong: PlaylyCadangan<T> = { videos: [], disimpanPada: "" };
  if (!useSupabase) {
    return (
      (readLocal<PlaylyFile>("playly.json", EMPTY_PLAYLY)
        .cadangan as PlaylyCadangan<T> | undefined) ?? kosong
    );
  }
  const rec = await sbDocGet<PlaylyCadangan<T>>(PLAYLY_CADANGAN_DOC, {
    revalidate: CATALOG_TTL_SECONDS,
  });
  return rec && Array.isArray(rec.videos) ? rec : kosong;
}

/**
 * Simpan salinan baru.
 *
 * ⚠️ Ini PERINTAH (mengubah), dan sengaja dipisah dari pembacanya (§3.7:
 * fungsi yang mengubah data jangan sekaligus jadi sumber jawaban). Pemanggil
 * memanggilnya SECARA EKSPLISIT sesudah tahu pengambilannya berhasil — jangan
 * pernah menyelipkannya ke dalam fungsi baca, supaya tidak ada halaman yang
 * diam-diam menulis ke database setiap kali digambar.
 *
 * Daftar KOSONG ditolak diam-diam: menyimpan kosong berarti menimpa salinan
 * bagus dengan hasil gangguan — kebalikan dari gunanya dokumen ini.
 */
export async function setPlaylyCadangan<T = unknown>(
  videos: T[],
): Promise<void> {
  if (!Array.isArray(videos) || videos.length === 0) return;

  const isi: PlaylyCadangan<T> = {
    videos,
    disimpanPada: new Date().toISOString(),
  };
  if (useSupabase) {
    await sbDocSet(PLAYLY_CADANGAN_DOC, isi);
    return;
  }
  const file = readLocal<PlaylyFile>("playly.json", EMPTY_PLAYLY);
  file.cadangan = isi as PlaylyCadangan;
  writeLocal("playly.json", file);
}

// ===========  KATEGORI VIDEO PLAYLY (playly:genre)  ========================
//
// KENAPA ADA (owner 2026-09-26): owner meminta video Playly tampil di beranda
// "sesuai dengan genre". Ternyata datanya TIDAK ADA — `PlaylyVideo`
// (lib/playly.ts:398) tidak punya field genre sama sekali, dan diukur di
// produksi hari itu NOL dari 46 video punya genre. Satu-satunya jalan jujur
// adalah admin yang memilihnya; dokumen inilah tempat pilihan itu disimpan.
//
// Bentuknya PETA videoId -> nama kategori, bukan daftar seperti playly:hidden:
// pertanyaannya di sini "video ini kategorinya apa?", bukan "video ini ada di
// daftar atau tidak".
//
// Nilainya WAJIB salah satu kategori katalog DramaKu (lib/types.ts `Category`).
// Pemeriksaannya ada di route admin, bukan di sini — lapisan penyimpanan tidak
// boleh ikut memutuskan aturan isi, dan `Category` adalah tipe UI yang tak
// pantas diseret ke modul data. Kategori asing yang lolos masuk tidak merusak
// apa pun: ia sekadar tak cocok dengan baris genre mana pun di beranda.
const PLAYLY_GENRE_DOC = "playly:genre";

/** Peta videoId -> kategori pilihan admin. Video tanpa entri = belum diisi. */
export type PlaylyGenreMap = Record<string, string>;

export async function getPlaylyGenres(): Promise<PlaylyGenreMap> {
  if (useSupabase) {
    return (await sbDocGet<PlaylyGenreMap>(PLAYLY_GENRE_DOC)) ?? {};
  }
  return readLocal<PlaylyFile>("playly.json", EMPTY_PLAYLY).genre ?? {};
}

/** Versi ber-cache untuk HALAMAN PUBLIK — alasannya sama dengan getPlaylyEmbedsCached. */
export async function getPlaylyGenresCached(): Promise<PlaylyGenreMap> {
  if (useSupabase) {
    return (
      (await sbDocGet<PlaylyGenreMap>(PLAYLY_GENRE_DOC, {
        revalidate: CATALOG_TTL_SECONDS,
      })) ?? {}
    );
  }
  return readLocal<PlaylyFile>("playly.json", EMPTY_PLAYLY).genre ?? {};
}

/**
 * Pasang kategori satu video, atau KOSONGKAN dengan mengirim null.
 * Mengembalikan peta terbaru supaya pemanggil tak perlu membaca ulang.
 *
 * Mengosongkan berarti MENGHAPUS kuncinya, bukan menyimpan string kosong:
 * dokumen ini dibaca sebagai "ada entri = sudah diisi", dan nilai kosong yang
 * tersimpan akan terbaca sebagai kategori bernama "" yang tak cocok dengan
 * apa pun — sulit dilacak justru karena tidak salah secara teknis.
 */
export async function setPlaylyVideoGenre(
  videoId: string,
  genre: string | null,
): Promise<PlaylyGenreMap> {
  const sekarang = await getPlaylyGenres();
  const baru = { ...sekarang };
  if (genre) baru[videoId] = genre;
  else delete baru[videoId];

  if (useSupabase) {
    await sbDocSet(PLAYLY_GENRE_DOC, baru);
  } else {
    const file = readLocal<PlaylyFile>("playly.json", EMPTY_PLAYLY);
    file.genre = baru;
    writeLocal("playly.json", file);
  }
  return baru;
}

// =========  VIDEO YANG DIDORONG PLAYLY LEWAT WEBHOOK (playly:webhook)  =====
//
// Dokumen ini SENGAJA dipisah dari dua dokumen Playly di atas karena sumbernya
// beda, dan yang beda sumber tidak ditaruh di satu baris:
//   - playly:embeds  -> kaitan video->drama yang dibuat ADMIN dengan tangan.
//   - playly:webhook -> katalog yang DIDORONG Playly sendiri, tanpa campur
//                       tangan siapa pun.
// Kalau digabung, satu notifikasi Playly bisa menghapus kaitan yang susah payah
// dibuat admin (dan sebaliknya).
//
// ATURAN INTINYA: satu videoId = SATU baris. Itulah yang membuat kiriman ulang
// (retry) dari Playly aman — webhook yang sama masuk dua kali MEMPERBARUI baris
// yang ada, bukan menambah baris kembar. Playly memang sengaja mengirim ulang
// kalau balasan kita telat, jadi ini keadaan normal, bukan gangguan.
//
// UTANG TEKNIS (sama seperti dokumen "ads"/"admins" di atas, tapi di sini lebih
// mungkin kejadian): penyimpanannya "baca -> ubah -> tulis" satu dokumen utuh,
// jadi DUA notifikasi yang tiba dalam milidetik yang sama bisa saling menimpa
// dan salah satunya hilang. Taruhannya rendah (video hilang akan muncul lagi di
// notifikasi berikutnya), dan dipilih supaya fitur ini jalan tanpa menjalankan
// SQL migrasi dulu. Cara menaikkannya kalau volumenya sudah ramai: pindahkan ke
// tabel `playly_webhook_video` dengan `video_id` sebagai PRIMARY KEY, lalu
// upsert per-baris — database yang menjamin tidak ada yang saling menimpa.

export type PlaylyWebhookVideo = {
  /** Pengenal video di sisi Playly. UNIK — inilah kunci anti-duplikatnya. */
  videoId: string;
  title: string;
  /**
   * Sinopsis dari Playly. TEKS POLOS, bukan HTML — apa pun yang tersimpan di
   * sini akan tampil di halaman, jadi menyimpan HTML mentah berarti mengizinkan
   * pengirimnya menaruh <script> di situs kita. Field ini tidak punya padanan
   * di katalog Playly (tipe PlaylyVideo tak mengenal deskripsi).
   */
  description: string | null;
  /** Tahun rilis; null kalau Playly tidak mengirimnya. */
  year: number | null;
  /** Genre apa adanya dari Playly; null kalau tidak dikirim. */
  genre: string | null;
  /** Nama pengunggah di sisi Playly; null kalau tidak dikirim. */
  creator: string | null;
  /** Durasi dalam detik; null kalau tidak dikirim atau tak terbaca. */
  durationSeconds: number | null;
  /** Alamat player siap tempel — SUDAH lolos https + daftar domain Playly. */
  embedUrl: string;
  /** Sampul — SUDAH lolos https / data-URI gambar; null kalau tak ada. */
  thumbnailUrl: string | null;
  /**
   * "published" = boleh tampil. "unpublished" = Playly sudah menariknya.
   *
   * Baris unpublish sengaja DISIMPAN, bukan dihapus, karena dua alasan:
   * (1) kalau video yang sama diterbitkan lagi nanti, catatannya tidak hilang;
   * (2) notifikasi unpublish yang datang dua kali tetap berakhir di keadaan
   *     yang sama — tidak ada bedanya diproses sekali atau sepuluh kali.
   */
  status: "published" | "unpublished";
  /** Kapan notifikasi TERAKHIR untuk video ini diterima (ISO). */
  receivedAt: string;
};

/** Aturan "baris webhook ini boleh tampil" — satu tempat, dipakai kedua pembaca. */
const bolehTampil = (v: PlaylyWebhookVideo) => v.status === "published";

/**
 * SEMUA baris webhook, termasuk yang sudah ditarik Playly. Terbaru di depan.
 *
 * SENGAJA tanpa cache: pembacanya termasuk jalur TULIS (savePlaylyWebhookVideos
 * di bawah selalu didahului pembacaan ini), dan daftar basi di sana akan
 * MENIMPA baris yang masuk di sela cache — video hilang tanpa jejak error.
 * Halaman publik yang boleh sedikit basi memakai varian Cached di bawahnya.
 */
export async function getPlaylyWebhookVideos(): Promise<PlaylyWebhookVideo[]> {
  if (useSupabase) {
    return (await sbDocGet<PlaylyWebhookVideo[]>(PLAYLY_WEBHOOK_DOC)) ?? [];
  }
  return readLocal<PlaylyFile>("playly.json", EMPTY_PLAYLY).webhook ?? [];
}

/**
 * Hanya video yang BOLEH tampil. Dipakai jalur yang butuh keadaan MUTAKHIR —
 * gerbang izin pemutar (app/api/playly/video/route.ts) dan halaman admin.
 *
 * Namanya sengaja menyebut "Published" supaya pemanggil tahu daftarnya sudah
 * disaring — kalau fungsi ini dinamai `getPlaylyWebhookVideos` saja, cepat atau
 * lambat ada yang memakainya lalu video yang sudah ditarik Playly ikut tampil.
 */
export async function getPublishedPlaylyWebhookVideos(): Promise<PlaylyWebhookVideo[]> {
  const semua = await getPlaylyWebhookVideos();
  return semua.filter(bolehTampil);
}

/**
 * Versi ber-cache untuk HALAMAN PENONTON — alasannya sama dengan
 * getPlaylyHiddenIdsCached di atas, dan TTL-nya sengaja disamakan: keduanya
 * membaca dokumen `app_data` yang sama-sama jarang berubah.
 *
 * KENAPA HARUS ADA (bukan sekadar penghematan jaringan): tanpa `revalidate`,
 * sbSelect jatuh ke `cache: "no-store"` dan satu pembacaan itu membuat SELURUH
 * halaman pemanggilnya jadi dinamis — dibangun ulang untuk tiap pengunjung,
 * dan ikut mati begitu Supabase tidak menjawab. Itu yang terjadi pada /playly
 * antara 2026-09-15 dan 2026-09-18 (lihat lib/supabase.ts:204).
 *
 * SENGAJA fungsi terpisah, BUKAN opsi di getPlaylyWebhookVideos: opsi di sana
 * cepat atau lambat akan dipakai jalur tulis dan menimpa data (lihat catatan
 * di fungsi itu).
 */
export async function getPublishedPlaylyWebhookVideosCached(): Promise<
  PlaylyWebhookVideo[]
> {
  const semua = useSupabase
    ? ((await sbDocGet<PlaylyWebhookVideo[]>(PLAYLY_WEBHOOK_DOC, {
        revalidate: CATALOG_TTL_SECONDS,
      })) ?? [])
    : (readLocal<PlaylyFile>("playly.json", EMPTY_PLAYLY).webhook ?? []);
  return semua.filter(bolehTampil);
}

async function savePlaylyWebhookVideos(list: PlaylyWebhookVideo[]): Promise<void> {
  if (useSupabase) {
    await sbDocSet(PLAYLY_WEBHOOK_DOC, list);
    return;
  }
  const file = readLocal<PlaylyFile>("playly.json", EMPTY_PLAYLY);
  file.webhook = list;
  writeLocal("playly.json", file);
}

/**
 * Simpan/perbarui satu video dari webhook. Idempoten by videoId: dipanggil
 * berkali-kali dengan video yang sama menghasilkan SATU baris.
 *
 * Balasannya "dibuat" atau "diperbarui" supaya route bisa mencatat mana yang
 * benar-benar video baru — berguna saat menelusuri kenapa sebuah video muncul.
 */
export async function upsertPlaylyWebhookVideo(
  video: PlaylyWebhookVideo,
): Promise<"dibuat" | "diperbarui"> {
  const list = await getPlaylyWebhookVideos();
  const idx = list.findIndex((v) => v.videoId === video.videoId);
  if (idx === -1) {
    list.unshift(video);
    await savePlaylyWebhookVideos(list);
    return "dibuat";
  }
  list[idx] = video;
  await savePlaylyWebhookVideos(list);
  return "diperbarui";
}

/**
 * Ubah status satu video (dipakai saat Playly menarik/menerbitkan ulang).
 * False = videoId itu memang tidak ada di catatan kita.
 *
 * Video tak dikenal TIDAK dibuatkan baris baru di sini: notifikasi unpublish
 * untuk video yang belum pernah kita terima berarti memang tak ada yang perlu
 * disembunyikan — membuat baris hantu justru menambah sampah data.
 */
export async function setPlaylyWebhookVideoStatus(
  videoId: string,
  status: PlaylyWebhookVideo["status"],
  receivedAt: string,
): Promise<boolean> {
  const list = await getPlaylyWebhookVideos();
  const idx = list.findIndex((v) => v.videoId === videoId);
  if (idx === -1) return false;
  list[idx] = { ...list[idx], status, receivedAt };
  await savePlaylyWebhookVideos(list);
  return true;
}

/** Mode penyimpanan aktif — berguna untuk debugging/health check. */
export const storageMode = useSupabase ? "supabase" : "file";
