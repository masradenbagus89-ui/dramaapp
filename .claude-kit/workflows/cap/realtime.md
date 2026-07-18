<!-- LINTAS:SEKSI §realtime -->

## §realtime. Capability Pack — Realtime (chat, notifikasi langsung, update live) kelas-industri

> **Kapan dibaca:** "bikin chat / notifikasi langsung / update real-time / live / typing indicator / kolaborasi bareng / dashboard yang update sendiri". Resep merakit pembaruan langsung yang **aman & tahan-putus**. Baca induk `workflows/cap-packs.md`.

🙂 Analogi: realtime = **grup WhatsApp**. Pesan langsung sampai ke anggota; tapi kamu **cuma bisa lihat grup yang kamu ikut** (izin per-kanal). Kalau sinyal putus lalu nyambung lagi, aplikasi harus menarik pesan yang terlewat — bukan diam menampilkan obrolan basi.

### Kontrak (yang harus benar)
- **Input:** event/pesan dari server (atau dari klien untuk chat). **Output:** update terkirim **hanya** ke klien yang berlangganan kanal itu + berhak. **Error:** koneksi putus → auto-reconnect + **resync** state terkini. **Rahasia:** jangan broadcast data lintas-pengguna/lintas-tenant (satu penyewa tak boleh lihat data penyewa lain).

### Langkah rakit (prinsip — cek dokumentasi layanan versi terpasang §8.2)
1. **Pilih transport paling sederhana yang cukup:**
   - **SSE (Server-Sent Events)** = server→klien **satu-arah** lewat HTTP biasa (notifikasi, feed, progress). Paling simpel, lewat proxy/CDN mulus, punya auto-reconnect bawaan.
   - **WebSocket** = **dua-arah** (chat, kolaborasi ketik-bareng, game).
   - **Layanan terkelola** (Supabase Realtime, Ably, Pusher) = kalau tak mau kelola server koneksi sendiri.
2. **Otorisasi per-kanal di SERVER saat langganan (subscribe), JANGAN percaya klien.** Klien bilang "aku mau kanal `chat:42`" → server WAJIB verifikasi sesi + apakah user ini anggota kanal 42 (cegah **nguping** kanal orang lain). Supabase Realtime: aktifkan **Realtime Authorization** + RLS (rujuk `workflows/stack/4.14-2-supabase-prisma.md`), jangan andalkan filter di klien. **Khusus WebSocket buatan-sendiri (DIY) dengan cookie:** browser TETAP mengirim cookie sesi saat halaman LAIN membuka koneksi WS ke server-mu (aturan same-origin TAK berlaku di handshake WebSocket) → situs jahat bisa membajak koneksi atas nama korban (**CSWSH** = Cross-Site WebSocket Hijacking, pembajakan handshake lintas-situs). Cegah: **validasi header `Origin`** (whitelist domain-mu) saat handshake **dan/atau** pakai **token di parameter koneksi**, bukan mengandalkan cookie otomatis. Layanan terkelola aman karena pakai token, bukan cookie.
3. **Filter data per-penerima di server** — kirim hanya field yang boleh dilihat user itu; jangan siarkan baris DB mentah ke semua pelanggan (bocor kolom internal/PII).
4. **Tahan-putus (reconnect + resync):** klien auto-reconnect dengan **jeda makin lama (backoff)**; setelah nyambung, **tarik state terkini** (event saat putus bisa hilang). SSE: pakai `Last-Event-ID` untuk lanjut dari titik terputus. Jangan anggap "tersambung = data pasti lengkap".
5. **Skala & hosting:** koneksi persisten itu mahal & **serverless klasik (Vercel/Lambda) TAK cocok** untuk WebSocket berumur panjang (fungsi mati setelah beberapa detik). Untuk WS nyata → platform yang mendukung koneksi panjang (Cloudflare Durable Objects — rujuk `workflows/stack/4.14-3-cloudflare.md`, server Node khusus) atau layanan terkelola. Pilih hosting yang cocok (rujuk `workflows/stack/4.14-4-deploy.md`).
6. **Batas & kebersihan:** rate-limit pesan masuk + batas ukuran pesan (anti-flood); **heartbeat/timeout** untuk menutup koneksi mati (koneksi zombie memakan sumber daya). Terapkan **backpressure** (rem otomatis: tahan/perlambat kiriman saat klien tak sanggup menampung) supaya server tak menumpuk antrean data untuk klien lambat.
7. **Presence (siapa online) opsional** — berguna untuk chat, tapi jangan bocorkan lebih dari perlu (mis. status online orang yang mem-block).

### Gotcha (sering salah)
- **Otorisasi kanal cuma di klien** → siapa pun bisa langganan kanal mana pun lewat konsol/skrip. Wajib di server.
- **WebSocket di serverless** → koneksi putus tiap beberapa detik + biaya membengkak. Pakai platform/layanan yang tepat.
- **Tak ada resync** → user lihat data basi setelah sinyal sempat hilang. Selalu tarik state saat reconnect.
- **Broadcast baris DB mentah ke semua** → bocor data lintas-user/tenant. Filter per-penerima.
- **Tanpa heartbeat/timeout** → koneksi mati menumpuk (kebocoran koneksi).
- **Reconnect tanpa backoff** → ribuan klien serempak nyambung ulang saat server pulih = badai koneksi (**thundering herd**).

### Rujuk-silang (reuse-first — jangan salin)
- Otorisasi server-side + sesi (anti-nguping) → `cap/auth.md`.
- RLS + Realtime Authorization Supabase → `workflows/stack/4.14-2-supabase-prisma.md`.
- Opsi edge Cloudflare (Durable Objects sebagai penyimpan state koneksi) → `workflows/stack/4.14-3-cloudflare.md` (detail WebSocket koneksi-panjang/hibernation = cek dokumentasi Cloudflare versi terpasang).
- Pilih hosting yang mendukung koneksi persisten → `workflows/stack/4.14-4-deploy.md`.
- Kirim notifikasi juga lewat email → `cap/email-notifikasi.md`; kerja berat di latar → `cap/background-job.md`.

### Threat-model 3-baris
- **Aset:** pesan/data langsung + privasi kanal + sumber daya server. **Penyerang:** nguping kanal orang lain (langganan tanpa hak), pembajakan handshake lintas-situs (CSWSH), spam/flood pesan, memalsukan event, menghabiskan koneksi. **Mitigasi:** otorisasi per-kanal di server + validasi `Origin`/token koneksi (anti-CSWSH) + filter per-tenant + rate-limit/heartbeat + resync anti-data-basi.

### Batas jujur
Realtime skala besar butuh infrastruktur khusus (koneksi persisten, presence, fan-out) yang tak selalu murah/sederhana; pack ini menaikkan lantai keamanan & keandalan, bukan menjamin skala. Untuk kolaborasi rumit (edit dokumen bareng) butuh algoritma khusus (CRDT/OT) di luar cakupan ini. Cek dokumentasi resmi layanan/SDK **versi terpasang** — API subscribe & model authorization berbeda antar-penyedia.
