<!-- LINTAS:SEKSI §feature-flag -->

## §feature-flag. Capability Pack — Feature Flag (sakelar fitur / kill-switch / rollout bertahap) — pack TIPIS

> **Kapan dibaca:** "feature flag / sakelar fitur / kill switch / matikan fitur cepat / A/B test / rollout bertahap / nyalakan fitur ke sebagian user". Pack ini **tipis, sengaja** — inti mekaniknya sudah lengkap di `templates/feature-flags-advanced.md`; berkas ini = pintu-masuk + pagar keputusan, **menunjuk** ke sana, tidak menyalin. Baca induk `workflows/cap-packs.md`.

🙂 Analogi: feature flag = **sakelar lampu untuk fitur**. Kamu bisa menyalakan/mematikan fitur tanpa membongkar kabel (deploy ulang), atau menyalakan hanya di sebagian ruangan (sebagian user) dulu.

### Kontrak (yang harus benar)
- **Input:** nama flag + aturan (on/off, % user, target). **Output:** keputusan tampil/tidak yang **konsisten per user**. **Error:** flag tak dikenal/hilang → **default MATI** (fail-safe). **Rahasia:** flag server-only jangan bocor ke browser (prefix publik = terlihat semua orang di bundle).

### Langkah rakit (prinsip — detail penuh di `templates/feature-flags-advanced.md`)
1. **Jangan pasang feature flag terlalu dini.** Project early-stage (<50% jadi / belum ada user nyata) → cukup staging/preview per-PR; flag = kompleksitas yang **baru berbayar SETELAH** ada user & pain nyata (butuh kill-switch instan, A/B test, atau rollout bertahap). Tabel sinyal "kapan upgrade" ada di template.
2. **Default MATI (fail-safe).** Flag hilang/tak dikenal → perlakukan OFF, jangan ON — cegah fitur setengah-jadi bocor tak sengaja.
3. **Rollout bertahap = hash deterministik, bukan acak per-request.** Pakai hash stabil dari userId (mis. sha256), **jangan `Math.random()`** (user akan "kelap-kelip" tiap refresh). Contoh kode + alasan sha256 ada di template.
4. **Flag publik vs server-only.** Prefix publik (mis. `NEXT_PUBLIC_...`) ter-expose ke browser; fitur/rahasia bisnis → pakai flag **server-only** (dicek di Server Component/Action).
5. **Bersihkan flag mati (flag debt).** Flag yang sudah 100% stabil → hapus cabang kode lama + hapus env-nya. Tanpa ritual bersih-bersih, kode penuh `if (flag)` zombie. Ritual cleanup + jadwal di template.
6. **Uji dua sisi.** Tiap flag minimal 2 tes (kondisi ON & OFF) + kasus default-OFF. Contoh tes di template.

### Gotcha (sering salah)
- Flag **default ON** saat hilang → fitur bocor tak sengaja (harusnya fail-safe OFF).
- Rollout pakai `Math.random()` → user kelap-kelip tiap muat ulang.
- Flag menumpuk tak dibersihkan → **flag debt** (kode bercabang zombie, susah di-review).
- Kira flag = instan → env-var (mis. Vercel) butuh redeploy (~menit); butuh sub-detik → flag berbasis DB.
- Staff tanpa akses dashboard tak bisa toggle → flag = **operasi owner**, bukan aksi harian staff.

### Rujuk-silang (reuse-first — INTI ada di template)
- **Detail lengkap** (implementasi, konvensi penamaan, gradual rollout, cleanup ritual, testing, trade-off) → `templates/feature-flags-advanced.md`. Pack ini sengaja **tidak menyalinnya**.
- Rilis aman / rollback → §11 + Gerbang §4.6.
- A/B test + ukur konversi tiap varian → `workflows/cap/analytics.md`.
- Kalau flag memengaruhi pekerjaan latar/cron → `workflows/cap/background-job.md`.

### Threat-model 3-baris
- **Aset:** kontrol rilis fitur, rahasia bisnis (fitur belum diumumkan). **Penyerang:** pengintip flag publik (melihat fitur rahasia di bundle browser), penyalahguna fitur setengah-matang yang bocor. **Mitigasi:** default-MATI + flag rahasia server-only + cleanup rutin + rilis lewat Gerbang §4.6.

### Batas jujur
Pack ini pintu-masuk ringkas; keputusan & mekanik nyata ada di `templates/feature-flags-advanced.md` (contohnya berfokus Next.js/Vercel — sesuaikan bila stack lain). Feature flag **menambah** kompleksitas kode — pakai hanya saat ada pain nyata, jangan karena "best practice di tutorial". Cek dokumentasi penyedia flag/env **versi terpasang**.
