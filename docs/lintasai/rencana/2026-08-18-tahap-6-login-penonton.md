# Rencana — Tahap 6: Perkuat login penonton (tutup IDOR jalur koin)

**Tanggal:** 2026-08-18 · **Bobot:** BERAT (login + data pribadi + jalur uang)
**Keputusan owner:** perluas mekanisme admin yang sudah ada · akun lama "siapa cepat dia dapat"

## Kenapa ini dikerjakan (temuan, bukan permintaan fitur)

Bukan sekadar "biar rating jujur". Ada lubang aktif di jalur uang:

| Fakta | Bukti |
|---|---|
| Password saat daftar dibuang, tak pernah dikirim ke server | `app/daftar/page.tsx:66-70` |
| Login penonton menerima email apa pun TANPA cek password | `app/api/auth/login/route.ts:91-95` |
| Identitas diambil dari email kiriman klien | `lib/session.ts:100-110` |
| Saldo koin dibaca pakai email dari URL | `app/api/coins/route.ts:26` |
| Koin dibelanjakan pakai email dari body | `app/api/coins/unlock/route.ts:28` |

Dampak: siapa pun bisa membaca saldo & membelanjakan koin orang lain — koin dibeli
dengan uang asli lewat Midtrans (`app/api/coins/topup/route.ts`). Ini **IDOR**.
Skala saat ini kecil: 3 dompet, 42 koin, 0 episode terbeli — jadi sekarang waktu
termurah memperbaikinya.

## Kontrak (skill auth §1)

- **Input:** email + password (viewer) — dikirim lewat HTTPS, tak pernah masuk log.
- **Output:** sesi terverifikasi berupa cookie HttpOnly bertanda tangan. Identitas
  dipakai server diambil HANYA dari cookie itu.
- **Error:** 401 = belum login / sesi tak sah · 403 = sudah login tapi tak berhak.
- 🔒 Otorisasi per-resource memakai identitas SERVER-side, BUKAN email dari body/URL.

## Pendekatan & alasan menyimpang dari rak

Rak `auth` §2.1 menganjurkan memakai library auth teruji. Di sini SENGAJA tidak:
project sudah punya sesi HMAC-SHA256 + scrypt yang dipakai admin dan terbukti jalan
(`lib/session.ts`, `lib/admin-password.ts` — primitif standar Node, bukan kripto
karangan). Memasang library kedua = DUA sistem login berdampingan, yang justru
menambah permukaan salah. Rak = lantai; kenyataan kode client menang (§4.3).

**Jalur admin TIDAK disentuh sama sekali** — sudah aman, dan mengutak-atiknya
menambah risiko tanpa manfaat. Sesi penonton dibuat berdampingan lewat cookie
terpisah `dramaku_viewer`.

## Langkah

1. `lib/store.ts` — dokumen `viewerpass:<email>` -> `{ hash, salt, name, createdAt }`,
   mengikuti pola `adminpass:<email>` yang sudah ada.
2. `lib/session.ts` — tanda tangan sesi digeneralkan untuk role viewer; cookie
   `dramaku_viewer`. **`resolveUserEmail` kehilangan parameter fallback** supaya
   TypeScript memaksa semua pemanggil ditinjau (gagal saat build, bukan diam-diam).
3. `app/api/auth/register` — daftar penonton: simpan hash, langsung set cookie.
4. `app/api/auth/login` — cabang viewer wajib verifikasi password.
5. `app/api/auth/logout` — bersihkan KEDUA cookie.
6. 8 route (7 koin + rating) — identitas dari sesi saja.
7. `app/api/comments` — email & role dari sesi; nama tampilan boleh dari body
   (label kosmetik, bukan identitas).
8. Klien: `daftar`/`login` mengirim password; `Comments`/`RatingStars` berhenti
   mengirim email.

## Yang TIDAK dibangun (sengaja)

- **Verifikasi email & lupa-password** — project belum punya kemampuan kirim email
  (tak ada nodemailer/resend/sendgrid). Penonton yang lupa password TERKUNCI sampai
  fitur kirim email dipasang. Ini batas jujur yang harus ditulis di HANDOFF.
- Login sosial (Google), 2FA penonton, rate-limit khusus login penonton di luar
  `guardMutation` yang sudah ada.
- Rating penonton MASIH belum dikirim ke Google di tahap ini — baru boleh setelah
  tahap ini terbukti jalan di produksi.

## Yang ikut tersenggol

| Fitur yang dikenal owner | Kenapa | Penjaganya |
|---|---|---|
| Koin (saldo, check-in, buka episode, top-up) | Identitas pindah ke cookie | Tes + uji IDOR manual |
| Rating & komentar | Sama | Tes + uji manual |
| Penonton yang sudah "login" sekarang | localStorage bukan lagi identitas -> harus set password | Disepakati owner: siapa cepat dia dapat |
| Login admin | TIDAK disentuh | Diuji ulang sesudahnya |

## Pre-mortem

*Semua dikerjakan tapi nol guna — kenapa?*
→ Paling mungkin: lubang ditutup di route koin, TAPI satu route terlewat (mis.
`coins/history` atau `coins/checkin`) sehingga email dari klien masih diterima di
sana. Karena itu langkah 2 sengaja MENGHAPUS parameter fallback: kompilator yang
menemukan pemanggil tertinggal, bukan ingatan saya.
