<!-- LINTAS:SEKSI §push-notification -->

## §push-notification. Capability Pack — Push Notification (web & mobile) kelas-industri

> **Kapan dibaca:** "push notification / notifikasi HP / kirim notif walau app ditutup / Web Push / FCM / notifikasi browser / notifikasi mobile". Resep merakit notifikasi push yang **sampai ke device benar, tak spam, dan menghormati izin**. Baca induk `workflows/cap-packs.md`.

🙂 Analogi: push = **petugas yang mengetuk pintu HP-mu walau aplikasi sedang ditutup**. Berguna untuk hal penting, TAPI kalau mengetuk terlalu sering atau tanpa izin, orang akan mematikannya — atau menghapus aplikasimu.

### Kontrak (yang harus benar)
- **Input:** peristiwa yang layak diberitahu + target device yang **sudah memberi izin**. **Output:** notifikasi tiba di device benar via layanan push resmi. **Error:** token kedaluwarsa → bersihkan; izin ditolak → jangan paksa, sediakan kanal lain. **Rahasia:** kunci server (VAPID/FCM) & token device = rahasia; isi notifikasi jangan memuat data sangat sensitif (tampil di lockscreen tanpa buka HP).

### Langkah rakit (prinsip — cek dokumentasi layanan push versi terpasang §8.2)
1. **Minta izin di momen tepat, bukan saat halaman pertama dibuka.** Munculkan permintaan izin setelah user paham manfaatnya (usai aksi relevan), bukan langsung menyerbu — ditolak sekali = sistem sulit meminta lagi (kanal mati permanen). Beri penjelasan singkat sebelum prompt izin native browser/OS.
2. **Simpan langganan/token per-device + user** — satu user bisa banyak device (HP, laptop, tablet). Simpan daftarnya. Token **BUKAN identitas**: otorisasi tetap dari sesi server (jangan biarkan orang mendaftarkan diri ke notifikasi milik user lain).
3. **Kirim lewat layanan resmi, jangan bikin protokol sendiri:**
   - **Web (browser):** **Web Push** dengan kunci **VAPID** (menandai server pengirim sah), payload dienkripsi, dan butuh **service worker** (skrip latar browser) agar notifikasi muncul walau tab ditutup. ⚠️ **Catatan iOS:** di iPhone, Web Push hanya jalan bila situs dipasang sebagai aplikasi ke layar utama (**PWA**, iOS 16.4+); di tab Safari biasa notifikasi **tak pernah muncul** — jangkau pengguna iPhone-browser lewat fallback in-app/email (langkah 7).
   - **Mobile:** **FCM** (Firebase Cloud Messaging — Android/lintas platform) & **APNs** (Apple Push Notification service — iOS), atau layanan agregator (OneSignal, Expo, dll). Cek dok versi terpasang.
4. **Kirim di latar + idempoten + hormati backpressure** (rujuk `workflows/cap/background-job.md`). Blast ke banyak device = antre, jangan blok request user. Retry untuk gagal-sementara (transient — kegagalan sesaat yang hilang sendiri), tapi **jangan dobel-kirim** (idempoten per event+device). "Backpressure" = melambat saat penyedia membatasi laju, bukan membanjiri.
5. **Bersihkan token mati.** Layanan membalas "gone/unregistered" (mis. 404/410) → hapus langganan itu. Token basi menumpuk = boros biaya + merusak metrik.
6. **Isi + preferensi + berhenti:** judul singkat & actionable; **jangan taruh rahasia** (tampil di lockscreen). Wajib sediakan **kelola preferensi + berhenti** per kategori (etika + sering wajib hukum). Batasi frekuensi (anti-spam) + hormati jam tenang.
7. **Push = best-effort, bukan kanal terjamin.** Untuk hal kritis (OTP, alert keamanan) **jangan hanya andalkan push** — sediakan fallback email/in-app (rujuk `workflows/cap/email-notifikasi.md` untuk email/OTP, `workflows/cap/realtime.md` untuk notifikasi in-app saat app dibuka).

### Gotcha (sering salah)
- Minta izin saat load pertama → mayoritas menolak → kanal mati permanen.
- Anggap token permanen → banyak gagal-kirim; wajib bersihkan yang "gone".
- Taruh data sensitif di body → bocor di lockscreen orang lain.
- Spam / terlalu sering → user matikan notif atau uninstall.
- Andalkan push untuk OTP/alert keamanan → tak terjamin sampai.
- Lupa service worker untuk Web Push → notifikasi tak muncul saat tab tertutup.
- Kirim sinkron blast ribuan device → timeout + kena rate-limit penyedia.

### Rujuk-silang (reuse-first — jangan salin)
- Kirim latar / antre / retry / backoff → `workflows/cap/background-job.md`.
- Notifikasi in-app live (badge/toast saat app dibuka) → `workflows/cap/realtime.md`.
- Kanal email/OTP + anti-abuse + preferensi berhenti → `workflows/cap/email-notifikasi.md`.
- Kunci VAPID/FCM di env (rahasia, jangan di kode/log) → `workflows/stack/4.14-5-owasp.md` + §8.1.
- Ukur delivery/open-rate & event notifikasi (deteksi spam sebelum user matikan izin) → `workflows/cap/analytics.md`.

### Threat-model 3-baris
- **Aset:** perhatian & kepercayaan user, kunci push server, token device. **Penyerang:** pengirim notifikasi palsu (bila endpoint langganan tak diamankan), pembocor data via lockscreen, pelaku spam. **Mitigasi:** otorisasi server-side pemilik langganan + kunci di env + body tanpa rahasia + preferensi/berhenti + rate-limit frekuensi.

### Batas jujur
Push bersifat **best-effort**: OS/penyedia bisa menunda, menggabung, atau membuang notifikasi; user bisa mencabut izin kapan saja — jangan pakai untuk pengiriman yang wajib pasti sampai. **Khusus web di iOS:** notifikasi hanya jalan untuk situs yang dipasang sebagai aplikasi ke layar utama (PWA), **bukan** tab Safari biasa — jadi segmen iPhone-browser praktis tak tercakup Web Push (andalkan email/in-app untuk mereka). Aturan izin & privasi push berbeda per-platform (Apple/Google) dan wilayah — verifikasi kebijakan resminya. Cek dokumentasi Web Push/FCM/APNs **versi terpasang**.
