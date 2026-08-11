-- =====================================================================
-- DramaApp  ->  Supabase (PostgreSQL) import
-- Dihasilkan otomatis dari data/*.json (https://dramaapp.vercel.app/)
-- Cara pakai: buka Supabase -> SQL Editor -> New query -> paste -> Run.
-- Idempoten: aman dijalankan ulang (drop & buat ulang tabel app).
-- =====================================================================

begin;

-- ---------- Skema tabel ----------
drop table if exists public.comments cascade;
drop table if exists public.likes cascade;
drop table if exists public.unlocks cascade;
drop table if exists public.coin_meta cascade;
drop table if exists public.coin_orders cascade;
drop table if exists public.wallets cascade;
drop table if exists public.sponsor_ads cascade;
drop table if exists public.admins cascade;
drop table if exists public.dramas cascade;

create table public.dramas (
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
);

create table public.admins (
  email    text primary key,
  name     text not null,
  added_at date
);

-- Komentar per-drama (terbaru di depan saat di-render oleh app).
create table public.comments (
  id        text primary key,
  drama_id  text not null,
  user_name text not null,
  email     text,
  role      text check (role in ('admin','viewer')),
  text      text not null,
  time      text
);
create index comments_drama_id_idx on public.comments (drama_id);

-- Jumlah like per drama (tanpa FK: bisa berisi id lama yang sudah tak ada).
create table public.likes (
  drama_id text primary key,
  count    integer not null default 0
);

-- Dompet koin per user (kunci = email, huruf kecil).
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
);

-- Iklan sponsor (house ads) yang dikelola admin.
create table public.sponsor_ads (
  id        text primary key,
  title     text,
  image_url text not null,
  link_url  text not null,
  views     integer not null default 0,
  clicks    integer not null default 0,
  added_at  date
);

-- ---------- Data: dramas ----------
insert into public.dramas (id, title, category, episodes, views, synopsis, gradient, poster_image, hero_image, hero_dim, exclusive, premium, subtitles) values ('guru-misterius-membentuk-pasukan-rahasia', 'Guru Misterius Membentuk Pasukan Rahasia', 'Action', 55, '1.0K', 'Seorang guru misterius dengan masa lalu yang penuh rahasia ditugaskan mengajar di sekolah yang terkenal karena para muridnya yang suka membuat kerusuhan. Alih-alih menghukum mereka, ia memilih melatih sekelompok siswa paling bermasalah menjadi sebuah tim rahasia yang disiplin, tangguh, dan tak terkalahkan. Metode pendidikannya yang keras membuat pihak sekolah menganggapnya gila, tetapi perlahan para murid yang dulu dianggap sampah masyarakat mulai menunjukkan bakat luar biasa.', 'from-fuchsia-700 via-rose-800 to-stone-900', 'https://i.imgur.com/lXpWiTp.jpeg', 'https://i.imgur.com/lXpWiTp.jpeg', true, false, false, '{}');
insert into public.dramas (id, title, category, episodes, views, synopsis, gradient, poster_image, hero_image, hero_dim, exclusive, premium, subtitles) values ('pria-miskin-dengan-kekuatan-mata-dewa', 'Pria Miskin Dengan Kekuatan Mata Dewa', 'Action', 37, '1.0K', 'Seorang pria miskin yang hidupnya selalu dihina tanpa sengaja menantang dewa karena merasa takdirnya begitu tidak adil. Namun setelah sebuah kejadian aneh, ia tiba-tiba memperoleh mata ajaib yang mampu melihat nilai asli setiap benda, mulai dari barang antik murah hingga harta tersembunyi bernilai miliaran.', 'from-emerald-600 via-teal-800 to-slate-900', 'https://i.imgur.com/oBIK8jb.jpeg', 'https://i.imgur.com/oBIK8jb.jpeg', false, false, false, '{}');
insert into public.dramas (id, title, category, episodes, views, synopsis, gradient, poster_image, hero_image, hero_dim, exclusive, premium, subtitles) values ('reinkarnasi-putri-kerajaan-di-keluarga-berandalan', 'Reinkarnasi Putri Kerajaan di Keluarga Berandalan', 'Action', 53, '1.0K', 'Seorang putri kerajaan dari masa lalu terlahir kembali di dunia modern sebagai anak dari seorang berandalan miskin yang hidupnya penuh kekacauan. Meski tumbuh di lingkungan keras dan diremehkan banyak orang, ingatan kehidupan masa lalunya membuat gadis kecil itu memiliki kecerdasan dan wibawa luar biasa.', 'from-indigo-700 via-purple-800 to-slate-900', 'https://i.imgur.com/9zuSKyb.jpeg', 'https://i.imgur.com/9zuSKyb.jpeg', false, false, false, '{}');
insert into public.dramas (id, title, category, episodes, views, synopsis, gradient, poster_image, hero_image, hero_dim, exclusive, premium, subtitles) values ('takdir-membawaku-ke-jalan-keabadian', 'Takdir Membawaku Ke Jalan Keabadian!', 'Action', 62, '1.0K', 'Sejak kecil hidupnya penuh hinaan dan penderitaan karena dianggap tidak memiliki bakat kultivasi sedikit pun. Namun sebuah pertemuan takdir membawanya menemukan warisan kuno yang membuka jalan menuju keabadian. Dari seorang pemuda biasa yang diremehkan semua orang, ia perlahan bangkit menjadi kultivator kuat dengan kekuatan yang mampu mengguncang langit dan bumi. Di tengah perjalanan penuh bahaya, pengkhianatan, dan pertarungan mematikan, ia harus memilih antara mempertahankan kemanusiaannya atau menjadi penguasa abadi yang ditakuti seluruh dunia.', 'from-stone-600 via-zinc-800 to-black', 'https://i.imgur.com/4alAQPl.jpeg', 'https://i.imgur.com/4alAQPl.jpeg', false, false, false, '{}');
insert into public.dramas (id, title, category, episodes, views, synopsis, gradient, poster_image, hero_image, hero_dim, exclusive, premium, subtitles) values ('bodyguard-terkuat-penjaga-putri-miliarder', 'Bodyguard Misterius Sang Putri Miliarder', 'Action', 50, '1.0K', 'Seorang bodyguard legendaris yang dikenal tak pernah gagal menjalankan misi menerima tugas paling berbahaya dalam hidupnya: melindungi putri tunggal keluarga miliarder yang terus menjadi target penculikan dan pembunuhan. Di balik sikap dingin dan kerasnya, sang bodyguard diam-diam selalu menjaga gadis itu dari berbagai ancaman mematikan yang datang dari musuh keluarga, mafia, hingga pengkhianat di dalam perusahaan sendiri. Namun semakin lama bersama, hubungan profesional mereka perlahan berubah menjadi ikatan yang lebih dalam, sementara rahasia besar tentang identitas asli sang bodyguard mulai terungkap dan mengguncang kehidupan sang putri miliarder.', 'from-pink-600 via-rose-700 to-red-900', 'https://i.imgur.com/8AfhFMI.jpeg', 'https://i.imgur.com/8AfhFMI.jpeg', false, false, false, '{}');
insert into public.dramas (id, title, category, episodes, views, synopsis, gradient, poster_image, hero_image, hero_dim, exclusive, premium, subtitles) values ('permaisuri-bangkit-di-dunia-modern', 'Permaisuri Bangkit di Dunia Modern', 'Tycoon', 62, '1.0K', 'Seorang permaisuri cerdas dari kerajaan kuno tiba-tiba terbangun di dunia modern dalam tubuh seorang gadis miskin yang ternyata adalah putri tertukar keluarga kaya raya. Di tengah penghinaan dan perebutan warisan, ia menggunakan kecerdasan, strategi istana, dan cara liciknya menghadapi para musuh yang mencoba menjatuhkannya. Tak hanya berhasil membalikkan keadaan dan merebut kembali kekuasaan keluarga, ia juga bertemu seorang pria dingin dan berpengaruh yang perlahan jatuh cinta pada pesonanya yang berbeda dari wanita modern lainnya.', 'from-emerald-600 via-teal-800 to-slate-900', 'https://i.imgur.com/1LFkE2u.jpeg', 'https://i.imgur.com/1LFkE2u.jpeg', false, false, false, '{}');
insert into public.dramas (id, title, category, episodes, views, synopsis, gradient, poster_image, hero_image, hero_dim, exclusive, premium, subtitles) values ('demi-selamatkan-ceo-satpam-ini-mendapat-kekuatan-dewa', 'Demi Selamatkan CEO, Satpam Ini Mendapat Kekuatan Dewa', 'Action', 81, '1.0K', 'Seorang satpam sederhana rela mempertaruhkan nyawanya demi menyelamatkan CEO cantik dari serangan misterius. Namun setelah tersambar listrik saat melindunginya, hidupnya berubah total ketika ia tiba-tiba memperoleh kekuatan luar biasa yang membuatnya mampu menghentikan waktu, menembus benda, dan mengalahkan musuh dengan mudah. Di tengah kekuatan barunya yang semakin tak terkendali, ia harus menghadapi organisasi rahasia berbahaya yang mengincar dirinya dan sang CEO, sementara hubungan mereka perlahan berubah menjadi cinta yang tak terduga.', 'from-indigo-700 via-purple-800 to-slate-900', 'https://i.imgur.com/g1zf0ZW.jpeg', 'https://i.imgur.com/g1zf0ZW.jpeg', false, false, false, '{}');
insert into public.dramas (id, title, category, episodes, views, synopsis, gradient, poster_image, hero_image, hero_dim, exclusive, premium, subtitles) values ('ahli-bela-diri-terkuat-mengguncang-keluarga-besar', 'Ahli Bela Diri Terkuat Mengguncang Keluarga Besar', 'Action', 57, '1.0K', 'Seorang ahli bela diri legendaris akhirnya turun gunung setelah bertahun-tahun berlatih dalam pengasingan. Demi memenuhi janji lama gurunya, ia terpaksa menikah dengan putri dari keluarga kaya yang sedang berada di ambang kehancuran. Awalnya seluruh keluarga besar meremehkannya karena penampilannya yang sederhana, namun semuanya berubah ketika satu per satu rahasia gelap keluarga mulai terungkap dan para musuh berbahaya datang menyerang. Tak ada yang menyangka bahwa menantu yang mereka hina ternyata adalah pendekar terkuat yang mampu mengguncang seluruh kota.', 'from-indigo-700 via-purple-800 to-slate-900', 'https://i.imgur.com/r8VrIeT.jpeg', 'https://i.imgur.com/r8VrIeT.jpeg', false, false, false, '{}');
insert into public.dramas (id, title, category, episodes, views, synopsis, gradient, poster_image, hero_image, hero_dim, exclusive, premium, subtitles) values ('wanita-rahasia-sang-jenderal', 'Wanita Rahasia Sang Jenderal', 'Romance', 82, '1.0K', 'Semua orang mengira wanita desa yang dinikahi sang jenderal hanyalah istri biasa yang lembut dan tidak berdaya. Namun di balik sikap tenangnya, ia menyimpan kemampuan luar biasa yang bahkan ditakuti para musuh kerajaan. Saat ancaman besar mulai mengincar sang jenderal, identitas asli wanita itu perlahan terungkap sebagai senjata rahasia paling mematikan yang selama ini disembunyikan dari dunia.', 'from-pink-600 via-rose-700 to-red-900', 'https://i.imgur.com/rMAthDc.png', 'https://i.imgur.com/rMAthDc.png', false, false, false, '{}');
insert into public.dramas (id, title, category, episodes, views, synopsis, gradient, poster_image, hero_image, hero_dim, exclusive, premium, subtitles) values ('tak-ada-yang-bisa-mendekati-sang-ceo-sampai-gadis-ini-datang', 'Tak Ada yang Bisa Mendekati Sang CEO, Sampai Gadis Ini Datang', 'Romance', 102, '1.0K', 'Dikenal sebagai CEO paling dingin dan sulit didekati di kota, Adrian selalu membuat semua orang menjaga jarak karena sikapnya yang tegas dan tanpa perasaan. Tak ada satu pun wanita yang mampu menembus hatinya, hingga suatu hari ia bertemu dengan seorang gadis sederhana yang berani melawannya tanpa rasa takut. Pertemuan tak terduga itu perlahan mengubah kehidupan sang CEO, sementara rahasia besar dan masa lalu kelam mulai terungkap di antara mereka. Di tengah konflik, cinta, dan intrik dunia bisnis, keduanya harus menghadapi pilihan yang bisa mengubah hidup mereka selamanya.', 'from-stone-600 via-zinc-800 to-black', 'https://i.imgur.com/IVBpxIG.png', 'https://i.imgur.com/IVBpxIG.png', false, false, false, '{}');
insert into public.dramas (id, title, category, episodes, views, synopsis, gradient, poster_image, hero_image, hero_dim, exclusive, premium, subtitles) values ('diculik-tulang-naga-dipenjara-3-tahun-kini-kaisar-obat-dan-darah-naga-sejati-kembali', 'Diculik Tulang Naga - Dipenjara 3 Tahun. Kini, Kaisar Obat dan Darah Naga Sejati Kembali!', 'Action', 26, '1.0K', '', 'from-indigo-700 via-purple-800 to-slate-900', 'https://i.imgur.com/pH1OidN.jpeg', 'https://i.imgur.com/pH1OidN.jpeg', false, false, false, '{}');
insert into public.dramas (id, title, category, episodes, views, synopsis, gradient, poster_image, hero_image, hero_dim, exclusive, premium, subtitles) values ('sistem-memaksaku-menaklukkan-3-istri-cantik-tapi-mereka-mala', 'Sistem Memaksaku Menaklukkan 3 Istri Cantik! Tapi Mereka Malah Membenciku!', 'Romance', 55, '1.0K', 'Seorang pria biasa tiba-tiba terbangun di dunia baru dan dipaksa menjalani misi aneh dari sebuah sistem misterius: membuat tiga istrinya jatuh cinta padanya sebelum waktu habis. Masalahnya, ketiga wanita cantik itu justru membencinya karena masa lalunya yang buruk dan penuh rahasia. Demi bertahan hidup, ia harus perlahan mengubah dirinya, melindungi mereka dari bahaya, dan memenangkan hati masing-masing istri dengan cara yang tak terduga. Namun di balik semua itu, tersimpan konspirasi besar yang bisa menghancurkan mereka semua.', 'from-indigo-700 via-purple-800 to-slate-900', 'https://i.imgur.com/x8dg05e.jpeg', 'https://i.imgur.com/x8dg05e.jpeg', false, false, false, '{}');
insert into public.dramas (id, title, category, episodes, views, synopsis, gradient, poster_image, hero_image, hero_dim, exclusive, premium, subtitles) values ('ceo-miliarder-kembali-ke-desa-demi-gadis-sederhana', 'CEO Miliarder Kembali ke Desa Demi Gadis Sederhana!', 'Romance', 52, '1.0K', 'Setelah bertahun-tahun menghilang dan membangun kerajaan bisnisnya hingga menjadi miliarder muda paling berpengaruh, seorang CEO tampan tiba-tiba kembali ke desa kecil tempat masa lalunya dimulai. Semua orang mengira ia datang untuk balas dendam pada mereka yang pernah meremehkannya, namun ternyata hatinya hanya tertuju pada satu gadis sederhana yang dulu selalu menemaninya saat ia belum memiliki apa-apa. Di tengah perbedaan status, rahasia keluarga, dan intrik para pesaing yang ingin memisahkan mereka, cinta lama yang sempat hilang kembali tumbuh dengan cara yang tak terduga.', 'from-indigo-700 via-purple-800 to-slate-900', 'https://i.imgur.com/RmHmd4P.jpeg', 'https://i.imgur.com/g1dn1LX.jpeg', false, false, false, '{}');
insert into public.dramas (id, title, category, episodes, views, synopsis, gradient, poster_image, hero_image, hero_dim, exclusive, premium, subtitles) values ('saint-resmi-jadi-pengawal-pribadi-ceo-cantik', 'Saint Menjadi Pengawal Pribadi CEO Cantik', 'Romance', 47, '1.0K', 'Seorang saint legendaris yang selama ini hidup dalam bayang-bayang dunia gelap akhirnya menerima tugas tak biasa: menjadi pengawal pribadi seorang CEO cantik dan dingin yang sedang diburu banyak musuh berbahaya. Awalnya hubungan mereka penuh pertengkaran karena sang CEO menganggap pria itu hanyalah pengawal biasa, tanpa mengetahui identitas aslinya yang sangat ditakuti di dunia bawah tanah. Namun seiring berbagai ancaman mematikan datang silih berganti, keduanya mulai saling percaya dan benih-benih cinta perlahan tumbuh di tengah rahasia besar, perebutan kekuasaan, dan masa lalu kelam yang siap menghancurkan mereka kapan saja.', 'from-amber-600 via-orange-800 to-red-950', 'https://i.imgur.com/K0MKTwi.png', 'https://i.imgur.com/K0MKTwi.png', false, false, false, '{}');
insert into public.dramas (id, title, category, episodes, views, synopsis, gradient, poster_image, hero_image, hero_dim, exclusive, premium, subtitles) values ('gadis-ini-tak-menyangka-suaminya-adalah-ceo', 'Gadis Ini Tak Menyangka Suaminya Adalah CEO jadikan', 'Romance', 62, '1.0K', 'Seorang gadis sederhana tidak pernah menyangka bahwa pria yang selama ini hidup bersamanya dengan penuh kesederhanaan ternyata adalah seorang CEO kaya dan berpengaruh.', 'from-stone-600 via-zinc-800 to-black', 'https://i.imgur.com/RIsNMXG.png', 'https://i.imgur.com/RIsNMXG.png', false, false, false, '{}');
insert into public.dramas (id, title, category, episodes, views, synopsis, gradient, poster_image, hero_image, hero_dim, exclusive, premium, subtitles) values ('istri-tersembunyi-sang-ceo', 'Istri Tersembunyi Sang CEO', 'Romance', 1, '1.0K', 'Istri Tersembunyi Sang CEO mengisahkan Alina, wanita sederhana yang diam-diam menikah kontrak dengan Arsen, CEO muda paling berpengaruh di kota, demi menyelamatkan perusahaan keluarganya.', 'from-red-600 via-rose-800 to-purple-950', '/posters/istri-tersembunyi-sang-ceo.png', null, false, false, false, '{}');
insert into public.dramas (id, title, category, episodes, views, synopsis, gradient, poster_image, hero_image, hero_dim, exclusive, premium, subtitles) values ('from-nobody-to-business-legend', 'Putry Ajaib Yang Diadopsi', 'Fantasy', 2, '2.6M', 'Seorang gadis kecil dengan kekuatan ajaib diadopsi oleh keluarga mewah. Di tengah rahasia keluarga dan kekuatan misterius dalam dirinya, ia harus belajar siapa dirinya yang sebenarnya.', 'from-yellow-600 via-orange-800 to-red-950', '/posters/from-nobody-to-business-legend.png', null, false, false, false, '{}');
insert into public.dramas (id, title, category, episodes, views, synopsis, gradient, poster_image, hero_image, hero_dim, exclusive, premium, subtitles) values ('back-to-fix-my-marriage', 'Kembali Memperbaiki Pernikahanku', 'Time Travel', 72, '2.1M', 'Setelah perceraian menyakitkan, ia bangun kembali ke hari pernikahannya. Kali ini ia akan melakukannya dengan benar.', 'from-violet-600 via-indigo-800 to-blue-950', null, null, false, false, false, '{}');
insert into public.dramas (id, title, category, episodes, views, synopsis, gradient, poster_image, hero_image, hero_dim, exclusive, premium, subtitles) values ('miss-substitute-bride', 'Nona Pengganti Pengantin', 'Romance', 88, '3.7M', 'Demi melindungi kakaknya, ia menggantikan posisi sebagai pengantin. Tak disangka, suaminya adalah pria paling berbahaya di kota.', 'from-red-600 via-rose-800 to-purple-950', null, null, false, false, false, '{}');
insert into public.dramas (id, title, category, episodes, views, synopsis, gradient, poster_image, hero_image, hero_dim, exclusive, premium, subtitles) values ('comedy-king-system', 'Sistem Raja Komedi', 'Comedy', 55, '780K', 'Pemuda kuper mendapat sistem yang memaksanya melawak. Dari nol jadi raja panggung dalam semalam.', 'from-yellow-500 via-amber-700 to-orange-900', null, null, false, false, false, '{}');
insert into public.dramas (id, title, category, episodes, views, synopsis, gradient, poster_image, hero_image, hero_dim, exclusive, premium, subtitles) values ('billionaire-husband-pretend-poor', 'Suami Miliuner Pura-Pura Miskin', 'Tycoon', 95, '6.3M', 'Setiap orang menertawakannya karena menikahi pria ''pengangguran''. Padahal suaminya pemilik separuh kota.', 'from-amber-600 via-orange-700 to-red-900', null, null, false, true, false, '{}');

-- ---------- Data: admins ----------
insert into public.admins (email, name, added_at) values ('admin@dramaku.com', 'Admin Utama', '2026-05-06');
insert into public.admins (email, name, added_at) values ('mas.radenbagus89@gmail.com', 'Raden', '2026-05-30');

-- ---------- Data: likes ----------
insert into public.likes (drama_id, count) values ('the-hitchhiker-s-guide-to-the-galaxy', 2);
insert into public.likes (drama_id, count) values ('the-legend-of-aang', 1);
insert into public.likes (drama_id, count) values ('gadis-ini-tak-menyangka-suaminya-adalah-ceo', 0);

-- ---------- Data: comments ----------
-- (kosong)

-- ---------- Data: wallets / unlocks / coin_meta ----------
-- (kosong)

-- ---------- Data: sponsor_ads ----------
-- (kosong)

commit;

-- Catatan keamanan (opsional, jalankan jika perlu Row Level Security):
--   alter table public.dramas enable row level security;
--   create policy "dramas baca publik" on public.dramas for select using (true);