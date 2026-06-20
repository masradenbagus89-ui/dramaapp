// Generator: ubah data/*.json -> satu file SQL siap-import ke Supabase (Postgres).
// Jalankan: node scripts/gen-supabase-sql.mjs  -> menghasilkan supabase_export.sql
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "data");

const readJson = (file, fallback) => {
  const p = join(dataDir, file);
  if (!existsSync(p)) return fallback;
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return fallback;
  }
};

// --- helper escaping ------------------------------------------------------
const q = (v) => {
  if (v === null || v === undefined) return "null";
  return "'" + String(v).replace(/'/g, "''") + "'";
};
const num = (v) => (v === null || v === undefined || v === "" ? "null" : Number(v));
const bool = (v) => (v ? "true" : "false");
const txtArr = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return "'{}'";
  return "ARRAY[" + arr.map((s) => q(s)).join(", ") + "]::text[]";
};

// --- baca semua data ------------------------------------------------------
const dramas = readJson("dramas.json", []);
const admins = readJson("admins.json", { admins: [] }).admins ?? [];
const comments = readJson("comments.json", { comments: {} }).comments ?? {};
const likes = readJson("interactions.json", { likes: {} }).likes ?? {};
const wallet = readJson("wallets.json", { wallets: {}, unlocks: {}, meta: {} });
const ads = readJson("ads.json", { ads: [] }).ads ?? [];

const out = [];
const p = (s = "") => out.push(s);

p("-- =====================================================================");
p("-- DramaApp  ->  Supabase (PostgreSQL) import");
p("-- Dihasilkan otomatis dari data/*.json (https://dramaapp.vercel.app/)");
p("-- Cara pakai: buka Supabase -> SQL Editor -> New query -> paste -> Run.");
p("-- Idempoten: aman dijalankan ulang (drop & buat ulang tabel app).");
p("-- =====================================================================");
p("");
p("begin;");
p("");

// ---- SCHEMA --------------------------------------------------------------
p("-- ---------- Skema tabel ----------");
p(`drop table if exists public.comments cascade;
drop table if exists public.likes cascade;
drop table if exists public.unlocks cascade;
drop table if exists public.coin_meta cascade;
drop table if exists public.coin_orders cascade;
drop table if exists public.wallets cascade;
drop table if exists public.sponsor_ads cascade;
drop table if exists public.admins cascade;
drop table if exists public.dramas cascade;`);
p("");

p(`create table public.dramas (
  id           text primary key,
  title        text not null,
  category     text not null check (category in
                 ('Romance','Tycoon','Harem','Time Travel','Action','Comedy','Fantasy')),
  episodes     integer not null default 0,
  views        text,
  synopsis     text not null default '',
  gradient     text,
  poster_image text,
  hero_image   text,
  hero_dim     boolean not null default false,
  exclusive    boolean not null default false,
  premium      boolean not null default false,
  subtitles    text[]  not null default '{}',
  created_at   timestamptz not null default now()
);`);
p("");

p(`create table public.admins (
  email    text primary key,
  name     text not null,
  added_at date
);`);
p("");

p(`-- Komentar per-drama (terbaru di depan saat di-render oleh app).
create table public.comments (
  id        text primary key,
  drama_id  text not null,
  user_name text not null,
  email     text,
  role      text check (role in ('admin','viewer')),
  text      text not null,
  time      text
);
create index comments_drama_id_idx on public.comments (drama_id);`);
p("");

p(`-- Jumlah like per drama (tanpa FK: bisa berisi id lama yang sudah tak ada).
create table public.likes (
  drama_id text primary key,
  count    integer not null default 0
);`);
p("");

p(`-- Dompet koin per user (kunci = email, huruf kecil).
create table public.wallets (
  email   text primary key,
  balance integer not null default 0
);

-- Episode yang sudah dibuka: token "<dramaId>:<ep>".
create table public.unlocks (
  email text not null,
  token text not null,
  primary key (email, token)
);

-- Catatan check-in & kuota iklan harian per user.
create table public.coin_meta (
  email        text primary key,
  last_checkin date,
  ad_date      date,
  ad_count     integer not null default 0
);

-- Order top-up koin (Midtrans). Idempoten: koin dikredit sekali per order.
create table public.coin_orders (
  order_id   text primary key,
  email      text not null,
  coins      integer not null,
  pack_id    text,
  amount     integer,
  status     text not null default 'pending' check (status in ('pending','paid')),
  created_at timestamptz
);`);
p("");

p(`-- Iklan sponsor (house ads) yang dikelola admin.
create table public.sponsor_ads (
  id        text primary key,
  title     text,
  image_url text not null,
  link_url  text not null,
  views     integer not null default 0,
  clicks    integer not null default 0,
  added_at  date
);`);
p("");

// ---- DATA ----------------------------------------------------------------
p("-- ---------- Data: dramas ----------");
for (const d of dramas) {
  p(
    `insert into public.dramas (id, title, category, episodes, views, synopsis, gradient, poster_image, hero_image, hero_dim, exclusive, premium, subtitles) values (` +
      [
        q(d.id),
        q(d.title),
        q(d.category),
        num(d.episodes),
        q(d.views),
        q(d.synopsis ?? ""),
        q(d.gradient),
        q(d.posterImage ?? null),
        q(d.heroImage ?? null),
        bool(d.heroDim),
        bool(d.exclusive),
        bool(d.premium),
        txtArr(d.subtitles),
      ].join(", ") +
      `);`,
  );
}
p("");

p("-- ---------- Data: admins ----------");
for (const a of admins) {
  p(
    `insert into public.admins (email, name, added_at) values (` +
      [q(a.email), q(a.name), q(a.addedAt)].join(", ") +
      `);`,
  );
}
p("");

p("-- ---------- Data: likes ----------");
const likeEntries = Object.entries(likes);
if (likeEntries.length === 0) p("-- (kosong)");
for (const [id, count] of likeEntries) {
  p(`insert into public.likes (drama_id, count) values (${q(id)}, ${num(count)});`);
}
p("");

p("-- ---------- Data: comments ----------");
const commentRows = Object.entries(comments).flatMap(([dramaId, list]) =>
  (list ?? []).map((c) => ({ dramaId, c })),
);
if (commentRows.length === 0) p("-- (kosong)");
for (const { dramaId, c } of commentRows) {
  p(
    `insert into public.comments (id, drama_id, user_name, email, role, text, time) values (` +
      [q(c.id), q(dramaId), q(c.user), q(c.email), q(c.role), q(c.text), q(c.time)].join(", ") +
      `);`,
  );
}
p("");

p("-- ---------- Data: wallets / unlocks / coin_meta ----------");
const wEntries = Object.entries(wallet.wallets ?? {});
const uEntries = Object.entries(wallet.unlocks ?? {});
const mEntries = Object.entries(wallet.meta ?? {});
if (!wEntries.length && !uEntries.length && !mEntries.length) p("-- (kosong)");
for (const [email, bal] of wEntries)
  p(`insert into public.wallets (email, balance) values (${q(email)}, ${num(bal)});`);
for (const [email, tokens] of uEntries)
  for (const t of tokens ?? [])
    p(`insert into public.unlocks (email, token) values (${q(email)}, ${q(t)});`);
for (const [email, m] of mEntries)
  p(
    `insert into public.coin_meta (email, last_checkin, ad_date, ad_count) values (` +
      [q(email), q(m.lastCheckin), q(m.adDate), num(m.adCount ?? 0)].join(", ") +
      `);`,
  );
p("");

p("-- ---------- Data: sponsor_ads ----------");
if (!ads.length) p("-- (kosong)");
for (const a of ads) {
  p(
    `insert into public.sponsor_ads (id, title, image_url, link_url, views, clicks, added_at) values (` +
      [q(a.id), q(a.title), q(a.imageUrl), q(a.linkUrl), num(a.views ?? 0), num(a.clicks ?? 0), q(a.addedAt)].join(", ") +
      `);`,
  );
}
p("");

p("commit;");
p("");
p(`-- Catatan keamanan (opsional, jalankan jika perlu Row Level Security):`);
p(`--   alter table public.dramas enable row level security;`);
p(`--   create policy "dramas baca publik" on public.dramas for select using (true);`);

const sql = out.join("\n");
const target = join(root, "supabase_export.sql");
writeFileSync(target, sql, "utf-8");
console.log(
  `OK -> ${target}\n  dramas=${dramas.length} admins=${admins.length} likes=${likeEntries.length} comments=${commentRows.length} ads=${ads.length}`,
);
