# HANDOFF — lanjut di sini

> **Cara pakai:** buka tab chat baru, ketik **`lanjut dari handoff`**.
> AI wajib baca berkas ini **pertama**, lalu `antrean-deploy.md`.
>
> **AI:** tiap kali ada perbaikan / deploy / keputusan — **perbarui berkas ini di langkah terakhir**, sebelum bilang selesai. Jangan tumpuk sejarah panjang di sini; pindahkan yang lama ke `NEXT-SESSION.md`.

**Terakhir diisi:** 2026-08-31 (sore, KOREKSI) — **produksi SEHAT tapi MASIH memakai database LAMA.**
Landing 200 · `/playly` 200 · `/discover` 200 · `/api/teaser` **307 / 0 byte** → tunnel
`interference-positions-style-manufacture.trycloudflare.com` · redirect diikuti balas **206
`video/mp4` `ftypisom`** (berkas 895 MB) → byte video tetap mengalir langsung tunnel→penonton,
kuota Vercel aman. **Migrasi database BELUM tuntas** — datanya sudah pindah, tapi pintu API-nya
masih terkunci; rinciannya di bagian KOREKSI di bawah. **Jangan ganti env Supabase di Vercel dulu
— situs akan mati.**

## 🖼️ 2026-09-02 (terbaru) — Banner IKLAN: kotak "pas-badan" mengikuti bentuk gambar

Owner mengirim screenshot slot IKLAN di `/beranda`: gambar iklan tampil kecil di tengah, kiri-kanan
lebar dan buram. Minta "sesuai tempatnya, jangan melebihi batas, enak dilihat dan presisi".

**Akar:** `AdCreative.tsx` memakai ambang `WIDE_THRESHOLD = 2.4`. Gambar owner rasionya ±1,9:1 → di
BAWAH ambang → jatuh ke "kartu sinematik" dengan tinggi **dipaku 160 px**, gambar `h-full w-auto` →
lebarnya jadi 160 × 1,9 ≈ **307 px di dalam slot 1232 px**. Sisa ±75% ditutup gambar yang sama
di-blur (`scale-125 object-cover blur-2xl`). Blur itu penutup gejala, bukan solusi.

Owner memilih (dari 3 opsi) **"kotak pas-badan"**: kotak menyusut mengikuti bentuk gambar, gambar
mengisi 100% kotaknya, nol blur. Logo TIDAK disentuh (sudah dicek, rasionya memang aman).

Tiga berkas: `app/components/AdCreative.tsx` (inti — blur dibuang, kotak pakai `aspectRatio` + lebar
`MAX_CARD_H × rasio`) · `app/components/AdBanner.tsx` (bingkai ikut menyusut) ·
`app/components/SponsorAdsManager.tsx` (pratinjau admin + 2 teks petunjuk yang sudah tidak benar lagi).

**⚠️ KONTRAK yang gampang dilanggar (regresi ini SEMPAT terjadi & tertangkap uji):**
`max-w-full` pengaman **TIDAK BOLEH** digabung satu elemen dengan `className` dari pemanggil.
`BerandaRows.tsx:226` mengirim `max-w-7xl` — properti CSS yang SAMA (`max-width`) → tailwind-merge
memenangkan class pemanggil, `max-w-full` hilang **tanpa error apa pun**, `w-fit` kehilangan
pengamannya, bingkai membludak jadi 552 px di layar 390 px. Obatnya: **dua batas → dua elemen**
(pembungkus luar = batas pemanggil, `<a>` bingkai = `w-fit max-w-full`). Sudah ditulis sebagai
komentar di `AdBanner.tsx`.

**Bukti:** `tsc --noEmit` exit 0 · **390 tes lulus** · `next build` sukses (63 halaman) · uji visual
Playwright+Chrome, iklan palsu disuntik lewat route interception, gambar uji berpenanda sudut
TL/TR/BL/BR untuk mendeteksi pemotongan: 3 bentuk × 2 ukuran layar × semua slot →
**`/beranda` 0 masalah dari 24 pemeriksaan** (`isiPenuh=YA`, `dalamBatas=YA`, `blurLatar=0`,
`geserSamping=TIDAK`). Gambar 4:1 **tetap melebar penuh** (1202×302) — tanpa regresi.

**Temuan sampingan, BUKAN dari perubahan ini:** `/drama/[id]` bisa digeser ke samping
(`scrollWidth` 1680 desktop / 1106 HP). Diuji dengan DAN tanpa iklan → angkanya **identik**, jadi
sudah ada sebelumnya. Pelakunya `button.inline-flex shrink-0 …` (baris tombol episode). Belum diperbaiki.

**Sisa opsional:** loncatan kecil saat halaman pertama dimuat masih ada (rasio baru diketahui browser
sesudah gambar terunduh). Penghilang tuntasnya = simpan lebar/tinggi gambar ke data iklan saat admin
menambahkannya (`lib/store.ts` + `app/api/admin/ads/route.ts`). Menunggu owner.

Rincian lengkap: [docs/lintasai/rencana/2026-09-02-banner-iklan-pas-badan.md](./docs/lintasai/rencana/2026-09-02-banner-iklan-pas-badan.md).

**✅ SUDAH TAYANG DI PRODUKSI.** Commit `48a8516`, dual push `origin` + `dramaku` sukses; ketiganya
terverifikasi di `48a8516` lewat `gh api` (baca langsung dari GitHub, bukan percaya pesan "berhasil").

*Bukti tayang (bukan asumsi):* chunk JS produksi `/beranda` disisir sebelum & sesudah deploy —
penanda kode LAMA `scale-125 object-cover blur-2xl` **hilang** dan penanda kode BARU
`w-fit max-w-full overflow-hidden rounded-2xl` **muncul** pada percobaan ke-3 (±40 detik sesudah push).
Iklan dirender di browser (AdBanner fetch `/api/ads` saat mount), jadi HTML halaman TIDAK memuat
markup iklan — memeriksa HTML saja tidak sah sebagai bukti, harus lewat chunk JS-nya.
Cek sehat: `/` `/beranda` `/discover` `/shorts` `/playly` `/profile` semua **200**.

**Setelan ukuran — DISETEL ULANG hari yang sama.** Rilis pertama `MAX_CARD_H = 288`; owner melihat di
produksi dan menilai kelewat besar (578×290, 47% lebar slot). Sekarang **`MAX_CARD_H = 160`** → kartu
**322×162**, 26% lebar slot.

*Kenapa 160:* sebelum banner ini diubah, kartu lama `sm:h-40` = tinggi 160 px dan gambar dirender
**320×160** — ukuran yang sudah lama dilihat owner tanpa keluhan; yang dikeluhkan dulu adalah smear
blur di sekelilingnya. Jadi 160 mengembalikan ukuran familiar, kini terisi penuh.

*Diukur dulu sebelum diubah:* iklan yang benar-benar terpasang diambil dari `GET /api/ads` produksi →
`https://i.imgur.com/a6CRqjj.jpeg`, **1774×887, rasio tepat 2,000**. Ini WAJIB dicek lebih dulu:
kalau rasionya ≥ 2,4 ia masuk jalur landscape dan `MAX_CARD_H` **tidak berpengaruh sama sekali** —
mengubah angkanya jadi sia-sia. Verifikasi ulang di 8 titik (3 slot `/beranda` + `/drama/[id]`, di
1577 px & 390 px): **0 masalah**.

Mau diubah lagi? Cukup **satu konstanta** di `AdCreative.tsx`. ⚠️ Tapi cek dulu rasio gambar iklan yang
sedang terpasang — kalau ≥ 2,4, konstanta itu bukan tombolnya.

*Kosmetik, belum diubah:* di ukuran 160 badge "IKLAN" (`absolute left-2 top-2`) menutupi sedikit tulisan
creative di pojok kiri-atas. Badge wajib ada sebagai penanda konten sponsor; kalau mengganggu,
pilihannya geser posisi atau perkecil badge-nya.

## 📐 2026-09-02 (lanjutan) — Satu garis kiri: logo · judul hero · label film

Owner menilai hasil putaran pertama "masih kurang" — judul memang sudah kiri, tapi **tidak sejajar**
dengan label judul film di pojok kiri-bawah hero. Owner memilih opsi "semua ikut ke tepi kiri".

**Akar masalahnya bukan kurang geser, tapi DUA SISTEM POSISI yang berbeda:**
label film memakai `left-4 md:left-6` (jarak TETAP dari tepi layar), sedangkan header & hero memakai
`mx-auto max-w-7xl` (isi dibatasi 1280px lalu dipusatkan → jaraknya dari tepi IKUT BERUBAH mengikuti
lebar layar; di layar 1583px jadi ~175px). Dua aturan berbeda tak akan pernah bertemu.

Perbaikan — buang pembatas lebar di dua tempat (`app/page.tsx`):
- baris ~72 header: `mx-auto flex h-16 max-w-7xl … px-4 md:px-6` → `flex h-16 … px-4 md:px-6`
- baris ~117 container hero: `mx-auto … max-w-7xl` dihapus, sisanya tetap
- `LandingHero.tsx` **tidak diubah kelasnya** — `left-4 md:left-6` sengaja dijadikan PATOKAN

**⚠️ KONTRAK LINTAS-BERKAS (kerusakan senyap kalau dilanggar):** `px-4 md:px-6` di `app/page.tsx`
WAJIB sama angkanya dengan `left-4 md:left-6` di `app/components/LandingHero.tsx`. Ubah satu sisi
saja → kesejajaran putus **tanpa error apa pun**, tak ada yang melapor. Peringatan sudah ditulis
sebagai komentar di KEDUA berkas.

**Bukti sejajar (dibaca dari CSS hasil build, bukan asumsi):**
`.px-4{padding-inline:calc(var(--spacing) * 4)}` vs `.left-4{left:calc(var(--spacing) * 4)}` ·
`.md\:px-6{…* 6}` vs `.md\:left-6{…* 6}` · `--spacing: .25rem` → HP 16px, desktop 24px, sama untuk
ketiganya. Karena header & hero kini selebar layar penuh, tepi kiri isi = 0 + padding itu.

Sengaja TIDAK diubah: section fitur & footer (`app/page.tsx` ~176, ~205, ~370) tetap
`mx-auto max-w-7xl` — hero menempel tepi itu gaya poster, tapi paragraf panjang selebar layar penuh
capai dibaca.

## 🎨 2026-09-02 — Judul hero landing dipindah ke KIRI (gaya idlixku.com)

Permintaan owner: judul besar di halaman depan yang tadinya rata tengah dibuat rata kiri seperti
idlixku.com. Semua di **`app/page.tsx`**, hanya class Tailwind (tampilan), tidak menyentuh logika:

- baris ~113 container hero: `max-w-3xl items-center text-center` → `max-w-7xl items-start text-left`
  (`max-w-7xl` + `px-4 md:px-6` = sama persis dengan container header, jadi tepi kiri judul sejajar
  dengan logo "DramaKu")
- baris ~124 (tombol) & ~141 (statistik 42/7/Gratis): `justify-center` → `justify-start`
- baris ~105 lapisan gelap: `radial-gradient(ellipse_at_center …)` → `ellipse_at_left`, supaya
  bagian gelapnya ikut pindah ke kiri menopang teks; huruf emas di atas video terang susah dibaca

`Stat` (`app/page.tsx` ~377) sengaja TIDAK diubah — ia tidak punya `text-center` sendiri, jadi ikut
container. Hanya dipakai di blok hero ini, tak ada pemanggil lain yang tersenggol.

**Bukti lokal:** `npx tsc --noEmit` exit 0 · `npm run build` exit 0 · dev server `GET / 200`, HTML
yang benar-benar terkirim berisi `max-w-7xl … items-start … text-left` dan 2× `justify-start`. Sisa
`justify-center` di HTML semuanya milik komponen `Button` (memusatkan teks DI DALAM tombol) dan
logo bulat header — bukan pemusatan blok hero.

**✅ SUDAH TAYANG DI PRODUKSI.** Commit `5aa8344`, dual push `origin` + `dramaku` sukses, keduanya
terverifikasi di `5aa8344` (bukan cuma pesan "berhasil" — `git fetch` ulang lalu bandingkan hash).
HTML `https://dramaapp.vercel.app/` berisi `max-w-7xl … items-start … text-left`, 2× `justify-start`,
dan `ellipse_at_left`. Cek sehat: `/` `/beranda` `/discover` `/shorts` semua **200**.

**⚠️ Remote `official` (`projectraden/backup-dramaapp`) SUDAH MATI** — `git fetch official` balas
`Repository not found`. Dual push kini efektif hanya 2 repo (`origin` + `dramaku`), sesuai
`AGENTS.local.md`. Kalau owner masih mau cadangan ketiga, repo-nya perlu dibuat/diberi akses ulang.

*Catatan kecil:* `next-env.d.ts` berubah sendiri saat `npm run dev` dijalankan
(`.next/types/…` → `.next/dev/types/…`). Berkas auto-generated, **sengaja tidak ikut di-commit**;
Next.js menulisnya ulang sesuai mode yang terakhir dipakai.

## 🎉 2026-09-01 — MIGRASI SUPABASE SELESAI & TERVERIFIKASI TAYANG

Produksi resmi membaca project BARU `nvblmpkwyzbpdbshyvzw` (schema `dramaapp`).
Deployment `696dcGTPw` (commit `0e1395b`) **Ready** 1m14s.

*Bukti produksi benar-benar di database BARU* (logis, bukan asumsi): kode yang tayang SELALU kirim
`Accept-Profile: dramaapp`. Project LAMA diuji dengan header itu balas
`406 PGRST106 — Only the following schemas are exposed: public, graphql_public`. Kalau produksi masih
menunjuk project lama, `/api/dramas` pasti 500. Kenyataannya **200 berisi 42 judul** → tidak ada
kemungkinan lain. (Catatan: perbandingan jumlah judul TIDAK sah sebagai bukti — kedua database
isinya sama; yang membedakan adalah header schema.)

*Bukti sehat menyeluruh:* landing · `/beranda` · `/discover` · `/playly` semua **200** ·
`/api/teaser` **307 / 0 byte** → tunnel `chronic-restrictions-share-parcel.trycloudflare.com` →
diikuti balas **206 `video/mp4`** (byte video tetap tidak lewat Vercel, kuota aman) ·
`/api/likes` total **115** = isi DB baru **115**, cocok baris per baris.

### Akar masalah 7 build gagal beruntun (22 jam)

`SUPABASE_SERVICE_ROLE_KEY` di Vercel masih kunci project LAMA sementara `SUPABASE_URL` sudah
project BARU → saat build, Next.js prerender `/beranda` → `Supabase select 401 Invalid API key` →
`Export encountered an error on /beranda/page, exiting the build`. Direproduksi lokal dengan sengaja
memasangkan URL baru + kunci lama.

**Jebakan yang sempat menyesatkan:** log build Vercel berhenti di `Running TypeScript ...` karena
baris-baris sesudahnya tidak sempat terkirim saat proses mati. Sempat didiagnosis sebagai error
TypeScript — padahal TypeScript LOLOS (`Finished TypeScript in 13.4s`), matinya di tahap prerender
sesudahnya. **Kalau log Vercel berakhir mendadak tanpa pesan error, jangan percaya baris terakhir
sebagai titik gagal — reproduksi lokal dengan env yang sama.**

### Tiga pelajaran yang perlu diingat

1. **Env var Vercel bertipe `Secret` tidak bisa diverifikasi dengan mata** — setelah disimpan isinya
   hanya titik-titik. Jangan "cek apakah sudah sama"; timpa saja: Ctrl+A → Delete → tempel ulang →
   jangan ada spasi/Enter di ujung.
2. **Perubahan env di Vercel tidak berlaku sampai Redeploy.** Deployment yang berjalan memakai nilai
   saat ia dibangun.
3. **Build gagal 22 jam tanpa ada yang tahu.** Situs tetap sehat karena Vercel mempertahankan
   deployment sukses terakhir (`ee8f18c`, 29 Agu) — nyaman, tapi menyembunyikan bahwa semua commit
   sejak `3dad2e8` tidak pernah sampai ke penonton. Belum ada notifikasi build gagal.

### ✅ Penjaga permanen dipasang (2026-09-01, atas persetujuan owner)

`app/page.tsx` · `app/beranda/page.tsx` · `app/discover/page.tsx` · `app/shorts/page.tsx` dulu
memanggil `getAllDramasCached()` **tanpa `try/catch`** saat prerender → satu gangguan Supabase saat
build menjatuhkan SELURUH deployment. Sekarang keempatnya memakai
`getAllDramasCachedSafe()` (lihat [lib/dramas.ts](./lib/dramas.ts), tepat sesudah
`getAllDramasCached`): kalau katalog tak terjangkau, jatuh ke `data/dramas.json` supaya halaman tetap
terisi — bukan kosong, dan bukan menjatuhkan build.

Perbaikan ditaruh di lapisan data (satu fungsi), bukan ditambal di empat halaman.
**Jalur admin/tulis/koin sengaja TIDAK diubah** — di sana kegagalan harus tetap melempar error, jangan
disamarkan jadi "katalog kosong".

*Bukti (skenario asli diulang):* build dengan URL baru + kunci lama — yang tadinya
`Export encountered an error on /beranda/page, exiting the build` — kini **exit 0**, mencetak
`[dramas] katalog tak terjangkau, pakai berkas lokal: ... 401` (error tetap terlihat, tidak ditelan)
dan menghasilkan 21/21 halaman. Jalur normal tetap utuh: **63/63** halaman, 42 judul dari Supabase,
tanpa peringatan fallback. `tsc --noEmit` exit 0.

### Sisa pekerjaan — SEMUA SELESAI

- ✅ `git push dramaku main` — 8 commit (`3dad2e8`..`5f7cac5`) terkirim. Ketiga repo selaras di
  `5f7cac5`, diverifikasi lewat `gh api` (langsung ke GitHub, bukan cache lokal), sisa 0 commit.
- ✅ Kang Dedi sudah dikabari; project lama `iicrzdnmcpontfytfypi` boleh dimatikan.
- ✅ Notifikasi `Deployment Failures` di Vercel: **aktif di ketiga saluran (Push + Email + Web)**.
  Email & Web ternyata sudah menyala sejak awal — 7 kegagalan kemarin memang terkirim, hanya tidak
  terbaca. Push disubscribe 2026-09-01 karena itu satu-satunya saluran yang sulit diabaikan.
  `Deployment Ready` sengaja Push saja (tanpa Email/Web) supaya notifikasi sukses tidak menenggelamkan
  yang gagal. Letaknya: team switcher → Settings (sidebar) → Account → My Notifications
  (`vercel.com/<team>/~/settings/notifications`) — BUKAN di menu foto profil.
- ⚠️ **JANGAN jalankan `scripts/sinkron_selisih_dramaapp.mjs` lagi** — arahnya lama→baru, sekarang
  akan menimpa data penonton yang lebih baru dengan data lama.

### Kredensial GitHub untuk repo `dramaku` — sudah beres, begini cara memperbaikinya lagi

Gejala kemarin: `git push dramaku main` menggantung lalu gagal
`Invalid username or token. Password authentication is not supported`.
Penyebab: tidak ada kredensial GitHub tersimpan sama sekali di PC ini.

**JEBAKAN yang memakan satu putaran:** `gh auth login` saja **TIDAK CUKUP**. Pertanyaan
*"Authenticate Git with your GitHub credentials?"* harus dijawab **Yes**; kalau terlewat, `gh auth status`
tampak sehat tapi `git push` tetap ditolak — karena Git belum tahu soal login itu.
Perbaikannya satu perintah tanpa dialog: **`gh auth setup-git`** (memasang
`credential.https://github.com.helper` ke gitconfig global). Sesudah itu `git push dramaku main` jalan.

*Cara memastikan push benar-benar mendarat* (jangan percaya pesan "berhasil" saja):
`gh api repos/ojokesusu/dramaku/commits/main --jq '.sha[0:7]'` — membaca langsung dari GitHub,
tidak terpengaruh cache `git fetch` yang bisa basi.

---

## ✅ 2026-09-01 — riwayat: palang dibuka bertahap

Urutannya beres semua kecuali langkah terakhir:
1. ✅ Kang Dedi menambahkan `dramaapp` ke Exposed schemas.
2. ✅ `revoke all on all tables in schema dramaapp from anon, authenticated` —
   dijalankan owner lewat `scripts/perbaiki_izin_dramaapp.py`. Lubang keamanan tertutup.
3. ✅ `grant usage on schema dramaapp to service_role` — dijalankan Kang Dedi di SQL Editor
   (user `creative_raden` tidak berwenang: punya USAGE tapi tanpa GRANT OPTION; Postgres tidak
   menolak perintahnya, hanya WARNING lalu tidak berbuat apa-apa — kegagalan SENYAP, selalu
   verifikasi hasilnya).
4. ✅ REST API terbukti jalan penuh: baca `dramas` 200 (42 judul, identik dengan produksi) ·
   baca `app_data` 200 · **tulis** 201 → baca balik 200 → hapus 204 → bersih `[]`.
5. ✅ Selisih data disusulkan lewat `scripts/sinkron_selisih_dramaapp.mjs` — 6 baris
   (`app_data`: `ads`, `playly:hidden`, `videobase` · `likes`: 3 judul), semuanya diverifikasi cocok.
   **`videobase` yang paling kritis** — berisi alamat tunnel video yang sedang hidup dan berganti
   tiap PC backup restart; tanpa disalin, semua video mati begitu produksi pindah.
6. ⬜ **SISA SATU: tukar env di Vercel + redeploy.** Ganti `SUPABASE_URL` ke
   `https://nvblmpkwyzbpdbshyvzw.supabase.co` dan `SUPABASE_SERVICE_ROLE_KEY` ke kunci project
   baru (nilainya sudah ada di `.env.local`). Jalankan ulang `sinkron_selisih_dramaapp.mjs` tepat
   sebelum menukar untuk menangkap selisih menit terakhir.
   **Jangan sinkron lagi SESUDAH tukar** — arahnya lama→baru, jadi akan menimpa data baru yang
   sudah masuk. Rollback kalau bermasalah: kembalikan kedua env ke nilai lama
   (kunci lama ada di `C:\Users\user18\Downloads\key-lama.txt`, JANGAN di-commit).

Riwayat penelusuran yang menghasilkan ini ada di bawah — disimpan karena berisi jalur-jalur buntu
yang tak perlu diulang.

## 🔴 2026-08-31 (sore) — KOREKSI: migrasi BELUM tuntas, produksi masih database LAMA

**Klaim yang dikoreksi.** Catatan pagi ini menyimpulkan "produksi sudah pakai database baru" dari
bukti `/api/dramas` balas 42 judul sedangkan `data/dramas.json` cuma 21. **Alasan itu tidak sah:**
selisih 42 vs 21 hanya membuktikan produksi membaca *sebuah* database, bukan database yang *mana*.

**Palang sebenarnya: schema `dramaapp` belum di-expose.** Supabase punya daftar putih schema mana
yang boleh diakses lewat REST API (Dashboard → Settings → API → **Exposed schemas**). Isinya saat ini
`public, graphql_public, datadomain, rtp, seoanalysis, footballbot, mappingplan_backup` — **tanpa
`dramaapp`**. Uji langsung dengan kunci yang benar balas:

```
406 {"code":"PGRST106","message":"Invalid schema: dramaapp"}
```

**Kenapa ini membuktikan produksi belum pindah.** [lib/supabase.ts:24](./lib/supabase.ts#L24) selalu
mengirim `Accept-Profile: dramaapp`. Kalau `SUPABASE_URL` di Vercel menunjuk project baru, tiap
permintaan pasti kena 406 lalu `ensureOk` melempar error → `/api/dramas` jadi **500**. Kenyataannya
produksi balas **200** dengan header `X-Vercel-Cache: MISS` + `Age: 0` (= query database hidup, bukan
cache basi). Jadi produksi masih membaca project lama `iicrzdnmcpontfytfypi`. Ini kesimpulan lewat
eliminasi — env var Vercel sendiri belum pernah dibaca langsung (CLI-nya `Logged out`).

**Yang SUDAH beres** (diverifikasi lewat koneksi Postgres langsung ke pooler, read-only — jalur ini
tidak lewat REST jadi tak terhalang Exposed schemas):

| Tabel di `dramaapp` | Isi | Backup DB lama 29 Agu |
|---|---|---|
| `dramas` | 42 | 42 |
| `app_data` | 20 | 20 |
| `likes` | 35 | 35 |
| `wallets` | 3 | 3 |
| `unlocks` | 0 | 0 |

42 id drama-nya **identik persis** dengan yang tayang di produksi. Kunci `ads` dan `playly:hidden`
sudah ikut pindah. `SUPABASE_SERVICE_ROLE_KEY` di `.env.local` juga **sudah diganti owner** dan
terbukti valid (401 hilang, berganti jadi 406 di atas).

**⚠️ Data terus bergeser selama produksi belum dipindah.** Penonton masih menambah data ke DB lama.
Terukur 2026-08-31: total like `111 → 114` (`permaisuri-bangkit-di-dunia-modern` 1→2 ·
`over-your-dead-body` 2→4). Angkanya akan terus bertambah → **wajib sinkron ulang tepat sebelum
pindah**, jangan pakai snapshot 29 Agu apa adanya.

**Konteks (2026-08-31): ini permintaan Kang Dedi.** Pengumuman 2026-08-29 di Discord: semua project
wajib pindah ke `nvblmpkwyzbpdbshyvzw`, **deadline Selasa 2026-09-01**, project lama di-shutdown
(biaya $285/bulan). Data DramaApp **sudah aman** di project baru sejak 29 Agu — yang belum, produksi
masih *membaca* project lama, jadi begitu project lama dimatikan situs ikut mati.

**Langkah owner (butuh pemilik project Supabase — Kang Dedi, bukan owner dramaapp).** Dua cara,
pilih salah satu:

*Cara 1 — dashboard:* Settings → **Data API** (dashboard lama: **API**) → **Exposed schemas** →
tambahkan `dramaapp` ke daftar yang sudah ada (jangan hapus yang lain) → Save.
Link langsung: `https://supabase.com/dashboard/project/nvblmpkwyzbpdbshyvzw/settings/api`

*Cara 2 — Management API* (dipakai kalau menunya tak ketemu; per 2026-08-31 Kang Dedi tidak
menemukan menu itu). Endpoint & nama field sudah dicek ke dokumentasi resmi Supabase:
`PATCH https://api.supabase.com/v1/projects/{ref}/postgrest`, field `db_schema`. Butuh Personal
Access Token dari `https://supabase.com/dashboard/account/tokens`. Jalankan GET dulu untuk ambil
nilai `db_schema` yang sekarang, lalu PATCH dengan nilai itu + `, dramaapp`.
**Token itu memberi akses ke SELURUH akun Supabase Kang Dedi — biar beliau sendiri yang menjalankan,
jangan diminta/diteruskan.**

**Rencana darurat kalau tenggat lewat & schema belum dibuka:** hapus `SUPABASE_URL` +
`SUPABASE_SERVICE_ROLE_KEY` dari env Vercel → `useSupabase` jadi false → situs jatuh ke berkas
`data/dramas.json` (21 judul, tanpa akun/koin/like). Jelek tapi situs tetap hidup, jauh lebih baik
daripada halaman error 500. Lihat `getAllDramas` di [lib/dramas.ts:160](./lib/dramas.ts#L160).

Jalur alternatif yang SUDAH DIUJI DAN BUNTU (jangan diulang):
`ALTER ROLE authenticator SET pgrst.db_schemas` → ditolak, *"authenticator is a reserved role, only
superusers can modify it"* · menumpang schema lain yang sudah ter-expose → `CREATE=False` di semua
(`public` malah kosong, 0 tabel) · `creative_raden` tidak memiliki satu schema pun.

**URUTAN AMAN — jangan dibalik:**
1. Expose schema `dramaapp` ← satu-satunya yang butuh akses dashboard
2. Uji dari lokal sampai benar-benar tembus (bukan diasumsikan)
3. Sinkronkan data selisih yang menumpuk sejak 29 Agu
4. Baru ganti `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` di Vercel + redeploy
5. Verifikasi produksi hidup & datanya utuh

**Jalan pintas yang SUDAH ditolak:** bikin *view* di schema `public` (yang sudah ter-expose) supaya
tak perlu dashboard — **tidak bisa**. Kode menyimpan data pakai `on_conflict` (upsert), dan Postgres
tidak mendukung `ON CONFLICT` di atas view → baca jalan, tapi semua penyimpanan (like, koin, komentar,
admin) rusak. Mengubah `pgrst.db_schemas` lewat SQL juga tidak diambil: setelan itu dipakai bersama
4 aplikasi lain di project yang sama.

## ⚠️ 2026-08-31 — SISA HAL TERTINGGAL

**1. ~~`.env.local` memakai kunci database LAMA~~ — SELESAI 2026-08-31.** Owner sudah menempel
`service_role` project baru; uji langsung tidak lagi balas `401 Invalid API key`. `npm run dev`
tetap belum bisa membaca data sampai palang Exposed schemas di atas dibuka.

**2. TIGA commit belum ter-push ke repo cermin `dramaku` (aturan dual push).**
`origin/main` sudah `e74aff4` ✅, tapi `dramaku/main` masih `ee8f18c` — terakhir di-push
2026-08-29 08:25. Yang tertahan: `3dad2e8` · `4195567` · `e74aff4` (jumlahnya akan terus bertambah
tiap commit baru sampai kredensialnya diperbaiki). Dicoba lagi 2026-08-31 sore, GitHub tetap menolak:
`Invalid username or token. Password authentication is not supported for Git operations.`
(kredensial repo `ojokesusu/dramaku` di PC ini kedaluwarsa/hilang).
*Dampak:* nol untuk penonton — push ke `dramaku` **tidak** merilis apa pun; risikonya rekan bekerja
di atas kode lama. *Langkah:* login ulang GitHub di PowerShell (`git credential-manager` / `gh auth login`),
lalu `git push dramaku main`.

## 🗄️ 2026-08-30 — MIGRASI SUPABASE KE PROJECT BARU (kode tayang, produksi BELUM pindah)

Commit `3dad2e8` (30 Agt 08:42) — dibuat sesi lain yang berakhir tanpa mengisi handoff, jadi dicatat
sekarang berdasarkan pembacaan commit + pengujian produksi hari ini.
*Apa yang berubah:* database pindah dari project Supabase lama `iicrzdnmcpontfytfypi` ke project baru
`nvblmpkwyzbpdbshyvzw`. Karena project baru **dipakai bersama aplikasi lain**, tabel DramaApp
sengaja ditaruh di **schema `dramaapp`** (bukan `public`) supaya nama tabel tidak tabrakan.
*Cara kodenya tahu:* [lib/supabase.ts:24](./lib/supabase.ts#L24) mengirim header `Accept-Profile`
(untuk baca) + `Content-Profile` (untuk tulis) berisi `dramaapp` di tiap permintaan — syaratnya
schema itu sudah di-expose di Dashboard → Settings → API (**BELUM** per 2026-08-31 sore — inilah
palang yang menahan migrasi; lihat bagian KOREKSI di atas).
*Bahan pendukung yang ikut masuk:* `supabase_migrations/2026-08-29_schema_lengkap_dramaapp.sql`
(skema lengkap 5 tabel — `app_data`, `dramas`, `likes`, `wallets`, `unlocks` — idempoten, aman
dijalankan ulang) · `scripts/export-dramaapp-sql.mjs` (ekspor SQL lengkap) ·
`scripts/cek_db_lama_readonly.py` (cek read-only database lama sebelum dimatikan) · `.gitignore`
kini melindungi `backups/` + hasil export (isinya data user, jangan sampai ter-commit).
*Status tayang (dikoreksi 2026-08-31 sore):* `/api/dramas` memang 200 berisi 42 judul, tapi **dari
database LAMA** — schema `dramaapp` di project baru belum bisa diakses lewat API.
*Sisa referensi project lama `iicrzdnmcpontfytfypi`:* di kode aplikasi **nihil**; yang masih menyebut
hanya berkas sejarah/alat — `docs/architecture.md` (catatan pensiun), `migrasi-full.sql`,
`migrasi-schema.sql`, `supabase_migrations/2026-08-29_schema_lengkap_dramaapp.sql`,
`scripts/fix_coin_spend_unlock_prod.sql`, `backups/prod-2026-08-29T06-34-11/manifest.json`, plus
`.next/` (cache build). Semuanya wajar dan tidak perlu dibersihkan.

**Terakhir diisi sebelumnya:** 2026-08-29 — **CEK RUTIN: semua selaras & sehat.** Lokal = `origin/main` = `dramaku/main` = `7a440c2` (selisih NOL, tak ada rilis tertinggal). Produksi: landing 200 · teaser 307/0 byte → tunnel `ping-newspapers-damaged-dublin.trycloudflare.com` · video balas 206 `video/mp4`.

*2026-08-28 — HERO LANDING "HIDUP" DIRILIS & TERVERIFIKASI TAYANG.*

**Rilis hero landing (2026-08-28, atas permintaan owner):** landing page publik kini memutar
cuplikan video berputar seperti beranda — komponen baru `app/components/LandingHero.tsx`
(5 judul unggulan via `featuredHeroSlides`, ganti tiap **60 detik**), kolase poster statis
dihapus, lapisan gelap ditipiskan supaya video cerah & gerakannya jelas. **Kuota tetap aman:**
jalur video tidak berubah — `/api/teaser` 307 redirect. **Bukti tayang:** push `53e923b` →
`https://dramaapp.vercel.app/` memuat markup hero baru (`70svh`) 45 detik sesudah push;
`/api/teaser` produksi balas **307 / 0 byte** → tunnel. Lokal = `origin/main` = `dramaku/main`
= `53e923b`, selisih NOL. Pra-push: 390 tes lulus, `tsc` exit 0, `next build` sukses.

**Riwayat sebelumnya (2026-08-27 malam) — Playly resmi dirilis:**

**Rilis Playly = KEPUTUSAN owner malam ini** (koreksi atas dugaan "efek samping merge" di catatan
rekan): sesudah kuota terbukti aman & penyisiran tuntas, owner diminta memilih dan menyetujui
rilis. `origin/main` (`a242921`) di-merge balik ke lokal → `14fa0cc`, di-push ke `origin` +
`dramaku`. **Bukti tayang:** `https://dramaapp.vercel.app/playly` balas **200** ±1 menit sesudah
push (sebelumnya 404); diverifikasi rekan dari sisi mereka: halaman memuat keempat video `coklat`
(Transformers 8, Transformers The Last Knight, Hulk Abu-abu, Suara Hewan). Pantauan Fast Origin
Transfer mingguan kini mencakup dua perubahan sekaligus (perbaikan kuota + Playly) — audit Playly:
nol pola penyalur byte, video lewat `<iframe>` ke Vercel *milik Playly*, thumbnail `<img>` biasa.

**Kotak merah "PLAYLY_ENCRYPTION_KEY belum di-set" (difoto owner) = env yang kurang di VERCEL,
bukan di komputer.** BUKAN penyebab video tak tampil (video tampil tanpa env itu) — ia hanya
dipakai mengenkripsi kunci Playly sebelum masuk database, jadi satu-satunya yang diblokir = tombol
"Simpan kunci" di halaman admin (`lib/playly.ts` menelan gagal-dekripsi lalu turun ke katalog
publik). Isi lewat Vercel → Settings → Environment Variables kalau tombol itu mau dipakai.

**Kunci mitra `plyk_…` KINI DITERIMA LAGI** — diuji rekan 2026-08-27: `{"ok":true,"count":4}`;
catatan "invalid_key 2026-08-25" BASI. Katalog publik hidup: 22 video, 4 milik `coklat`.

⚠️ **Push dari PC rekan tetap 403** (`denied to yusufscorpio`, izin baca saja). Jalan keluar
permanen: pemegang akun `masradenbagus89-ui` menambahkan `yusufscorpio` sebagai collaborator
Write. Kalau sudah bisa: pakai `git push dramaapp origin/main:main`, JANGAN
`git push dramaapp fix/playly-otomatis:main` (non-fast-forward — memaksanya menghapus perbaikan
kuota dari produksi).

**Penyisiran penuh: dipastikan TIDAK ADA video yang lewat Vercel.** Sesuai permintaan owner,
seluruh jalur video diperiksa satu per satu
(permintaan ini muncul karena aplikasi masih mode develop dan owner ingin kepastian mutlak):
pemutar utama langsung ke tunnel (`lib/video.ts:6` `videoSrc`), cuplikan kartu/hero lewat
`/api/teaser` = 307 redirect 0 byte, unduh langsung tunnel `?dl=1` (`lib/video.ts:21`) +
`/api/download` = 307, video Playly lewat `<iframe>` ke Vercel *mereka*, route `/api/videos` ·
`/api/external-videos` · demo hanya mengirim JSON teks, `next.config.ts` tanpa rewrite/proxy
tersembunyi. **Satu-satunya proxy tersisa = `/api/subtitle`** — itu file teks `.vtt` berukuran
KB (bukan video), wajib same-origin karena CORS pada `<track>`; dampak kuota bisa diabaikan.
Bukti mesin: **59 tes penjaga lulus** (5 berkas: teaser-redirect, download-redirect, hero-teaser,
video, video-base) — tes ini MERAH kalau ada yang mengembalikan route jadi penyalur byte.

*Riwayat 2026-08-27 sore:* perbaikan kuota TAYANG & TERVERIFIKASI.
Akun di-unblock Vercel (one-time courtesy, kuota 3× selama 30 hari s/d ~2026-09-26), tapi
deployment `8a41ae4` ternyata tak pernah dibangun (terblokir saat paused) sehingga kode lama
penyalur byte masih melayani dan membakar kuota baru. Owner meminta AI mengerjakan: AI mengirim
commit pemicu `a242921` (kosong, berdiri di atas `8a41ae4` — **fitur Playly TIDAK ikut tayang**)
ke `origin/main`; Vercel langsung membangun. **Bukti tayang (2026-08-27 sore):**
`/api/teaser?id=over-your-dead-body&ep=1` balas **307, 0 byte**, `location` menunjuk tunnel baru
`optical-comprehensive-harper-howto.trycloudflare.com`; mengikuti redirect dengan `Range: 0-15`
balas **206 `video/mp4` signature `ftypisom`** — byte video mengalir langsung tunnel→penonton.
HTML beranda tak lagi memuat `<video preload="auto">` (kode baru memasang video hanya sesudah
jeda 1,2 dtk di browser — `app/components/HeroPreview.tsx:166`).
**Tidak ada langkah owner yang tersisa untuk krisis ini** — tinggal pantauan mingguan di bawah.

> ⏰ **PENGINGAT PEMANTAUAN 30 HARI (owner, mulai 2026-08-27):** tiap minggu buka dashboard Vercel →
> **Usage** → lihat **Fast Origin Transfer**. Seharusnya merayap MB-an per hari, BUKAN GB — byte
> video kini mengalir langsung tunnel→penonton (redirect 307, commit `f17b528`). Kalau melonjak
> GB-an dalam seminggu = masih ada jalur bocor lain → telusuri SEGERA sebelum jatah 3× habis;
> un-block kedua TIDAK akan diberikan.

> ✅ **RIWAYAT — sudah tidak berlaku per 2026-08-27 malam:** dulu lokal sengaja lebih maju dari
> produksi (Playly ditahan di `dramaku` saja). Malam ini owner menyetujui rilisnya: merge balik
> `a242921` → push `14fa0cc` ke `origin` + `dramaku`. Lokal = origin = dramaku, selisih nol.
> ~~**`git push origin main` berikutnya AKAN ikut merilis fitur rekan**~~ — SUDAH dirilis atas
> izin owner.

**🆘 JALAN KELUAR TANPA VERCEL (disiapkan 2026-08-26, BELUM dijalankan owner).** ⏸️ *Status 2026-08-27:
TIDAK DIPERLUKAN sekarang — akun sudah di-unblock Vercel. Simpan sebagai CADANGAN kalau kuota jebol
lagi / pause kambuh.* Ternyata pause
`dramaapp` ada di tingkat **AKUN**, bukan project — dan pause tingkat akun **tidak punya tombol
Resume gratis**, hanya Upgrade. (Dugaan sesi ini sebelumnya soal tombol Resume di Project → Settings
→ General SALAH: di situ tertulis *"Pause Project"*, artinya project-nya justru tidak sedang paused.)
Kuota Hobby juga memakai **rolling 30-day window**, bukan reset tanggal tetap — ledakan 22-26 Agt baru
gugur sekitar **21-25 Sep**, dan sesudah itu pun akun tetap harus di-unpause manual lewat
`vercel.com/help`.

Karena project belum disetujui atasan (upgrade belum boleh), disiapkan jalur gratis: **jalankan situs
dari PC backup** lewat cloudflared + Caddy yang sudah jalan 24 jam di sana. Bandwidth tanpa batas,
nol biaya, tak ada yang bisa mem-pause. Bahan yang sudah siap:
`pc-backup-agent/start-dramaapp-web.ps1` (sudah lolos uji parse PowerShell, ASCII murni) ·
blok `app.amasyaforum.com` di `cloudflared-config.example.yml` · panduan **Bagian G** di
`pc-backup-agent/README.md`. Harga yang harus diterima: **PC backup mati = seluruh situs mati**, bukan
cuma videonya. PC backup meng-clone dari `dramaku` (bukan produksi), jadi situs dari PC backup IKUT
memuat fitur Playly rekan.

**Sebelumnya (2026-08-26, pekerjaan rekan — sudah masuk lokal & `dramaku`, BELUM produksi):**
**video Playly kini tampil OTOMATIS** di halaman baru
`/playly` + baris di `/discover`, tanpa perlu dikaitkan ke drama, dan tetap jalan walau
kunci mitra dicabut. Lihat seksi Playly di bawah — catatan Playly 2026-08-25 sudah BASI
dan diganti.

**Sebelumnya (2026-08-26 pagi):** **video mati lagi (siklus ke-5) → PULIH & TERVERIFIKASI dari luar.**
Akarnya sama persis dengan siklus ke-4: `start-video-services.ps1` hilang lagi dari PC backup, sementara
penjaga 15 menit tetap jalan tapi menembak berkas kosong. Akarnya bukan kode aplikasi. Detail + 2 pelajaran baru
(dugaan "PC backup mati" yang KELIRU, dan jeda ~24 jam antara sebab & gejala) ada di seksi 2026-08-26
di bawah. **Tersangka sebab berkas raib DUA KALI sudah teridentifikasi: antivirus KEDUA `360 Total Security` (bukan Norton) — terpasang di PC backup, belum terbukti mengarantina.**
**Penjaga permanen AKTIF di PC backup & pemulihannya TERBUKTI NYATA 10:47** (3 berkas di
`pc-backup-agent/`) — berkas penting yang hilang kini dipulihkan sendiri tiap 10 menit.

**Sebelumnya (2026-08-25):** DUA hal digabung & dirilis bersama:
(1) fitur **Film (tanpa episode)** di panel admin — SQL kolom `kind` sudah dijalankan owner di
Supabase, kode sudah tayang di produksi; (2) **video Playly akhirnya bisa diputar** — pekerjaan yang
sebelumnya tertahan di repo `dramaku` karena push ke repo produksi ditolak 403, sekarang ikut naik.
Lihat dua seksi bertanggal 2026-08-25 di bawah. Catatan video (tunnel/PC backup) TERBARU: seksi 2026-08-26.

**Sebelumnya (2026-08-24):** video mati lagi (**siklus ke-4**) lalu **dipulihkan & diverifikasi
ujung-ke-ujung**; akarnya BUKAN kode: berkas `start-video-services.ps1` tidak ada di PC backup +
penjaga 15 menit ternyata belum pernah dipasang. Keduanya sudah dibereskan. **1 bug kode ditemukan
& BELUM diperbaiki** (mis-parse `api.trycloudflare.com`, lihat di bawah). Bagian lain masih apa
adanya dari 2026-08-21, belum diukur ulang.

## Status sekarang (1 menit)

- 🔴 **Migrasi Supabase BELUM tuntas** — data sudah ada di project baru `nvblmpkwyzbpdbshyvzw`,
  tapi schema `dramaapp` belum di-expose sehingga produksi masih membaca database lama.
  **Jangan ganti env Supabase di Vercel sebelum palang itu dibuka** (situs akan mati).
  Rincian + urutan aman: seksi KOREKSI 2026-08-31 di atas.
- Situs hidup: **https://dramaapp.vercel.app** — **status 2026-08-27 sore: perbaikan kuota SUDAH TAYANG & terverifikasi** (teaser 307 / 0 byte → tunnel; video balas 206 `ftypisom`; commit produksi `a242921`). Akun dalam masa pantau 30 hari (un-block satu kali) — lihat pengingat mingguan di atas. Riwayat: commit `4954817` TERVERIFIKASI TAYANG 2026-08-20 malam (265 tes lulus, `tsc` exit 0, `next build` sukses, nol secret di diff).
- **Tahap 7 SELESAI PENUH** — diverifikasi 2026-08-20 dari DUA sisi: (a) owner mencoba sendiri lewat tampilan (daftar → simpan kode → ganti password hanya dengan kode; alurnya mudah & berhasil); (b) uji end-to-end mesin ke API produksi **19/19 lulus**. `tests/recovery-code.test.ts` 12 tes lulus. Akun uji sudah dibersihkan dari Supabase (0 baris tersisa, login balas 401).
- Skema database Supabase **tidak diubah** (akun penonton memakai tabel `app_data` yang sudah ada).
- Tahap kelar: 1 · 2 · 3 · 4 (Performance & SEO) · 5 (rating/share/balasan) · 6 (login penonton aman) · 7 (kode pemulihan).
- **AWAS dua penomoran "Tahap" yang beda di repo ini** (sumber salah paham antar-sesi):
  (a) **Tahap PRODUK 1-7** = yang dipakai berkas ini. Tahap 1-3 adalah rencana "platform streaming modern gabungan Melolo + IDLIX + Netflix" — SUDAH SELESAI SEMUA: Tahap 1 `1af6e12` (16 Agt), Tahap 2 `00f0d2e` (17 Agt), Tahap 3 `a8ab69e` (17 Agt). Tahap 4-7 kelanjutannya.
  (b) **Tahap INFRASTRUKTUR 1-8** di [`PLAN-MAPPING.md`](./PLAN-MAPPING.md) = peta lama soal setup/tunnel/deploy. Di situ "Tahap 7" berarti *named tunnel*, BUKAN kode pemulihan. Isinya belum diperbarui sejak Juli.

## 💸 2026-08-26 — VERCEL MEM-PAUSE SITUS (kuota transfer jebol) — ✅ UNBLOCK 2026-08-27, masa pantau 30 hari

**✅ KELANJUTAN 2026-08-27:** owner menghubungi Vercel lewat `vercel.com/help` (chat Vercel Agent,
pakai bukti commit `f17b528` proxy→redirect). Vercel memberi **one-time courtesy unblock**: jatah
dinaikkan 3× selama 30 hari (~sampai 2026-09-26). Syarat tersembunyinya: jebol lagi = wajib Pro,
tak ada ampun kedua. **Tugas rutin owner selama masa ini: cek Usage tiap minggu** (lihat pengingat
di blok paling atas berkas ini). Catatan koreksi sesi ini: jalan resmi untuk pause tingkat akun
memang lewat `vercel.com/help` — bukan tombol Resume di Settings seperti dugaan 2026-08-26.

**✅ TUNTAS 2026-08-27 sore:** deployment `8a41ae4` ternyata tidak pernah dibangun Vercel
(terblokir saat akun paused — terverifikasi 2×: teaser balas 200 + menyalurkan ~24-26 MB, HTML
masih `preload="auto"`). AI mengirim commit pemicu kosong `a242921` (di atas `8a41ae4`, tanpa
fitur Playly) → Vercel membangun → **terverifikasi tayang**: teaser **307 / 0 byte** → tunnel
baru, redirect diikuti balas **206 `video/mp4` `ftypisom`**. Kuota 3× kini hanya terpakai untuk
halaman & API, bukan byte video. Pelajaran operasional: **sesudah push saat/ menjelang pause,
jangan anggap "ter-push" = "tayang" — selalu cek bukti tayang** (di insiden ini `origin/main`
benar tapi produksi melayani build lama).

**Gejala:** `dramaapp.vercel.app` balas "This deployment is temporarily paused" di SEMUA halaman.

**Akar (terverifikasi dari dashboard + kode):** kuota **Fast Origin Transfer** = data yang ditarik
server Vercel dari sumber luar lalu diteruskan ke penonton. Terpakai **29,71 GB / 10 GB**. Kuota lain
aman (CPU 1j21m/4j · ISR 54K/200K · Fast Data Transfer 23,11/100 GB). Paket Hobby tak punya tagihan
kelebihan → satu kuota lewat = SELURUH project di-pause.

Yang membakar kuota adalah **cuplikan (teaser)**, BUKAN orang menonton: `/api/teaser` menyalurkan isi
video lewat server, sementara pemutaran episode sudah langsung ke tunnel (`lib/video.ts:12`, nol beban
Vercel). Diperparah `preload="auto"` + autoplay hero (tiap kunjungan menarik video tanpa diklik) dan
**`TEASER_BYTES` yang dideklarasikan tapi TIDAK PERNAH dipakai** → satu cuplikan bisa menarik seluruh
file episode.

**Sudah dikerjakan (6 berkas, belum di-commit):**
`app/api/teaser/route.ts` (proxy → 307 redirect + buang `TEASER_BYTES`) · `app/components/HeroPreview.tsx`
(`preload="metadata"` + jeda 1,2 dtk sebelum unduh) · `app/components/Poster.tsx` (cuplikan hover dibatasi
10 dtk) · `lib/hero-teaser.ts` (2 konstanta baru) · `tests/teaser-redirect.test.ts` (**penjaga baru, 8 tes**) ·
`docs/lintasai/`.

**Bukti:** 366 tes lulus · `tsc` exit 0 · `next build` sukses · mutation check (307→200 = tes MERAH,
dikembalikan = hijau) · uji `next start` nyata: `HTTP/1.1 307` + `location: https://<tunnel>/.../1.mp4` +
**0 byte** terunduh dari server kita.

**⚠️ JANGAN panjangkan `Cache-Control` di `/api/teaser`.** Alamat tunnel berganti tiap PC backup restart;
redirect yang di-cache lama = teaser menunjuk alamat mati. Tes `tests/teaser-redirect.test.ts` mengunci
`s-maxage` maksimal 300 detik.

**Keputusan yang MENUNGGU OWNER:** (a) tunggu reset kuota — siklus diduga tanggal 15 (owner ingat
"pertama pakai 15 Mei"; halaman Usage tidak ketemu) → ~20 hari mati; atau (b) upgrade Pro → hidup
seketika. **Tanpa perbaikan di atas, dua-duanya percuma**: 29,71 GB ÷ 11 hari ≈ 2,7 GB/hari, jadi jatah
10 GB habis lagi dalam ~4 hari.

**Belum bisa dijawab:** porsi bot vs penonton asli — Logs Vercel kosong karena deployment paused
(tak ada request dilayani) + retensi log paket gratis pendek. Cek ulang lewat tab Logs/Firewall 1-2 hari
SESUDAH situs hidup.

**🔑 CARA MENGHIDUPKAN SITUS TANPA UPGRADE (temuan dari dokumentasi resmi Vercel):** dokumentasinya
menyatakan *"Paused projects resume one at a time, never automatically"* — jadi (a) menunggu reset
TIDAK menghidupkan situs sendiri, dan (b) ada tombol **Resume Project** yang **gratis**. Letaknya
**Project `dramaapp` → Settings → General → seksi "Pause Project"** (tepat di atas Delete Project) —
BUKAN di halaman Overview akun, di situ memang cuma ada tombol Upgrade. **Urutan wajib: push
perbaikan DULU, baru Resume** — kalau tidak, kuota terbakar lagi dalam hitungan jam.

**Audit kuota lain (2026-08-26):** Fast Data Transfer 23,11/100 GB & Fluid Active CPU 1j21m/4j ikut
turun sendiri sesudah perbaikan teaser. **Risiko #2 = ISR Writes 54K/200K** (proyeksi ~147K/bulan =
73%) dari `revalidate = 60` di 5 halaman — menaikkan ke 600 memotong ~10x, TAPI drama baru jadi muncul
dalam 10 menit (bukan 1 menit) → **belum dikerjakan, menunggu keputusan owner**. Aman & sudah dicek:
nol cron job, nol polling browser, Image Transformations 30 dari batas 5.000, `public/` cuma 19 KB.

**⚠️ Risiko yang tak bisa ditambal kode:** Hobby resmi dibatasi *"non-commercial, personal use only"*.
Kalau project ini dinilai komersial, Vercel bisa mem-pause karena kebijakan — bukan karena kuota.

**`/api/download` juga sudah diubah jadi redirect** (+ `tests/download-redirect.test.ts`, 6 tes).
Bukan penyebab aktif (tombol Unduh sudah langsung ke tunnel lewat `lib/video.ts:21`), tapi jalur
cadangan yang menyala persis saat keadaan kacau. `?dl=1` dikunci di tes supaya paksa-unduh tak hilang.
**Temuan terpisah (bukan akibat perubahan ini):** alamat tunnel tersimpan
`kelly-officials-laid-written.trycloudflare.com` **sudah mati** (`nslookup` → "Non-existent domain";
internet sesi normal, `example.com` → 200). Dugaan dari kode: PC backup melapor lewat **POST ke situs
Vercel** (`pc-backup-agent/start-video-services.ps1:203`) — situs paused → laporan gagal → alamat beku.
Kalau benar, begitu Vercel hidup PC backup bisa lapor lagi dan video pulih sendiri. **Belum diverifikasi.**

## 🎬 2026-08-25 — FILM TANPA EPISODE (panel admin) — SIAP, MENUNGGU 1 LANGKAH OWNER

Permintaan owner: selama ini "Tambah Drama" selalu menuntut jumlah episode; atasan mau menambah
**film utuh** yang tidak berepisode.

**Posisi sekarang (urutan aman sudah ditempuh: SQL dulu, kode belakangan):**
1. SELESAI — SQL `supabase_migrations/add_kind_to_dramas.sql` **sudah dijalankan owner di Supabase
   produksi** 2026-08-25 ("Success. No rows returned"). Diverifikasi baca dari lokal: kolom `kind`
   ada, semua judul lama bernilai `series` — nol perubahan pada data lama.
2. SELESAI — kode di-commit lokal: **`5156949`**.
3. SELESAI — **sudah di-push & TAYANG**. Push pertama dijalankan owner sendiri di PowerShell
   (sesi AI tak bisa membuka dialog login GitHub; sesudah owner login, kredensial tersimpan dan sesi
   AI bisa fetch/push lagi). Push ke `dramaku` sempat DITOLAK karena repo itu berisi 5 commit Playly
   rekan yang belum pernah masuk produksi → atas izin owner keduanya **digabung** (`e765e29`) dan
   dirilis bersama. Hasil akhir: lokal = `origin/main` = `dramaku/main` = `e765e29`, selisih NOL.
   **Terverifikasi tayang** di deployment `dpl_28aUguP18E7FpHXZ4grMFFi3Tp5w`: chunk produksi
   `/_next/static/chunks/3om_miassjcgs.js` memuat "Jenis tayangan" + "Film selalu gratis", dan
   `/admin/videos/playly` balas **200** (sebelumnya 404). Sebelum push: 358 tes lulus, `tsc` exit 0,
   `next build` sukses.
4. MENYUSUL — Run `supabase_migrations/mark_existing_movies.sql` untuk menandai 7 judul film lama
   (Transformers, Spider-Man, Avengers, Predator, 28 Years Later, Fireworks Wednesday, The Dark
   Knight) jadi Film. Boleh sebelum/sesudah deploy — kode lama mengabaikan kolom `kind`.

**Yang berubah untuk admin:** ada pilihan **Jenis tayangan: 📺 Serial / 🎬 Film** di form. Pilih Film →
kolom "Jumlah episode" hilang (sistem mengunci 1 video = `1.mp4`) dan centang "berbayar (koin)"
hilang. Draft IMDb bertipe movie otomatis memilih Film.

**Keputusan owner (popup 2026-08-25):** (a) film **100% gratis** dulu — sebabnya aturan koin
menggratiskan episode 1–3 (`FREE_EPISODES` di `lib/coins.ts`), jadi film 1 video akan gratis walau
dicentang berbayar; (b) kalau nanti film dibuat berbayar, harga acuan **20 koin** (belum dikerjakan);
(c) film **campur** dengan drama di katalog, dibedakan lewat tulisan "Film" di kartu — belum ada
saringan/menu khusus.

**Catatan katalog:** di database sekarang ada judul yang sebenarnya film tapi tersimpan sebagai
serial 1 episode (mis. `transformers-the-last-knight`, `avengers-doomsday`,
`spider-man-brand-new-day`). Setelah SQL dijalankan, ubah lewat Daftar Drama → Edit → Jenis
tayangan: Film → Simpan.

**Bukti uji (2026-08-25):** 302 tes lulus (2 berkas tes baru: `tests/drama-kind.test.ts`,
`tests/admin-drama-route.test.ts`), `tsc --noEmit` exit 0, `next build` sukses, dan halaman film
diperiksa di dev server mode data lokal: halaman detail tanpa daftar episode + JSON-LD `Movie`,
pemutar tanpa tombol episode & tanpa petunjuk "geser ke atas", kartu Discover/Shorts menulis "Film".
Rencana lengkap: `docs/lintasai/rencana/2026-08-25-tambah-film-tanpa-episode.md`.
## 🎬 VIDEO PLAYLY — TAMPIL OTOMATIS (2026-08-26)

Owner lapor lagi: video Playly **masih** belum masuk & tak bisa diputar di DramaKu.
Ditelusuri ulang dari nol. **Catatan 2026-08-25 di bawah ternyata sudah BASI** — jangan
dipakai sebagai dasar lagi.

### Yang ternyata SUDAH beres (bertentangan dengan catatan lama)

| Klaim catatan lama | Kenyataan 2026-08-26 |
|---|---|
| `/admin/videos/playly` **404**, push produksi tertahan 403 | ❌ SALAH — sudah **200**. `0e7a5c5` sudah ada di `dramaapp/main` (kini `7372259`) |
| Kunci `plyk_…` ditolak | ⚠️ BERUBAH-UBAH — pagi `ok:true count:4`, 20 menit kemudian `invalid_key` |

### Akar sebenarnya (3 lapis)

1. **Kaitan tersimpan tak pernah sampai produksi.** Sesi 25 Agt membuat kaitan di
   `data/playly.json` — berkas itu ada di `.gitignore:28`, sedangkan produksi membaca
   Supabase. Jadi "terbukti berhasil" itu benar, tapi hanya di 1 komputer.
2. **Kegagalan SENYAP.** `PlaylyRow.tsx:29` `return null` saat daftar kosong → seluruh
   barisnya hilang tanpa pesan. Owner tak melihat error karena memang tak ada yang dirender.
3. **Kunci sah tersimpan di nama env yang salah.** Kunci ada di `DASHBOARD_API_KEY`,
   sedangkan `getPlaylyKey()` hanya membaca `PLAYLY_API_KEY` → `configured:false` →
   halaman admin menulis "kunci belum dipasang" & pemilih video tak pernah muncul.
4. **Cacat desain**: video WAJIB dikaitkan ke drama. Isi Playly = trailer film, tak ada
   drama padanannya. Buktinya "Transformers 8" terpaksa dikaitkan ke drama
   `guru-misterius-membentuk-pasukan-rahasia` eps 1 hanya agar lolos validasi.

### Yang dikerjakan (keputusan owner lewat popup)

Video Playly kini **tampil OTOMATIS**, tak perlu dikaitkan ke drama:

- **Halaman baru `/playly`** + baris di `/discover` + tautan di TopNav.
- Sumber = **hanya video milik akun kita**. Dua jalur:
  1. kunci mitra `/api/videos` (kalau sah);
  2. **kunci ditolak → katalog publik `/api/catalog` DISARING nama kreator kita**
     (`DEFAULT_PLAYLY_CREATOR = "coklat"`, timpa lewat env `PLAYLY_CREATOR`).
  Jalur 2 ada karena kunci terbukti bisa dicabut sewaktu-waktu — tanpa itu video kita
  ikut lenyap tiap kali kunci mati.
- Admin bisa **menyembunyikan** video (daftar pengecualian `playly:hidden`, bukan daftar izin
  — supaya video baru tak perlu disetujui dulu).
- Daftar kosong **selalu menampilkan penjelasan**; tak boleh senyap lagi.

### ⚠️ Kunci Playly TIDAK ANDAL — jangan bergantung padanya

Diuji 2026-08-26: kunci yang sama dibalas `{"ok":true,"count":4}` lalu `{"ok":false,
"error":"invalid_key"}` 20 menit kemudian, konsisten 5×. Kunci mitra diterbitkan pengelola
Playly dan tampaknya berumur pendek. **Jalur katalog-tersaring membuat ini tidak lagi
memblokir apa pun.** Kartu "Video terbaru" (`lib/dashboard-videos.ts`) masih butuh kunci
dan TIDAK disentuh.

### Bukti (dijalankan, bukan dibaca)

- `/playly` lokal: **4 video milik `coklat` tampil**, 4 alamat embed, sampul ikut.
- **Nol kebocoran**: 11 video kreator lain (`viozahra`, `cantika`) semuanya tertahan.
- **Keempat video benar-benar mengalir**: HTTP 206, 512 KB masing-masing, `ftypisom`,
  kotak MP4 `[ftyp,free,mdat]`.
- Endpoint `hidden`: 401 tanpa sesi · 403 origin asing · sembunyikan/tampilkan jalan ·
  tak menggandakan · tipe salah ditolak 400.
- 357 tes lulus · `tsc` exit 0 · `next build` sukses · `/discover` **tetap Static 1m**
  (nol regresi performa).

### Video Playly tidak bisa dicoba dari `localhost`

Playly menolak domain tak terdaftar dengan "🔒 Situs ini belum diizinkan". Itu **normal**.
Daftar videonya tetap muncul di localhost; yang diblokir hanya pemutarannya.
Uji pemutaran lewat `dramaapp.vercel.app` (sudah terdaftar).

Rincian: [`docs/lintasai/rencana/2026-08-26-playly-video-otomatis.md`](./docs/lintasai/rencana/2026-08-26-playly-video-otomatis.md)


### 🎥 2026-08-25 — FILM BESAR TIDAK BISA DIPUTAR: akarnya BERKAS, bukan kode

Owner menambahkan film `over-your-dead-body` lewat panel admin (tersimpan benar: `kind=movie`,
1 video, gratis, subtitle id) tapi tidak bisa diputar. Ditelusuri sampai ke berkasnya. **Rantai
penyajian SEHAT** — tunnel 200, folder ada, `1.mp4` ada, `video/mp4`, Range → 206, codec H.264+AAC.
Dua angka ini yang membunuhnya:

| Fakta terukur | Angka |
|---|---|
| Ukuran & durasi film | 1,82 GB / 105 menit 20 detik |
| Aliran yang DIBUTUHKAN film | **281 KB/detik** (2,30 Mbps) terus-menerus |
| Kapasitas tunnel PC backup (diukur 2x: di film & di drama biasa) | **~180 KB/detik** (1,4 Mbps) |
| "Daftar isi" MP4 (box `moov`) | ada di **UJUNG** berkas, **5,1 MB** → browser wajib mengunduhnya dulu = **~28 detik layar kosong** sebelum gambar pertama |
| Pembanding: 1 episode drama biasa | 12,7 MB → ringan, itulah sebabnya drama selama ini aman |

**Kesimpulan:** selama film disajikan dari PC backup lewat quick tunnel, film sebesar ini TIDAK akan
mulus. Berlaku untuk SETIAP film, bukan judul ini saja. Cara mengukurnya ulang: `curl -H "Range:
bytes=0-2097151"` ke berkasnya, bandingkan `speed_download` dengan (ukuran / durasi).

**Keputusan owner 2026-08-25:** perkecil filmnya sekali jalan (720p ~1 Mbps + `+faststart`).
Alatnya sudah disiapkan & lolos uji parser PowerShell 5.1: **`pc-backup-agent/optimalkan-film.ps1`**
(commit `2dffd3a`). Jalankan di PC backup, PowerShell:

    powershell -ExecutionPolicy Bypass -File optimalkan-film.ps1 -DramaId over-your-dead-body

Berkas asli TIDAK dihapus (disimpan jadi `1.asli.mp4`). Butuh `ffmpeg`; kalau belum terpasang script
berhenti sopan sambil menyebut cara memasangnya (`winget install --id Gyan.FFmpeg -e`).

#### Hasil optimalkan-film.ps1 pada `over-your-dead-body` (2026-08-25, terukur dari luar)

| Ukuran | Sebelum | Sesudah |
|---|---|---|
| Berkas | 1.818 MB | **895 MB** (turun 50,8%) |
| Aliran yang dibutuhkan | 281 KB/detik | **138 KB/detik** |
| Kapasitas tunnel (diukur ulang) | ~180 KB/detik | ~200 KB/detik |
| Kelegaan | 0,64x (KURANG) | **1,45x (CUKUP)** |
| Letak "daftar isi" (moov) | ujung berkas, 5,1 MB | **depan berkas, 3,0 MB** |
| Jeda sebelum gambar muncul | ~28 detik | **~19 detik** (diukur: 3,2 MB dalam 18,96 detik) |

Encode memakai **GPU AMD (`h264_amf`)** — terdeteksi otomatis oleh script; 105 menit film selesai
dalam **15 menit** (speed 6,95x). NVIDIA memang tidak ada di PC backup (`nvcuda.dll` tak ada), dan
itu normal.

**Jujur soal yang BELUM beres:** jeda awal ~19 detik tidak hilang, hanya berkurang. Sebabnya film
panjang punya daftar isi (moov) berukuran MB yang wajib dimuat lengkap sebelum frame pertama.
Menghilangkannya butuh langkah lain (fragmented MP4 atau HLS) - belum dikerjakan, belum diminta.

**Batas kapasitas:** kelegaan 1,45x itu untuk SATU penonton. Dua orang menonton film bersamaan =
kapasitas terbagi -> buffering lagi. Kalau film jadi banyak ditonton, jalur CDN (opsi yang tadi tidak
diambil) yang menyelesaikannya.

**Opsi yang TIDAK diambil (kalau nanti berubah pikiran):** (a) hanya `+faststart` tanpa memperkecil —
mulai instan tapi tetap buffering; (b) pindah film ke CDN (R2/Bunny) — permanen, berbayar bulanan;
(c) sediakan 2 versi (kode sudah mendukung varian `1.720p.mp4`, lihat `lib/video.ts`).

## 🔴 SEDANG DIKERJAKAN: video mati berulang → dibikin PERMANEN

> ## ✅ SEJAK 2026-08-22 SORE: ALAMAT VIDEO DIURUS OTOMATIS — JANGAN TEMPEL MANUAL LAGI
>
> **JANGAN mencari/menghafal alamat tunnel di berkas ini lagi.** Alamat berganti tiap PC backup
> restart dan **dilaporkan sendiri** oleh PC backup ke database. Cara melihat alamat yang
> benar-benar dipakai (login admin):
> `https://dramaapp.vercel.app/api/agent/video-base` → lihat field `dipakai` + `sumber`.
>
> **JANGAN jalankan `start-dramaapp.ps1` lagi** dan **jangan menempel alamat ke env Vercel** —
> keduanya cara lama. Env `NEXT_PUBLIC_VIDEO_BASE_URL` kini hanya cadangan; kalau baris DB ada,
> env TIDAK dipakai.
>
> Video mati? Di PC backup, **PowerShell sebagai Administrator**, urut:
> 1. `Test-Path C:\Users\USER\pc-backup-agent\start-video-services.ps1` → `False` = berkasnya
>    hilang, itu akarnya (lihat pemulihan di bagian 2026-08-24).
> 2. `schtasks /run /tn "DramaApp Video Watchdog"` → **tunggu 3 menit penuh**, jangan dibaca lebih cepat.
> 3. `Get-Content C:\Users\USER\pc-backup-agent\logs\start-video-services.log -Tail 25` →
>    **cocokkan JAM baris terakhir dengan jam sekarang** sebelum menyimpulkan apa pun.
>
> `SUCCESS: Attempted to run...` **bukan** tanda berhasil — lihat pelajaran 2026-08-24.

### 🆕 2026-08-26 — siklus ke-5: berkas yang SAMA hilang LAGI. PULIH & TERVERIFIKASI

Owner lapor video tak bisa diputar pagi hari. Akarnya **persis siklus ke-4**:
`start-video-services.ps1` **hilang lagi** dari `C:\Users\USER\pc-backup-agent\`. Nol perubahan kode.

**Urutan bukti yang membuat diagnosa cepat (ikuti urutan ini):**
1. Alamat di halaman produksi (`entered-paradise-occasions-neighborhood`) → DNS **Non-existent
   domain**, bukan 530. Bedanya penting: 530 = tunnel ada tapi tak melayani; DNS hilang = tunnel
   benar-benar lenyap, jadi cloudflared sudah berhenti.
2. `Test-Path C:\Users\USER\pc-backup-agent\start-video-services.ps1` → **False**.
3. `schtasks /query /tn "DramaApp Video Watchdog" /v /fo LIST` → **`Last Result: -196608`**,
   `Last Run Time 26/08/2026 08:50:01`, `State: Enabled`, `Task To Run` menunjuk berkas yang hilang.

**⚠️ DUGAAN AWAL YANG SALAH (jangan diulang):** "penjaga tak bereaksi = PC backup tidak nyala."
KELIRU — PC nyala dan penjaga jalan tiap 15 menit, hanya saja menembak berkas kosong lalu mati
senyap. Yang memutuskan status PC adalah `Last Run Time` di `schtasks`, BUKAN penalaran dari gejala
luar. Baca `schtasks` sebelum menyimpulkan apa pun soal PC nyala/mati.

**⏱️ JEDA ~24 JAM antara sebab dan gejala — ini yang paling menipu.** Log melompat dari
`2026-08-25 08:50:35 === SELESAI ===` langsung ke `2026-08-26 08:59:00`. Berkas sudah hilang sejak
~25 Agt pagi, tapi video baru mati 26 Agt pagi karena tunnel yang terlanjur dibuat 25 Agt masih
hidup seharian sampai mati sendiri semalam. **Jangan cari penyebab di jam kejadian — cari di baris
terakhir log SEBELUM lompatan waktu.**

**Pemulihan yang berhasil (urutan ini yang dipakai):**
1. Unduh ulang dari raw GitHub repo publik `masradenbagus89-ui/dramaapp` branch `main` ke
   `C:\Users\USER\pc-backup-agent\start-video-services.ps1`.
2. **Verifikasi SHA256 SEBELUM dijalankan** (§5.4 melarang unduh-lalu-jalankan buta):
   `55A1423EB853F85E7ADCBCE5006B7E8DCFF493490F151A73EC6F98A906CEDFC9`, **30.427 byte** = commit
   `ba82058`. Sidik jari raw GitHub sudah dicocokkan dengan salinan di repo — identik.
3. `schtasks /run /tn "DramaApp Video Watchdog"` → tunggu 3 menit penuh.

**Bukti pulih — diukur dari LUAR, bukan dari log PC backup:** alamat baru
`kelly-officials-laid-written.trycloudflare.com` → root **200** · `diremehkan-sebagai-gadis-desa-.../1.mp4`
**200** dengan `Content-Type: video/mp4`, `Content-Length: 40.187.380`, `Accept-Ranges: bytes` ·
Range → **206** · 12 byte pertama **`ftypmp42`** (MP4 asli) · ep 2/10/30/56 → **200** ·
`/_agent/health` → `{"ok":true}` · halaman produksi sudah menyajikan alamat baru.

**🟠 TERSANGKA TERIDENTIFIKASI (2026-08-26) — antivirus KEDUA: `360 Total Security`.** Kenapa berkas
ini hilang DUA KALI (24 Agt & ~25 Agt) sementara tetangganya di folder yang sama (`Caddyfile`,
`hardlink-agent.js`, `start-dramaapp.ps1`, `optimalkan-film.ps1`) utuh terus — pertanyaan ini akhirnya
punya arah. Hasil `Get-CimInstance -Namespace root\SecurityCenter2 -ClassName AntiVirusProduct`:

```
displayName
-----------
Windows Defender
360 Total Security
```

**Inilah lubang diagnosa 2026-08-24.** Waktu itu hanya Defender yang diperiksa (`Get-MpThreat`
kosong) lalu dugaan "antivirus" DICORET — padahal di PC ini ada antivirus KEDUA yang tidak pernah
disentuh pemeriksaan. Pelajaran: jangan menyimpulkan "bukan antivirus" dari Defender saja; daftar
lengkap ada di `root\SecurityCenter2`, dan itu perintah pertama yang harus dijalankan.

**Status: tersangka KUAT, belum terbukti.** Yang sudah pasti: 360 Total Security terpasang. Yang
BELUM: apakah dia yang mengarantina berkas itu. 360 tidak punya cmdlet PowerShell seperti Defender,
jadi riwayat karantinanya hanya bisa dibaca dari aplikasinya sendiri (GUI).

**Langkah berikutnya (menunggu owner):**
1. Buka aplikasi 360 Total Security → bagian Quarantine / Karantina → cari `start-video-services.ps1`
   bertanggal 24 atau 25 Agt. Ketemu = terbukti, dugaan berubah jadi fakta.
2. Tambahkan folder `C:\Users\USER\pc-backup-agent` ke White List / Trust List 360 Total Security.
3. Defender juga (murah, sekalian): `Add-MpPreference -ExclusionPath "C:\Users\USER\pc-backup-agent"`.

Exclusion TIDAK dipasang otomatis oleh script mana pun — itu melemahkan pemindaian di folder tsb dan
harus jadi keputusan sadar pemilik PC (§5.3).

**Kalau langkah di atas tidak dikerjakan:** video TIDAK akan mati seperti dulu — penjaga berkas
sudah aktif dan terbukti memulihkan. Risiko sisanya: kalau 360 menghapus berkas berulang dalam 1 jam,
penjaga berhenti di pemulihan ke-2 (sesuai rancangan) dan barulah video bisa mati lagi.

**✅ PENJAGA PERMANEN DIBANGUN (izin owner 2026-08-26)** — supaya siklus ke-6 tidak lagi berujung
video mati diam-diam. Tiga berkas di `pc-backup-agent/`:

| Berkas | Peran |
|---|---|
| `penjaga-berkas.ps1` (BARU) | tugas "DramaApp Penjaga Berkas" tiap 10 menit; berkas penting yang hilang dipulihkan dari `cadangan\` |
| `pasang-penjaga.ps1` (BARU) | pemasang sekali-jalan; membuktikan sendiri tugasnya jalan lewat pertambahan baris log, bukan lewat `SUCCESS: Attempted to run` |
| `start-video-services.ps1` (+ fungsi `Pastikan-Penjaga`) | arah sebaliknya: memulihkan penjaga kalau justru penjaganya yang raib |

Dua arah itu disengaja — tidak ada satu berkas pun yang kalau hilang mematikan seluruh rantai tanpa
ada yang mengembalikannya.

**Dua batas yang SENGAJA dipasang (jangan "diperbaiki" jadi tak terbatas):**
1. Penjaga BERHENTI memulihkan setelah **2 kali dalam 1 jam** untuk berkas yang sama, lalu menulis
   `!!! BERHENTI MEMULIHKAN`. Memulihkan terus hanya menutupi gejala sementara akarnya (antivirus)
   tidak tersentuh — dan log yang penuh pemulihan berhasil justru menyamarkan masalahnya.
2. Penjaga **TIDAK** mengunduh dari internet. Itu pola "unduh-lalu-jalankan" yang dilarang §5.4 —
   satu repo dibajak = PC backup ikut jatuh. Kalau cadangan ikut hilang, pemulihan tetap oleh
   manusia dengan pencocokan SHA256, seperti pagi ini.

**Bukti diuji — 6 skenario di folder simulasi, PC backup NOL disentuh:** cadangan dibuat ✅ ·
`semua berkas utuh` saat sehat ✅ · berkas hilang → dipulihkan ✅ · dihapus 3× berturut-turut →
pemulihan ke-1 & ke-2 jalan, percobaan ke-3 BERHENTI + exit 1 ✅ · aktif + cadangan sama-sama hilang
→ GAGAL + exit 1 ✅ · isi berkas diubah → **cadangan yang disegarkan, update TIDAK dibatalkan** ✅.
`Pastikan-Penjaga` diuji terpisah 4 skenario (diam saat sehat · pulihkan cadangan · pulihkan utama ·
keduanya hilang → peringatan, exit 0 supaya start service tidak ikut gagal) ✅. Sintaks kedua script
lolos `PSParser::Tokenize` ✅.

**🐞 BUG DITEMUKAN SAAT UJI, diperbaiki sebelum sampai ke PC backup:** `schtasks` menolak `/tr` yang
lebih dari **261 karakter**, dan pesan errornya tidak menyebut solusinya sama sekali. Untuk path
`C:\Users\USER\pc-backup-agent` perintahnya **166 karakter (aman)**, tapi `pasang-penjaga.ps1`
sekarang memeriksa panjang itu sendiri dan berhenti dengan angka yang jelas. Rumus pengutipan `\"`
juga sudah diuji nyata: tugas dibuat → dibaca balik dari Windows (path berkutip utuh) → dihapus.

**✅ AKTIF DI PC BACKUP sejak 2026-08-26 09:58** (dipasang owner). Bukti dari layar PC backup:
ketiga berkas diunduh dengan **SHA256 COCOK** · folder `cadangan\` dibuat + 4 berkas disalin · tugas
"DramaApp Penjaga Berkas" terdaftar (tiap 10 menit, SYSTEM) · gerbang bukti di pemasang lolos:
`=== TERBUKTI JALAN - 1 baris baru di log ===` berisi `2026-08-26 09:58:02  semua berkas utuh
(4 diperiksa)`.

**✅ PEMULIHAN NYATA TERBUKTI DI PC BACKUP 2026-08-26 10:47** — bukan lagi simulasi. Owner menghapus
`start-video-services.ps1` lalu MENUNGGU tanpa menyentuh apa pun. Isi `logs\penjaga-berkas.log`:

```
2026-08-26 10:07:07  semua berkas utuh (4 diperiksa)
2026-08-26 10:17:07  semua berkas utuh (4 diperiksa)
2026-08-26 10:27:07  semua berkas utuh (4 diperiksa)
2026-08-26 10:37:07  semua berkas utuh (4 diperiksa)
2026-08-26 10:47:07  !!! DIPULIHKAN start-video-services.ps1 - berkas aktif HILANG, dikembalikan dari cadangan (pemulihan ke-1 dalam 1 jam)
```

`Test-Path` balas `True`. DUA hal terbukti sekaligus: (a) berkas hilang dipulihkan SENDIRI tanpa
manusia; (b) **detak 10 menit yang rapi** — justru inilah yang dulu tidak ada. Lompatan jam di log
sekarang langsung terlihat kalau penjaganya sendiri berhenti, jadi kegagalan tidak bisa senyap lagi.
Diverifikasi juga dari luar saat berkas sedang terhapus: tunnel & video tetap **200** — menghapus
script memang tidak mematikan tunnel yang sudah berjalan, itu sebabnya uji ini aman.

⚠️ CATATAN UJI: `schtasks /run /tn "DramaApp Penjaga Berkas"` butuh PowerShell **Administrator**;
tanpa itu balasannya `ERROR: Access is denied` dan penjaga tidak dipicu sama sekali — `Test-Path`
lalu balas `False` yang MENIPU (terlihat seperti penjaga gagal, padahal belum jalan). Siklus
otomatisnya TIDAK butuh admin. Jadi untuk membuktikan, MENUNGGU 10 menit lebih baik daripada memicu
manual: jalur yang diuji sama dengan jalur yang dipakai sehari-hari.

### 🆕 2026-08-24 — siklus ke-4: akarnya PEMASANGAN, bukan kode. PULIH & TERVERIFIKASI

Owner lapor video tak bisa diputar. Penelusuran ±3 jam; ringkasan supaya sesi berikut tidak
mengulanginya. Alamat aktif saat ini `boats-voluntary-ensure-kim.trycloudflare.com` (jangan dihafal —
akan berganti; baca `GET /api/agent/video-base` sebagai admin).

**Dua akar yang sebenarnya — keduanya di PC backup, nol perubahan kode:**

1. **`start-video-services.ps1` TIDAK ADA** di `C:\Users\USER\pc-backup-agent\`. Folder & berkas
   lain (`Caddyfile`, `hardlink-agent.js`, `start-dramaapp.ps1`, `logs\`) utuh — hanya berkas ini
   yang hilang. Dipulihkan dengan mengunduh dari raw GitHub lalu `Copy-Item` ke folder tujuan.
2. **Tugas `DramaApp Video Watchdog` belum pernah dibuat.** Ketahuan dari lompatan 63 menit di log
   2026-08-22 (17:31 → 18:34) — kalau terpasang, script menulis log tiap 15 menit walau hasilnya
   "tidak ada yang perlu diperbaiki". Sudah dibuat sekarang; inilah yang membuat rantai
   self-healing sungguhan.

**PELAJARAN — 3 gejala yang MENIPU (ini yang memakan waktu):**

- **`SUCCESS: Attempted to run the scheduled task` TIDAK berarti script jalan.** Ia hanya berarti
  Windows berhasil memanggil `powershell.exe`. Berkas hilang → PowerShell mati seketika, tugas
  `-WindowStyle Hidden` jadi tak meninggalkan jejak di layar maupun di log.
- **`Last Result: -196608`** (`schtasks /query /v /fo LIST`) = `powershell.exe` keluar karena
  argumen `-File` menunjuk berkas yang tidak ada. **Ini penanda tercepat** untuk kasus ini.
- **Log jam lama = script tidak jalan.** Selalu cocokkan JAM baris terakhir dengan jam sekarang
  sebelum menyimpulkan apa pun dari isi log.

**Cara menilai lognya (urutan yang benar):** `Test-Path <script>` → `Last Result` → jam baris
terakhir di `start-video-services.log` → baru isinya.

**Salah diagnosis yang sempat diambil (jangan diulang):** (a) "Defender mengarantina" — GUGUR,
`Get-MpThreat` kosong; (b) "jaringan memblokir cloudflared" — keliru, yang rusak **DNS** dan
sifatnya sementara (`getaddrinfo` gagal untuk `api.trycloudflare.com` DAN `dramaapp.vercel.app`
pada jam yang sama, lalu normal lagi sendiri).

**🐞 BUG SUDAH DIPERBAIKI & DI-PUSH `ba82058` (izin owner 2026-08-24) — mis-parse alamat tunnel.**
Perbaikan: saringan di [`start-video-services.ps1:522`](./pc-backup-agent/start-video-services.ps1)
membuang `https://api.trycloudflare.com` dari hasil pencarian, + lapis kedua `HOST_TERLARANG` di
[`lib/video-base.ts`](./lib/video-base.ts) yang menolaknya walau suffix-nya sah. Bukti: **283 tes
lulus** (naik dari 281, +2 tes regresi di `tests/video-base.test.ts`) · `tsc --noEmit` exit 0 ·
script PowerShell lolos parser · logika saringan diuji dengan teks log ASLI dari kejadian
2026-08-24 (kasus gagal → 0 alamat, kasus berhasil → alamat asli tetap terambil).
Sudah tayang di raw GitHub (30.427 byte, dicocokkan persis dengan berkas yang diuji). **PC backup
masih memakai salinan LAMA** sampai di-download ulang — tidak mendesak, karena lapis kedua di situs
sudah menolak alamat itu dengan 400 sehingga database tetap aman.
Catatan koreksi: dampak bug ini lebih kecil dari dugaan awal — `Cek-Sudah-Sehat`
([`:322`](./pc-backup-agent/start-video-services.ps1)) menilai sehat lewat SITUS dan hanya menerima
200/206, jadi alamat sampah akan tetap memicu bangun-ulang di siklus watchdog berikutnya. Yang
dirugikan: jendela ≤15 menit video mati + gejala 404 yang menyesatkan saat didiagnosis.
Uraian aslinya:
[`start-video-services.ps1:522`](./pc-backup-agent/start-video-services.ps1) mencari alamat dengan
pola `https://[a-z0-9-]+\.trycloudflare\.com` di log cloudflared. Saat pembuatan tunnel GAGAL,
cloudflared mencetak pesan error yang memuat `Post "https://api.trycloudflare.com/tunnel"` —
dan pola itu menangkapnya sebagai "alamat tunnel". Terjadi nyata 2026-08-24 12:00:27.
**Bahayanya:** `api.trycloudflare.com` **LOLOS allowlist** (`lib/video-base.ts` hanya memeriksa
akhiran `.trycloudflare.com`), jadi kalau DNS normal script akan **menyimpan alamat sampah itu ke
database** → video mati tapi semua indikator hijau. Kali ini justru DNS mati yang menyelamatkan.
**Perbaikan yang disarankan:** tolak host `api.trycloudflare.com` saat penangkapan alamat, dan
pertimbangkan menolaknya juga di `isAllowedVideoBase()` sebagai lapis kedua.

**Bukti pulih 2026-08-24 15:14–15:20** (diukur dari jaringan LAIN, bukan dari PC backup):
`/api/teaser` **206** di ep 1/27/56 · `content-type: video/mp4` · 1.048.576 byte · signature
**`ftypmp42`** · root tunnel balas **200** (bukan 530). Log PC backup memuat `TERSAMBUNG ke edge`
+ `alamat DILAPORKAN & tersimpan` + `TERBUKTI ujung-ke-ujung`.

### 🆕 2026-08-22 — alamat video jadi RUNTIME CONFIG (kode selesai, tinggal dipasang di PC backup)

Akar masalah "video mati tiap PC restart" **dihapus tanpa named tunnel**. Alamat tidak lagi
dibakar saat build; kini dibaca dari Supabase `app_data` key `videobase`, dan PC backup
**melapor sendiri** tiap dapat alamat baru → tidak perlu redeploy, tidak perlu `VERCEL_TOKEN`,
tidak perlu tempel manual, tidak perlu domain.

| Berkas | Perannya |
|---|---|
| `lib/video-base.ts` | `getVideoBaseUrl()` (baca DB, **fallback ke env lama**) + `isAllowedVideoBase()` (pagar keamanan) |
| `lib/store.ts` | `getVideoBaseRecord` / `setVideoBaseRecord` (pola sama dengan `getTwoFA`) |
| `app/api/agent/video-base/route.ts` | **titik-risiko** — POST dari PC backup; 3 lapis: rate-limit 2 kunci → banding rahasia hash+timing-safe → allowlist host |
| `pc-backup-agent/start-video-services.ps1` | **mode QUICK/NAMED otomatis**; mode QUICK menjalankan tunnel lalu melapor |
| `tests/video-base.test.ts` | 16 tes pagar keamanan (host menyamar, http, port, path, kredensial) |

**Kenapa allowlist wajib:** alamat ini nanti di-`fetch` oleh server kita sendiri
(`app/api/teaser/route.ts:31`) — jadi ini jalur **SSRF-tersimpan**. Allowlist-lah yang
memblokir `localhost` / `169.254.169.254` / IP internal. Jangan dilonggarkan.

**Bonus yang ikut beres:** `DramaCard`/`ContentRow` tidak lagi membaca env di browser (pakai
`/api/teaser` seperti hero), dan prop `baseUrl` di `HomeHero` yang ternyata **tak pernah dipakai**
sudah dibuang. Efeknya `/beranda` & `/discover` **tetap ISR 60 detik** — dikonfirmasi di output
`next build` (`○ Static … 1m`), jadi performa yang sudah diukur sehat tidak berubah.

Bukti: **281 tes lulus** (naik dari 265) · `tsc --noEmit` exit 0 · `next build` sukses ·
route `/api/agent/video-base` terdaftar di `app-path-routes-manifest.json`.

#### 🔍 Audit adversarial 2026-08-22 — 7 temuan diperbaiki (dari 30, 23 ditolak verifikasi)

Kode di atas diaudit 65 agent dengan 4 lensa; tiap temuan wajib lolos 2 skeptik independen.
Yang lolos sudah diperbaiki:

| # | Temuan | Perbaikan |
|---|---|---|
| **1 BLOCKER** | Baris DB **selalu menang** atas env & tak pernah kedaluwarsa, mode NAMED tak pernah melapor, tak ada cara menghapus → saat named tunnel dipasang nanti, situs **tetap** menyajikan alamat quick tunnel yang sudah lenyap, padahal env/service/curl semua tampak hijau | `$NAMED_URL` di script + **mode NAMED ikut melapor**; `DELETE /api/agent/video-base` (admin) untuk mengosongkan; `GET` menambah field `sumber`; README diluruskan |
| **2** | Mode QUICK dibatalkan kalau port **8089** mati — padahal video dilayani **8088** (Caddy); 8089 cuma untuk tombol Scan | Syarat diturunkan ke Caddy saja; agent mati = peringatan, bukan pembatalan |
| **3** | Kuota rate-limit global dihitung **sebelum** auth → orang luar bisa membanjiri endpoint tanpa tahu rahasia, menghabiskan kuota, lalu laporan sah PC backup ditolak 429. Pagar keamanan jadi tombol mematikan video | Auth **dulu**; kuota hanya dikenakan pada percobaan yang **gagal** auth |
| **4** | Allowlist host hanya menjaga alamat **awal** — `fetch` mengikuti redirect, jadi upstream bisa membelokkan server kita ke IP internal/metadata cloud (SSRF) | `redirect: "manual"` di **semua** fetch ke sumber video; di `hardlink` ini juga mencegah `x-agent-secret` ikut terkirim ke host redirect |
| **4b** | `/api/teaser` & `/api/download` menyalin `Content-Type` upstream mentah — jalur ini **same-origin**, jadi upstream yang mengaku `text/html` dirender browser di domain kita (XSS) | Dipaksa `video/mp4` + `X-Content-Type-Options: nosniff` |
| **5** | `cloudflared` autoupdate bisa restart sendiri → hostname berganti diam-diam, alamat terlapor jadi basi | `--no-autoupdate` |
| **6** | Kalau lapor gagal, DB **sudah basi** (tunnel lama dibunuh duluan) tapi pesan bilang aman, dan jalan mundur "tempel ke env" **tidak berfungsi** (env kalah dari DB) | Pesan diluruskan + perintah POST manual siap-salin dicetak ke log |
| **7** | Bagian Verifikasi README hanya sahih untuk mode NAMED → pemakai mode QUICK dapat 3 kegagalan palsu | Verifikasi dipecah: langkah bersama + tambahan khusus NAMED |

Pemeriksaan kesiapan tunnel juga dilonggarkan dari "2xx/3xx" ke **HTTP < 500** — tunnel sehat
yang membalas 404/405 di root dulu dianggap gagal sehingga alamatnya tak pernah dilaporkan.

✅ **AKTIF & TERBUKTI JALAN — 2026-08-22 15:23.** Rantai lengkap berhasil untuk pertama kalinya:
PC backup menjalankan tunnel sendiri lalu **melapor sendiri**, dan situs langsung memakai alamat
baru **tanpa redeploy dan tanpa owner menyentuh Vercel**.

Bukti dari log PC backup (`logs\start-video-services.log`):

```
15:22:42  caddy: C:\Users\USER\AppData\Local\...\WinGet\Packages\CaddyServer.Caddy_...\caddy.exe
15:22:47  cloudflared: C:\Users\USER\cloudflared.exe
15:23:00  tunnel balas HTTP 530 (belum nyambung ke Caddy), tunggu...
15:23:04  tunnel terbukti dijawab server (HTTP < 500)
15:23:06  [QUICK] alamat DILAPORKAN & tersimpan: https://inspection-says-without-sam...
```

Perhatikan 15:23:00 → 15:23:04: tunnel sempat 530 dan script **menolak melaporkannya** sampai
benar-benar melayani. Tanpa penjaga itu, alamat "tunnel yatim" akan tersimpan dan video mati —
persis jebakan yang menggigit 4 kali sebelumnya.

Bukti dari produksi: `/api/teaser` **206** di 3 drama berbeda; 1.048.576 byte terunduh dengan
`content-type: video/mp4` dan signature `ftypmp42`; bundle produksi **nol** alamat tunnel
(artinya alamat memang datang dari database, bukan dari build).

### 🔴 PELAJARAN TERPENTING 2026-08-22: QUIC diblokir → 530 yang menyamar jadi "tunnel yatim"

Sebagian besar waktu seharian itu habis karena **gejalanya berbohong**. Tunnel selalu punya
DNS hidup dan setiap langkah pemasangan melapor sukses, tapi Cloudflare membalas **530** ke
semua orang. Penyebabnya baru terbaca dari `logs\cloudflared.err.log`:

```
ERR Failed to dial a quic connection error="failed to dial to edge with quic:
    timeout: handshake did not complete in time"
```

**Jaringan PC backup memblokir QUIC (UDP 7844)** — protokol bawaan cloudflared ke edge.
Tunnel jadi *terdaftar* (DNS hidup) tapi tidak pernah *tersambung*. Dari luar, gejalanya
identik dengan tunnel yatim, jadi berulang kali salah didiagnosis.

**Obatnya:** `--protocol http2` (TCP 443). Sudah dipasang di script untuk mode QUICK.
Untuk named tunnel nanti: `protocol: http2` di `config.yml`.

**Cara mendeteksi cepat lain kali** — jangan tebak dari luar, baca dari cloudflared sendiri:
baris **`Registered tunnel connection`** di `logs\cloudflared.err.log` = benar-benar tersambung.
Kalau tidak ada baris itu, tunnel belum melayani berapa pun DNS-nya terlihat hidup.
Script sekarang menunggu baris itu dan mencatatnya.

⚠️ **Mendapat ALAMAT ≠ TERSAMBUNG.** cloudflared mencetak alamat lebih dulu, baru menghubungi
edge. Jangan pernah menyimpulkan sehat hanya karena alamat sudah muncul.

**Bukti berhasil (2026-08-22 18:35):** log memuat `TERSAMBUNG ke edge` + `TERBUKTI
ujung-ke-ujung`; dari produksi `/api/teaser` **206 di 5 dari 5 drama**, 1.048.576 byte
`video/mp4` `ftypmp42`; tunnel diuji dari jaringan lain balas **200** (bukan 530).

**Empat kegagalan pemasangan yang terjadi & sudah diperbaiki** (jangan terulang di PC lain):
0. **QUIC diblokir** (di atas) — akar yang sebenarnya.
0b. **`Invoke-WebRequest -Headers @{Range=...}` dilarang di PowerShell 5.1** (`ArgumentException`,
   tanpa `.Response` → terbaca "kode 0"). Ini membuat penjaga 15 menit selalu memvonis rantai
   rusak lalu **membangun ulang tunnel terus-menerus**. Wajib `HttpWebRequest.AddRange`.
1. Tugas terjadwal jalan sebagai **SYSTEM** (`DESKTOP-...$`), yang **tidak** mewarisi PATH akun
   user → `caddy.exe tidak ketemu`. Diperbaiki: `Cari-Exe` membaca PATH dari **registry**
   (mesin + tiap profil user).
2. `caddy` dipasang lewat **winget**, jadi binernya di dalam profil user dengan nama folder
   bervensi. Diperbaiki: pencarian wildcard ke `WinGet\Links`, `WinGet\Packages\*`, `scoop\shims`,
   dan root profil user (yang terakhir menangkap `cloudflared.exe`).

**Status 2026-08-22 — siklus ke-3, PULIH & TERVERIFIKASI.** Owner lapor video tak bisa diputar.
Diukur langsung: alamat yang dipakai produksi saat itu (`mac-carroll-flows-holly.trycloudflare.com`)
sudah **LENYAP** (`nslookup` → `Non-existent domain`, `curl` → 000), dan `/api/teaser` balas **502**
= `app/api/teaser/route.ts:62` "Sumber video sedang mati" — bukti dari sisi **server Vercel**, bukan
cuma jaringan lokal. Situs sendiri sehat (`/beranda` 200).

Pemulihan: `start-dramaapp.ps1` di PC backup ([5/6] gagal 403 seperti biasa) → alamat baru ditempel
manual ke env + **Redeploy tanpa build cache**. Diverifikasi **4 gerbang, semua LULUS**:

| Gerbang | Hasil |
|---|---|
| Bundle produksi memuat alamat yang benar | ✅ `therefore-donna-crops-doctors` (dicocokkan **persis**, bukan sekadar "bukan yang lama") |
| DNS alamat itu | ✅ hidup |
| `/api/teaser` (server Vercel → sumber) | ✅ **206** (bukan 502) |
| Isi berkas `1.mp4` | ✅ **206** `video/mp4`, signature **`ftypmp42`** = MP4 asli, bukan halaman error menyamar |

Diuji juga langsung ke tunnel: **8 dari 10** drama pertama punya `1.mp4` sah. Yang 404:
`28-years-later-the-bone-temple`, `avengers-doomsday` — memang belum ada berkasnya (bukan masalah
tunnel). Jangan pakai keduanya sebagai bahan uji.

✅ **`/_agent/health` TERJAWAB — kini balas 200** `{"ok":true,"videoRoot":"C:\\Users\\USER\\Downloads\\video","port":8089}`.
Dugaan lama "agent tak terjangkau" (404 pada 2026-08-20) **GUGUR** — itu gejala tunnel yang sudah
mati, bukan soal agent.
❓ **Masih terbuka:** apakah `hardlink-agent.js` di PC backup sudah versi baru. Jalur `/health`
(`hardlink-agent.js:243`) cuma balas `ok/videoRoot/port` **tanpa menyebut versi**, jadi 200 TIDAK
bisa dipakai menyimpulkan itu. Hanya memengaruhi "Scan & auto-hardlink", bukan pemutaran video.

⚠️ **PELAJARAN BARU 2026-08-22 — "tunnel yatim" balas 530.** Owner menjalankan `start-dramaapp.ps1`
**dua kali**, jadi dua alamat tercetak di layar. Run kedua membunuh cloudflared run pertama
(`start-dramaapp.ps1:81`), **tapi catatan DNS-nya tertinggal** → alamat run pertama tetap resolve
di DNS namun balas **530** (nama terdaftar, tak ada yang menjawab di ujung). Menempel alamat itu =
video tetap mati dengan sebab yang sulit dilacak, karena cek DNS saja akan terlihat "hijau".
**Aturan: selalu pakai alamat dari run TERAKHIR, dan verifikasi `curl` root balas 200 — bukan cuma
DNS.** Jangan jalankan script lagi setelah alamatnya ditempel ke Vercel; alamat itu langsung basi.

⚠️ **Koreksi catatan lama:** "utang `VERCEL_TOKEN` GUGUR" itu **baru berlaku SESUDAH named tunnel
terpasang**. Selama masih quick tunnel, token mati = tiap restart PC owner harus tempel alamat
manual. Sudah menggigit 3 kali.

<details><summary>Riwayat siklus 1-2 (2026-08-20, usang — jangan dipakai sebagai status)</summary>

- **Sore:** tunnel `written-coated-drawings-joe` balas 200, `/_agent/health` `{"ok":true}`,
  `guru-misterius-.../1.mp4` 200. Jadi 404 yang sempat terlihat bukan tunnel mati, melainkan
  berkas yang dicari memang tak ada di folder drama itu (kasus "Over Your Dead Body",
  lihat "Belum selesai" no.1).
- **Malam:** alamat sore itu lenyap → dipulihkan ke `proxy-marks-isolation-subjects`,
  diverifikasi 206 `video/mp4` + `ftypmp42`.
- Sesudah itu sempat berganti lagi ke `mac-carroll-flows-holly` (tak tercatat di sesinya) —
  dan itu pun sudah mati per 2026-08-22.

</details>

**Akar masalahnya bukan bug, tapi rantai yang memang manual** (jadi restart PC tidak akan
pernah menolong):

1. `NEXT_PUBLIC_VIDEO_BASE_URL` berawalan `NEXT_PUBLIC_` → **dibakar saat build**, ganti nilai = wajib redeploy.
2. Isinya dari **quick tunnel**, yang memberi **alamat acak baru tiap PC restart** (`start-dramaapp.ps1:88-92`).
3. Yang mendorong alamat baru ke Vercel = langkah [5/6], dan itu **gagal 403** karena `$VERCEL_TOKEN` mati (insiden 2026-08-19, belum pernah diperbaiki).

**Solusinya menghapus penyebabnya, bukan menambal token:** alamat video dibuat PERMANEN
(`https://video.amasyaforum.com`) lewat cloudflared **named tunnel** + semua service
dijalankan Windows saat boot. Sesudah itu env Vercel diisi **sekali selamanya** dan
`VERCEL_TOKEN` **tidak dibutuhkan lagi**.

Rencana lengkap + perintahnya: [`docs/lintasai/rencana/2026-08-20-video-otomatis-tanpa-powershell.md`](./docs/lintasai/rencana/2026-08-20-video-otomatis-tanpa-powershell.md)
dan [`pc-backup-agent/README.md`](./pc-backup-agent/README.md).

> Selama masih quick tunnel: URL BERGANTI ACAK tiap PC backup restart — jangan dihafalkan.
> Ambil yang aktif dari `$env:TEMP\cloudflared-dramaapp.log` di PC backup.

**Keputusan owner 2026-08-20:** perbaikan bertahap · domain `amasyaforum.com` · PC backup
nyala hampir 24 jam → migrasi ke Cloudflare R2 **ditunda** (Tahap 3).

## ✅ Tahap 6 sudah diverifikasi di produksi

Owner mengecek sendiri 2026-08-18: build Ready, daftar & login penonton jalan,
password salah ditolak, dan akun bersaldo sudah diklaim. Jadi fondasi login aman
sudah TERBUKTI, bukan cuma lulus tes lokal.

## Yang baru saja dikerjakan

| Kapan | Apa | Hasil yang kamu rasakan |
|---|---|---|
| 2026-08-25 | **Perbaikan Playly selesai & terbukti** (`0e7a5c5`, belum sampai produksi) | Daftar video terisi **15 video** — dulu 0 — dan videonya terbukti berputar. Di situs belum terasa: push ke repo produksi masih tertahan izin (lihat penghalang di atas) |
| 2026-08-22 | **Video mati lagi (siklus ke-3) → dipulihkan & dibuktikan 4 gerbang** | Alamat video sebelumnya sudah lenyap dari internet; server Vercel sendiri balas 502 saat mencoba menjangkaunya. Dipulihkan ke `therefore-donna-crops-doctors`. Ketahuan juga jebakan baru: menjalankan `start-dramaapp.ps1` dua kali meninggalkan **"tunnel yatim"** yang DNS-nya masih hidup tapi balas **530** — kalau alamat itu yang ditempel, video tetap mati padahal semua "kelihatan hijau". Sekarang tercatat supaya tak terulang. Bonus: tanda tanya `/_agent/health` sejak 20 Agt terjawab (kini **200**, dugaan lama gugur) |
| 2026-08-20 malam | **Video mati lagi → dipulihkan, DAN 5 commit yang tertahan akhirnya rilis** | Sesudah PC backup restart, alamat video sore tadi LENYAP (`nslookup` balas "Non-existent domain") — bukan dugaan, diukur langsung. Dipulihkan lewat `start-dramaapp.ps1` + tempel alamat manual ke Vercel (langkah [5/6] gagal 403). Terbukti jalan: **206 `video/mp4`**. Sekaligus 5 commit yang menumpuk (`8dd6f22`..`4954817`) di-dual-push sesudah lolos 265 tes + tsc 0 + build + scan secret → perbaikan "layar hitam" kini **TAYANG**, jadi kalau sumber mati lagi penonton melihat pesan + tombol **Coba lagi**, bukan layar hitam |
| 2026-08-20 | **Diagnosa "Over Your Dead Body" tak bisa diputar + 3 bug hardlink-agent diperbaiki** | Penyebabnya bukan tunnel mati: berkas di PC backup bernama `Over-Your-Dead-Body.mp4`, sedangkan player selalu minta `1.mp4` → 404. Agent lama tak bisa membereskannya DAN tetap lapor "berhasil" walau nol berkas dibuat. Sekarang: berkas tanpa nomor jadi episode 1, berkas `.mkv` dilaporkan "perlu dikonversi", nol hasil = GAGAL dengan sebab jelas. Dikunci 10 tes (`tests/hardlink-agent.test.ts`). **Masih perlu 1 langkahmu di PC backup — lihat "Belum selesai" no.1** |
| 2026-08-20 | **Penjaga permanen Tahap 7** (`npm run e2e:tahap7`) | Satu perintah untuk memastikan jalur "lupa password" masih hidup di produksi. Membuat 1 akun uji lalu MENGHAPUSNYA sendiri (bahkan kalau uji gagal di tengah). Dipisah dari `npm test` supaya tes harian tetap cepat & tak menyentuh database |
| 2026-08-20 | **Tahap 7 diuji end-to-end ke produksi** | 19 pemeriksaan lulus semua di situs sungguhan: kode pemulihan hanya bisa dipakai SEKALI, password lama langsung mati, kode boleh diketik huruf kecil tanpa tanda hubung, pesan gagal selalu sama (orang luar tak bisa menebak email mana yang terdaftar), dan batas 5 percobaan/menit terbukti menahan penebakan kode. Akun uji dihapus lagi dari database |
| 2026-08-20 | **Player tidak lagi kotak hitam saat sumber mati** | Dulu kalau PC backup/tunnel mati, layar cuma hitam tanpa keterangan (player mengarah ke `/sample.mp4` yang tidak pernah ada). Sekarang muncul "Video sedang tidak bisa diputar — sumber videonya sedang mati" + tombol **Coba lagi**. Dikunci 5 tes penjaga |
| 2026-08-20 | **Berkas autostart PC backup siap** | `start-video-services.ps1` + `cloudflared-config.example.yml` + README baru. Setelah owner pasang, PC nyala = video hidup sendiri, tanpa buka PowerShell |
| 2026-08-19 | **Kartu status Playly di /admin** | Di Dashboard admin ada kartu "Playly — dashboard upload": Tersambung / Belum diatur / Gagal, plus jumlah video. Tak perlu lagi buka situs sebagai pengunjung untuk tahu sambungannya hidup |
| 2026-08-18 | **Tahap 7: kode pemulihan** (`1ce14c3`) | Saat daftar, penonton dapat 1 kode untuk disimpan. Lupa password → `/lupa-password`, masukkan email + kode → password baru. Tanpa email, tanpa domain, tanpa biaya |
| 2026-08-18 | **Tahap 6: login penonton aman** (`b48bf32`) | Password penonton sungguhan; koin & komentar orang lain tak bisa disentuh |
| 2026-08-18 | **Tahap 5: rating + bagikan + balasan** | Bintang 1-5, tombol Bagikan, komentar bisa dibalas |
| 2026-08-18 | **Tahap 4: Performance & SEO** | Judul unik per drama di Google, sitemap 42 URL, halaman jauh lebih cepat |

## Cara kerja kode pemulihan (untuk dijelaskan ke penonton)

- Bentuk: `ABCD-EFGH-JKMN-PQRS` (16 karakter, tanpa 0/O/1/I/L supaya tak salah ketik).
- Ditampilkan **SEKALI** saat daftar. Yang disimpan server cuma hash-nya — tak ada
  cara melihat kode lama, termasuk oleh admin.
- **Sekali pakai**: setelah dipakai memulihkan, kode lama hangus dan penonton
  langsung diberi kode baru.
- Kode hilang tapi masih bisa masuk → buat baru di **Profil → Kode pemulihan**
  (wajib masukkan password lagi, karena kode baru menghanguskan yang lama).
- Akun Tahap 6 belum punya kode → buat lewat Profil. Field-nya opsional, jadi akun
  lama tetap valid tanpa migrasi.
- **Kode hilang DAN password lupa = akun tak bisa dipulihkan.** Satu-satunya jalan:
  admin menghapus baris `viewerpass:<email>` di Supabase supaya bisa daftar ulang.

## Belum selesai / menunggu kamu

1. 🔴 **PRIORITAS — bikin `1.mp4` untuk "Over Your Dead Body" (10 detik).** Berkasnya sudah ada & sehat di PC backup, cuma namanya salah. Di PC backup:
   ```powershell
   New-Item -ItemType HardLink -Path "C:\Users\USER\Downloads\video\over-your-dead-body\1.mp4" -Target "C:\Users\USER\Downloads\video\over-your-dead-body\Over-Your-Dead-Body.mp4"
   ```
   Lalu **salin `pc-backup-agent/hardlink-agent.js` versi baru** ke `C:\Users\USER\pc-backup-agent\` + `schtasks /run /tn "DramaApp Video"` supaya tombol Scan bisa menangani sendiri lain kali. **Koreksi 2026-08-22:** "bukti tambahan" versi agent lama itu **tidak sahih** — `/_agent/health` sekarang balas **200**, jadi 404 waktu itu cuma gejala tunnel yang mati. Versi agent di PC backup **tetap belum diketahui** (`/health` tidak menyebut versi), jadi menyalin berkas versi baru masih layak dilakukan. Rincian: [`docs/lintasai/rencana/2026-08-20-video-nama-berkas-1mp4.md`](./docs/lintasai/rencana/2026-08-20-video-nama-berkas-1mp4.md).
2. ~~**Hidupkan video lagi (Tahap 1)**~~ — **PULIH, terakhir 2026-08-22 (siklus ke-3).** Alamat aktif sekarang `https://therefore-donna-crops-doctors.trycloudflare.com`; `proxy-marks-isolation-subjects` dan `mac-carroll-flows-holly` sudah **LENYAP**. Diverifikasi 4 gerbang (bundle produksi cocok persis · DNS hidup · `/api/teaser` **206** · signature `ftypmp42`) — rinciannya di seksi "SEDANG DIKERJAKAN" di atas. ⚠️ **Tetap sementara** — mati lagi tiap PC backup restart, dan karena [5/6] balas 403 alamat barunya harus ditempel **manual** ke env Vercel + **Redeploy tanpa build cache**. Berhenti berulang hanya sesudah Tahap 2 (no.3).
3. 🟡 **Pasang alamat permanen + autostart (Tahap 2).** **Turun prioritas 2026-08-22:** bagian
   "alamat permanen" (a·b·e) kini **OPSIONAL** — mode QUICK sudah menghapus keharusan alamat tetap.
   Yang MASIH perlu dikerjakan & bernilai tinggi: **(c) autostart `start-video-services.ps1` +
   (d) `powercfg` cegah sleep**, plus set `HARDLINK_AGENT_SECRET` level `Machine`. Sesudah itu
   PC menyala = video hidup sendiri, tanpa PowerShell, tanpa tempel alamat. Named tunnel dikerjakan
   nanti saat domain di-ACC atasan; script berpindah mode sendiri. Urutan asli: Urutannya: (a) `amasyaforum.com` → Cloudflare, ganti nameserver di Namecheap; (b) `cloudflared` named tunnel + `service install`; (c) salin `start-video-services.ps1` ke PC backup + `schtasks /sc onstart`; (d) `powercfg` cegah sleep; (e) env Vercel = `https://video.amasyaforum.com` (terakhir kali). **Perintah lengkap ada di [`pc-backup-agent/README.md`](./pc-backup-agent/README.md).** Sesudah ini tidak perlu buka PowerShell lagi selamanya.
4. ~~**Uji manual Tahap 7 dari sisi penonton**~~ — **SELESAI 2026-08-20.** Owner sudah mencoba sendiri (berhasil ganti password hanya bermodal kode) DAN uji end-to-end mesin ke API produksi lulus 19/19. Tak ada sisa pekerjaan di Tahap 7.
5. 🟡 **Kunci `plyk_` BARU dari pengelola Playly.** Yang sekarang sudah ditolak
   (`invalid_key`, diuji 2026-08-25). Tidak memblokir jalur embed (jalan lewat katalog
   publik), TAPI membuat kartu "Video terbaru" di `/discover` tetap kosong. Sesudah dapat
   kunci baru: pasang di `/admin/settings/playly` **dan** perbarui `DASHBOARD_API_KEY` di Vercel.
6. 🟡 **Isi `PLAYLY_ENCRYPTION_KEY` di Vercel** → Settings → Environment Variables → Redeploy. **Terjawab 2026-08-27: memang BELUM ada di sana** (owner memfoto pesan penolakannya dari `dramaapp.vercel.app`). Nilainya boleh sama dengan yang di `.env.local` PC rekan — aman, karena di produksi belum pernah ada kunci tersimpan yang bisa jadi tak-terbaca. Tanpa ini
   kunci mitra tidak bisa disimpan lewat halaman setelan (fitur tetap jalan lewat katalog publik).
7. **Isi 3 env Playly di Vercel** → Settings → Environment Variables: `DASHBOARD_API_URL=https://playly-dashboard.vercel.app/api/videos`, `DASHBOARD_API_KEY_HEADER=X-Playly-Key`, `DASHBOARD_API_KEY=<kunci dari rekan>`. Lalu **Redeploy**. Cek berhasil: `/admin` → Dashboard → kartu Playly berubah dari "Belum diatur" jadi "Tersambung".
6. **Minta rekan upload video contoh** ke dashboard Playly — kuncinya sudah diuji SAH 2026-08-19, tapi dashboard-nya masih kosong (`count: 0`), jadi belum ada yang bisa ditampilkan.
7. **Rotate (ganti) API key Playly** sesudah setup — kunci yang sekarang dikirim rekan lewat screenshot, jadi sudah terekam di riwayat chat.
8. ⚠️ **`VERCEL_TOKEN` mati (403) — MASIH MENGGIGIT sampai Tahap 2 terpasang.** **Koreksi catatan sebelumnya** yang menyatakan ini "gugur": gugurnya baru berlaku **SESUDAH** named tunnel terpasang. Selama masih quick tunnel, tiap PC backup restart langkah [5/6] gagal → owner wajib tempel alamat manual (terbukti 2026-08-20 malam). Dua pilihan: **(a)** kerjakan Tahap 2 — disarankan, token jadi tak dibutuhkan selamanya; **(b)** penambal sementara: buat token baru di `vercel.com/account/tokens` → tempel ke `$VERCEL_TOKEN` di `start-dramaapp.ps1`.
9. **Daftarkan sitemap ke Google Search Console** (tertunda sejak Tahap 4): buka
   https://search.google.com/search-console → tambah properti `dramaapp.vercel.app` →
   Sitemaps → isi `sitemap.xml` → Submit.
10. Sinopsis drama dari OMDb masih **berbahasa Inggris** — perlu diterjemahkan lewat admin.
11. Kandidat Tahap 8: **rating penonton ke Google** (kini sudah aman — tinggal cabut
    batasannya), PWA "pasang ke HP", notifikasi episode baru, atau download offline.
12. **Tahap 3 (ditunda, atas keputusanmu):** pindah video ke Cloudflare R2 supaya PC backup
    boleh mati total. Biaya ~Rp22rb/bln per 100 GB, egress gratis. Catatan lengkap di
    [`docs/lintasai/rencana/2026-08-20-video-otomatis-tanpa-powershell.md`](./docs/lintasai/rencana/2026-08-20-video-otomatis-tanpa-powershell.md).
13. 🔑 **Pasang 2FA di akun Vercel owner — BELUM aktif per 2026-08-21, menunggu owner.** Vercel
    menawarkannya lewat layar "Secure Your Account with 2FA"; akun inilah yang menguasai domain,
    tombol Redeploy, dan Environment Variables (alamat video + `DASHBOARD_API_KEY`). Cara:
    ketik sendiri `https://vercel.com/account/settings/authentication` (jangan lewat link kiriman —
    cegah phishing) → Enable → **Authenticator App** → scan QR → ketik 6 angka → **simpan recovery
    codes di password manager / di LUAR folder repo** (repo ini publik; `.gitignore` sudah dipasangi
    pola `*recovery-codes*.txt` sebagai jaring cadangan, terbukti tidak menelan `lib/recovery-code.ts`).
    **Efek ke pekerjaan lain:** no.5 (isi env Playly) dan no.8 opsi (b) (buat token baru di
    `vercel.com/account/tokens`) sama-sama lewat dashboard → sesudah 2FA aktif, keduanya butuh HP
    owner di tangan. Deploy otomatis dari GitHub **tidak** terpengaruh. Bukti sudah aktif: logout →
    login lagi, harus diminta 6 angka. Dasar: <https://vercel.com/docs/two-factor-authentication>.
    ❓ Belum terverifikasi: apakah access token lama tetap sah setelah 2FA menyala — dokumentasi 2FA
    Vercel tidak menyebut token sama sekali. Tidak menghalangi apa pun sekarang (token itu memang
    sudah mati 403 sejak 2026-08-19, lihat no.8).

## Performance /beranda: SUDAH SEHAT (diukur 2026-08-20, jangan diulang)

Sempat terlihat seperti masalah (HTML 382 KB), ternyata BUKAN. Angka lengkapnya:

| Yang diukur | Hasil | Artinya |
|---|---|---|
| HTML dikirim di kabel | **22,5 KB** (brotli) | Yang 382 KB itu ukuran SESUDAH dibuka browser. Kompresi memampatkannya 17x |
| Waktu muat | ~900 ms (sesudah panas) | Wajar. Angka 7 detik hanya muncul di request paling pertama |
| Gambar poster | **AVIF 48 KB** (vs JPEG 89 KB) | Next.js Image sudah menyajikan format modern otomatis |
| Lazy loading | 76 dari 79 gambar | Gambar di bawah layar baru dimuat saat digulir |

**Rencana "ramping-kan payload beranda" DIBATALKAN** sesudah diukur: memangkas field
yang tak dipakai (synopsis dll) hanya menghemat ~29 KB mentah = sekitar **2-3 KB
sesudah kompresi**, sementara ongkosnya mengubah 4 komponen bersama yang dipakai 7
halaman. Tidak sepadan. Kalau nanti ada yang mengusulkan ini lagi, tunjukkan tabel di atas.

## Utang teknis yang DISENGAJA

- **Belum ada verifikasi email.** Siapa pun bisa mendaftar dengan email milik orang
  lain selama email itu belum terdaftar. Butuh domain sendiri + layanan kirim email.
- **Rating penonton masih belum dikirim ke Google.** Sejak Tahap 6 identitas sudah
  aman DAN sudah terbukti di produksi, jadi batasan ini SUDAH BOLEH dicabut kapan saja.
  Catatan ada di `lib/store.ts` ("BATAS JUJUR") dan `lib/structured-data.ts`.
- **Satu kode pemulihan per akun** (bukan 10 seperti kode cadangan 2FA) — sengaja,
  supaya mudah dipahami penonton awam.
- Sesi penonton tidak dicek ulang ke database tiap request (cukup tanda tangan +
  masa berlaku 7 hari). Kalau nanti ada fitur HAPUS akun, tambahkan pengecekan
  keberadaan akun di `resolveUserEmail`.

## Jangan dilakukan

- **Jangan anggap "tes lulus" = "tersambung".** 46 tes Playly lulus sejak awal padahal
  integrasinya tidak pernah jalan — semua tesnya memakai bentuk data KARANGAN. Tes baru
  (2026-08-25) memakai bentuk balasan Playly ASLI.
- Jangan ganti pola `/id/{id}/embed` tanpa mengecek ulang ke katalog Playly.

- Jangan commit `.env.local` / API key / `cookies.txt`.
- Jangan `git push` dari working tree kotor tanpa izin.
- Jangan ganti tabel Supabase jadi `users`/`episodes`/`watch_history` — merusak koin & admin.
- **Jangan kembalikan parameter email ke `resolveUserEmail`** — dihapus SENGAJA supaya
  pemanggil yang mengirim identitas dari klien gagal saat build.
- **Jangan simpan kode pemulihan sebagai teks asli** di mana pun (log, response selain
  sekali-tampil, database). Yang boleh disimpan hanya hash-nya.
- **Jangan pakai `getAllDramasCached`/`getDramaCached` di jalur koin, admin, atau tulis.**
- Kalau menguji API lewat `next start`, ingat datanya masuk **Supabase produksi** —
  bersihkan setelah selesai.
- **Jangan tulis karakter non-ASCII di berkas `.ps1`** (em-dash `—`, panah `→`, emoji).
  PowerShell 5.1 membaca `.ps1` tanpa BOM sebagai ANSI; `—` jadi `”` yang dianggap
  **penutup string** → error "Missing closing '}'" di baris yang jauh dari penyebabnya.
  Cek sebelum commit:
  `$e=$null;$t=$null;[System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path .\file.ps1).Path,[ref]$t,[ref]$e);$e`
- **Jangan commit `pc-backup-agent/config.yml` atau `pc-backup-agent/*.json`** — itu
  kredensial named tunnel; siapa pun yang punya bisa membajak alamat video. Sudah
  dipagari `.gitignore`, jangan dilonggarkan.
- **Jangan jalankan `start-dramaapp.ps1` (cara lama) bersamaan dengan named tunnel** —
  dua cloudflared akan berebut port 8088.
- **Jangan jalankan `start-dramaapp.ps1` dua kali, dan jangan menjalankannya lagi sesudah
  alamatnya ditempel ke Vercel.** Tiap run memberi alamat baru DAN membunuh yang lama, tapi
  catatan DNS alamat lama tertinggal → jadi "tunnel yatim" yang balas **530**. Akibatnya cek
  DNS terlihat hijau padahal sumbernya mati. Kalau terlanjur dijalankan berkali-kali: pakai
  alamat dari run **TERAKHIR**, dan pastikan `curl <alamat>/` balas **200** — jangan berhenti
  di cek DNS. (Terjadi 2026-08-22.)

## Berkas terkait

- 🔴 **Rencana video otomatis (AKTIF):** [`docs/lintasai/rencana/2026-08-20-video-otomatis-tanpa-powershell.md`](./docs/lintasai/rencana/2026-08-20-video-otomatis-tanpa-powershell.md)
- 🔴 **Panduan PC backup (AKTIF):** [`pc-backup-agent/README.md`](./pc-backup-agent/README.md) — perintah lengkap named tunnel + autostart
- Rencana Tahap 7: [`docs/lintasai/rencana/2026-08-18-tahap-7-kode-pemulihan.md`](./docs/lintasai/rencana/2026-08-18-tahap-7-kode-pemulihan.md)
- Rencana Tahap 6: [`docs/lintasai/rencana/2026-08-18-tahap-6-login-penonton.md`](./docs/lintasai/rencana/2026-08-18-tahap-6-login-penonton.md)
- Antrean: [`antrean-deploy.md`](./antrean-deploy.md)
- Arsip: [`NEXT-SESSION.md`](./NEXT-SESSION.md)
- ⛔ **Arsip kadaluarsa** (jangan dipakai sebagai status): [`docs/serah-terima-deploy-2026-08-15.md`](./docs/serah-terima-deploy-2026-08-15.md) — ditandai 2026-08-19
