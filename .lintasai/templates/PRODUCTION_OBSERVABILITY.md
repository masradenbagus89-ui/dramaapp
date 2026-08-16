# templates/PRODUCTION_OBSERVABILITY.md - Pasang "Alarm" supaya App Tak Error Diam-Diam di Produksi

> Versi 1.1 · 2026-07-14 · Untuk app produksi (Next.js / Python / Supabase, deploy Vercel/Railway/Render). · v1.1: + Pilar 4 pemantauan kejadian keamanan (SIEM-lite)
> Pelengkap, BUKAN pengganti: backup DB = PITR Supabase + `SAFE_DATABASE_OPERATIONS.md` · standar log & larangan telan-error = `skills/backend/SKILL.md` §2 butir 5. File ini **mengangkat observability jadi standar wajib-sebelum-online** + langkah konkret 3 pilar.

## Tujuan & kapan dipakai

Dipakai **sebelum app dipakai user sungguhan** (atau saat staff bilang *"mau online"*, *"deploy ke produksi"*, *"app sering error tapi nggak tahu kenapa"*). Tujuan: app **memberi tahu kita saat ada masalah**, bukan kita baru tahu dari komplain user.

- 👨‍🎓 **Junior:** *observability* = kemampuan tahu "apa yang terjadi di dalam app saat jalan di produksi" lewat 3 pilar: **error tracking** (tangkap exception otomatis), **structured logging** (log ber-`trace-id` yang bisa dilacak antar-service), **healthcheck/uptime** (endpoint `/health` + monitor). Tanpa ini, *silent failure* (gagal diam-diam) bisa berjam-jam tak terdeteksi. Aturan "log terstruktur + jangan telan error" sudah diwajibkan di `skills/backend/SKILL.md` §2 butir 5 (padanan Python: `skills/python/SKILL.md` §1/§2) — file ini langkah konkretnya.
- 🙂 **Non-programmer:** ini bikin aplikasi **otomatis mengabari kamu** begitu ada yang rusak menimpa pengguna — bukan menunggu pelanggan komplain. Tanpa ini, error di aplikasi bisa berjam-jam tak ketahuan.

---

## Kenapa WAJIB (bukan opsional) untuk app powerful

App tanpa observability = **terbang tanpa instrumen**: kelihatan jalan, tapi saat satu fitur diam-diam gagal (pembayaran nyangkut, form tak terkirim, query lambat), tak ada yang tahu sampai user marah / transaksi hilang. Untuk app yang dipakai user real, ini **bug jangka panjang paling mahal** karena tak terlihat. Maka: nyalakan **sebelum** online, bukan setelah ada insiden.

---

## 3 Pilar inti + 1 pilar keamanan (pasang berurutan, dari yang paling penting)

### Pilar 1 — Error Tracking (tangkap error user otomatis) 🥇

```bash
# Next.js (frontend + API routes)
npm install --save @sentry/nextjs
npx @sentry/wizard@latest -i nextjs    # otomatis bikin config + sourcemap

# Python (FastAPI / Django)
pip install "sentry-sdk[fastapi]"      # atau sentry-sdk[django]
```
```python
# Python: init sekali di entry point (main.py / settings.py)
import sentry_sdk
sentry_sdk.init(dsn="<SENTRY_DSN>", traces_sample_rate=0.1, environment="production")
```
- Tiap error di produksi → Sentry tangkap *stack trace* (jejak baris error) + langkah reproduksi + kirim alert (email/Slack) ke owner.
- **WAJIB:** `environment` dibedakan (production/staging) supaya error staging tak bikin panik. `SENTRY_DSN` taruh di env, **jangan** di kode.
- **Pasang jaring TERAKHIR tingkat-proses** — SDK saja tak menangkap semuanya. Node/worker (non-serverless): `process.on('unhandledRejection')` + `process.on('uncaughtException')` → catat lalu **`process.exit(1)`** supaya supervisor/platform menghidupkannya bersih. 🚨 JANGAN dipakai untuk "lanjut jalan saja": proses yang meneruskan hidup setelah error tak-terduga bekerja dengan keadaan yang sudah rusak, dan kerusakannya merembet ke data. Browser: `window.addEventListener('error')` + `('unhandledrejection')` → kirim ke error-tracker. 👨‍🎓 Tanpa ini, satu `kirimEmail(user)` yang lupa di-`await` gagal **tanpa satu baris log pun** — di dev tak kelihatan, di produksi senyap total. (`<ErrorBoundary>` React TIDAK menutup celah ini → `skills/react-patterns/SKILL.md` §F.)
- 🚨 **Sentry mengirim data KELUAR ke pihak ketiga — saring dulu.** Set `sendDefaultPii: false` + pasang kait `beforeSend` yang membuang cookie, header `authorization`, dan field body sensitif SEBELUM terkirim. Larangan PII di Pilar 2 berlaku **sama persis** di sini; bedanya, yang ini keluar dari organisasimu. Cek juga kebijakan retensi & lokasi server penyedia kalau datanya teregulasi (`skills/kepatuhan-teregulasi/SKILL.md`).
- **Verifikasi source map benar ter-upload** (kalau tidak, stack trace tak terbaca dan pilar ini praktis mati): picu 1 error uji di produksi/staging, pastikan Sentry menampilkan **nama berkas & nomor baris ASLI** — bukan `chunk-a3f.js:1:20481`. Sekaligus pastikan berkas `.map` **tidak tersaji publik** di web-mu (kode sumbermu bisa dibaca siapa saja).

### Pilar 2 — Structured Logging + trace-id (log yang bisa dilacak) 🥈

```ts
// Next.js: pakai pino (atau console JSON) — log = objek, bukan string acak
import pino from "pino";
export const log = pino({ level: process.env.LOG_LEVEL ?? "info" });
// tiap request beri trace-id, teruskan ke log + ke backend (header x-trace-id)
log.info({ traceId, userId, route: "/api/checkout" }, "checkout dimulai");
```
- 👨‍🎓 *trace-id* = nomor seri unik per-request, ikut di semua log lintas-service → saat ada error, kamu bisa rangkai "apa yang terjadi" dari frontend → backend → DB. Level: `info` (aksi sukses penting), `warn` (anomali), `error` (gagal perlu tindak lanjut).
- 🚨 **JANGAN log secret/PII mentah** (password, token, nomor kartu, KTP) — §5.2. Mask: `email=a***@x.com`.
- **Catat error PENUH SEKALI saja**, di penerjemah boundary (`skills/backend/SKILL.md` §3). Lapis di tengah cukup melempar-ulang + menambah konteks — jangan ikut mencatat. Satu error yang jadi 5 baris log membuat ambang alarm ("error > 10/menit") tak bisa dipercaya lagi.

#### Metrik & alarm ambang (angka yang gerakannya mendahului komplain user)

Log menjawab "apa yang terjadi pada SATU request"; metrik menjawab "apakah sistem sedang memburuk". Mulai dari empat ini saja:
- **Antrean latar:** panjang antrean + **umur job tertua** (yang tertua lebih jujur daripada panjangnya — antrean pendek yang macet tetap gawat) → `skills/background-job/SKILL.md`.
- **Laju `429`** (rate-limit sering kena = batas kesempitan **atau** ada yang menyerang) → `skills/rate-limiting/SKILL.md`.
- **Cache hit-rate** (turun mendadak = beban pindah ke DB, biasanya mendahului insiden lambat) → `skills/caching/SKILL.md`.
- **Biaya harian** penyedia (lonjakan = loop tak berujung / *denial-of-wallet*) → `skills/deploy/SKILL.md`.

Aturan alarm: pasang **3-5 saja** di awal. Alarm kebanyakan = semuanya diabaikan, dan itu lebih buruk daripada tak ada alarm.

### Pilar 3 — Healthcheck + Uptime monitor 🥉

```ts
// Next.js App Router: app/api/health/route.ts
export async function GET() {
  // cek dependensi kritis (DB ping) — return 200 kalau sehat, 503 kalau tidak
  return Response.json({ status: "ok", time: new Date().toISOString() });
}
```
- Daftarkan URL `/api/health` ke uptime monitor (UptimeRobot/BetterStack/Vercel) → dapat alert kalau app mati. (Railway/Render: set healthcheck path di config deploy.)
- **Butuh lebih dalam?** Untuk validasi env fail-fast (zod) + health check BERLAPIS (`/health` cepat + `/health/detailed` cek DB, balikan 503 kalau sakit) + probe Kubernetes → lihat `skills/deploy/SKILL.md` §health.

### Pilar 4 — Pemantauan kejadian KEAMANAN (SIEM-lite) 🔒

- 👨‍🎓 **SIEM** (*Security Information & Event Management*) = sistem yang mengumpulkan log keamanan dari semua komponen ke SATU tempat + membunyikan alarm saat ada pola serangan. Versi enterprise (Elastic Security/Wazuh/Splunk) = **OPSIONAL** untuk tim skala ini; yang WAJIB = versi ringannya di bawah — pilar 1-3 menjaga app dari RUSAK, pilar 4 menjaga dari DISERANG.
- **Catat kejadian keamanan kunci** (audit-trail append-only → `skills/admin-panel/SKILL.md` §2 butir 2; ini daftar konkret kejadiannya): login gagal & sukses, ganti role/password, aksi admin (hapus/ekspor massal), permintaan ditolak (401/403), reset password. Sumbernya SUDAH ada di stack tanpa alat baru (dicek 2026-07): **Supabase** — log Auth/Postgres/API bisa di-query SQL di dashboard (Logs Explorer; lama simpan mengikuti plan); **Cloudflare** — Security Events dari WAF (skills/deploy); **Sentry** — bisa dipasangi aturan alert kustom, bukan cuma error.
- **Alarm otomatis pada anomali — mulai 3-5 aturan saja, jangan 50** (alarm kebanyakan = semua diabaikan): (1) login gagal beruntun dari 1 IP (tanda brute force); (2) lonjakan 401/403 (ada yang meraba-raba pintu); (3) aksi admin di jam janggal; (4) lonjakan error rate; (5) lonjakan penggunaan/biaya (denial-of-wallet; skills/deploy). Kirim ke jalur yang sama dengan alert error (Slack/email owner).
- **Retensi + ekspor:** log keamanan = bukti forensik saat insiden (`SECURITY_INCIDENT_PLAYBOOK.md`) — tahu batas simpan plan-mu; butuh lebih lama/terpusat → teruskan keluar (mis. Vercel **Drains**, plan Pro+ — dicek 2026-07) atau ekspor berkala.
- 🙂 **Non-programmer:** pilar 1-3 = alarm "toko rusak"; pilar 4 = alarm "toko DIBOBOL" — satpam mencatat siapa mencoba dobrak pintu berapa kali dan langsung membunyikan lonceng saat mencurigakan, bukan baru sadar seminggu kemudian dari kabar pelanggan.

---

## Checklist "sebelum online" (centang dulu)

- [ ] Sentry aktif di frontend **dan** backend, `environment` dibedakan, DSN di env (bukan kode).
- [ ] Log terstruktur + `trace-id` di entry point & jalur error; level benar; **tak ada secret/PII** ter-log; error dicatat penuh **sekali** (di boundary), bukan berlapis.
- [ ] Jaring tingkat-proses terpasang: `unhandledRejection`/`uncaughtException` → log + `exit(1)`; browser `error`/`unhandledrejection` → error-tracker.
- [ ] Payload Sentry disaring: `sendDefaultPii: false` + `beforeSend` membuang cookie/`authorization`/field sensitif; source map terbukti terbaca (nama berkas & baris ASLI) dan berkas `.map` tak tersaji publik.
- [ ] Minimal 3 metrik ambang terpasang (umur job tertua · laju `429` · cache hit-rate · biaya harian) — 3-5 alarm saja, jangan 50.
- [ ] Endpoint `/health` ada + terdaftar di uptime monitor.
- [ ] Alert routing jelas (siapa dapat notif saat GENTING — email/Slack owner).
- [ ] Kejadian keamanan kunci ter-log (login gagal, ganti role, aksi admin) + minimal 3 alarm anomali aktif (Pilar 4).
- [ ] (Opsional) error-rate threshold → alert kalau lonjakan error.

---

## 🙂 Untuk non-programmer (ringkas)

Berkas ini = cara memasang **pemantauan** di aplikasi sebelum dibuka untuk pelanggan. Tiga lapis: (1) **error tracking** — langsung kabari kamu kalau ada yang rusak menimpa pengguna; (2) **structured logging** (log terstruktur) — rekam otomatis apa yang terjadi biar gampang dilacak saat ada masalah; (3) **healthcheck** (cek detak) — pantau apakah app masih hidup. Ketiganya bikin masalah ketahuan segera, bukan setelah pengguna komplain.
