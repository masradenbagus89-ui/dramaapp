# Rujukan deploy — disiplin AI: pra-cek cuma-baca & matriks metode deploy (§2 butir 14-15)
> Bagian dari `skills/deploy` — dibuka on-demand dari SKILL.md inti; membaca berkas ini TERCATAT tanda-terima Palang Rak (path skills/**.md).
Isi penuh `skills/deploy/SKILL.md` §2 butir 14-15 — WAJIB dibaca sebelum AI menjalankan aksi deploy apa pun.

14. 📐 **Pra-cek keadaan CUMA-BACA sebelum aksi deploy apa pun (disiplin AI).** Sebelum memilih metode, kumpulkan 3 fakta dengan perintah yang TIDAK mengubah apa-apa: **(a)** ada git remote? (`git remote get-url origin`); **(b)** project sudah ter-link ke platform? (Vercel: BACA `.vercel/project.json` / `.vercel/repo.json` — salah satunya ada = ter-link; Netlify: `.netlify/state.json`); **(c)** CLI terpasang + login? (Vercel: `vercel whoami` — satu-satunya perintah Vercel yang aman dijalankan di folder mana pun). 🚨 **JANGAN "mengecek" pakai perintah ber-efek-samping tersembunyi:** `vercel link --yes` MENAUTKAN project diam-diam; `vercel ls`/`vercel project inspect` di folder belum-link memunculkan prompt interaktif (macet di CI) atau ikut menautkan; `vercel` polos TANPA subcommand = LANGSUNG deploy; `netlify deploy --prod` = langsung tayang. Perintah "cek" yang mengubah keadaan = bukan cek.
15. 📐 **Matriks keputusan metode deploy (dari hasil pra-cek butir 14; arah jangka panjang = ter-link + deploy-lewat-git-push):**

    | Ter-link? | Git remote? | CLI login? | Metode |
    |---|---|---|---|
    | ✅ | ✅ | — | git push (memicu build otomatis; branch non-produksi = preview) — **minta izin dulu sebelum push** |
    | ✅ | ❌ | ✅ | `vercel deploy -y --no-wait` (preview; `--no-wait` = URL langsung keluar, status build dicek `vercel inspect <url>`) |
    | ❌ | apa pun | ✅ | link DULU: ada remote → `vercel link --repo` (cocokkan via URL repo — lebih andal daripada pencocokan nama folder), tanpa remote → `vercel link`; lalu baris di atas |
    | ❌ | apa pun | ❌ | pasang CLI + minta owner `vercel login` (buka browser) — **login gagal/tak bisa → BERHENTI & lapor**; JANGAN pakai jalur upload tanpa-auth pihak ketiga (lihat LATAR `skills/deploy/SKILL.md` §6 — DITOLAK) |

    Production (`--prod` / push ke branch produksi) di baris mana pun: HANYA setelah izin eksplisit (🔒 SKILL.md §1). Nama perintah/flag beda per provider & versi CLI — cek `--help` versi terpasang, jangan dari ingatan.
