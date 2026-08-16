# Cara rakit OWASP — detail mekanisme (pola bahaya · token · upload aman · auth kuat)

> Bagian dari `skills/owasp` — dibuka on-demand dari SKILL.md inti; membaca berkas ini TERCATAT tanda-terima Palang Rak (path skills/**.md).
> Isi detail §2 SKILL.md (📐 CARA BAKU, boleh diganti cara lain yang capai HASIL sama) — butir lengkap + resep per-framework.

1. 📐 **Pola bahaya yang langsung di-flag** (kalau ketemu pola ini di kode, tandai sebagai risiko tinggi): `innerHTML = userInput`, `fetch(userProvidedUrl)`, SQL string-concat, cek-saldo tanpa lock (`FOR UPDATE`), password plaintext, route tanpa cek auth.
2. 📐 **Token = scoped (izin terbatas), bukan "login → boleh semua"; pisahkan 401 vs 403.** Terbitkan token dengan daftar kemampuan (abilities/scopes = daftar izin, mis. `['posts:read']`) lalu PAKSA cek per-route (route tulis menolak token yang cuma boleh baca). Bedakan: **401 Unauthorized** = belum login / token tak sah / kadaluarsa; **403 Forbidden** = sudah login TAPI tak berhak (jangan ditukar — salah kode bikin klien "login ulang" padahal masalahnya izin). Token WAJIB punya masa-berlaku (expiry) eksplisit. Pisahkan cek "siapa kamu" (auth → 401) dari "boleh tidak" (otorisasi → 403).
3. 📐 **File upload aman (5 pagar inti + 4 lanjutan):** upload = titik risiko tinggi. Ini rumah kanonis "upload aman" — rak `unggah-berkas` mengarah ke sini.
   1. **Periksa ISI file (magic bytes), bukan MIME/nama dari browser** — cross-check ekstensi vs isi (Python `python-magic`, atau paket `filetype` pure-Python kalau container tanpa `libmagic`; Laravel rule `mimes:`/`extensions:`).
   2. **Batas ukuran** wajib (anti habis-memori / OOM).
   3. **JANGAN simpan/serve dari folder `public`** (path traversal + eksekusi skrip jahat).
   4. Simpan **private/S3**, akses lewat **signed URL berjangka** (mis. 15 menit) untuk PUT (unggah) & GET (baca).
   5. **Cek OTORISASI dulu** (pemilik berkas), baru terbitkan URL — saat unggah maupun baca (anti-IDOR).
   6. **Nama/key berkas dibuat SERVER, acak** (mis. `uuid` + ekstensi tervalidasi), BUKAN nama dari user — cegah path-traversal (`../`) dan tebak-key; simpan nama asli sebagai metadata terpisah.
   7. **SVG = vektor XSS:** SVG bisa memuat `<script>` → blok tipe SVG, atau sanitasi + serve `Content-Disposition: attachment` + CSP ketat (jangan render inline sebagai HTML).
   8. **Kredensial storage** (kunci S3/R2 / Supabase `service_role`) **server-only** — tak pernah dikirim ke browser.
   9. **Anti-abuse:** rate-limit + kuota ukuran/jumlah per-user (cegah penyalahgunaan habiskan penyimpanan/biaya).
4. 📐 **Auth kuat: cek-password-bocor + regenerasi sesi + blokir email sekali-pakai.**
   1. **Tolak password yang sudah bocor** — cek ke database kebocoran pakai *k-anonymity* (kirim hanya 5 huruf awal hash SHA-1 ke HaveIBeenPwned; password utuh TAK dikirim).
   2. 🚨 **Regenerasi ID sesi saat login** + hapus/regenerasi token saat logout — cegah *session fixation* (peretas menanam ID sesi sebelum korban login lalu ikut masuk).
   3. **Blokir domain email sekali-pakai** (mailinator dll) via daftar dari env.
   4. Rate-limit login **per-akun DAN per-IP → 429 + `Retry-After`** — IP saja rapuh (satu kantor berbagi IP; penyerang gampang ganti IP), jadi dua-duanya. Angkanya disetel dari trafik nyata, **jangan tempel angka mati**. Jangan percaya `X-Forwarded-For` buta. Kebijakan lengkap (token-bucket atomik, fail-open/closed) → `skills/rate-limiting/SKILL.md`.

   Sumber Laravel — netralkan ke stack terpasang (helper regenerasi sesi beda tiap framework).

🙂 **Non-Programmer (dari sumber asli):** skill ini menjaga produk dari serangan peretas dari luar — **pelengkap** mekanisme anti-AI-nakal lintasAI yang menjaga dari kesalahan AI sendiri. Project profesional [expert] butuh KEDUANYA.
