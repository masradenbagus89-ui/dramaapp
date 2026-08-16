---
nama: cakupan-tes
deskripsi: Cakupan tes kelas-QA — bikinkan tes yang kurang (pola AAA + nama menjelaskan perilaku), kejar "tak boleh kambuh" lewat tes regresi, bukan angka coverage.
divisi: qa
pemicu: [tes, test, testing, coverage, cakupan-tes, unit-test, e2e, e2e-test, tes-end-to-end, playwright, cypress, vitest]
rawan_keamanan: false
menggantikan: [tes/cakupan]
---

# Skill: Cakupan Tes & Bikinkan Tes yang Kurang — kelas industri

> 🙂 **Inti:** cakupan-tes bukan soal mengejar angka `coverage` (persen kode yang tersentuh tes) setinggi mungkin — tapi memastikan ada **tes regresi** (tes yang MERAH kalau bug lama kambuh) di titik yang pernah bermasalah, supaya kesalahan yang sama tak lolos dua kali. `coverage` tinggi ≠ aman; tes di titik-bobol nyata = aman.

---

## 1. Kontrak (yang HARUS benar — sepakati DULU sebelum nulis tes)

- 🔒 **HASIL — klaim "teruji" wajib berbukti dijalankan:**
  - **Input:** kode/fitur yang perlu dijamin perilakunya + framework tes yang ada di project.
  - **Output:** tes yang **benar-benar dijalankan + hijau**, menjamin perilaku di jalur kritis (bukan cuma ditulis).
  - **Aturan keras:** JANGAN mengucap "teruji / aman / selesai" untuk tes yang belum benar-benar di-`run` + hijau. "Ditulis ≠ terbukti jalan".
  - **Jebakan lulus-palsu:** **0 tes di area yang disentuh = "0 dari 0 = lulus palsu"** — jangan dianggap aman.
  - 🔒 **DEFINISI "area yang disentuh" = berkas yang kau EDIT **+** berkas yang MEMAKAINYA.** Tanpa definisi ini istilahnya wajar dibaca sebagai "berkas yang kubuka saja" — dan justru pemakainya yang rusak diam-diam (dia tak pernah kau buka, jadi tak ada yang menandainya). Cara tahu pemakainya: §4.4 BACA-KODE (cari pemanggil) + jalankan pemeriksa project yang menyentuh mereka.
- 🔒 **HASIL — paritas sandbox ↔ produksi (mode-gagal AI #1):** bentuk respons **sandbox == kontrak == produksi**. Jalur `sandbox`/`mock` yang beda bentuk dari jalur produksi = regresi tersering (mis. kolom baru masuk query produksi tapi lupa di sandbox → selalu `undefined`).
- 🔒 **HASIL — jalur kritis (login/bayar/data-pribadi) WAJIB dijaga tes:** area ini rusak-SENYAP = uang/kepercayaan/data hilang tanpa error di layar. Menyentuh jalur ini tanpa tes yang menjaganya → **belum boleh "selesai"**. Untuk jalur kritis, utamakan **tulis tes DULU** (§2b).
- 🔒 **HASIL — assertion TIDAK boleh tautological:** nilai harapan yang dihitung ulang dengan cara SAMA seperti kode (`expect(add(a,b)).toBe(a+b)`, snapshot dihitung tangan pakai rumus kode, konstanta di-assert sama dirinya) = lolos-otomatis, **tak pernah bisa MERAH** walau kode salah. Nilai harapan wajib dari sumber independen: angka known-good, contoh dihitung manual, atau spec.
  - **Varian yang sering lolos review — menguji DATA UJI, bukan kode produksi:** kalau pabrik data uji (`factory`/`fixture`/seeder) sudah mengisi sendiri kolom yang mau diuji, assertion-nya cuma membuktikan pabriknya bekerja — kode produksinya **tak pernah dijalankan**. Contoh: pabrik mengisi `slug` lalu tes meng-assert `slug` benar, padahal yang seharusnya diuji adalah fungsi pembuat-slug di model. Perbaikan: biarkan kolom itu **kosong** di data uji (mis. `build()` tanpa simpan) supaya kode produksi yang mengisinya, lalu assert hasilnya.
  - 🙂 Non-Programmer: ada tes yang selalu hijau bukan karena programnya benar, tapi karena tes itu memeriksa data contoh yang dia buat sendiri. Hijau tapi tak membuktikan apa pun — persis jenis tes yang bikin orang merasa aman padahal belum.

---

## 2. Cara rakit (prinsip — 📐 CARA BAKU, boleh diganti cara lain yang capai HASIL sama)

1. 📐 **Lihat tes + framework yang ada dulu** (vitest/jest/pytest). Kalau **0 tes di area yang disentuh** → itu lulus-palsu (lihat Kontrak), jangan dianggap aman.
2. 📐 **Petakan jalur kritis yang belum teruji:** happy-path (jalur normal) + edge case (kasus pinggir: input kosong / `null` / error / akses-tak-berhak).
3. 📐 **Bikinkan tes yang kurang** — utamakan **1 happy-path + 1-2 edge case**. Staff non-programmer tak perlu menulis sendiri; AI yang merakit.
4. 🔒 **HASIL — Jalankan + pastikan hijau.** Jangan klaim "teruji" tanpa benar-benar `run`. "0 masalah" dari perintah yang ERROR = palsu — pastikan alat tesnya benar-benar jalan sebelum percaya vonisnya. **Urutan bug-check: pemeriksa MEKANIS dulu** (tes + build otomatis), **merah = prioritas tertinggi**, baru AI baca kode pakai mata — mesin menangkap kelas bug yang mata lewatkan, dan vonisnya tak bisa didebat.
5. 📐 **Susun tiap tes pola AAA** (*Arrange-Act-Assert* = Siapkan → Lakukan → Periksa): siapkan data/kondisi awal, jalankan **SATU** aksi yang diuji, lalu periksa **SATU** hasil — jangan campur-aduk, supaya jelas apa yang gagal saat merah. **Beri nama tes yang menjelaskan perilaku, bukan "works":** mis. `test('mengembalikan array kosong saat tak ada yang cocok')` — BUKAN `test('tes cari')`. Nama jelas = laporan tes terbaca seperti daftar jaminan.
6. 📐 **Begitu bug ketemu & diperbaiki, tutup dengan 1 tes regresi** (tes yang MERAH kalau bug itu kambuh) — taruh **persis di jalur tempat bug muncul** + **beri nama sesuai bug yang dicegah** (mis. `regresi: notifikasi hilang karena kolom lupa di SELECT`). Sesi berikut sekali baca langsung tahu tes ini menjaga apa.
7. 📐 **Kejar "tak boleh kambuh", BUKAN angka `coverage`.** Tulis tes di titik yang **pernah** rusak; area yang belum pernah bermasalah belum wajib dipaksa (hemat effort). Cakupan tinggi ≠ aman; tes di titik-bobol nyata = aman.
   🔒 **KECUALI area yang ikut TERDAMPAK perubahanmu** (pemakai fungsi/field/route yang kau ubah): itu **bukan** "belum pernah bermasalah", itu "baru saja kau taruhkan". Kelonggaran di kalimat sebelumnya berlaku untuk area yang kau **tak sentuh sama sekali** — bukan untuk area yang nasibnya kini bergantung pada kodemu yang baru.
8. 🔒 **HASIL — Paritas sandbox ↔ produksi.** Karena AI yang menulis kode juga yang me-review-nya (blind-spot sama), definisikan kontrak `REQUIRED_FIELDS`, paksa `SANDBOX_MODE` di tes, lalu **assert bentuk respons sandbox == kontrak == produksi**. Selaras prinsip sangkal-diri; staff non-programmer tak bisa mendeteksi ketimpangan ini sendiri.

> 🗃️ **LATAR — beda dari Buku Pelajaran:** langkah 6-7 di atas = kebiasaan ringan saat ngoding sehari-hari. Buku Pelajaran khusus bug yang **sudah LOLOS ke produksi** + butuh persetujuan owner untuk dijadikan penjaga permanen. Urutan bug-check mekanis (tes+build otomatis DULU, merah = prioritas tertinggi, baru AI baca-pakai-mata) ada di butir 4 di atas — rumahnya di rak ini, bukan di kernel.

### 2b — Test-first untuk jalur kritis (loop red-green — serapan TDD Kent Beck)

Untuk **jalur kritis** (login/bayar/data), sering lebih aman **tulis tes DULU, baru kode**:
1. 📐 **RED** — tulis 1 tes yang menyatakan perilaku diinginkan (mis. "checkout keranjang valid → status lunas"), jalankan → harus **MERAH** (kodenya belum ada/benar). Kalau tak merah, tesnya tak menguji apa-apa.
2. 📐 **GREEN** — tulis kode **secukupnya** sampai tes itu hijau; jangan tambah fitur spekulatif.
3. 📐 **Vertical-slice (tracer bullet)** — 1 tes → 1 implementasi → ulang. JANGAN borong semua tes dulu baru semua kode (itu menguji perilaku KHAYALAN + mengunci struktur sebelum paham implementasinya).
4. 🗃️ Rapikan (refactor) BUKAN bagian loop red-green — lakukan **setelah** hijau. 🙂 Non-programmer: ini cuma urutan kerja AI biar hasil jalur kritis terbukti benar sejak awal; kamu tetap cukup prompt biasa, AI yang merakit tesnya.

🧪 Vertical-slice (nilai harapan dihitung MANUAL = anti-tautological 🔒 §1):
```ts
// RED dulu: tes ini merah sebelum hitungTotal ada/benar. Nilai 110.000 dihitung TANGAN, bukan meniru rumus kode.
test('total = harga + ongkir, kupon kedaluwarsa ditolak', () => {
  const r = hitungTotal({ harga: 100_000, ongkir: 10_000, kupon: 'KADALUARSA' })
  expect(r.total).toBe(110_000)        // BUKAN r.harga + r.ongkir (itu meniru kode → tautological)
  expect(r.kuponDipakai).toBe(false)
})
```

---

### 2c — Tes karakterisasi: mau ubah fungsi bersama yang BELUM punya tes (serapan *characterization test*, Michael Feathers)

Situasi tersering di project client: fungsi dipakai banyak halaman, nol tes, dan client minta perilakunya diubah. Mengubahnya langsung = tak ada pembanding — "masih jalan kok" jadi klaim yang mustahil dibuktikan.

1. 🔒 **HASIL — kunci perilaku SEKARANG dulu.** Sebelum mengubah apa pun, tulis 1-3 tes yang menyatakan apa yang fungsi itu **hasilkan hari ini** (bukan yang kau MAU). Jalankan → **harus HIJAU**. Kalau merah, kau salah membaca perilakunya — perbaiki pemahamanmu, jangan perbaiki kodenya dulu.
2. 📐 Ambil nilai harapannya dengan **menjalankan** kode itu + melihat outputnya, bukan dari membaca rumusnya (kalau menyalin rumus, tesnya tautological 🔒 §1).
3. 📐 Baru ubah kodenya. Tes yang tadinya hijau lalu MERAH = kau baru saja menggeser perilaku yang dipakai orang lain → itu **perubahan cakupan**, bukan perbaikan: TAWARKAN ke client (§4.4), jangan diam-diam.
4. 📐 **Beda dari red-green (§2b):** red-green mulai dari MERAH (menyatakan yang kau INGINKAN, untuk kode baru). Tes karakterisasi mulai dari HIJAU (mengunci yang ADA, untuk kode lama tanpa tes). Jangan tertukar.
5. 🗃️ **Batas jujur:** tes karakterisasi ikut mengunci **bug yang sedang ada**. Itu memang tujuannya — ia alarm perubahan, bukan pernyataan bahwa perilaku lama sudah benar. Kalau ternyata perilaku lama memang salah, ubah tesnya **sadar-sadar** + beri tahu client, jangan dibisukan.

🙂 **Non-Programmer:** ini seperti memotret dulu kondisi sebelum direnovasi. Kalau sesudah renovasi fotonya tak lagi cocok, kamu langsung tahu ada yang berubah — dan bisa memutuskan apakah perubahan itu memang kamu mau.

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
- 💡 SARAN: bug yang sudah lolos ke produksi → tawarkan jadikan penjaga permanen (owner yang menyetujui, bukan AI diam-diam).
- 📐 **Serahkan deteksi tes-menipu ke lint, jangan ke mata.** Anti-pola di §1 (tes dimatikan diam-diam · tes tanpa assertion · assertion tak valid · judul kembar) sudah punya aturan lint standar yang matang & terpelihara di ekosistem tes — jauh lebih andal daripada memeriksanya manual tiap review. Kalau project punya tes tapi lint-nya belum memeriksa berkas tes: **tawarkan** memasang plugin lint tes yang cocok dengan framework yang **benar-benar terpasang**, lalu pastikan `lint` ikut memindai berkas tes. Sesudah itu `npm run lint` yang sudah rutin dijalankan otomatis menangkapnya — nol kebiasaan baru yang perlu diingat.
  - 🔒 **Cek nama paket + nama aturannya ke ekosistem terpasang dulu** (§2.1 "no quote = no claim"): nama plugin berbeda antar-framework dan pernah berganti. Menebak nama paket = halusinasi #1 (paket salah eja). Baca `package.json` + dokumentasi versi terpasang, jangan menyalin dari ingatan.

---

## 4. Self-verify (sangkal diri sendiri SEBELUM bilang "teruji")

Sebelum menandai "teruji", jawab dengan bukti `berkas:baris` (tak bisa jawab → belum selesai):
- [ ] Tes benar-benar **dijalankan + hijau** (bukan cuma ditulis)? Alat tesnya benar-benar jalan (bukan ERROR yang dibaca "0 masalah")?
- [ ] Area yang disentuh **punya tes** (bukan "0 dari 0 = lulus palsu")? — ingat definisinya: berkas yang kuedit **+ pemakainya**, bukan cuma yang kubuka.
- [ ] Fungsi bersama tanpa tes yang kuubah sudah kukunci **tes karakterisasi** (§2c) SEBELUM diubah — dan tes itu hijau dulu?
- [ ] Ada **happy-path + minimal 1 edge case** (kosong/`null`/error/akses-tak-berhak)?
- [ ] Tiap tes pola **AAA** + **nama menjelaskan perilaku** (bukan `test('works')`)?
- [ ] Tiap bug yang diperbaiki punya **tes regresi** di jalur tempat bug muncul, dinamai sesuai bug?
- [ ] Bentuk respons **sandbox == kontrak == produksi** (`REQUIRED_FIELDS` di-assert)?
- [ ] Jalur kritis (login/bayar/data) yang disentuh **punya tes yang menjaganya**, dan nilai harapan **bukan tautological** (bukan hasil rumus yang sama seperti kode)?

> **Verifikasi WAJIB cuma-baca:** membuktikan cakupan = baca kode + `Grep` + jalankan tes cuma-baca, JANGAN jalankan SQL/perintah yang mengubah data live. Klaim yang cuma bisa diuji dengan mengubah data → minta owner jalankan di staging.

---

## 5. Definition-of-Done (kapan skill cakupan-tes dianggap benar-selesai)

- [ ] **Kontrak (§1) disepakati** — apa yang dijamin + framework tes + paritas sandbox/produksi.
- [ ] Tes yang kurang **dibikinkan** (min 1 happy-path + 1-2 edge case) di jalur kritis yang disentuh.
- [ ] Tiap tes **pola AAA + nama menjelaskan perilaku**.
- [ ] Bug yang diperbaiki **ditutup tes regresi** (dinamai + ditaruh di jalur bug).
- [ ] Fungsi bersama tanpa tes: perilaku lama **dikunci tes karakterisasi** (§2c) sebelum diubah.
- [ ] Paritas **sandbox == kontrak == produksi** di-assert (`REQUIRED_FIELDS`).
- [ ] **Self-verify (§4) semua tercentang** dengan bukti `berkas:baris`.
- [ ] Tes **benar-benar dijalankan + hijau** — "teruji" = terbukti dengan bukti, bukan "sudah kutulis".

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 **Gerbang "selesai = terbukti"** (klaim selesai wajib bawa bukti sesuai JENIS klaimnya) → `AGENTS.md` §4.6; tabel bukti per-jenis di `skills/cek-permintaan/SKILL.md` (jangan diulang di sini).
- 📐 **Bug yang sudah LOLOS ke produksi → penjaga permanen** (human-gated, owner menyetujui) → contoh formatnya di `templates/BUKU_PELAJARAN.example.md`; salin jadi `docs/lintasai/INDEX.md` di project saat bug pertama (berkas itu yang dibaca AI tiap sesi — kernel §4.1).
- 📐 **Pola bantu lain** (perbaiki error build bertahap, cek permukaan AI, tahan-gagal API luar) → `skills/perbaiki-error/SKILL.md`, `skills/permukaan-ai/SKILL.md`, `skills/tahan-gagal/SKILL.md`.
- 🗃️ **LATAR — sangkal-diri adversarial** (dasar paritas sandbox↔produksi).

---

## 7. Batas jujur

- 🗃️ **LATAR — apa yang skill ini jamin & tidak:** skill ini menaikkan **lantai** mutu — tes di titik-bobol nyata + paritas sandbox/produksi. Ia **tidak menjamin** kode bebas bug: angka `coverage` tinggi pun bisa menyembunyikan jalur yang tak pernah benar-benar diuji perilakunya. Yang dikejar = "tak boleh kambuh", bukan angka.
- 🗃️ **LATAR — mode-gagal AI #1:** karena AI yang menulis kode juga yang me-review-nya, blind-spot yang sama bisa lolos ke tes. Paritas sandbox↔produksi (`REQUIRED_FIELDS` + `SANDBOX_MODE`) memperkecil risiko itu, tapi tak menghapusnya — staff non-programmer tak bisa mendeteksi ketimpangan ini sendiri, jadi jalankan self-verify §4 dengan sungguh-sungguh.
- 🗃️ **LATAR — cek versi terpasang:** sintaks tes (`vitest`/`jest`/`pytest`) dan API assertion berbeda antar-framework dan antar-versi — cek yang benar-benar terpasang sebelum menulis.
