-- Migrasi NAIK KELAS: link unduhan video Playly pindah dari dokumen app_data
-- (`playly:link-unduhan`) ke tabel sendiri ber-UNIQUE.
--
-- ⚠️ BELUM WAJIB DIJALANKAN. Kode yang tayang (2026-10-05) menyimpan link di
-- dokumen app_data, karena akses DDL tertutup sejak 2026-09-22 (HANDOFF.md).
-- Berkas ini disiapkan supaya begitu akses pulih, pindahnya tinggal jalan —
-- SESUDAH itu kode lib/store.ts (bagian "Link unduhan per video Playly") perlu
-- diubah membaca/menulis tabel ini. Menjalankan SQL ini SAJA tidak mengubah apa
-- pun di situs (kode belum membacanya).
--
-- ⚠️ SCHEMA `dramaapp`, BUKAN `public` (lib/supabase.ts SUPABASE_SCHEMA).
--
-- Cara menjalankan (owner, kalau akses DB pulih):
--   - Supabase dashboard -> SQL Editor -> tempel isi berkas ini -> Run, ATAU
--   - python scripts/jalankan_sql_dramaapp.py supabase_migrations/2026-10-05_playly_link_unduhan.sql
--     (tanpa --jalankan = simulasi/rollback; tambah --jalankan untuk sungguhan)
--
-- Aman dijalankan ulang (IF NOT EXISTS / ON CONFLICT). TIDAK menghapus dokumen
-- app_data lama — itu dihapus terpisah sesudah kode baru terbukti tayang.
--
-- Rollback:
--   drop table if exists dramaapp.playly_link_unduhan;

create table if not exists dramaapp.playly_link_unduhan (
  video_id   text not null,
  provider   text not null check (provider in ('google', 'telegram', 'cast', 'mega')),
  quality    text not null check (quality in ('1080p', '480p')),
  -- Pagar lapis kedua di database. Pagar UTAMA (domain per provider) tetap di
  -- kode (lib/playly-unduhan.ts), karena daftar domainnya diatur lewat env.
  url        text not null check (url like 'https://%' and length(url) <= 2048),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Kombinasi unik: impor/webhook yang dikirim ulang memperbarui, bukan menggandakan.
  primary key (video_id, provider, quality)
);

-- RLS hidup TANPA policy = deny-total untuk anon/authenticated, dan itu
-- DISENGAJA (menyimpang dari saran rak "tulis policy segera"): tabel ini hanya
-- disentuh server lewat service_role, yang menembus RLS. Browser tidak pernah
-- boleh membacanya langsung — link sampai ke penonton lewat halaman yang
-- dirender server, sesudah disaring ulang.
alter table dramaapp.playly_link_unduhan enable row level security;

-- Pindahkan isi dokumen lama (kalau ada). Baris yang tak lolos CHECK di atas
-- membuat seluruh INSERT gagal — itu disengaja: lebih baik berhenti & diperiksa
-- daripada diam-diam memindahkan sebagian.
insert into dramaapp.playly_link_unduhan (video_id, provider, quality, url, created_at, updated_at)
select
  r->>'videoId',
  r->>'provider',
  r->>'quality',
  r->>'url',
  coalesce(nullif(r->>'createdAt', '')::timestamptz, now()),
  coalesce(nullif(r->>'updatedAt', '')::timestamptz, now())
from dramaapp.app_data d,
     jsonb_array_elements(d.value) r
where d.key = 'playly:link-unduhan'
  and jsonb_typeof(d.value) = 'array'
on conflict (video_id, provider, quality) do update
  set url = excluded.url,
      updated_at = excluded.updated_at;
