---
nama: background-job
deskripsi: Pekerjaan latar & antrean kelas-industri — tahan-restart, idempoten, gagalnya tercatat (bukan hilang diam-diam).
divisi: backend
pemicu: [antrean, antrian, queue, cron, terjadwal, schedule, background, job, worker, batch]
rawan_keamanan: false
menggantikan: [latar/antrean]
---

# Skill: Background Job & Antrean (proses di latar/jadwal) — kelas industri

> **Kapan skill ini aktif:** prompt menyentuh "proses di latar / antrean / jadwal berkala / cron / kirim nanti / tugas berat / worker / retry". Dispatcher `rak-pemicu` menyalakannya otomatis.
>
> 🙂 **Analogi:** background job = **kotak tugas pegawai belakang**. Pelanggan (request user) tak menunggu lama — tugas berat (kirim email, buat PDF, resize foto) dimasukkan ke kotak, dikerjakan di belakang. **DLQ** (Dead-Letter Queue = kotak gagal-permanen) = tugas yang gagal terus ditinjau manusia, bukan dibuang diam-diam.

Skill ini **advisory** (§4.17): otak native memutuskan adopsi/adaptasi/abaikan tiap 📐/💡. Butir **🔒 HASIL** = jaminan keandalan yang tak boleh gagal. Cek dokumentasi broker **versi terpasang** sebelum menulis kode (§8.2 A3) — semantik retry/visibility-timeout/DLQ beda antar-sistem.

---

## 1. Kontrak (yang HARUS benar — tulis DULU)

- 🔒 **HASIL:**
  - **Input:** tugas (jenis + data/payload).
  - **Output:** tugas **selesai**, ATAU **gagal-yang-tercatat** (bukan hilang).
  - **Error:** gagal transient (gagal sementara — jaringan putus sesaat / provider sibuk) → coba-ulang berbatas → DLQ.
  - **Idempoten:** satu tugas dijalankan 2× (retry/duplikat) hasilnya **sama**, efek samping **tak dobel**.

---

## 2. Cara rakit (prinsip — 📐 CARA BAKU, boleh diganti cara lain yang capai HASIL sama)

1. 🔒 **HASIL — Antrean TAHAN-RESTART (persisten), BUKAN di memori proses.** Array `jobs` di dalam aplikasi **hilang tiap deploy** dan **tak terbagi** antar-replica (tiap instance punya kotak sendiri) — fatal di serverless/multi-instance. Pilih:
   - 📐 CARA BAKU: **Tabel DB Postgres + `FOR UPDATE SKIP LOCKED`** (paling sederhana, tanpa infra baru) → pola lengkap `skills/supabase-prisma/SKILL.md`.
   - 📐 CARA BAKU: **Broker khusus** (Redis/BullMQ, Amazon SQS, RabbitMQ) untuk volume besar.
2. 🔒 **HASIL — Idempoten (tugas bisa jalan >1×).** Retry & duplikat itu normal. Sebelum efek samping (kirim email, tagih, kirim webhook), cek **kunci idempoten** ("sudah dikerjakan?") → rujuk `skills/pembayaran/SKILL.md`. Tanpa ini, retry = email/tagihan **dobel**.
3. 📐 **Retry + backoff (jeda makin lama):** gagal transient → coba lagi jeda menaik (1 mnt → 5 mnt → 30 mnt) + sedikit acak (jitter, cegah semua retry serempak). **Batas percobaan** (mis. 5×), jangan retry selamanya.
4. 📐 **DLQ:** percobaan habis → pindahkan ke DLQ + **beri alert**, jangan retry tanpa henti (buang sumber daya), jangan hilang diam-diam. DLQ ditinjau manusia → perbaiki → jalankan ulang.
5. 📐 **Lease / visibility-timeout (anti tugas-hilang saat worker crash):** worker "menyewa" tugas selama X menit (status `processing` + waktu). Worker mati sebelum selesai → sewa kedaluwarsa → tugas **kembali tersedia** (bukan hilang, bukan macet selamanya).
6. 📐 **Cron yang tak dobel:** penjadwal andal (cron platform hosting, `pg_cron`, GitHub Actions schedule) + **kunci** agar tak jalan bersamaan di banyak instance (advisory lock / baris "sudah jalan jam ini?").
7. 📐 **Jangan tahan koneksi/transaksi DB selama panggilan eksternal lama** (kirim email/HTTP di dalam `$transaction` = timeout). Ambil tugas → lepas transaksi → kerjakan → tandai selesai.
8. 📐 **Observability:** catat tiap tugas (id/jenis/status/percobaan) + metrik antrean (panjang & umur tugas tertua) → deteksi antrean macet sebelum jadi insiden (`templates/PRODUCTION_OBSERVABILITY.md`).

---

## 3. Powerful — pola siap-adaptasi

🧪 **CONTOH KASUS (ambil polanya, jangan salin mentah):** antrean DB-backed minimal tanpa infra baru — `FOR UPDATE SKIP LOCKED` mengambil 1 tugas + mengunci barisnya supaya worker lain melewatinya:

```sql
-- Ambil 1 tugas siap-jalan, kunci untuk worker ini saja (SKIP LOCKED = worker lain lewati).
UPDATE jobs SET status='processing', leased_until = now() + interval '5 min'
WHERE id = (
  SELECT id FROM jobs
  WHERE status='queued' AND run_after <= now()
  ORDER BY run_after
  FOR UPDATE SKIP LOCKED
  LIMIT 1
) RETURNING *;
```
- 📐 CARA BAKU: worker crash → `leased_until` lewat → tugas kembali `queued` (job pemulih: `UPDATE ... SET status='queued' WHERE status='processing' AND leased_until < now()`).
- 💡 SARAN: volume besar / butuh prioritas & delayed jobs matang → naik ke broker khusus (BullMQ/SQS). Jangan pasang broker berat sebelum butuh (YAGNI).

---

## 4. Self-verify (sangkal diri sebelum "selesai" — §8.2 Aturan 3)

- [ ] Antrean **persisten** (tahan deploy + terbagi antar-replica), bukan array in-memory?
- [ ] Efek samping **idempoten** (uji: jalankan tugas yang sama 2× → efek tetap 1×)?
- [ ] Retry **berbatas** + backoff + jitter; habis percobaan → **DLQ + alert** (bukan retry selamanya / hilang)?
- [ ] Ada **lease/visibility-timeout** (worker crash → tugas kembali, tak nyangkut `processing`)?
- [ ] Cron **ber-kunci** (tak jalan dobel di banyak instance)?
- [ ] Tak ada panggilan eksternal lama **di dalam transaksi DB**?

---

## 5. Definition-of-Done

- [ ] **Kontrak (§1) ditulis** (input/output/error/idempoten).
- [ ] Antrean persisten + idempoten + retry-backoff-berbatas + DLQ + lease + kunci-cron terpasang.
- [ ] **Edge case** diuji: worker crash di tengah, tugas duplikat, gagal transient berulang, cron dobel.
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris`.
- [ ] Observability (log per-tugas + metrik antrean) aktif sebelum "online".
- [ ] build + lint + test lulus; min 1 test happy-path + 1 alur "gagal-lalu-pulih (retry→DLQ)".

---

## 6. Handoff / rujuk-silang (reuse-first — jangan salin)

- 📐 Antrean DB `FOR UPDATE SKIP LOCKED` + gotcha transaksi Prisma → `skills/supabase-prisma/SKILL.md`.
- 📐 Idempotency-key (anti proses-dobel) → `skills/pembayaran/SKILL.md`.
- 🗃️ LATAR — konsumen: kirim email di latar → `skills/email-notifikasi/SKILL.md`; proses turunan upload → `skills/upload-storage/SKILL.md`. Metrik/log → `templates/PRODUCTION_OBSERVABILITY.md`.

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** tugas & efek sampingnya (uang, email, data) + sumber daya server. **Mode-gagal:** efek dobel (tak idempoten), tugas hilang (crash tanpa lease), badai-retry, kerja dobel antar-worker, cron ganda, payload jahat. **Mitigasi:** antrean persisten + idempoten + retry-backoff-berbatas + DLQ + lease + kunci cron + validasi payload di boundary (§5).
- 🗃️ **LATAR — Batas jujur:** "tepat-sekali" (exactly-once) murni sulit; yang realistis = "minimal-sekali + idempoten". Pack ini menaikkan lantai keandalan, bukan menggantikan desain sistem terdistribusi. Cek dokumentasi broker/penjadwal **versi terpasang**.
