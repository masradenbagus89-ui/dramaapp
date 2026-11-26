# 2026-11-25 — Live Chat member + Report Video + dashboard admin "Laporan & Chat"

## 1. Apa yang berubah + kenapa
Sampai hari ini member tidak punya jalan memberi tahu admin kalau video rusak atau ingin
bertanya — admin baru tahu kalau ada yang mengeluh di luar situs. Sekarang:

- **Report Video** — member memilih jenis masalah (tidak bisa diputar · buffering · link rusak ·
  subtitle tak muncul · audio · kualitas buruk · lainnya) + keterangan opsional (wajib untuk
  "lainnya", maks 500 karakter). Judul, ID film, episode, server video, nama member & waktu
  **diisi server** — judul dicari ulang dari ID, jadi tak bisa dipalsukan dari browser.
  Sukses → jendela menampilkan "Laporan terkirim" lalu menutup sendiri.
- **Live Chat** — satu percakapan per member dengan admin, riwayat tersimpan. Member **hanya**
  bisa membaca percakapannya sendiri (utas diturunkan dari email sesi di server, bukan dari
  parameter yang dikirim browser). Ikon Chat dapat titik merah saat ada balasan admin baru.
- **Dashboard `/admin/bantuan`** (menu samping: "Laporan & Chat" + angka merah) — tab Laporan
  (saring Pending/Diproses/Selesai/Semua, cari judul/member/server/keterangan, tombol
  Proses / Tandai selesai / Kembalikan ke Pending, penanda "Baru" + spanduk untuk laporan yang
  masuk sesudah halaman dibuka) dan tab Live Chat (kotak masuk + balas; di HP bergantian).

**Posisi tombol (keputusan klien 2026-11-25, lewat popup):** pemutar drama `/feed` = dua ikon
baru **Lapor** & **Chat** di rail kanan (pemutar layar penuh tak punya area "di bawah"). Halaman
Playly `/tonton` = baris tombol tepat di bawah pemutar. **Laporan wajib login** (pilihan klien).

**"Real-time" = polling**, bukan WebSocket: chat terbuka ditanya tiap 5 dtk, tertutup tiap
60 dtk (hanya "ada balasan?"), admin 5–30 dtk; berhenti saat tab browser disembunyikan.
Alasannya: Vercel tak bisa menahan koneksi WebSocket lama, dan Supabase Realtime butuh login
Supabase yang tidak dipakai situs ini. Akibat yang terasa: pesan muncul dalam ±5 detik.

**Penyimpanan:** dokumen di tabel `app_data` yang sudah ada — SATU dokumen per laporan / pesan
(`laporan-video:<uuid>`, `chat-pesan:<utas>:<uuid>`, `chat-utas:<utas>`, `chat-baca:<sisi>:<utas>`).
Dipilih karena DDL masih tertutup (preseden `playly:link-unduhan`). Satu dokumen per baris =
dua pesan yang dikirim bersamaan tak saling menimpa. ⚠️ Utang teknis tertulis di
`lib/kumpulan-dokumen.ts`: urut/batas atas isi JSON tanpa index (cukup untuk ribuan baris;
daftar admin dibatasi 500 laporan & 300 utas terbaru). Begitu DDL pulih → pindah ke tabel
sendiri; cukup mengganti `lib/kumpulan-dokumen.ts`.

**Anti-spam / akses:** semua tulis lewat `guardMutation` (tolak domain lain + batas per-IP) +
batas per akun (laporan 5 / 10 menit, chat 15 / menit). ⚠️ Batasnya di memori tiap instance
Vercel (best-effort, sama dengan `lib/rate-limit.ts` yang sudah ada). Semua endpoint admin
memeriksa sesi admin sendiri (401), tidak bergantung pada halaman. Admin hanya bisa
**membalas** utas yang sudah dibuka member — tidak bisa memulai pesan ke email sembarang.

**Yang TIDAK dibangun:** notifikasi push browser · lampiran gambar di chat · tombol hapus chat ·
pesan untuk tamu.

## 2. Berkas yang disentuh
Baru:
- `lib/kumpulan-dokumen.ts` — dokumen ber-awalan di `app_data` (+ mode file lokal)
- `lib/laporan-video.ts` (aturan, aman di browser) · `lib/laporan-video-simpan.ts` (server)
- `lib/live-chat.ts` (aturan) · `lib/live-chat-simpan.ts` (server) · `lib/nama-akun.ts`
- `app/api/laporan-video/route.ts` · `app/api/chat/route.ts`
- `app/api/admin/laporan-video/route.ts` · `app/api/admin/chat/route.ts` · `app/api/admin/bantuan/route.ts`
- `app/admin/bantuan/page.tsx`
- `app/components/usePolling.ts` · `app/components/bantuan/*` (JendelaBantuan, ModalLaporanVideo,
  PanelLiveChat, IsiChat, useLiveChatMember, useBantuanVideo, BarisBantuanVideo)
- `app/components/admin/` AdminLaporanVideo, AdminLiveChat, PusatBantuanAdmin, LencanaBantuan
- `tests/bantuan-video.test.ts` (18 tes) · `tests/bantuan-video-tampil.test.ts` (4 tes)

**Basis branch (2026-11-26):** `origin/main` 4395e0e, HANYA berisi fitur ini (branch
`feat/live-chat-laporan-video`). Versi pertamanya sempat ikut tercampur di commit lokal
`c268276` (110 berkas, 5 fitur, basis tertinggal 381 commit) — commit itu TIDAK dipakai di sini;
berkas barunya diambil apa adanya, 6 berkas lama di bawah dipasang ulang di atas versi terbaru.

Diubah:
- `app/components/ActionRail.tsx` — ikon Lapor + Chat (+ titik notifikasi). Tata letak rail milik
  owner (`bottom-32 gap-2`, 2026-11-12) TIDAK diubah. **Dipakai hanya oleh `/feed/[id]`.**
  ⚠️ Rail kini 7 ikon dan digantung dari bawah: di HP berlayar pendek pucuknya bisa mendekati
  tombol Kembali/gerigi di atas — mohon dicek di HP sungguhan (langkah 6 no. 1).
- `app/components/FeedPlayer.tsx` — oper episode + server ke rail (1 prop + 1 import). Server =
  host dari alamat bertanda tangan `srcFor(ep)`; tanda tangannya TIDAK ikut tersimpan.
- `app/tonton/[id]/page.tsx` — baris tombol di kartu putih di bawah info video (gaya terang
  mengikuti halaman ini). Tetap `● (SSG)` di build.
- `app/components/admin/AdminSidebar.tsx` — baris "Laporan & Chat" + angka, lewat `barisMenu`
  yang sama dengan menu lain (penanda menu aktif ikut berlaku).
- `.gitignore` — `data/kumpulan-dokumen.json` (mode lokal; berisi email & isi chat).

## 3. Butuh SQL migrasi?
Tidak. Memakai tabel `app_data` yang sudah ada.

## 4. Butuh env baru di Vercel?
Tidak.

## 5. Bukti yang sudah dijalankan (2026-11-26, komputer rekan, di basis branch ini)
- Gerbang urut sesuai AGENTS.local.md: `rm -rf .next` → `npm run build` **exit 0** →
  `npx tsc --noEmit` **exit 0** → `npx vitest run` **205 berkas / 2915 tes lulus**.
  Build lokal memakai `ALLOW_FILE_MODE=1` karena komputer rekan tak punya env Supabase
  (pengaman `lib/supabase.ts` menolak build tanpanya) — di hosting env itu TIDAK perlu.
- Bundle browser: `grep` `kumpulan-dokumen` / `node:crypto` di `.next/static/chunks` → **nihil**.
- Uji ujung-ke-ujung pada `next start` lokal (mode file, admin uji lewat `ADMIN_BOOTSTRAP_EMAIL`
  di proses server saja): **18/18 lulus** —
  daftar+masuk 2 member · tamu lapor 401 · lapor 201 · domain asing 403 · Budi TIDAK melihat
  chat Ani · member buka API admin 401 · lencana admin 1 pending & 2 belum dibaca · judul palsu
  "PALSU" tersimpan sebagai judul asli · tandai selesai · balas · tanda baru muncul lalu hilang
  sesudah dibaca · `/admin/bantuan` 200 untuk admin, isi tak tampil untuk tamu ·
  `/feed/<id>` memuat ikon Lapor & Chat. Data uji dihapus sesudahnya.
- ❓ **Belum terbukti di Supabase sungguhan** (komputer rekan tak punya kredensial): format
  query daftar `app_data?key=like.<awalan>*&order=value->><field>.desc`. Formatnya sesuai
  dokumentasi PostgREST, tapi owner perlu memastikan di preview (langkah 6 no. 3).

## 6. Cara owner mencoba sendiri
1. Masuk sebagai **member** → buka episode drama mana pun (`/feed/...`) → ketuk ikon **Lapor**
   di rail kanan → pilih "Video buffering" → **Kirim laporan** → harus muncul centang hijau
   "Laporan terkirim".
2. Masih sebagai member, ketuk ikon **Chat** → tulis "tes" → Enter → pesan tampil di kanan
   (warna kuning).
3. Masuk sebagai **admin** → menu samping **Laporan & Chat** harus menampilkan angka merah →
   tab Laporan: laporan tadi ada dengan judul & episode yang benar → klik **✓ Tandai selesai** →
   pindah ke tab Selesai. Tab Live Chat: buka percakapan member → balas → kembali ke akun member,
   ikon Chat harus bertitik merah dalam ≤60 detik dan balasan tampil saat dibuka.
   **Kalau daftar admin kosong padahal laporan terkirim** = query di butir ❓ bagian 5 ditolak
   Supabase → cek log Vercel untuk `[admin/laporan-video] gagal membaca`.

Catatan: menu samping admin tersembunyi di layar HP (perilaku lama `AdminSidebar`, bukan baru);
di HP buka langsung `/admin/bantuan`.
