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
  sbRpc,
  eq,
} from "./supabase";

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

// --- Dokumen JSON di Supabase (tabel app_data: key -> value jsonb) ----------
// `opts.revalidate` diteruskan ke sbSelect: kosong = selalu segar (no-store).
// Perlu untuk dokumen yang dibaca dari halaman ISR — satu fetch no-store
// membuat SELURUH halaman jadi dinamis (lihat lib/supabase.ts:51).
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

/** Mode penyimpanan aktif — berguna untuk debugging/health check. */
export const storageMode = useSupabase ? "supabase" : "file";
