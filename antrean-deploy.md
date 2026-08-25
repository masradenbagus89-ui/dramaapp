# Antrean deploy

> **Cara pakai:** ketik **`cek antrean-deploy`** atau **`lanjut dari handoff`**.
> AI wajib `git fetch --all`, bandingkan `dramaapp/main` vs `origin/main` vs produksi Vercel, lalu **perbarui tabel di bawah**.
>
> ⚠️ **Nama remote sudah bertukar (dicek 2026-08-25).** Remote `dramaku` SUDAH TIDAK ADA.

**Terakhir dicek:** 2026-08-25 sore WIB (integrasi Playly)

## Siapa memantau apa

| Repo | Remote git | Dipantau Vercel? |
|---|---|---|
| `masradenbagus89-ui/dramaapp` | **`dramaapp`** | **Ya** — `git push dramaapp main` = tombol rilis |
| `ojokesusu/dramaku` | **`origin`** | Tidak |

> Dulu tercatat terbalik (`origin` = dramaapp). Cek dengan `git remote -v` sebelum push.

Produksi: https://dramaapp.vercel.app  
Commit yang sedang jalan di produksi: **`617f6a0`** (pekerjaan `pc-backup`, 22 Agustus).
`dramaapp/main` dan `origin/main` sama-sama di `617f6a0` — **tidak ada rilis tertinggal**.
AUTH_SECRET di Vercel: dikonfirmasi ADA oleh owner 2026-08-18.

## Antrian sekarang

| Status | Commit | Isi | Aksi |
|---|---|---|---|
| 🚧 **belum di main** | `ecc0263` + perbaikan 2026-08-25 | Integrasi Playly (branch `feat/playly-integrasi`) | **Butuh izin owner**: merge ke `main` → `git push dramaapp main` |
| ⏸️ menunggu bahan | — | Kunci `plyk_` valid dari pengelola Playly (yang ada ditolak `invalid_key`) | Tidak memblokir — fitur jalan lewat katalog publik |
| ⏸️ perlu dicek | — | `PLAYLY_ENCRYPTION_KEY` di Environment Variables Vercel | Cek sebelum memasang kunci mitra |

**Kondisi produksi 2026-08-25:** `/admin/videos/playly` masih **404** — fitur Playly
belum pernah di-deploy. Branch `feat/playly-integrasi` tertinggal ~8 commit dari
`main` (pekerjaan `pc-backup`), jadi perlu merge/rebase dulu sebelum rilis.

**Selisih `dramaapp/main` vs `origin/main`:** NOL — keduanya di `617f6a0`.

## Cara cek cepat (AI / kamu)

```powershell
git fetch --all
git remote -v
git log --oneline dramaapp/main..origin/main
```

- Ada baris di situ = **ada commit di `origin` yang belum dirilis** → masukkan ke tabel "Antrian sekarang", lalu tawarkan deploy (izin dulu sebelum `git push dramaapp main`).
- Kosong = tidak ada rilis tertinggal.

Rollback 1-baris: Vercel → project `dramaapp` → Deployments → Promote commit **`954c9ca`** (14 Agustus).

## Riwayat yang sudah lewat antrean

| Tanggal | Commit | Hasil |
|---|---|---|
| 2026-08-15 | `6bb2539` … `8880c5a` dipindah ke origin | Build 1 gagal (font Playfair 404) |
| 2026-08-15 | `820abb8` font Georgia | Build Ready, smoke test lulus; Playly idle (env kosong) |
| 2026-08-18 | `4821c8f`..`0100a66` → `dramaku` | Utang dual-push 6 commit dibayar; kedua repo sama |
| 2026-08-18 | `a36bc67`..`02efb6a` → origin + dramaku | Tahap 4 Performance & SEO dirilis; hasil build Vercel belum diverifikasi |
| 2026-08-18 | `5a51261` → origin + dramaku | Catatan status Tahap 4; ketiga ref sama |
| 2026-08-18 | `d5bb261`..`8602858` → origin + dramaku | Tahap 5 dirilis; hasil build Vercel belum diverifikasi |
| 2026-08-18 | `55e6d8b` → origin + dramaku | Catatan status Tahap 5; ketiga ref sama |
| 2026-08-18 | `82e7536` → origin + dramaku | Tahap 6 dirilis (BREAKING: penonton daftar ulang); build Vercel belum diverifikasi |
| 2026-08-18 | `b48bf32` → origin + dramaku | Catatan status Tahap 6; ketiga ref sama |
| 2026-08-18 | Tahap 6 diverifikasi owner | Build Ready, daftar & login jalan, password salah ditolak, akun bersaldo diklaim |
| 2026-08-18 | `1ce14c3` → origin + dramaku | Tahap 7 dirilis; build Vercel belum diverifikasi |

## Aturan isi (untuk AI)

1. Jangan masukkan secret / API key ke berkas ini.
2. Tiap kali rekan kirim "sudah commit" atau owner minta cek deploy → fetch, isi tabel, sebut 1 kalimat ke owner.
3. Sesudah deploy berhasil: pindahkan baris antrian ke "Riwayat", samakan "Commit yang sedang tayang".
4. Sesudah mengubah berkas ini, perbarui juga tanggal di `HANDOFF.md`.
