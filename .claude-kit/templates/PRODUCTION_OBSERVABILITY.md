# templates/PRODUCTION_OBSERVABILITY.md - Pasang "Alarm" supaya App Tak Error Diam-Diam di Produksi

> Versi 1.1 · 2026-07-14 · Untuk app produksi (Next.js / Python / Supabase, deploy Vercel/Railway/Render). · v1.1: + Pilar 4 pemantauan kejadian keamanan (SIEM-lite)
> Pelengkap, BUKAN pengganti: setup tool dasar = `SPLIT_REPO_TOOLS_SETUP.md` §12 (Sentry 3-baris) · backup DB = `backup-schemas.yml` · standar log = `CLAUDE_universal_v1.md` §5. File ini **mengangkat observability jadi standar wajib-sebelum-online** + langkah konkret 3 pilar.

## Tujuan & kapan dipakai

Dipakai **sebelum app dipakai user sungguhan** (atau saat staff bilang *"mau online"*, *"deploy ke produksi"*, *"app sering error tapi nggak tahu kenapa"*). Tujuan: app **memberi tahu kita saat ada masalah**, bukan kita baru tahu dari komplain user.

- 👨‍🎓 **Junior:** *observability* = kemampuan tahu "apa yang terjadi di dalam app saat jalan di produksi" lewat 3 pilar: **error tracking** (tangkap exception otomatis), **structured logging** (log ber-`trace-id` yang bisa dilacak antar-service), **healthcheck/uptime** (endpoint `/health` + monitor). Tanpa ini, *silent failure* (gagal diam-diam) bisa berjam-jam tak terdeteksi. Aturan §5 sudah mewajibkan "log terstruktur + jangan telan error" — file ini langkah konkretnya.
- 🙂 **Non-programmer:** ini seperti **alarm kebakaran + CCTV** untuk aplikasi. Kalau ada yang rusak menimpa pengguna, kamu **langsung dapat kabar** (bukan nunggu pelanggan komplain). Tanpa ini, app yang error itu seperti toko yang kebakaran di malam hari tanpa alarm.

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

### Pilar 2 — Structured Logging + trace-id (log yang bisa dilacak) 🥈

```ts
// Next.js: pakai pino (atau console JSON) — log = objek, bukan string acak
import pino from "pino";
export const log = pino({ level: process.env.LOG_LEVEL ?? "info" });
// tiap request beri trace-id, teruskan ke log + ke backend (header x-trace-id)
log.info({ traceId, userId, route: "/api/checkout" }, "checkout dimulai");
```
- 👨‍🎓 *trace-id* = nomor seri unik per-request, ikut di semua log lintas-service → saat ada error, kamu bisa rangkai "apa yang terjadi" dari frontend → backend → DB. Level: `info` (aksi sukses penting), `warn` (anomali), `error` (gagal perlu tindak lanjut).
- 🚨 **JANGAN log secret/PII mentah** (password, token, nomor kartu, KTP) — §8. Mask: `email=a***@x.com`.

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
- **Catat kejadian keamanan kunci** (audit log §8, ini daftar konkretnya): login gagal & sukses, ganti role/password, aksi admin (hapus/ekspor massal), permintaan ditolak (401/403), reset password. Sumbernya SUDAH ada di stack tanpa alat baru (dicek 2026-07): **Supabase** — log Auth/Postgres/API bisa di-query SQL di dashboard (Logs Explorer; lama simpan mengikuti plan); **Cloudflare** — Security Events dari WAF (§4.14-4); **Sentry** — bisa dipasangi aturan alert kustom, bukan cuma error.
- **Alarm otomatis pada anomali — mulai 3-5 aturan saja, jangan 50** (alarm kebanyakan = semua diabaikan): (1) login gagal beruntun dari 1 IP (tanda brute force); (2) lonjakan 401/403 (ada yang meraba-raba pintu); (3) aksi admin di jam janggal; (4) lonjakan error rate; (5) lonjakan penggunaan/biaya (denial-of-wallet §4.14-4). Kirim ke jalur yang sama dengan alert error (Slack/email owner).
- **Retensi + ekspor:** log keamanan = bukti forensik saat insiden (`SECURITY_INCIDENT_PLAYBOOK.md`) — tahu batas simpan plan-mu; butuh lebih lama/terpusat → teruskan keluar (mis. Vercel **Drains**, plan Pro+ — dicek 2026-07) atau ekspor berkala.
- 🙂 **Non-programmer:** pilar 1-3 = alarm "toko rusak"; pilar 4 = alarm "toko DIBOBOL" — satpam mencatat siapa mencoba dobrak pintu berapa kali dan langsung membunyikan lonceng saat mencurigakan, bukan baru sadar seminggu kemudian dari kabar pelanggan.

---

## Checklist "sebelum online" (centang dulu)

- [ ] Sentry aktif di frontend **dan** backend, `environment` dibedakan, DSN di env (bukan kode).
- [ ] Log terstruktur + `trace-id` di entry point & jalur error; level benar; **tak ada secret/PII** ter-log.
- [ ] Endpoint `/health` ada + terdaftar di uptime monitor.
- [ ] Alert routing jelas (siapa dapat notif saat GENTING — email/Slack owner).
- [ ] Kejadian keamanan kunci ter-log (login gagal, ganti role, aksi admin) + minimal 3 alarm anomali aktif (Pilar 4).
- [ ] (Opsional) error-rate threshold → alert kalau lonjakan error.

---

## 🙂 Untuk non-programmer (ringkas)

Berkas ini = cara memasang **alarm + CCTV** di aplikasi sebelum dibuka untuk pelanggan. Tiga lapis: (1) **alarm error** — langsung kabari kamu kalau ada yang rusak menimpa pengguna; (2) **buku catatan otomatis** — rekam apa yang terjadi biar gampang dilacak saat ada masalah; (3) **detak jantung** — pantau apakah app masih hidup. Mirip **toko yang punya alarm, CCTV, dan satpam** — bukan toko yang baru tahu kemalingan pas buka pagi.
