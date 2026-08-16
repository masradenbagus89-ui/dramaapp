# Validasi boundary + otorisasi per-resource + amplop respons (backend §2.1–2.2 & §3)

> Bagian dari `skills/backend` — dibuka on-demand dari SKILL.md inti; membaca berkas ini TERCATAT tanda-terima Palang Rak (path skills/**.md).
> Konteks: detail "Cara rakit" §2 butir 1–2 + pola "Powerful" §3 (amplop `Ok`/`Err` + guard) dari `skills/backend/SKILL.md`. Nomor butir mengikuti §2 asli — butir 3–4 di `rujukan/desain-api.md`, butir 5 di `rujukan/penanganan-error.md`, butir 6–10 di `rujukan/arsitektur-modul.md`.

## Cara rakit §2 butir 1–2

1. 📐 **Validasi + sanitasi SEMUA input di pintu masuk (boundary).** Tiap data dari luar (HTTP body/query/header/URL/file/env) divalidasi bentuk+tipe+rentang SEBELUM dipakai. Pakai skema validasi (zod/valibot/pydantic/…). 🔒 HASIL: **query ke DB pakai parameter/prepared statement, JANGAN sambung-string** (cegah SQL injection = penyerang menyelipkan perintah lewat input).
2. 🔒 **HASIL — Otorisasi per-resource pakai identitas SERVER-side, BUKAN ID dari body/URL** (cegah **IDOR** = *Insecure Direct Object Reference* = penyerang mengganti angka ID di URL untuk mengambil data orang lain). Ambil "siapa user ini" dari **sesi/token terverifikasi di server**, lalu cek apakah dia berhak atas baris data yang diminta. Default-deny: mulai tak-boleh, buka izin seperlunya. → alur login & cek izin: `skills/auth/SKILL.md`.

## Powerful §3 — amplop respons + guard

Yang paling menghemat bug backend = **satu bentuk amplop respons** dipakai semua endpoint + **satu titik cek otorisasi**. 🧪 **CONTOH KASUS (ambil polanya, jangan salin mentah — netralkan ke stack + versi library terpasang):**

```ts
// Amplop respons SERAGAM — semua endpoint balas bentuk sama (klien tak perlu tebak-tebak).
// `page` cuma untuk endpoint daftar. `has_next` WAJIB ada bila `page` ada — klien butuh tahu "masih ada
// lagi?" tanpa menebak dari panjang array; `total` OPSIONAL (menghitung total di tabel besar itu mahal).
type Ok<T>  = { ok: true;  data: T; page?: { has_next: boolean; next?: string; self?: string; total?: number } }
type Err    = { ok: false; error: { code: string; message: string; requestId: string; details?: Array<{ field: string; message: string; code: string }> } } // 422 → isi `details` per-kolom yang gagal
// `requestId` = trace-id request ini (templates/PRODUCTION_OBSERVABILITY.md Pilar 2). WAJIB ikut di
// respons error — terutama 500 ber-pesan generik: tanpa ini user cuma bisa bilang "error dong", dan
// tak ada satu pun cara mencocokkannya dengan baris log. UI menampilkannya ("Kode: a3f91c").

// Pemakaian di route/handler — cek DI SERVER, tiap permintaan:
const user = await sesiTerverifikasi(req)          // identitas dari sesi server-side
if (!user) return json(401, { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Belum login' } })

const pesanan = await db.pesanan.findUnique({ where: { id } })
if (!pesanan) return json(404, { ok: false, error: { code: 'NOT_FOUND', message: 'Tak ada' } })
// 🔒 kunci anti-IDOR: baris ini milik user tsb? -> identitas dari SESI, bukan dari body/URL.
if (pesanan.ownerId !== user.id) return json(403, { ok: false, error: { code: 'FORBIDDEN', message: 'Tak berhak' } })
```

- 📐 CARA BAKU: input divalidasi skema DI ATAS handler (`parse(body)` gagal → balas **422** + isi `details[]` per-kolom yang gagal supaya form multi-kolom bisa menandai tiap input yang salah — selaras `skills/a11y/SKILL.md`; jangan lanjut).
- 💡 SARAN: taruh cek "boleh apa" di satu helper terpusat (`bolehkah(user, aksi, resource)`) — jangan sebar `if (role === 'admin')` di banyak berkas (satu tempat lupa = pintu bocor). → `skills/auth/SKILL.md`.

### Contoh pola ❌→✅ (ambil POLANYA, jangan salin mentah — cek versi paket/provider terpasang)

🧪 **Query parameterized, JANGAN sambung-string (butir 1 di atas)**:

❌ **SALAH** (input user disambung ke teks SQL = SQL injection):
```ts
const q = new URL(req.url).searchParams.get('q') ?? ''
// q = "%' UNION SELECT id, password_hash FROM users --" → menyatu ke teks SQL: kolom rahasia tabel lain ikut keluar
const rows = await db.$queryRawUnsafe(`SELECT id, nama FROM produk WHERE nama LIKE '%${q}%'`)
```
✅ **BENAR** (nilai dikirim sebagai parameter — driver yang meng-escape, input tak pernah jadi SQL):
```ts
const q = new URL(req.url).searchParams.get('q') ?? ''
const rows = await db.$queryRaw`SELECT id, nama FROM produk WHERE nama LIKE ${'%' + q + '%'}` // nilai jadi $1
// query-builder biasa (findMany { where }) sudah parameterized; jebakannya di jalur *Unsafe/string mentah
```

> Contoh ❌→✅ **anti-IDOR** (yang PALING kritis) sengaja tetap di `skills/backend/SKILL.md` §3 inti — lihat di sana, jangan digandakan.

🙂 **Non-Programmer:** endpoint yang "jalan" saat kamu tes sendiri belum tentu **aman**. Dua bahaya paling sering tak kelihatan di layar: (a) orang bisa mengganti angka di alamat dan melihat data orang lain (IDOR), dan (b) error yang "ditelan" diam-diam sehingga aplikasi kelihatan normal padahal ada data gagal tersimpan (pagar (b) → `skills/backend/rujukan/penanganan-error.md`). Skill ini memasang dua pagar itu.
