# Rencana: deploy rilis jalur terima video dari API luar

- **Tanggal:** 2026-08-15
- **Diminta client:** "rekan saya ada buat fitur baru dan sudah di simpan di repo, coba kamu pelajari dan kamu deploy"

## Ringkasan
Rekan sudah menulis dua jalur baru untuk menerima video dari API luar. Kodenya sudah ada di repo `ojokesusu/dramaku`, tapi situs produksi masih memakai repo `masradenbagus89-ui/dramaapp` yang tertinggal. Tugas ini: pelajari rilis itu, pindahkan kodenya ke repo yang dipantau Vercel, lalu deploy ke produksi.

**PRE-MORTEM:** hasilnya nol guna kalau kita mendorong working tree lokal yang kotor (pekerjaan admin/riwayat yang belum selesai) ke produksi, atau kalau Vercel tetap membangun commit lama karena push tidak sampai ke `origin/main`.

## ✅ Terverifikasi (sudah dibaca)
- Remote `dramaku` sudah ada; `origin` = `masradenbagus89-ui/dramaapp`.
- `dramaku/main` di `8880c5a`; `origin/main` masih di `954c9ca` (3 commit tertinggal).
- Commit fitur: `6bb2539` feat(video) dua jalur terima video.
- Surat serah-terima: `docs/serah-terima-deploy-2026-08-15.md` di `dramaku/main`.
- Tidak ada env wajib; fitur diam kalau setelan kosong.
- Working tree lokal kotor (kit, admin, history, untracked) — **tidak ikut di-push**.
- Vercel memantau `masradenbagus89-ui/dramaapp` (catatan serah-terima + dual-push owner).

## ❓ Asumsi
- Domain produksi masih yang sama dengan deployment 14 Agustus (akan dicek di Vercel sebelum smoke test).
- GitHub Actions merah di dramaku karena tagihan — tidak menghalangi deploy Vercel.

## Yang TIDAK dibangun
- Tidak mengisi env dashboard/penyedia (belum ada alamat asli).
- Tidak menggabungkan pekerjaan lokal yang belum di-commit.
- Tidak menyambungkan dashboard/API penyedia asli.

## Yang ikut tersenggol
| Fitur/halaman lain | Penjaga |
|---|---|
| Halaman `/discover` (8 baris baru, hanya muncul kalau env terisi) | ⚠️ smoke test setelah deploy |
| Pemutar video lama (berkas .mp4) | ✅ serah-terima: tidak disentuh; dicek smoke test #5 |
| Login, pembayaran, database | ✅ tidak diubah di commit rilis |

## Lima kepala bahasan
1. **Alur pengguna:** setelah deploy, pengunjung buka situs seperti biasa; bagian video baru tidak muncul selama env kosong.
2. **Data & siapa boleh lihat:** endpoint baru publik tapi gagal-aman (503 tanpa URL; iframe hanya domain terdaftar). Kunci API hanya di server.
3. **Kalau gagal:** `/api/videos` dan `/api/external-videos` membalas 503 + pesan setelan, bukan 500.
4. **Batas/skala:** rilis idle sampai env diisi; demo API ikut ter-deploy (data contoh, bukan data pengguna).
5. **Cara uji:** smoke test 5 butir di surat serah-terima (halaman utama, 503 dua jalur, validasi parameter, video lama).

## Tahapan
1. Pelajari commit + surat serah-terima — selesai.
2. Push `dramaku/main` ke `origin/main` tanpa mencampur working tree lokal.
3. Pantau build Vercel sampai Ready.
4. Smoke test di URL produksi.

## Langkah kerja
1. `git push origin dramaku/main:main` (hanya 3 commit rekan).
2. Pantau deployment Vercel.
3. Jalankan smoke test 1–4 via HTTP; catat hasil.
4. Rollback 1-baris: Promote deployment 14 Agustus (`954c9ca`) jika 500 atau halaman rusak.
