# THREAT_MODEL_NON_LEGAL — Peta Ancaman untuk Tim Tanpa Jalur Hukum

> Versi 1.1 · 2026-07-14 · untuk owner/lead non-programmer · 1 halaman, baca sekali · v1.1: + peta kedua STRIDE (ancaman aplikasi per-fitur)

## Tujuan

Tim ini **belum punya jalur hukum** (NDA/kontrak kerahasiaan yang bisa dituntut). Artinya: kalau ada yang menyalin kode rahasiamu, kamu **tidak bisa mengandalkan pengacara** untuk menghukum. Maka **pintu yang terkunci di GitHub + pemisahan rahasia = pertahanan nyatamu** — bukan surat perjanjian.

Dokumen ini menjawab 3 pertanyaan singkat (gaya "peta ancaman"): **apa yang dilindungi**, **dari siapa**, **dengan apa**. Tujuannya bukan menakut-nakuti — tapi supaya kamu tahu **di mana harus ketat** dan **di mana boleh longgar**, jadi energi keamanan tidak terbuang ke tempat yang salah.

> 🏢 **Analogi:** kayak **denah pengamanan toko emas**. Kamu tidak pasang brankas di kasir dan etalase kaca di gudang emas — kamu taruh yang paling berharga di ruang paling terkunci. Peta ini bantu kamu tahu mana "gudang emas"-mu.

---

## 1) Apa yang dilindungi (aset — urut dari paling berharga)

| Aset | Kenapa berharga | "Gudang emas" atau "etalase"? |
|---|---|---|
| 🥇 **Resep rahasia bisnis** (logika backend, algoritma, cara kerja tiap kapabilitas) | Ini yang bikin produkmu beda. Kalau bocor → pesaing tinggal jiplak. | 🔒 Gudang emas — **lingkaran terkecil 3-5 orang** |
| 🥇 **Kunci database + kredensial** (`DATABASE_URL`, kunci layanan, token API berbayar) | Pegang ini = bisa baca/hapus SEMUA data pelanggan + tagih biaya ke kartu kreditmu. | 🔒 Gudang emas — **jangan pernah** ke repo fitur |
| 🥈 **Data pelanggan** (PII = data pribadi: nama, email, transaksi) | Bocor = kepercayaan hancur + bisa kena UU PDP. | 🔒 Terkunci di backend |
| 🥉 **Kode tampilan/fitur** (frontend, dashboard) | Kalau dijiplak, kerugian kecil — tampilan mudah ditiru siapa saja, tak ada resep rahasia. | 🪟 Etalase — boleh ~40 staf |

> 🎯 **Inti:** yang wajib dijaga ketat = **resep rahasia + kunci**. Tampilan boleh longgar. Jangan habiskan energi mengunci etalase sambil gudang emas terbuka.

---

## 2) Dari siapa (model penyerang yang realistis)

Untuk tim seperti ini, ancaman terbesar **BUKAN** peretas asing di film. Yang realistis:

| Penyerang | Skenario nyata | Seberapa mungkin |
|---|---|---|
| 🚪 **Staf yang keluar tidak baik-baik** | Resign/dipecat lalu bawa salinan kode repo yang dia bisa akses — untuk pesaing atau bikin tiruan. | **Paling mungkin** |
| 😐 **Staf aktif yang iseng/khilaf** | Tidak sengaja commit file `.env` berisi kunci asli, atau paste kunci di chat grup. | Sering (tak sengaja) |
| 🕵️ **Orang luar via akses berlebih** | Staf diundang ke repo yang tak perlu → makin banyak orang pegang kunci = makin besar peluang bocor. | Naik kalau "undang ke semua biar gampang" |
| 🌐 **Peretas acak dari internet** | Coba tebak kredensial / pakai kunci yang ter-publish tak sengaja. | Ada, tapi GitHub Secret Scanning + repo private sudah menahan sebagian besar |

> 🚨 **Sadar diri yang penting:** karena tanpa jalur hukum, kamu **tidak bisa** menghentikan orang yang **sekarang punya akses sah** untuk menyalin. Yang bisa kamu lakukan = **batasi SIAPA yang punya akses** (sesedikit mungkin) + **siap menelusuri jejak** kalau terjadi. Itu sebabnya "gudang emas" cuma 3-5 orang.

---

## 3) Dengan apa (mitigasi berlapis — yang sudah/akan dipasang kit)

| Lapis | Apa | Status di kit |
|---|---|---|
| 🔒 **Izin clone GitHub** | Yang tak diundang **tidak bisa download** repo (dapat 403). Lapis utama. | undangan collaborator per-repo (Settings → Collaborators and teams) |
| 🔑 **Pemisahan rahasia per tingkat** | Repo fitur **tidak punya** kunci DB → walau dilihat, tak ada yang berharga. | `SPLIT_REPO_PREPROVISION_v1.md` (tier-driven) |
| 🚫 **Tolak-default saat onboarding** | Staf baru mulai **tanpa akses**, ditambah hanya repo yang dia kerjakan. | disiplin owner (default = tolak, tambah seperlunya) |
| 📅 **Cek-akses bulanan** | Pastikan tak ada akses "ketinggalan" (mis. staf sudah pindah tapi masih bisa backend). | agenda bulanan owner: cek GitHub Settings → Collaborators |
| 🔎 **Penjaga kebocoran otomatis** | Robot menolak commit yang berisi file `.env` asli / kunci asli. | robot `secret-guard.yml` |
| 🧭 **Siap forensik** | Kalau ada staf keluar tidak baik-baik → bisa telusuri "siapa pegang apa, kapan". | `SECURITY_INCIDENT_PLAYBOOK.md` bagian forensik |

---

## Yang TIDAK bisa dilakukan peta ini (kejujuran)

- ❌ **Tidak** menghentikan orang yang **punya akses sah** untuk menyalin. Itu di luar kendali teknis — yang bisa = perkecil jumlahnya jadi 3-5 orang inti yang paling dipercaya.
- ❌ **Tidak** menggantikan jalur hukum. Kalau bisnis tumbuh, **NDA/kontrak tetap layak dikejar** — ini pertahanan teknis sebagai lapis pertama, bukan satu-satunya.
- ❌ **Tidak** mendeteksi 100% kebocoran. Penjaga otomatis menahan yang **kasar & jelas** (file `.env`, kunci asli); yang canggih bisa lolos. Karena itu **seleksi orang** tetap nomor satu.

> 🎯 **Garis bawah:** untuk tim tanpa jalur hukum, urutan kekuatan pertahanan = **(1) sedikitkan orang yang pegang gudang emas → (2) pisahkan rahasia dari etalase → (3) siap telusuri jejak.** Peta ini bantu kamu fokus ke ketiga itu, bukan sibuk di hal yang dampaknya kecil.

---

## Peta KEDUA — ancaman APLIKASI per-fitur: checklist STRIDE

> Peta di atas menjaga **kode & kunci** dari orang-dalam. Peta kedua ini menjaga **aplikasi yang kamu bangun** dari penyerang — dipakai **per-fitur**. Baseline §8 sudah mewajibkan threat-model 3-baris (aset / penyerang / mitigasi); untuk fitur BERISIKO (login, pembayaran, data pribadi, upload, halaman publik, skema DB) naikkan kelas pakai STRIDE.

**STRIDE** = daftar-periksa 6 jenis ancaman baku (buatan Microsoft, dipakai luas — rujukan: OWASP Threat Modeling Cheat Sheet, dicek 2026-07). Per fitur, tanya: "bisakah penyerang ..."

| Huruf | Modus | Sifat yang dilanggar | Contoh nyata | Penangkal utama (sudah di kit) |
|---|---|---|---|---|
| **S** — *Spoofing* (menyamar) | mengaku sebagai orang lain | Autentikasi | curi token/sesi → login sebagai korban | auth kuat + regenerasi sesi + 2FA (`skills/auth/SKILL.md`) |
| **T** — *Tampering* (mengubah) | mengubah data/permintaan diam-diam | Integritas | ubah harga di body request | validasi server + constraint DB + query parameterized (§8/§9) |
| **R** — *Repudiation* (menyangkal) | menyangkal pernah beraksi | Jejak audit | "bukan saya yang hapus" — dan memang tak ada bukti | audit log who/what/when (§8) + Pilar 4 `PRODUCTION_OBSERVABILITY.md` |
| **I** — *Information disclosure* (mengintip) | membaca data yang bukan haknya | Kerahasiaan | IDOR / RLS bolong → data user lain terbaca | otorisasi per-resource + RLS (§8 / stack §4.14-2) |
| **D** — *Denial of service* (melumpuhkan) | membuat layanan mati/mahal | Ketersediaan | banjir request, ReDoS, denial-of-wallet | rate-limit + batas payload (§8) + stack §4.14-4 |
| **E** — *Elevation of privilege* (panjat hak) | user biasa jadi admin | Otorisasi | mass-assignment `is_admin=true`; utak-atik role di JWT | cek role server-side + allowlist field (stack §4.14-5) |

**Cara pakai (±10 menit per fitur berisiko):** gambar alur datanya (dari mana masuk → diproses di mana → disimpan di mana) → jalankan 6 pertanyaan STRIDE di TIAP panah & tempat-simpan → temuan ditulis jadi threat-model 3-baris yang lebih tajam di `docs/<fitur>.md`. Payungnya 4 pertanyaan (Threat Modeling Manifesto via OWASP): *kerjakan apa? apa yang bisa salah? apa penangkalnya? sudah cukup baik?*

- 🙂 **Non-programmer:** STRIDE = daftar-periksa **6 modus maling** yang baku — menyamar, mengubah barang, menyangkal, mengintip, melumpuhkan, naik pangkat ilegal. Satpam profesional memeriksa keenam modus satu per satu untuk tiap pintu baru, bukan mengandalkan firasat.

---

## Input / Output

- **Input:** kondisi tim (tanpa jalur hukum, ~40 staf, 3-5 inti) + daftar repo dan siapa boleh akses masing-masing.
- **Output:** kejelasan **di mana ketat, di mana longgar** + rujukan ke lapis-lapis mitigasi konkret.

## Dependensi

- `SPLIT_REPO_PREPROVISION_v1.md` (pemisahan rahasia per tingkat).
- `SECURITY_INCIDENT_PLAYBOOK.md` (langkah saat ada insiden + forensik staf-keluar).

## Catatan

- Gampang salah: mengira ancaman utama = peretas asing. Untuk tim ini, yang realistis = **staf keluar bawa akses**. Fokus ke kontrol-akses, bukan cuma firewall.
- Gampang salah: mengunci semua repo sama ketatnya. Itu boros + bikin kerja staf fitur lambat. **Bedakan gudang emas vs etalase.**
- Perbarui peta ini kalau kondisi berubah (mis. nanti ada NDA, atau jumlah orang inti bertambah).
