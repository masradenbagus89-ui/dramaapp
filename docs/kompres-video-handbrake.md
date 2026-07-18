# Panduan Kompres Video Drama (HandBrake) — untuk staf non-programmer

> v1 · 2026-06-28 · Tujuan: kecilkan ukuran video drama **tanpa kelihatan turun kualitas di HP**, supaya muat di penyimpanan gratis + loading lebih cepat.

---

## Kenapa perlu

Video sekarang **~290 MB per episode** (cuma 2 menit) — itu ~4–6× lebih besar dari yang dibutuhkan. Setelah dikompres, perkiraan jadi **~30–70 MB per episode** (turun 4–8×), dan di layar HP **tidak kelihatan bedanya**.

🏢 Analogi: seperti memindahkan surat dari kardus sebesar kulkas ke amplop biasa — isinya sama, ukurannya jauh lebih kecil.

---

## Aturan WAJIB (baca dulu, biar aman)

1. **JANGAN timpa video asli.** Simpan hasil kompres ke **folder BARU** (mis. `videos-kompres`). Kalau hasilnya kurang bagus, tinggal buang folder baru — asli tetap aman.
2. **Nama file harus SAMA** dengan asli (`2.mp4` tetap `2.mp4`). Aplikasi mencari video berdasarkan nama ini — kalau berubah, video tak ketemu.
3. **Uji 1 episode dulu**, tonton di HP, baru proses banyak.

---

## Langkah 0 — Pasang HandBrake (gratis, sekali saja)

1. Buka **https://handbrake.fr** (situs resmi).
2. Klik **Download HandBrake** → pilih versi **Windows**.
3. Pasang seperti aplikasi biasa (klik Next sampai selesai).
4. (Kalau diminta ".NET Desktop Runtime" → ikuti tautannya, pasang itu dulu, lalu pasang HandBrake lagi.)

---

## Resep setelan (pakai ini — sudah pas untuk drama vertikal)

| Bagian | Setel ke | Keterangan |
|---|---|---|
| **Format** (tab Summary) | **MP4** | Wajib MP4 supaya app bisa memutar |
| **Video Encoder** (tab Video) | **H.264 (x264)** | Paling kompatibel di semua HP/browser |
| **Framerate** | **Same as source** + **Peak Framerate** | Ikut aslinya |
| **Quality** | **Constant Quality, RF 23** | Ini "tombol kualitas vs ukuran" |
| **Encoder Preset** (geser) | **Medium** | Lebih kecil untuk kualitas sama (agak lebih lama) |
| **Audio** (tab Audio) | **AAC**, **128 kbps**, Stereo | Suara dialog cukup segini |
| **Resolusi** (tab Dimensions) | Biarkan **1080×1920** | Jangan diubah/diperbesar |

**Soal "RF 23" (tombol kualitas):** angka KECIL = kualitas lebih bagus tapi file lebih besar; angka BESAR = file lebih kecil. **23** = titik tengah yang bagus. Kalau hasil kurang tajam → turunkan ke **21**. Kalau masih kegedean & gambar masih oke → naikkan ke **25**.

---

## Langkah 1 — Uji 1 episode dulu

1. Buka HandBrake → klik **Open Source** → pilih **1 file** (mis. `2.mp4`).
2. Terapkan **resep setelan** di atas.
3. Di bawah ("Save As"), arahkan ke **folder BARU** `videos-kompres`, pastikan nama file tetap **`2.mp4`**.
4. Klik **Start Encode** (tombol play hijau di atas). Tunggu selesai.
5. **Tonton hasilnya di HP** sampai layar penuh. Bandingkan dengan asli:
   - Tajam & enak ditonton → ✅ lanjut ke Langkah 2.
   - Pecah/buram → ulangi dengan RF **21**.

---

## Langkah 2 — Proses banyak file sekaligus (batch)

1. Klik **Open Source** → **Open Folder** → pilih **1 folder drama** (mis. folder `ceo-miliarder-...`).
2. HandBrake akan memindai semua episode di folder itu.
3. Pastikan **resep setelan** masih terpasang.
4. Atur **folder tujuan** = folder baru `videos-kompres/<nama-drama>/` (nama file dibiarkan sama).
5. Klik **Add to Queue** → **Add All** (masukkan semua episode ke antrean).
6. Klik **Start Queue**. Biarkan jalan — bisa lama (banyak file). **Boleh ditinggal semalaman.**
7. Ulangi per folder drama.

---

## Perkiraan waktu

- Per episode: ~1–3 menit proses (tergantung kecepatan komputer).
- Banyak drama × puluhan episode → bisa berjam-jam. **Saran: jalankan malam hari, tinggal tidur.**

---

## Setelah selesai

- Folder `videos-kompres` berisi semua video yang sudah kecil, dengan **nama & susunan folder yang sama** seperti asli.
- Folder inilah yang nanti **diunggah ke penyimpanan gratis** (mis. Internet Archive) — lihat rencana di catatan proyek.

---

## Catatan lanjutan (opsional, jangan dikerjakan dulu)

- **Mau lebih kecil lagi?** Di tab Dimensions, ubah resolusi ke **720×1280** (cukup jernih untuk HP) → ukuran turun lagi ~separuh.
- **Pilihan resolusi di dalam app** (tombol 720p/1080p di pemutar) butuh file varian bernama `2.720p.mp4` dst. Itu pekerjaan tambahan — **lewati dulu**, fokus kecilkan `2.mp4` utama.
- **H.265/HEVC** lebih kecil lagi tapi sebagian HP/browser lama susah memutarnya → **jangan dipakai** untuk situs streaming. Tetap H.264.
