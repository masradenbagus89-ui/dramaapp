# Buku Induk akses & kepemilikan — dramaapp

> Dibuat 2026-10-15 dari **audit sungguhan**, bukan dari ingatan. Ini pembanding
> untuk pengingat cek-akses bulanan (`.github/workflows/audit-access.yml`).
>
> **Isinya NAMA saja — tidak pernah nilai secret.** Kalau ada nilai rahasia
> tertulis di sini, itu bug: hapus + rotasi kuncinya.
>
> 🔴 **Kenapa berkas ini lahir:** pengingat bulanan menyuruh membandingkan dengan
> `lintasai-portfolio.yml` dan membuka `docs/ACCESS_CONTROL_NREPO.md` —
> **keduanya tidak pernah ada di repo ini**. Jadi selama 4 bulan (Juli–Oktober
> 2026) pengingatnya mustahil diselesaikan dan menumpuk jadi 4 Issue terbuka.
> Bukan kemalasan — tugasnya memang tak bisa dikerjakan.

---

## 1. Repo

| Repo | Pemilik | Sifat | Peran |
|---|---|---|---|
| `masradenbagus89-ui/dramaapp` | `masradenbagus89-ui` (user) | **publik** | **PRODUKSI** — push ke `main` = tombol rilis (Vercel + Railway ikut build) |
| `ojokesusu/dramaku` | `ojokesusu` (**organisasi**) | privat | Cermin. Tempat rekan bekerja |
| `projectraden/backup-dramaapp` | — | — | ⚠️ remote `official` di komputer owner, tapi **404** (lihat §5) |

### Siapa punya akses — hasil baca 2026-10-15

**`masradenbagus89-ui/dramaapp` (produksi):**

| Akun | Peran | Catatan |
|---|---|---|
| `masradenbagus89-ui` | admin | owner |

Undangan tertunda: **nol**. Deploy key: **nol**.

**`ojokesusu/dramaku` (cermin):**

| Akun | Peran | Catatan |
|---|---|---|
| `yusufscorpio` (user) | maintain | rekan |
| `masradenbagus89-ui` (user) | maintain | owner |

❓ **Belum bisa diverifikasi:** `ojokesusu` adalah **organisasi**, bukan orang.
Pemilik/anggota organisasi otomatis bisa mengakses repo di dalamnya **tanpa
muncul di daftar collaborator**. Daftar anggota org tak terbaca oleh token owner
(membership privat). Artinya pertanyaan *"siapa saja yang bisa melihat seluruh
kode kita?"* **belum terjawab penuh** — hanya pemilik org yang bisa menjawabnya.

---

## 2. Secret yang tersimpan di GitHub Actions (nama saja)

**`masradenbagus89-ui/dramaapp`** — 3 secret:

| Nama | Dipakai |
|---|---|
| `SUPABASE_PROJECT_REF` | `backup-dramaapp.yml` |
| `SUPABASE_SERVICE_ROLE_KEY` | `backup-dramaapp.yml` |
| `SUPABASE_STORAGE_BUCKET` | `backup-dramaapp.yml` |

**`ojokesusu/dramaku`** — **nol secret**. Jadi walau Actions di sana dihidupkan,
robotnya tetap tak bisa bekerja.

### Secret yang DIMINTA kode tapi TIDAK ADA

| Nama | Workflow | Akibat |
|---|---|---|
| `ANTHROPIC_API_KEY` | `ai-review.yml` | AI review **tak bisa jalan**. Workflow ini belum pernah jalan sekali pun |
| `DATABASE_URL_BACKUP` | `backup-schemas.yml` | Sudah diketahui — jalur `pg_dump` dinyatakan BUNTU, jadwalnya sengaja dimatikan |
| `SLACK_WEBHOOK_URL` | `backup-schemas.yml` | Ditandai "(optional)" di workflow-nya |

`GITHUB_TOKEN` disediakan GitHub otomatis — bukan secret yang perlu diisi.

---

## 3. Variable Actions (bukan secret — isinya alamat, boleh dilihat)

| Nama | Repo | Isi 2026-10-15 |
|---|---|---|
| `KEEPALIVE_SITES` | produksi | `https://dramaapp-production-9e88.up.railway.app` |
| `KEEPALIVE_SITES` | cermin | ⚠️ masih memuat alamat Vercel (tak berefek — Actions di sana mati) |

---

## 4. Layanan di luar GitHub (pemegang akses = owner)

| Layanan | Catatan |
|---|---|
| Railway (`ravishing-adaptation` / service `dramaapp`) | **hosting produksi** sejak 2026-10-15 |
| Vercel (`dramaapp`) | sejak 2026-10-15 hanya **pengalihan 308** ke Railway. Env produksi **masih tersimpan di sana** — bersihkan saat project ditutup |
| Supabase `nvblmpkwyzbpdbshyvzw` | ⚠️ **BUKAN milik owner** — milik pihak lain (Kang Dedi), dihuni beberapa aplikasi. dramaapp menempati schema `dramaapp` |
| Playly (mitra video) | webhook menunjuk Railway sejak 2026-10-14 |
| PC backup (sumber video) | melapor alamat tunnel ke Railway |

---

## 5. Selisih & utang yang ditemukan audit 2026-10-15

1. 🔴 **Repo produksi bersifat PUBLIK.** Diketahui & disengaja (pernah ada
   perbaikan "kebocoran artifact di repo publik", commit `dd19287`). Yang perlu
   disadari: `HANDOFF.md` kini memuat banyak detail operasional (alamat, arsitektur,
   kelemahan yang belum ditutup) dan **bisa dibaca siapa saja**. Secret-nya aman
   (ada di GitHub Secrets, bukan di repo), tapi pengetahuan operasionalnya terbuka.
2. ❓ **Anggota organisasi `ojokesusu` tak terbaca** — lihat §1.
3. ⚠️ **Remote `official` (`projectraden/backup-dramaapp`) menjawab 404** di
   komputer owner. Entah repo-nya dihapus, atau owner tak punya akses lagi.
   Remote mati begini berbahaya: orang bisa mengira sudah mendorong cadangan
   padahal tidak. **Hapus remote-nya, atau pulihkan repo-nya.**
4. ⚠️ **Actions di repo cermin MATI** karena tagihan akun rekan ("The job was not
   started because recent account payments have failed"). Enam workflow `active`
   tapi tak pernah mulai.
5. ⚠️ **`ai-review.yml` tak bisa bekerja** — `ANTHROPIC_API_KEY` tidak ada.
   Putuskan: isi secret-nya, atau hapus workflow-nya. Workflow yang tak pernah
   bisa jalan = kepercayaan palsu bahwa ada yang memeriksa.

---

## 6. Cara menjalankan cek-akses bulanan (baca-saja, nol perubahan)

```bash
# Siapa yang bisa akses tiap repo
gh api repos/masradenbagus89-ui/dramaapp/collaborators --jq '.[] | "\(.login) [\(.role_name)]"'
gh api repos/ojokesusu/dramaku/collaborators          --jq '.[] | "\(.login) [\(.role_name)]"'

# Undangan tertunda & deploy key (jalur akses yang sering terlupa)
gh api repos/masradenbagus89-ui/dramaapp/invitations --jq '.[] | .invitee.login'
gh api repos/masradenbagus89-ui/dramaapp/keys        --jq '.[] | .title'

# Nama secret & variable (NILAI tidak pernah ditampilkan)
gh api repos/masradenbagus89-ui/dramaapp/actions/secrets   --jq '.secrets[].name'
gh api repos/masradenbagus89-ui/dramaapp/actions/variables --jq '.variables[] | "\(.name)=\(.value)"'
```

Bandingkan hasilnya dengan §1–§3. **Ada yang tak cocok → cabut manual** lewat
GitHub → Settings → Collaborators (pencabutan = keputusan manusia, bukan robot),
lalu **perbarui berkas ini** supaya peta aksesnya tetap jujur.
