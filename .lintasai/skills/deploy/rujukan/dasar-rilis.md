# Rujukan deploy — dasar rilis + anti Denial-of-Wallet & subdomain takeover (§2 butir 1-6)
> Bagian dari `skills/deploy` — dibuka on-demand dari SKILL.md inti; membaca berkas ini TERCATAT tanda-terima Palang Rak (path skills/**.md).
Isi penuh `skills/deploy/SKILL.md` §2 butir 1-6 — dasar env/build/rollback/strategi rilis + mitigasi serangan biaya & subdomain terlantar.

1. 📐 **Env per-environment, bukan di repo.** Env var diatur terpisah untuk prod/preview/dev di dashboard platform; jangan pernah commit `.env` (🔒 SKILL.md §1).
2. 📐 **Build reproducible.** Lockfile + versi runtime dikunci & ikut di-commit (🔒 SKILL.md §1).
3. 📐 **Healthcheck + rollback + preview deploy.** Pasang healthcheck; tulis rencana rollback 1-baris; pakai preview deploy untuk tiap PR sebelum kode tayang ke prod.
4. 📐 **Strategi rilis tanpa putus.** Default *rolling* (ganti instance bertahap, tanpa jeda layanan); pakai *blue-green* atau *canary* untuk perubahan yang berisiko tinggi.
   - 🙂 Non-Programmer: rahasia disimpan aman di platform (bukan di kode); tiap kirim ke server bisa di-rollback ke versi sebelumnya; dan diuji dulu lewat preview sebelum tayang ke publik.
5. 📐 **Mitigasi Denial-of-Wallet (serangan biaya, khas serverless) — 5 langkah.** 🚨 Beda dari serangan biasa yang bikin situs TUMBANG, ini bikin **TAGIHAN MELEDAK**: serverless (Vercel/Railway) auto-scale mengikuti lalu lintas → penyerang membanjiri permintaan / memanggil fungsi mahal (LLM, ekspor, gambar) → biaya membengkak walau situs "baik-baik saja". Mitigasi:
   1. **batas anggaran + alert biaya** di platform (mis. Vercel Spend Management / batas usage Railway — cek fitur versi terpasang);
   2. **rate-limit per-user + cap concurrency** (batas jumlah proses bersamaan);
   3. **cache/CDN** untuk permintaan yang berulang;
   4. **WAF/bot-filter + `robots`/challenge** untuk endpoint mahal;
   5. **batas ukuran & durasi fungsi.**

   Fitur LLM → batas token/biaya per-permintaan + kuota harian + timeout (cegah Denial-of-Wallet = tagihan meledak karena penyalahgunaan).
   - 🙂 biaya LLM jalan tiap kali dipakai — pasang batas harian + alarm biar tak dipakai tanpa henti oleh orang iseng.
6. 📐 **Mitigasi subdomain takeover (pengambilalihan sub-domain terlantar).** Sub-domain (mis. `promo.domainmu.com`) yang lewat DNS masih menunjuk (`CNAME`) ke layanan PaaS yang **sudah kamu hapus** (Vercel/Netlify/S3) bisa **diklaim penyerang** → ia pasang situs phishing ATAS NAMA domainmu. Mitigasi: **hapus DNS record saat mematikan layanan**; audit berkala **CNAME "dangling"** (menunjuk ke tujuan kosong); jangan tinggalkan subdomain preview lama menunjuk layanan mati.
   - 🙂 jangan biarkan alamat subdomain lama tetap menunjuk ke layanan yang sudah kamu tinggalkan — orang lain bisa mengklaimnya dan memakainya untuk situs palsu atas nama domainmu.
