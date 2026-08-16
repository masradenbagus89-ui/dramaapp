---
nama: deploy
deskripsi: Deploy platform (Vercel/Railway/Render) kelas industri — env & rahasia, healthcheck, rollback, region & runtime cocok.
divisi: stack
pemicu: [push-ke-main, deploy-production, vercel, railway, fly-io, render.yaml, deploy-platform, pilih-hosting, hosting-mana, biaya-hosting, platform-hosting]
rawan_keamanan: false
menggantikan: []
---

# Skill: Deploy — platform (Vercel/Railway/Render) kelas industri

> 🙂 **Inti:** deploy yang sehat menyimpan rahasia (env var) di platform, bukan di kode; tiap rilis baru punya jalan rollback ke versi sebelumnya kalau cacat; dan kode diuji dulu lewat preview deploy sebelum tayang ke production.

---

## 1. Kontrak (yang HARUS benar)

- 🔒 **HASIL — Rahasia & setelan per-environment tak pernah di repo.** *Environment variable* (env var = setelan rahasia dari luar kode: alamat DB, kunci) disimpan di dashboard platform per-environment (prod/preview/dev) — **jangan pernah commit `.env`**.
- 🔒 **HASIL — Build reproducible.** Lockfile + versi runtime dikunci & ikut di-commit — build yang sama harus menghasilkan hasil yang sama tiap kali dijalankan, bukan "jalan di laptopku doang".
- 🔒 **HASIL — Healthcheck + rollback siap sebelum tayang.** Rencana rollback (balik ke versi lama) 1-baris tertulis; preview deploy dipakai tiap PR sebelum kode menyentuh production.
- 🔒 **HASIL — Rilis tak memutus layanan yang sedang jalan.** Default *rolling* (ganti instance bertahap); pakai *blue-green*/*canary* untuk perubahan berisiko.
- 🔒 **HASIL — Situs TIDAK boleh kena tagihan meledak (Denial-of-Wallet).** Beda dari serangan biasa yang bikin situs tumbang, ini bikin **tagihan membengkak** walau situs kelihatan baik-baik saja — khas platform serverless yang auto-scale mengikuti lalu lintas.
- 🔒 **HASIL — Subdomain terlantar TIDAK boleh bisa diklaim orang lain** (subdomain takeover) — DNS record dicabut saat sebuah layanan/subdomain dimatikan.
- 🔒 **HASIL — App menolak start kalau env salah/kosong** (fail-fast = gagal secepat & sejelas mungkin di pintu masuk), bukan meledak diam-diam di tengah trafik ramai.
- 🔒 **HASIL — Endpoint health-check yang mengintip status DB/uptime dibatasi akses**, tidak terbuka bebas untuk publik anonim.
- 🔒 **HASIL — AI men-deploy: default PREVIEW; production HANYA atas izin eksplisit owner di sesi itu.** Di project yang tersambung git-integration, `git push` ke branch production (biasanya `main`) = **TOMBOL RILIS** (langsung tayang) — perlakukan seperti aksi destruktif: minta izin verbatim dulu, jangan anggap "cuma sinkronisasi kode". (🙂 Non-Programmer: AI boleh menyiapkan versi uji-coba (preview) sendiri, tapi menayangkan ke alamat asli yang dilihat pelanggan harus seizin kamu.)

---

## 2. Cara rakit (📐 CARA BAKU / 💡 SARAN, bernomor — boleh diganti cara lain yang capai HASIL sama)

Seluruh butir (1-15) dipindah ke berkas rujukan on-demand — NOMOR BUTIR TETAP; rujukan lama "§2 butir N" tinggal dicari lewat tabel ini:

| Butir | Ringkasan 1-kalimat | -> Baca (kapan) |
|---|---|---|
| 1-4 | Dasar: env per-environment di dashboard (jangan commit `.env`) · build reproducible (lockfile+runtime dikunci) · healthcheck+rollback+preview tiap PR · rilis rolling/blue-green/canary. | `skills/deploy/rujukan/dasar-rilis.md` (kapan: mulai/menata setup deploy apa pun) |
| 5-6 | Mitigasi Denial-of-Wallet 5-langkah (tagihan meledak, khas serverless) + subdomain takeover (cabut DNS record layanan yang dimatikan). | `skills/deploy/rujukan/dasar-rilis.md` (kapan: serverless/fitur LLM · mematikan layanan/subdomain) |
| 7-9 | Pipeline CI/CD (template GitHub Actions 3-tahap) + gerbang keamanan pipeline (SAST·SCA·secret·container·DAST·SBOM) + keamanan infra cloud (IAM · pin-SHA action · WAF · backup/DR). | `skills/deploy/rujukan/cicd-infra.md` (kapan: pasang/ubah CI-CD, audit keamanan infra) |
| 10-13 | Validasi env fail-fast (zod v4) · health check berlapis `/api/health(+/detailed)` · Dockerfile produksi 5-aturan · caching/revalidate Next.js. | `skills/deploy/rujukan/env-health-docker.md` (kapan: konfigurasi runtime app — berisi juga contoh kode §3) |
| 14-15 | Disiplin AI: pra-cek keadaan CUMA-BACA sebelum aksi deploy + matriks keputusan metode deploy. | `skills/deploy/rujukan/pra-cek-deploy.md` (kapan: WAJIB sebelum AI menjalankan aksi deploy apa pun) |

---

## 3. Powerful — 🧪 3 contoh kode siap-adaptasi

Tiga contoh siap-adaptasi — `lib/env.ts` (validasi env fail-fast zod v4) · `/api/health` (cek CEPAT) · `/api/health/detailed` (cek DALAM, 503 saat sakit + pagar akses) — dipindah utuh:
-> baca `skills/deploy/rujukan/env-health-docker.md` (kapan: menulis validasi env / endpoint health check; satu berkas dengan butir 10-11 yang memakainya).

---

## 4. Self-verify (sangkal diri sendiri SEBELUM bilang "selesai")

- [ ] Tak ada `.env` ter-commit; semua env var diatur di dashboard platform per-environment (prod/preview/dev)?
- [ ] Lockfile + versi runtime dikunci & di-commit?
- [ ] Healthcheck terpasang + rencana rollback 1-baris tertulis + preview deploy dipakai tiap PR?
- [ ] Strategi rilis (rolling/blue-green/canary) dipilih sadar, bukan default tanpa pikir?
- [ ] Ada batas anggaran/alert biaya + rate-limit + cap concurrency (anti Denial-of-Wallet)?
- [ ] DNS record dicabut untuk tiap layanan/subdomain yang dimatikan; tak ada CNAME "dangling"?
- [ ] `lib/env.ts` (atau setara) memvalidasi env saat startup — app menolak jalan kalau env salah?
- [ ] `/api/health` (cepat) + `/api/health/detailed` (dalam, balikan 503 saat sakit) ada, dan `/detailed` **dibatasi akses**?
- [ ] Kalau pakai Docker: multi-stage + user non-root + `HEALTHCHECK` + base image di-pin + `.dockerignore`?
- [ ] CI/CD: test jalan di semua push/PR, action pihak-ketiga di-pin ke SHA, `permissions:` workflow minimum?
- [ ] Minimal SCA + secret scan aktif di pipeline (dua yang WAJIB)?
- [ ] MFA aktif di semua akun admin platform; token API ber-scope sempit; akses staff keluar dicabut hari itu?
- [ ] Backup rutin + minimal 1× uji-restore per kuartal; RPO/RTO ditetapkan OWNER?
- [ ] Strategi cache Next.js dipilih sadar per-halaman + `revalidateTag`/`revalidatePath` dipasang sesudah mutasi?
- [ ] Sebelum aksi deploy: pra-cek keadaan dilakukan CUMA-BACA (tak ada `link --yes`/`vercel` polos "buat ngecek")?
- [ ] Semua deploy default preview; production/`git push` ke branch produksi hanya setelah izin eksplisit owner di sesi ini?

> **Verifikasi WAJIB cuma-baca**: membuktikan = baca config/kode + menalar, JANGAN jalankan perintah yang mengubah deployment/DB produksi saat memverifikasi.

---

## 5. Definition-of-Done (kapan skill deploy dianggap benar-selesai)

- [ ] **Kontrak (§1) terpenuhi:** env tak bocor + build reproducible + healthcheck/rollback + rilis tanpa putus + anti Denial-of-Wallet + anti subdomain-takeover + fail-fast + health endpoint dibatasi.
- [ ] **Edge case** ditangani: env kosong/salah saat startup, DB tak terjangkau saat health check, lonjakan trafik/serangan biaya, layanan/subdomain dimatikan, deploy gagal di tengah (rollback dipakai).
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris`/config platform.
- [ ] Pipeline CI/CD jalan (test di semua push/PR); minimal SCA + secret scan aktif.
- [ ] Endpoint sensitif/produksi → **rak keamanan dibuka** (`skills/owasp/SKILL.md`) sebelum tayang.
- [ ] **Gerbang Pra-Rilis LULUS** — "selesai" = terbukti (deploy jalan, healthcheck hijau, rollback teruji), bukan "sudah kutulis konfignya".

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 **Keamanan web** (rate-limit, CORS, SSRF, input tak-tepercaya, OWASP A03:2025) → `skills/owasp/SKILL.md`.
- 📐 **Batas token/biaya fitur AI/LLM** (pelengkap mitigasi Denial-of-Wallet — §2 butir 5 di `skills/deploy/rujukan/dasar-rilis.md`): batasi token per-permintaan + kuota harian + timeout + kunci LLM server-only.
- 📐 **Observability produksi** (Pilar 1-3: error-tracking, log terstruktur, healthcheck dasar) → `templates/PRODUCTION_OBSERVABILITY.md`.
- 📐 **Dockerfile lengkap** (Next.js standalone + varian Python + hardening compose) → `templates/STACK_MIGRATION_GUIDE.md` §2.3.
- 📐 **Template pipeline CI/CD siap-pakai** → `templates/github/workflows/app-cicd.yml.example`.
- 📐 **Runbook pemulihan bencana** → tulis di folder milik project sendiri (mis. `docs/runbooks/`); kit tak menyediakan berkasnya.
- 🗃️ **LATAR — kredit sumber:**
  - Pipeline CI/CD + health check berlapis + Dockerfile: ECC `deployment-patterns`/`docker-patterns` (MIT © Affaan Mustafa) — ditulis-ulang + versi diperbarui (zod → v4).
  - Gerbang keamanan pipeline (SAST/SCA/secret/container/DAST/SBOM): praktik DevSecOps/OWASP (bukan ECC) — nama alat diverifikasi ada.
  - Keamanan infra cloud: ECC `security-review/cloud-infrastructure-security.md` (MIT © Affaan Mustafa) — disuling untuk stack PaaS tim (contoh AWS IAM/VPC/Terraform dibuang, niche). Fakta layanan (WAF per-plan Cloudflare, backup/PITR Supabase, pin-SHA GitHub, CVE-2025-30066 di NVD) diverifikasi ke dok resmi 2026-07 — fitur per-plan bisa berubah, cek ulang plan terpasang.
  - Disiplin AI deploy (§1 butir terakhir + §2 butir 14-15 di `skills/deploy/rujukan/pra-cek-deploy.md`): METODE diserap dari `deploy-to-vercel` v3.0.0 (`vercel-labs/agent-skills`, 2026-08-09) — repo itu TANPA lisensi tegas utk skill ini, jadi hanya metodenya yang diserap & seluruh teks ditulis ulang. **DITOLAK dari sumber sama:** jalur "no-auth fallback" (upload seluruh source ke endpoint hosted pihak ketiga tanpa autentikasi demi claim-URL) — tabrakan langsung dgn Palang Rem + aturan kirim-keluar kit; tanpa login → berhenti & lapor, bukan cari jalan pintas.

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** ketersediaan layanan, anggaran/biaya operasional, kerahasiaan env, reputasi domain/subdomain. **Mode-gagal khas:** env bocor lewat commit `.env`, tagihan meledak akibat lonjakan trafik/serangan (Denial-of-Wallet), subdomain terlantar diklaim penyerang untuk phishing, deploy tanpa rencana rollback, env salah lolos ke production (tak fail-fast), endpoint health-check membocorkan info sistem ke publik anonim, action CI pihak-ketiga diam-diam diganti (supply-chain, contoh CVE-2025-30066), backup tak pernah diuji-pulihkan. **Mitigasi:** env di dashboard per-environment + lockfile terkunci + healthcheck/rollback/preview + rate-limit & budget alert + DNS dicabut saat layanan mati + validasi env startup + endpoint detail dibatasi akses + pin action ke SHA + MFA & scope token sempit + backup rutin + uji-restore berkala + RPO/RTO ditetapkan owner.
- 🗃️ **LATAR — Batas jujur:** skill ini menaikkan **lantai** kelayakan-produksi deployment PaaS terkelola (Vercel/Railway/Render + Cloudflare + Supabase); **tidak menggantikan** load-testing, chaos engineering, atau audit keamanan cloud menyeluruh untuk infra AWS/GCP/Azure mentah (di luar cakupan). Fitur per-plan platform berubah — cek plan yang benar-benar aktif, jangan dari ingatan.

🙂 **Non-Programmer:** deploy yang matang bukan cuma "kirim kode ke server sampai bisa diakses" — ada tempat aman untuk kunci rahasia, cara darurat "balik ke versi lama", pengujian sebelum tayang ke publik, alarm tagihan biar tak jebol mendadak, dan alamat subdomain yang dicabut rapi saat layanan ditutup supaya tak dipakai orang lain untuk situs palsu. Semua itu dicek OTOMATIS di pipeline sebelum kode benar-benar sampai ke pelanggan.
