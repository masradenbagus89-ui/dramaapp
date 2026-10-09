# Rencana — tangani webhook `video.deleted` dari Playly

> 2026-10-09 · bobot SEDANG · pemicu: pesan tim Playly/DramaKu ke owner
> Keputusan owner (popup 2026-10-09): **bedakan label** "dihapus kreator" dari "ditarik Playly".

## Duduk perkara

Playly akan menyalakan jenis notifikasi baru `video.deleted` — dikirim untuk video yang
PERNAH kita terima lewat `video.published`, lalu dihapus kreatornya / dijadikan privat-draf /
sematannya dimatikan / diturunkan admin. Bentuk kirimannya:

```json
{ "event": "video.deleted", "site": "dramaku", "video": { "id": 1787642113102 } }
```

Tanda tangan & header sama persis dengan `video.published` — tak ada kunci/env baru.

## Laporan kondisi nyata (terverifikasi)

| Permintaan Playly | Keadaan | Bukti |
|---|---|---|
| 1. Penerima MEMBACA kolom `event` | ✅ sudah | `lib/playly-webhook.ts:458-462` |
| 2. `video.deleted` → sembunyikan film itu | ❌ belum | event asing cuma masuk jalur `abaikan` |
| 3. Balas 2xx untuk id tak dikenal | ✅ sudah | `route.ts:129`, `route.ts:143-155` |

✅ Penyimpanan webhook = dokumen JSON (`sbDocSet`, `lib/store.ts:1434-1442`), BUKAN tabel
berkolom ketat → menambah nilai status baru **tidak butuh migrasi SQL**.
✅ Semua jalur penonton menyaring daftar-putih `status === "published"` (`lib/store.ts:1378`,
`lib/playly-gabungan.ts:188`) → status baru otomatis tak tampil, nol halaman penonton disentuh.
✅ Daftar mentah `getPlaylyWebhookVideos()` cuma dipakai panel admin + `scripts/impor-link-unduhan.ts`.
❓ Field `site: "dramaku"` SENGAJA tidak diperiksa — nilainya belum terverifikasi dari kiriman
nyata, dan memeriksanya dengan tebakan justru berisiko menolak semua kiriman sah.

## Pre-mortem

*Semua dikerjakan tapi nol guna* → penyebab paling mungkin: ada jalur tampilan lain yang memakai
daftar mentah tanpa menyaring status. **Sudah dicek: tidak ada** (lihat dua baris ✅ di atas).

## Langkah

1. `lib/store.ts` — tipe `status` + `"deleted"`; `bolehTampil` TIDAK diubah (daftar-putih sudah benar).
2. `lib/playly-webhook.ts` — `PlaylyWebhookEvent` + `"video.deleted"`; penjaga event mengizinkannya;
   masuk jalur early-return "cukup id saja" bersama `video.unpublished`.
3. `app/api/webhooks/playly/route.ts` — satu cabang menangani kedua event penarikan, status dipetakan.
4. `lib/playly-webhook-status.ts` — `jumlahDitarik` menghitung semua yang bukan `published`,
   supaya angka ringkasan tidak kehilangan film terhapus.
5. `app/components/admin/PlaylyWebhookMonitor.tsx` — label per-video: "ditarik Playly" vs "dihapus kreator".
6. Tes regresi di `tests/playly-webhook.test.ts` + `tests/playly-webhook-route.test.ts`.

## Yang TIDAK dibangun

- Anti-replay by `event_id` — utang teknis lama yang sudah tercatat jujur di `lib/playly-webhook.ts`.
  Tidak diperburuk: menyembunyikan video itu idempoten (diulang 10× hasilnya sama).
- Pemeriksaan field `site` (lihat ❓ di atas).
- Penghapusan baris dari database. Barisnya DISIMPAN, cuma statusnya berubah — supaya kalau Playly
  menerbitkannya lagi, catatannya tidak hilang (alasan yang sama sudah ditulis di `lib/store.ts:1367-1371`).

## Yang ikut tersenggol

- **Halaman Video Playly & beranda** — memakai `getPublishedPlaylyWebhookVideos*`. Penjaganya ADA
  (daftar-putih `=== "published"`), jadi aman tanpa diubah. Dibuktikan ulang lewat `npm test`.
- **Panel admin "Video yang dikirim Playly"** — sengaja diubah (label baru), itu isi permintaan owner.
- **`scripts/impor-link-unduhan.ts`** — membaca daftar mentah; tak terpengaruh, ia memakai videoId bukan status.

## Dua versi

👨‍🎓 **Junior-backend:** event baru di-whitelist pada parser, dipetakan ke status domain `deleted`,
dan karena jalur baca penonton memakai filter daftar-putih, tak ada perubahan di sisi tampilan.
Idempotensi terjaga karena operasinya `set status`, bukan increment/append.

🙂 **Non-teknis:** kalau kreator di Playly menghapus filmnya, situsmu ikut menurunkan film itu
sendiri dalam waktu sekitar satu menit, dan di panel admin tertulis "dihapus kreator" supaya kamu
bisa membedakannya dari film yang cuma ditarik sementara.
