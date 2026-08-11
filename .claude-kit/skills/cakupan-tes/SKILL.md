---
nama: cakupan-tes
deskripsi: Cakupan tes kelas-QA — bikinkan tes yang kurang (pola AAA + nama menjelaskan perilaku), kejar "tak boleh kambuh" lewat tes regresi, bukan angka coverage.
divisi: qa
pemicu: [tes, test, testing, coverage, cakupan-tes, unit-test]
rawan_keamanan: false
menggantikan: [tes/cakupan]
---

# Skill: Cakupan Tes & Bikinkan Tes yang Kurang — kelas industri

> **Kapan skill ini aktif:** prompt menyentuh "tes / coverage / pastikan teruji / bikinkan unit-test / cakupan tes"; otomatis juga sehabis bikin fitur baru. Dispatcher `rak-pemicu` menyalakannya otomatis (staff tak perlu mengetik nama skill). `rawan_keamanan: false` → skill ini nasihat mutu, bukan pemblokir.
>
> 🙂 **Analogi:** cakupan-tes = **daftar uji QC (quality control = cek mutu sebelum barang keluar gudang)**. Bukan mengecek SEMUA baut biar angkanya tinggi — tapi memasang **pos ronda di titik yang pernah kemalingan** (tes regresi = tes yang MERAH kalau bug lama kambuh) supaya kesalahan yang sama tak lolos dua kali. `coverage` (persen kode yang tersentuh tes) tinggi ≠ aman; tes di titik-bobol nyata = aman.

Skill ini **advisory** (§4.17): otak native yang memutuskan adopsi/adaptasi/abaikan tiap butir 📐/💡. Tapi butir **🔒 HASIL** = jaminan mutu yang tak boleh gagal apa pun caranya. Cek **framework tes terpasang** (vitest/jest/pytest) sebelum menulis tes (§8.2 A3) — sintaks dan API berbeda antar-framework dan antar-versi.

---

## 1. Kontrak (yang HARUS benar — sepakati DULU sebelum nulis tes)

- 🔒 **HASIL — klaim "teruji" wajib berbukti dijalankan (§8.2 A4):**
  - **Input:** kode/fitur yang perlu dijamin perilakunya + framework tes yang ada di project.
  - **Output:** tes yang **benar-benar dijalankan + hijau**, menjamin perilaku di jalur kritis (bukan cuma ditulis).
  - **Aturan keras:** JANGAN mengucap "teruji / aman / selesai" untuk tes yang belum benar-benar di-`run` + hijau. "Ditulis ≠ terbukti jalan" (§8.2 A4).
  - **Jebakan lulus-palsu:** **0 tes di area yang disentuh = "0 dari 0 = lulus palsu" (§4.6)** — jangan dianggap aman.
- 🔒 **HASIL — paritas sandbox ↔ produksi (mode-gagal AI #1):** bentuk respons **sandbox == kontrak == produksi**. Jalur `sandbox`/`mock` yang beda bentuk dari jalur produksi = regresi tersering (mis. kolom baru masuk query produksi tapi lupa di sandbox → selalu `undefined`).

---

## 2. Cara rakit (prinsip — 📐 CARA BAKU, boleh diganti cara lain yang capai HASIL sama)

1. 📐 **Lihat tes + framework yang ada dulu** (vitest/jest/pytest). Kalau **0 tes di area yang disentuh** → itu lulus-palsu (§4.6, lihat Kontrak), jangan dianggap aman.
2. 📐 **Petakan jalur kritis yang belum teruji:** happy-path (jalur normal) + edge case (kasus pinggir: input kosong / `null` / error / akses-tak-berhak).
3. 📐 **Bikinkan tes yang kurang** — utamakan **1 happy-path + 1-2 edge case**. Staff non-programmer tak perlu menulis sendiri; AI yang merakit.
4. 🔒 **HASIL — Jalankan + pastikan hijau.** Jangan klaim "teruji" tanpa benar-benar `run` (§8.2 A4). "0 masalah" dari perintah yang ERROR = palsu — pastikan alat tesnya benar-benar jalan sebelum percaya vonisnya.
5. 📐 **Susun tiap tes pola AAA** (*Arrange-Act-Assert* = Siapkan → Lakukan → Periksa): siapkan data/kondisi awal, jalankan **SATU** aksi yang diuji, lalu periksa **SATU** hasil — jangan campur-aduk, supaya jelas apa yang gagal saat merah. **Beri nama tes yang menjelaskan perilaku, bukan "works":** mis. `test('mengembalikan array kosong saat tak ada yang cocok')` — BUKAN `test('tes cari')`. Nama jelas = laporan tes terbaca seperti daftar jaminan.
6. 📐 **Begitu bug ketemu & diperbaiki, tutup dengan 1 tes regresi** (tes yang MERAH kalau bug itu kambuh) — taruh **persis di jalur tempat bug muncul** + **beri nama sesuai bug yang dicegah** (mis. `regresi: notifikasi hilang karena kolom lupa di SELECT`). Sesi berikut sekali baca langsung tahu tes ini menjaga apa.
7. 📐 **Kejar "tak boleh kambuh", BUKAN angka `coverage`.** Tulis tes di titik yang **pernah** rusak; area yang belum pernah bermasalah belum wajib dipaksa (hemat effort, §6.3). Cakupan tinggi ≠ aman; tes di titik-bobol nyata = aman.
8. 🔒 **HASIL — Paritas sandbox ↔ produksi.** Karena AI yang menulis kode juga yang me-review-nya (blind-spot sama), definisikan kontrak `REQUIRED_FIELDS`, paksa `SANDBOX_MODE` di tes, lalu **assert bentuk respons sandbox == kontrak == produksi**. Selaras §8.2 Aturan 3 (sangkal-diri); staff non-programmer tak bisa mendeteksi ketimpangan ini sendiri.

> 🗃️ **LATAR — beda dari §6.4 Buku Pelajaran:** langkah 6-7 di atas = kebiasaan ringan saat ngoding sehari-hari. §6.4 khusus bug yang **sudah LOLOS ke produksi** + butuh persetujuan owner untuk dijadikan penjaga permanen. Urutan bug-check mekanis (tes+build otomatis DULU, merah = prioritas tertinggi, baru AI baca-pakai-mata) sudah diatur §4.6 + §6.3 — jangan diulang di sini.

---

## 3. Powerful — pola siap-adaptasi

🧪 **CONTOH KASUS (ambil polanya, jangan salin mentah — padankan ke framework + versi terpasang):**

Tes pola AAA dengan nama yang menjelaskan perilaku:

```ts
// Nama = perilaku yang dijamin, BUKAN "tes cari".
test('mengembalikan array kosong saat tak ada yang cocok', () => {
  const data = []                        // Arrange — siapkan kondisi awal
  const hasil = cari(data, 'apa pun')    // Act    — SATU aksi yang diuji
  expect(hasil).toEqual([])              // Assert — SATU hasil diperiksa
})

// Tes regresi: diberi nama sesuai bug yang dicegah, ditaruh di jalur tempat bug muncul.
test('regresi: notifikasi hilang karena kolom lupa di SELECT', () => {
  const notif = ambilNotifikasi(userId)
  expect(notif.judul).toBeDefined()      // kolom yang dulu hilang WAJIB ada
})
```

Paritas sandbox ↔ produksi (🔒 HASIL langkah 8) — assert bentuk respons cocok kontrak:

```ts
// REQUIRED_FIELDS = kontrak bentuk data. Sandbox WAJIB sama bentuk dengan produksi.
const REQUIRED_FIELDS = ['id', 'judul', 'dibuat_pada'] as const
test('bentuk respons sandbox == kontrak (cegah kolom lupa di jalur mock)', () => {
  const resp = ambilData({ SANDBOX_MODE: true })
  for (const f of REQUIRED_FIELDS) expect(resp).toHaveProperty(f)
})
```

- 📐 CARA BAKU: utamakan 1 happy-path + 1-2 edge case per fitur baru — bukan mengejar angka `coverage`.
- 💡 SARAN: bug yang sudah lolos ke produksi → tawarkan jadikan penjaga permanen lewat §6.4 (owner yang menyetujui, bukan AI diam-diam).

---

## 4. Self-verify (sangkal diri sendiri SEBELUM bilang "teruji" — §8.2 Aturan 3)

Sebelum menandai "teruji", jawab dengan bukti `berkas:baris` (tak bisa jawab → belum selesai):
- [ ] Tes benar-benar **dijalankan + hijau** (bukan cuma ditulis)? Alat tesnya benar-benar jalan (bukan ERROR yang dibaca "0 masalah")?
- [ ] Area yang disentuh **punya tes** (bukan "0 dari 0 = lulus palsu")?
- [ ] Ada **happy-path + minimal 1 edge case** (kosong/`null`/error/akses-tak-berhak)?
- [ ] Tiap tes pola **AAA** + **nama menjelaskan perilaku** (bukan `test('works')`)?
- [ ] Tiap bug yang diperbaiki punya **tes regresi** di jalur tempat bug muncul, dinamai sesuai bug?
- [ ] Bentuk respons **sandbox == kontrak == produksi** (`REQUIRED_FIELDS` di-assert)?

> **Verifikasi WAJIB cuma-baca** (§8.2 Aturan 3): membuktikan cakupan = baca kode + `Grep` + jalankan tes cuma-baca, JANGAN jalankan SQL/perintah yang mengubah data live. Klaim yang cuma bisa diuji dengan mengubah data → minta owner jalankan di staging.

---

## 5. Definition-of-Done (kapan skill cakupan-tes dianggap benar-selesai)

- [ ] **Kontrak (§1) disepakati** — apa yang dijamin + framework tes + paritas sandbox/produksi.
- [ ] Tes yang kurang **dibikinkan** (min 1 happy-path + 1-2 edge case) di jalur kritis yang disentuh.
- [ ] Tiap tes **pola AAA + nama menjelaskan perilaku**.
- [ ] Bug yang diperbaiki **ditutup tes regresi** (dinamai + ditaruh di jalur bug).
- [ ] Paritas **sandbox == kontrak == produksi** di-assert (`REQUIRED_FIELDS`).
- [ ] **Self-verify (§4) semua tercentang** dengan bukti `berkas:baris`.
- [ ] Tes **benar-benar dijalankan + hijau** — "teruji" = terbukti dengan bukti, bukan "sudah kutulis" (§8.2 A4).
- [ ] **Gerbang Pra-Rilis §4.6 LULUS** sebelum mengucap "selesai/aman".

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 **Urutan bug-check mekanis** (tes+build otomatis DULU, merah = prioritas tertinggi) → `rules/module/4.6-done-gate.md` + §6.3 (jangan diulang di sini).
- 📐 **Bug yang sudah LOLOS ke produksi → penjaga permanen** (human-gated, owner menyetujui) → §6.4 `docs/BUKU_PELAJARAN.md`.
- 📐 **Pola bantu lain** (perbaiki error build bertahap, jalur belum-teruji, cek permukaan AI, uji situs, tahan-gagal API luar) → induk `rules/4.15-helper-patterns.md`.
- 🗃️ **LATAR — sangkal-diri adversarial** (dasar paritas sandbox↔produksi) → §8.2 Aturan 3.

---

## 7. Batas jujur

- 🗃️ **LATAR — apa yang skill ini jamin & tidak:** skill ini menaikkan **lantai** mutu — tes di titik-bobol nyata + paritas sandbox/produksi. Ia **tidak menjamin** kode bebas bug: angka `coverage` tinggi pun bisa menyembunyikan jalur yang tak pernah benar-benar diuji perilakunya. Yang dikejar = "tak boleh kambuh", bukan angka.
- 🗃️ **LATAR — mode-gagal AI #1:** karena AI yang menulis kode juga yang me-review-nya, blind-spot yang sama bisa lolos ke tes. Paritas sandbox↔produksi (`REQUIRED_FIELDS` + `SANDBOX_MODE`) memperkecil risiko itu, tapi tak menghapusnya — staff non-programmer tak bisa mendeteksi ketimpangan ini sendiri, jadi jalankan self-verify §4 dengan sungguh-sungguh.
- 🗃️ **LATAR — cek versi terpasang:** sintaks tes (`vitest`/`jest`/`pytest`) dan API assertion berbeda antar-framework dan antar-versi — cek yang benar-benar terpasang sebelum menulis (§8.2 A3).
