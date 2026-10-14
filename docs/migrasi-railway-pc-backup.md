# PC backup: alihkan laporan tunnel dari Vercel ke Railway

> Dibuat 2026-10-14. Dikerjakan **di PC backup**, bukan di komputer kerja.
> Perkiraan 10 menit. **Tidak menyentuh penonton** — kalau gagal, keadaan hari
> ini tetap berjalan.

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
sama matinya. `HANDOFF.md` mencatat `HARDLINK_AGENT_SECRET` di Railway
**berbeda** dari yang dipakai PC ini.

## Sebelum mulai

- Nilai `HARDLINK_AGENT_SECRET` **yang terpasang di Railway** (panel Railway →
  Variables). Ini acuannya — PC yang menyesuaikan, bukan sebaliknya.
- Alamat situs Railway (sekarang `https://dramaapp-production-9e88.up.railway.app`).
  ⚠️ Kalau nanti dipasang domain sendiri, langkah ini diulang dengan alamat itu.

---

## Langkah

### 1. Salin skrip terbaru ke PC backup

Skrip `pc-backup-agent/start-video-services.ps1` sudah diubah supaya alamat
situs dibaca dari env, **tidak lagi ditulis mati**. Salin berkas itu menimpa
yang ada di PC backup.

> **Jalur cepat** kalau tak ingin menyalin berkas sekarang: buka skrip lama di
> PC backup, cari baris `$SITUS_URL = "https://dramaapp.vercel.app"`, ganti
> alamatnya. Hasil akhirnya sama untuk hari ini — bedanya pergantian alamat
> BERIKUTNYA harus menyunting berkas lagi.

### 2. Set dua env, PowerShell **sebagai Administrator**

```powershell
[Environment]::SetEnvironmentVariable('DRAMAAPP_SITUS_URL','https://dramaapp-production-9e88.up.railway.app','Machine')
[Environment]::SetEnvironmentVariable('HARDLINK_AGENT_SECRET','<nilai-dari-Railway>','Machine')
```

⚠️ **`Machine`, bukan `User`.** Agent dijalankan Task Scheduler sebagai SYSTEM;
env level User tidak terbaca olehnya, dan gejalanya menyesatkan — jalan saat
dites manual, gagal saat booting.

⚠️ **Tutup lalu buka ulang PowerShell.** Env Machine hanya terbaca proses yang
lahir sesudah nilainya diubah. Melewatkan ini membuat langkah 3 menguji nilai
LAMA dan terlihat "berhasil" secara palsu.

### 3. Jalankan skrip, baca logya

```powershell
.\start-video-services.ps1
```

Yang dicari di log:

| Baris log | Artinya |
|---|---|
| `alamat DILAPORKAN & tersimpan: …` | ✅ berhasil |
| `percobaan lapor ke-N gagal: … 401` | secret **beda** dari Railway → ulangi langkah 2 |
| `percobaan lapor ke-N gagal: … 404` | alamat situs salah ketik |
| `secret terbaca (panjang N karakter)` | bandingkan N dengan panjang nilai Railway |

### 4. Buktikan dari sisi situs (jangan percaya log saja)

Buka **Admin → Videos** di situs Railway, atau putar satu episode drama.
Video jalan = rantai penuh (situs → tunnel → Caddy → berkas) terbukti hidup.

> Log "DILAPORKAN" membuktikan situs **menerima** laporan. Hanya video yang
> benar-benar diputar membuktikan alamat itu **dipakai dan benar**.

---

## Kalau perlu mundur

Kembalikan env ke nilai semula, tutup-buka PowerShell, jalankan ulang skrip:

```powershell
[Environment]::SetEnvironmentVariable('DRAMAAPP_SITUS_URL','https://dramaapp.vercel.app','Machine')
[Environment]::SetEnvironmentVariable('HARDLINK_AGENT_SECRET','<nilai-lama>','Machine')
```

**Catat nilai lama sebelum menimpanya** — tanpa itu, mundur tidak mungkin.

## Kapan dikerjakan

Boleh **sekarang**, tidak perlu menunggu pergantian webhook Playly. Keduanya
tidak saling bergantung: webhook mengurus film baru masuk, ini mengurus video
bisa diputar.

Mengerjakannya lebih awal justru lebih aman — kalau ada yang meleset,
ketahuannya saat Vercel masih hidup sebagai jaring pengaman.

⚠️ **Jangan tunda sampai Vercel dimatikan.** Setelah itu, satu-satunya cara
tahu ada yang salah adalah penonton mengeluh video tidak jalan.
