# 2026-10-05 — Link unduhan Playly per provider × kualitas

Tangga: **BERAT** (skema data baru + webhook publik + fitur baru, ≥3 subsistem).
Branch: `feat/link-unduhan-provider-kualitas` (dari `dramaapp/main` d02700b, BUKAN dari
`feat/playly-modal-unduhan` yang tertinggal 42 commit).

## Keputusan owner (popup 2026-10-05)

| Pertanyaan | Jawaban |
|---|---|
| Cakupan "video" | **Playly saja** — drama (`/drama/[id]`, dokumen `unduhan`) TIDAK disentuh |
| Pencocokan baris CSV | **ID dulu, lalu judul persis** (tanpa beda huruf besar-kecil); judul ganda = dilewati |
| Data lama yang tak lolos aturan baru | **Ketat untuk semua** — tak lolos = tak tampil |
| Popup | **Satu komponen** (`ModalProviderPlayly`) untuk semua tombol DOWNLOAD Playly |

## Kondisi nyata (diverifikasi)

- ✅ Validasi link unduhan LAMA = http **atau** https, TANPA daftar domain (`lib/types.ts` `isHttpUrl`).
  Premis "validasi yang ada sudah https + whitelist" keliru — itu aturan alamat PEMUTAR.
- ✅ DDL masih tertutup (`HANDOFF.md:112`) → tabel baru belum bisa dibuat. Data disimpan di
  dokumen `app_data` key **`playly:link-unduhan`** berbentuk BARIS (videoId, provider, quality,
  url, createdAt, updatedAt). SQL tabel asli disiapkan sebagai jalur naik kelas.
- ✅ Produksi `/film` (dulu `/playly`) memuat NOL `downloadProviders` (dicek 2026-10-05) → dokumen
  lama `playly:unduhan` praktis kosong; tak ada link tayang yang hilang karena aturan ketat.
- ✅ `/tonton/[id]` TIDAK mengoper provider ke `InfoVideoPlayly` → tombol DOWNLOAD di halaman
  detail tak pernah bisa membuka link. Ikut diperbaiki.
- ❓ Domain provider **Cast** tidak diketahui → bawaan KOSONG (link Cast ditolak) sampai owner
  mengisi `PLAYLY_UNDUHAN_DOMAIN_CAST`.

## Pre-mortem

Hasil nol guna kalau: owner mengimpor CSV lalu SEMUA baris ditolak karena domain link aslinya
beda dari tebakan bawaan (mis. Google memberi `drive.usercontent.google.com`, Mega memberi
`mega.io`). → Laporan impor menyebut ALASAN per baris + domain yang ditolak, dan daftar domain
bisa ditambah lewat env tanpa ubah kode.

## Tahapan (commit per langkah)

1. Model + validasi domain + penyimpanan baris (lib, store, SQL naik kelas, `.env.example`, tes)
2. Webhook menerima `downloads` opsional (payload lama tetap jalan, tanda-tangan tetap wajib)
3. Skrip impor CSV/JSON + `--dry-run` + contoh CSV
4. Popup tabel provider × tombol per kualitas + pasang di `/film` & `/tonton/[id]`
5. Panel admin: isian 4 provider × 2 kualitas per video
6. Catatan (HANDOFF, INDEX)

## Yang TIDAK dibangun

- Jalur drama (dokumen `unduhan`, `DownloadModal`) — di luar cakupan.
- Anti-replay webhook (event_id) — batas lama yang sudah tercatat di `lib/playly-webhook.ts`;
  kiriman ulang link unduhan idempoten (kunci unik), jadi replay tak menggandakan apa pun.
- Catatan/tutorial/warna tombol per provider (fitur lama `note`/`buttonColor`) — tidak ada di
  bentuk data baru yang diminta.

## Yang ikut tersenggol

- `/film`, `/discover` (baris Playly), `/tonton/[id]`: popup & data provider berubah bentuk.
- Panel admin `/admin/videos/playly`: isian provider diganti bentuk baru.
- `lib/types.ts` `parseDownloadProviders`: opsi `kualitasOpsional` dilepas (hanya dipakai Playly);
  jalur drama tetap — dijaga `tests/unduhan.test.ts` & `tests/download-modal-render.test.ts`.
