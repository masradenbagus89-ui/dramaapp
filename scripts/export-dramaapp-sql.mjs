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
import { join, dirname, resolve } from "node:path";
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

// --- struktur tabel dari DATABASE HIDUP ------------------------------------
// KENAPA bukan dari supabase_migrations/: folder itu TIDAK menggambarkan
// produksi, dan itu terbukti (2026-10-14), bukan dugaan:
//   - `2026-08-29_schema_lengkap_dramaapp.sql` mendefinisikan `dramas` 15 kolom,
//     sedangkan yang hidup 29 -> 14 kolom hilang (imdb_*, kind, status, genre,
//     year, country, director, language, runtime, stars, writer, ...).
//   - `mark_existing_movies.sql` masih menyebut `public.dramas` = schema sebelum
//     pindah; dijalankan di database kosong ia ERROR dan membatalkan pemulihan.
//   - `2026-10-05_playly_link_unduhan.sql` membuat tabel yang di produksi TIDAK
//     ADA (dijawab PGRST205), sebab owner tak punya akses DDL ke project ini.
// Akibat kalau struktur diambil dari berkas basi: tabel dibuat kurang kolom ->
// `insert` menyebut kolom yang tak dikenal -> SELURUH transaksi batal -> nol
// data pulih, padahal berkasnya terlihat utuh. Itu "berkas yang disangka backup".
async function fetchSpec() {
  const res = await fetch(`${URL}/rest/v1/`, {
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Accept-Profile": SCHEMA,
    },
  });
  if (!res.ok)
    throw new Error(`spec PostgREST: ${res.status} ${await res.text()}`);
  return res.json();
}

// Default dari spec -> literal SQL. SENGAJA hanya bentuk yang sudah terbukti
// muncul di project ini; bentuk lain dilewati + ditandai komentar. Menebak
// default yang salah lebih berbahaya daripada tidak menyalinnya, sebab salahnya
// baru terasa pada baris yang dimasukkan JAUH sesudah pemulihan.
function defaultLiteral(d) {
  if (d === undefined || d === null) return null;
  if (typeof d === "boolean") return d ? "true" : "false";
  if (typeof d === "number") return String(d);
  if (typeof d === "string") {
    if (d === "now()") return "now()";
    if (d.includes("(")) return null; // ekspresi tak dikenal -> jangan tebak
    return sqlString(d);
  }
  return null;
}

// Dijalankan SESUDAH berkas migrasi dasar, dan sengaja berbentuk
// `add column if not exists` — bukan `create table` kedua. Alasannya:
//   - berkas migrasi membawa default & index yang TIDAK dilaporkan spec
//     PostgREST (mis. dramas.subtitles default '{}'); menimpanya dengan
//     `create table` versi spec justru MENGHILANGKAN default itu;
//   - kolom yang sudah ada jadi no-op, yang belum ada ditambahkan -> hanya
//     selisihnya yang ditambal, dan hasilnya sama untuk berapa kali pun
//     berkas ini dijalankan ulang.
// `create table` kerangka tetap ditulis sebagai jaring: kalau suatu saat ada
// tabel baru di produksi yang belum masuk berkas migrasi, `alter table` atas
// tabel yang belum ada akan error dan membatalkan seluruh pemulihan.
// Catatan NOT NULL: aman karena blok ini berjalan saat tabel masih KOSONG
// (data dimasukkan sesudahnya). Dijalankan ulang di tabel berisi, kolom lama
// jadi no-op; kolom benar-benar baru akan GAGAL keras — itu memang disengaja,
// lebih baik berhenti daripada diam-diam melewatkan kolom.
function ddlFromSpec(spec) {
  const out = [];
  for (const t of TABLES) {
    const def = spec?.definitions?.[t];
    if (!def) throw new Error(`definisi tabel ${t} tidak ada di spec PostgREST`);
    const wajib = new Set(def.required ?? []);
    const pk = [];
    const kolom = [];
    const catatan = [];
    for (const [c, meta] of Object.entries(def.properties ?? {})) {
      if (!meta.format) throw new Error(`${t}.${c}: tipe tak terbaca dari spec`);
      if (/<pk\/>/.test(meta.description ?? "")) pk.push(c);
      const dv = defaultLiteral(meta.default);
      if (dv === null && meta.default !== undefined) {
        catatan.push(
          `-- [!] ${t}.${c}: default asli ${JSON.stringify(meta.default)} TIDAK disalin (bentuk tak dikenali).`,
        );
      }
      kolom.push({ c, tipe: meta.format, dv, wajib: wajib.has(c) });
    }
    if (pk.length === 0) throw new Error(`${t}: primary key tak terbaca dari spec`);

    const kerangka = kolom
      .filter((k) => pk.includes(k.c))
      .map((k) => `  ${k.c} ${k.tipe} not null`);
    out.push(...catatan);
    out.push(
      `create table if not exists ${SCHEMA}.${t} (`,
      [...kerangka, `  primary key (${pk.join(", ")})`].join(",\n"),
      ");",
    );
    for (const k of kolom) {
      out.push(
        `alter table ${SCHEMA}.${t} add column if not exists ${k.c} ${k.tipe}` +
          (k.dv ? ` default ${k.dv}` : "") +
          (k.wajib ? " not null" : "") +
          ";",
      );
    }
    out.push("");
  }
  return out.join("\n");
}

// Gerbang: berkas hasil WAJIB membuktikan dirinya sendiri sebelum disebut
// backup. "Ada berkas, ukurannya wajar" adalah ambang yang terlalu rendah —
// itu persis bentuk kegagalan yang baru ketahuan di hari ia dibutuhkan.
function periksaHasil(sql, spec, data, hitungServer) {
  const masalah = [];
  for (const t of TABLES) {
    const kolom = Object.keys(spec?.definitions?.[t]?.properties ?? {});
    if (!sql.includes(`create table if not exists ${SCHEMA}.${t} (`)) {
      masalah.push(`blok "create table ${t}" tidak ada di hasil`);
      continue;
    }
    for (const c of kolom) {
      if (
        !sql.includes(
          `alter table ${SCHEMA}.${t} add column if not exists ${c} `,
        )
      ) {
        masalah.push(
          `kolom ${t}.${c} ada di database hidup tapi TIDAK ikut ke struktur hasil`,
        );
      }
    }
    const jml = (
      sql.match(new RegExp(`(?:^|\\n)insert into ${SCHEMA}\\.${t} `, "g")) ?? []
    ).length;
    if (jml !== data[t].length) {
      masalah.push(
        `${t}: ${data[t].length} baris ditarik dari database, tapi ${jml} baris insert tertulis`,
      );
    }
    // Pembanding dari LUAR: hitungan server sendiri. Inilah yang menangkap
    // penarikan yang berhenti di tengah — kecocokan dua angka milik kita
    // sendiri (atas) tidak membuktikan apa pun soal kelengkapan.
    if (hitungServer[t] !== data[t].length) {
      masalah.push(
        `${t}: server punya ${hitungServer[t]} baris, tapi yang tertarik ${data[t].length} — penarikan tidak lengkap`,
      );
    }
  }
  return masalah;
}

// Jumlah baris menurut SERVER — pembanding independen untuk hasil tarikan.
// Tanpa ini, "125 baris ditarik, 125 insert tertulis" cuma membuktikan kita
// konsisten dengan diri sendiri; penarikan yang berhenti di tengah tetap lolos.
async function countRows(table) {
  const res = await fetch(`${URL}/rest/v1/${table}?select=*&limit=1`, {
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Accept-Profile": SCHEMA,
      Prefer: "count=exact",
    },
  });
  if (!res.ok) throw new Error(`hitung ${table}: ${res.status}`);
  const cr = res.headers.get("content-range"); // contoh: "0-0/36" atau "*/0"
  const n = Number((cr ?? "").split("/")[1]);
  if (!Number.isInteger(n)) {
    throw new Error(`hitung ${table}: Content-Range tak terbaca (${cr})`);
  }
  return n;
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
  const hitungServer = {};
  for (const t of TABLES) {
    hitungServer[t] = await countRows(t);
    data[t] = await fetchAll(t);
  }

  // 2) Struktur tabel dibangun dari DATABASE HIDUP (lihat ddlFromSpec).
  //    Berkas migrasi dasar tetap disertakan SESUDAHNYA sebagai pelengkap: ia
  //    idempoten, jadi `create table`-nya jadi no-op, dan yang benar-benar ia
  //    sumbangkan adalah index + fungsi RPC (coin_add, coin_spend_unlock,
  //    like_change) — badan fungsi TIDAK terbaca dari spec PostgREST.
  //    Batas yang jujur: kalau fungsi diubah langsung di SQL Editor tanpa
  //    memperbarui berkas itu, versi fungsi di hasil backup ikut basi. Naik
  //    kelasnya: minta pemilik project membuat role read-only khusus schema
  //    `dramaapp`, lalu pakai pg_dump yang membaca definisi aslinya.
  const spec = await fetchSpec();
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
  p("-- ---------- Tabel, index & fungsi RPC (berkas migrasi dasar) ----------");
  p(ddl);
  p("");
  p("-- ---------- Penyelaras: kolom apa adanya dari database HIDUP ----------");
  p("-- Berkas migrasi di atas sudah menyimpang dari produksi (owner tak punya");
  p("-- akses DDL ke project ini), jadi blok inilah yang menjamin struktur hasil");
  p("-- pemulihan sama persis dengan yang hidup saat backup diambil.");
  p(ddlFromSpec(spec));
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

  const teks = out.join("\n");

  // Gerbang: tolak menulis berkas yang tidak lolos periksa. Lebih baik GAGAL
  // keras sekarang daripada menyimpan berkas hijau yang ternyata tak bisa
  // dipulihkan — kegagalan diam-diam itulah yang membuat backup jadi sia-sia.
  const masalah = periksaHasil(teks, spec, data, hitungServer);
  if (masalah.length > 0) {
    console.error("GAGAL: hasil export tidak lolos periksa isi.");
    for (const m of masalah) console.error(`  - ${m}`);
    process.exit(1);
  }

  const target = process.argv[2]
    ? resolve(process.argv[2])
    : join(root, "supabase_export_dramaapp.sql");
  writeFileSync(target, teks, "utf-8");
  console.log(`OK -> ${target}`);
  let total = 0;
  for (const t of TABLES) {
    console.log(`  ${t}=${data[t].length} baris (server: ${hitungServer[t]})`);
    total += data[t].length;
  }
  console.log(`  TOTAL=${total} baris`);
  console.log(
    `  kolom dramas=${Object.keys(spec.definitions.dramas.properties).length}`,
  );
}

main().catch((e) => {
  console.error("Export GAGAL:", e.message);
  process.exit(1);
});
