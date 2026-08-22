# Rencana: alamat video jadi runtime config (berhenti mati tiap PC backup restart)

- **Tanggal:** 2026-08-22
- **Diminta client:** "sudah beberapa hari ini video sering tidak bisa diputar selain named tunnel ada tidak solusi lain agar kejadian ini tidak terulang lagi karena dramaapp sedang mode develop nanti kalau sudah di Acc atasan baru kita named tunnel"
- **Bobot:** BERAT — fitur BARU + titik-risiko (endpoint yang mengubah konfigurasi produksi).

## Ringkasan

Selama ini alamat video (`NEXT_PUBLIC_VIDEO_BASE_URL`) **dibakar ke dalam aplikasi saat build**.
Akibatnya tiap PC backup restart, alamat tunnel berganti dan video **mati sampai owner sadar lalu
menempel alamat baru secara manual + redeploy** — sudah 3 kali dalam 3 hari.

Rencana ini memindahkan alamat itu dari "dibakar saat build" menjadi **dibaca saat request dari
database Supabase**. PC backup melapor sendiri tiap dapat alamat baru. Hasil bagi owner: **alamat
boleh tetap berganti acak, tapi video hidup sendiri dalam hitungan detik — tanpa menempel apa pun,
tanpa redeploy, tanpa `VERCEL_TOKEN`, tanpa domain, tanpa menunggu ACC atasan.**

Named tunnel tetap jadi tujuan akhir nanti; rencana ini **tidak membatalkannya**, malah membuat
perpindahannya cuma soal mengganti satu nilai.

## Kenapa bukan cara lain (sudah dicari lebih dulu, §4.4)

- **ngrok dev domain gratis (alamat tetap tanpa domain sendiri)** — GUGUR. Dokumentasi resminya:
  **1 GB data keluar/bulan** dan **20.000 request/bulan**. Satu film di PC backup = 1,69 GB, jadi
  kuota sebulan habis sebelum satu penonton menyelesaikan satu film.
- **Proxy semua video lewat `/api/...` Vercel** (supaya browser tak perlu tahu alamat tunnel) —
  GUGUR. Fungsi Vercel dibatasi 60 detik; `lib/video.ts:16-19` sudah mencatat jalur proxy
  `/api/download` dulu memutus unduhan berkas besar. Streaming lewat proxy akan mengulang bug itu.
- **Perbaiki `VERCEL_TOKEN` saja** — hanya memindahkan kerja manual jadi otomatis, tapi tetap
  1 redeploy (~2 menit mati) tiap ganti alamat, dan tokennya bisa mati lagi seperti 2026-08-19.

## ✅ Terverifikasi (sudah dibaca di kode)

- Helper dokumen JSON di Supabase sudah ada — `lib/store.ts:79` (`sbDocGet`), `lib/store.ts:86` (`sbDocSet`), tabel `app_data` key→value jsonb. **Tidak perlu tabel baru, tidak perlu ubah skema DB.**
- `NEXT_PUBLIC_VIDEO_BASE_URL` dipakai di **10 titik**: 8 server-side + 2 client-side.
- Player utama halamannya **`force-dynamic`** — `app/feed/[id]/page.tsx:5`. Jadi baca-dari-DB akan **selalu segar** di jalur yang paling penting.
- Beranda memakai **ISR 60 detik** — `app/beranda/page.tsx:10` (`revalidate = 60`).
- 2 titik client hanya untuk **cuplikan hover poster** (`previewSrc`), BUKAN pemutaran: `app/components/DramaCard.tsx:10-15`, `app/components/ContentRow.tsx:34,116`.
- `HomeHero` **sudah** menerima `baseUrl` lewat prop — `app/beranda/page.tsx:33-36`. Polanya sudah ada, tinggal ditiru.
- `BerandaRows` **belum** menerima `baseUrl` (grep `baseUrl` di berkas itu: nol hasil) — itu sebabnya `ContentRow` membaca env sendiri.
- Pola auth agent sudah ada: header `x-agent-secret` dibanding `HARDLINK_AGENT_SECRET` — `app/api/admin/hardlink/route.ts:26,50`.
- Helper rate limit sudah ada — `lib/rate-limit.ts:33` (`checkRate`), `:66` (`rateLimit`).
- Pola banding rahasia anti-tebak-waktu sudah dipakai — `lib/session.ts:78`, `lib/midtrans.ts:107` (`timingSafeEqual`).
- Agent di PC backup punya `/health` dan terjangkau lewat `/_agent/*` — diuji 2026-08-22, balas 200.

## ❓ Asumsi (BELUM dikonfirmasi)

- Owner bisa membuat Task Scheduler di PC backup (butuh PowerShell **Administrator**).
- `HARDLINK_AGENT_SECRET` sudah terpasang & **nilainya sama** di Vercel dan PC backup. Belum saya uji; kalau beda, jalur lapor-otomatis gagal dengan 401. Diuji di Tahap 2.
- Versi `hardlink-agent.js` di PC backup masih ❓ (lihat `HANDOFF.md`) — Tahap 2 sekalian menyamakannya.

## Yang TIDAK dibangun (sengaja, biar tak salah harap)

- **Named tunnel / domain `video.amasyaforum.com`** — menunggu ACC atasan, sesuai keputusanmu.
- **Alarm/pemantauan otomatis** — pernah saya tawarkan, belum dijawab; tidak diikutkan di sini.
- **Migrasi ke Cloudflare R2** (Tahap 3 lama) — tetap ditunda.
- **Halaman admin untuk mengganti alamat lewat UI** — bisa menyusul; Tahap 1 cukup lewat jalur agent + fallback env.

## Yang ikut tersenggol

| Fitur/halaman yang memakai bagian ini | Sudah ada penjaganya? |
|---|---|
| Putar episode (`app/feed/[id]/page.tsx`) | ✅ `tests/video.test.ts` |
| Cuplikan hero Beranda & Discover (`app/api/teaser/route.ts`) | ✅ `tests/hero-teaser.test.ts` |
| Tombol Unduh episode (`app/api/download/route.ts`) | ✅ `tests/video.test.ts` |
| Subtitle (`app/api/subtitle/route.ts`) | ✅ `tests/subtitles.test.ts` |
| Admin "Scan & auto-hardlink" (`app/api/admin/scan`, `hardlink`) | ✅ `tests/hardlink-agent.test.ts` |
| Cuplikan hover poster (`DramaCard`, `ContentRow`) | ⚠️ **belum ada** — ditambah di Tahap 3 |

## Lima kepala bahasan

1. **Alur pengguna:** penonton tidak melihat perubahan apa pun saat semuanya sehat — itu memang tujuannya. Yang berubah: saat PC backup restart, video pulih **sendiri** dalam hitungan detik, bukan mati sampai owner menempel alamat.
2. **Data & siapa boleh lihat:** yang disimpan hanya **1 baris** di `app_data` (key `videobase`, isi: alamat + waktu diperbarui). Bukan data pribadi. Yang boleh **menulis**: hanya pemegang `HARDLINK_AGENT_SECRET` (PC backup). Yang boleh **membaca**: server aplikasi; alamatnya memang sampai ke browser karena video diputar langsung dari tunnel.
3. **Kalau gagal:** DB tak terjangkau / baris kosong → jatuh ke `process.env.NEXT_PUBLIC_VIDEO_BASE_URL` (perilaku lama, jadi **tidak ada yang lebih buruk dari sekarang**). Sumber benar-benar mati → penonton melihat pesan "Video sedang tidak bisa diputar" + tombol **Coba lagi** yang sudah ada sejak 20 Agt, bukan layar hitam.
4. **Batas/skala:** 1 baris DB, ditulis paling sering beberapa kali sehari (tiap PC restart). Dibaca tiap request halaman player. Beban dapat diabaikan.
5. **Cara uji:** owner restart PC backup, **tidak menyentuh apa pun**, tunggu ~1 menit, lalu buka situs dan tekan play — harus jalan. Plus tes otomatis (lihat Langkah kerja no.7).

## Pre-mortem

> Anggap semuanya sudah dikerjakan tapi hasilnya **nol guna** bagi owner — apa penyebab paling mungkin?

**Jawaban: agent jalan lewat Task Scheduler sebagai akun SYSTEM, tapi `HARDLINK_AGENT_SECRET`
tersimpan sebagai env var level User → agent gagal start / laporannya ditolak 401, dan tak ada yang
tahu karena prosesnya tersembunyi tanpa jendela.** Ini bukan dugaan: `pc-backup-agent/README.md:56-62`
sudah memperingatkan persis hal ini (wajib level `Machine`, bukan `User`).

Penawarnya masuk ke rencana:
- Setup menulis secret di level **`Machine`**, dan Tahap 2 **menguji dengan `schtasks /run`** — bukan menganggap berhasil.
- Script autostart menulis **log** yang bisa dibaca owner, dan endpoint menolak dengan pesan yang menyebut sebabnya.
- Endpoint `/api/agent/video-base` **membalas jelas** saat secret salah, supaya kegagalan terlihat, bukan senyap.

**Penyebab kedua:** alamat sudah dilaporkan tapi halaman menyajikan alamat lama karena cache.
Penawar: helper baca-alamat **tidak boleh di-cache**, dan halaman player sudah `force-dynamic`.

## Tahapan

1. **Tahap 1 — sumber kebenaran + jalur lapor (inti).** Sesudah ini alamat baru sudah bisa masuk tanpa redeploy, walau masih dipicu manual. Nilai gunanya sudah penuh untuk pemutaran video.
2. **Tahap 2 — PC backup jalan & lapor sendiri saat boot.** Sesudah ini rantainya benar-benar tanpa sentuhan manusia. **Ini yang menjawab keluhan "sering tidak bisa diputar".**
3. **Tahap 3 — cuplikan hover poster ikut pindah + penjaganya.** Kosmetik; dipisah supaya Tahap 1-2 tidak tertahan oleh perubahan di komponen yang dipakai banyak halaman.

## Langkah kerja

**Tahap 1**
1. `lib/video-base.ts` (baru): `getVideoBaseUrl()` — baca `app_data` key `videobase` lewat helper yang sudah ada, **fallback** ke `process.env.NEXT_PUBLIC_VIDEO_BASE_URL`. Tanpa cache. Plus `isAllowedVideoBase(url)` — fungsi MURNI (mudah dites): wajib `https:`, host wajib cocok allowlist.
2. Ganti 8 titik server dari `process.env.NEXT_PUBLIC_VIDEO_BASE_URL` → `await getVideoBaseUrl()`: `app/feed/[id]/page.tsx:24`, `app/beranda/page.tsx:35`, `app/discover/page.tsx:34`, `app/api/teaser/route.ts:20`, `app/api/subtitle/route.ts:29`, `app/api/download/route.ts:24`, `app/api/admin/scan/route.ts:19`, `app/api/admin/hardlink/route.ts:25`.
3. `app/api/agent/video-base/route.ts` (baru, **titik-risiko**) — `POST { baseUrl }`:
   - banding `x-agent-secret` dengan `HARDLINK_AGENT_SECRET` memakai **`timingSafeEqual`** (pola `lib/session.ts:78`);
   - tolak kalau `isAllowedVideoBase` gagal — **tanpa allowlist, siapa pun yang memegang secret bisa mengarahkan SELURUH penonton ke server mana pun**, termasuk yang menyajikan berkas berbahaya. Ini alasan allowlist wajib, bukan opsional;
   - `rateLimit` dari `lib/rate-limit.ts`;
   - simpan lewat `sbDocSet` + waktu perubahan.
4. `GET` pada route yang sama (butuh admin) untuk melihat alamat aktif + kapan diperbarui.

**Tahap 2**
5. `pc-backup-agent/start-video-quick.ps1` (baru, **ASCII-only** — `HANDOFF.md` mencatat `.ps1` non-ASCII gagal parse di PowerShell 5.1): jalankan agent + Caddy + cloudflared quick tunnel, tangkap alamat dari log, lalu POST ke `/api/agent/video-base`. **Tanpa `Read-Host`, tanpa `-NoExit`** supaya bisa jadi tugas otomatis (batasan `start-dramaapp.ps1` yang dicatat di `README.md:176-177`). Menulis log yang bisa dibaca owner.
6. Owner memasang `schtasks /sc onstart` + menyimpan secret level `Machine`, lalu **diuji dengan `schtasks /run`** (bukan diasumsikan jalan).

**Tahap 3**
7. `BerandaRows` & `DramaBrowser` menerima `baseUrl` lewat prop (tiru pola `HomeHero`), diteruskan ke `ContentRow`/`DramaCard`; hapus `process.env` dari kedua komponen client.

**Penjaga (semua tahap)**
8. Tes: `isAllowedVideoBase` menolak `http:`, host di luar allowlist, dan string sampah; endpoint menolak secret salah; `getVideoBaseUrl` jatuh ke env saat DB kosong. Pakai `vitest` yang sudah ada.
9. Gerbang sebelum klaim selesai: `npm test` · `npx tsc --noEmit` · `next build` · owner restart PC backup tanpa menyentuh apa pun lalu menekan play.

## Definisi selesai

Hanya boleh disebut selesai kalau owner **merestart PC backup, tidak membuka PowerShell sama sekali,
lalu videonya bisa diputar** — plus seluruh pemeriksa di langkah 9 hijau.
