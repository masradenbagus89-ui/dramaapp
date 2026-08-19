# Antrean deploy

> **Cara pakai:** ketik **`cek antrean-deploy`** atau **`lanjut dari handoff`**.
> AI wajib `git fetch origin` + `git fetch dramaku`, bandingkan `origin/main` vs `dramaku/main` vs produksi Vercel, lalu **perbarui tabel di bawah**.

**Terakhir dicek:** 2026-08-19 sore WIB (commit docs `3b97791` di-push ke kedua repo)

## Siapa memantau apa

| Repo | Remote git | Dipantau Vercel? |
|---|---|---|
| `ojokesusu/dramaku` | `dramaku` | Tidak — tempat rekan sering commit dulu |
| `masradenbagus89-ui/dramaapp` | `origin` | **Ya** — `git push origin main` = tombol rilis |

Produksi: https://dramaapp.vercel.app  
Commit terbaru yang di-push: **`3b97791`** (Tahap 7 + catatan insiden tunnel). Kode aplikasi terakhir berubah di `1ce14c3` — **sudah tayang & diverifikasi 2026-08-19** (`/lupa-password` 200, endpoint auth hidup).
Catatan: `git fetch` ke `origin` **dan** `dramaku` dua-duanya SUKSES 2026-08-19 sore (timeout `dramaku` pagi tadi tidak kambuh).
Tahap 6 (`b48bf32`): **sudah diverifikasi owner jalan di produksi** 2026-08-18.
AUTH_SECRET di Vercel: dikonfirmasi ADA oleh owner 2026-08-18.

## Antrian sekarang

| Status | Commit | Isi | Aksi |
|---|---|---|---|
| ✅ tayang & terverifikasi | `1ce14c3` | Tahap 7: kode pemulihan password | Sisa: uji manual alur daftar→reset |
| ⚠️ utang operasional | — | `VERCEL_TOKEN` di `start-dramaapp.ps1` kedaluwarsa (403) | Buat token baru, tempel di PC backup |
| ⏸️ menunggu bahan | — | API key Playly valid (yang kemarin `invalid_key`) | Jangan deploy env dulu |

**Selisih `dramaku/main` vs `origin/main`:** NOL — lokal, `origin`, dan `dramaku` semuanya di `3b97791` (diverifikasi sesudah push, 2026-08-19 sore).

## Cara cek cepat (AI / kamu)

```powershell
git fetch origin
git fetch dramaku
git log --oneline origin/main..dramaku/main
```

- Ada baris di situ = **rekan sudah commit di dramaku, belum di origin** → masukkan ke tabel "Antrian sekarang", lalu tawarkan deploy (izin dulu sebelum `git push origin main`).
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
| 2026-08-19 | — (tanpa commit) | Tahap 7 terverifikasi tayang; tunnel video mati → env `NEXT_PUBLIC_VIDEO_BASE_URL` diupdate MANUAL ke tunnel baru + redeploy; video terbukti jalan (206) |
| 2026-08-19 | `3b97791` → origin + dramaku | Commit catatan yang nyangkut di lokal dibayar; ketiga ref sama. Docs-only (HANDOFF + antrean), nol baris kode aplikasi |

## Aturan isi (untuk AI)

1. Jangan masukkan secret / API key ke berkas ini.
2. Tiap kali rekan kirim "sudah commit" atau owner minta cek deploy → fetch, isi tabel, sebut 1 kalimat ke owner.
3. Sesudah deploy berhasil: pindahkan baris antrian ke "Riwayat", samakan "Commit yang sedang tayang".
4. Sesudah mengubah berkas ini, perbarui juga tanggal di `HANDOFF.md`.
