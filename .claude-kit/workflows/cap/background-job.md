<!-- LINTAS:SEKSI §background-job -->

## §background-job. Capability Pack — Background Job & Antrean (proses di latar/jadwal) kelas-industri

> **Kapan dibaca:** "proses di latar / antrean / jadwal berkala / cron / kirim nanti / tugas berat / worker / retry". Resep merakit pekerjaan latar yang **tak hilang saat restart, tak dobel, dan gagalnya tercatat**. Baca induk `workflows/cap-packs.md`.

🙂 Analogi: background job = **kotak tugas pegawai belakang**. Pelanggan (request user) tak menunggu lama — tugas berat (kirim email, buat PDF, resize foto) dimasukkan ke kotak, dikerjakan di belakang. **DLQ** = "kotak tugas gagal" yang ditinjau manusia, bukan dibuang diam-diam.

### Kontrak (yang harus benar)
- **Input:** tugas (jenis + data/payload). **Output:** tugas selesai, ATAU gagal-yang-tercatat (bukan hilang). **Error:** gagal transient (gagal sementara — jaringan putus sesaat / provider sibuk) → coba-ulang berbatas → DLQ. **Idempoten:** satu tugas dijalankan 2× (retry/duplikat) hasilnya **sama**, efek samping tak dobel.

### Langkah rakit (prinsip — cek dokumentasi broker versi terpasang §8.2)
1. **Antrean TAHAN-RESTART (persisten), BUKAN di memori proses.** Array `jobs` di dalam aplikasi **hilang tiap deploy** dan **tak terbagi** antar-replica (tiap instance punya kotak sendiri) — fatal di serverless/multi-instance. Pilih:
   - **Tabel DB Postgres + `FOR UPDATE SKIP LOCKED`** (paling sederhana, tanpa infra baru) — rujuk pola lengkap `workflows/stack/4.14-2-supabase-prisma.md`.
   - **Broker khusus** (Redis/BullMQ, Amazon SQS, RabbitMQ) untuk volume besar.
2. **Idempoten (WAJIB — tugas bisa jalan >1×):** retry & duplikat itu normal. Sebelum efek samping (kirim email, tagih, kirim webhook), cek **kunci idempoten** / "sudah dikerjakan?" (rujuk idempotency `cap/pembayaran.md`). Tanpa ini, retry = email/tagihan dobel.
3. **Retry + backoff (jeda makin lama):** gagal transient (jaringan, rate-limit provider = provider membatasi jumlah panggilan) → coba lagi dengan jeda menaik (mis. 1 mnt → 5 mnt → 30 mnt) + sedikit acak (jitter, cegah semua retry serempak). **Batas percobaan** (mis. 5×), jangan retry selamanya.
4. **DLQ (Dead-Letter Queue = kotak gagal-permanen):** setelah percobaan habis → pindahkan tugas ke DLQ + **beri alert**, jangan retry tanpa henti (buang sumber daya) dan jangan hilang diam-diam. DLQ ditinjau manusia → perbaiki → jalankan ulang.
5. **Lease / visibility-timeout (anti tugas-hilang saat worker crash):** worker "menyewa" tugas selama X menit (status `processing` + waktu). Kalau worker mati sebelum selesai, sewa kedaluwarsa → tugas **kembali tersedia** untuk worker lain (bukan hilang, bukan macet selamanya). `SKIP LOCKED` + kolom status + timestamp mendukung ini.
6. **Jadwal berkala (cron) yang tak dobel:** pakai penjadwal andal (cron platform hosting, `pg_cron`, GitHub Actions schedule) + **kunci** agar tak jalan bersamaan di banyak instance (mis. advisory lock / baris "sudah jalan jam ini?"). Jadwal di dalam satu proses app = hilang saat scale-to-zero.
7. **Jangan tahan koneksi/transaksi DB selama panggilan eksternal lama** (kirim email/HTTP di dalam `$transaction` = timeout — rujuk gotcha Prisma `workflows/stack/4.14-2-supabase-prisma.md`). Ambil tugas → lepas transaksi → kerjakan → tandai selesai.
8. **Observability:** catat tiap tugas (id, jenis, status, jumlah percobaan) + metrik antrean (panjang & umur tugas tertua) → deteksi antrean macet sebelum jadi insiden (rujuk `templates/OBSERVABILITY_PRODUKSI.md`).

### Gotcha (sering salah)
- **Antrean di memori** → semua tugas menunggu **lenyap saat deploy**; tak jalan di banyak replica. Pakai antrean persisten.
- **Tidak idempoten** → retry/duplikat = efek dobel (email 3×, saldo tertagih 2×).
- **Retry tak berbatas** → satu tugas rusak me-retry selamanya = badai + biaya. Batasi + DLQ.
- **Tanpa lease** → worker crash di tengah = tugas hilang atau nyangkut `processing` selamanya.
- **Cron di banyak instance tanpa kunci** → jalan dobel (laporan/tagihan ganda).
- **Panggilan lama di dalam transaksi DB** → "Transaction already closed" / koneksi habis.

### Rujuk-silang (reuse-first — jangan salin)
- Antrean DB `FOR UPDATE SKIP LOCKED` + gotcha transaksi Prisma → `workflows/stack/4.14-2-supabase-prisma.md`.
- Idempotency-key (anti proses-dobel) → `cap/pembayaran.md`.
- Konsumen: kirim email di latar → `cap/email-notifikasi.md`; proses turunan upload → `cap/upload-storage.md`.
- Metrik/log antrean → `templates/OBSERVABILITY_PRODUKSI.md`.

### Threat-model 3-baris
- **Aset:** tugas & efek sampingnya (uang, email, data) + sumber daya server. **Mode-gagal/penyerang:** efek dobel (tak idempoten), tugas hilang (crash tanpa lease), badai-retry, kerja dobel antar-worker, cron ganda, payload jahat dari sumber tak-tepercaya. **Mitigasi:** antrean persisten + idempoten + retry-backoff-berbatas + DLQ + lease + kunci cron + validasi payload di boundary (§5).

### Batas jujur
Pilihan broker & pola bergantung skala dan kebutuhan (urutan ketat? throughput tinggi? tepat-sekali?) — "tepat-sekali" (exactly-once) murni sulit; yang realistis = "minimal-sekali + idempoten". Pack ini menaikkan lantai keandalan, bukan menggantikan desain sistem terdistribusi. Cek dokumentasi resmi broker/penjadwal **versi terpasang** — semantik retry, visibility-timeout, dan DLQ berbeda antar-sistem.
