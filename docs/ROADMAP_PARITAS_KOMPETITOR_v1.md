# docs/ROADMAP_PARITAS_KOMPETITOR_v1.md - Roadmap Menyamai Melolo/Pine Drama
> Versi 1 · `2026-07-18` · Status: usulan, belum dieksekusi

## Latar belakang

Penilaian fitur dramaapp vs Melolo/Pine Drama (terlepas jumlah konten): pengalaman inti menonton sudah ~75% setara (feed vertikal swipe, auto-lanjut, kualitas multi-resolusi, subtitle multi-bahasa, ekonomi koin + check-in + rewarded ads). Gap penentu yang tersisa bukan jumlah video, melainkan:

1. **Infrastruktur video rapuh** — di-serve dari PC rumah via Cloudflare tunnel (single point of failure).
2. **Tidak installable** — web-only, tanpa PWA; kompetitor native di Play Store.
3. **Akun viewer bukan sesi server** — email di localStorage; koin/progress tidak sinkron antar-device (dan ada risiko IDOR, tercatat di audit).
4. **Pembayaran belum hidup** — webhook Midtrans masih balas 501.

Roadmap ini menutup 4 gap itu + 1 fase retensi. Prinsip: **bertahap, tiap fase bisa rilis sendiri, tanpa ubah arsitektur inti** (tetap Next.js + Supabase REST manual, tetap fallback JSON untuk dev).

---

## Fase 1 — Quick wins: PWA installable + Midtrans hidup (target 1–2 minggu)

Alasan duluan: usaha kecil, dampak langsung terasa (ikon di home screen + aliran uang nyata).

### 1A. PWA installable
- Tambah `app/manifest.ts` (name "DramaKu", `display: "standalone"`, `theme_color`, start_url `/beranda`) + ikon 192/512 di `public/` (maskable).
- Service worker minimal `public/sw.js`: cache halaman statis + poster; **JANGAN cache video/MP4** (kuota storage HP). Daftarkan via komponen client kecil yang dipasang di `app/layout.tsx`.
- Meta iOS (`apple-touch-icon`, `apple-mobile-web-app-capable`) di `app/layout.tsx`.
- **Verifikasi**: Lighthouse kategori PWA lolos; prompt "Add to Home Screen" muncul di Chrome Android; aplikasi terbuka standalone tanpa address bar.
- Usaha: ±2 hari. Biaya: Rp0.

### 1B. Aktifkan pembayaran Midtrans
Kode sudah siap (`lib/midtrans.ts`, `/api/coins/topup`, webhook terverifikasi sha512 + idempoten) — tinggal diaktifkan:
- Buat akun Midtrans, selesaikan aktivasi bisnis (butuh data usaha; untuk produksi).
- Isi sandbox keys di `.env.local`, tes alur top-up 4 paket end-to-end (webhook lokal via tunnel), lalu ganti production keys di env Vercel + daftarkan URL webhook produksi di dashboard Midtrans.
- Hapus cabang 501 di `app/api/coins/webhook/route.ts`; hapus/pertahankan `ENABLE_DEMO_TOPUP` hanya untuk dev (lihat `docs/payments.md`).
- Naikkan rate-limit endpoint koin (`lib/rate-limit.ts`) dan pantau log webhook 7 hari pertama.
- **Verifikasi**: transaksi sandbox sukses menambah saldo; transaksi nyata Rp5.000 pertama berhasil + idempoten (webhook diulang tidak double-credit).
- Usaha: ±3 hari (sebagian menunggu verifikasi Midtrans). Biaya: fee Midtrans per transaksi.

---

## Fase 2 — Migrasi video ke storage + CDN sungguhan (target 2–3 minggu)

Alasan: gap kualitas pengalaman terbesar. PC rumah mati / tunnel putus = seluruh aplikasi down.

### Keputusan teknis (rekomendasi)
- **Cloudflare R2 + CDN Cloudflare**: egress gratis (poin penting untuk video), free tier 10 GB, S3-compatible. Alternatif: BunnyCDN (murah, ~$1/TB). Hindari Supabase Storage untuk video (kuota kecil, egress mahal).
- **Tetap MP4 progressive dulu** (jangan HLS dulu — konten sudah ada dalam varian `<ep>.<res>.mp4` dan player sudah punya pemilih kualitas manual). HLS adaptif masuk Fase 4 kalau perlu.

### Langkah
1. Skrip migrasi (baru, `scripts/upload-videos-r2.mjs`): crawl library di PC backup → upload ke R2 dengan **nama objek identik** (`<drama>/<ep>.mp4`, `<ep>.<res>.mp4`, poster, subtitle `.vtt`). Jalan bertahap per drama, resume-able.
2. `lib/video.ts` sudah membangun URL dari `NEXT_PUBLIC_VIDEO_BASE_URL` — ganti env ke domain R2/CDN. Proxy subtitle `/api/subtitle` ikut menunjuk origin baru (cek allowlist host di route itu).
3. Masa transisi: env per-environment, tunnel PC tetap jadi fallback sampai 100% objek terupload + smoke-test.
4. Update panel admin: alur "Scan" (`/api/admin/scan`) tetap dipakai untuk metadata; upload video baru bisa langsung ke R2 (presigned URL) — fase ini cukup manual via skrip dulu, UI upload menyusul kalau perlu.
5. Pensiunkan tunnel setelah 2 minggu stabil; simpan `pc-backup-agent/` sebagai arsip.

- **Verifikasi**: semua episode playable dari domain CDN di HP 4G; waktu mulai putar < 2 detik; tunnel dimatikan 24 jam tanpa keluhan.
- Usaha: ±1 minggu + waktu upload (tergantung ukuran library & bandwidth rumah). Biaya: ~Rp0–50rb/bulan (R2 free tier kemungkinan cukup di awal).
- Risiko: proses upload awal lama (upload rumah lambat) — mitigasi: prioritas drama trending dulu.

---

## Fase 3 — Akun viewer sungguhan + sinkronisasi (target 3–4 minggu)

Alasan: fondasi retensi (progress & koin mengikuti user, bukan perangkat) + menutup risiko IDOR koin/unlock yang tercatat di audit. Ini fase paling besar — kerjakan terakhir agar tidak menghalangi quick wins.

### Desain (minimal-intrusif)
- **Pakai ulang mesin sesi yang sudah ada**: `lib/session.ts` (cookie HMAC httpOnly) kini khusus admin — generalisasi jadi sesi viewer. Tetap tanpa SDK Supabase.
- **Login**: email + kode OTP 6 digit (magic code) — sesuai filosofi "tanpa password". Kirim email via layanan SMTP gratis (Resend/Supabase Auth email). Google OAuth = opsional fase lanjut.
- **Migrasi data bertahap**: `wallets`/`unlocks` saat ini berkunci email — pertahankan email sebagai kunci; klaim otomatis saat login OTP pertama (saldo & unlock mengikuti email yang sama). Tambah kolom `user_id` nullable belakangan kalau perlu.
- **Guest tetap bisa nonton gratis** (by design tidak berubah); koin/unlock/check-in wajib login.

### Langkah
1. Endpoint `POST /api/auth/otp/request` + `POST /api/auth/otp/verify` (rate-limited!), terbitkan cookie sesi viewer. Middleware/helper `getViewer()` untuk semua route koin/unlock/ads-reward.
2. Tabel baru `watch_progress` (email/user, drama_id, episode, position_sec, updated_at; upsert). Migrasi SQL masuk `migrasi-*.sql` sesuai konvensi.
3. `lib/progress.ts` jadi dual-mode: guest → localStorage (seperti sekarang); login → POST progress berkala dari `FeedPlayer` (throttle ±10 detik) + GET untuk baris "Lanjut Nonton" (merge dengan localStorage).
4. Sinkronkan juga `lib/myList.ts` & `lib/myLikes.ts` (tabel baru `user_list`, `user_likes` atau KV di `app_data` — pilih yang paling sederhana).
5. Lengkapi halaman riwayat tontonan yang masih placeholder (`app/profile/page.tsx`).
6. Hardening menyusul: route koin/unlock menolak identitas dari body klien (wajib dari sesi) — menutup IDOR.

- **Verifikasi**: login di HP & laptop → saldo, unlock, dan "Lanjut Nonton" sama; logout → data lama tidak hilang; tes `tests/` hijau + tambah tes OTP & migrasi saldo.
- Usaha: ±2–3 minggu. Biaya: Rp0 (free tier email cukup).
- Risiko: user lama "kehilangan" saldo kalau email beda ketik — mitigasi: OTP memastikan kepemilikan email; sediakan kontak admin.

---

## Fase 4 — Retensi & pertumbuhan (lanjutan, opsional per prioritas)

Urutan dalam fase ini fleksibel; kerjakan satu-satu.

- **Web push notification** (memanfaat SW Fase 1): VAPID + tabel `push_subscriptions`; trigger: drama baru di kategori yang disukai, reminder check-in harian. Ini pengganti terdekat push native tanpa aplikasi native. (±1 minggu)
- **SEO per-drama**: metadata dinamis + OpenGraph di `app/drama/[id]/page.tsx`, `sitemap.ts`, `robots.ts` — konten teaser/episode gratis terindeks Google = kanal akuisisi gratis. (±3 hari)
- **Rekomendasi sederhana**: "Karena kamu menonton X" berbasis kategori + views (SQL biasa, tanpa ML). (±2 hari)
- **Misi/reward lebih kaya**: streak check-in, bonus nonton N episode — memakai tulang `lib/coins.ts` yang sudah ada. Catatan: model "tarik koin jadi saldo DANA/GoPay" ala Melolo/Pine butuh modal keluar rutin + pertimbangan regulasi — **keputusan bisnis, bukan teknis**; jangan dikerjakan tanpa keputusan owner.
- **HLS adaptif** (hanya jika data pemakaian menunjukkan buffering masih tinggi di Fase 2).
- **Aplikasi native**: tidak direkomendasikan sampai PWA terbukti punya retensi; biaya & beban maintenance tidak sepadan di skala sekarang.

---

## Ringkasan prioritas

| Fase | Apa | Usaha | Biaya/bulan | Dampak |
|------|-----|-------|-------------|--------|
| 1A | PWA installable | ±2 hari | Rp0 | Terasa seperti aplikasi |
| 1B | Midtrans hidup | ±3 hari | fee/transaksi | Pendapatan nyata |
| 2 | Video → R2/CDN | ±1 minggu | ~Rp0–50rb | Reliabilitas (gap terbesar) |
| 3 | Akun + sync | ±2–3 minggu | Rp0 | Retensi + keamanan |
| 4 | Notifikasi, SEO, rekomendasi | bertahap | Rp0 | Pertumbuhan |

**Definisi "setara" yang realistis**: setelah Fase 1–3 selesai, pengguna akhir tidak bisa membedakan dramaapp dari aplikasi komersial dalam pemakaian sehari-hari (install, nonton lancar, bayar, lanjutkan di device lain). Yang tetap beda hanya skala konten & anggaran konten — di luar scope roadmap ini.
