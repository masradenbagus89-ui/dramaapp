# INDEX.md — Ingatan Project (tiap bug yang lolos → jadi pengaman tetap)

> Versi 2 · CONTOH untuk project kamu · LAPIS 3 pertahanan anti-bug-berulang lintasAI.
>
> **Cara pakai:** salin berkas ini jadi `docs/lintasai/INDEX.md`, hapus entri CONTOH di bawah,
> lalu isi tiap kali ada bug yang lolos. Atau cukup minta AI: *"catat pelajaran ini di Buku Pelajaran"* —
> AI akan menambah entri lewat alur "AI usul → kamu setujui" di bawah.
>
> **Kenapa `docs/lintasai/INDEX.md` dan bukan tempat lain:** berkas itulah yang dibaca AI otomatis tiap
> sesi (kernel §4.1 "INGATAN PROJECT"). Ditaruh di tempat lain = ditulis tapi tak pernah dibuka lagi.
> Folder `docs/lintasai/` milik PROJECT kamu — tak pernah ditimpa atau dihapus saat kit di-update.
> Rencana kerja yang panjang tinggal di `docs/lintasai/rencana/`; di sini cukup 1 baris penunjuknya.

## Untuk apa berkas ini

👨‍💻 **Programmer:** ledger pelajaran — tiap bug yang lolos (ketahuan terlambat) dicatat lalu **diubah jadi
penjaga permanen**: tes regresi / langkah `preflight` / aturan, supaya kelas-bug yang sama otomatis
ketahuan kalau muncul lagi. Yang "mengingat" = mesin (penjaga otomatis), bukan ingatan orang.

🙂 **Non-programmer:** tiap bug yang lolos dicatat lalu diubah jadi **penjaga otomatis permanen**
(tes/aturan/preflight), supaya kelas kesalahan yang sama tak terulang. Yang "mengingat" = mesin, bukan
ingatan orang — jadi makin lama makin sedikit bug lama yang kambuh.

> Target jujur: **BUKAN** "nol bug selamanya" (mustahil). Tapi: bug yang **pernah** terjadi → **tak
> terulang** (sudah ada penjaganya), dan ketahuan **lebih awal + lebih murah**.

---

## Alur WAJIB — AI mengusulkan, KAMU (owner) menyetujui, baru AI memasang

Ini aturan inti (selaras standar kit — rujuk skills/perbaiki-error + skills/cakupan-tes):

1. **AI USULKAN** — saat sebuah bug ketahuan terlambat (atau AI menemukan kelas-bug yang belum ada
   penjaganya), AI menambah entri di sini berstatus **USULAN** + mengusulkan **pengaman konkret** (tes /
   langkah pemeriksa / aturan + nama berkasnya), lewat popup pilihan.
2. **KAMU MENYETUJUI** — kamu putuskan ya / tidak / ubah. Status jadi **DISETUJUI**.
3. **AI PASANG pengaman** — AI menulis tes/pemeriksa/aturan itu, **menjalankannya sampai terbukti
   lewat** (pakai perintah tes project ini sendiri, mis. `npm test`), lalu set status **TERPASANG** +
   isi baris **Penjaga (berkas)** dengan nama berkas pengaman yang **nyata ada**.

### Yang DILARANG (pembeda "catatan aman" vs "AI belajar diam-diam yang berbahaya")

- 🚨 AI mengubah aturan/perilakunya sendiri **tanpa persetujuan kamu** (belajar + ubah diri diam-diam).
  Buku ini "auto-TAWARKAN, manual-SETUJUI" — bukan AI yang berevolusi sendiri.
- 🚨 Skor-keyakinan ber-angka / "naluri" AI yang diam-diam menyetir keputusan.
- 🚨 Apa pun yang membuat kamu **tak bisa melihat** "AI lagi belajar apa". Semua pelajaran terlihat di
  berkas ini sebagai teks biasa.

---

## Format entri (supaya AI sesi berikutnya bisa memindainya cepat)

Tiap entri diawali heading `### LP-NNN — <judul> · <STATUS>` lalu baris-baris berlabel. (Ganti `NNN`
dengan nomor urut: `LP-001`, `LP-002`, dst.)

```text
### LP-NNN — <judul singkat> · <USULAN|DISETUJUI|TERPASANG>

- **Tanggal:** YYYY-MM-DD
- **Apa yang bobol:** <1-2 kalimat, bahasa awam>
- **Kenapa lolos (pengaman yang absen):** <kelas-bug ini dulu tak ada yang menjaga karena ...>
- **Penjaga (berkas):** `path/berkas-penjaga`   (WAJIB diisi saat TERPASANG)
- **Jenis penjaga:** <tes regresi | langkah preflight | aturan | robot kecocokan>
- **Status:** <USULAN | DISETUJUI | TERPASANG>
- **Disetujui owner:** <ya (tanggal) | belum>
```

| Status | Arti |
|---|---|
| **USULAN** | AI baru mengusulkan; kamu belum memutuskan. Belum wajib ada penjaga. |
| **DISETUJUI** | Kamu setuju; AI sedang/akan memasang penjaga. |
| **TERPASANG** | Pengaman tetap sudah ada + gerbang pra-rilis lulus. WAJIB isi baris **Penjaga (berkas)**. |

---

## Catatan (ledger)

> Hapus entri CONTOH di bawah saat kamu mulai mengisi yang asli.

### LP-001 — (CONTOH) Harga di halaman keranjang beda dengan harga di struk · USULAN

- **Tanggal:** 2026-01-15
- **Apa yang bobol:** Diskon dihitung 2 tempat (halaman keranjang & saat bayar) dengan rumus beda → total di struk tak sama dengan yang dilihat pembeli.
- **Kenapa lolos (pengaman yang absen):** Tak ada tes yang membandingkan "total keranjang" vs "total struk" untuk pesanan yang sama. Cuma dicek manual sesekali.
- **Penjaga (berkas):** _(diisi saat sudah TERPASANG, mis. `tests/checkout-total.test.js`)_
- **Jenis penjaga:** tes regresi
- **Status:** USULAN
- **Disetujui owner:** belum

---

## Terkait

- Gerbang "selesai = terbukti": jalankan perintah tes/build project ini sendiri sebelum menyatakan
  selesai — jangan mengklaim dari kode yang cuma ditulis (§2.3).
- Pencegah drift "ubah A lupa B": `Grep` tiap fakta berulang (versi, nilai env, harga) di seluruh project sebelum ubah salah satu.
- Aturan alur lengkap: rujuk skills/perbaiki-error + skills/cakupan-tes (gerbang "selesai=terbukti" §4.6).
