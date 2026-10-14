# PC backup: alihkan laporan tunnel dari Vercel ke Railway

> Dibuat 2026-10-14. **Ditulis ulang 2026-10-14 sore** sesudah percobaan pertama
> gagal tiga kali dan sempat membuat video penonton mati. Semua yang gagal itu
> dicatat di sini supaya tidak diulang.
>
> Dikerjakan **di PC backup**, bukan di komputer kerja. Perkiraan 10 menit.

---

## ✅ Status: SELURUHNYA SELESAI (2026-10-14)

| Langkah | Status |
|---|---|
| 1. Salin skrip terbaru ke PC backup | ✅ **SELESAI** — sidik jari cocok, `DRAMAAPP_SITUS_URL` muncul 4× |
| 2. Set dua env (alamat + secret) | ✅ **SELESAI** — sidik jari env cocok `501FE64328D5…` |
| 3. Jalankan skrip & baca log | ✅ **SELESAI** — jalur "sudah sehat", tunnel tak dibongkar |
| 4. Buktikan dengan memutar video | ✅ **SELESAI** — `206 video/mp4` di kedua situs |
| 5. Uji RESTART (bukti terkuat) | ✅ **LULUS** — lihat bawah |

### ✅ SELURUHNYA SELESAI 2026-10-14 ±18:55 WIB

**Bukti terkuat datang dari restart PC backup.** Restart memaksa semuanya mulai
dari nol: tunnel mati, naik lagi dengan **alamat acak baru**, lalu agent — yang
saat booting dijalankan Task Scheduler **sebagai SYSTEM, bukan oleh manusia** —
melaporkannya, dan laporannya **diterima**.

| | Sebelum restart | Sesudah restart |
|---|---|---|
| Alamat tunnel | `break-removal-weekend-dicke…` | **`dark-rugby-businesses-cradle…`** |
| Stempel laporan | `11:16:14.248Z` | **`11:53:04.770Z`** |
| Video (2 situs) | 206 | **206 `video/mp4`** |

Rantai kesimpulannya rapat: alamat berganti → agent berjalan dari boot ·
laporan diterima → secret benar · secret 43 karakter **hanya berlaku di
Railway** (Vercel memakai 32 dan akan menolak 401) → **tujuannya pasti Railway**
· SYSTEM berhasil membacanya → **`Machine` memang terbaca Task Scheduler**.

Tanpa uji restart, yang terbukti baru "jalan saat dijalankan manual" — jenis
bukti setengah yang sudah dua kali menipu pada hari yang sama.

> **Dampak ke penutupan Vercel:** blocker "video mati kalau Vercel dimatikan"
> sudah **TERCORET**. Sisa blocker (diperbarui 2026-10-15): **domain final belum
> dibeli** — keputusan owner, bukan kerja teknis · `KEEPALIVE_SITES` yang masih
> memuat alamat Vercel. `NEXT_PUBLIC_SITE_URL` **tidak lagi dihitung blocker**:
> sengaja dibiarkan kosong sampai domain itu ada, dan itu keadaan yang aman —
> prosedurnya di `docs/migrasi-railway-tahap6-pindah-domain.md`.

---

## Kenapa ini mendesak (dan kenapa tak akan kelihatan kalau terlewat)

PC backup menyimpan berkas video. Ia terhubung ke internet lewat **tunnel**
yang **alamatnya berganti tiap kali layanan restart**. Supaya situs tahu alamat
barunya, agent di PC ini melaporkannya ke `/api/agent/video-base`.

Alamat tujuan laporan itu dulu ditulis mati ke `https://dramaapp.vercel.app`.
Begitu Vercel dipensiunkan, laporan tak pernah sampai — situs tetap memakai
alamat tunnel lama. Selama tunnel belum restart, semua **terlihat normal**.
Begitu restart, **seluruh video mati** dan tak ada satu pun peringatan: env
var, status service, dan `curl` ke tunnel baru semuanya tetap hijau.

**DUA hal harus diubah, bukan satu.** Alamat benar + secret salah = ditolak,
sama matinya.

---

## 🔴 Prasyarat yang lahir dari insiden 2026-10-14

### A. Pastikan hanya ADA SATU proses `cloudflared`

Pada 2026-10-14 alamat tunnel berganti **4 kali dalam 1,5 jam** —
`stock-location…` → `vista-dry-flavor…` → `patio-commerce-dark…` →
`break-removal-weekend…`. Tiap pergantian = beberapa menit video mati sampai
laporan barunya masuk.

Tersangka: skrip dijalankan **manual** sementara Task Scheduler juga
menjalankannya tiap 15 menit → dua `cloudflared` saling mematikan.

```powershell
Get-Process cloudflared -ErrorAction SilentlyContinue | Select-Object Id,StartTime
```

- **Lebih dari satu baris** → bereskan dulu; jangan migrasi di atas sistem yang
  sedang kacau, nanti gejalanya tercampur dan tak bisa dibedakan mana sebab
  mana akibat.
- **Satu baris** → lanjut.

### B. Jangan migrasi saat video sedang bermasalah

Kalau penonton sedang tidak bisa memutar video, **pulihkan dulu ke keadaan yang
terbukti bekerja**, baru migrasi belakangan. Alasannya terbukti mahal pada
2026-10-14: tunnel mati sendiri, dan karena migrasi sedang setengah jalan
(secret berisi 1 karakter), **pemulihan otomatis ikut terhalang** — laporan
alamat baru ditolak 401 dan alamat mati tetap tersimpan.

### C. 🪤 JANGAN tinggalkan jendela PowerShell terbuka sesudah menjalankan skrip manual

Skrip memakai mutex `Global\DramaAppVideoServices` supaya dua instance tidak
berpapasan — tapi **`ReleaseMutex` tidak pernah dipanggil** di seluruh berkas,
dan tidak ada blok `finally`. Mutex dipegang oleh **proses**, bukan skrip.

Saat Task Scheduler menjalankannya: PowerShell lahir → jalan → mati → kunci
terlepas. Saat **manusia** menjalankannya manual: `exit 0` hanya mengakhiri
SKRIPNYA; jendela PowerShell tetap hidup dan **masih memegang kunci**.

Akibatnya tiap run terjadwal berikutnya keluar dengan
`instance lain sedang berjalan -> keluar (bukan error)` — **tugas terjadwal
berhenti bekerja selama jendela itu terbuka.** Terjadi nyata 2026-10-14: dua run
SYSTEM berturut-turut (18:20, 18:35) tertahan.

Berbahayanya senyap: video tetap hidup selama tunnel yang sekarang sehat, tapi
begitu tunnel mati **tidak ada yang memulihkannya**.

**Obat:** tutup jendela PowerShell-nya sesudah selesai. Kalau sudah terlanjur
tertahan, **restart PC backup** — sekalian menguji jalur boot, yang memang
satu-satunya bukti yang benar-benar menentukan.

---

## Sebelum mulai: nilai yang dibutuhkan

| Yang perlu | Di mana | Catatan |
|---|---|---|
| Alamat situs Railway | `https://dramaapp-production-9e88.up.railway.app` | kalau nanti dipasang domain sendiri, ulangi langkah ini dengan alamat itu |
| `HARDLINK_AGENT_SECRET` Railway | `.env.railway.local` di komputer kerja | **43 karakter** |

### Cara membuktikan nilainya benar TANPA menampilkannya

SHA-256 dari nilai yang benar:

```
501FE64328D5AA7525C0ABECA6DFCEB33AC1F058E98535CDD2FF5E896A2E9FF6
```

Sidik jari ini **bukan rahasia** — ia ringkasan satu arah, aman ditulis di sini
dan aman di-screenshot. Panjang 43 saja tidak cukup membuktikan apa pun: bisa
saja 43 karakter yang salah (tertukar, terpotong, kena spasi).

**Sudah diverifikasi 2026-10-14** bahwa Railway menerima nilai ini: POST ke
`/api/agent/video-base` dengan body `{}` →

- secret sengaja salah → **401**
- nilai ini → **400 "baseUrl wajib diisi"** = autentikasi **lolos**, dan karena
  `baseUrl` kosong, **tidak ada apa pun yang tertulis**

⚠️ **`.env.vercel.local` JANGAN dipakai sebagai acuan.** Isinya **placeholder**,
bukan nilai asli. Pada 2026-10-14 berkas itu membuat sesi AI melaporkan
"secret lama 11 karakter" ke owner, padahal kenyataannya **32**.

---

## 🪤 Tiga cara memindahkan secret yang GAGAL — jangan diulang

Ketiganya terlihat masuk akal saat ditulis. Semuanya gagal pada 2026-10-14.

### 1. `Get-Clipboard` di dalam perintah yang harus disalin → 378 karakter

Perintahnya membaca clipboard, tapi untuk menjalankannya Anda harus **menyalin
perintah itu dulu** — dan penyalinan itulah yang menimpa isi clipboard. Yang
masuk ke env justru teks perintahnya sendiri (378 karakter).

**Mustahil berhasil, bukan nasib buruk.** Perintah dan rahasia tidak boleh
berebut clipboard yang sama.

### 2. Ctrl+V di prompt `Read-Host -AsSecureString` → 1 karakter

Console Windows tidak menangani Ctrl+V sebagai "tempel" di prompt bertopeng —
ia memasukkannya sebagai **satu karakter kendali**. Hasilnya panjang 1.

(Klik kanan kadang bekerja, tapi tergantung setelan console — terlalu rapuh
untuk diandalkan.)

### 3. Mengutip panjang dari berkas env yang salah

Lihat peringatan `.env.vercel.local` di atas.

---

## ✅ Cara yang BERHASIL: lewat Notepad

Kuncinya: pindahkan rahasianya ke **berkas** dulu (di Notepad, Ctrl+V bekerja
normal), baru jalankan perintah. Setelah itu clipboard bebas dipakai menyalin
perintah tanpa saling menimpa.

### Langkah 2a — amankan nilai lama (jalan mundur)

```powershell
[Environment]::GetEnvironmentVariable('HARDLINK_AGENT_SECRET','Machine') | Out-File "$env:USERPROFILE\secret-lama.txt"
([Environment]::GetEnvironmentVariable('HARDLINK_AGENT_SECRET','Machine')).Length
```

Harus menjawab **32**. Menulis ke berkas, bukan ke layar — supaya aman kalau
layarnya di-screenshot.

### Langkah 2b — taruh secret baru di berkas

1. Di komputer kerja: buka `.env.railway.local` dengan Notepad, salin nilai
   sesudah `HARDLINK_AGENT_SECRET=`
2. Di PC backup: **Win+R** → `notepad` → **Ctrl+V**
3. Pastikan isinya **satu baris**. Kalau yang muncul teks perintah panjang,
   clipboard tertimpa — ulangi
4. **File → Save As** → `C:\Users\USER\s.txt`

### Langkah 2c — pasang dua env sekaligus (PowerShell **Administrator**)

```powershell
$f = "$env:USERPROFILE\s.txt"
if (-not (Test-Path $f)) { "BERKAS TIDAK ADA: $f" } else {
  $plain = (Get-Content $f -Raw -Encoding UTF8).Trim([char]0xFEFF).Trim()
  "panjang dibaca : $($plain.Length)"
  [Environment]::SetEnvironmentVariable('HARDLINK_AGENT_SECRET',$plain,'Machine')
  [Environment]::SetEnvironmentVariable('DRAMAAPP_SITUS_URL','https://dramaapp-production-9e88.up.railway.app','Machine')
  $v = [Environment]::GetEnvironmentVariable('HARDLINK_AGENT_SECRET','Machine')
  "panjang env    : $($v.Length)"
  $h = [Security.Cryptography.SHA256]::Create()
  "sidikjari      : " + ([BitConverter]::ToString($h.ComputeHash([Text.Encoding]::UTF8.GetBytes($v)))).Replace('-','')
  "alamat         : " + [Environment]::GetEnvironmentVariable('DRAMAAPP_SITUS_URL','Machine')
  Remove-Item $f -Force
  "berkas dihapus : " + (-not (Test-Path $f))
  Remove-Variable plain,v
}
```

`.Trim([char]0xFEFF)` membuang BOM — Notepad bisa menyisipkannya diam-diam saat
menyimpan UTF-8, dan tanpa ini panjangnya jadi 44 dan sidik jarinya salah.

Berkas `s.txt` dihapus otomatis di baris terakhir.

### Yang harus keluar

```
panjang dibaca : 43
panjang env    : 43
sidikjari      : 501FE64328D5AA7525C0ABECA6DFCEB33AC1F058E98535CDD2FF5E896A2E9FF6
alamat         : https://dramaapp-production-9e88.up.railway.app
berkas dihapus : True
```

Aman di-screenshot.

| Yang terlihat | Artinya |
|---|---|
| `panjang dibaca` = 378 | Notepad kena teks perintah → ulangi 2b |
| `panjang dibaca` = 44 | BOM ikut terbaca → periksa baris `.Trim` |
| panjang 43 tapi sidik jari beda | 43 karakter yang salah → salin ulang |
| `BERKAS TIDAK ADA` | Notepad menyimpan jadi `s.txt.txt` → cek File → Save As |

⚠️ **`Machine`, bukan `User`.** Agent dijalankan Task Scheduler sebagai SYSTEM;
env level User tidak terbaca olehnya. Gejalanya menyesatkan — jalan saat dites
manual, gagal saat booting.

---

## Langkah 3 — jalankan skrip, baca lognya

```powershell
cd C:\Users\USER\pc-backup-agent
.\start-video-services.ps1
```

🪤 **Layar akan KOSONG — itu normal, bukan tanda gagal.** Fungsi `Catat`
(`start-video-services.ps1:100-103`) hanya menulis ke berkas log, tidak ke
layar. Lognya:

```powershell
Get-Content .\logs\start-video-services.log -Tail 40
```

| Baris log | Artinya |
|---|---|
| `secret terbaca (panjang 43 karakter)` | ✅ env terbaca benar. Kalau masih **32**, env belum masuk |
| `alamat DILAPORKAN & tersimpan: …` | ✅ laporan diterima situs |
| `percobaan lapor ke-N gagal: … 401` | secret beda dari Railway → ulangi langkah 2 |
| `percobaan lapor ke-N gagal: … 404` | alamat situs salah ketik |
| `GAGAL melapor` | video mati sampai laporan berhasil — jangan tinggalkan |

> **Tutup-buka PowerShell tidak perlu.** Skrip membaca env tingkat Machine
> langsung dari registry (`start-video-services.ps1:353`), bukan dari salinan
> di memori shell. (Beda dengan membacanya lewat `$env:` biasa.)

---

## Langkah 4 — buktikan dari sisi situs, jangan percaya log saja

Buka situs Railway, **putar satu episode drama**.

> Log "DILAPORKAN" membuktikan situs **menerima** laporan. Hanya video yang
> benar-benar jalan membuktikan alamat itu **dipakai dan benar**.

Cara membuktikannya dari terminal (dari komputer mana pun):

```bash
curl -sL -r 0-511 -o /dev/null -w "%{http_code} %{content_type} %{size_download}\n" \
  "https://dramaapp-production-9e88.up.railway.app/api/teaser?id=ahli-bela-diri-terkuat-mengguncang-keluarga-besar&ep=1"
```

Target: **`206 video/mp4 512`**. Itu potongan berkas video sungguhan.
`307` saja belum cukup — itu baru pengalihan, belum berkas.
`000` berarti alamat tunnel yang tersimpan sudah mati.

---

## Kalau perlu mundur

🔴 **Kembalikan KEDUANYA, jangan satu saja.** Alamat Vercel + secret 43 = ditolak
401, dan gejalanya persis seperti tidak melakukan apa-apa: senyap, sampai ada
yang menekan play.

```powershell
$lama = (Get-Content "$env:USERPROFILE\secret-lama.txt" -Raw).Trim()
"panjang lama: $($lama.Length)"
[Environment]::SetEnvironmentVariable('HARDLINK_AGENT_SECRET',$lama,'Machine')
[Environment]::SetEnvironmentVariable('DRAMAAPP_SITUS_URL','https://dramaapp.vercel.app','Machine')
cd C:\Users\USER\pc-backup-agent
.\start-video-services.ps1
```

`panjang lama` harus **32**. Kalau **0**, berkas cadangannya kosong — berhenti,
jalan mundur Anda belum aman.

---

## Kapan dikerjakan

Boleh **sekarang**, tidak perlu menunggu apa pun. Webhook Playly sudah pindah
dan tidak bergantung pada ini.

Mengerjakannya lebih awal justru lebih aman — kalau ada yang meleset,
ketahuannya saat Vercel masih hidup sebagai jaring pengaman.

⚠️ **Jangan tunda sampai Vercel dimatikan.** Setelah itu, satu-satunya cara tahu
ada yang salah adalah penonton mengeluh video tidak jalan.

---

## Berkas terkait

- `pc-backup-agent/start-video-services.ps1` — skrip agent (sudah versi baru di PC backup)
- `pc-backup-agent/README.md` — penjaga berkas, Caddy, cloudflared
- `.env.railway.local` — nilai acuan, **baca blok peringatan di kepalanya**
- `HANDOFF.md` entri 2026-10-14 15:20 WIB — kronologi insiden lengkap
