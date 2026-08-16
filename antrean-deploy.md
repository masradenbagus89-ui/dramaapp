# Antrean deploy

> **Cara pakai:** ketik **`cek antrean-deploy`** atau **`lanjut dari handoff`**.
> AI wajib `git fetch origin` + `git fetch dramaku`, bandingkan `origin/main` vs `dramaku/main` vs produksi Vercel, lalu **perbarui tabel di bawah**.

**Terakhir dicek:** 2026-08-16 malam WIB

## Siapa memantau apa

| Repo | Remote git | Dipantau Vercel? |
|---|---|---|
| `ojokesusu/dramaku` | `dramaku` | Tidak — tempat rekan sering commit dulu |
| `masradenbagus89-ui/dramaapp` | `origin` | **Ya** — `git push origin main` = tombol rilis |

Produksi: https://dramaapp.vercel.app  
Commit yang sedang tayang: **`820abb8`** (`fix(build): lepas Playfair Google Font yang 404 di Vercel`)

## Antrian sekarang

| Status | Commit | Isi | Aksi |
|---|---|---|---|
| ✅ sudah tayang | `820abb8` + `6bb2539` | Jalur video API luar + perbaikan font | Tidak perlu |
| 🚀 siap deploy | `1af6e12`..`9b69055` | Tahap 1 redesign streaming + kit v8 + merge dashboard video + docs | Dual-push origin & dramaku, pantau Vercel |
| ⏸️ menunggu bahan | — | API key Playly valid (yang kemarin `invalid_key`) | Jangan deploy env dulu |
| ⏸️ tidak ikut antrian | working tree lokal | Admin VIEWER / password per admin | Jangan push kali ini |

**Selisih `dramaku/main` vs `origin/main`:** kosong setelah merge `ce30315`.

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

## Aturan isi (untuk AI)

1. Jangan masukkan secret / API key ke berkas ini.
2. Tiap kali rekan kirim "sudah commit" atau owner minta cek deploy → fetch, isi tabel, sebut 1 kalimat ke owner.
3. Sesudah deploy berhasil: pindahkan baris antrian ke "Riwayat", samakan "Commit yang sedang tayang".
4. Sesudah mengubah berkas ini, perbarui juga tanggal di `HANDOFF.md`.
