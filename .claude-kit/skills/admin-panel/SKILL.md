---
nama: admin-panel
deskripsi: Panel admin/back-office kelas-industri — otorisasi per-baris & per-aksi (anti-IDOR admin), audit-trail tiap aksi, paginasi keyset, konfirmasi destruktif, data sensitif di-masking, 2FA admin.
divisi: backend
pemicu: [admin-panel, panel-admin, dashboard-admin, backoffice, back-office, cms, kelola-data, manajemen-data, tabel-transaksi, daftar-transaksi, data-table, datatable]
rawan_keamanan: true
menggantikan: []
---

# Skill: Admin Panel / Back-Office (halaman kelola data) — kelas industri

> **Kapan skill ini aktif:** prompt menyentuh "panel admin / back-office / CMS / dashboard kelola / daftar transaksi / tabel data yang bisa diedit / kelola user / approve-tolak / suspend akun". Dispatcher `rak-pemicu` menyalakannya otomatis.
>
> 🙂 **Analogi:** admin panel = **ruang kontrol dengan buku tamu**. Dari sini staf bisa melihat & mengubah banyak hal (saldo, akun, transaksi) — maka DUA hal wajib: **(1)** tiap pintu terkunci sesuai jabatan (kasir tak bisa buka brankas direktur), **(2)** tiap tindakan tercatat di buku tamu (siapa, kapan, ubah apa) — supaya kalau ada yang salah/curang, ketahuan.

Skill ini **advisory** (§4.17): otak native memutuskan adopsi/adaptasi/abaikan tiap 📐/💡. Butir **🔒 HASIL** = jaminan yang tak boleh gagal. Panel admin = **permukaan serang bernilai tinggi** (akses banyak data + aksi berbahaya) → keamanan digali dalam (§4.17). Cek dokumentasi framework tabel/query **versi terpasang** (§8.2 A3).

---

## 1. Kontrak (yang HARUS benar — tulis DULU)

- 🔒 **HASIL:**
  - **Input:** identitas admin (sesi terverifikasi server-side) + peran/scope-nya + aksi (lihat/ubah/hapus/approve) + target (baris/koleksi + filter).
  - **Output:** admin **hanya** melihat/mengubah data yang **peran + scope**-nya izinkan; hasil dipaginasi stabil.
  - **Aksi berhasil → tercatat** di audit-trail (siapa/apa/kapan/nilai-lama→baru). Aksi gagal-otorisasi → 403 + tercatat.
  - **Error:** aksi destruktif butuh konfirmasi; bentrok edit (2 admin) tak boleh saling menimpa diam-diam (optimistic concurrency).

---

## 2. Cara rakit (prinsip — 📐 CARA BAKU, boleh diganti cara lain yang capai HASIL sama)

1. 🔒 **HASIL — Otorisasi per-AKSI dan per-BARIS di SERVER, pakai identitas server-side (bukan "dia kan admin").** "Admin" bukan satu tingkat: cek **peran + scope** tiap aksi (admin cabang X tak boleh sentuh data cabang Y; support boleh lihat, tak boleh refund). Jangan sembunyikan tombol di UI lalu percaya itu cukup — endpoint tetap harus menolak (UI ≠ pagar). **IDOR admin** (ganti `?id=` → data orang lain) = kelas bug paling sering di panel → otorisasi per-resource, rujuk `skills/auth/SKILL.md` · `skills/backend/SKILL.md`.
2. 🔒 **HASIL — Audit-trail tiap aksi yang mengubah/mengakses data sensitif** (who/what/when/from-where + nilai lama→baru), **append-only** (cuma bisa ditambah, tak bisa diubah/hapus). Wajib untuk produk teregulasi (judi/fintech) + investigasi insiden. Tulis audit di transaksi yang sama dengan perubahannya (jangan sampai data berubah tapi log gagal).
3. 🔒 **HASIL — Data sensitif di-MASKING + akses berbasis-kebutuhan.** PII/no-rekening/KYC ditampilkan tersamar (`•••• 1234`) secara default; buka-penuh = aksi ter-audit tersendiri. Jangan kirim kolom sensitif ke frontend kalau tak ditampilkan (bocor via network tab). Terkait `skills/supabase-prisma/SKILL.md` (anti bocor kolom).
4. 📐 **Paginasi keyset (cursor), bukan `OFFSET` besar.** `OFFSET 100000` makin lambat + **geser/duplikat baris** saat data berubah di tengah paging. Pakai keyset (`WHERE id < :cursor ORDER BY id DESC LIMIT n`). Filter/sort/search **di server** (jangan tarik semua ke browser) + **index** kolom yang di-filter/sort (anti lambat + N+1) → `skills/database/SKILL.md`.
5. 📐 **Aksi destruktif & massal = konfirmasi + idempoten + reversibel.** Hapus/suspend/refund → konfirmasi menyebut **nama/jumlah** ("Suspend 12 akun?"), utamakan **soft-delete** (tandai, jangan hapus fisik), bulk action **idempoten** (klik 2× tak dobel) + ter-audit per-item. Aksi keuangan (refund/adjust saldo) → lewat `skills/pembayaran/SKILL.md` (idempoten) / buku-besar.
6. 📐 **Optimistic concurrency (anti timpa-diam):** dua admin buka baris sama → sertakan `version`/`updated_at` saat simpan; kalau berubah sejak dibaca → tolak + tampilkan "data sudah diubah admin lain, muat ulang". Last-write-wins diam = perubahan hilang tanpa jejak.
7. 📐 **Validasi server-side + 4 state UI + guard.** Jangan percaya form admin (validasi di boundary). Tabel punya state loading/empty/error/success (§1b); ekspor → `skills/ekspor-laporan/SKILL.md` (anti CSV-injection, ekspor besar via latar `skills/background-job/SKILL.md`). Rate-limit aksi sensitif → `skills/rate-limiting/SKILL.md`.
8. 🔒 **HASIL — Akun admin dikeraskan:** **2FA wajib**, sesi lebih pendek/timeout ketat, peran **least-privilege** (default deny; beri seminimal mungkin), IP-allowlist bila memungkinkan. Akun admin bocor = seluruh data bocor → `skills/auth/SKILL.md` · `skills/owasp/SKILL.md`.

---

## 3. Powerful — pola siap-adaptasi

🧪 **CONTOH KASUS (ambil polanya, jangan salin mentah):** list ter-otorisasi + keyset + audit dalam satu transaksi:

```txt
listTransaksi(admin, filter, cursor):                  // di SERVER
  scope = scopeUntuk(admin)                             // 1) batasi ke data yang boleh (cabang/tenant)
  rows = query(
    where: { ...filter, ...scope, id < cursor },        //    filter+scope di server, index-kan kolomnya
    orderBy: id desc, limit: PAGE+1 )                    // 2) keyset (bukan OFFSET), ambil n+1 utk "ada lagi?"
  return { rows: rows[0..PAGE], nextCursor: rows[PAGE]?.id, adaLagi: rows.length > PAGE }

suspendAkun(admin, akunId):
  requireAksi(admin, 'akun.suspend', akunId)             // 3) otorisasi per-aksi+baris (lempar 403 kalau tidak)
  tx:                                                     // 4) ubah + audit ATOMIK (satu transaksi)
     old = ambil(akunId); update(akunId, status='suspended')
     auditLog.append({ who: admin.id, what: 'akun.suspend', ref: akunId,
                       before: old.status, after: 'suspended', at: now, ip: admin.ip })
```
- 📐 CARA BAKU: bungkus perubahan + audit dalam **satu transaksi** — kalau audit gagal, perubahan ikut batal (jangan ada aksi tanpa jejak).
- 💡 SARAN: pakai admin-framework matang (React-Admin, Refine, Django Admin, Filament) yang sudah bawa tabel/paginasi/CRUD — tapi **otorisasi per-baris + audit tetap tanggung jawabmu**, jangan anggap gratis. Cek fitur **versi terpasang**.

---

## 4. Self-verify (sangkal diri sebelum "selesai" — §8.2 Aturan 3)

- [ ] Tiap endpoint admin **cek peran + scope** (uji: admin low-privilege / cabang-lain coba akses → 403), bukan sekadar "sudah login sebagai admin"?
- [ ] **IDOR**: ganti id di request → data orang/tenant lain **ditolak** (bukan tampil)?
- [ ] **Audit-trail** append-only mencatat aksi ubah/akses-sensitif (who/what/when/before→after), ditulis se-transaksi dengan perubahan?
- [ ] Data sensitif **di-masking** + kolom tak-ditampilkan tak dikirim ke frontend?
- [ ] Paginasi **keyset** (bukan OFFSET besar); filter/sort di server + kolomnya ter-index?
- [ ] Aksi destruktif/massal: **konfirmasi (nama/jumlah) + soft-delete + idempoten + ter-audit**?
- [ ] **Optimistic concurrency** (dua admin tak saling timpa diam)?
- [ ] Akun admin: **2FA + least-privilege + timeout ketat**?

---

## 5. Definition-of-Done

- [ ] **Kontrak (§1) ditulis** (identitas/scope/aksi/output/audit/error).
- [ ] Otorisasi per-aksi+baris + audit-trail append-only + masking + keyset paginasi + konfirmasi destruktif + optimistic concurrency + 2FA admin terpasang.
- [ ] **Edge case** diuji: admin scope-lain (403), IDOR id, bulk action idempoten, dua admin edit bentrok, ekspor besar, kolom sensitif tak bocor.
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris`.
- [ ] Observability: audit-trail bisa ditelusuri + alert aksi sensitif tak-wajar (mis. bulk-suspend, buka-massal PII).
- [ ] build + lint + test lulus; min 1 test happy-path (list ter-scope) + 1 test otorisasi (aksi ditolak untuk peran salah) + 1 test audit (aksi tercatat).

---

## 6. Handoff / rujuk-silang (reuse-first — jangan salin)

- 🔒 Otorisasi per-resource + RBAC + 2FA admin → `skills/auth/SKILL.md` · `skills/backend/SKILL.md`; header/CVE/hardening → `skills/owasp/SKILL.md`.
- 📐 Keyset paginasi + index + anti bocor kolom + RLS → `skills/database/SKILL.md` · `skills/supabase-prisma/SKILL.md`.
- 📐 Ekspor tabel (anti CSV-injection, otorisasi per-baris, ekspor besar via latar) → `skills/ekspor-laporan/SKILL.md` · `skills/background-job/SKILL.md`; aksi keuangan idempoten → `skills/pembayaran/SKILL.md`; rate-limit aksi sensitif → `skills/rate-limiting/SKILL.md`.
- 🗃️ LATAR — kepatuhan (audit + akses teregulasi judi/fintech) → `skills/kepatuhan-teregulasi/SKILL.md`; 4 state UI + tabel besar (virtualisasi) → `skills/uiux/SKILL.md` · `skills/webdesign/SKILL.md`. Alert audit → `templates/PRODUCTION_OBSERVABILITY.md`.

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** SEMUA data (user, transaksi, saldo, PII) + aksi berbahaya (suspend/refund/ubah-saldo) + akun admin bernilai tinggi. **Mode-gagal:** IDOR/otorisasi lemah (admin low-privilege akses semua), akun admin dibajak (tanpa 2FA), aksi tanpa jejak (audit lupa/bisa dihapus), bocor kolom sensitif, bulk-action dobel/salah, timpa-diam antar-admin, ekspor bocor/CSV-injection. **Mitigasi:** otorisasi per-aksi+baris + audit append-only se-transaksi + masking + 2FA/least-privilege + konfirmasi destruktif + idempoten + optimistic concurrency (§2).
- 🗃️ **LATAR — Batas jujur:** panel admin menaikkan lantai keamanan operasional, **bukan** pengganti kontrol internal (pemisahan tugas, maker-checker untuk aksi berisiko tinggi, review berkala hak akses). Untuk fintech/judi teregulasi, audit-trail + akses = kewajiban hukum, bukan opsional — libatkan tim kepatuhan. Cek fitur otorisasi/audit **framework versi terpasang** sebelum mengandalkannya.
