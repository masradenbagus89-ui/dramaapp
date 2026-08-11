---
nama: cloudflare
deskripsi: Cloudflare Workers/Pages kelas industri — batas runtime edge, binding rahasia, KV/D1/R2, cache.
divisi: stack
pemicu: [cloudflare, wrangler, cloudflare-workers, durable-object]
rawan_keamanan: false
menggantikan: []
---

# Skill: Cloudflare — Workers / Pages / Edge kelas industri

> **Kapan skill ini aktif:** **utama = deteksi config** — project punya `wrangler.toml` / `wrangler.jsonc`, atau `@cloudflare/*` di dependensi (§4.14 auto-detect). Teks "cloudflare/wrangler/cloudflare-workers/durable-object" jadi pemicu sekunder. Skill ini paket-stack: tarik pas-ukuran saat menggarap kode Cloudflare, DI ATAS standar inti (§5/§8).
>
> 🙂 **Analogi:** Cloudflare Workers/Pages itu kayak buka **ratusan konter kecil di banyak kota sekaligus** ("edge" = pinggir jaringan) — cepat karena dekat pelanggan, tapi tiap konter **pelupa** (tak ada gudang pribadi yang awet) dan harus nitip barang ke gudang resmi bersama (KV/D1/R2/Durable Objects).

Skill ini **advisory** (§4.17): otak native yang memutuskan adopsi/adaptasi/abaikan tiap 📐/💡. Butir **🔒 HASIL** = hasil keamanan/keandalan yang tak boleh gagal apa pun caranya. Nama perintah, nama field env, dan angka batas (waktu CPU, ukuran paket) **berubah antar-versi Wrangler** — cek dokumentasi versi terpasang (§8.2 A3), jangan hafalkan atau salin contoh mentah.

---

## 1. Kontrak (yang HARUS benar — 3 hal yang bocor/rusaknya SENYAP di edge)

- 🔒 **HASIL — Rahasia tidak pernah ada di kode/config yang ter-commit.** Kunci API, token, string koneksi DB **TIDAK PERNAH** ada di kode worker, di `wrangler.toml`/`wrangler.jsonc` yang ter-commit, atau di variabel yang terbaca publik. Bocornya senyap — worker tetap jalan normal sementara kuncinya sudah tersebar. → cara pasang: §2 butir 2.
- 🔒 **HASIL — Angka yang menyangkut uang/barang tak boleh bertumpu pada KV.** Saldo, stok, kuota, nomor urut **TIDAK BOLEH** bertumpu pada KV — KV cuma "konsisten pada akhirnya" (= sesudah menulis, sebagian lokasi masih membaca nilai LAMA beberapa saat). Dua permintaan bersamaan bisa membaca angka lama lalu sama-sama menulis (stok minus/saldo dobel) tanpa satu error pun muncul. → cara aman: §2 butir 4, contoh: §3.
- 🔒 **HASIL — Respons ber-data-pribadi/bergantung identitas tak pernah masuk cache bersama.** Dashboard, keranjang, profil, apa pun di balik login **TIDAK PERNAH** masuk cache bersama. Kebocorannya senyap total: korban tak tahu datanya terlihat orang lain dan log-mu tampak normal. → cara pasang: §2 butir 6, contoh: §3.

---

## 2. Cara rakit (prinsip — 📐 CARA BAKU, boleh diganti cara lain yang capai HASIL sama)

1. 🗃️ **LATAR — kenapa edge beda:** "edge" (= pinggir jaringan) = kodemu jalan di banyak lokasi dekat pemakai, bukan di satu server. Akibatnya bukan cuma "lebih cepat": tak ada disk lokal yang awet, tak ada memori yang bisa dipercaya antar-permintaan, dan satu kesalahan cache tersebar ke banyak kota sekaligus. Hampir semua jebakan di bawah lahir dari sana.
2. 📐 **Rahasia lewat mekanisme bawaan platform, bukan berkas ter-commit.** Pakai mekanisme rahasia bawaan platform (lewat CLI Wrangler atau panel dasbor), bukan berkas yang ikut ter-commit. Saat berjalan, andalkan objek lingkungan yang diserahkan platform ke fungsi penerima permintaanmu (*handler*); jalur `process.env` gaya Node hanya hidup dalam kondisi kompatibilitas tertentu — jangan diasumsikan ada. Nilai non-rahasia (nama lingkungan, URL publik) boleh ditaruh sebagai variabel biasa di berkas konfigurasi. Nama perintah, nama field, dan cara aksesnya WAJIB dicek ke dokumentasi Wrangler versi terpasang (§8.2 A3) — bagian ini berubah cukup sering.
3. 📐 **Pages vs Workers — pilih dari bentuk produknya, bukan selera.** **Pages** = situs/frontend (Next.js, Astro, SPA, statis) + fungsi pendamping — kalau yang dikirim ke pemakai adalah HALAMAN. **Workers** = layanan/API/penerus permintaan (*proxy*)/penerima panggilan balik dari layanan lain (*webhook*)/tugas terjadwal (*cron*) — kalau yang dikirim adalah RESPONS DATA. Jangan pecah satu domain kerja ke dua tempat cuma karena "sekalian". Detail deploy berubah cepat → baca dokumentasi resmi.
4. 📐 **Memilih penyimpanan — ini keputusan arsitektur, bukan selera:**
   - **KV** = kunci→nilai, baca sangat cepat, **konsisten pada akhirnya** (= sesudah menulis, sebagian lokasi masih membaca nilai LAMA beberapa saat). Cocok: saklar fitur (*feature flag* = penyala/pemadam fitur tanpa deploy ulang), konfigurasi, hasil yang boleh basi sebentar.
   - **D1** = database SQL (berbasis SQLite). Cocok: data saling berkait yang butuh pencarian, penggabungan antar-tabel (*join*), dan aturan `UNIQUE`/`FK` yang ditegakkan DB sendiri.
   - **R2** = berkas besar (gambar, video, unggahan, arsip). Jangan taruh berkas besar di KV/D1.
   - **Durable Objects** = satu objek dengan satu titik koordinasi; untuk keadaan bersama (*state* = data yang hidup antar-permintaan) yang butuh URUT/TERKUNCI: ruang chat, penghitung, antrean, kunci sewa (*lock* = giliran eksklusif, yang lain menunggu), sesi permainan.
   - 🔒 **HASIL** (rincian butir §1): nilai yang salah-hitungnya merugikan uang/barang TIDAK BOLEH bertumpu pada KV.
   - 📐 **CARA BAKU:** taruh angka semacam itu di D1 (aturan `UNIQUE`/`CHECK` di level DB + transaksi, dan kurangi stok lewat satu perintah bersyarat seperti `UPDATE ... WHERE sisa > 0` — bukan baca-dulu-lalu-tulis), atau jadikan satu Durable Object sebagai wasit tunggal yang melayani permintaan itu berurutan. Contoh nyata → §3.
5. 📐 **Batas mesin penjalan (*runtime*) di edge — cek SEBELUM memilih pustaka:**
   - Tak ada API Node penuh: akses berkas (`fs`), proses anak (`child_process`), soket mentah, modul asli (native/binary) umumnya tak tersedia. Sebagian modul Node bisa dinyalakan lewat setelan kompatibilitas — periksa ke dokumentasi versi terpasang, jangan asumsikan.
   - Ada batas waktu kerja prosesor per permintaan (waktu "berpikir", terpisah dari waktu menunggu jaringan) dan batas ukuran paket kode yang dikirim. Angka pastinya beda-beda per paket langganan dan bisa berubah — **jangan hafalkan, baca di dokumentasi/dasbor akun ini**. Akibatnya pustaka berat (olah gambar, PDF, kripto besar, penerjemah database gemuk, pustaka serba-guna) sering gagal — kadang saat proses build, kadang baru saat produksi ramai.
   - 💡 **SARAN:** sebelum menambah dependensi, cek apakah ia menyatakan dukungan Workers/edge. Kerja berat yang tak muat → pindahkan ke layanan lain (server biasa, antrean, tugas terjadwal); worker cukup jadi lapisan tipis di depannya.
   - 🗃️ **LATAR:** mode gagalnya menipu — di laptop dengan Node lengkap semua jalan, yang patah cuma di edge. "Jalan di dev" bukan bukti apa pun di sini.
6. 📐 **Cache di pinggir jaringan — rancang kunci + cara membersihkan SEBELUM tayang.**
   - Tentukan **kunci cache**: apa yang membedakan dua respons — URL saja, atau URL + bahasa + peran pemakai + parameter query? Salah kunci = pemakai A melihat halaman pemakai B.
   - Tentukan **cara purge** (= membuang isi cache yang sudah usang) sebelum rilis. Tiga pendekatan umum: per-URL, per-penanda/tag, atau "tak usah dibuang" karena nama berkasnya ikut berganti tiap isi berganti. ⚠️ Ketersediaan tiap cara **terikat paket langganan dan produk yang dipakai** — pastikan cara pilihanmu benar-benar tersedia di akun ini, jangan mengandalkan bahwa semuanya ada. Kalau jawabannya "nanti dipikir", konten salah akan menempel di banyak lokasi dan kamu tak punya sapu.
   - 🔒 **HASIL** (rincian butir §1): respons ber-data-pribadi/bergantung identitas TIDAK PERNAH masuk cache bersama.
   - 📐 **CARA BAKU:** tandai respons semacam itu sebagai tak-boleh-disimpan lewat header cache yang sesuai, dan pastikan lapisan cache-mu memang menghormatinya (uji sekali dengan dua akun berbeda). Jangan andalkan alasan "kan URL-nya beda" — pembeda yang tak masuk kunci cache tidak dianggap ada.
   - 💡 **SARAN:** aset statis pakai nama ber-sidik-isi (nama berkas ikut berubah tiap isinya berubah) + umur cache panjang; HTML dinamis umur pendek — memindahkan masalah dari "harus dibersihkan" ke "kedaluwarsa sendiri". Contoh nyata → §3.
7. 📐 **Pisahkan lingkungan dev / staging / produksi, termasuk rahasianya.**
   - Tiap lingkungan punya blok konfigurasi sendiri di berkas konfigurasi Wrangler dan **set rahasia sendiri** — jangan satu kunci dipakai bersama. *Binding* (= sambungan bernama dari worker ke satu sumber daya, mis. nama `DB` menunjuk database tertentu) juga harus terpisah: KV/D1/R2 staging BUKAN yang produksi. Cek sebelum kirim ke server live: worker ini menunjuk database yang mana? Salah sambungan = skrip uji menghapus data asli, dan itu tak bisa dibatalkan.
   - 💡 **SARAN:** bedakan nama sumber daya secara mencolok (`app-db-prod` vs `app-db-staging`) supaya salah pilih terlihat mata, bukan cuma terbaca mesin.
8. 📐 **Pengamatan (observability) di edge beda dari server biasa.**
   - Satu permintaan menyentuh SATU lokasi; tak ada berkas log yang memuat semuanya. Alat "intip log langsung" bawaan platform hanya menampilkan yang lewat SAAT kamu menonton — itu cuplikan, bukan riwayat yang bisa ditelusuri mundur. Jangan bergantung `console.log` untuk diagnosa produksi.
   - Sertakan pengenal permintaan (request-id/trace-id = satu kode acak per permintaan yang dibawa ke mana-mana) di tiap log dan teruskan ke layanan hilir supaya satu perjalanan bisa dirangkai kembali. Kirim log/error ke tujuan yang MENYIMPAN (pelacak error atau endpoint log terpusat), sesuai mekanisme yang tersedia di platform versi terpasang.
   - 💡 **SARAN:** pantau tingkat kesalahan dan waktu CPU per rute, bukan cuma "situs hidup" — gejala khas edge = normal saat sepi, mentok saat ramai di satu wilayah saja. Aturan umum log terstruktur + larangan mencatat rahasia dan data pribadi (PII) ada di §5 dan §8 (CLAUDE.md inti).
9. 📐 **Query D1 selalu berparameter + dibatasi ukurannya.** Query D1 selalu pakai parameter terikat (`?` + nilai), tak pernah sambung-string SQL; batasi ukuran hasil (`LIMIT` + paginasi) — worker punya batas memori dan waktu, satu query "ambil semua" bisa menjatuhkan rute itu. Prinsip DB umum di §9 (CLAUDE.md inti); sisi serangan input/otorisasi → `skills/owasp/SKILL.md`.
10. 💡 **SARAN — rem laju khas edge:** kewajiban pembatas laju (*rate limit* = batas berapa kali satu pemanggil boleh menembak per satuan waktu) + batas ukuran kiriman sudah ada di §8 (CLAUDE.md inti); yang khas edge = **skalanya**. Worker menyerap lonjakan tanpa "servernya penuh" lebih dulu, jadi tak ada rem alami — rute mahal (login, unggah, pencarian, apa pun yang memanggil API berbayar) bisa dipanggil ribuan kali per detik sampai tagihan yang jadi alarm pertama. Pasang rem sejak awal, bukan setelah tagihan naik.

---

## 3. Powerful — 2 pola siap-adaptasi

🧪 **CONTOH KASUS — voucher "sisa 1" (ambil polanya, jangan salin mentah):** 200 klik hampir bersamaan dari banyak lokasi edge. Sisa-kuota di KV → semua membaca `1`, semua menulis `0`, 200 voucher terpakai. Dengan wasit tunggal (Durable Object) atau pengurangan bersyarat di DB (`UPDATE ... WHERE sisa > 0`), hanya satu yang menang.

🧪 **CONTOH KASUS — `/akun` di-cache tanpa cookie sesi masuk kunci:** respons pemakai pertama disajikan ulang ke semua pengunjung berikutnya di lokasi edge yang sama, karena kunci cache-nya cuma URL — cookie sesi tak ikut membedakan. Pelajaran: pembeda yang tak masuk kunci cache dianggap tidak ada (§2 butir 6).

---

## 4. Self-verify (sangkal diri sendiri SEBELUM bilang "selesai" — §8.2 Aturan 3)

- [ ] Tak ada rahasia (kunci API/token/string koneksi) di kode worker atau di `wrangler.toml`/`wrangler.jsonc` yang ter-commit? Semua lewat mekanisme rahasia bawaan platform?
- [ ] Pilihan Pages vs Workers cocok bentuk produk (halaman vs respons data), bukan dicampur "sekalian"?
- [ ] Angka yang menyangkut uang/stok/kuota **tidak** bertumpu di KV — pakai D1 (transaksi + `UPDATE ... WHERE`) atau Durable Object sebagai wasit tunggal?
- [ ] Dependensi baru sudah dicek dukungan Workers/edge-nya SEBELUM dipasang (bukan ketahuan gagal pas produksi ramai)?
- [ ] Kunci cache mencakup SEMUA pembeda respons (bahasa/peran/parameter), dan cara purge sudah ditentukan sebelum rilis?
- [ ] Respons ber-data-pribadi/bergantung identitas ditandai tak-boleh-disimpan di header cache, dan sudah diuji dengan dua akun berbeda?
- [ ] Tiap lingkungan (dev/staging/produksi) punya blok config + rahasia + binding KV/D1/R2 SENDIRI (tak ada yang ketuker)?
- [ ] Log produksi punya request-id/trace-id dan dikirim ke tujuan yang menyimpan (bukan cuma `console.log`)?
- [ ] Query D1 berparameter (bukan sambung-string) + dibatasi `LIMIT`/paginasi?
- [ ] Rute mahal (login/unggah/pencarian/panggil API berbayar) punya rate limit sejak awal?

> **Verifikasi WAJIB cuma-baca** (§8.2 Aturan 3): membuktikan = baca kode/config + cek dokumentasi Wrangler versi terpasang + menalar. **Jangan** jalankan `wrangler deploy`/migrasi D1 destruktif sebagai bagian verifikasi.

---

## 5. Definition-of-Done (kapan skill Cloudflare dianggap benar-selesai)

- [ ] **Kontrak (§1) terpenuhi:** rahasia tak ter-commit + angka uang/stok tak di KV + cache tak bocor data pribadi.
- [ ] **Edge case** ditangani: dua permintaan bersamaan menulis angka yang sama (race), dependensi berat gagal di edge padahal jalan di dev, cache tersaji ke pemakai yang salah, lingkungan staging kepencet nunjuk resource produksi.
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris` / config yang dibaca.
- [ ] Nama perintah/field/angka-batas yang dipakai sudah dicek ke dokumentasi Wrangler **versi terpasang** (§8.2 A3), bukan hafalan.
- [ ] **Gerbang Pra-Rilis §4.6 LULUS** — "selesai" = terbukti (config benar, dites dua akun/dua lingkungan), bukan "sudah kutulis".

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 **Sisi serangan input/otorisasi pada query D1** (SQL injection, IDOR) → `skills/owasp/SKILL.md`.
- 📐 **Kalau yang dibangun API** (kode status, amplop respons, versi endpoint) di dalam worker → `skills/backend/SKILL.md`.
- 📐 **Prinsip DB umum** (constraint, migrasi aman, index) untuk D1 → `skills/database/SKILL.md`.
- 🗃️ **LATAR — rak asal skill ini:** `skills/cloudflare/SKILL.md` (bagian §4.14 Paket Stack, deteksi `wrangler.toml`/`wrangler.jsonc`/`@cloudflare/*`).

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** kerahasiaan secret/token, integritas angka uang/stok, privasi data pemakai per-sesi, ketersediaan saat lonjakan trafik. **Mode-gagal khas** (kode "benar" tapi tetap bocor/rugi): rahasia ter-commit di `wrangler.toml`, dua permintaan balapan menulis KV yang sama, cache tak memasukkan cookie sesi ke kunci, dependensi berat lolos di dev tapi gagal di edge, binding staging tak sengaja menunjuk resource produksi, rute mahal dipanggil ribuan kali/detik tanpa rem. **Mitigasi:** rahasia lewat mekanisme platform + angka uang di D1/Durable Object + kunci cache lengkap & header tak-disimpan diuji dua akun + cek dukungan Workers sebelum pasang pustaka + config & binding terpisah per lingkungan + rate limit rute mahal.
- 🗃️ **LATAR — Batas jujur:** skill ini menaikkan **lantai** keandalan/keamanan Cloudflare Workers/Pages; **tidak menggantikan** load-testing untuk skala tinggi, dan **tidak menggantikan** dokumentasi resmi Wrangler yang berubah cepat (nama field, angka batas waktu/paket, cara purge cache — semua **terikat versi & paket langganan akun**, cek dokumentasi/dasbor versi terpasang, §8.2 A3). Alat "intip log langsung" bawaan platform cuma cuplikan saat kamu menonton, bukan riwayat yang bisa dicari mundur.

🙂 **Non-Programmer:** bayangkan bukan satu kantor pusat, tapi ratusan konter kecil di banyak kota. Cepat karena dekat pelanggan, tapi tiap konter pelupa dan tak bawa semua alat — barang dititip di gudang resmi (KV untuk catatan ringan, D1 untuk buku besar, R2 untuk peti besar, Durable Objects untuk hal yang harus antre satu-satu seperti stok terakhir). Fotokopi jawaban (cache) bikin ngebut, tapi kalau yang difotokopi berisi data pribadi seseorang, salinannya tersebar ke ratusan konter tanpa ada yang sadar — makanya cara menariknya kembali disiapkan sebelum buka, bukan sesudah ribut.
