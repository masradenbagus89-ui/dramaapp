---
nama: realtime
deskripsi: Pembaruan langsung (chat/notif/live update) kelas-industri — otorisasi per-kanal di server (anti-nguping & anti-CSWSH), filter per-penerima, tahan-putus (reconnect+resync), hosting koneksi-panjang yang tepat.
divisi: backend
pemicu: [realtime, real-time, websocket, socket.io, sse, server-sent-events, live-update, update-langsung, live-chat, typing-indicator, supabase-realtime, pusher, ably, presence-online]
rawan_keamanan: true
menggantikan: []
---

# Skill: Realtime (chat, notifikasi langsung, update live) — kelas industri

> **Kapan skill ini aktif:** prompt menyentuh "chat / notifikasi langsung / update real-time / live / typing indicator / kolaborasi bareng / dashboard yang update sendiri / taruhan-langsung / saldo hidup". Dispatcher `rak-pemicu` menyalakannya otomatis.
>
> 🙂 **Analogi:** realtime = **grup WhatsApp**. Pesan langsung sampai ke anggota; tapi kamu **cuma bisa lihat grup yang kamu ikut** (izin per-kanal). Kalau sinyal putus lalu nyambung lagi, aplikasi harus **menarik pesan yang terlewat** — bukan diam menampilkan obrolan basi.

Skill ini **advisory** (§4.17): otak native memutuskan adopsi/adaptasi/abaikan tiap 📐/💡. Butir **🔒 HASIL** = jaminan yang tak boleh gagal (di sini: update sampai HANYA ke yang berhak + tahan-putus). Cek dokumentasi layanan/SDK **versi terpasang** (§8.2 A3) — API subscribe & model otorisasi beda antar-penyedia. Realtime = **optimasi UX**, sumber kebenaran tetap DB (mirip cache: koneksi hidup ≠ data pasti lengkap).

---

## 1. Kontrak (yang HARUS benar — tulis DULU)

- 🔒 **HASIL:**
  - **Input:** event/pesan dari server (atau dari klien untuk chat).
  - **Output:** update terkirim **hanya** ke klien yang **berlangganan kanal itu DAN berhak**.
  - **Error:** koneksi putus → auto-reconnect (backoff) + **resync** state terkini (event saat putus bisa hilang).
  - **Rahasia:** jangan broadcast data lintas-pengguna/lintas-tenant — satu penyewa tak boleh lihat data penyewa lain; jangan siarkan baris DB mentah (bocor kolom internal/PII).

---

## 2. Cara rakit (prinsip — 📐 CARA BAKU, boleh diganti cara lain yang capai HASIL sama)

1. 💡 **Pilih transport paling sederhana yang cukup:**
   - 🗃️ **SSE (Server-Sent Events)** = server→klien **satu-arah** lewat HTTP biasa (notifikasi, feed, progress, dashboard live). Paling simpel, lewat proxy/CDN mulus, auto-reconnect + `Last-Event-ID` bawaan.
   - 🗃️ **WebSocket** = **dua-arah** (chat, kolaborasi ketik-bareng, game, live-betting interaktif).
   - 🗃️ **Layanan terkelola** (Supabase Realtime, Ably, Pusher) = kalau tak mau kelola server koneksi sendiri (biasanya juga menyelesaikan skala + auth token).
2. 🔒 **HASIL — Otorisasi per-kanal di SERVER saat langganan (subscribe), JANGAN percaya klien.** Klien bilang "aku mau kanal `chat:42`" → server WAJIB verifikasi sesi + apakah user ini anggota kanal 42 (cegah **nguping** kanal orang lain). Supabase Realtime: aktifkan **Realtime Authorization + RLS** (→ `skills/supabase-prisma/SKILL.md`), jangan andalkan filter di klien.
   - ⚠️ **WebSocket buatan-sendiri (DIY) dengan cookie:** browser TETAP mengirim cookie sesi saat halaman LAIN membuka koneksi WS ke server-mu (aturan same-origin **tak** berlaku di handshake WebSocket) → situs jahat bisa membajak koneksi atas nama korban (**CSWSH** = *Cross-Site WebSocket Hijacking*, pembajakan handshake lintas-situs). Cegah: **validasi header `Origin`** (whitelist domain-mu) saat handshake **dan/atau** pakai **token di parameter koneksi**, bukan mengandalkan cookie otomatis. Layanan terkelola aman karena pakai token, bukan cookie.
3. 🔒 **HASIL — Filter data per-penerima di server** — kirim hanya field yang boleh dilihat user itu; jangan broadcast baris DB mentah ke semua pelanggan.
4. 📐 **Tahan-putus (reconnect + resync):** klien auto-reconnect dengan **jeda makin lama (backoff + jitter)**; setelah nyambung, **tarik state terkini** (snapshot) — jangan anggap "tersambung = data pasti lengkap". SSE: pakai `Last-Event-ID` untuk lanjut dari titik terputus. Reconnect tanpa backoff = ribuan klien serempak nyambung ulang saat server pulih (**badai koneksi / thundering herd** → beririsan dgn `skills/rate-limiting/SKILL.md`).
5. 📐 **Skala & hosting:** koneksi persisten itu mahal & **serverless klasik (Vercel/Lambda) TAK cocok** untuk WebSocket berumur panjang (fungsi mati setelah beberapa detik). Untuk WS nyata → platform yang mendukung koneksi panjang (**Cloudflare Durable Objects** → `skills/cloudflare/SKILL.md`, server Node khusus) atau layanan terkelola. Skala horizontal butuh **pub/sub backplane** (mis. Redis) supaya pesan menyebar antar-instance (user di server A dapat event dari server B). Pilih hosting yang cocok → `skills/deploy/SKILL.md`.
6. 📐 **Batas & kebersihan:** rate-limit pesan masuk + batas ukuran pesan (anti-flood) → `skills/rate-limiting/SKILL.md`; **heartbeat/ping-pong + timeout** untuk menutup koneksi mati (koneksi zombie memakan sumber daya); **backpressure** (rem otomatis: tahan/perlambat kiriman saat klien tak sanggup menampung) supaya server tak menumpuk antrean untuk klien lambat.
7. 💡 **Presence (siapa online) opsional** — berguna untuk chat, tapi jangan bocorkan lebih dari perlu (mis. status online orang yang mem-block). **Token koneksi bisa kedaluwarsa** di koneksi panjang → siapkan refresh/re-auth di tengah sesi.

---

## 3. Powerful — pola siap-adaptasi

🧪 **CONTOH KASUS (ambil polanya, jangan salin mentah):** langganan aman = otorisasi di server DULU, filter per-penerima, resync saat reconnect:

```txt
subscribe(client, kanal):                         // dijalankan di SERVER
  sesi = verifikasiSesi(client.token)              // 1) identitas server-side (bukan klaim klien)
  if not sesi: tolak(4401 'unauthorized')          //    (WS: cek Origin whitelist juga -> anti-CSWSH)
  if not bolehAkses(sesi.user, kanal): tolak(4403) // 2) otorisasi per-kanal (anti-nguping)
  daftarkan(client, kanal)

publish(kanal, event):
  for c in pelanggan(kanal):
     kirim(c, filterUntuk(c.user, event))          // 3) filter field per-penerima (anti bocor kolom)

onReconnect(client, kanal):                        // 4) tahan-putus
  snapshot = ambilStateTerkini(kanal, client.lastEventId)   // SSE: Last-Event-ID
  kirim(client, snapshot)                          //    jangan biarkan klien tampil data basi
```
- 📐 CARA BAKU: nomori event (sequence/`Last-Event-ID`) → klien tahu ada yang terlewat + bisa minta ulang.
- 💡 SARAN: pakai layanan/SDK teruji (Supabase Realtime, Ably, Pusher, `socket.io` + adapter Redis) daripada menulis server WS + backplane sendiri. Cek API **versi terpasang** (§8.2 A3).

---

## 4. Self-verify (sangkal diri sebelum "selesai" — §8.2 Aturan 3)

- [ ] Langganan kanal **diotorisasi di server** (uji: skrip mencoba subscribe kanal milik user lain → ditolak)?
- [ ] WS DIY: **`Origin` divalidasi / token koneksi** dipakai (bukan mengandalkan cookie) → anti-CSWSH?
- [ ] Payload **difilter per-penerima** (tak ada kolom internal/PII/data tenant lain bocor)?
- [ ] Reconnect **backoff+jitter** + **resync snapshot** (uji: putus jaringan 30 dtk → sambung → data segar, bukan basi)?
- [ ] Hosting **mendukung koneksi panjang** (bukan serverless untuk WS) + skala punya **pub/sub antar-instance**?
- [ ] **Heartbeat/timeout** menutup koneksi zombie + **rate-limit/backpressure** pesan masuk?
- [ ] Realtime **bukan satu-satunya sumber kebenaran** (DB tetap otoritas; UI bisa re-fetch)?

---

## 5. Definition-of-Done

- [ ] **Kontrak (§1) ditulis** (input/output/error-reconnect/rahasia).
- [ ] Otorisasi per-kanal server-side + anti-CSWSH + filter per-penerima + reconnect/resync + hosting tepat + heartbeat + backpressure terpasang.
- [ ] **Edge case** diuji: subscribe kanal orang lain (ditolak), koneksi putus lalu sambung (resync), klien lambat (backpressure), server restart (reconnect tak badai), token kedaluwarsa di tengah.
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris`.
- [ ] Observability: jumlah koneksi aktif + pesan/detik + error reconnect dipantau; alert saat koneksi/antrean melonjak.
- [ ] build + lint + test lulus; min 1 test happy-path (event sampai ke pelanggan berhak) + 1 test otorisasi (kanal orang lain ditolak) + 1 test resync.

---

## 6. Handoff / rujuk-silang (reuse-first — jangan salin)

- 🔒 Otorisasi server-side + sesi (anti-nguping) → `skills/auth/SKILL.md`; RLS + Realtime Authorization Supabase → `skills/supabase-prisma/SKILL.md`.
- 📐 Rate-limit/anti-flood pesan masuk + anti badai-reconnect → `skills/rate-limiting/SKILL.md`; opsi edge koneksi-panjang → `skills/cloudflare/SKILL.md`; hosting yang mendukung koneksi persisten → `skills/deploy/SKILL.md`.
- 🗃️ LATAR — kirim notifikasi juga lewat email → `skills/email-notifikasi/SKILL.md`; kerja berat di latar → `skills/background-job/SKILL.md`. Metrik koneksi → `templates/PRODUCTION_OBSERVABILITY.md`.

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** pesan/data langsung + privasi kanal + sumber daya server. **Penyerang:** nguping kanal orang lain (langganan tanpa hak), pembajakan handshake lintas-situs (CSWSH), spam/flood pesan, memalsukan event, menghabiskan koneksi. **Mitigasi:** otorisasi per-kanal di server + validasi `Origin`/token koneksi (anti-CSWSH) + filter per-tenant + rate-limit/heartbeat/backpressure + resync anti-data-basi.
- 🗃️ **LATAR — Batas jujur:** realtime skala besar butuh infrastruktur khusus (koneksi persisten, presence, fan-out) yang tak selalu murah/sederhana; skill ini menaikkan lantai keamanan & keandalan, **bukan** menjamin skala. Kolaborasi rumit (edit dokumen bareng) butuh algoritma khusus (CRDT/OT) di luar cakupan. Cek dokumentasi layanan/SDK **versi terpasang** — model subscribe & otorisasi berbeda antar-penyedia.
