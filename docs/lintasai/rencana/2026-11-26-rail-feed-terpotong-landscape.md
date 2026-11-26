# 2026-11-26 — Rail ikon `/feed` keluar layar saat HP DIMIRINGKAN (temuan, DITUNDA owner)

> **Status: DICATAT, BELUM DIKERJAKAN.** Owner memutuskan 2026-11-26: *"catat aja dulu"*.
> Berkas ini ada supaya kalau nanti dikerjakan, pengukurannya tak perlu diulang dari nol.
> Bukan rencana yang disetujui — opsi di bawah belum pernah disajikan ke owner.

## 1. Gejalanya

Di pemutar drama `/feed/[id]`, deretan ikon di tepi kanan (`ActionRail`) **pucuknya berada di
luar layar** ketika HP dimiringkan (landscape). Tombol yang tidak terlihat juga **tidak bisa
diketuk** — jadi ini bukan sekadar soal tampilan.

Memiringkan HP justru cara umum orang menonton video, jadi ini bukan kasus pinggiran.

## 2. Angka — DIUKUR, bukan dihitung

Diukur dengan Chrome + CDP, lebar/tinggi halaman **dipaksa** lewat
`Emulation.setDeviceMetricsOverride`. ⚠️ **Jangan pakai `--window-size`** — itu mengatur jendela,
bukan `innerWidth`/`innerHeight` halaman, sehingga uji "muat di layar HP" bisa LOLOS PALSU.

Halaman uji: `https://layarindo.com/feed/master-pedang-yang-diremehkan?ep=1`
Rail terukur **tinggi 366px**, **7 item** (avatar · Suka · Komen · Simpan · Bagikan · Lapor · Chat).

**HP TEGAK — AMAN.** Kekhawatiran rekan di berkas serah-terima (rail mendekati tombol
Kembali/gerigi) **tidak terbukti** pada ukuran HP yang wajar:

| Layar | Pucuk rail | Dasar tombol gerigi | Jarak |
|---|---|---|---|
| 360×640 | 146 | 44 | **+102px** ✅ |
| 360×560 | 66 | 44 | **+22px** ✅ mepet |
| 375×500 | 6 | 44 | **−38px** ❌ tabrakan |
| 320×480 | −14 | 44 | **−58px** ❌ tabrakan |

Ambangnya: tinggi halaman **di bawah ~540px** mulai bertabrakan.

**HP DIMIRINGKAN — rail keluar layar:**

| Layar | Pucuk rail | Yang hilang |
|---|---|---|
| 640×360 | **−134px** | avatar + Suka hilang penuh, Komen separuh |
| 844×390 | **−104px** | avatar + Suka |
| 915×412 | **−82px** | avatar + sebagian Suka |

## 3. Kenapa — dan satu kekeliruan yang jangan diwarisi

⚠️ **Dugaan pertama AI SALAH:** dihitung seolah rail digantung dari dasar **layar**. Yang benar,
rail digantung dari dasar **kotak video** — panggung ber-`maxWidth: calc(100dvh * rasio)` /
`maxHeight: calc(100vw / rasio)` di `app/components/FeedPlayer.tsx:785`. Titik gantungnya ikut
rasio video, jadi hitungan kasar dari tinggi layar TIDAK berlaku. Ukur, jangan hitung.

Susunan rail (`app/components/ActionRail.tsx:132`): `absolute bottom-32 right-2 flex flex-col
gap-2`. Tiap tombol = ikon 36px + teks 9px + jarak 2px = **47px**, jarak antar item 8px, avatar
36px tanpa teks. Rumus itu cocok dengan hasil ukur (36 + 6×47 + 6×8 = 366). Rail tumbuh ke ATAS
karena digantung dari bawah.

**Bukan sepenuhnya bug baru.** Hitungan (BUKAN ukuran) menunjukkan sebelum tombol **Lapor** &
**Chat** ditambahkan (rilis `bf681c7`, 2026-11-26), rail 110px lebih pendek — terpotongnya hanya
~24px, nyaris tak terasa. Rilis itu **memperparah** masalah lama, bukan menciptakannya. Jangan
salah menyalahkan.

⚠️ **Belum diukur:** drama yang punya sumber unduhan memunculkan tombol **Unduh** → 8 item,
+55px. Jangan dianggap sama dengan angka di atas.

## 4. Arah perbaikan yang mungkin (BELUM disajikan ke owner)

Semua masih mentah — butuh popup pilihan seperti perbaikan `/tonton` (2026-11-26), karena
hasilnya terasa oleh penonton:

- **Rail bisa digulir** saat tidak muat — tak ada tombol hilang, tapi penonton harus tahu bisa
  digulir (penemuan rendah).
- **Kecilkan rail di layar pendek** — mis. buang teks label di bawah ikon saat tinggi < 500px
  (hemat ~11px per item = ~77px), atau ikon 36px → 32px.
- **Pindahkan sebagian ke menu** — mis. Lapor & Chat masuk satu tombol "Bantuan".
- **Rail mendatar di landscape** — pindah ke bawah layar, mengikuti bentuk layar.

Pilihan 2 paling kecil risikonya; pilihan 4 paling benar secara tata letak tapi paling banyak
mengubah yang sudah tayang.

## 5. Cara mengulang pengukuran

Chrome ada di `C:\Program Files\Google\Chrome\Application\chrome.exe`. Pola yang terbukti jalan:

1. Jalankan Chrome: `--headless=new --remote-debugging-port=9222 --user-data-dir=<folder baru>`
2. Buat tab baru lewat `PUT http://127.0.0.1:9222/json/new?about:blank`, sambung WebSocket-nya.
3. `Runtime.enable` → `Page.enable` → `Emulation.setDeviceMetricsOverride {width,height,mobile:true}`
   → `Page.navigate` → tunggu ~10 detik → `Runtime.evaluate` membaca `getBoundingClientRect()`.
4. **Timeout per-perintah WAJIB** — tanpa itu kegagalan tampil sebagai gantung tanpa pesan apa pun.

🪤 **Localhost TIDAK bisa dipakai.** Video drama tak bisa diputar dari localhost (lihat
`docs/panduan-lokal-rekan.md`), dan saat video gagal **rail tidak dirender sama sekali** — layar
terlihat "bersih tanpa rail", gampang disalahartikan sebagai "sudah diperbaiki". Ukur di produksi.

🪤 **Chrome headless menampilkan "Sumber videonya sedang mati" bahkan di PRODUKSI.** Itu artefak
headless, **bukan** kerusakan — dibuktikan terpisah: `/api/teaser` mengalihkan ke tunnel
Cloudflare dan berakhir **HTTP 200**. Jangan jadikan tangkapan layar headless sebagai bukti
video mati.

🧹 Matikan Chrome lewat PID sesudah selesai. Di mesin bersama ini port 9222 bisa **juga** dipegang
penyewa lain (`taskkill` membalas *Access denied* untuk PID yang bukan milik kita) — itu normal,
bukan sisa proses sendiri yang gagal dimatikan.
