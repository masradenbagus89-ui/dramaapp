---
nama: background-job
deskripsi: Pekerjaan latar & antrean kelas-industri — tahan-restart, idempoten, gagalnya tercatat (bukan hilang diam-diam).
divisi: backend
pemicu: [antrean, antrian, queue, cron, terjadwal, schedule, background, job, worker, batch, celery]
rawan_keamanan: false
menggantikan: [latar/antrean]
---

# Skill: Background Job & Antrean (proses di latar/jadwal) — kelas industri

> **Inti:** background job = tugas berat (kirim email, buat PDF, resize foto) dikerjakan di latar, di luar alur request user, supaya request tak menunggu lama. **DLQ** (Dead-Letter Queue) = tempat tugas yang gagal terus-menerus ditampung untuk ditinjau manusia, bukan dibuang diam-diam.

Cek dokumentasi broker **versi terpasang** sebelum menulis kode — semantik retry/visibility-timeout/DLQ beda antar-sistem.

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
   - 🔒 **Sinyal project INI:** Vercel/Netlify (deploy default client) **TAK punya worker jangka-panjang** → `setInterval`/antrean-di-proses HILANG tiap deploy & tugas gagal **SENYAP** (tak ada error). Pakai queue eksternal (Upstash/QStash) atau cron platform — jangan andalkan proses hidup terus.
2. 🔒 **HASIL — Idempoten (tugas bisa jalan >1×).** Retry & duplikat itu normal. Sebelum efek samping (kirim email, tagih, kirim webhook), cek **kunci idempoten** ("sudah dikerjakan?") → rujuk `skills/pembayaran/SKILL.md`. Tanpa ini, retry = email/tagihan **dobel**.
2b. 🔒 **HASIL — yang MASUK antrean = KUNCI (id), bukan salinan data; dan dikirim SESUDAH transaksi commit.** Dua kesalahan kembar yang sama-sama gagal **acak** (lolos di dev yang sepi, muncul di produksi):
   - 📐 Kirim `id`/`pk` saja, lalu **muat ulang** datanya di dalam tugas. Mengirim objek utuh = worker bekerja dengan salinan **basi** → menimpa perubahan yang lebih baru.
   - 🔒 Enqueue **setelah** transaksi selesai (Django: `transaction.on_commit(lambda: tugas.delay(obj.pk))`; Prisma/SQL: kirim sesudah `commit`, bukan di dalam blok transaksi). Kalau dikirim di dalam transaksi, worker bisa mengambilnya **sebelum** data tersimpan → tugas gagal "data tak ditemukan" tanpa pola yang jelas.
   - 🙂 Non-Programmer: titipkan **nomor** barangnya, jangan fotokopinya (fotokopi bisa kedaluwarsa), dan jangan titipkan sebelum barangnya benar-benar masuk gudang.
3. 📐 **Retry + backoff (jeda makin lama):** gagal transient → coba lagi jeda menaik (1 mnt → 5 mnt → 30 mnt) + sedikit acak (jitter, cegah semua retry serempak). **Batas percobaan** (mis. 5×), jangan retry selamanya. (Angka menit ini untuk job LATAR — user tak menunggu. Retry di dalam request user beda skala: detik, maks ~3, harus muat di batas waktu request → `skills/tahan-gagal/SKILL.md`.)
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


### 🧪 Pasangan ❌ SALAH → ✅ BENAR — idempotensi (butir 🔒 §1)

🙂 Non-Programmer: pekerjaan latar bisa dijalankan ULANG saat jaringan putus atau server di-restart. Kalau tak dijaga, pelanggan menerima email dua kali — atau lebih buruk, ditagih dua kali.

❌ SALAH — retry mengulang efek sampingnya; tak ada cara tahu tugas ini sudah pernah jalan:
```ts
export async function kirimStrukPesanan(pesananId: string) {
  const pesanan = await db.pesanan.findUnique({ where: { id: pesananId } })
  await mailer.send(pesanan.email, strukDari(pesanan)) // retry ke-2 = email dobel
}
```

✅ BENAR — kunci idempotensi disimpan ATOMIK; pengulangan berhenti di pintu:
```ts
export async function kirimStrukPesanan(pesananId: string) {
  const kunci = \`struk:\${pesananId}\`
  try {
    await db.jobDone.create({ data: { kunci } })   // UNIQUE(kunci) di level DB
  } catch (e) {
    if (isUniqueViolation(e)) return { status: 'sudah-pernah', kunci } // aman diulang
    throw e
  }
  const pesanan = await db.pesanan.findUnique({ where: { id: pesananId } })
  await mailer.send(pesanan.email, strukDari(pesanan))
}
```

> Kunci HARUS diturunkan dari identitas tugas (id pesanan), bukan dari waktu/acak — kalau tidak, tiap retry menghasilkan kunci baru dan penjaganya tak pernah menggigit. Constraint `UNIQUE` WAJIB ada di DATABASE, bukan cuma dicek di kode (dua worker bisa memeriksa bersamaan).

---

## 4. Self-verify (sangkal diri sebelum "selesai")

- [ ] Antrean **persisten** (tahan deploy + terbagi antar-replica), bukan array in-memory?
- [ ] Efek samping **idempoten** (uji: jalankan tugas yang sama 2× → efek tetap 1×)?
- [ ] Yang dikirim ke antrean = **id/kunci** (bukan objek data), dan enqueue-nya **sesudah** transaksi commit?
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
- 📐 **Panggilan layanan luar DI DALAM job** (retry berjeda + timeout per-percobaan + saklar-pemutus) → `skills/tahan-gagal/SKILL.md`. **Kontrak endpoint yang memicu job** (status code, amplop respons) → `skills/backend/SKILL.md`.
- 📐 **Celery/Django** (`transaction.on_commit`, `select_for_update` di dalam `atomic`, setelan tes `CELERY_TASK_ALWAYS_EAGER`) → `skills/python/SKILL.md`.
- 🗃️ LATAR — konsumen: kirim email/notifikasi di latar + proses turunan upload (thumbnail/transcode; sisi-aman upload → `skills/owasp/SKILL.md` §2 butir 3). Metrik/log → `templates/PRODUCTION_OBSERVABILITY.md`.

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** tugas & efek sampingnya (uang, email, data) + sumber daya server. **Mode-gagal:** efek dobel (tak idempoten), tugas hilang (crash tanpa lease), badai-retry, kerja dobel antar-worker, cron ganda, payload jahat. **Mitigasi:** antrean persisten + idempoten + retry-backoff-berbatas + DLQ + lease + kunci cron + validasi payload di boundary.
- 🗃️ **LATAR — Batas jujur:** "tepat-sekali" (exactly-once) murni sulit; yang realistis = "minimal-sekali + idempoten". Pack ini menaikkan lantai keandalan, bukan menggantikan desain sistem terdistribusi.
