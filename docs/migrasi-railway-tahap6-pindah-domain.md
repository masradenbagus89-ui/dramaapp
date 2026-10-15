# Tahap 6 — pindah domain penonton ke Railway

> Dibuat 2026-10-15. Pelengkap `docs/migrasi-railway-daftar-env.md` (daftar env),
> `docs/migrasi-railway-pc-backup.md` (sumber video), dan
> `docs/migrasi-railway-pesan-ke-playly.md` (pesan ke mitra).
>
> **Tahap ini BELUM dimulai dan sengaja ditahan.** Yang menahan bukan kerja teknis —
> satu kolom di panel Railway, nol commit — melainkan **keputusan alamat**.

---

## Status & keputusan owner (2026-10-15, DIREVISI sore hari yang sama)

**Keputusan owner: jalan seperti dulu di Vercel — pakai alamat bawaan platform
apa adanya, TANPA beli domain.** `NEXT_PUBLIC_SITE_URL` diisi dengan:

```
https://dramaapp-production-9e88.up.railway.app
```

Domain sendiri **menunggu persetujuan atasan owner**, bukan ditolak. Begitu
disetujui: beli domain → pasang di Railway → ubah variabel → **baru** kabari
mitra Playly, sekali, langsung ke alamat final.

> 🔴 **KOREKSI dari versi pertama dokumen ini (pagi 2026-10-15).** Versi pertama
> menyatakan "beli domain sendiri dulu, variabel dibiarkan KOSONG". **Itu salah
> dan menghalangi tujuan owner** (cuma mau 1 hosting). Dua kekeliruan yang
> dikoreksi owner sendiri:
>
> 1. **`dramaapp.vercel.app` juga subdomain gratis platform.** Situs ini sudah
>    setahun hidup di alamat platform tanpa domain beli. Jadi "jangan biarkan
>    Google mengindeks subdomain platform" adalah nasihat yang datang setahun
>    terlambat — dan dipakai untuk menahan penutupan Vercel. Tak ada alasan
>    teknis apa pun yang mengharuskan beli domain sebelum Vercel ditutup.
> 2. **Hitungan "ongkos SEO dua kali" itu keliru menguntungkan pihak yang salah.**
>    Jumlah pindah alamat SAMA di kedua jalur (2×), karena pindah
>    Vercel→Railway memang tak terhindarkan kalau Vercel mau ditutup. Yang
>    BERBEDA justru jumlah putaran mitra Playly — lihat tabel di bawah.

### Kenapa ganti nama alamat Railway TIDAK dilakukan sekarang

Alamat `*.up.railway.app` **bisa diganti namanya**, gratis, jadi mis.
`dramaku.up.railway.app` (terverifikasi di dokumentasi CLI resmi Railway:
`railway domain update <lama>.up.railway.app --domain <baru>`; `railway domain`
disebut "generates a free `*.up.railway.app` domain"). Jadi alamat rapi setara
`dramaapp.vercel.app` BISA didapat tanpa uang.

Tapi tidak dipakai sekarang, karena ongkosnya jatuh ke tempat yang salah:

| | Ganti nama sekarang | **Dipilih: lewati ganti nama** |
|---|---|---|
| Pindah alamat (ongkos SEO) | 2× (Vercel→railway, lalu railway→domain) | 2× — **sama** |
| **Mitra Playly diubah** | **2×** | **1×**, nanti, langsung ke alamat final |
| Biaya | 0 | 0 |
| Alamat selama masa tunggu | rapi | panjang & jelek |

Ganti nama cuma membeli alamat rapi **selama masa tunggu**, dengan harga satu
putaran mitra tambahan. Karena domain menunggu persetujuan atasan — bukan
"tidak akan pernah" — putaran itu mubazir.

⚠️ **Kalau ternyata atasan TIDAK menyetujui beli domain**, ganti nama jadi layak
dipertimbangkan lagi (alamat jelek selamanya vs satu putaran mitra). Keputusan
owner, bukan AI.

### Kenapa mitra Playly TIDAK disentuh di tahap ini

Yang memaksa mitra berubah adalah **alamat webhook berubah**, bukan Vercel
ditutup. Webhook mitra sudah menunjuk Railway sejak 2026-10-14 dan sudah
terbukti jalan (`playly:webhook` 176→178 video). Selama alamat Railway tidak
diganti nama, webhook itu **tidak tersentuh**: nol pesan, nol secret baru,
nol jeda.

Ongkos satu putaran mitra — kalau nanti dibutuhkan, supaya tahu yang ditunda apa:
sistem mitra hanya bisa **satu alamat** (pasti ada jeda) dan **otomatis membuat
secret BARU tiap alamat diganti**, jadi owner wajib menempel ulang
`PLAYLY_WEBHOOK_SECRET` + deploy ulang. Risikonya rendah — mitra mengonfirmasi
kiriman tertolak di-**retry otomatis**, terbukti nol film hilang selama jeda
~1,5 jam pada 2026-10-14 — tapi kerjanya nyata.

---

## Keadaan yang terukur saat keputusan ini diambil (2026-10-15)

Diukur dari luar, bukan dari catatan:

| Yang diperiksa | Hasil |
|---|---|
| `/api/health` Railway | `{"ok":true,"sumberData":"database"}` |
| `/api/health` Vercel | `{"ok":true,"sumberData":"database"}` |
| canonical beranda Railway | `https://dramaapp.vercel.app` |
| `robots.txt` Railway | `Sitemap: https://dramaapp.vercel.app/sitemap.xml` |
| `sitemap.xml` Railway | **377 URL, semuanya beralamat Vercel** |
| `NEXT_PUBLIC_SITE_URL` di Railway | tidak ada |

Perintah untuk mengulang pengukuran ini kapan pun:

```bash
curl -s https://dramaapp-production-9e88.up.railway.app/robots.txt
curl -s https://dramaapp-production-9e88.up.railway.app/ | grep -oE 'rel="canonical"[^>]*'
curl -s https://dramaapp-production-9e88.up.railway.app/sitemap.xml | grep -c '<loc>'
```

---

## Kenapa kosong aman SELAMA Vercel masih melayani — dan berbahaya sesudahnya

"Canonical" = baris di dalam halaman yang memberi tahu Google **alamat mana yang
dianggap aslinya** kalau isi yang sama bisa dibuka dari beberapa alamat. Situs ini
sekarang bisa dibuka dari dua alamat (Vercel & Railway) dengan database yang sama,
jadi isinya **identik**.

Selama Vercel masih **melayani penonton**, variabel kosong itu konsisten: Railway
bilang "yang asli itu Vercel", dan Vercel memang yang asli. Google tak bingung.
**Itu sebabnya keadaan kosong tidak perlu dikejar-kejar selama Tahap 2-5** — bukan
sebabnya untuk menunda penutupan Vercel.

**Bahayanya baru muncul kalau urutannya dibalik** — Vercel diubah jadi
pengalihan permanen ke Railway **sebelum** variabel ini diisi:

- Railway → "yang asli itu Vercel"
- Vercel → pengalihan permanen (308) → Railway

Dua sinyal bertabrakan. Google menganggapnya kesalahan dan **bisa menjatuhkan
halaman dari hasil pencarian**. Tak ada pesan error, tak ada yang melapor —
ketahuan berminggu-minggu kemudian dari trafik yang turun.

> ⛔ **Aturan yang tak boleh dibalik: isi variabel DULU, baru pengalihan permanen (308).**

---

## Mekanisme: kenapa WAJIB deploy ulang, bukan restart

Diverifikasi 2026-10-15 di hasil build sungguhan, bukan dari ingatan.

Catatan lama menulis *"`NEXT_PUBLIC_*` dipanggang saat build"*. Itu benar untuk kode
yang jalan di browser, **tapi bukan sebab utama di kasus ini**:

1. Di potongan kode **server**, `process.env.NEXT_PUBLIC_SITE_URL` **masih dibaca
   saat request** — tidak dipanggang. (Terbukti: berkas di `.next/server/chunks/`
   memuat teks `process.env.NEXT_PUBLIC_SITE_URL` lalu nilai bawaannya sebagai
   cadangan.)
2. Yang membekukan adalah **prerender statis**. 16 halaman situs ini dicetak jadi
   berkas HTML saat build, dengan alamatnya sudah jadi teks mati di dalamnya.
   Di `.next/server/app/index.html` baris canonical-nya sudah tertulis penuh
   `https://dramaapp.vercel.app`. `robots.txt` juga begitu — dibekukan permanen
   sampai build berikutnya.

**Akibat praktis yang perlu diketahui:**

- ⛔ Mengganti nama variabel (membuang awalan `NEXT_PUBLIC_`) **TIDAK akan
  menolong**. Yang membekukan adalah prerender halaman, bukan awalannya. Jangan
  tawarkan "solusi" itu.
- `sitemap.xml` punya `revalidate = 3600` (`app/sitemap.ts:8`) → ia menyegarkan
  diri sendiri dalam ≤1 jam tanpa deploy.
- canonical & `robots.txt` **tidak** punya itu → hanya berubah lewat build baru.
- Railway menjalankan deploy ulang **otomatis** saat variabel diubah, jadi ini
  bukan langkah terpisah yang perlu diingat.

Satu sumber alamat untuk SEMUANYA: `lib/site.ts:12`. Dipakai `app/layout.tsx`
(metadataBase + og:url), `app/robots.ts`, `app/sitemap.ts`, `app/drama/[id]/page.tsx`,
`app/tonton/[id]/page.tsx`. **Jangan hardcode alamat di tempat lain.**

### 🪤 Jebakan senyap di `lib/site.ts` — SETENGAH ditutup 2026-10-15

Kalau variabelnya hilang atau salah ketik, kode **tidak error** — ia jatuh ke nilai
bawaan `https://dramaapp.vercel.app`. Sesudah Vercel pensiun, itu berarti canonical
menunjuk alamat **mati**, tanpa satu pun gejala di layar.

**Yang SUDAH ditutup** (pagar `periksaAlamatSitus` di `lib/site.ts`, mengikuti pola
`periksaSetelanSupabase` di `lib/supabase.ts:50`): nilai yang **diisi tapi rusak**
menggagalkan build dengan pesan yang menyebut nama variabelnya. Yang ditolak:

| Nilai | Hasil |
|---|---|
| `dramaku.com` (lupa `https://`) | **DITOLAK** |
| `http://dramaku.com` (http polos) | **DITOLAK** — Google menghitung http & https sebagai dua situs |
| `https://dramaku.com/` | lolos, garis miring dibuang |
| `http://localhost:3000` | lolos — untuk `next dev` |
| kosong / blank | lolos ke nilai bawaan (lihat di bawah) |

Kenapa gagalnya build itu **aman**: deploy yang gagal membuat Railway tetap
menyajikan deployment sebelumnya, jadi situs tidak ikut mati — kamu melihat deploy
merah dan membetulkan ketikannya. Bandingkan dengan tanpa pagar: deploy berhasil,
canonical jadi kacau, dan nol orang tahu.

**Yang MASIH terbuka, dan sengaja:** nilai **kosong** tetap lolos ke nilai bawaan
tanpa peringatan. Itu keputusan, bukan kelalaian — kosong memang BENAR selama
Tahap 2-5, dan pagar yang berbunyi di tiap build hari ini akan berhenti dibaca orang
jauh sebelum migrasi sungguhan terjadi (penyakit yang sudah tercatat soal
`KEEPALIVE_SITES`). Juga masih terbuka: alamat yang **bentuknya sah tapi salah
situs** (mis. masih menunjuk host lama) — itu tak bisa ketahuan dari dalam kode.

➡️ **Kedua celah itu ditutup oleh langkah 3, jadi verifikasi di bawah WAJIB,
bukan opsional.**

---

## Prasyarat (ketiganya, sebelum langkah 1)

1. **Alamat tujuan sudah pasti & terbukti melayani.** Untuk jalur yang dipilih
   owner: alamat bawaan Railway `https://dramaapp-production-9e88.up.railway.app`
   (service `dramaapp`, project `ravishing-adaptation`, workspace
   `jalurlangit-ops`) — sudah terbukti, `/api/health` menjawab
   `{"ok":true,"sumberData":"database"}`. **Nol prasyarat beli domain.**
   Kalau nanti pakai domain sendiri: DNS-nya menunjuk service yang sama dan
   dibuka di browser sudah menampilkan situs.
2. **`HARDLINK_AGENT_SECRET` Railway = PC backup.** Sudah SELESAI & lulus uji
   restart 2026-10-14 (`00872a2`) — tapi periksa ulang, karena kalau tak cocok,
   video penonton mati begitu tunnel berganti dan tak ada yang memulihkannya.
3. **Putaran 2 (login admin) lolos** — pagar yang dipasang owner sendiri.

---

## Urutan langkah — JANGAN dibalik

| # | Langkah | Siapa | Kenapa di posisi ini |
|---|---|---|---|
| 1 | ✅ **SELESAI 2026-10-15** — `NEXT_PUBLIC_SITE_URL` = `https://dramaapp-production-9e88.up.railway.app` | owner, panel Railway | Harus mendahului pengalihan — lihat seksi tabrakan sinyal di atas |
| 2 | ✅ **SELESAI** — deploy ulang menyala **~60 detik** sesudah variabel disimpan | owner | Prerender = perubahan hanya ikut build baru |
| 3 | ✅ **SELESAI & TERBUKTI** — 5 pemeriksaan + 3 tambahan, semuanya lolos (bukti di bawah) | AI | Salah ketik tak memunculkan error — hanya ketahuan dari pengukuran |
| 4 | `KEEPALIVE_SITES` di panel GitHub: **ganti isinya** jadi alamat Railway (jangan dikosongkan — baca peringatan di bawah) | owner | Robot sengaja GAGAL kalau ada satu alamat sakit → Vercel dialihkan = email gagal tiap hari |
| 5 | Vercel diubah jadi **pengalihan permanen (308)** ke alamat Railway | owner | Bookmark, link yang pernah dibagikan, dan peringkat Google tidak putus mendadak |
| 6 | Biarkan pengalihan hidup **beberapa minggu**, baru Vercel dimatikan | owner | Google butuh waktu memindahkan peringkat; mematikan terlalu cepat = trafik hilang |

### ⚠️ Langkah 4: `KEEPALIVE_SITES` harus DIGANTI ISINYA, bukan DIKOSONGKAN

Jebakan senyap, dibaca langsung dari robotnya — `.github/workflows/keep-db-awake.yml:65`:

```yaml
SITES: ${{ vars.KEEPALIVE_SITES || 'https://dramaapp.vercel.app' }}
```

Tanda `||` itu artinya: **kalau variabelnya kosong, robot jatuh ke alamat Vercel.**
Jadi "buang alamat Vercel" dengan cara mengosongkan kolomnya justru membuat robot
**tetap** memantau Vercel — tanpa gejala apa pun. **Isi dengan alamat Railway**,
jangan dikosongkan.

Dan kenapa langkah 4 **wajib** mendahului langkah 5: robot memanggil
`${SITE}/api/dramas` dengan `curl` **tanpa `-L`**
(`.github/workflows/keep-db-awake.yml:99`), jadi ia **tidak mengikuti pengalihan**.
Begitu Vercel mengalihkan, balasan yang diterima robot `308`, bukan `200` → ia
melapor `::error:: TIDAK sehat` **tiap hari**. Alarm yang berbunyi tiap hari =
alarm yang berhenti dibaca orang.

---

### Langkah 5: bentuk pengalihannya — `vercel.json`, dan **308 bukan 301**

Berkas `vercel.json` di akar repo — **sudah dibuat & lolos gerbang 2026-10-15,
tapi SENGAJA BELUM DIDORONG** sampai langkah 4 selesai:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "redirects": [
    {
      "source": "/:path*",
      "has": [{ "type": "host", "value": "dramaapp\\.vercel\\.app" }],
      "destination": "https://dramaapp-production-9e88.up.railway.app/:path*",
      "permanent": true
    }
  ]
}
```

**Kenapa `vercel.json`, BUKAN `next.config.ts`.** Dokumentasi Vercel menganjurkan
`next.config.js` untuk project Next.js — **tapi di kasus kita itu justru
berbahaya**: `next.config.ts` dibaca **Railway juga**. Satu salah ketik di syarat
host, dan Railway mengalihkan ke dirinya sendiri = **loop tak berujung, situs
mati**. `vercel.json` **tidak pernah dibaca Railway** sama sekali, jadi risiko itu
nol. Vercel sendiri mendokumentasikan resep ini persis untuk kasus ini, di seksi
*"Redirect the production vercel.app hostname"*.

**Kenapa `permanent: true` (= 308), bukan 301.** Dua alasan, keduanya dari
dokumentasi Vercel:

- *"301 Moved Permanently: Cached by client, the method **may or may not be changed
  to GET**."* — 301 boleh mengubah POST jadi GET. Situs ini punya endpoint webhook
  (`/api/webhooks/playly`), jadi itu risiko nyata.
- *"We recommend using status code 307 or 308 to avoid the ambiguity of non-GET
  methods, **which is necessary when your application needs to redirect a public
  API**."* 308 = permanen **dan** metode tak pernah berubah.

Project ini sudah memakai pola yang sama di `next.config.ts:52` (`/playly` →
`/film`), lengkap dengan komentar yang menjelaskan `permanent: true` = 308.

> 🔴 **KOREKSI ISTILAH:** catatan-catatan sebelumnya di repo ini menulis "301"
> (AI yang menulisnya, berulang kali). Yang benar **308**. Kesimpulannya tidak
> berubah — 308 sama permanennya di mata Google — tapi 301 berisiko mengubah POST
> jadi GET dan itu tidak boleh di situs yang punya API publik.

**Kenapa `has` host dibatasi persis `dramaapp.vercel.app`:** supaya preview
deployment Vercel (hostname-nya berbeda) tidak ikut teralihkan, dan supaya tujuan
tidak mengalihkan balik ke dirinya sendiri.

### 🔴 `/:path*` TIDAK mencocokkan akar `/` — lubang di contoh resmi Vercel

**Ini sebabnya ada DUA aturan di berkas itu, bukan satu.** Rilis pertama
(`254d47d`) hanya memakai `/:path*` — persis seperti contoh di dokumentasi Vercel.
Hasil smoke test per-path, dengan pemutus cache di tiap permintaan:

| Path | Hasil |
|---|---|
| `/` | **200 OK** ← LOLOS, masih menyajikan situs Vercel |
| `/?x=1` | **200 OK** ← LOLOS |
| `/beranda` · `/film` · `/shorts` · `/discover` | 308 ✅ |
| `/robots.txt` · `/sitemap.xml` | 308 ✅ |

Sebabnya pola path-to-regexp: `/:path*` mencocokkan **satu segmen atau lebih**,
dan akar tidak punya segmen sama sekali. Jadi halaman yang **paling banyak dibuka
dan paling penting bagi Google** justru satu-satunya yang lolos.

Diperbaiki di `982a98a` dengan menambah aturan eksplisit `"source": "/"`,
ditaruh **lebih dulu** (Vercel menilai aturan berurutan).

> 🪤 **Pelajaran yang layak diulang caranya:** build **hijau**, status deploy
> **success**, dan konfigurasinya **sama persis dengan contoh resmi** — ketiganya
> tidak menangkap lubang ini. Yang menangkapnya **smoke test per-path**. Inilah
> arti "selesai = terbukti": memeriksa HASILNYA, bukan memeriksa bahwa langkahnya
> sudah dijalankan.

⚠️ **Mendorong `vercel.json` = aksi rilis.** Ia ikut ter-deploy ke Vercel dan
langsung aktif. **Jangan didorong sebelum langkah 4 selesai.**

**Rollback 1-baris:**
`git revert --no-edit <sha> && git push origin main && git push dramaku main`
(atau hapus `vercel.json` lalu push — efeknya sama: Vercel berhenti mengalihkan).

**Smoke test sesudah deploy** (bukan cuma "build hijau"):

```bash
curl -I "https://dramaapp.vercel.app/film?ref=test"      # harap: 308 + Location ke Railway, path & query ikut
curl -I "https://dramaapp.vercel.app/api/dramas"         # harap: 308 (bukan 200)
curl -sI "https://dramaapp-production-9e88.up.railway.app/film" | head -1  # harap: 200, TIDAK ikut teralihkan
curl -s "https://dramaapp-production-9e88.up.railway.app/api/health"       # harap: ok
```

Yang paling penting di daftar itu adalah baris ke-3: ia membuktikan **Railway
tidak ikut teralihkan** — yaitu bahwa `vercel.json` memang tak terbaca di sana.

---

> ✅ **Mitra Playly TIDAK ada di daftar ini — itu disengaja.** Webhook mereka sudah
> menunjuk Railway sejak 2026-10-14 dan terbukti jalan, jadi selama alamat Railway
> tidak diganti nama, mereka **tidak tersentuh**: nol pesan, nol secret baru, nol
> jeda. Versi pertama dokumen ini menaruh "Kirim Pesan 2 ke mitra" di sini —
> **dihapus 2026-10-15**, karena di jalur ini tak ada alamat baru untuk dikabarkan.
> Pesan 2 baru dipakai nanti, saat domain sendiri dipasang.

> ⚠️ Langkah 6 **bukan** "matikan situs lama". Daftar periksa lama di
> `docs/migrasi-railway-pesan-ke-playly.md` sempat menaruh "matikan situs lama"
> **sebelum** langkah 1 — urutan itu persis yang menghasilkan tabrakan sinyal di
> atas. Dibetulkan 2026-10-15.

---

## Verifikasi langkah 3 — selesai = terbukti

Untuk jalur yang dipilih owner, `<DOMAIN>` =
`dramaapp-production-9e88.up.railway.app`. Kalau nanti pakai domain sendiri, ganti
dengan domain itu (tanpa garis miring di ujung).

```bash
# 1. canonical beranda harus menyebut domain baru, BUKAN vercel
curl -s https://<DOMAIN>/ | grep -oE 'rel="canonical"[^>]*'

# 2. robots.txt harus menunjuk sitemap domain baru
curl -s https://<DOMAIN>/robots.txt | grep Sitemap

# 3. sitemap: NOL URL boleh beralamat vercel (jawaban harus 0)
curl -s https://<DOMAIN>/sitemap.xml | grep -c 'dramaapp.vercel.app'

# 4. jumlah URL sitemap masih wajar (2026-10-15: 377)
curl -s https://<DOMAIN>/sitemap.xml | grep -c '<loc>'

# 5. situs benar-benar melayani, bukan cuma halaman kosong
curl -s https://<DOMAIN>/api/health
```

### ✅ HASIL NYATA 2026-10-15 — langkah 1-3 LULUS

Diukur sesudah deploy ulang menyala (~60 detik sesudah variabel disimpan):

| Pemeriksaan | Sebelum | **Sesudah** |
|---|---|---|
| canonical beranda | `https://dramaapp.vercel.app` | **`https://dramaapp-production-9e88.up.railway.app`** |
| `robots.txt` | Sitemap → vercel | **Sitemap → Railway** |
| URL ber-vercel di sitemap | 384 | **0** |
| Jumlah URL sitemap | 384 | **384** (utuh, nol katalog hilang) |
| `/api/health` | ok | **ok**, `sumberData: database` |

Tiga pemeriksaan **tambahan** di luar daftar wajib:

- **Halaman detail drama ikut pindah** — `/drama/meg-2-the-trench` canonical &
  `og:url` keduanya sudah beralamat Railway. Ini penting: halaman detail adalah
  **prerender SSG**, jadi lolosnya membuktikan seluruh situs benar-benar dibangun
  ulang, bukan cuma halaman dinamis.
- **Vercel tidak tersentuh** — canonical-nya masih `https://dramaapp.vercel.app`,
  `/api/health` ok. Ia masih melayani penonton seperti biasa.

### 🟡 KEADAAN SEMENTARA YANG TIDAK BOLEH DIBIARKAN LAMA

Sekarang **dua situs sama-sama mengaku "akulah yang asli"**, dengan isi identik
(database yang sama). Di mata Google itu **duplicate content**.

Ini tak terhindarkan — tak ada urutan lain yang mungkin, karena mengalihkan Vercel
lebih dulu justru menghasilkan tabrakan sinyal yang lebih buruk. Tapi artinya
**langkah 4 & 5 jangan ditunda berlama-lama** — hitungan hari, bukan minggu.
"Tunggu beberapa minggu" di langkah 6 berlaku **sesudah** pengalihan terpasang,
bukan sebelumnya.

---

**Kriteria lulus:** (1) & (2) menyebut domain baru · (3) menjawab **0** ·
(4) **ratusan, dan TIDAK jauh di bawah hitungan hari itu** · (5)
`{"ok":true,"sumberData":"database"}`.

> ⚠️ Angka (4) **memang naik sendiri** — tiap film baru dari webhook Playly
> menambah URL. Terukur **377** pada 2026-10-15 pagi dan **384** sore hari yang
> sama, tanpa satu pun deploy di antaranya. Jadi angka yang berbeda dari catatan
> **bukan** tanda gagal; yang jadi tanda bahaya adalah angka yang **jatuh drastis**
> atau tinggal belasan (itu berarti sitemap kehilangan katalog).

Kalau (3) tidak nol padahal deploy sudah `Active`: tunggu ≤1 jam (sitemap
menyegarkan per jam), lalu ukur ulang. Masih tidak nol → variabelnya salah ketik.

---

## Rollback

Hapus `NEXT_PUBLIC_SITE_URL` dari panel Railway → deploy ulang → semuanya kembali
menunjuk `dramaapp.vercel.app` (nilai bawaan `lib/site.ts:8`). **Nol commit, nol
kode.** Syaratnya Vercel masih hidup — karena itu langkah 7 menahan pemadamannya
beberapa minggu.

---

## Yang masih terbuka

- ⏸️ **Beli domain menunggu persetujuan atasan owner** — bukan ditolak, dan
  **bukan prasyarat** menutup Vercel. Saat disetujui: pasang domain di Railway →
  ubah `NEXT_PUBLIC_SITE_URL` → **baru** kirim Pesan 2 ke mitra Playly (sekali,
  langsung ke alamat final).
- ❓ **Apakah alamat `*.up.railway.app` bisa berubah sendiri** (mis. kalau service
  Railway dibuat ulang, atau akhiran `9e88` dirotasi) — **belum diverifikasi**.
  Sekarang alamat ini jadi alamat resmi penonton, jadi kalau ia berubah, canonical
  & webhook ikut mati. **Jangan diklaim tetap**; kalau ada kesempatan, tanyakan ke
  Railway atau uji di service percobaan.
- ❓ **Nasib alamat lama sesudah ganti nama** — dokumentasi Railway menyebut
  *"One Railway-provided domain per service"*, jadi nama lama hampir pasti mati,
  tapi tak ada kalimat eksplisit soal itu. Relevan hanya kalau ganti nama
  dipertimbangkan lagi (lihat seksi "Kenapa ganti nama ... TIDAK dilakukan").
- ❓ **Cara ganti nama dari dashboard Railway** belum terverifikasi — dokumen
  dashboard hanya menyebut tombol edit untuk *port*. Jalur yang terdokumentasi
  adalah CLI: `npm i -g @railway/cli` → `railway login` →
  `railway domain update <lama>.up.railway.app --domain <baru>`.
- ❓ `start-video-services.ps1` tak pernah memanggil `ReleaseMutex` dan tak punya
  blok `finally` (temuan 2026-10-14, belum diperbaiki). Tak menghalangi Tahap 6,
  tapi memengaruhi pemulihan video otomatis.
