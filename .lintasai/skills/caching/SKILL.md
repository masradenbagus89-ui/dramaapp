---
nama: caching
deskripsi: Simpan-sementara (cache) kelas-industri — cepatkan baca yang mahal TANPA menyajikan data basi/bocor; TTL + invalidasi + anti cache-stampede + key per-identitas (jangan bocor antar-user).
divisi: backend
pemicu: [cache, caching, cached, cache-aside, stale-while-revalidate, cache-invalidation, invalidasi-cache, thundering-herd, cache-stampede, memcached, simpan-sementara, banyak-yang-buka, ribu-orang, buka-bareng]
rawan_keamanan: false
menggantikan: []
---

# Skill: Caching (simpan-sementara) — kelas industri

> **Inti:** cache menyimpan sementara hasil baca yang mahal (mis. query database) supaya permintaan berikutnya dijawab cepat tanpa mengulang perhitungan. Risikonya: kalau data sumber berubah tapi cache tak diperbarui, yang tersaji jadi **basi**. Maka cache wajib punya **masa berlaku** (TTL) + **dicabut saat data sumber berubah** (invalidasi).

Butir **🔒 HASIL** = jaminan yang tak boleh gagal: cache TAK BOLEH membocorkan data antar-user & TAK BOLEH jadi penyimpan utama/otoritas data.

---

## 1. Kontrak (yang HARUS benar — tulis DULU)

- 🔒 **HASIL:**
  - **Input:** kunci cache (menyertakan SEMUA yang mempengaruhi hasil: id sumber + user/tenant/locale/parameter) + sumber-kebenaran (DB/API) + TTL.
  - **Output — hit:** nilai cache dikembalikan cepat; **isinya identik** dengan yang akan dihitung dari sumber (dalam toleransi basi yang disepakati).
  - **Output — miss/expired:** hitung dari sumber → simpan → kembalikan. Sistem **tetap benar walau cache kosong** (cache = optimasi, BUKAN storage/otoritas data).
  - **Keamanan:** data privat **tak pernah** tersaji ke user lain (kunci per-identitas; §2 poin 5).
  - **Error (cache mati):** **fail-open** — lewati cache, baca langsung sumber (jangan jatuhkan fitur hanya karena cache tumbang). Beda dari rate-limiting (yang fail-policy-nya tergantung sensitivitas).

---

## 2. Cara rakit (prinsip — 📐 CARA BAKU, boleh diganti cara lain yang capai HASIL sama)

1. 📐 **Pola baku = cache-aside (lazy):** cek cache → *miss* → baca sumber → **isi cache** → kembalikan. Sederhana & tahan (cache mati = tinggal miss, bukan crash). Alternatif (write-through/write-behind) hanya bila butuh konsistensi tulis khusus — jangan pasang sebelum perlu (YAGNI).
2. 🔒 **HASIL — WAJIB ada TTL (masa berlaku). Jangan cache selamanya.** TTL = kontrak "seberapa basi boleh ditoleransi". Data jarang berubah (config, katalog) → TTL panjang; data sering berubah → TTL pendek atau jangan di-cache. **Data yang harus akurat-seketika (saldo, stok, harga bayar) → JANGAN di-cache** tanpa invalidasi ketat — saldo basi di produk fintech/judi = user bingung / sengketa (rujuk `skills/pembayaran/SKILL.md`).
3. 🔒 **HASIL — Invalidasi saat sumber berubah** (masalah tersulit di caching). Tiga cara (boleh gabung): **TTL** (kedaluwarsa otomatis — paling sederhana, terima basi ≤ TTL) · **event-based** (hapus/replace kunci saat data ditulis — paling segar, tapi harus ingat SEMUA kunci turunan) · **versioned key** (ubah versi di kunci `v2:...` → cache lama otomatis "tak terpakai"). Pilih sesuai toleransi-basi; **tulis di kontrak** kunci mana di-invalidasi oleh operasi tulis mana.
4. 🔒 **HASIL — Anti cache-stampede (thundering herd).** Saat kunci panas kedaluwarsa, banyak permintaan *miss* serempak → menghantam sumber bersamaan (bisa menjatuhkan DB). Mitigasi: **single-flight/lock** (hanya 1 yang menghitung ulang, sisanya menunggu hasilnya) · **stale-while-revalidate** (sajikan nilai basi sesaat sambil refresh di latar) · **jitter TTL** (acak sedikit supaya tak semua expire bersamaan) · early-recompute probabilistik.
5. 🔒 **HASIL — Kunci per-identitas untuk data privat (cegah kebocoran otorisasi).** Data milik user/tenant tertentu **WAJIB** memasukkan id-nya ke kunci (`user:42:dashboard`), dan **jangan** simpan respons privat di cache BERSAMA (CDN/HTTP publik) tanpa `Vary`/`Cache-Control: private`. Salah key = user A melihat data user B — kebocoran senyap (user tak sadar). Data privat di HTTP → `Cache-Control: private, no-store` untuk yang sensitif; publik → `public, s-maxage=...`. Terkait `skills/auth/SKILL.md` · `skills/owasp/SKILL.md`.
6. 📐 **Cache berlapis, makin dekat user makin murah:** browser (`Cache-Control`/`ETag`) → CDN/edge (`s-maxage`, SWR) → aplikasi (Redis/memori) → query DB. Halaman publik statis → CDN + ISR/revalidate (Next.js) → `skills/next-core/SKILL.md`. Data lintas-instance → **Redis/memcached** (memori-proses tak terbagi antar-server, hit-rate anjlok di multi-instance). 📐 **Sinyal project INI:** di Vercel/serverless (banyak instance hidup-mati) → cache di memori proses TIDAK terbagi antar-instance + hilang tiap deploy → pakai store terbagi (Redis/Upstash).
7. 📐 **Negative caching berhati-hati:** hasil "tidak ada" (404) boleh di-cache TTL PENDEK (cegah hammering pencarian yang selalu miss), tapi jangan lama (data bisa muncul).
8. 📐 **Ukur, jangan tebak:** pantau **hit-rate**. Hit-rate rendah = cache tak berguna (buang memori + risiko basi tanpa manfaat). Set kebijakan **eviction** (LRU/LFU) saat memori penuh; sadari **cold start** (cache kosong pasca-deploy → gelombang miss, warm-up bila perlu).

---

## 3. Powerful — pola siap-adaptasi

🧪 **CONTOH KASUS (ambil polanya, jangan salin mentah):** cache-aside + stale-while-revalidate + single-flight — sajikan cepat, segarkan di latar, hanya 1 yang recompute:

```txt
get(key):
  entry = cache.get(key)
  if entry and not entry.expired:            -> kembalikan entry.value            // hit segar
  if entry and entry.stale and not expired_hard:
        refreshInBackground(key)             -> kembalikan entry.value (basi)      // SWR: cepat + refresh
  else:                                                                            // miss / kadaluwarsa keras
        if acquireLock(key):  value = source(); cache.set(key, value, ttl+jitter); releaseLock()
        else:                 tunggu-singkat lalu baca cache (hindari stampede)
```
- 📐 CARA BAKU: kunci = `<domain>:<versi>:<id>[:<user/locale/param>]` — semua variabel yang mempengaruhi hasil MASUK kunci (kalau tidak → cache bocor/salah).
- 💡 SARAN: pakai pustaka/fitur teruji ketimbang menulis sendiri — Next.js `revalidate`/`unstable_cache`, `@upstash/redis`, HTTP `Cache-Control: stale-while-revalidate`. Cek API **versi terpasang**.

---

## 4. Self-verify (sangkal diri sebelum "selesai")

- [ ] Tiap kunci punya **TTL** (tak ada cache abadi)? Data akurat-seketika (saldo/stok) **tak** di-cache tanpa invalidasi ketat?
- [ ] **Invalidasi tertulis**: operasi tulis X menghapus/replace kunci Y (uji: ubah data → cache ikut segar dalam batas yang dijanjikan)?
- [ ] Data privat pakai **kunci per-identitas** + tak masuk cache bersama/publik (uji: user A tak pernah dapat data user B)?
- [ ] **Anti-stampede** ada (lock/SWR/jitter) untuk kunci panas (uji: expire → tak semua request hantam DB)?
- [ ] **Cache mati → sistem tetap benar** (fail-open ke sumber), bukan error/blank?
- [ ] Penyimpanan **terbagi** (Redis) bila multi-instance — bukan memori proses yang bikin hit-rate anjlok?
- [ ] **Hit-rate dipantau**; eviction (LRU) di-set; cache bukan penyimpan utama?

---

## 5. Definition-of-Done

- [ ] **Kontrak (§1) ditulis** (kunci/TTL/hit/miss/keamanan/error).
- [ ] TTL + strategi invalidasi + anti-stampede + key per-identitas + fail-open terpasang; data akurat-seketika dikecualikan.
- [ ] **Edge case** diuji: cache mati, kunci panas expire serempak, data berubah (invalidasi), user berbeda (isolasi), cold start pasca-deploy.
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris`.
- [ ] Observability: **hit-rate + umur data tersaji** dipantau; alert saat hit-rate anjlok / cache node mati.
- [ ] build + lint + test lulus; min 1 test happy-path (hit) + 1 test invalidasi (data berubah → cache segar) + 1 test isolasi antar-user.

---

## 6. Handoff / rujuk-silang (reuse-first — jangan salin)

- 📐 Cache HTTP/ISR/revalidate + performa render → `skills/next-core/SKILL.md`. Cache edge/CDN: ikuti dokumentasi penyedia yang dipakai project ini (cek `package.json`/config — jangan karang nama setelan).
- 📐 Jangan cache saldo/harga bayar tanpa invalidasi ketat → `skills/pembayaran/SKILL.md`; anti-bocor kolom/data privat → `skills/supabase-prisma/SKILL.md`.
- 🔒 Kebocoran cache antar-user = isu otorisasi/keamanan → `skills/auth/SKILL.md` · `skills/owasp/SKILL.md`.
- 📐 **Sumber data sedang MATI → sajikan nilai cache terakhir + tandai kesegarannya, jangan hapus cache-nya** (`stale-if-error`; beda dari `stale-while-revalidate` yang mengobati cache-stampede saat sumbernya SEHAT) → `skills/tahan-gagal/SKILL.md` §2 lapis-2.
- 🗃️ LATAR — refresh cache di latar / warm-up → `skills/background-job/SKILL.md`. Penghitung rate-limit yang juga pakai Redis → `skills/rate-limiting/SKILL.md` (beda tujuan: itu membatasi laju, ini menyimpan hasil). Metrik hit-rate → `templates/PRODUCTION_OBSERVABILITY.md`.

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** kebenaran data + isolasi antar-user + kapasitas sumber (DB). **Mode-gagal:** data basi disajikan sebagai terkini (invalidasi lupa), **kebocoran data privat antar-user** (key tanpa identitas / cache publik untuk data privat), cache-stampede menjatuhkan DB, cache jadi sumber-kebenaran lalu hilang, cache poisoning (input tak-tepercaya masuk kunci/isi). **Mitigasi:** TTL + invalidasi tertulis + key per-identitas + `Cache-Control` tepat + anti-stampede + fail-open + validasi input yang masuk kunci.
- 🗃️ **LATAR — Batas jujur:** caching **menukar kesegaran demi kecepatan** — selalu ada jendela basi (sekecil apa pun). Untuk data yang WAJIB akurat-seketika (saldo, kuota, stok terbatas), caching agresif = sumber bug/sengketa; pilih no-cache atau invalidasi event-based ketat. "Cache invalidation" memang salah satu masalah tersulit — mulai dari TTL sederhana, naikkan kecanggihan hanya saat terbukti perlu.
