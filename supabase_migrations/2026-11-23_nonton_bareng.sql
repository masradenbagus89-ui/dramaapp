-- Migrasi: NONTON BARENG (watch party) untuk film Playly — 4 tabel baru.
--
-- Pemakai: HANYA server nobar-server (service Railway terpisah), lewat
-- service_role. Situs Next TIDAK membaca tabel ini langsung.
--
-- ⚠️ SCHEMA `dramaapp`, BUKAN `public` (lib/supabase.ts SUPABASE_SCHEMA).
-- ⚠️ URUTAN RILIS (AGENTS.local.md aturan 3): jalankan SQL ini DULU, baru
--    deploy nobar-server. Server yang mencari tabel yang belum ada = error di
--    tiap pembuatan Room.
--
-- Kenapa tak ada relasi ke tabel film/pengguna (diminta brief, poin H):
--   • Film Playly tidak disimpan di tabel kita — daftarnya dibaca dari API
--     Playly (lib/playly-gabungan.ts). Yang disimpan cukup id-nya; keabsahannya
--     diperiksa Next ke daftar kurasi SEBELUM Room dibuat.
--   • Tidak ada tabel pengguna: akun penonton = dokumen JSON di app_data
--     (lib/store.ts). Email disimpan apa adanya, opsional (tamu tanpa login boleh ikut).
--
-- Kenapa token & kunci disimpan sebagai HASH: isi tabel yang bocor tidak
-- memberi akses ke Room mana pun (yang dicocokkan selalu sha256 dari nilai asli).
--
-- Cara menjalankan (owner):
--   Supabase dashboard -> SQL Editor -> tempel -> Run, ATAU
--   python scripts/jalankan_sql_dramaapp.py supabase_migrations/2026-11-23_nonton_bareng.sql --jalankan
-- Aman dijalankan ulang (IF NOT EXISTS).
--
-- Rollback (menghapus SEMUA data Nonton Bareng — situs utama tidak terpengaruh):
--   drop table if exists dramaapp.watch_room_states, dramaapp.watch_messages,
--     dramaapp.watch_participants, dramaapp.watch_rooms;

create table if not exists dramaapp.watch_rooms (
  id                uuid primary key default gen_random_uuid(),
  invite_token_hash text not null unique check (invite_token_hash ~ '^[0-9a-f]{64}$'),
  playly_video_id   text not null check (playly_video_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  judul             text not null check (char_length(judul) between 1 and 300),
  poster            text check (poster is null or (poster like 'https://%' and length(poster) <= 2048)),
  status            text not null default 'aktif' check (status in ('aktif', 'berakhir')),
  created_at        timestamptz not null default now(),
  last_activity_at  timestamptz not null default now(),
  ended_at          timestamptz,
  -- Room berakhir WAJIB punya waktu berakhir → pembersihan 7 hari bisa menghitungnya.
  check ((status = 'aktif') = (ended_at is null))
);
-- Pembersihan berkala memfilter dua kolom ini.
create index if not exists watch_rooms_status_aktivitas_idx
  on dramaapp.watch_rooms (status, last_activity_at);

create table if not exists dramaapp.watch_participants (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references dramaapp.watch_rooms (id) on delete cascade,
  key_hash     text not null unique check (key_hash ~ '^[0-9a-f]{64}$'),
  display_name text not null check (char_length(display_name) between 1 and 24),
  viewer_email text check (viewer_email is null or length(viewer_email) <= 254),
  role         text not null default 'penonton' check (role in ('host', 'penonton')),
  joined_at    timestamptz not null default now()
);
create index if not exists watch_participants_room_idx
  on dramaapp.watch_participants (room_id, joined_at);
-- Pagar lapis DATABASE untuk aturan "satu Room = satu Host": bug di server pun
-- tak bisa menghasilkan dua pengendali video.
create unique index if not exists watch_participants_satu_host
  on dramaapp.watch_participants (room_id) where role = 'host';

create table if not exists dramaapp.watch_messages (
  id             bigint generated always as identity primary key,
  room_id        uuid not null references dramaapp.watch_rooms (id) on delete cascade,
  participant_id uuid not null references dramaapp.watch_participants (id) on delete cascade,
  -- Batas 300 = MAKS_PANJANG_PESAN di nobar-server/src/kontrak.ts. Ubah keduanya bersamaan.
  body           text not null check (char_length(body) between 1 and 300),
  created_at     timestamptz not null default now()
);
create index if not exists watch_messages_room_idx
  on dramaapp.watch_messages (room_id, id desc);
-- FK tanpa index = hapus peserta memindai seluruh tabel chat.
create index if not exists watch_messages_participant_idx
  on dramaapp.watch_messages (participant_id);

create table if not exists dramaapp.watch_room_states (
  room_id      uuid primary key references dramaapp.watch_rooms (id) on delete cascade,
  playing      boolean not null default false,
  -- 43200 = 12 jam = MAKS_POSISI_DETIK di kontrak.ts.
  position_sec double precision not null default 0 check (position_sec >= 0 and position_sec <= 43200),
  seq          bigint not null default 0,
  updated_at   timestamptz not null default now()
);

-- RLS hidup TANPA policy = tolak-total untuk anon/authenticated. DISENGAJA
-- (menyimpang dari saran rak "tulis policy segera"), pola sama dengan
-- 2026-10-24_rls_dan_hak_fungsi.sql: hanya nobar-server (service_role, menembus
-- RLS) yang boleh menyentuh. Browser tak pernah membaca tabel ini langsung.
alter table dramaapp.watch_rooms        enable row level security;
alter table dramaapp.watch_participants enable row level security;
alter table dramaapp.watch_messages     enable row level security;
alter table dramaapp.watch_room_states  enable row level security;

revoke all on dramaapp.watch_rooms, dramaapp.watch_participants,
  dramaapp.watch_messages, dramaapp.watch_room_states from anon, authenticated;
grant select, insert, update, delete on dramaapp.watch_rooms, dramaapp.watch_participants,
  dramaapp.watch_messages, dramaapp.watch_room_states to service_role;
