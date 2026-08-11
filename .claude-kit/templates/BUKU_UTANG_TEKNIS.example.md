# BUKU_UTANG_TEKNIS.md — Catatan Utang Teknis (yang sengaja ditunda → tak busuk diam-diam)

> Versi 1 · 2026-07-18 · CONTOH untuk project kamu · pendamping REFACTOR_STANDARD.md + robot `complexity-budget`.
>
> **Cara pakai:** salin berkas ini jadi `docs/BUKU_UTANG_TEKNIS.md`, hapus entri CONTOH, lalu isi tiap
> kali sebuah rapi-rapi (refactor) atau temuan **sengaja ditunda**. Atau minta AI: *"catat utang teknis
> ini"* — AI menambah entri lewat alur "AI usul → kamu setujui" di bawah.

## Untuk apa berkas ini

👨‍💻 **Programmer:** ledger utang teknis — tiap keputusan "nanti aja dulu" (refactor ditunda, temuan
`complexity-budget` yang belum dibereskan, jalan pintas sadar) dicatat + diberi label **2-sumbu** supaya
tak menumpuk tak terlihat lalu meledak. Beda dari `BUKU_PELAJARAN.md` (itu bug yang **sudah lolos**); ini
utang yang kamu **tahu** dan **pilih tunda**.

🙂 **Non-programmer:** kayak **daftar cicilan** — utang kecil yang ditunda tak apa, **asal dicatat** biar
tahu total tagihannya + kapan harus dibayar sebelum membengkak. 📱 Mirip fitur "ingatkan nanti" — tugas tak
hilang, cuma dijadwalkan.

> Target jujur: **BUKAN** "nol utang" (mustahil + kadang menunda itu benar). Tapi: utang yang ditunda
> **terlihat + terlabeli**, jadi owner bisa memutuskan kapan bayar — bukan kejutan pas sudah parah.

---

## Alur WAJIB — AI mengusulkan, KAMU (owner) menyetujui

1. **AI USULKAN** — saat AI/robot menemukan sesuatu yang layak dirapikan **tapi diputuskan ditunda**
   (mis. `complexity-budget` menandai fungsi 300 baris tapi bukan sekarang waktunya), AI menambah entri
   berstatus **USULAN** + label 2-sumbu + sumber temuan, lewat popup pilihan.
2. **KAMU MEMUTUSKAN** — tunda (kapan?) / kerjakan sekarang / abaikan (bukan utang). Status jadi **DITUNDA**
   atau langsung dikerjakan.
3. **SAAT DIKERJAKAN** — AI mengerjakan (ikut `REFACTOR_STANDARD.md`: langkah kecil + tes-asap), lalu set
   **DITERIMA** + catat commit/berkasnya.

### Yang DILARANG (sama seperti Buku Pelajaran)
- 🚨 AI menunda diam-diam tanpa mencatat (utang tak terlihat = bahaya).
- 🚨 **Skor-angka** "tingkat utang 7/10" — pakai label 2-sumbu di bawah, bukan angka (anti skor-biner §8.2-3b).
- 🚨 AI mulai pekerjaan **BERAT** dari daftar ini tanpa gate `REFACTOR_STANDARD.md` (bagian "Kapan boleh
  mulai refactor BERAT").

---

## Format entri

Tiap entri: `### UT-NNN — <judul> · <STATUS>` lalu baris-baris berlabel. Label **2-SUMBU** (WAJIB dua-duanya):

- **Keseriusan** (bahaya kalau dibiarkan): 🔴 GENTING · 🟡 PENTING · 🟢 RAPIKAN
- **Usaha** (besar kerjaannya): 🟩 RINGAN · 🟨 SEDANG · 🟥 BERAT

(Arti lengkap + contoh beda-dua-sumbu ada di `REFACTOR_STANDARD.md` bagian "Tingkat keseriusan" + "Tingkat USAHA".)

```text
### UT-NNN — <judul singkat> · <USULAN|DITUNDA|DIKERJAKAN|DITERIMA>

- **Tanggal:** YYYY-MM-DD
- **Utangnya apa:** <1-2 kalimat awam>
- **Keseriusan:** 🔴/🟡/🟢   ·   **Usaha:** 🟩/🟨/🟥
- **Sumber temuan:** <mis. complexity-budget src/besar.js:1 (fungsi-panjang 320/100), atau "audit manual">
- **Kenapa ditunda:** <alasan sadar — mis. mepet rilis, tunggu fitur X selesai>
- **Kapan ditinjau ulang:** <tanggal/patokan — mis. "setelah rilis v2", "kalau disentuh lagi">
- **Gate mulai (kalau 🟥 BERAT):** wajib penuhi REFACTOR_STANDARD.md bagian "Kapan boleh mulai refactor BERAT" sebelum mulai
- **Status:** <USULAN | DITUNDA | DIKERJAKAN | DITERIMA>
- **Disetujui owner:** <ya (tanggal) | belum>
```

| Status | Arti |
|---|---|
| **USULAN** | AI baru mengusulkan; kamu belum memutuskan. |
| **DITUNDA** | Kamu setuju ditunda; ada "kapan ditinjau ulang". |
| **DIKERJAKAN** | Sedang dibereskan (langkah kecil + tes-asap). |
| **DITERIMA** | Selesai + gerbang pra-rilis lulus; catat commit/berkas. |

---

## Catatan (ledger)

> Hapus entri CONTOH saat mulai mengisi yang asli.

### UT-001 — (CONTOH) Fungsi hitung-ongkir 320 baris · DITUNDA

- **Tanggal:** 2026-01-20
- **Utangnya apa:** Satu fungsi mengurus ongkir + diskon + pajak sekaligus (320 baris) → susah dites + gampang salah saat diubah.
- **Keseriusan:** 🟡 PENTING · **Usaha:** 🟨 SEDANG
- **Sumber temuan:** complexity-budget src/checkout/ongkir.js:12 (fungsi-panjang 320/100)
- **Kenapa ditunda:** Mepet rilis promo; belum ada tes ongkir (refactor tanpa tes = judi).
- **Kapan ditinjau ulang:** Setelah rilis promo + setelah tes ongkir dibuat.
- **Status:** DITUNDA
- **Disetujui owner:** ya (2026-01-20)

---

## Terkait
- Standar + gate refactor: `docs/REFACTOR_STANDARD.md` (bagian "Kapan boleh mulai refactor BERAT" = syarat mulai kerja BERAT).
- Robot penanda otomatis: `npx lintasai complexity-budget`.
- Gerbang pra-rilis: `npx lintasai preflight` (jalankan sebelum bilang "selesai").
