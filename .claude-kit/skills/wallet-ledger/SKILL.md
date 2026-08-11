---
nama: wallet-ledger
deskripsi: Buku besar saldo internal (wallet/ledger) kelas-industri untuk judi/fintech — double-entry append-only, saldo = turunan bukti (bukan kolom bebas-edit), atomik + anti saldo-minus + anti-race + idempoten, alur penarikan ber-state + rekonsiliasi.
divisi: keamanan
pemicu: [wallet, dompet-digital, saldo, ledger, buku-besar, double-entry, mutasi-saldo, top-up, deposit, penarikan, withdraw, withdrawal, payout, tarik-dana, rekonsiliasi]
rawan_keamanan: true
menggantikan: []
---

# Skill: Wallet / Buku Besar Saldo Internal (ledger) — kelas industri

> **Kapan skill ini aktif:** prompt menyentuh "saldo user / dompet / top-up / deposit / tarik-dana / mutasi saldo / buku besar / menang-kalah mengubah saldo / rekonsiliasi". Dispatcher `rak-pemicu` menyalakannya otomatis.
>
> 🙂 **Analogi:** ledger = **buku kas warung dengan pembukuan berpasangan**. Tiap uang pindah dicatat **dua sisi** (dari kantong mana → ke kantong mana) dan **tak pernah dihapus** — kalau salah, dibuat catatan pembalik, bukan di-tip-ex. Saldo = **hasil hitung seluruh catatan**, bukan angka yang diingat-ingat lalu ditimpa. Kalau saldo cuma "angka di satu kolom yang di-edit", satu bug/serangan = uang hilang atau tercipta dari udara.
>
> **Pembagian dengan skill lain:** `skills/pembayaran/SKILL.md` mengurus **uang EKSTERNAL** (checkout, webhook gateway masuk/keluar). Skill INI mengurus **saldo INTERNAL** (buku besar user). Deposit = pembayaran-terkonfirmasi → kredit ledger; penarikan = debit ledger → payout via gateway.

Skill ini **advisory** (§4.17) TAPI ranahnya uang → butir 🔒 di sini padat & tak bisa ditawar; keamanan + integritas data digali DALAM. Cek dokumentasi DB **versi terpasang** (§8.2 A3) — semantik `FOR UPDATE`/isolation level/constraint beda antar-engine. ⚖️ Untuk fintech/judi teregulasi ada kewajiban hukum → `skills/kepatuhan-teregulasi/SKILL.md`; skill ini menaikkan lantai integritas, **bukan** pengganti core-banking/akuntansi bersertifikat.

---

## 1. Kontrak (yang HARUS benar — tulis DULU)

- 🔒 **HASIL:**
  - **Input:** operasi bernilai (deposit/tarik/taruhan/menang/bonus/koreksi) + **idempotency-key** unik + jumlah (satuan terkecil, integer) + mata uang.
  - **Output:** ≥2 entri buku besar **seimbang** (Σ debit = Σ kredit) + saldo akun terpengaruh ter-update **dalam transaksi yang sama**; entri **tak pernah** di-UPDATE/DELETE (append-only).
  - **Invarian:** saldo akun user **tak pernah < 0** (kecuali akun yang sengaja boleh, mis. house); **Σ seluruh entri = 0** setiap saat (buku selalu balance).
  - **Idempoten:** operasi sama dijalankan 2× (retry/duplikat) → efek **tepat sekali**.
  - **Error:** dana tak cukup → tolak SEBELUM mencatat; kegagalan di tengah → **seluruh transaksi batal** (tak ada saldo setengah-jadi).

---

## 2. Cara rakit (prinsip — 📐 CARA BAKU, boleh diganti cara lain yang capai HASIL sama)

1. 🔒 **HASIL — Double-entry append-only; saldo = TURUNAN, bukan kolom bebas-edit.** Tiap gerakan uang = insert entri (mis. debit `wallet:user42`, kredit `house`) yang **jumlahnya seimbang**. Entri **tak pernah** di-`UPDATE`/`DELETE` — koreksi = entri **pembalik** baru (reversal). Saldo dihitung dari entri; boleh disimpan sebagai **saldo-materialized** yang di-update **atomik bersama insert** (bukan `UPDATE balance = angka-baru` sembarang). Ini memberi jejak sempurna + tak bisa "uang tercipta/hilang" tanpa catatan.
2. 🔒 **HASIL — Atomik (satu transaksi DB).** Insert entri + update saldo **dalam satu transaksi** — semua berhasil atau semua batal. Jangan pernah "kurangi saldo dulu, catat nanti" (crash di tengah = uang hilang). Efek eksternal (kirim ke bank) **JANGAN** di dalam transaksi DB (lihat poin 5).
3. 🔒 **HASIL — Anti saldo-minus + anti-race (dua transaksi berebut saldo).** Dua penarikan bersamaan bisa menguras saldo dua kali. Cegah dengan SALAH SATU:
   - **Kunci baris** akun sebelum baca-ubah: `SELECT ... FOR UPDATE` → cek cukup → tulis.
   - **Update bersyarat atomik:** `UPDATE akun SET saldo = saldo - :x WHERE id=:a AND saldo >= :x` lalu **cek baris terpengaruh = 1** (0 = dana tak cukup / kalah balapan → batalkan).
   - Tambah **constraint DB** `CHECK (saldo >= 0)` sebagai jaring terakhir (→ `skills/database/SKILL.md`) — **HANYA di akun yang tak boleh minus (wallet user); JANGAN pasang ke akun house/suspense** yang memang boleh negatif (§1), kalau salah-pasang → sisi kredit house gagal (transaksi error, fail-safe, bukan uang hilang). Jangan cuma cek saldo di aplikasi (race lolos).
4. 🔒 **HASIL — Idempoten via idempotency-key (`UNIQUE`).** Tiap operasi bawa kunci unik (mis. `deposit:<gateway_ref>`, `bet:<round_id>`); insert entri ber-`UNIQUE(idempotency_key)` → duplikat ditolak DB (bukan dobel-kredit). Webhook deposit/retry aman → selaras `skills/pembayaran/SKILL.md` (verifikasi webhook + dedup) & `skills/background-job/SKILL.md` (retry).
5. 🔒 **HASIL — Penarikan (payout) = state-machine + HOLD, beda dari deposit.** Deposit satu-langkah (kredit setelah pembayaran terkonfirmasi). Penarikan **banyak-langkah + berisiko dobel-kirim**: `requested → direserve (dana di-hold, saldo turun tapi belum keluar) → review/approval (AML/limit → `skills/kepatuhan-teregulasi/SKILL.md`) → dikirim ke bank/gateway → completed / failed(reversal)`. **Hold** mencegah user membelanjakan saldo yang sedang ditarik (double-spend). Kirim-ke-bank **idempoten** (idempotency-key ke gateway) + tahan-gagal (`skills/tahan-gagal/SKILL.md`) — gagal-kirim → entri pembalik, dana kembali.
6. 🔒 **HASIL — Uang = integer satuan terkecil (sen) atau DECIMAL/NUMERIC, JANGAN float.** `0.1 + 0.2 ≠ 0.3` di float → selisih uang. Satu mata uang per entri; konversi antar-mata-uang = operasi eksplisit tercatat (jangan campur diam-diam).
7. 📐 **Pisahkan akun secara jelas:** wallet-user, house/platform, suspense-gateway (dana transit), bonus (aturan wagering terpisah dari saldo riil — jangan campur real vs bonus). Tiap gerakan = antar dua akun; ini yang membuat "Σ=0" terjaga.
8. 📐 **Rekonsiliasi berkala:** (a) **trial balance** internal — Σ semua entri = 0 (kalau tidak, ada bug, hentikan + selidiki); (b) cocokkan saldo internal vs mutasi **gateway/bank** → deteksi selisih dini. Jalankan terjadwal (`skills/background-job/SKILL.md`) + alert saat tak balance.

---

## 3. Powerful — pola siap-adaptasi

🧪 **CONTOH KASUS (ambil polanya, jangan salin mentah):** debit aman = idempoten + anti-minus + double-entry, semua dalam satu transaksi:

```sql
-- Debit wallet user (mis. taruhan/penarikan). Semua dalam SATU transaksi.
BEGIN;
  -- 1) Idempoten: kunci unik operasi; duplikat -> UNIQUE violation -> transaksi batal (jangan dobel).
  INSERT INTO ledger_op (idem_key) VALUES ('bet:round123:user42');   -- UNIQUE(idem_key)

  -- 2+3) Debit BERSYARAT + double-entry TERIKAT dalam satu pernyataan (CTE): entri HANYA tercipta
  --       kalau saldo cukup. `upd` menghasilkan 1 baris jika UPDATE mengenai baris (saldo>=5000);
  --       kalau 0 baris (dana kurang / kalah race) -> INSERT 0 entri -> TAK ada "entri hantu"
  --       (house terkredit tanpa user terdebit). Keterikatan DIPAKSA SQL, bukan cuma cek aplikasi.
  WITH upd AS (
    UPDATE akun SET saldo = saldo - 5000
     WHERE id = 'wallet:user42' AND saldo >= 5000
     RETURNING id
  )
  INSERT INTO ledger_entry (op_key, akun, delta)
    SELECT 'bet:round123:user42', 'wallet:user42', -5000 FROM upd
    UNION ALL
    SELECT 'bet:round123:user42', 'house',         +5000 FROM upd;   -- Σ delta = 0; 0 baris kalau dana kurang
  -- Aplikasi: entri ter-insert = 0 -> saldo tak cukup -> tangani sesuai kebijakan (tolak/rollback).
COMMIT;
```
- 📐 CARA BAKU: constraint DB `CHECK (saldo >= 0)` (hanya di akun user, BUKAN house/suspense — §2 poin 3) + `UNIQUE(idem_key)` = jaring terakhir kalau logika aplikasi meleset. **Ikat entri ke debit di SQL** (CTE di atas) supaya "entri hantu" tak mungkin walau contoh disalin sebagian — jangan andalkan cek rowcount di aplikasi saja; untuk penegakan lebih keras pakai stored-procedure.
- 💡 SARAN: untuk volume/kepatuhan tinggi, pertimbangkan pustaka/ledger matang (mis. TigerBeetle, atau pola ledger di Postgres) daripada menulis sendiri dari nol. Cek semantik isolation/constraint **versi terpasang** (§8.2 A3).

---

## 4. Self-verify (sangkal diri sebelum "selesai" — §8.2 Aturan 3)

- [ ] Saldo = **turunan entri append-only** (bukan kolom yang bisa di-`UPDATE` bebas)? Koreksi = **reversal**, bukan edit/hapus?
- [ ] Insert entri + update saldo **satu transaksi** (uji: matikan koneksi di tengah → tak ada saldo setengah-jadi)?
- [ ] **Anti-race** (uji: 100 penarikan paralel dari saldo yang cuma cukup untuk 1 → tepat 1 lolos, sisanya ditolak, saldo tak minus)?
- [ ] **Idempoten** (uji: kirim operasi/webhook sama 2× → saldo berubah sekali; `UNIQUE(idem_key)` menahan)?
- [ ] Uang **integer/DECIMAL**, bukan float? Satu mata uang per entri?
- [ ] Penarikan pakai **state-machine + hold** + kirim-ke-bank idempoten + reversal saat gagal (uji: gagal-kirim → dana kembali, tak hilang/dobel)?
- [ ] **Σ seluruh entri = 0** (trial balance) diperiksa berkala + alert kalau tak balance?

---

## 5. Definition-of-Done

- [ ] **Kontrak (§1) ditulis** (operasi/idem-key/output-seimbang/invarian/idempoten/error).
- [ ] Double-entry append-only + saldo-turunan + atomik + anti-minus (constraint DB) + anti-race (lock/update-bersyarat) + idempoten (UNIQUE) + penarikan ber-state+hold + integer-uang + rekonsiliasi terpasang.
- [ ] **Edge case** diuji: penarikan paralel (race), webhook/operasi duplikat, gagal-kirim payout (reversal), crash di tengah transaksi, saldo pas-pasan, bonus vs saldo riil.
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris`.
- [ ] Observability: mutasi ter-audit (append-only) + alert saat trial-balance ≠ 0 / rekonsiliasi selisih / payout macet. Adjust saldo manual (admin) → ter-audit `skills/admin-panel/SKILL.md`.
- [ ] build + lint + test lulus; min 1 happy-path (deposit→saldo naik) + 1 anti-race (paralel) + 1 idempoten (duplikat) + 1 payout-gagal→reversal.

---

## 6. Handoff / rujuk-silang (reuse-first — jangan salin)

- 🔒 Uang EKSTERNAL (checkout/webhook gateway terverifikasi + dedup) → `skills/pembayaran/SKILL.md`; kepatuhan (KYC/AML penarikan, batas hukum, audit) → `skills/kepatuhan-teregulasi/SKILL.md`.
- 📐 Constraint DB (`CHECK saldo>=0`, `UNIQUE idem`) + transaksi + `FOR UPDATE` + RLS multi-tenant → `skills/database/SKILL.md` · `skills/supabase-prisma/SKILL.md`.
- 📐 Payout & rekonsiliasi di latar + retry → `skills/background-job/SKILL.md`; kirim-ke-bank tahan-gagal → `skills/tahan-gagal/SKILL.md`; adjust/lihat saldo ter-audit → `skills/admin-panel/SKILL.md`.
- 🗃️ LATAR — alert trial-balance/rekonsiliasi → `templates/PRODUCTION_OBSERVABILITY.md`.

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** uang/saldo user + integritas buku besar (tak boleh tercipta/hilang tanpa jejak). **Mode-gagal:** race dua-penarikan (double-spend), webhook/retry dobel-kredit, saldo minus, saldo di-`UPDATE` langsung tanpa entri (uang dari udara), payout dobel-kirim, float membocorkan sen, koreksi via hapus-entri (hilang jejak), campur bonus & saldo riil. **Mitigasi:** double-entry append-only + saldo-turunan + atomik + anti-minus (constraint) + anti-race (lock/update-bersyarat) + idempoten (UNIQUE) + payout ber-state+hold+idempoten + integer-uang + rekonsiliasi (§2).
- 🗃️ **LATAR — Batas jujur:** skill ini menaikkan lantai integritas buku besar, **bukan** menggantikan sistem akuntansi/core-banking bersertifikat, lisensi, atau audit keuangan formal — wajib untuk fintech/judi teregulasi (libatkan kepatuhan + auditor). "Exactly-once" murni sulit di sistem terdistribusi; yang realistis = **minimal-sekali + idempoten**. Cek semantik isolation level & constraint **DB versi terpasang** — perilaku kunci/serializable beda antar-engine.
