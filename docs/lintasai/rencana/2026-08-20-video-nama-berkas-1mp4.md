# Video baru tidak bisa diputar walau berkasnya ada — nama berkas ≠ `1.mp4`

> 2026-08-20 · pemicu: drama **Over Your Dead Body** (`/feed/over-your-dead-body`) sudah
> ditambahkan & "scan berhasil", tapi ditekan play tidak jalan.

## Gejala vs kenyataan

| Yang dilihat owner | Kenyataan di rantai video |
|---|---|
| Drama tampil, tombol play ada, tapi video tak jalan | `GET <tunnel>/over-your-dead-body/1.mp4` → **404** |
| "Scan-nya berhasil kok" | Yang berhasil = metadata IMDb. Berkas `N.mp4` tidak pernah terbentuk |
| Dikira tunnel/PC backup mati | Tunnel **sehat**: drama lain (`guru-misterius-.../1.mp4`) balas **200**, `/_agent/health` balas `ok:true` |

Isi folder di PC backup saat diperiksa:

- `over-your-dead-body/Over-Your-Dead-Body.mp4` — MP4 sah (H.264, `ftypmp42`), 1,69 GB
- `_raw_over-your-dead-body/over-your-dead-body.mkv` — MKV 1,47 GB (versi sebelum konversi)

Player **selalu** meminta `<base>/<drama-id>/<ep>.mp4` (`lib/video.ts:12-13`) — tidak ada
mekanisme mencari nama lain. Jadi berkas bernama apa pun selain `1.mp4` = 404.

## Tiga bug di `pc-backup-agent/hardlink-agent.js` (semua sudah diperbaiki)

1. **Angka `4` pada ekstensi `.mp4` terbaca sebagai nomor episode.** Regex `/(\d+)/`
   dijalankan atas nama berkas lengkap, jadi `trailer.mp4` diam-diam terdaftar sebagai
   **episode 4**. Perbaikan: ekstensi dibuang dulu sebelum mencari angka.
2. **Berkas mp4 tanpa angka dilewati diam-diam.** Film 1-episode (`Over-Your-Dead-Body.mp4`)
   tidak punya nomor sama sekali. Perbaikan: kalau dia satu-satunya kandidat → episode 1;
   kalau ada berkas bernomor lain → tetap tidak ditebak, tapi **dilaporkan** (`ignored`).
3. **Nol hardlink tetap dibalas `ok:true`** → admin melihat "berhasil" padahal video tetap
   404 (kerusakan senyap). Perbaikan: `created === 0` → `ok:false` + sebab yang bisa
   ditindak (berkas non-MP4 perlu konversi / nomor ganda / tanpa nomor / folder kosong).

Bonus: dulu kalau `_raw_<id>` sudah ada, isi folder bersih **tidak pernah dibaca** — persis
kondisi drama ini (mkv di `_raw_`, mp4 hasil konversi di folder bersih). Sekarang kandidat
diambil dari **kedua** folder.

Catatan kontainer: `.mkv` **tidak** cukup di-rename jadi `.mp4` — `<video>` di browser tidak
bisa memutar Matroska. Harus dikonversi (mis. `ffmpeg -i x.mkv -c copy 1.mp4` kalau codec di
dalamnya sudah H.264/AAC).

## Penjaga permanen

`tests/hardlink-agent.test.ts` (10 tes, `npm test`) mengunci ketiga bug di atas — termasuk
kasus persis drama ini (mkv di `_raw_` + mp4 tanpa angka di folder bersih → wajib jadi `1.mp4`).

## Yang harus dilakukan di PC backup

Berkas video ada di PC backup, jadi perbaikan kode saja tidak menyembuhkan drama yang
terlanjur rusak. Dua langkah:

1. **Sekarang (10 detik)** — bikin `1.mp4` untuk drama ini:
   ```powershell
   New-Item -ItemType HardLink -Path "C:\Users\USER\Downloads\video\over-your-dead-body\1.mp4" -Target "C:\Users\USER\Downloads\video\over-your-dead-body\Over-Your-Dead-Body.mp4"
   ```
   Hardlink = nama kedua untuk berkas yang sama, **tidak** menyalin 1,69 GB.
2. **Supaya tak terulang** — salin `pc-backup-agent/hardlink-agent.js` versi baru ke
   `C:\Users\USER\pc-backup-agent\`, lalu restart service:
   ```powershell
   Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*node*" } | Stop-Process -Force
   schtasks /run /tn "DramaApp Video"
   ```

## Catatan lain yang terlihat saat memeriksa

- `NEXT_PUBLIC_VIDEO_BASE_URL` di produksi masih **quick tunnel**
  (`https://written-coated-drawings-joe.trycloudflare.com`), belum `video.amasyaforum.com`.
  Migrasi named tunnel di [2026-08-20-video-otomatis-tanpa-powershell.md](./2026-08-20-video-otomatis-tanpa-powershell.md) belum dipakai produksi.
- Film ini 1,69 GB untuk 105 menit. Bisa diputar, tapi lewat quick tunnel akan berat —
  kandidat dikompres ke 720p (~500 MB) kalau buffering terasa mengganggu.
