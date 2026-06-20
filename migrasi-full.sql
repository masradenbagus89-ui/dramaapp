-- ===================================================================
-- MIGRASI PENUH (struktur + data) DramaApp
-- Sumber: https://iicrzdnmcpontfytfypi.supabase.co  (snapshot 2026-06-17 11:04 UTC)
-- IDEMPOTEN: aman di-Run berulang (create if not exists / on conflict do nothing).
-- Cara pakai: Supabase project TUJUAN -> SQL Editor -> New query -> paste -> Run.
-- ===================================================================

-- ========================= 1) SKEMA =========================

-- =====================================================================
-- DramaApp  ->  Supabase (PostgreSQL) — SETUP SKEMA + FUNGSI
-- ---------------------------------------------------------------------
-- Cara pakai:  Supabase Dashboard -> SQL Editor -> New query ->
--              paste SELURUH isi file ini -> Run.
-- Idempoten: aman dijalankan berulang (create ... if not exists / replace).
--
-- Setelah ini, seed data awal dari data/*.json dengan:
--     node scripts/seed-supabase.mjs
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) app_data : dokumen JSON serbaguna (model "key -> value" seperti KV).
--    Menyimpan: "admins", "comments:<dramaId>", "ads",
--               "coinmeta:<email>", "twofa:<email>", "order:<orderId>".
-- ---------------------------------------------------------------------
create table if not exists public.app_data (
  key   text primary key,
  value jsonb not null
);

-- ---------------------------------------------------------------------
-- 2) dramas : katalog drama (relasional -> bisa dilihat sbg baris di dashboard).
-- ---------------------------------------------------------------------
create table if not exists public.dramas (
  id           text primary key,
  title        text not null,
  category     text not null,
  episodes     integer not null default 0,
  views        text not null default '',
  synopsis     text not null default '',
  gradient     text not null default '',
  poster_image text,
  hero_image   text,
  hero_dim     boolean not null default false,
  exclusive    boolean not null default false,
  premium      boolean not null default false,
  subtitles    text[]  not null default '{}',
  sort_index   double precision not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists dramas_sort_idx on public.dramas (sort_index);

-- ---------------------------------------------------------------------
-- 3) likes : jumlah like per drama (diubah atomik via RPC like_change).
-- ---------------------------------------------------------------------
create table if not exists public.likes (
  drama_id text primary key,
  count    integer not null default 0
);

-- ---------------------------------------------------------------------
-- 4) wallets : saldo koin per user (atomik via RPC coin_add / coin_spend_unlock).
-- ---------------------------------------------------------------------
create table if not exists public.wallets (
  email   text primary key,
  balance integer not null default 0
);

-- ---------------------------------------------------------------------
-- 5) unlocks : episode terbuka. token = "<dramaId>:<ep>".
-- ---------------------------------------------------------------------
create table if not exists public.unlocks (
  email text not null,
  token text not null,
  primary key (email, token)
);

-- =====================================================================
-- FUNGSI RPC — operasi atomik (pengganti HINCRBY / SADD Redis)
-- =====================================================================

-- Tambah/kurang like (+1 / -1), tak pernah < 0. Kembalikan jumlah terbaru.
create or replace function public.like_change(p_drama_id text, p_delta int)
returns int language plpgsql as $$
declare new_count int;
begin
  insert into public.likes (drama_id, count)
       values (p_drama_id, greatest(0, p_delta))
  on conflict (drama_id)
    do update set count = greatest(0, public.likes.count + p_delta)
  returning count into new_count;
  return new_count;
end; $$;

-- Tambah saldo koin (delta boleh negatif), tak pernah < 0. Kembalikan saldo baru.
create or replace function public.coin_add(p_email text, p_delta int)
returns int language plpgsql as $$
declare new_bal int;
begin
  insert into public.wallets (email, balance)
       values (p_email, greatest(0, p_delta))
  on conflict (email)
    do update set balance = greatest(0, public.wallets.balance + p_delta)
  returning balance into new_bal;
  return new_bal;
end; $$;

-- Belanjakan koin untuk buka 1 episode. Idempoten (kalau sudah terbuka, tak
-- menarik koin). Atomik. Kembalikan satu baris: (ok boolean, balance int).
create or replace function public.coin_spend_unlock(
  p_email text, p_token text, p_cost int
) returns table(ok boolean, balance int) language plpgsql as $$
declare cur int;
begin
  -- Sudah terbuka -> tidak menarik koin.
  if exists (select 1 from public.unlocks u
             where u.email = p_email and u.token = p_token) then
    select w.balance into cur from public.wallets w where w.email = p_email;
    return query select true, coalesce(cur, 0);
    return;
  end if;

  select w.balance into cur from public.wallets w where w.email = p_email;
  cur := coalesce(cur, 0);
  if cur < p_cost then
    return query select false, cur;
    return;
  end if;

  update public.wallets w set balance = w.balance - p_cost where w.email = p_email;
  insert into public.unlocks (email, token) values (p_email, p_token)
    on conflict (email, token) do nothing;
  return query select true, cur - p_cost;
end; $$;

-- =====================================================================
-- Catatan keamanan (opsional):
--   Server memakai SERVICE ROLE key yang mem-bypass RLS, jadi app tetap jalan
--   walau RLS diaktifkan. Kalau mau menutup akses publik via anon key:
--     alter table public.app_data enable row level security;
--     alter table public.dramas   enable row level security;
--     alter table public.likes    enable row level security;
--     alter table public.wallets  enable row level security;
--     alter table public.unlocks  enable row level security;
-- =====================================================================

-- ========================= 2) DATA ==========================

-- dramas: 21 baris
insert into public.dramas ("id", "title", "category", "episodes", "views", "synopsis", "gradient", "poster_image", "hero_image", "hero_dim", "exclusive", "premium", "subtitles", "sort_index", "created_at")
select "id", "title", "category", "episodes", "views", "synopsis", "gradient", "poster_image", "hero_image", "hero_dim", "exclusive", "premium", "subtitles", "sort_index", "created_at"
from jsonb_populate_recordset(null::public.dramas, $MIG$[{"id":"ahli-bela-diri-terkuat-mengguncang-keluarga-besar","title":"Ahli Bela Diri Terkuat Mengguncang Keluarga Besar","category":"Action","episodes":57,"views":"1.0K","synopsis":"Seorang ahli bela diri legendaris akhirnya turun gunung setelah bertahun-tahun berlatih dalam pengasingan. Demi memenuhi janji lama gurunya, ia terpaksa menikah dengan putri dari keluarga kaya yang sedang berada di ambang kehancuran. Awalnya seluruh keluarga besar meremehkannya karena penampilannya yang sederhana, namun semuanya berubah ketika satu per satu rahasia gelap keluarga mulai terungkap dan para musuh berbahaya datang menyerang. Tak ada yang menyangka bahwa menantu yang mereka hina ternyata adalah pendekar terkuat yang mampu mengguncang seluruh kota.","gradient":"from-indigo-700 via-purple-800 to-slate-900","poster_image":"https://i.imgur.com/r8VrIeT.jpeg","hero_image":"https://i.imgur.com/r8VrIeT.jpeg","hero_dim":false,"exclusive":false,"premium":false,"subtitles":[],"sort_index":7,"created_at":"2026-06-17T08:41:11.082859+00:00"},{"id":"back-to-fix-my-marriage","title":"Kembali Memperbaiki Pernikahanku","category":"Time Travel","episodes":72,"views":"2.1M","synopsis":"Setelah perceraian menyakitkan, ia bangun kembali ke hari pernikahannya. Kali ini ia akan melakukannya dengan benar.","gradient":"from-violet-600 via-indigo-800 to-blue-950","poster_image":null,"hero_image":null,"hero_dim":false,"exclusive":false,"premium":false,"subtitles":[],"sort_index":17,"created_at":"2026-06-17T08:41:11.082859+00:00"},{"id":"billionaire-husband-pretend-poor","title":"Suami Miliuner Pura-Pura Miskin","category":"Tycoon","episodes":95,"views":"6.3M","synopsis":"Setiap orang menertawakannya karena menikahi pria 'pengangguran'. Padahal suaminya pemilik separuh kota.","gradient":"from-amber-600 via-orange-700 to-red-900","poster_image":null,"hero_image":null,"hero_dim":false,"exclusive":true,"premium":false,"subtitles":[],"sort_index":20,"created_at":"2026-06-17T08:41:11.082859+00:00"},{"id":"bodyguard-terkuat-penjaga-putri-miliarder","title":"Bodyguard Misterius Sang Putri Miliarder","category":"Action","episodes":50,"views":"1.0K","synopsis":"Seorang bodyguard legendaris yang dikenal tak pernah gagal menjalankan misi menerima tugas paling berbahaya dalam hidupnya: melindungi putri tunggal keluarga miliarder yang terus menjadi target penculikan dan pembunuhan. Di balik sikap dingin dan kerasnya, sang bodyguard diam-diam selalu menjaga gadis itu dari berbagai ancaman mematikan yang datang dari musuh keluarga, mafia, hingga pengkhianat di dalam perusahaan sendiri. Namun semakin lama bersama, hubungan profesional mereka perlahan berubah menjadi ikatan yang lebih dalam, sementara rahasia besar tentang identitas asli sang bodyguard mulai terungkap dan mengguncang kehidupan sang putri miliarder.","gradient":"from-pink-600 via-rose-700 to-red-900","poster_image":"https://i.imgur.com/8AfhFMI.jpeg","hero_image":"https://i.imgur.com/8AfhFMI.jpeg","hero_dim":false,"exclusive":false,"premium":false,"subtitles":[],"sort_index":4,"created_at":"2026-06-17T08:41:11.082859+00:00"},{"id":"ceo-miliarder-kembali-ke-desa-demi-gadis-sederhana","title":"CEO Miliarder Kembali ke Desa Demi Gadis Sederhana!","category":"Romance","episodes":52,"views":"1.0K","synopsis":"Setelah bertahun-tahun menghilang dan membangun kerajaan bisnisnya hingga menjadi miliarder muda paling berpengaruh, seorang CEO tampan tiba-tiba kembali ke desa kecil tempat masa lalunya dimulai. Semua orang mengira ia datang untuk balas dendam pada mereka yang pernah meremehkannya, namun ternyata hatinya hanya tertuju pada satu gadis sederhana yang dulu selalu menemaninya saat ia belum memiliki apa-apa. Di tengah perbedaan status, rahasia keluarga, dan intrik para pesaing yang ingin memisahkan mereka, cinta lama yang sempat hilang kembali tumbuh dengan cara yang tak terduga.","gradient":"from-indigo-700 via-purple-800 to-slate-900","poster_image":"https://i.imgur.com/RmHmd4P.jpeg","hero_image":"https://i.imgur.com/g1dn1LX.jpeg","hero_dim":false,"exclusive":false,"premium":false,"subtitles":[],"sort_index":12,"created_at":"2026-06-17T08:41:11.082859+00:00"},{"id":"comedy-king-system","title":"Sistem Raja Komedi","category":"Comedy","episodes":55,"views":"780K","synopsis":"Pemuda kuper mendapat sistem yang memaksanya melawak. Dari nol jadi raja panggung dalam semalam.","gradient":"from-yellow-500 via-amber-700 to-orange-900","poster_image":null,"hero_image":null,"hero_dim":false,"exclusive":false,"premium":false,"subtitles":[],"sort_index":19,"created_at":"2026-06-17T08:41:11.082859+00:00"},{"id":"demi-selamatkan-ceo-satpam-ini-mendapat-kekuatan-dewa","title":"Demi Selamatkan CEO, Satpam Ini Mendapat Kekuatan Dewa","category":"Action","episodes":81,"views":"1.0K","synopsis":"Seorang satpam sederhana rela mempertaruhkan nyawanya demi menyelamatkan CEO cantik dari serangan misterius. Namun setelah tersambar listrik saat melindunginya, hidupnya berubah total ketika ia tiba-tiba memperoleh kekuatan luar biasa yang membuatnya mampu menghentikan waktu, menembus benda, dan mengalahkan musuh dengan mudah. Di tengah kekuatan barunya yang semakin tak terkendali, ia harus menghadapi organisasi rahasia berbahaya yang mengincar dirinya dan sang CEO, sementara hubungan mereka perlahan berubah menjadi cinta yang tak terduga.","gradient":"from-indigo-700 via-purple-800 to-slate-900","poster_image":"https://i.imgur.com/g1zf0ZW.jpeg","hero_image":"https://i.imgur.com/g1zf0ZW.jpeg","hero_dim":false,"exclusive":false,"premium":false,"subtitles":[],"sort_index":6,"created_at":"2026-06-17T08:41:11.082859+00:00"},{"id":"diculik-tulang-naga-dipenjara-3-tahun-kini-kaisar-obat-dan-darah-naga-sejati-kembali","title":"Diculik Tulang Naga - Dipenjara 3 Tahun. Kini, Kaisar Obat dan Darah Naga Sejati Kembali!","category":"Action","episodes":26,"views":"1.0K","synopsis":"","gradient":"from-indigo-700 via-purple-800 to-slate-900","poster_image":"https://i.imgur.com/pH1OidN.jpeg","hero_image":"https://i.imgur.com/pH1OidN.jpeg","hero_dim":false,"exclusive":false,"premium":false,"subtitles":[],"sort_index":10,"created_at":"2026-06-17T08:41:11.082859+00:00"},{"id":"from-nobody-to-business-legend","title":"Putry Ajaib Yang Diadopsi","category":"Fantasy","episodes":2,"views":"2.6M","synopsis":"Seorang gadis kecil dengan kekuatan ajaib diadopsi oleh keluarga mewah. Di tengah rahasia keluarga dan kekuatan misterius dalam dirinya, ia harus belajar siapa dirinya yang sebenarnya.","gradient":"from-yellow-600 via-orange-800 to-red-950","poster_image":"/posters/from-nobody-to-business-legend.png","hero_image":null,"hero_dim":false,"exclusive":false,"premium":false,"subtitles":[],"sort_index":16,"created_at":"2026-06-17T08:41:11.082859+00:00"},{"id":"gadis-ini-tak-menyangka-suaminya-adalah-ceo","title":"Gadis Ini Tak Menyangka Suaminya Adalah CEO jadikan","category":"Romance","episodes":62,"views":"1.0K","synopsis":"Seorang gadis sederhana tidak pernah menyangka bahwa pria yang selama ini hidup bersamanya dengan penuh kesederhanaan ternyata adalah seorang CEO kaya dan berpengaruh.","gradient":"from-stone-600 via-zinc-800 to-black","poster_image":"https://i.imgur.com/RIsNMXG.png","hero_image":"https://i.imgur.com/RIsNMXG.png","hero_dim":false,"exclusive":false,"premium":false,"subtitles":[],"sort_index":14,"created_at":"2026-06-17T08:41:11.082859+00:00"},{"id":"guru-misterius-membentuk-pasukan-rahasia","title":"Guru Misterius Membentuk Pasukan Rahasia","category":"Action","episodes":55,"views":"1.0K","synopsis":"Seorang guru misterius dengan masa lalu yang penuh rahasia ditugaskan mengajar di sekolah yang terkenal karena para muridnya yang suka membuat kerusuhan. Alih-alih menghukum mereka, ia memilih melatih sekelompok siswa paling bermasalah menjadi sebuah tim rahasia yang disiplin, tangguh, dan tak terkalahkan. Metode pendidikannya yang keras membuat pihak sekolah menganggapnya gila, tetapi perlahan para murid yang dulu dianggap sampah masyarakat mulai menunjukkan bakat luar biasa.","gradient":"from-fuchsia-700 via-rose-800 to-stone-900","poster_image":"https://i.imgur.com/lXpWiTp.jpeg","hero_image":"https://i.imgur.com/lXpWiTp.jpeg","hero_dim":true,"exclusive":false,"premium":false,"subtitles":[],"sort_index":0,"created_at":"2026-06-17T08:41:11.082859+00:00"},{"id":"istri-tersembunyi-sang-ceo","title":"Istri Tersembunyi Sang CEO","category":"Romance","episodes":1,"views":"1.0K","synopsis":"Istri Tersembunyi Sang CEO mengisahkan Alina, wanita sederhana yang diam-diam menikah kontrak dengan Arsen, CEO muda paling berpengaruh di kota, demi menyelamatkan perusahaan keluarganya.","gradient":"from-red-600 via-rose-800 to-purple-950","poster_image":"/posters/istri-tersembunyi-sang-ceo.png","hero_image":null,"hero_dim":false,"exclusive":false,"premium":false,"subtitles":[],"sort_index":15,"created_at":"2026-06-17T08:41:11.082859+00:00"},{"id":"miss-substitute-bride","title":"Nona Pengganti Pengantin","category":"Romance","episodes":88,"views":"3.7M","synopsis":"Demi melindungi kakaknya, ia menggantikan posisi sebagai pengantin. Tak disangka, suaminya adalah pria paling berbahaya di kota.","gradient":"from-red-600 via-rose-800 to-purple-950","poster_image":null,"hero_image":null,"hero_dim":false,"exclusive":false,"premium":false,"subtitles":[],"sort_index":18,"created_at":"2026-06-17T08:41:11.082859+00:00"},{"id":"permaisuri-bangkit-di-dunia-modern","title":"Permaisuri Bangkit di Dunia Modern","category":"Tycoon","episodes":62,"views":"1.0K","synopsis":"Seorang permaisuri cerdas dari kerajaan kuno tiba-tiba terbangun di dunia modern dalam tubuh seorang gadis miskin yang ternyata adalah putri tertukar keluarga kaya raya. Di tengah penghinaan dan perebutan warisan, ia menggunakan kecerdasan, strategi istana, dan cara liciknya menghadapi para musuh yang mencoba menjatuhkannya. Tak hanya berhasil membalikkan keadaan dan merebut kembali kekuasaan keluarga, ia juga bertemu seorang pria dingin dan berpengaruh yang perlahan jatuh cinta pada pesonanya yang berbeda dari wanita modern lainnya.","gradient":"from-emerald-600 via-teal-800 to-slate-900","poster_image":"https://i.imgur.com/1LFkE2u.jpeg","hero_image":"https://i.imgur.com/1LFkE2u.jpeg","hero_dim":false,"exclusive":false,"premium":false,"subtitles":[],"sort_index":5,"created_at":"2026-06-17T08:41:11.082859+00:00"},{"id":"pria-miskin-dengan-kekuatan-mata-dewa","title":"Pria Miskin Dengan Kekuatan Mata Dewa","category":"Action","episodes":37,"views":"1.0K","synopsis":"Seorang pria miskin yang hidupnya selalu dihina tanpa sengaja menantang dewa karena merasa takdirnya begitu tidak adil. Namun setelah sebuah kejadian aneh, ia tiba-tiba memperoleh mata ajaib yang mampu melihat nilai asli setiap benda, mulai dari barang antik murah hingga harta tersembunyi bernilai miliaran.","gradient":"from-emerald-600 via-teal-800 to-slate-900","poster_image":"https://i.imgur.com/oBIK8jb.jpeg","hero_image":"https://i.imgur.com/oBIK8jb.jpeg","hero_dim":false,"exclusive":false,"premium":false,"subtitles":[],"sort_index":1,"created_at":"2026-06-17T08:41:11.082859+00:00"},{"id":"reinkarnasi-putri-kerajaan-di-keluarga-berandalan","title":"Reinkarnasi Putri Kerajaan di Keluarga Berandalan","category":"Action","episodes":53,"views":"1.0K","synopsis":"Seorang putri kerajaan dari masa lalu terlahir kembali di dunia modern sebagai anak dari seorang berandalan miskin yang hidupnya penuh kekacauan. Meski tumbuh di lingkungan keras dan diremehkan banyak orang, ingatan kehidupan masa lalunya membuat gadis kecil itu memiliki kecerdasan dan wibawa luar biasa.","gradient":"from-indigo-700 via-purple-800 to-slate-900","poster_image":"https://i.imgur.com/9zuSKyb.jpeg","hero_image":"https://i.imgur.com/9zuSKyb.jpeg","hero_dim":false,"exclusive":false,"premium":false,"subtitles":[],"sort_index":2,"created_at":"2026-06-17T08:41:11.082859+00:00"},{"id":"saint-resmi-jadi-pengawal-pribadi-ceo-cantik","title":"Saint Menjadi Pengawal Pribadi CEO Cantik","category":"Romance","episodes":47,"views":"1.0K","synopsis":"Seorang saint legendaris yang selama ini hidup dalam bayang-bayang dunia gelap akhirnya menerima tugas tak biasa: menjadi pengawal pribadi seorang CEO cantik dan dingin yang sedang diburu banyak musuh berbahaya. Awalnya hubungan mereka penuh pertengkaran karena sang CEO menganggap pria itu hanyalah pengawal biasa, tanpa mengetahui identitas aslinya yang sangat ditakuti di dunia bawah tanah. Namun seiring berbagai ancaman mematikan datang silih berganti, keduanya mulai saling percaya dan benih-benih cinta perlahan tumbuh di tengah rahasia besar, perebutan kekuasaan, dan masa lalu kelam yang siap menghancurkan mereka kapan saja.","gradient":"from-amber-600 via-orange-800 to-red-950","poster_image":"https://i.imgur.com/K0MKTwi.png","hero_image":"https://i.imgur.com/K0MKTwi.png","hero_dim":false,"exclusive":false,"premium":false,"subtitles":[],"sort_index":13,"created_at":"2026-06-17T08:41:11.082859+00:00"},{"id":"sistem-memaksaku-menaklukkan-3-istri-cantik-tapi-mereka-mala","title":"Sistem Memaksaku Menaklukkan 3 Istri Cantik! Tapi Mereka Malah Membenciku!","category":"Romance","episodes":55,"views":"1.0K","synopsis":"Seorang pria biasa tiba-tiba terbangun di dunia baru dan dipaksa menjalani misi aneh dari sebuah sistem misterius: membuat tiga istrinya jatuh cinta padanya sebelum waktu habis. Masalahnya, ketiga wanita cantik itu justru membencinya karena masa lalunya yang buruk dan penuh rahasia. Demi bertahan hidup, ia harus perlahan mengubah dirinya, melindungi mereka dari bahaya, dan memenangkan hati masing-masing istri dengan cara yang tak terduga. Namun di balik semua itu, tersimpan konspirasi besar yang bisa menghancurkan mereka semua.","gradient":"from-indigo-700 via-purple-800 to-slate-900","poster_image":"https://i.imgur.com/x8dg05e.jpeg","hero_image":"https://i.imgur.com/x8dg05e.jpeg","hero_dim":false,"exclusive":false,"premium":false,"subtitles":[],"sort_index":11,"created_at":"2026-06-17T08:41:11.082859+00:00"},{"id":"tak-ada-yang-bisa-mendekati-sang-ceo-sampai-gadis-ini-datang","title":"Tak Ada yang Bisa Mendekati Sang CEO, Sampai Gadis Ini Datang","category":"Romance","episodes":102,"views":"1.0K","synopsis":"Dikenal sebagai CEO paling dingin dan sulit didekati di kota, Adrian selalu membuat semua orang menjaga jarak karena sikapnya yang tegas dan tanpa perasaan. Tak ada satu pun wanita yang mampu menembus hatinya, hingga suatu hari ia bertemu dengan seorang gadis sederhana yang berani melawannya tanpa rasa takut. Pertemuan tak terduga itu perlahan mengubah kehidupan sang CEO, sementara rahasia besar dan masa lalu kelam mulai terungkap di antara mereka. Di tengah konflik, cinta, dan intrik dunia bisnis, keduanya harus menghadapi pilihan yang bisa mengubah hidup mereka selamanya.","gradient":"from-stone-600 via-zinc-800 to-black","poster_image":"https://i.imgur.com/IVBpxIG.png","hero_image":"https://i.imgur.com/IVBpxIG.png","hero_dim":false,"exclusive":false,"premium":false,"subtitles":[],"sort_index":9,"created_at":"2026-06-17T08:41:11.082859+00:00"},{"id":"takdir-membawaku-ke-jalan-keabadian","title":"Takdir Membawaku Ke Jalan Keabadian!","category":"Action","episodes":62,"views":"1.0K","synopsis":"Sejak kecil hidupnya penuh hinaan dan penderitaan karena dianggap tidak memiliki bakat kultivasi sedikit pun. Namun sebuah pertemuan takdir membawanya menemukan warisan kuno yang membuka jalan menuju keabadian. Dari seorang pemuda biasa yang diremehkan semua orang, ia perlahan bangkit menjadi kultivator kuat dengan kekuatan yang mampu mengguncang langit dan bumi. Di tengah perjalanan penuh bahaya, pengkhianatan, dan pertarungan mematikan, ia harus memilih antara mempertahankan kemanusiaannya atau menjadi penguasa abadi yang ditakuti seluruh dunia.","gradient":"from-stone-600 via-zinc-800 to-black","poster_image":"https://i.imgur.com/4alAQPl.jpeg","hero_image":"https://i.imgur.com/4alAQPl.jpeg","hero_dim":false,"exclusive":false,"premium":false,"subtitles":[],"sort_index":3,"created_at":"2026-06-17T08:41:11.082859+00:00"},{"id":"wanita-rahasia-sang-jenderal","title":"Wanita Rahasia Sang Jenderal","category":"Romance","episodes":82,"views":"1.0K","synopsis":"Semua orang mengira wanita desa yang dinikahi sang jenderal hanyalah istri biasa yang lembut dan tidak berdaya. Namun di balik sikap tenangnya, ia menyimpan kemampuan luar biasa yang bahkan ditakuti para musuh kerajaan. Saat ancaman besar mulai mengincar sang jenderal, identitas asli wanita itu perlahan terungkap sebagai senjata rahasia paling mematikan yang selama ini disembunyikan dari dunia.","gradient":"from-pink-600 via-rose-700 to-red-900","poster_image":"https://i.imgur.com/rMAthDc.png","hero_image":"https://i.imgur.com/rMAthDc.png","hero_dim":false,"exclusive":false,"premium":false,"subtitles":[],"sort_index":8,"created_at":"2026-06-17T08:41:11.082859+00:00"}]$MIG$::jsonb)
on conflict ("id") do nothing;

-- likes: 4 baris
insert into public.likes ("drama_id", "count")
select "drama_id", "count"
from jsonb_populate_recordset(null::public.likes, $MIG$[{"drama_id":"gadis-ini-tak-menyangka-suaminya-adalah-ceo","count":0},{"drama_id":"guru-misterius-membentuk-pasukan-rahasia","count":1},{"drama_id":"the-hitchhiker-s-guide-to-the-galaxy","count":2},{"drama_id":"the-legend-of-aang","count":1}]$MIG$::jsonb)
on conflict ("drama_id") do nothing;

-- wallets: 0 baris (dilewati)

-- unlocks: 0 baris (dilewati)

-- app_data: 1 baris
insert into public.app_data ("key", "value")
select "key", "value"
from jsonb_populate_recordset(null::public.app_data, $MIG$[{"key":"admins","value":{"admins":[{"name":"Admin Utama","email":"admin@dramaku.com","addedAt":"2026-05-06"},{"name":"Raden","email":"mas.radenbagus89@gmail.com","addedAt":"2026-05-30"}]}}]$MIG$::jsonb)
on conflict ("key") do nothing;

-- ====================== 3) VERIFIKASI =======================

-- ===================================================================
-- VERIFIKASI: jumlah baris di tujuan harus cocok baseline di bawah.
-- ===================================================================
select 'dramas' as tabel, count(*) as jumlah from public.dramas
union all select 'likes' as tabel, count(*) as jumlah from public.likes
union all select 'wallets' as tabel, count(*) as jumlah from public.wallets
union all select 'unlocks' as tabel, count(*) as jumlah from public.unlocks
union all select 'app_data' as tabel, count(*) as jumlah from public.app_data
order by tabel;

-- Baseline diharapkan (snapshot sumber 2026-06-17 11:04 UTC):
--   dramas=21  likes=4  wallets=0  unlocks=0  app_data=1
