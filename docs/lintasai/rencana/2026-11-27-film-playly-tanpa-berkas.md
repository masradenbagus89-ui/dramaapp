# 2026-11-27 — 70 film Playly yang BERKASNYA sudah tidak ada (hasil pindai menyeluruh)

> **Status: TAHAP A SELESAI (mendata, nol kode disentuh) · TAHAP B menunggu keputusan owner.**
>
> Catatan 2026-11-26 menyebut *"~8% film Playly mati (2 dari 25 sampel), daftar lengkapnya belum
> dipindai"*. Sekarang sudah dipindai seluruhnya: **70 dari 651 film = 10,8%**, nol jawaban
> "tidak tahu" yang tersisa.

**Apa maksudnya, bahasa awam.** Halaman `/film` kita seperti rak berisi kotak DVD. Kepingan
videonya tidak di rak kita — ada di gudang milik mitra (Playly). 70 kotak di rak itu kepingannya
sudah tidak ada lagi di gudang. Penonton melihat cover, mengklik, lalu videonya tidak jalan.

---

## 1. Angka yang diukur (bukan diperkirakan)

| Yang diukur | Hasil |
|---|---|
| Film di halaman `/film` produksi | **651** |
| Berkas videonya ADA di Playly | **581** |
| Berkas videonya TIDAK ADA (mati) | **70** (10,8%) |
| Jawaban "tidak tahu" yang tersisa | **0** |

**Cara mengukurnya** — penting kalau nanti diulang:

1. Daftar id diambil dari **HTML produksi `/film`** (651 id unik), BUKAN dari `/api/videos`
   milik mitra. Sebabnya kunci Playly tersimpan terenkripsi di database dan
   `PLAYLY_ENCRYPTION_KEY` hanya ada di panel Railway — tidak ada di komputer kerja. Ternyata
   justru lebih tepat: isi `/film` persis yang sedang dilihat penonton (sudah lewat penyaring
   "disembunyikan admin").
2. Tiap id ditanyakan ke `/api/public-video` Playly memakai fungsi ASLI situs
   (`fetchPlaylyDetailPublik` + `punyaFileVideo` + `bolehTampilKePenonton` di `lib/playly.ts` &
   `lib/playly-publik.ts`), bukan logika tiruan.
3. Daftar lengkap 70 judul: `docs/film-playly-tanpa-berkas-2026-11-27.txt` (id + judul).

### 🪤 Jebakan yang HAMPIR membuat angkanya salah

Putaran pertama (2 pekerja paralel, jeda 0,4 detik) memulangkan **139 jawaban "tidak tahu"** —
dan itu BUKAN sifat filmnya, melainkan sifat pemindaiannya: ke-139 itu jatuh dalam **4 blok
BERURUTAN** (posisi 152–650), pola waktu. Enam di antaranya diukur ulang satu per satu dan
semuanya membalas **200 dengan `videoUrl` utuh**.

Putaran kedua (**1 pekerja, jeda 0,7 detik, tiap kegagalan diulang 3×**) menyelesaikan ke-139 itu:
**118 sehat + 21 mati + 0 tidak tahu**. Jadi 21 film mati **akan terlewat** kalau putaran pertama
dianggap selesai.

⭐ **Aturannya: "tidak tahu" yang berkelompok berurutan = alat ukurnya terlalu cepat, bukan
datanya yang aneh.** Playly memberi dua batas (dicatat di `lib/playly.ts:1566`): 120
permintaan/menit per IP DAN maksimal 3–5 panggilan bersamaan. Kode produksi menghormati batas
KEDUA; untuk sapuan sekali-jalan 651 panggilan, batas PERTAMA-lah yang menentukan.

### Diuji-balik di produksi (bukan cuma dipercaya dari alat sendiri)

| Uji | Hasil |
|---|---|
| 5 film yang disebut MATI → gerbang pemutar produksi | **502** (5/5) |
| 5 film yang disebut SEHAT → gerbang yang sama | **200** (5/5) |
| Dokumen ingatan `playly:berkas-siap` di Supabase | **49 ditandai belum-siap** — persis sama dengan hasil putaran 1, dari jalur yang berbeda |

---

## 2. Yang dirasakan penonton sekarang — dan satu BUG BARU yang ikut ketemu

Untuk ke-70 film itu: halaman `/tonton/<id>` tetap terbuka **200**, lalu gerbang pemutar
(`app/api/playly/video/route.ts`) membalas **502** karena alamat videonya tidak bisa diambil.

🔴 **BUG BARU (bukan bagian rencana ini, ketemu saat mengukur): pesan error kita DIBUANG
Cloudflare, dan penonton malah disuruh memeriksa koneksinya sendiri.**

| Dipanggil lewat | Badan balasan |
|---|---|
| Langsung ke Railway | `{"ok":false,"error":"Alamat video sedang tidak bisa diambil dari Playly."}` |
| Lewat `layarindo.com` (Cloudflare) | `error code: 502` · `Content-Type: text/plain` · `Server: cloudflare` |

`app/components/player/PlaylyPlayer.tsx:173` menjalankan `await res.json()` atas badan teks itu →
melempar → tertangkap `catch` di baris 197 → yang tergambar di layar penonton:
**"Gagal menghubungi server. Cek koneksi lalu coba lagi."** Padahal koneksinya sehat; filmnya yang
sudah tidak ada. Penonton akan mencoba berulang kali.

**Diukur juga: Cloudflare hanya mengganti badan 5xx, 4xx diteruskan apa adanya.**

| Status dari server kita | Lewat Cloudflare |
|---|---|
| 400 `Id video tidak valid.` | **utuh** ✅ |
| 404 `Video tidak tersedia.` | **utuh** ✅ |
| 502 `Alamat video sedang tidak bisa diambil…` | **diganti** `error code: 502` ❌ |

Ini regresi dari pindah domain ke belakang Cloudflare (2026-11-26), **bukan** dari perubahan kode.

### Ikutan: ke-70 film mati ADA di `sitemap.xml`

Diukur: **70 dari 70** ikut terdaftar di `https://layarindo.com/sitemap.xml` (697 alamat). Artinya
Google diminta mengindeks 70 halaman yang videonya tidak bisa diputar.

---

## 3. Kenapa penyaringnya hilang — sejarahnya, supaya tidak "diperbaiki" ke arah yang sudah gagal

Penyaring "berkas videonya belum ada" **dulu ADA** di daftar penonton, lalu **sengaja dibuang
owner 2026-10-06**. Alasannya terdokumentasi di `lib/playly-publik.ts` (komentar panjang di
`getPlaylyVideosPublik`): memeriksanya = 1 panggilan ke Playly **per video**, dan 172 panggilan
SERENTAK tiap halaman dibangun ulang membuat Playly lewat batas tunggu 8 detik → **SELURUH poster
jadi kosong**, persis kebalikan dari tujuannya.

Komentar itu sendiri sudah menuliskan jalan naiknya:

> *"Kalau kelak video rusak jadi sering, pasang lagi pemeriksaannya lewat `petaBerbatasPlayly` +
> simpan hasilnya di database — JANGAN kembali ke `Promise.all` atas seluruh daftar."*

✅ **Alat itu SUDAH ADA sejak 2026-11-11**: `lib/playly-berkas-siap.ts` — pemeriksaan berbatas 4
panggilan + ingatan 5 menit + salinan di `app_data` dokumen `playly:berkas-siap`. Sekarang ia cuma
dipakai panel admin (`/api/admin/playly/belum-siap`), belum oleh halaman penonton.

⚠️ **Dua catatan di kode yang sekarang KELIRU dan menyesatkan sesi berikutnya:**

1. `lib/playly-gabungan.ts` baris 5–7 menulis katalog *"sudah lolos dua saringan penting: video
   yang disembunyikan admin dibuang, dan video yang berkasnya belum ada di Playly juga dibuang."*
   Saringan kedua itu **sudah tidak ada** sejak 2026-10-06.
2. `lib/playly-publik.ts` menyebut yang menahan penonton adalah "gerbang pemutar … membalas pesan
   kalau tak ada". Pesannya **tidak sampai** ke penonton sejak pindah Cloudflare (bagian 2 di atas).

---

## 4. TAHAP B — pilihan perbaikan (menunggu keputusan owner)

### B1. Saring dari daftar penonton, pakai ingatan yang SUDAH ADA (rekomendasi)

Tempatnya `gabungVideoPlayly` di `lib/playly-gabungan.ts` — satu fungsi murni yang dilewati
**KEDUA** sumber video (katalog + webhook), persis tempat penyaring "disembunyikan admin" berada.
Isinya: buang id yang **sudah terbukti** tidak punya berkas menurut dokumen `playly:berkas-siap`.

- **Nol panggilan tambahan ke Playly saat halaman dibangun** — hanya membaca dokumen yang sudah
  ikut dibaca halaman (`app_data`), jadi jebakan 2026-10-06 tidak terulang.
- **Gagal-terbuka, dan ini disengaja:** dokumen tak terbaca = tidak ada yang disembunyikan
  (perilaku hari ini). Ini bukan pagar keamanan — tidak ada yang bocor kalau filter gagal —
  sedangkan gagal-tertutup berarti satu gangguan Supabase mengosongkan seluruh rak film.
- **Terpengaruh seluruh halaman**: `/`, `/beranda`, `/film`, `/discover`, `/katalog`, hasil cari,
  `sitemap.xml`, dan gerbang pemutar — semuanya membaca daftar dari satu pintu ini. Itu yang
  diinginkan, tapi harus disebut: **70 film akan HILANG dari situs**, dan kalau mitra meng-upload
  ulang berkasnya, film itu kembali sendiri dalam ≤5 menit.
- Batasnya: dokumen `playly:berkas-siap` hanya disegarkan saat panel admin dibuka (saat ini
  berisi 500 dari 651 id, 49 ditandai mati). Jadi B1 menyembunyikan **yang sudah diketahui**, bukan
  langsung ke-70. Supaya lengkap: buka panel admin **Video Playly** sekali (ia memeriksa semuanya,
  ±1 menit) → dokumennya terisi penuh.

### B2. Penjaga terjadwal (naik kelas opsional, bisa menyusul)

Robot `.github/workflows/keep-db-awake.yml` sudah menyapa situs tiap jam. Pola yang sama bisa
dipakai menyegarkan daftar film mati tiap malam, supaya tidak bergantung pada admin membuka panel.
Butuh endpoint baru + satu token di GitHub Secrets (endpoint yang memicu 651 panggilan ke mitra
tidak boleh terbuka bebas).

### B3. Betulkan pesan yang menyalahkan koneksi penonton (murah, berdiri sendiri)

Dua perubahan kecil, saling melengkapi:

- **Server** (`app/api/playly/video/route.ts`): untuk kasus "berkasnya tidak ada di Playly",
  balas **410 Gone** — status yang artinya *"dulu ada, kini dihapus permanen"*
  (`skills/backend/SKILL.md` §1) — alih-alih 502. Badan 4xx **diteruskan** Cloudflare, jadi pesan
  kita sampai. 502 tetap dipakai untuk kegagalan hulu yang SUNGGUHAN (Playly mati/timeout).
- **Browser** (`app/components/player/PlaylyPlayer.tsx:173`): bungkus `res.json()` supaya badan
  non-JSON tidak melempar, lalu jatuh ke pesan menurut status — bukan ke "cek koneksi".

Kenapa keduanya, bukan salah satu: yang pertama membetulkan kasus yang kita tahu; yang kedua
menjaga pesan apa pun di masa depan tidak ikut hilang lagi tanpa ada yang tahu.

### Yang TIDAK dibangun (sengaja)

- ❌ Memeriksa berkas saat halaman dibangun (jalan 2026-10-06 yang sudah terbukti gagal).
- ❌ Menghapus film dari katalog mitra — yang hilang berkasnya milik mitra, bukan kita, dan bisa
  diunggah ulang. Disembunyikan ≠ dihapus.
- ❌ Menyembunyikan yang statusnya "tidak tahu". Hanya `punyaFile === false` yang disembunyikan,
  mengikuti aturan yang sudah ada di `bolehTampilKePenonton`.

---

## 5. Penjaga yang diusulkan kalau Tahap B dikerjakan

| Penjaga | Yang dikunci |
|---|---|
| Tes `gabungVideoPlayly` dengan id mati di KEDUA sumber | id mati hilang dari daftar, dan sumber webhook tidak ikut lolos |
| Tes dokumen tak terbaca | daftar tetap utuh (gagal-terbuka), bukan kosong |
| Tes status gerbang pemutar | "berkas tidak ada" → 410 + pesan; Playly timeout → tetap 502 |
| Tes pemutar atas badan non-JSON | pesan yang tergambar BUKAN "cek koneksi" |
