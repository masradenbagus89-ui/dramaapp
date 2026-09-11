# AGENTS.local.md - Override khusus proyek dramaapp

> v1 · 2026-08-13 · ikut standar tim IT (Pola B)

<!-- Header auto-isi setup-pola-b.mjs. Tiap <PLACEHOLDER> + frasa "Pola B" = penanda mesin, jangan dihapus. -->

Aturan tim ada di **`./AGENTS.md`** — kernel yang dibaca **OTOMATIS** tiap sesi (Codex & Kimi native; Cursor lewat `.cursor/rules/lintasai.mdc`; Claude lewat `CLAUDE.md` `@import`). **`AGENTS.md` = milik kit, di-refresh saat update — JANGAN edit langsung**; taruh perubahanmu di berkas INI (milikmu, tak pernah ditimpa). **AI: baca `./.lintasai/PETA.md` dulu** ("apa di mana": fungsi tiap folder + daftar skill).

## Versi kit aktif

- Cek versi: **`npx lintasai version`** (atau `kit_version` di `./.lintasai/.install-manifest.json`). Jangan salin angkanya ke sini — jadi basi setelah update.
- Sumber kit (repo standar tim): **belum-ada (solo project)**

## Override khusus proyek

Centang `[x]` hanya yang **beda dari default kit**; yang tidak dicentang = ikut default.

- [ ] Bahasa docs: <!-- default ID -->
- [ ] Format commit: <!-- default Conventional Commits -->
- [ ] Tech stack: <!-- default React/Next.js + Tailwind + shadcn -->
- [ ] Branch utama: <!-- default `main` -->
- [ ] Pakai GitHub Issue: <!-- default Tidak (chat-driven) -->
- [ ] Channel chat task: <!-- link Slack/Discord/Telegram/WhatsApp -->
- [ ] Lain-lain:

## Opt-in — mode & ide opsional (default semua MATI)

Centang `[x]` yang mau diaktifkan.

<!-- Riwayat pencabutan opsi (mis. "Mode Hemat" -> dilebur ke TANGGA BOBOT kernel): .lintasai/CHANGELOG.md. -->

- [ ] **Mode Auto-Confirm** — lewati konfirmasi Y/N sederhana (aksi merusak TETAP wajib konfirmasi).
- [ ] **Mode Co-Pilot Berpagar** — AI proaktif kerjakan yang aman, berhenti di pagar (commit/push/PR/merge = manusia).
- [ ] Ide opsional lain (UTM/tracking, i18n, performance budget, secret scanner — opt-in, catat di sini).

## Catatan tim

<!-- Kosongkan kalau proyek solo. -->

- Owner standar tim: <!-- nama + email/handle PIC kit -->
- Channel diskusi: <!-- link Slack/Discord/Telegram -->
- **Jembatan sesi (untuk AI):** baca `HANDOFF.md` dulu (titik lanjut tab baru: owner ketik `lanjut dari handoff`), lalu `antrean-deploy.md` kalau topiknya rilis/commit rekan. `NEXT-SESSION.md` = arsip lebih panjang. **Wajib perbarui `HANDOFF.md` di akhir tiap perubahan**; sentuh rilis → perbarui juga `antrean-deploy.md` (fetch `origin` + `dramaku` dulu). Jangan tulis secret ke situ.
- **Dual push (WAJIB, owner 2026-08-11):** tiap ada perubahan yang di-commit → push ke **kedua** repo: `https://github.com/ojokesusu/dramaku` (remote `dramaku`) **dan** `https://github.com/masradenbagus89-ui/dramaapp` (remote `origin`). Detail di `NEXT-SESSION.md`.

## Pembagian kerja: owner ↔ rekan (WAJIB, owner 2026-09-11)

> Dua orang mengerjakan repo ini. **Owner** (`masradenbagus89-ui`) memegang repo produksi + database Supabase + Vercel. **Rekan** (`yusufscorpio`) hanya punya akses repo cermin `ojokesusu/dramaku` — dia mengerjakan di branch, owner menarik lalu men-deploy.
> Aturan di bawah menutup titik bentrok yang **sudah terbukti terjadi**, bukan bentrok hipotetis. AI di kedua komputer WAJIB mematuhinya.

**1. Tiga berkas catatan = milik OWNER saja.** `HANDOFF.md`, `antrean-deploy.md`, `docs/lintasai/INDEX.md` — rekan **DILARANG** menulis ke sana (ketiganya sudah pernah bentrok: `antrean-deploy.md:107`). Gantinya rekan membuat **berkas baru tiap tugas**: `docs/serah-terima/YYYY-MM-DD-<topik>.md`. Kenapa berkas baru, bukan satu berkas tetap: git hanya bentrok kalau dua pihak mengubah berkas yang **sama** — berkas yang selalu baru membuat bentrok mustahil, bukan sekadar jarang. Format + isi wajib: `docs/serah-terima/README.md`.

**2. Branch berumur pendek.** Rekan `git fetch` + rebase ke `main` terkini **sebelum** menyerahkan; owner menarik dalam ≤2 hari kerja. Bukti kenapa: branch `redesign/playly-card` (5 commit) dibiarkan tertinggal 54 commit → 6 berkas bentrok **plus** 2 kemunduran senyap (pemutar & grid yang sudah dirilis ikut mundur tanpa peringatan git).

**3. Database & env SELALU didahulukan owner.** Urutan tak boleh dibalik: jalankan SQL di `supabase_migrations/` → isi env baru di Vercel → **baru** push ke `origin main`. Kode yang mencari kolom/kunci yang belum ada = situs error. Rekan tak punya akses keduanya, jadi wajib menyebutkannya di berkas serah-terima.

**4. `data/dramas.json` = cadangan, BUKAN sumber kebenaran.** Isinya disegarkan berkala dari produksi supaya preview lokal jujur, tapi tetap bisa basi. Cara sah memeriksa katalog: `GET /api/dramas` dari aplikasi yang jalan, atau REST Supabase dengan header `Accept-Profile: dramaapp` (`lib/supabase.ts:24`). Jebakan ini pernah menipu sesi AI sendiri (2026-09-10) sampai salah mengambil keputusan fitur.

**5. Anti salah-remote.** `origin` = repo **produksi**, push ke `main` di sana = **TOMBOL RILIS**. `dramaku` = cermin, push ke sana tidak merilis apa pun. **DILARANG** mendorong branch langsung ke main mana pun (`git push <remote> <branch>:main`) — non-fast-forward bisa menghapus pekerjaan yang sudah tayang (`HANDOFF.md:1093`). Selalu tulis nama remote eksplisit: `git push` polos di komputer owner menembak `dramaku`, **bukan** produksi.

**6. Gerbang pra-rilis (owner, sebelum push ke `origin main`).** Robot `ai-review.yml` **tidak jalan** untuk kerja rekan — berkas itu sengaja melewati PR dari repo lain. Gerbang manual ini penggantinya, jalankan berurutan: `rm -rf .next` → `npx tsc --noEmit` (0 error) → `npm test` (hijau) → `npm run build` (sukses) → periksa nol berkas env/kunci ter-stage → push → verifikasi tayang di situs sungguhan.

**7. Identitas git dipisahkan.** Tiap komputer set `git config user.name` + `user.email` miliknya sendiri. Saat ini seluruh commit branch rekan ber-author identitas owner, jadi riwayat git tak bisa menjawab "siapa mengerjakan ini".

**8. Preview lokal rekan.** Rekan memverifikasi hasil kerjanya di `localhost` sebelum commit. Cara menyalakan + daftar **apa yang tidak bisa dipercaya dari localhost** (video Playly & video drama memang tidak akan jalan di sana — bukan bug): `docs/panduan-lokal-rekan.md`.

## Riwayat update kit di proyek ini

| Versi kit | Tanggal update | Siapa update | Catatan |
|---|---|---|---|
| v3.0.0 | 2026-07-23 | user18 | Setup awal Pola B (folder `.claude-kit/`) |
| v8.0.0 | 2026-08-13 | user18 | Pasang ulang bersih → folder `.lintasai/` |

<!-- Tambah baris tiap update `./.lintasai/` ke versi lebih baru. -->
