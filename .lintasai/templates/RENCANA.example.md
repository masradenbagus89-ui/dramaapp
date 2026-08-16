# RENCANA — bentuk baku rencana kerja lintasAI (CONTOH + aturan isinya)

> **Rumah TUNGGAL bentuk rencana.** Kernel `AGENTS.md` §4.4 dan `skills/cek-permintaan/SKILL.md` hanya
> MERUJUK berkas ini — jangan salin isinya ke sana (dua salinan pasti menyimpang).
>
> **Cara pakai:** salin kerangka di bawah jadi `docs/lintasai/rencana/YYYY-MM-DD-<topik>.md` di project
> client, isi, lalu catat 1 baris penunjuknya di `docs/lintasai/INDEX.md`.
>
> **JANGAN** menaruh rencana di dalam folder kit (`.lintasai/`) — ditimpa saat update. Folder
> `docs/lintasai/` milik project client, tak pernah ditimpa.

## 0. Isi rencana per anak tangga (kernel §4.0)

Kernel menetapkan bobot tugas DULU; berkas ini yang menentukan bentuk isinya. Tangga memilih **ukuran**
output — bukan melonggarkan mutu (pagar keamanan · anti-ngarang · bahasa non-programmer · QA/QC tetap
nyala di semua tangga).

| Tangga | Seksi yang dipakai | Contoh permintaan client |
|---|---|---|
| **JAWAB** | tak ada rencana — jawab langsung | "file login-nya yang mana?" |
| **RINGAN** | 3-6 baris polos: apa diubah · berkas mana · cara cek. Tanpa tabel, tanpa 2-versi, tanpa simpan berkas | "tombolnya ganti jadi 'Beli Sekarang'" |
| **SEDANG** | Ringkasan · ✅ Terverifikasi · ❓ Asumsi · Yang TIDAK dibangun · **Yang ikut tersenggol** · Langkah kerja · pasangan 2-versi di seksi utama | "kasir sama riwayat pesanan pakai hitungan total yang sama, tolong benerin" |
| **BERAT** | semua isi SEDANG + **Lima kepala bahasan** + **Tahapan** + pre-mortem 1 kalimat; WAJIB disimpan jadi berkas | "bikin fitur bayar pakai Midtrans" |

Ragu antara dua tangga → pakai yang **lebih tinggi**. Naik tangga di tengah jalan (ketemu fakta baru)
boleh — sebut alasannya 1 kalimat, jangan diam-diam.

## 1. Kapan rencana WAJIB disimpan jadi berkas

Simpan bila **salah satu** benar:

- tugas menyentuh **titik-risiko**: login · bayar · data pribadi · skema DB · rilis
- rencananya **lebih dari 3 langkah**

Di luar itu cukup disampaikan di chat (jangan bikin upacara). Sesudah menyimpan: beri tahu client **1
kalimat** — berkas apa & kenapa dibuat (§1.6). Sesi berikutnya membacanya lewat kernel §4.1 (INGATAN
PROJECT) sebagai titik-acuan "apa yang dulu disepakati".

## 2. Kerangka (salin mulai dari sini)

```markdown
# Rencana: <judul singkat>

- **Tanggal:** YYYY-MM-DD
- **Diminta client:** "<kalimat asli client, apa adanya>"

## Ringkasan
<1 paragraf bahasa awam: apa yang akan dibangun/diubah + hasil akhirnya apa bagi client.>

## ✅ Terverifikasi (sudah dibaca di kode)
- <fakta> — `berkas:baris`

## ❓ Asumsi (BELUM dikonfirmasi client)
- <asumsi yang menyetir hasil, mis. "pembayaran pakai Midtrans">

## Yang TIDAK dibangun (sengaja, biar tak salah harap)
- <hal yang client mungkin kira ikut, padahal tidak>

## Yang ikut tersenggol
| Fitur/halaman lain yang memakai bagian ini | Sudah ada penjaganya? |
|---|---|
| <nama yang client kenal, mis. "halaman checkout"> | ✅ ada tes / ⚠️ belum ada |

Nihil? tulis terus terang: "tidak ada bagian lain yang memakai ini — sudah dicek di `<berkas>`".

## Lima kepala bahasan (khusus fitur BARU — 1 baris cukup per hal)
1. **Alur pengguna:** <dari klik pertama sampai selesai>
2. **Data & siapa boleh lihat:** <apa yang disimpan · siapa boleh membaca/mengubah>
3. **Kalau gagal:** <apa yang user LIHAT saat error/timeout/koneksi putus>
4. **Batas/skala:** <berapa data/pengguna yang wajar ditampung>
5. **Cara uji:** <langkah klik yang bisa client coba sendiri + tes otomatis yang dipasang>

Tidak relevan → tulis `n/a` + alasan singkat. JANGAN dihapus diam-diam.

## Tahapan (kalau permintaan dipecah)
1. <tahap-1 — dikerjakan sampai terbukti jalan dulu>
2. <tahap-2 — kenapa sesudah tahap-1>

## Langkah kerja
1. <langkah>
```

## 3. Kenapa tiap seksi ada (jangan dipangkas tanpa alasan)

| Seksi | Kenapa ada |
|---|---|
| ✅ / ❓ dipisah | client tahu mana yang sudah pasti vs mana yang masih tebakan AI — asumsi salah ketahuan SEBELUM dikerjakan |
| Yang TIDAK dibangun | mencegah "kupikir sekalian jadi" — sumber kekecewaan paling sering |
| **Yang ikut tersenggol** | client non-programmer tak tahu satu perubahan bisa merusak fitur lain; daftar ini yang membuatnya kelihatan SEBELUM disetujui. Isinya dari pencarian pemanggil (kernel §4.4), ditulis pakai nama yang client kenal — bukan nama fungsi |
| Lima kepala bahasan | rencana yang cuma menyebut nama fitur belum menjawab hal yang bikin aplikasi rusak di dunia nyata (data bocor · gagal tanpa pesan · tak teruji) |
| Tahapan | permintaan besar yang dipaksa jadi 1 rencana pasti meleset |

Rak terkait: data & hak akses → `skills/database` + `skills/auth` · perilaku saat gagal →
`skills/tahan-gagal` · cara uji → `skills/cakupan-tes` · serah-terima hasil → `skills/cek-permintaan`.

## 4. Contoh terisi (ringkas)

```markdown
# Rencana: tombol "cetak struk" di halaman kasir

- **Tanggal:** 2026-08-03
- **Diminta client:** "kasirnya bisa cetak struk dong"

## Ringkasan
Menambah tombol Cetak di halaman kasir yang memunculkan struk siap-cetak berisi rincian pesanan.

## ✅ Terverifikasi
- Halaman kasir sudah ada — `app/kasir/page.tsx:1`
- Total pesanan dihitung di satu tempat — `lib/hitung-total.ts:12`

## ❓ Asumsi
- Struk cukup dicetak dari browser (belum pakai printer thermal khusus)

## Yang TIDAK dibangun
- Kirim struk ke email/WhatsApp pembeli

## Yang ikut tersenggol
| Fitur/halaman lain yang memakai bagian ini | Sudah ada penjaganya? |
|---|---|
| Halaman "Riwayat pesanan" (memakai perhitungan total yang sama) | ⚠️ belum ada tes |

## Lima kepala bahasan
1. **Alur pengguna:** kasir klik Cetak → struk muncul → dialog cetak browser
2. **Data & siapa boleh lihat:** hanya baca pesanan yang sedang dibuka; kasir lain tak bisa membuka pesanan orang lain
3. **Kalau gagal:** data pesanan gagal dimuat → tampil "Struk belum bisa dibuat, coba lagi" + tombol ulang
4. **Batas/skala:** 1 struk per cetak; maks 50 baris item
5. **Cara uji:** buka /kasir → pilih pesanan → klik Cetak → angka total di struk HARUS sama dengan di layar
```

## 5. Terkait

- Ambang + kewajiban menyimpan: kernel `AGENTS.md` §4.4 (berkas ini yang dirujuk)
- Ingatan lintas-sesi + baris penunjuk: `templates/BUKU_PELAJARAN.example.md` → `docs/lintasai/INDEX.md`
- Membandingkan hasil vs rencana ini saat serah-terima: `skills/cek-permintaan/SKILL.md`
