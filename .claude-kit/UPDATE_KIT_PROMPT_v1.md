# UPDATE_KIT_PROMPT_v1.md - Prompt Update Kit lintasAI (Single-Paste)

> Versi: v1 · Untuk staff IT non-programmer · Bahasa Indonesia
> Pasangan dari `JALANKAN_KIT.md` (setup awal). File ini = **update kit** yang sudah terpasang.

---

## Cara pakai

Paste **seluruh isi file ini** ke Claude Code (di project yang sudah pakai lintasAI). AI akan otomatis cek versi, jelaskan apa yang berubah pakai analogi yang gampang, minta konfirmasi sekali, lalu eksekusi update-nya.

Anggap aja seperti **update aplikasi WhatsApp di HP**: kamu tinggal tekan "Update", aplikasi yang ngurus sendiri - kamu cuma kasih izin sekali di awal.

---

## Prasyarat (cek sekali sebelum update pertama)

**Tidak ada prasyarat apa pun** (sejak v2.8.0). Update mengambil versi terbaru dari **paket npm publik** `lintasai` — **tak butuh akun GitHub, tak butuh akses repo, tak butuh git terpasang**. Kamu cukup punya Node (yang sudah pasti ada kalau kit ini terpasang).

Satu-satunya yang perlu diingat: **tulis `@latest`** → `npx lintasai@latest update`. Tanpa itu, komputermu bisa menjalankan versi lama dari cache dan update jadi tak berefek. Kalau itu terjadi, perintahnya **berhenti sendiri** dan memberitahu perintah yang benar — tak ada risiko salah pasang.

> Prasyarat lama (git + diundang ke repo privat) **sudah DICABUT**. Itu hanya berlaku untuk `--from-repo`, jalur khusus owner/tim yang menguji tag pra-rilis.

---

## Implicit consent

Dengan paste prompt ini, kamu (staff) **memberi izin AI untuk**:

1. Baca `AGENTS.md` + `./.claude-kit/CHANGELOG.md` (cek versi kit yang lagi terpasang).
2. Tanya versi terbaru ke npm (paket publik `lintasai`) — cuma baca, tak butuh akun apa pun.
3. Jalankan `npx lintasai@latest update` kalau memang ada versi baru.
4. Cadangkan kit lama otomatis ke folder `.claude-kit.backup-<cap-waktu>` sebelum menukar.
5. Cleanup backup lama (> 30 hari atau lebih dari 3 versi terakhir).

AI **tidak akan** sentuh file project kamu (kode app, `docs/`, `AGENTS.md` kamu) - itu dilindungi manifest sha256 (sama persis logic-nya kayak `uninstall.mjs`).

---

## Workflow yang AI jalankan

Ikuti urutan ini step-by-step. Jangan skip step kecuali user bilang skip eksplisit.

### Step 0 - SATU perintah untuk semua orang (sejak v2.8.0) — baca dulu

```
npx lintasai@latest update
```

Itu saja. Jalan untuk **SEMUA** pengguna: bahannya diambil dari paket npm publik yang sudah diunduh + diverifikasi npm sendiri — **tak butuh akun GitHub, akses repo, maupun git terpasang**. AI TIDAK perlu lagi menanyakan/menebak "kamu internal atau eksternal".

**Yang WAJIB AI perhatikan:**
1. **Tulis `@latest`.** Tanpa itu `npx` bisa menjalankan versi LAMA (paket `lintasai` yang kebetulan ada di `node_modules` project menang; cache npx juga membekukan versi di npm < 11.2.0). Kalau itu terjadi, updater **berhenti sendiri** + menyebutkan perintah yang benar — ia tak akan diam-diam memasang versi lama.
2. **Kit lama tak perlu pasang ulang.** Perintah di atas menjalankan updater versi TERBARU dari npx, bukan updater lama di `.claude-kit/`. Client di v2.6.0 pun langsung bisa.
3. **Data project aman**: `AGENTS.md`, folder `docs/`, kode app, `.staff-profile.md` **tetap utuh** — yang diganti hanya isi `.claude-kit/`. Versi lama **otomatis dicadangkan** ke `.claude-kit.backup-<cap-waktu>`.
4. **`--from-repo`** = jalur git lama (clone repo tim + verifikasi tanda tangan GPG). HANYA untuk owner/tim yang diundang ke repo privat, mis. menguji tag pra-rilis. Staff biasa tak pernah memerlukannya.
5. **`npm create lintasai@latest` kini untuk PASANG BARU saja**, bukan update. Aturan lama "eksternal harus pasang ulang" **DICABUT** di v2.8.0.

> Untuk staff: kamu cukup bilang **"update"** — AI yang menjalankan. Tak ada lagi pilihan jalur yang perlu kamu pahami.

### Step 1 - Baca versi kit yang terpasang

Buka file:
- `./.claude-kit/CHANGELOG.md` → versi terpasang = **entri PALING ATAS** (sumber hidup; `AGENTS.md` template baru sengaja **tak lagi** menyimpan nomor versi supaya tak basi setelah update).

Catat: `CURRENT_VERSION = v1.x.y`.

### Step 2 - Cek versi terbaru

Dua cara, dua-duanya cuma-baca dan jalan untuk siapa pun:

- **Disarankan**: `npx lintasai@latest update --check-only` — membandingkan versi terpasang vs terbaru di npm memakai urutan semver yang benar (logika resmi `update-kit.mjs`), tanpa mengubah apa pun.
- **Paling ringan**: `npx lintasai@latest doctor` (menyebut "KEDALUWARSA" + perintah update kalau tertinggal), atau `npm view lintasai version` untuk sekadar melihat nomor terbaru.

Catat: `LATEST_VERSION = v1.x.z`. (Sumber kebenaran sebenarnya = `update-kit.mjs` sendiri saat dijalankan; deteksi manual ini hanya untuk **komunikasi ke staff**, bukan keputusan akhir.)

### Step 3 - Bandingkan

Kalau `CURRENT_VERSION == LATEST_VERSION`:
> "Kit lintasAI kamu udah versi terbaru (`v1.x.y`). Kayak buka Tokopedia trus dia bilang 'Sudah versi terbaru' - gak perlu update. Selesai."

Stop di sini. **Jangan** lanjut step 4+.

Kalau beda → lanjut step 4.

### Step 4 - Parse CHANGELOG entries di antara versi

Baca `./.claude-kit/CHANGELOG.md` (lokal = versi lama) **dan** CHANGELOG versi terbaru dari paket npm. Ambil semua entry antara `CURRENT_VERSION` (exclusive) sampai `LATEST_VERSION` (inclusive).

Contoh: current `v1.0.0`, latest `v1.2.0` → parse entry `v1.0.1`, `v1.0.2`, `v1.1.0`, `v1.2.0`.

> Catatan (v2.0.0): entri era pra-npm (< v1.33.0) sudah dipindah ke `CHANGELOG_ARCHIVE.md` (hanya di repo GitHub). Kalau `CURRENT_VERSION` client lebih tua dari entri tertua di CHANGELOG utama → andalkan **entri berlabel** ([SECURITY]/[BREAKING]/[SCAN-REQUIRED]) yang sengaja dipertahankan di CHANGELOG utama; riwayat non-kritis lengkapnya ada di arsip repo.

### Step 5 - Auto-classify per entry ke Tier 1-4

Logic klasifikasi:

| Tier | Trigger label/content | Analogi tools digital |
|------|----------------------|-----------------------|
| **Tier 1 (Silent)** | Patch version bump tanpa label apapun. Isi: typo, fix grammar, link mati. | WhatsApp `2.23.10 → 2.23.11` auto-update di background - kamu gak ngerasa apa-apa, tau-tau udah update. |
| **Tier 2 (AI auto-sync)** | Minor version bump tanpa label. Isi: aturan baru, template baru, section CLAUDE_universal baru. | iPhone `iOS 17.3 → 17.4` minor - fitur baru aktif setelah restart, tapi cara pakai HP-mu gak berubah. |
| **Tier 3 ([BREAKING])** | Label `[BREAKING]` di CHANGELOG. Isi: struktur file pindah, format manifest ganti, naming convention diubah. | iPhone `iOS 16 → iOS 17` major - backup wajib, ada migration screen pas booting pertama. |
| **Tier 4 ([SCAN-REQUIRED])** | Label `[SCAN-REQUIRED]`. Isi: bulk-bootstrap logic ganti, scan rule baru yang harus apply ke project lama. | Tokopedia Seller ganti algoritma kategori - produk lama harus di-remap ulang ke kategori baru, bukan cuma update app. |

Default kalau ragu antara Tier 1 vs Tier 2: pilih **Tier 2** (lebih informatif buat user).
Default kalau ragu antara Tier 3 vs Tier 4: cek apakah ada instruksi "scan project ulang" di CHANGELOG. Ya → Tier 4, tidak → Tier 3.

### Step 6 - Compose summary (Bahasa Indonesia + analogi wajib)

Format laporan ke staff:

```
Update tersedia: v1.0.0 → v1.2.0

Yang berubah:
  [Tier 1: 3 perbaikan kecil]
    Kayak WhatsApp auto-update - ada perbaikan typo & link mati,
    tapi cara kamu pakai kit gak berubah sama sekali.

  [Tier 2: 1 aturan baru]
    Section 4.5 di CLAUDE_universal_v1.md ("Audit Post-Setup Pattern").
    Kayak iPhone dapat fitur baru di iOS minor update - AI otomatis
    mulai pakai aturan ini abis update. Kamu gak perlu hafal.

  [Tier 3 (perubahan besar): kosong]
  [Tier 4 (perlu periksa ulang project): kosong]

Yang ke-update: 4 file di ./.claude-kit/
Yang ke-backup otomatis: ./.claude-kit.backup-2026-06-04/
Yang DILINDUNGI (gak disentuh):
  - File project kamu (kode app, docs/, dll)
  - AGENTS.md kamu (aturan khusus yang kamu atur sendiri untuk project ini)

Yang perlu kamu lakuin abis update:
  TIDAK ADA - langsung lanjut kerja seperti biasa.
  AI akan otomatis pakai aturan baru di sesi berikutnya.
```

Kalau ada Tier 3 → tambah section:
```
  PERHATIAN [BREAKING] (perubahan besar — ada langkah wajib yang harus dijalankan sebelum lanjut kerja):
    [judul perubahan]
    Langkah penyesuaian (penataan ulang — disalin dari catatan perubahan kit):
      1. <perintah yang AI jalankan — kamu cukup setuju>
      2. <perintah yang AI jalankan — kamu cukup setuju>
    Estimasi waktu: <X menit>
```

Kalau ada Tier 4 → tambah section:
```
  PERHATIAN [SCAN-REQUIRED] (project kamu perlu diperiksa ulang sekali):
    Abis update, paste JALANKAN_KIT.md ulang biar AI scan project
    pakai aturan baru. Kayak Tokopedia minta produk lama ditata
    ulang ke kategori baru.
```

### Step 7 - Popup konfirmasi

Tanya staff — tampilkan sebagai **kotak pilihan klik** (`AskUserQuestion`) kalau tersedia; blok di bawah = isi kanonik + fallback teks (per `JALANKAN_KIT.md` > "Cara Tampil Popup"):
> "Lanjut update sekarang?
>   [1] Ya, update sekarang (rekomendasi) — biar kit ikut versi terbaru, ada backup otomatis + bisa dibalikin
>   [2] Tidak, nanti saja
>   [cancel] Batalkan proses update
> (Pilih dengan KLIK [1] / [2] / [cancel] — TIDAK ada default otomatis untuk keputusan update; diam = tunggu, bukan 'Ya'.)"

> ⚠️ PENTING: update = mengganti isi `.claude-kit/`. Walau ada backup + rollback, ini perubahan nyata → **WAJIB konfirmasi eksplisit** (sesuai §4.5 "jangan auto-execute update tanpa confirm" + §8.2 Aturan 5). Kalau staff **belum** memilih [1] / [2] / [cancel] → **JANGAN auto-jalan**; tunggu pilihannya (boleh ulangi popup sekali). **Diam ≠ setuju.**

Pengecualian satu-satunya: kalau project memang **eksplisit** mengaktifkan Mode Auto-Confirm di `AGENTS.md` (§15, default MATI), baru boleh anggap silence = [1]. Kalau "[2]" / "[cancel]" → batalkan. Kalau "[1]" (atau auto-confirm aktif) → lanjut step 8.

Kalau "[2]" atau "[cancel]" → "Oke, update di-cancel. Kit masih di `v1.x.y`. Paste prompt ini lagi kalau berubah pikiran." → stop.

### Step 8 - Execute update

Jalankan (satu perintah, jalan di semua mesin ber-Node — tak butuh git/akun GitHub):
```
npx lintasai@latest update
```
> **`@latest` wajib ditulis.** Tanpa itu `npx` bisa memakai versi lama dari cache/`node_modules` → updater menolak jalan + menyebut perintah yang benar (tak akan diam-diam memasang versi lama).

Script ini yang akan:
1. Menyiapkan kit versi terbaru (dari paket npm yang sudah diunduh + diverifikasi npm) di folder sebelah, **memeriksa kelengkapannya**, lalu menukar. Gagal sebelum tukar → kit lama **tak tersentuh**.
2. Cadangkan folder lama ke `.claude-kit.backup-<cap-waktu>`.
3. Cek manifest sha256 → file yang user modify (selain template) di-preserve.
4. Cleanup cadangan lama — **hanya kalau** dijalankan dengan `--cleanup-backups` (default: tidak menghapus apa pun).
5. Versi kit dibaca **otomatis** dari baris atas `./.claude-kit/CHANGELOG.md` — **tidak perlu** edit `AGENTS.md` manual (template baru sengaja tak menyimpan nomor versi supaya tak basi). Script tidak menyentuh `AGENTS.md` (itu file project-mu).

Kalau script fail di tengah jalan → auto-rollback (kit balik ke `CURRENT_VERSION`). Lapor error ke staff.

### Step 9 - Laporan hasil + recommend next step

Format laporan sukses:
```
Update beres. Kit sekarang v1.2.0.

Backup tersimpan di: ./.claude-kit.backup-2026-06-04/
Backup lama yang dihapus otomatis (beres-beres rutin): <list, kalau ada>

Langkah berikutnya yang AI sarankan:
  [kalau ada Tier 4] Paste JALANKAN_KIT.md supaya AI periksa ulang project kamu (scan).
  [kalau ada Tier 3] Ikuti langkah penyesuaian (Migration Steps) di atas.
  [kalau cuma Tier 1/2] Lanjut kerja biasa - gak perlu apa-apa.
```

Lalu popup interaktif — tampilkan sebagai **kotak pilihan klik** (`AskUserQuestion`) kalau tersedia (4 opsi utama; `[help]` lewat "Other"); blok di bawah = isi kanonik + fallback teks:
> "Mau lanjut ke step apa?
>   [1] Lanjut task sebelumnya - update sukses, balik kerja (rekomendasi, default) — paling aman, cuma balik kerja, tidak mengubah apa-apa
>   [2] Cek file yang berubah (AI tampilkan perbandingan isi lama vs baru — kayak Track Changes di Word)
>   [3] Balikin ke versi lama (kembalikan kit ke sebelum update)
>   [4] Selesai (tutup sesi ini)
>   [help] Jelaskan apa yang berubah di kit sebelum aku pilih
>
> Default (Enter/kosong) -> [1] Lanjut task sebelumnya"

Ini menu **pasca-update-sukses** (non-destruktif): kalau staff diam, default ke **[1] Lanjut task** itu AMAN (cuma balik kerja). TAPI **[3] Balikin ke versi lama** = aksi nyata → WAJIB dipilih eksplisit, jangan dijalankan dari "diam". (Beda dari Step 7: di Step 7 update BELUM jalan, jadi "diam ≠ setuju"; di sini update SUDAH sukses, menu cuma soal langkah berikutnya.)

---

## Mapping intent staff → langkah

| Staff bilang | AI jalankan |
|--------------|-------------|
| "v1.2.0 rilis, update dong" | Full workflow step 1-9. |
| "lintasAI ada versi baru?" | Step 1-3 doang (cek saja, gak update). |
| "update kit" | Full workflow. |
| "rollback dong, update tadi bikin error" | Rollback flow: cari folder `.claude-kit.backup-<tanggal>` terbaru, rename `.claude-kit/` jadi `.claude-kit.broken-<tanggal>/`, rename backup jadi `.claude-kit/`. Lapor ke staff. (`AGENTS.md` tak perlu disentuh — template baru tak menyimpan nomor versi.) |
| "update tapi keep file customization saya" | Full workflow + jelasin di summary: "Tenang, kit simpan daftar sidik jari tiap file (manifest sha256) yang melindungi file editan kamu. Kayak Google Drive sync — file yang kamu ubah di lokal gak ketimpa versi cloud." |
| "kit saya pake versi berapa?" | Step 1 doang. Lapor versi current. |
| "hapus backup lama" | Cleanup manual: list `.claude-kit.backup-*`, hapus yang > 30 hari atau lebih dari 3 versi terakhir. Lapor space yang di-free. |

---

## Tone & gaya komunikasi

- **Senior dev jelasin ke junior staff** - sabar, gak nyinyir, gak pakai jargon kering.
- **Analogi tools digital populer WAJIB** tiap kali jelasin konsep teknis. Pool analogi: Tokopedia, Shopee, Gojek, WhatsApp, BCA mobile, Excel, Google Drive, Notion, Discord, iPhone, Spotify, Netflix.
- **Pendek > panjang**. Staff sibuk, gak baca dinding teks.
- **Konfirmasi sekali di awal**, abis itu jalan terus sampai selesai.

---

## Closing message setelah update

Setelah step 9 dieksekusi dan staff jawab popup (atau diam = default), tutup dengan:

> "Update kit beres. Kalau ada perilaku AI yang berubah aneh abis ini, paste `JALANKAN_KIT.md` untuk menyamakan ulang aturan kit (re-sync). Atau bilang ke aku: 'rollback dong'. Aman."

End sesi update.
