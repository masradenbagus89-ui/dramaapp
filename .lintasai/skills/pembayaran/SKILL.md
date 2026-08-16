---
nama: pembayaran
deskripsi: Checkout & webhook anti bayar-dobel kelas-industri — idempoten, harga dihitung di server, status hanya dari webhook terverifikasi.
divisi: keamanan
pemicu: [bayar, pembayaran, payment, checkout, invoice, faktur, tagihan, langganan, subscription, midtrans, xendit, stripe, jualan, toko-online, keranjang, aplikasi-kasir, sistem-kasir, webhook, double-charge, charged-twice, tagihan-dobel, refund, billing, shopping-cart, keranjang-belanja]
rawan_keamanan: true
menggantikan: [pembayaran]
---

# Skill: Pembayaran (checkout · webhook · anti bayar-dobel) — kelas industri

> Menutup salah satu kondisi **GENTING penghenti-rilis** ("webhook bayar/fulfillment tak idempoten"). `rawan_keamanan: true` → buka rak keamanan sebelum edit pertama.
>
> **Inti:** **Idempoten** (kebal-ulang) = walau prosesnya terulang (mis. server nge-lag lalu request masuk 2×), hasilnya tetap tercatat SEKALI. **Webhook** (panggilan-balik) = notifikasi dari gateway pembayaran ke server toko bahwa "pembayaran #123 LUNAS" — server wajib memverifikasi notifikasi itu benar-benar dari gateway, bukan dipalsukan pihak lain.

Butir **🔒 HASIL** menyangkut uang = tak boleh gagal. Cek dokumentasi gateway **versi terpasang** — nama header tanda-tangan & alur webhook beda antar-gateway.

---

## 1. Kontrak (yang HARUS benar)

- 🔒 **HASIL:**
  - **Input:** niat-bayar (jumlah, mata uang, id-pesanan). **Output:** status pembayaran terverifikasi + pesanan ter-update. **Error:** gagal-bayar ditangani (bukan pesanan menggantung).
  - **Uang:** disimpan tipe tepat — **integer satuan-terkecil (sen) / `numeric`**, **JANGAN `float`** (🧪 CONTOH: `0.1 + 0.2 ≠ 0.3` → saldo meleset diam-diam).

---

## 2. Cara rakit (prinsip)

1. 📐 **Pakai payment gateway teruji** (Stripe/Midtrans/Xendit) — **JANGAN pegang nomor kartu sendiri** (biar gateway yang PCI-compliant = tersertifikasi keamanan kartu).
2. 🔒 **HASIL — Jangan percaya harga dari client.** Hitung total **di server** dari data produk — client cuma kirim id/qty (cegah manipulasi harga lewat body request).
3. 📐 **Idempotency-key** (kunci-kebal-ulang): kirim kunci unik per-transaksi ke gateway + simpan `(key → hasil)` di DB dengan constraint `UNIQUE` → request ulang mengembalikan hasil tersimpan, **tak memproses 2×** (anti bayar-dobel saat user klik ganda / retry jaringan). Pola upsert → `skills/supabase-prisma/SKILL.md`.
4. 🔒 **HASIL — Status bayar HANYA sah dari webhook terverifikasi (4 aturan wajib).** Alamat webhook publik → siapa pun bisa kirim request ke situ mengaku sebagai gateway; 4 aturan ini membedakan uang masuk beneran dari palsu:
   - 📐 **Baca RAW body sebelum di-parse.** Tanda-tangan dihitung dari byte asli; begitu framework mengubahnya jadi JSON (spasi/urutan-kunci bergeser), tanda-tangan tak akan cocok. Next.js App Router: `await req.text()`, JANGAN `await req.json()` dulu.
   - 📐 **Bandingkan tanda-tangan konstan-waktu** (`crypto.timingSafeEqual`, BUKAN `===`). `===` berhenti di huruf pertama yang beda → selisih waktu bocorkan tanda-tangan huruf-demi-huruf. Tolak **401 sebelum menyentuh DB** kalau tak cocok.
   - 📐 **Anti-replay + idempoten by event-id:** simpan `event_id` di kolom `UNIQUE`; sudah ada → balas 200 lalu berhenti (gateway SENGAJA kirim ulang kalau balasan telat — ini normal, bukan error). Tolak event yang timestamp-nya kadaluarsa.
   - 📐 **Balas 2xx cepat, kerja berat async.** Kirim struk/email/update-stok → antrean (`skills/background-job/SKILL.md`). Balasan >beberapa detik → gateway anggap gagal lalu ulang → kamu memproses pembayaran yang sama berkali-kali.
5. 🔒 **HASIL — Status jujur:** JANGAN tandai "lunas" dari **redirect browser** / halaman "terima kasih" (user bisa tutup/refresh/palsukan) — **hanya dari webhook terverifikasi**. Sediakan status "menunggu / lunas / gagal".
6. 📐 **Uang & bukti:** angka uang tipe tepat; simpan bukti/riwayat transaksi; refund/pembatalan bila relevan.

---

## 3. Powerful — urutan wiring aman

📐 CARA BAKU: rakit dalam urutan ini supaya tiap lapis menutup lubang lapis sebelumnya: **(1)** harga dihitung server → **(2)** buat niat-bayar + idempotency-key → **(3)** redirect ke gateway (bukan pegang kartu) → **(4)** webhook verifikasi tanda-tangan (RAW body + konstan-waktu) → **(5)** dedup event-id → **(6)** update status "lunas" HANYA di sini → **(7)** efek samping (struk/fulfillment) via background-job idempoten. 🧪 Sandbox gateway dulu sebelum live.

### Contoh pola ❌→✅ (ambil POLANYA, jangan salin mentah — nama header/rumus tanda-tangan BEDA per gateway, cek docs versi terpasang)

🧪 **Harga dihitung server (§2 butir 2)** — client hanya kirim id+qty:

❌ **SALAH** (total dari body request = bisa dipalsukan):
```ts
const { items, total } = await req.json()
await buatTagihan(orderId, total) // penyerang kirim total: 1 → bayar Rp1 utk pesanan Rp10jt
```
✅ **BENAR** (harga diambil ulang dari DB di server):
```ts
const { items } = await req.json() // hanya { id, qty } yang dipercaya dari client
const produk = await db.produk.findMany({ where: { id: { in: items.map((i) => i.id) } } })
const total = items.reduce((t, i) => t + hargaDari(produk, i.id) * i.qty, 0)
```

🧪 **Webhook: RAW body + tanda-tangan konstan-waktu (§2 butir 4a-4b)**:

❌ **SALAH** (parse dulu + `===`):
```ts
export async function POST(req: Request) {
  const event = await req.json() // byte asli hilang → tanda-tangan mustahil cocok/diverifikasi benar
  if (req.headers.get('x-signature') === hitungTandaTangan(event)) // === bocorkan waktu per-huruf
    await tandaiLunas(event.order_id) // tanpa dedup: event ulang = proses 2×
  return Response.json({ ok: true }) // tak cocok pun tetap 200 → pemalsu tak pernah ditolak
}
```
✅ **BENAR** (verifikasi byte asli, tolak 401 sebelum DB):
```ts
import { createHmac, timingSafeEqual } from 'node:crypto'

export async function POST(req: Request) {
  const raw = await req.text() // (4a) RAW body SEBELUM parse
  const dikirim = Buffer.from(req.headers.get('x-signature') ?? '') // nama header: cek docs gateway
  const hitung = Buffer.from(createHmac('sha256', process.env.WEBHOOK_SECRET!).update(raw).digest('hex'))
  if (dikirim.length !== hitung.length || !timingSafeEqual(dikirim, hitung))
    return new Response('signature mismatch', { status: 401 }) // (4b) tolak SEBELUM sentuh DB
  const event = JSON.parse(raw) // parse hanya SETELAH terbukti asli
  // lanjut: dedup event-id (pasangan berikut) → update status → balas 2xx cepat, kerja berat ke antrean (4d)
  return new Response('ok', { status: 200 })
}
```

🧪 **Anti-replay: dedup `event_id` lewat UNIQUE (§2 butir 4c)** — dedup di DB, bukan di memori (server restart/2 instance = ingatan hilang):

❌ **SALAH**:
```sql
CREATE TABLE webhook_event (id serial PRIMARY KEY, event_id text, payload jsonb);
-- event_id TANPA constraint UNIQUE → event yang gateway kirim ulang tercatat & diproses 2×
```
✅ **BENAR** (DB yang menolak duplikat — atomik walau 2 request bersamaan):
```sql
CREATE TABLE webhook_event (event_id text PRIMARY KEY, payload jsonb, diproses_pada timestamptz);
```
```ts
const baru = await db.webhookEvent.createMany({ data: [{ eventId }], skipDuplicates: true })
if (baru.count === 0) return new Response('ok (duplikat)', { status: 200 }) // sudah pernah → berhenti, JANGAN proses ulang
```

🧪 **Status "lunas" HANYA dari webhook (§2 butir 5)**:

❌ **SALAH** (halaman "terima kasih" menulis status):
```ts
// app/bayar/sukses/page.tsx
await db.pesanan.update({ where: { id }, data: { status: 'lunas' } }) // user bisa buka URL ini langsung tanpa bayar!
```
✅ **BENAR** (halaman sukses cuma MEMBACA; yang menulis cuma handler webhook):
```ts
const p = await db.pesanan.findUnique({ where: { id } })
// tampilkan apa adanya: 'menunggu' bila webhook belum tiba — JANGAN dipaksa 'lunas' di sini
```

🧪 **Uang bukan float (§1)**:

❌ **SALAH**: `total double precision` / `const total = 0.1 + 0.2` (≠ 0.3 — saldo meleset diam-diam).
✅ **BENAR**:
```sql
total_sen bigint NOT NULL CHECK (total_sen >= 0) -- integer satuan terkecil; alternatif: numeric(18,2)
```

---

## 4. Self-verify (sangkal diri sebelum "selesai")

- [ ] Total dihitung **di server** (uji: kirim harga palsu di body → ditolak/diabaikan)?
- [ ] Webhook memverifikasi **tanda-tangan** (RAW body + konstan-waktu) + tolak 401 sebelum DB?
- [ ] **Idempoten**: proses event yang sama 2× → efek 1× (uji: kirim ulang webhook)?
- [ ] Klik "bayar" 2× / retry jaringan → **tak ketagih 2×** (idempotency-key)?
- [ ] Status "lunas" **hanya** dari webhook, bukan redirect browser?
- [ ] Uang bukan `float`?

---

## 5. Definition-of-Done

- [ ] **Kontrak (§1) ditulis** (input/output/error/tipe-uang).
- [ ] 4 aturan webhook + idempotency-key + harga-server + status-dari-webhook terpasang.
- [ ] **Edge case**: klik ganda, retry webhook, webhook palsu (tanda-tangan salah), gateway timeout, refund.
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris`.
- [ ] **Rak keamanan dibuka** (`skills/owasp/SKILL.md`) — `rawan_keamanan: true`.
- [ ] Diuji di **sandbox** gateway; min 1 happy-path (bayar sukses) + 1 alur "webhook dobel → 1× efek".

---

## 6. Handoff / rujuk-silang (reuse-first — jangan salin)

- 📐 Idempoten/upsert DB + transaksi → `skills/supabase-prisma/SKILL.md`.
- 📐 Kirim struk/email di latar (idempoten) → `skills/background-job/SKILL.md` (skill: `background-job`).
- 📐 **Gateway bayar lelet / timeout / `5xx` / sempat mati** (retry berjeda + timeout per-percobaan + saklar-pemutus supaya web-mu tak ikut tumbang) → `skills/tahan-gagal/SKILL.md`. ⚠️ Retry operasi bayar WAJIB pakai idempotency-key (§ di atas) — tanpa itu pelanggan bisa tertagih 2×.
- 📐 User login sebelum bayar → `skills/auth/SKILL.md`. Keamanan web (rate-limit/CORS) → `skills/owasp/SKILL.md`.
- 🗃️ LATAR — Rak asal skill ini hanya di riwayat git (ADR-027).

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** uang & pesanan pelanggan. **Penyerang:** manipulasi harga, webhook palsu, bayar-dobel karena retry, kebocoran status. **Mitigasi:** hitung harga di server + verifikasi tanda-tangan webhook (RAW+konstan-waktu) + idempotency-key + status hanya dari webhook.
- 🗃️ **LATAR — Batas jujur:** menutup pola-gagal pembayaran paling umum; **tidak menjamin** semua kasus (rekonsiliasi keuangan, pajak, multi-mata-uang, penipuan lanjutan butuh penanganan sendiri). Sandbox dulu sebelum live.
