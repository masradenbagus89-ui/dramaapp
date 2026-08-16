---
nama: anti-fraud
deskripsi: Deteksi kecurangan judi/fintech kelas-industri — sinyal server-side (device/IP/velocity/graph), skor risiko → aksi bertingkat (allow/challenge/hold-review/block), reason-code ter-audit, seimbang anti false-positive, privasi & anti-bias.
divisi: keamanan
pemicu: [anti-fraud, antifraud, fraud, penipuan, kecurangan, curang, multi-akun, akun-ganda, bonus-abuse, collusion, kolusi, chargeback, device-fingerprint, velocity-check, risk-score, skor-risiko, deteksi-kecurangan, akun-palsu, pesanan-palsu, order-fiktif, abuse-promo]
rawan_keamanan: true
menggantikan: []
---

# Skill: Anti-Fraud (deteksi kecurangan) — kelas industri

> **Inti:** anti-fraud tak menuduh semua orang; ia mengamati **pola mencurigakan** (satu orang bikin 10 kartu member untuk borong promo, penarikan raksasa 1 menit setelah daftar), memberi **skor**, lalu bertindak **bertingkat** — dari "minta KTP dulu" (challenge) sampai "tahan transaksi untuk diperiksa manusia". Salah tuduh orang jujur = pelanggan kabur; kelewat longgar = uang ludes. Anti-fraud = menyeimbangkan dua risiko itu.

Ranahnya uang + data pribadi → butir 🔒 padat; keamanan + integritas + privasi digali DALAM. ⚖️ Beririsan hukum: KYC/AML/sanksi = ranah `skills/kepatuhan-teregulasi/SKILL.md` (libatkan kepatuhan). Anti-fraud = **satu lapis** (mengurangi kerugian), BUKAN pengganti auth kuat, rate-limit, atau kepatuhan.

---

## 1. Kontrak (yang HARUS benar — tulis DULU)

- 🔒 **HASIL:**
  - **Input:** aksi bernilai (daftar/login/deposit/tarik/taruhan/klaim-bonus) + sinyal (identitas server-side, device, IP, riwayat, kecepatan) + konteks.
  - **Output:** **skor risiko + keputusan bertingkat** — `allow` / `challenge` (minta bukti tambah: OTP/KYC/captcha) / `hold-review` (tahan + antre ke manusia) / `block` — masing-masing dengan **reason-code** (alasan mesin-baca).
  - **Keputusan + alasannya TERCATAT** (ter-audit, bisa dijelaskan) — untuk dispute, regulasi, dan perbaikan aturan.
  - **Error/ragu:** condong ke **challenge/review** (minta bukti / periksa manusia), **bukan** auto-block agresif (false-positive = usir pelanggan jujur) maupun auto-allow buta.

---

## 2. Cara rakit (prinsip — 📐 CARA BAKU, boleh diganti cara lain yang capai HASIL sama)

1. 🔒 **HASIL — Evaluasi & keputusan di SERVER, dari data server-side.** Sinyal dari klien (device info, "aku bukan bot") bisa dipalsukan → verifikasi & putuskan di server. Jangan pernah percaya flag anti-fraud yang dikirim browser.
2. 🔒 **HASIL — Aksi bertingkat sesuai skor, JANGAN biner buta.** Skor rendah → `allow`; sedang → `challenge` (step-up: OTP/KYC/captcha); tinggi + berisiko-uang (tarik-dana) → `hold-review` (tahan via state-machine wallet, `skills/wallet-ledger/SKILL.md`) lalu manusia memutuskan; sangat tinggi/terbukti → `block`. Auto-block total = false-positive mengusir user sah; auto-allow = kebobolan. **Kasus ambigu → antre review manusia** (`skills/admin-panel/SKILL.md`), jangan paksa mesin memutus semua.
3. 📐 **Mulai dari rules engine (aturan) yang bisa dijelaskan, ML belakangan.** Aturan deterministik (mis. "≥3 akun dari device sama dalam 24 jam", "tarik > X dalam Y menit sejak daftar", "kartu sama di banyak akun") = mudah di-audit, diterangkan ke regulator, dan cepat pasang. ML/anomaly detection menyusul saat ada data berlabel — jangan mulai dari kotak-hitam yang tak bisa dijelaskan (YAGNI + explainability).
4. 📐 **Sinyal berlapis (defense in depth):** **device fingerprint** (sidik-jari perangkat — deteksi multi-akun); **IP/geo** (VPN/proxy/Tor, banyak akun 1 IP → beririsan `skills/kepatuhan-teregulasi/SKILL.md` geo-block); **velocity** (kecepatan aksi/deposit/tarik — `skills/rate-limiting/SKILL.md`); **graph/link** (akun terhubung via device/IP/pembayaran/alamat sama → collusion, chip-dumping); **payment** (kartu curian, chargeback tinggi, nama tak cocok → `skills/pembayaran/SKILL.md`); **behavioral** (pola main/timing tak wajar). Tak ada satu sinyal yang cukup sendiri.
5. 🔒 **HASIL — Reason-code + audit-trail tiap keputusan (explainability).** Simpan **kenapa** sebuah aksi di-challenge/hold/block (kode alasan + sinyal pemicu), append-only, agar bisa: bela diri saat user protes, buktikan ke regulator, dan perbaiki aturan. Terkait audit-trail di `skills/admin-panel/SKILL.md`. **JANGAN bocorkan logika deteksi ke pelaku** (pesan ke user: "butuh verifikasi tambahan", bukan "kamu di-flag karena device sama") — membocorkan = mengajari penipu menghindar.
6. 🔒 **HASIL — Privasi & anti-bias (legal).** Device fingerprint + data perilaku = **data pribadi** → dasar hukum/consent + minimalkan + retensi terbatas (koordinasi `skills/kepatuhan-teregulasi/SKILL.md`). **Hati-hati fitur yang jadi proxy diskriminasi** (lokasi/nama → ras/etnis) — bisa melanggar hukum + tak adil; libatkan Legal/Compliance untuk aturan berdampak besar.
7. 📐 **Adaptif + feedback loop:** penipu beradaptasi → aturan statis usang. Hasil review manusia (terbukti fraud / false-positive) di-umpan-balik untuk menyetel ambang & aturan. Pantau **false-positive rate** (berapa user jujur terganggu) selain **fraud tertangkap** — dua-duanya, bukan salah satu.
8. 📐 **Konsisten dengan uang (idempoten + hold, bukan pembalikan kacau):** tahan/lepas dana lewat state-machine ledger (`skills/wallet-ledger/SKILL.md`), idempoten (`skills/background-job/SKILL.md`) — jangan langsung memotong saldo dari logika fraud yang bisa jalan berkali-kali.

---

## 3. Powerful — pola siap-adaptasi

🧪 **CONTOH KASUS (ambil polanya, jangan salin mentah):** rules → skor → aksi bertingkat + reason-code, dijalankan di server saat aksi berisiko:

```txt
evaluasiRisiko(aksi, ctx):                       // ctx = identitas server-side + sinyal
  skor = 0; alasan = []
  if hitungAkunDariDevice(ctx.deviceId, '24h') >= 3:  skor += 40; alasan += 'multi_akun_device'
  if ctx.ipTipe in ['vpn','tor']:                     skor += 20; alasan += 'ip_anonim'
  if aksi == 'withdraw' and menitSejakDaftar(ctx) < 30 and aksi.jumlah > BESAR:
                                                      skor += 50; alasan += 'tarik_cepat_besar'
  if kartuDipakaiAkunLain(ctx.cardHash):              skor += 40; alasan += 'kartu_multi_akun'

  keputusan = skor < 30 ? 'allow'
            : skor < 60 ? 'challenge'                 // step-up: OTP/KYC/captcha
            : aksi.berisikoUang ? 'hold_review'       // tahan dana + antre manusia
            : 'block'
  auditLog.append({ subjek: ctx.userId, aksi, skor, alasan, keputusan, at: now })  // append-only, bisa dijelaskan
  return { keputusan, alasan }                        // pesan ke user: generik, JANGAN bocorkan 'alasan'
```
- 📐 CARA BAKU: ambang (30/60) = **setel dari data nyata** (mulai konservatif, sesuaikan dari false-positive vs fraud tertangkap), bukan angka keramat.
- 💡 SARAN: untuk skala/kecanggihan, pertimbangkan layanan/pustaka anti-fraud (device-intelligence, rules-engine) — tetapi keputusan + reason-code + audit tetap tanggung jawabmu, dan pastikan bisa dijelaskan. Cek API **versi terpasang**.

### Contoh pola ❌→✅ (ambil POLANYA, jangan salin mentah — cek versi paket/provider terpasang)

🧪 **Evaluasi & keputusan di server, bukan dari flag client (§2 butir 1)**:

❌ **SALAH** (percaya sinyal "aman" kiriman client = bisa dipalsukan):
```ts
const { jumlah, deviceTrusted, skorRisiko } = await req.json()
if (deviceTrusted && skorRisiko < 30) // penyerang tinggal kirim deviceTrusted: true, skorRisiko: 0
  await prosesTarik(userId, jumlah)   // → lolos tanpa evaluasi sama sekali
```
✅ **BENAR** (client hanya kirim niat aksi; sinyal diambil server-side):
```ts
const { jumlah } = await req.json()              // dari body HANYA niat aksi
const ctx = await ambilSinyalServer(userId, req) // device/IP/riwayat dari DB + request, BUKAN body
const { keputusan } = await evaluasiRisiko({ tipe: 'withdraw', jumlah }, ctx)
if (keputusan !== 'allow') return tanggapiBertingkat(keputusan) // challenge/hold/block sesuai skor
await prosesTarik(userId, jumlah)
```

🧪 **Tahan dana lewat hold idempoten, bukan potong saldo langsung (§2 butir 8)**:

❌ **SALAH** (logika fraud memotong saldo langsung):
```ts
if (skor >= 60) {
  // deteksi bisa jalan ulang (retry / job dobel) → saldo terpotong 2×, tanpa jejak & tanpa manusia
  await db.user.update({ where: { id: userId }, data: { saldo: { decrement: jumlah } } })
}
```
✅ **BENAR** (hold idempoten per-penarikan; manusia yang memutus lepas/blokir):
```ts
if (skor >= 60) {
  await db.holdDana.upsert({
    where: { penarikanId },             // kolom UNIQUE → deteksi jalan 2× tetap 1 hold (idempoten)
    create: { penarikanId, status: 'HOLD_REVIEW', jumlahSen },
    update: {},                         // sudah ada → biarkan; JANGAN sentuh saldo di sini
  })
  await antreReviewManusia(penarikanId) // lepas/potong dana: state-machine skills/wallet-ledger/SKILL.md
}
```

🧪 **Reason-code ke audit append-only; pesan ke user generik (§2 butir 5)**:

❌ **SALAH** (bocorkan logika deteksi + keputusan tak dicatat):
```ts
if (keputusan === 'block')
  // mengajari penipu cara menghindar; tak dicatat → saat dispute/regulator tanya, tak ada bukti
  return Response.json({ error: 'Ditolak: device kamu terpakai 3 akun lain' }, { status: 403 })
```
✅ **BENAR** (alasan lengkap hanya di audit yang tak bisa diubah; user dapat pesan generik):
```sql
CREATE TABLE fraud_audit (id bigserial PRIMARY KEY, user_id uuid NOT NULL, aksi text NOT NULL,
  skor int NOT NULL, alasan text[] NOT NULL, keputusan text NOT NULL, at timestamptz DEFAULT now());
REVOKE UPDATE, DELETE ON fraud_audit FROM app_rw; -- append-only: role aplikasi hanya boleh INSERT
```
```ts
await db.fraudAudit.create({ data: { userId, aksi, skor, alasan, keputusan } }) // reason-code lengkap DI SINI
return Response.json({ pesan: 'Transaksi perlu verifikasi tambahan' }, { status: 202 }) // ke user: generik saja
```

---

## 4. Self-verify (sangkal diri sebelum "selesai")

- [ ] Evaluasi & keputusan **di server** (uji: klien memalsukan sinyal "aman" → tetap dievaluasi server)?
- [ ] Aksi **bertingkat** (allow/challenge/hold-review/block), bukan biner; ambigu → **antre manusia**, bukan auto-block/allow?
- [ ] Tiap keputusan punya **reason-code + audit-trail append-only** (bisa dijelaskan untuk dispute/regulator)?
- [ ] Pesan ke user **tak membocorkan logika deteksi** (generik, bukan "di-flag karena X")?
- [ ] Sinyal **berlapis** (device+IP+velocity+graph+payment), tak bergantung satu sinyal?
- [ ] **Privasi**: data device/perilaku punya dasar hukum + retensi; **tak ada fitur proxy-diskriminasi** tanpa review Legal?
- [ ] **False-positive rate dipantau** (bukan cuma fraud tertangkap)? Hasil review di-umpan-balik?
- [ ] Tahan/lepas dana lewat **hold state-machine ledger** (idempoten), bukan potong-saldo langsung?

---

## 5. Definition-of-Done

- [ ] **Kontrak (§1) ditulis** (input-sinyal/output-skor+keputusan+reason/audit/error-condong-review).
- [ ] Evaluasi server-side + aksi bertingkat + rules-engine bisa-dijelaskan + sinyal berlapis + reason-code/audit + hold-idempoten + kontrol privasi/anti-bias terpasang.
- [ ] **Edge case** diuji: multi-akun device sama, tarik-cepat-besar pasca-daftar, kartu lintas-akun, VPN, user jujur (tak ke-block), sinyal klien dipalsukan.
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris`.
- [ ] Observability: dashboard fraud tertangkap **DAN** false-positive rate + antrean review; alert lonjakan pola baru. Review manusia via `skills/admin-panel/SKILL.md` (ter-audit).
- [ ] build + lint + test lulus; min 1 happy-path (user normal → allow) + 1 deteksi (pola fraud → challenge/hold) + 1 anti-false-positive (kasus mirip-tapi-sah → tak di-block).

---

## 6. Handoff / rujuk-silang (reuse-first — jangan salin)

- 🔒 KYC/AML/sanksi/geo + batas hukum + privasi → `skills/kepatuhan-teregulasi/SKILL.md`; account-takeover/2FA/step-up → `skills/auth/SKILL.md`.
- 📐 Tahan/lepas dana (hold state-machine, idempoten) → `skills/wallet-ledger/SKILL.md`; velocity/rate-limit → `skills/rate-limiting/SKILL.md`; chargeback/payment-fraud → `skills/pembayaran/SKILL.md`.
- 📐 Antrean review manusia + audit-trail keputusan → `skills/admin-panel/SKILL.md`; job deteksi batch + feedback loop → `skills/background-job/SKILL.md`.
- 🗃️ LATAR — dashboard fraud & false-positive → `templates/PRODUCTION_OBSERVABILITY.md`; sinyal analytics (hati-hati privasi) → `skills/analytics/SKILL.md`.

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** uang/bonus/integritas permainan + kepercayaan + kepatuhan hukum. **Penyerang/mode-fraud:** multi-akun & bonus-abuse, kolusi & chip-dumping, account-takeover, payment-fraud/chargeback, pencucian uang (deposit→tarik tanpa main), bot/otomasi, self-exclusion evasion, dan **serangan balik**: penipu memetakan aturanmu → menghindar. **Mitigasi:** evaluasi server-side + sinyal berlapis + aksi bertingkat + reason-code/audit + hold ledger + feedback loop + rahasiakan logika deteksi + kontrol privasi/anti-bias (§2).
- 🗃️ **LATAR — Batas jujur:** anti-fraud = **kompromi berkelanjutan**, bukan tembok sempurna — selalu ada trade-off tangkap-fraud vs ganggu-user-jujur; ambang perlu di-tuning terus dari data nyata. Bukan pengganti KYC/AML formal (ranah kepatuhan) atau auth kuat. ML tanpa explainability berisiko hukum (tak bisa dijelaskan ke regulator/user) + bias — utamakan aturan yang bisa diterangkan. Untuk fintech/judi teregulasi, libatkan tim Compliance & Legal sejak desain.
