---
nama: devops
deskripsi: Rilis & operasi produksi kelas industri — commit jelas, semver benar, smoke test + rollback tiap deploy, observability (error-tracking/log/healthcheck) sebelum online, secret hanya di env.
divisi: devops
pemicu: [deploy, rilis, release, produksi, production, mau-online, taruh-online, onlinekan, naikkan-ke-server, hosting, go-live, docker, dockerfile, pipeline, rollback, observability, monitoring, server-baru, pindah-server, diakses-orang]
rawan_keamanan: false
menggantikan: [rilis/produksi]
---

# Skill: DevOps — rilis & operasi produksi (kelas industri)

> **Inti:** Deploy (mengirim versi baru ke server produksi = tempat aplikasi diakses pengguna asli) baru aman kalau sudah punya observability (kemampuan memantau kondisi sistem dari luar, supaya masalah terdeteksi sebelum pengguna melapor) dan rollback (kemampuan membalikkan ke versi sebelumnya) yang siap dipakai sebelum dibuka ke publik.

---

## 1. Kontrak (yang HARUS benar — sebelum bilang "siap online")

- 🔒 **HASIL:**
  - **Secret hanya di env / secret manager** — TAK PERNAH di repo, log, atau `console.log`. Bocor di Dockerfile/CI/berkas config = kebocoran kredensial yang **senyap** (baru ketahuan saat disalahgunakan). Cek nama kunci: AI bandingkan `.env.example` vs `.env.local` (**NAMA kunci saja** — nilai/isinya JANGAN dibaca apalagi ditampilkan).
  - **Bisa mundur (rollback) sebelum maju (deploy).** Tiap perubahan destruktif/deploy prod WAJIB punya **rencana rollback 1-baris**. Tak ada jalan mundur = jangan online.
  - **"Online" = terpantau.** Error-tracking + log terstruktur + healthcheck aktif SEBELUM buka ke publik — bukan sesudah insiden.
  - **Izin rilis bukan milik AI.** Aksi deploy dan `git push` ke branch produksi (biasanya `main`) = **TOMBOL RILIS**, bukan sekadar sinkronisasi kode. Aturan izinnya ditulis SEKALI di `skills/deploy/SKILL.md` §1 butir terakhir (default preview · production hanya atas izin eksplisit owner di sesi itu) — **buka rak itu SEBELUM aksi deploy apa pun**, jangan disalin ke sini (satu sumber kebenaran, cegah dua versi yang melenceng).

---

## 2. Cara rakit (prinsip — 📐 CARA BAKU, boleh diganti cara lain yang capai HASIL sama)

1. 📐 **Observability WAJIB sebelum online** (3 lapis): **error-tracking** (mis. Sentry — tangkap error yang lolos ke user) + **log terstruktur** (`trace-id` per permintaan, **tanpa** secret/PII = data pribadi yang bisa mengidentifikasi orang: email/no.HP/KTP) + **healthcheck/uptime** (endpoint yang bilang "aku sehat" + pemantau luar). Langkah lengkap → `templates/PRODUCTION_OBSERVABILITY.md`. Staff bilang "mau online"/"deploy produksi" → AI ingatkan + bandingkan nama kunci `.env.example` vs `.env.local` (kunci yang kurang = crash saat online).
2. 📐 **Smoke test 3-5 alur kritikal tiap deploy** (login · transaksi utama · halaman publik) — uji cepat "yang penting masih jalan?" sesudah rilis, bukan cuma "build hijau".
3. 🔒 **HASIL — Rollback plan 1-baris** wajib tiap perubahan destruktif/deploy prod (runbook detail ditulis di folder milik project sendiri, mis. `docs/runbooks/` — kit tak menyediakannya). Breaking change (kontrak API/skema DB/format data/auth) **diumumkan dulu** + punya rencana mundur.
4. 📐 **Lockfile + versi runtime dikunci & di-commit** tiap install/upgrade (klien & server jalan di versi yang sama = akhiri "di komputerku jalan, di server tidak"). CI (robot pemeriksa: build+lint+test) hijau = syarat, bukan jaminan (lihat butir 2).
5. 📐 **Semver `BESAR.MENENGAH.KECIL`:** KECIL = perbaikan (1.7.5→1.7.6) · MENENGAH = fitur backward-compatible (1.7.x→1.8.0) · BESAR = HANYA saat breaking. `[BREAKING]` WAJIB naikkan BESAR — jangan sembunyikan di angka kecil. Label **`[SECURITY]`** = urgensi (bisa nempel di tingkat mana pun) → tool update peringatkan "pasang SEGERA".
6. 📐 **Pesan commit = Conventional Commits + jelas untuk non-programmer.** Subjek `type(scope): ringkasan` (`feat|fix|refactor|docs|chore|test|perf|build|ci`, <72 char, Bahasa Indonesia HASIL) · body 1-5 baris KENAPA+DAMPAK · footer `Co-Authored-By:` kalau AI + `BREAKING CHANGE:` untuk perubahan yang memutus klien (trailer yang dibaca robot untuk auto-naik versi BESAR). ✅ `fix: installer tidak macet saat dijalankan otomatis (v1.26.1)` · ❌ `update`, `wip`. **1 commit/PR = 1 tujuan.**
7. 📐 **Kerja bareng (>1 orang di 1 repo):** tiap task = branch sendiri → PR; JANGAN kerja langsung di `main`. **Self-review PR** (baca diff + jalankan lokal + tulis ringkasan/risiko/cara-verifikasi di deskripsi PR). Kebijakan proteksi `main` (wajib review dll) = urusan setelan repo client sendiri — kit tidak mengaturnya. **DILARANG skip git hook** (`--no-verify`) / bypass signing — hook merah = perbaiki KODENYA, jangan lewati.
8. 📐 **Config produksi (Dockerfile/CI/nginx/systemd/vercel):** secret dari env (butir §1), healthcheck endpoint, batasi permukaan (port/izin seperlunya, default-deny). Aksi merusak infra (hapus resource, force-push, reset) tetap **konfirmasi verbatim**.

🙂 **Non-Programmer:** "build hijau" (robot bilang kode lolos) **bukan** berarti "aman dibuka ke publik". Tiga hal yang sering terlupa dan baru terasa saat sudah ramai: tidak ada error-tracking jadi masalah tak terdeteksi, tidak ada rencana rollback untuk membalikkan ke versi sebelumnya, dan kunci rahasia (password DB dll) tak sengaja ikut ter-commit. Skill ini memasang ketiganya sebelum rilis dibuka ke publik.

---

## 3. Powerful — urutan aman "mau online"

📐 CARA BAKU: rilis pertama ke produksi, urutannya menutup lubang satu per satu:

```
1. env-keys      -> pastikan nama kunci .env lengkap + TAK ada secret ke-commit  (AI banding .env.example vs .env.local)
2. observability -> pasang error-tracking + log trace-id + healthcheck            (PRODUCTION_OBSERVABILITY.md)
3. rollback      -> tulis rencana mundur 1-baris + runbook                  (buat sendiri, mis. docs/runbooks/)
4. deploy        -> rilis ke platform (lockfile + versi runtime dikunci)
5. smoke test    -> uji 3-5 alur kritikal LANGSUNG sesudah deploy (login/transaksi/halaman publik)
6. pantau        -> lihat error-tracking & healthcheck beberapa saat sebelum menyatakan "beres"
```

- 🔒 HASIL: langkah 1-3 = **prasyarat**, bukan "nanti saja setelah online". Deploy tanpa rollback/observability berarti tak ada cara aman untuk pulih kalau terjadi masalah.
- 📐 CARA BAKU: platform-spesifik (Vercel/Railway/Render/Cloudflare/VPS/GitHub Actions) → resep di `skills/deploy/SKILL.md` + paket stack terkait. Ambil pas-ukuran sesuai stack terdeteksi. **WAJIB (naik dari 💡 SARAN, 2026-08-09):** sebelum menjalankan aksi deploy apa pun, buka `skills/deploy/rujukan/pra-cek-deploy.md` — di situ ada pra-cek CUMA-BACA + matriks keputusan, termasuk daftar perintah yang TERLIHAT seperti "cek" tapi berefek-samping (`vercel link --yes` menautkan diam-diam · `vercel` polos = langsung deploy).

---


### 🧪 Pasangan ❌ SALAH → ✅ BENAR — rahasia di dalam image (butir 🔒 §1 pertama)

🙂 Non-Programmer: setiap perintah di Dockerfile menjadi satu lapisan yang ikut tersimpan permanen. Menghapus rahasianya di baris berikutnya TIDAK menghapusnya dari lapisan sebelumnya — siapa pun yang punya image itu bisa membacanya.

❌ SALAH — kunci ikut terpanggang ke lapisan image; `docker history` menampilkannya:
```dockerfile
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
RUN echo "$DATABASE_URL" > /app/.env && npm run build
```

✅ BENAR — rahasia hanya ada saat build (tak jadi lapisan) atau saat runtime dari platform:
```dockerfile
# syntax=docker/dockerfile:1.7
RUN --mount=type=secret,id=dburl \
    DATABASE_URL="$(cat /run/secrets/dburl)" npm run build
# saat runtime: env var diberikan platform (dashboard), BUKAN di-bake ke image
```

> Kalau rahasia terlanjur masuk image yang sudah didorong: **rotasi kuncinya**, jangan cuma hapus barisnya — lapisannya sudah tersebar. Prosedurnya di `templates/SECURITY_INCIDENT_PLAYBOOK.md`.

---

## 4. Self-verify (sangkal diri sendiri SEBELUM bilang "siap rilis")

- [ ] **Tak ada secret** di repo/log/Dockerfile/CI (uji: banding nama kunci `.env.example` vs `.env.local` + grep pola kunci)?
- [ ] **Rollback 1-baris** tertulis + teruji cara membalikkannya?
- [ ] **Observability** (error-tracking + log terstruktur tanpa PII + healthcheck) aktif SEBELUM online?
- [ ] **Smoke test** alur kritikal dijalankan sesudah deploy (bukan cuma build hijau)?
- [ ] **Lockfile + versi runtime** dikunci & di-commit?
- [ ] Versi dinaikkan **benar** (breaking → BESAR; keamanan → label `[SECURITY]`)?
- [ ] Deploy dijalankan **manusia** untuk aksi berisiko + aksi merusak infra dikonfirmasi verbatim?

> **Verifikasi WAJIB cuma-baca** saat mengaudit: baca config + `Grep` + menalar. **DILARANG** klaim "sudah ter-deploy / aman" untuk sesuatu yang belum benar-benar dijalankan + dilihat keluarannya — efek di server/platform = lingkungan yang AI tak bisa amati langsung; tandai ⏳ + sebut langkah uji.

---

## 5. Definition-of-Done (kapan skill devops dianggap benar-selesai)

- [ ] **Kontrak (§1)** terpenuhi: secret aman + rollback ada + terpantau.
- [ ] Observability + smoke test + rollback + lockfile terpasang; versi & label semver benar.
- [ ] **Edge case** dipikirkan: deploy gagal separuh, rollback perlu dijalankan, secret tak sengaja ter-commit, versi runtime beda dev vs prod.
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris`.
- [ ] "Mau online" → `templates/PRODUCTION_OBSERVABILITY.md` dibuka + nama kunci `.env.example` vs `.env.local` dibanding.
- [ ] **Gerbang Pra-Rilis LULUS** — "siap rilis" = terbukti (smoke test lulus + terpantau), bukan "build hijau saja".

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 **Deploy platform-spesifik** (Vercel/Railway/Render/Cloudflare/VPS/GitHub Actions) → `skills/deploy/SKILL.md` + paket stack terkait. **WAJIB dibuka sebelum aksi deploy** — di sanalah aturan izin rilis (§1 butir terakhir) + pra-cek cuma-baca (`skills/deploy/rujukan/pra-cek-deploy.md`) tinggal.
- 📐 **Langkah observability produksi** (Sentry, log terstruktur, healthcheck) → `templates/PRODUCTION_OBSERVABILITY.md`.
- 📐 **Error build/run yang menghalangi rilis** → `skills/perbaiki-error/SKILL.md`. **Panggilan layanan luar tahan-gagal** → `skills/tahan-gagal/SKILL.md`.
- 🗃️ **LATAR:** Respons insiden kebocoran → `templates/SECURITY_INCIDENT_PLAYBOOK.md` (jangan rotate/force-push sendiri). Rak asal skill ini hanya di riwayat git (ADR-027).

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** ketersediaan layanan + kredensial produksi + kemampuan pulih. **Mode-gagal:** secret ter-commit (kredensial bocor), deploy rusak tanpa rollback (downtime lama), online tanpa observability (buta terhadap insiden), versi salah-naik (klien lama pecah diam-diam). **Mitigasi:** secret di env + rollback wajib + observability sebelum online + smoke test + lockfile + semver benar + branch/PR + aksi merusak dikonfirmasi.
- 🗃️ **LATAR — Batas jujur:** skill menaikkan **lantai** disiplin rilis; **tidak menggantikan** SRE/infra engineer untuk skala besar (auto-scaling, blue-green/canary matang, chaos testing). Aksi rilis berisiko = **manusia yang jalankan**. Cek dokumentasi platform **versi terpasang**.
