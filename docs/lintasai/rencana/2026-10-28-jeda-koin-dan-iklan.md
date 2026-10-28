# Rencana: JEDA fitur koin & iklan (bisa dinyalakan kembali)

> 2026-10-28 · diminta owner: *"koin kita pending saja, semua fitur yang berhubungan dengan koin
> & iklan dihapus, simpan filenya biar sewaktu-waktu bisa diaktifkan kembali."*

## 0. Ringkas

**APA:** seluruh fitur koin (dompet, paywall episode, top-up, check-in) dan seluruh iklan
(iklan berhadiah + banner sponsor) **berhenti tampil & berhenti melayani** — tapi **nol berkas
dihapus atau dipindah**. Dikendalikan dua saklar di satu berkas.

**KENAPA cara ini, bukan menghapus berkas** (keputusan owner, 2026-10-28, dari 2 pilihan yang
disajikan): menyalakan kembali = mengubah 2 baris, hitungan menit, risiko nol. Kalau berkasnya
dipindah, menyalakan kembali berarti **merakit ulang** — puluhan berkas lain memanggilnya.

👨‍🎓 **Junior-frontend:** feature flag (saklar fitur) di satu modul, dibaca oleh komponen & route;
komponen yang mati `return null` dan route-nya membalas 404. Logika paywall TIDAK dibongkar —
tesnya di-pin ke `PAYWALL_ENABLED: true` lewat `vi.mock`, jadi perilaku "saat dinyalakan" tetap
terbukti hijau walau situs sedang jeda.
🙂 **Non-programmer:** satu tombol induk dimatikan. Semua yang berbau koin & iklan langsung
hilang dari situs, tapi kodenya tetap utuh di tempatnya seperti barang yang disimpan di gudang —
bukan dibuang. Dinyalakan lagi kapan pun tanpa membangun ulang.

## 1. Pre-mortem (§4.4) — anggap ini sudah dikerjakan dan hasilnya NOL guna

**Penyebab paling mungkin:** ada **sisa** koin/iklan yang masih kelihatan di satu sudut yang tak
terpetakan, sehingga "pending" tidak benar-benar pending dan owner tetap menemukannya di situs.
Penyebab kedua: saklar dimatikan tapi ada kode yang mengandaikan dompet SELALU ada, lalu halaman
jadi error — lebih buruk daripada sebelum dijeda.

**Masuk ke rencana:** (a) daftar periksa di §2 dibuat dari hasil `grep` menyeluruh, bukan ingatan,
dan tiap baris dibuktikan satu per satu; (b) situs dijalankan sungguhan secara lokal sesudah
saklar mati, lalu halaman & route diukur — bukan cuma dibaca.

## 2. Daftar periksa — apa yang dimatikan & di mana

### Saklar induk (SUMBER TUNGGAL)

`lib/saklar-fitur.ts` — berkas BARU, isinya 2 konstanta: `PAYWALL_ENABLED`, `ADS_ENABLED`.
`lib/coins.ts` tetap mengekspor `PAYWALL_ENABLED` (re-export) supaya **10+ berkas pemanggilnya
tidak perlu diubah** dan definisinya tetap SATU.

### Koin — `PAYWALL_ENABLED = false`

| # | Tempat | Keadaan sebelum | Tindakan |
|---|---|---|---|
| 1 | `app/components/CoinChip.tsx` (badge saldo di header & bar cari) | sudah ber-saklar ✅ | nol |
| 2 | `app/components/CoinWallet.tsx` (toko koin di profil) | `return null` ✅ **TAPI** `useEffect`-nya tetap memanggil `/api/coins` | **tambah penjaga di efeknya** |
| 3 | `app/components/player/EpisodePaywall.tsx` (layar episode terkunci) | ikut mati lewat `isEpisodeLocked` ✅ | nol |
| 4 | `app/components/FeedPlayer.tsx` | memanggil dompet TANPA syarat tiap pemutar dibuka | **lewati panggilan dompet saat saklar mati** |
| 5 | `app/components/profile/DashboardMenu.tsx` | menu **"Premium / Koin"** tetap tampil | **sembunyikan** |
| 6 | `app/drama/[id]/page.tsx:143` | chip **🪙 PREMIUM** di sebelah judul | **sembunyikan** |
| 7 | `app/api/coins/*` (6 route: wallet · unlock · unlock-all · reward · checkin · topup · history) | **tidak melihat saklar** — masih bisa dipanggil langsung | **404 + pesan** saat saklar mati |
| 8 | `lib/paywall-guard.ts` (gerbang server) | sudah ber-saklar ✅ | nol |

### Iklan — `ADS_ENABLED = false`

| # | Tempat | Keadaan sebelum | Tindakan |
|---|---|---|---|
| 9 | `app/components/AdBanner.tsx` (banner di `/drama/[id]` + `/profile`) | **tanpa saklar** | **`return null`** — digerbang di komponennya, sekali untuk kedua halaman |
| 10 | `app/components/RewardedAdModal.tsx` (tonton iklan dapat koin) | **tanpa saklar** | **`return null`** |
| 11 | `app/api/ads` + `app/api/ads/event` | **tanpa saklar** | **404** |
| 12 | `app/admin/page.tsx` → `<SponsorAdsManager />` | selalu tampil | **sembunyikan** |
| 13 | `app/components/admin/AdminSidebar.tsx:39` menu "Iklan Sponsor" | selalu tampil | **sembunyikan** |
| 14 | `app/api/admin/ads` | **tanpa saklar** | **404** |

### Ditemukan BELAKANGAN (tidak ada di peta awal — lihat §8)

| # | Tempat | Keadaan sebelum | Tindakan |
|---|---|---|---|
| 15 | `lib/nav-katalog.ts:213` chip filter **"Pakai Koin"** di menu "+ More" halaman depan | **tanpa saklar**, dan peta awal salah menyimpulkan tombolnya tak ada | hitungan drama berbayar dipaksa **0** → chip "Pakai Koin" + "Gratis" hilang lewat syarat yang sudah ada |

## 3. ⭐ CARA MENYALAKAN KEMBALI (baca ini dulu di masa depan)

1. Buka `lib/saklar-fitur.ts`.
2. Ubah `false` → `true` pada saklar yang mau dinyalakan (dua-duanya boleh dinyalakan terpisah:
   koin saja, iklan saja, atau keduanya).
3. Perbarui **tripwire** di `tests/jeda-koin-iklan.test.ts` (tes pertama) supaya cocok dengan
   keadaan baru. Tes itu SENGAJA merah saat saklar dinyalakan — begitulah ia memaksa penyalaan
   jadi tindakan sadar. Tes paywall & iklan lainnya **tidak** perlu diubah: mereka sudah memaku
   saklarnya menyala lewat `vi.mock`.
4. Jalankan gerbang §6: `rm -rf .next` → `npm run build` → `npx tsc --noEmit` → `npm test`.
5. Push ke `origin` **dan** `dramaku`.

**Tidak ada langkah lain.** Tidak ada migration SQL, tidak ada env baru, tidak ada berkas yang
harus dikembalikan. Saldo & riwayat pembelian penonton tetap utuh di database, jadi begitu
dinyalakan, episode yang pernah dibeli penonton **langsung terbuka lagi** seperti sebelumnya.

## 4. Yang SENGAJA TIDAK disentuh (dan kenapa)

- 🔴 **Database: NOL perubahan.** Saldo koin, daftar episode terbuka, riwayat transaksi, daftar
  iklan sponsor — semuanya dibiarkan apa adanya. Inilah yang membuat "nyalakan kembali" utuh.
  Menghapusnya berarti penonton yang sudah membayar kehilangan haknya **tanpa bisa dipulihkan**.
- 🟡 **`app/api/coins/webhook` (panggilan balik Midtrans) TETAP HIDUP.** Ini pengecualian sadar.
  Kalau ada pembayaran yang sudah berjalan sebelum saklar dimatikan, webhook inilah yang
  mencatatnya; mematikannya = ada orang membayar lalu koinnya tak pernah masuk. Karena top-up
  sudah ditutup (#7), tak ada pembayaran BARU yang bisa dimulai.
  ⚠️ **Untuk owner:** kalau ingin benar-benar memastikan nol uang masuk, hapus juga
  `MIDTRANS_SERVER_KEY` di panel hosting. Tanpa kunci itu, top-up jatuh ke mode demo.
  (Di mesin kerja kunci itu memang tidak ada; isi panel hosting hanya owner yang bisa melihat.)
- 🟢 **Tanda `premium` pada drama TIDAK dicabut.** Itu DATA, bukan fitur. Dicabut = daftar drama
  mana yang berbayar ikut hilang, dan saat dinyalakan lagi owner harus menandai 13 drama satu per
  satu. Chip "🪙 Premium" di poster memang sudah dicabut owner 2026-09-23 — tak ada yang berubah
  di kartu.
- 🟢 **`lib/lencana-kartu.ts` tidak disentuh.** Di situ `premium` ikut memutuskan kapan penanda
  **EXCLUSIVE** dipajang (hanya kalau BUKAN premium). Menyentuhnya akan memunculkan penanda
  EXCLUSIVE di 13 drama yang tadinya tidak punya — perubahan tampilan yang **tidak diminta**.
- ❌ **KOREKSI — filter `?akses=koin` TERNYATA punya tombol, dan sudah ikut dimatikan.**
  Baris ini semula berbunyi *"tidak ada tombolnya di layar, hanya bisa dipicu dengan mengarang
  alamat sendiri"* — **salah**, dan kesalahannya tertangkap saat memindai HTML sungguhan (lihat
  §8). Chip **"Pakai Koin"** ada di menu "+ More" halaman depan, lahir dari
  `lib/nav-katalog.ts:213`. Sudah digerbang: hitungan drama berbayar dipaksa **0** saat saklar
  mati, sehingga chip "Pakai Koin" **dan** "Gratis" hilang sendiri lewat syarat `koin > 0` yang
  sudah ada — tanpa percabangan baru. Alamat `?akses=koin` yang diketik tangan masih menyaring
  drama bertanda `premium` (hasilnya tetap benar, cuma tak ada lagi pintu masuk ke sana).

## 5. Akibat yang owner akan rasakan (dikatakan terus terang)

- **Episode 4 ke atas dari 13 drama premium menjadi GRATIS untuk semua orang.** Ini konsekuensi
  langsung: tanpa koin, tak ada cara membuka episode, jadi kalau paywall dibiarkan menyala
  penonton menabrak dinding mati. Pemasukan dari koin **berhenti** selama dijeda.
- **Penghasilan iklan juga berhenti** (pilihan owner: "ikut matikan semua").
- **Pagar keamanan video TIDAK ikut lepas.** Alamat video tetap lahir di server & tetap
  ditandatangani, tunnel tetap menolak alamat polos (Tahap A+B, 27 Okt). Yang berubah hanya
  SIAPA yang berhak — sekarang semua orang, untuk semua episode.

## 6. Tahapan

1. **Saklar + gerbang server** — `lib/saklar-fitur.ts`, re-export di `lib/coins.ts`, 404 untuk
   8 route API (#7, #11, #14). Tak terlihat penonton.
2. **UI** — #2, #4, #5, #6, #9, #10, #12, #13.
3. **Tes** — tes paywall/koin yang ada di-pin ke saklar MENYALA (supaya jalur "dinyalakan lagi"
   tetap terbukti), lalu tes BARU yang mengunci keadaan JEDA: route 404, komponen nol.
4. **Gerbang §6 + bukti** — build → tsc → `npm test` → **jalankan situs lokal sungguhan** lalu
   ukur halaman & route (bukan dibaca, dijalankan).
5. **Rilis** — hanya atas izin owner; dual push `origin` + `dramaku`.

## 7. Bukti yang wajib ada sebelum bilang selesai

- `npm test` hijau, termasuk tes BARU keadaan jeda **dan** tes paywall yang di-pin menyala.
- Situs lokal: `/`, `/beranda`, `/profile`, `/drama/<id>`, `/feed/<id>`, `/admin` → **200**, dan
  **nol** kata "koin"/"Koin"/"iklan" di HTML-nya.
- Route koin & iklan → **404**; `/api/coins/webhook` → **tetap hidup**.
- Episode 4 drama premium tanpa login → **200** (sudah gratis), alamatnya tetap bertanda tangan.
- Katalog tetap **40 drama**; `/api/health` tetap `sumberData:"database"`.

## 8. HASIL — terukur 2026-10-28, sebelum rilis

Gerbang §6: `rm -rf .next` → build **sukses** → `tsc` **exit 0** → **1.636 tes hijau**
(116 berkas; dari 1.630 → −2 tripwire yang dipindah → +8 tes baru keadaan jeda).

**Situs dijalankan sungguhan** (`next start`, port 3999) lalu diukur:

| Diukur | Hasil |
|---|---|
| 10 route koin & iklan | semua **404** + pesan sebab (`"Fitur koin sedang tidak aktif."`) |
| `/api/coins/webhook` (Midtrans) | **403** — hidup, tidak digerbang (pengecualian §4 bekerja) |
| 18 halaman penonton + `/admin` | **200**, dan **NOL** jejak kata koin/iklan/PREMIUM/saldo/top-up/AdSense |
| `/api/video-url` ep 1·3·4·20·99 tanpa login | **200** — paywall benar-benar terbuka |
| Alamat `.mp4` di HTML `/feed` | tetap **0** (pagar Tahap A utuh) |
| Katalog lokal | **33477 byte**, sama seperti produksi |
| Uji balik: saklar dinyalakan sementara | **7 dari 8** tes jeda langsung MERAH (yang 1 lulus = webhook, memang tak pernah digerbang) |

Uji balik itu sekaligus bukti **menyalakan kembali benar-benar bekerja**: route melayani lagi,
komponen menggambar lagi, tanpa satu pun berkas dipindahkan.

### 🪤 Pelajaran proses: PETA dari `grep` sempat MELEWATKAN satu tombol yang terlihat

Pemetaan awal menyimpulkan filter `?akses=koin` "tidak punya tombol di layar, hanya bisa dipicu
dengan mengarang URL" — dan itu **SALAH**. Chip **"Pakai Koin"** memang ada di menu "+ More"
halaman depan, lahir dari `lib/nav-katalog.ts:213`; berkas itu ikut muncul di hasil grep awal tapi
diklasifikasikan tanpa dibuka. Yang menangkapnya: **memindai HTML yang benar-benar dikirim** dari
situs yang berjalan — di situ `/` membalas 2 jejak sementara 17 halaman lain nol.

**Aturan:** untuk fitur yang "dimatikan", daftar dari `grep` adalah titik-mulai, **bukan bukti**.
Buktinya adalah keluaran yang dikirim ke penonton. Pola yang sama berlaku di luar koin: fitur yang
dimatikan lewat saklar tidak menimbulkan error apa pun kalau satu pemanggil terlewat — halamannya
tetap 200 dan build tetap hijau.

### ⚠️ Yang TIDAK bisa diuji dari mesin kerja (dan kenapa itu bukan masalah)

Alamat video lokal terbit **tanpa tanda tangan**, karena `VIDEO_SIGNING_SECRET` tidak ada di mesin
kerja (kuncinya hanya di panel hosting + PC backup) — perilaku yang memang disengaja sejak 27 Okt.
Jadi "tanda tangan masih terpasang" tak bisa dibuktikan dari sini. Buktinya lewat jalur lain:
`lib/video-signature.ts` dan `app/api/video-url/route.ts` **tidak tersentuh** sama sekali oleh
perubahan ini, jadi jalur penandatanganan di produksi tidak berubah.
