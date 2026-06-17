// Seed data awal dari data/*.json -> Supabase.
// Jalankan SETELAH supabase_setup.sql dijalankan di SQL Editor:
//     node scripts/seed-supabase.mjs
//
// Butuh env (otomatis dibaca dari .env.local kalau ada):
//     SUPABASE_URL=...                  (Project URL)
//     SUPABASE_SERVICE_ROLE_KEY=...     (service_role key — RAHASIA, server only)
//
// Idempoten: pakai upsert, jadi aman dijalankan ulang.
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "data");

// --- muat .env.local sederhana (KEY=VALUE per baris) ----------------------
const envPath = join(root, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

const URL = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY ?? "";
if (!URL || !KEY) {
  console.error(
    "ERROR: set SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY (di .env.local atau env).",
  );
  process.exit(1);
}

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

const readJson = (file, fallback) => {
  const p = join(dataDir, file);
  if (!existsSync(p)) return fallback;
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return fallback;
  }
};

async function upsert(table, rows, onConflict) {
  if (!rows.length) return 0;
  const res = await fetch(`${URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
  return rows.length;
}

const dramaToRow = (d, i) => ({
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
  sort_index: i,
});

async function main() {
  // 1) dramas -> tabel dramas
  const dramas = readJson("dramas.json", []);
  const nDramas = await upsert("dramas", dramas.map(dramaToRow), "id");

  // 2) likes -> tabel likes
  const likes = readJson("interactions.json", { likes: {} }).likes ?? {};
  const likeRows = Object.entries(likes).map(([drama_id, count]) => ({
    drama_id,
    count: Number(count) || 0,
  }));
  const nLikes = await upsert("likes", likeRows, "drama_id");

  // 3) wallets / unlocks / coinmeta (kalau ada di file lokal)
  const wallet = readJson("wallets.json", { wallets: {}, unlocks: {}, meta: {} });
  const walletRows = Object.entries(wallet.wallets ?? {}).map(([email, balance]) => ({
    email: email.toLowerCase(),
    balance: Number(balance) || 0,
  }));
  const nWallets = await upsert("wallets", walletRows, "email");

  const unlockRows = [];
  for (const [email, tokens] of Object.entries(wallet.unlocks ?? {})) {
    for (const token of tokens ?? []) {
      unlockRows.push({ email: email.toLowerCase(), token });
    }
  }
  const nUnlocks = await upsert("unlocks", unlockRows, "email,token");

  // 4) dokumen app_data: admins, comments:<id>, coinmeta:<email>
  const docs = [];
  docs.push({ key: "admins", value: readJson("admins.json", { admins: [] }) });

  const comments = readJson("comments.json", { comments: {} }).comments ?? {};
  for (const [dramaId, list] of Object.entries(comments)) {
    docs.push({ key: `comments:${dramaId}`, value: list ?? [] });
  }
  for (const [email, meta] of Object.entries(wallet.meta ?? {})) {
    docs.push({ key: `coinmeta:${email.toLowerCase()}`, value: meta });
  }
  const nDocs = await upsert("app_data", docs, "key");

  console.log("Seed selesai ->");
  console.log(`  dramas=${nDramas} likes=${nLikes} wallets=${nWallets} unlocks=${nUnlocks} app_data=${nDocs}`);
}

main().catch((e) => {
  console.error("Seed GAGAL:", e.message);
  process.exit(1);
});
