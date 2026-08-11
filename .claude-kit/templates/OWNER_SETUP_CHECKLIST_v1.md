# OWNER_SETUP_CHECKLIST — Tugas Teknis Sekali-Pasang (owner / lead)

> Versi 2 · 2026-06-10 · bahasa non-programmer · 1 halaman (v2: tambah A7 kirim `.env` aman + B7 akses paket bersama + alur pull staff)

## Untuk siapa & kenapa

Ini daftar tugas **sekali pasang** yang harus dikerjakan **owner atau 1 orang lead** — bukan 30 staff harian. Isinya **hanya** bagian teknis yang **AI Claude Code belum bisa kerjakan sendiri** (pasang komputer, kunci akses, kunci pengaman). Setelah ini beres, staff non-programmer tinggal prompt.

> 🏢 **Analogi:** kayak buka cabang toko. Pegawai harian tinggal jaga kasir (prompt + klik). Tapi **buka cabang** (listrik, izin, mesin kasir) butuh dikerjakan sekali oleh yang teknis. Daftar ini = "buka cabang".

> 💡 **Kalau bingung di satu langkah**: buka Claude Code, ketik *"tolong pandu aku langkah [nomor] di OWNER_SETUP_CHECKLIST, aku non-programmer"* — AI akan tuntun pelan-pelan.

---

## Bagian A — WAJIB untuk semua tim (~30-45 menit, sekali)

- [ ] **A1. Siapkan komputer tiap staff** — pasang Claude Code + Node.js + Git. Ini fondasi; tanpa ini AI tidak bisa jalan. *(Kayak pasang aplikasi + internet sebelum bisa pakai HP.)*
- [ ] **A2. Pasang kit** — di folder project, jalankan `npm create lintasai` (atau tempel isi `JALANKAN_KIT.md` ke Claude Code). AI lanjutkan sisanya otomatis.
- [ ] **A5. Atur akses Git sekali** — login Git/GitHub di komputer staff supaya Claude Code boleh mengirim hasil kerja. *(Kayak login sekali di aplikasi, setelah itu auto.)*
- [ ] **A7. Kirim file `.env` (kunci rahasia) ke staff dengan AMAN** — repo **sengaja TIDAK berisi kunci asli** (demi keamanan); yang ada cuma contoh (`.env.example`). Tiap staff butuh `.env` asli supaya app bisa jalan. **JANGAN kirim lewat WhatsApp/email biasa** (gampang bocor + nempel selamanya). Pakai **pengelola sandi bersama** (1Password / Bitwarden) atau **env di platform deploy** (Vercel/Railway). *(Kayak bagi kunci brankas — diserahkan terkunci, bukan ditempel di grup WA.)* **Nuansa per peran**: staff **frontend** cuma butuh nilai `NEXT_PUBLIC_*` (tidak sensitif); staff **backend** butuh `DATABASE_URL` dll (sensitif — WAJIB jalur aman).

---

## Bagian B — KALAU pakai split-repo (robot lintas-repo). Skip kalau masih 1 repo.

- [ ] **B1. Buat repo GitHub** — backend, frontend, shared (paket bersama). Detail: `SPLIT_REPO_MIGRATION_PROMPT_v1.md`.
- [ ] **B2. Pasang penerbitan paket bersama** — setel token paket supaya backend bisa "menerbitkan" bentuk-data ke frontend. Detail: `SPLIT_REPO_TOOLS_SETUP.md` §2.
- [ ] **B3. Nyalakan kunci pengaman gabung** — kunci branch utama tiap repo manual di GitHub: **Settings → Branches → Add branch protection rule** untuk `main` (wajib lewat PR + minimal 1 approval + larang force-push). *(Ini yang bikin staff non-programmer tidak bisa "tidak sengaja" merusak versi utama.)*
- [ ] **B4. (Opsional)** — Renovate/Dependabot (robot pemantau update dependency). Detail: `SPLIT_REPO_TOOLS_SETUP.md` §14.
- [ ] **B5. UJI robot dulu sebelum tim pakai** — ikuti `ROBOT_CI_TESTING_PLAYBOOK.md` (5 cek di repo kecil). **Jangan lewati** — ini memastikan robot benar sebelum 30 orang bergantung padanya.
- [ ] **B6. Atur akses "paket bersama" di komputer tiap staff** — supaya `npm install` di frontend/backend bisa mengunduh paket bersama `@<project>/shared`, tiap komputer staff perlu "login" sekali ke tempat paket (private registry / GitHub Packages) lewat file `.npmrc`. **Tanpa ini, `npm install` GAGAL** → app tidak bisa jalan. Detail: `SPLIT_REPO_TOOLS_SETUP.md`. *(Kayak kartu anggota perpustakaan — sekali daftar, baru boleh pinjam buku bersama.)*
- [ ] **B7. (Kalau kelola BANYAK repo)** — atur izin clone GitHub per repo lewat undangan collaborator (Settings → Collaborators and teams). Inilah yang bikin cuma **3-5 orang** bisa download backend+DB, ~40 staff cuma repo fitur. **Default = tolak**, tambah seperlunya. *(Kayak kartu akses gedung — ruang server cuma untuk yang berkartu khusus.)*

---

## Bagian C — KALAU pakai database. Skip kalau tidak.

- [ ] **C1. Atur jenjang akses database** — siapa boleh ubah STRUKTUR (senior) vs cuma ISI data (junior). Minta AI susun SQL `GRANT`/`REVOKE` per schema (role tiering §9). *(Kayak beda akses: manajer boleh ubah denah toko, kasir cuma boleh input transaksi.)*
- [ ] **C2. (Kalau Supabase + banyak penyewa)** — atur RLS (aturan siapa boleh baca/tulis baris mana). **Risiko tinggi** — jalankan di lingkungan uji dulu, bukan langsung produksi. Detail: `RLS_SETUP_PROMPT.md`.

---

## Setelah semua beres → serahkan ke staff

**Alur staff non-programmer (split-repo), 1x per repo:**
1. Owner **invite** staff ke repo yang dia butuh (GitHub → Settings → Collaborators).
2. Staff **pull** repo-nya.
3. Staff buka Claude Code → **cek-kesehatan otomatis** mendeteksi "node_modules kosong + `.env` belum ada" → AI **menuntun** jalankan `npm install` + menaruh `.env` (dari pengelola sandi langkah A7).
4. **Baru** staff prompt kerja ("buatkan halaman X", "perbaiki bug Y") + **klik gabung** di GitHub.

> ⚠️ "Tinggal pull lalu prompt" hanya mulus kalau **A7 (kirim `.env`) + B7 (akses paket bersama)** sudah beres. Lewati salah satu → staff buntu di `npm install` atau app tidak jalan.

Yang **berisiko** (hapus data, kirim email massal, ubah database produksi) **tetap minta konfirmasi ketik** — rambu pengaman yang **sengaja tidak dimatikan**.

## Catatan penting

- **Ini model "1 orang teknis + banyak non-programmer"**, bukan "nol teknis". Bagian A-C cukup dikerjakan owner/1 lead **sekali**.
- **Jangan matikan gerbang konfirmasi** untuk aksi berisiko, walau ingin "lebih otomatis" — staff non-programmer tidak bisa mendeteksi kalau AI salah.
- Tiap baris yang sebut nama file → detail lengkap ada di file itu (di folder `docs/` atau `.claude-kit/`).
