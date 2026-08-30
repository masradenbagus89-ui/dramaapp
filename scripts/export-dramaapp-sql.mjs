// Export LENGKAP database DramaApp (schema `dramaapp` di Supabase saat ini)
// menjadi SATU file .sql yang tinggal di-paste ke SQL Editor Supabase BARU.
//
// Jalankan:  node scripts/export-dramaapp-sql.mjs
// Hasil   :  supabase_export_dramaapp.sql  (di root project — JANGAN di-commit,
//            berisi email user + hash password; pola ini sudah ada di .gitignore)
//
// Butuh env (otomatis dibaca dari .env.local kalau ada):
//     SUPABASE_URL=...                  (Project URL lama)
//     SUPABASE_SERVICE_ROLE_KEY=...     (service_role key — RAHASIA, server only)
//
// Kenapa satu file .sql (bukan pg_dump): teman pemilik Supabase baru cukup
// buka SQL Editor -> paste -> Run. Tidak perlu install psql apa pun.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA = "dramaapp";
const TABLES = ["app_data", "dramas", "likes", "wallets", "unlocks"];
const CONFLICT = {
  app_data: "key",
  dramas: "id",
  likes: "drama_id",
  wallets: "email",
  unlocks: null, // PK gabungan (email, token) -> polos "on conflict do nothing"
};
const PAGE = 1000; // batas default PostgREST per respons

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

// --- tarik SEMUA baris satu tabel (paginasi per 1000) ---------------------
async function fetchAll(table) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${URL}/rest/v1/${table}?select=*`, {
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        "Accept-Profile": SCHEMA,
        "Range-Unit": "items",
        Range: `${from}-${from + PAGE - 1}`,
      },
    });
    if (!res.ok) {
      throw new Error(`${table}: ${res.status} ${await res.text()}`);
    }
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < PAGE) return rows;
  }
}

// --- escaping literal SQL --------------------------------------------------
const sqlString = (v) => "'" + String(v).replace(/'/g, "''") + "'";

function sqlValue(v) {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) {
    // kolom text[] (mis. dramas.subtitles)
    if (v.length === 0) return "'{}'";
    return "ARRAY[" + v.map(sqlString).join(", ") + "]::text[]";
  }
  if (typeof v === "object") return sqlString(JSON.stringify(v)) + "::jsonb";
  return sqlString(v);
}

function insertRows(table, rows) {
  if (rows.length === 0) return [`-- (tabel ${table} kosong)`];
  const cols = Object.keys(rows[0]);
  const conflict = CONFLICT[table];
  const onConflict = conflict
    ? ` on conflict (${conflict}) do nothing`
    : " on conflict do nothing";
  return rows.map(
    (r) =>
      `insert into ${SCHEMA}.${table} (${cols.join(", ")}) values (` +
      cols.map((c) => sqlValue(r[c])).join(", ") +
      `)${onConflict};`,
  );
}

async function main() {
  // 1) Tarik data live
  const data = {};
  for (const t of TABLES) data[t] = await fetchAll(t);

  // 2) Skema DDL = file migrasi lengkap yang sama dengan yang dipakai saat
  //    migrasi 2026-08-29 (idempoten), supaya definisi tabel+fungsi tak menyimpang.
  const schemaFile = join(
    root,
    "supabase_migrations",
    "2026-08-29_schema_lengkap_dramaapp.sql",
  );
  const ddl = readFileSync(schemaFile, "utf-8").trim();

  const out = [];
  const p = (s = "") => out.push(s);

  p("-- =====================================================================");
  p("-- EXPORT LENGKAP DramaApp -> Supabase BARU");
  p(`-- Diekspor: ${new Date().toISOString()} dari project: ${URL}`);
  p("--");
  p("-- CARA PAKAI (di project Supabase BARU milik teman):");
  p("--   1. Buka Dashboard Supabase baru -> SQL Editor -> New query.");
  p("--   2. Paste SELURUH isi file ini -> Run.");
  p("--   3. WAJIB: Settings -> API -> 'Exposed schemas' tambahkan: dramaapp");
  p("--      (tanpa ini API PostgREST tidak bisa membaca schema dramaapp).");
  p("--   4. Di project DramaApp, ganti .env.local: SUPABASE_URL &");
  p("--      SUPABASE_SERVICE_ROLE_KEY ke milik project baru.");
  p("--");
  p("-- Idempoten: aman dijalankan ulang (create if not exists /");
  p("-- on conflict do nothing) — data lama tidak tertimpa.");
  p("-- RAHASIA: file ini berisi email user & hash password. Jangan sebar");
  p("-- sembarangan dan jangan commit ke git.");
  p("-- =====================================================================");
  p("");
  p(`create schema if not exists ${SCHEMA};`);
  p("");
  p("-- ---------- Skema tabel + fungsi RPC ----------");
  p(ddl);
  p("");
  p("-- ---------- Izin akses untuk API Supabase ----------");
  p(`grant usage on schema ${SCHEMA} to service_role;`);
  p(`grant all on all tables in schema ${SCHEMA} to service_role;`);
  p(`grant execute on all functions in schema ${SCHEMA} to service_role;`);
  p(`alter default privileges in schema ${SCHEMA} grant all on tables to service_role;`);
  p("-- Muat ulang cache skema PostgREST supaya tabel langsung terlihat.");
  p("notify pgrst, 'reload schema';");
  p("");
  p("-- ---------- Data ----------");
  p("begin;");
  for (const t of TABLES) {
    p("");
    p(`-- ${t}: ${data[t].length} baris`);
    for (const line of insertRows(t, data[t])) p(line);
  }
  p("");
  p("commit;");
  p("");

  const target = join(root, "supabase_export_dramaapp.sql");
  writeFileSync(target, out.join("\n"), "utf-8");
  console.log(`OK -> ${target}`);
  for (const t of TABLES) console.log(`  ${t}=${data[t].length} baris`);
}

main().catch((e) => {
  console.error("Export GAGAL:", e.message);
  process.exit(1);
});
