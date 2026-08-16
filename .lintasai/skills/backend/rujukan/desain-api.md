# Desain API REST + operasi multi-tulis (backend §2.3–2.4)

> Bagian dari `skills/backend` — dibuka on-demand dari SKILL.md inti; membaca berkas ini TERCATAT tanda-terima Palang Rak (path skills/**.md).
> Konteks: detail "Cara rakit" §2 butir 3–4 dari `skills/backend/SKILL.md` — atomik/idempoten, penamaan URL, konvensi query-param, paginasi, `ETag`/`If-Match`, method HTTP, deprecation/versi. Nomor butir mengikuti §2 asli — butir 1–2 di `rujukan/validasi-otorisasi.md`, butir 5 di `rujukan/penanganan-error.md`, butir 6–10 di `rujukan/arsitektur-modul.md`.

3. 📐 **Operasi multi-tulis = atomik ATAU idempoten.** **Atomik** (semua-jadi atau semua-batal) = pakai transaksi DB saat beberapa tulis harus konsisten. **Idempoten** (kebal-ulang = dijalankan 2× hasilnya sama, tak dobel) = untuk operasi yang bisa di-retry klien/jaringan (mis. anti bayar-dobel). → pola idempoten: `skills/pembayaran/SKILL.md`.
4. 📐 **Desain API rapi (REST):** amplop respons konsisten · status code benar (SKILL.md inti §1) · **versi di URL** (`/v1/`) untuk perubahan yang memutus klien lama. List besar = **paginasi** (potong per halaman) + **index kolom** yang di-`ORDER BY`/`WHERE` (jangan kirim ribuan baris sekaligus).
   - **Penamaan URL** (sulit diubah setelah klien pihak-ketiga memakainya — pilih benar sejak awal): resource = **kata benda JAMAK huruf kecil kebab-case** (`/team-members`), **DILARANG kata kerja** di URL (`/getTeamMembers` salah — aksinya sudah diwakili method HTTP), **DILARANG `snake_case` & bentuk tunggal** (`/team_members`, `/user` salah). Kepemilikan = **sub-resource** (`/users/:id/orders`). Aksi non-CRUD yang tak bisa dipetakan = kata kerja HEMAT (`POST /orders/:id/cancel`). Penamaan field body **konsisten** (jangan campur `camelCase`/`snake_case`). (Kebab-case URL halaman sudah dibahas di `skills/seo/SKILL.md` — sama prinsip, RUJUK.)
   - **Konvensi query-param — pilih SEKALI, pakai di SEMUA endpoint** (klien belajar sekali, bukan menghafal aturan berbeda tiap alamat): saring `?status=active` · banyak-nilai `?kategori=elektronik,pakaian` · pembanding `?harga[gte]=10&harga[lte]=100` · urut `?sort=-dibuat_pada` (awalan `-` = menurun; koma = urut bertingkat) · cari bebas `?q=kata kunci` · field bersarang `?pelanggan.negara=ID`. Paginasi: halaman-jauh/feed pakai **cursor/keyset**, bukan `OFFSET` besar → `skills/supabase-prisma/SKILL.md`.
   - 🔒 **HASIL — Ambil KOLOM SEPERLUNYA, JANGAN `SELECT *` / `select('*')`.** Kolom yang tak dipakai membengkakkan respons **dan** membocorkan kolom internal yang tak pernah dimaksudkan keluar (`passwordHash`, catatan internal). Sebutkan kolomnya eksplisit, atau petakan dulu ke bentuk respons (DTO) sebelum dikirim.
   - 📐 **Anti N+1** (*N+1 query* = 1 query mengambil daftar, lalu 1 query LAGI **per baris** di dalam loop → 100 baris jadi 101 query; halaman makin lambat seiring data bertambah, dan sering baru terasa di produksi). Ambil relasinya **sekali secara batch** lalu jodohkan di memori (`Map`), atau pakai `include`/`select`/`JOIN`. Detail + `EXPLAIN ANALYZE` → `skills/supabase-prisma/SKILL.md`.
   - 📐 **Permintaan bersyarat (*conditional request*) — hemat kuota + cegah tulis saling-menimpa.** Server mengirim **`ETag`** = sidik-jari versi data (mis. `"v7"`); klien menyimpannya lalu memakainya di permintaan berikutnya. Dua pemakaian:
     - **Baca:** klien kirim `If-None-Match: "v7"` → kalau data belum berubah, balas **`304 Not Modified`** *tanpa body*. Berguna untuk GET berat/sering (daftar panjang, detail produk) — pemakai HP hemat kuota & layar terisi lebih cepat.
     - 🔒 **HASIL — Tulis:** data yang bisa diedit **lebih dari satu orang** (stok, harga, artikel, status pesanan) → PUT/PATCH **wajib** menyertakan `If-Match: "<etag>"`; kalau sidik-jarinya sudah berbeda balas **`412 Precondition Failed`** (minta klien muat ulang lalu ulangi). Tanpa ini dua orang yang menyimpan hampir bersamaan = **yang belakangan menimpa diam-diam** — datanya hilang tanpa satu pun pesan error (kerusakan SENYAP). Alternatif setara: kolom versi/`updated_at` yang dicek di `WHERE` saat UPDATE (*optimistic concurrency* → `skills/admin-panel/SKILL.md`). Pilih salah satu — jangan tak ada sama sekali.
   - 💡 **GraphQL (kalau project INI memakainya — cek dulu, jangan berasumsi):** kontrak, validasi di boundary, dan otorisasi per-resource **sama persis** dengan REST. Bedanya: satu query bisa menembus banyak resource sekaligus → cek izin **per-field**, bukan sekali di pintu masuk. Pagar khusus (introspection OFF di produksi, batas kedalaman/kompleksitas/batching) → `skills/owasp/SKILL.md`.
   - **Method HTTP → boleh-tidaknya klien retry otomatis** (menyambung idempoten poin 3): pilih method yang benar supaya klien/proxy/SDK-mobile tahu aman-tidaknya mengulang permintaan saat jaringan putus (salah = pesanan dobel).

     | Method | Idempoten (ulang = hasil sama) | Aman (tak mengubah data) | Untuk |
     |---|---|---|---|
     | GET | ✅ | ✅ | baca |
     | POST | ❌ | ❌ | buat / picu aksi |
     | PUT | ✅ | ❌ | ganti utuh |
     | PATCH | ❌ | ❌ | ubah sebagian |
     | DELETE | ✅ | ❌ | hapus |

     PATCH ditandai ❌ karena bentuk lazimnya mengirim **selisih** (`{ stok: -1 }` → dijalankan 2× stok berkurang 2). PATCH **bisa** dibuat idempoten kalau yang dikirim **nilai akhir**, bukan selisih (`{ stok: 41 }`) — pilih sadar, jangan campur dua gaya di satu API.
   - **Deprecation (ubah API tanpa memutus klien lama):** perubahan **non-breaking** (tambah field baru · query param opsional · endpoint baru) TAK perlu versi baru; **breaking** (hapus/rename field · ubah TIPE field · ubah bentuk URL/auth) WAJIB `/v2/` sambil `/v1/` tetap hidup (pola tambah-dulu-hapus-belakangan, sama seperti migrasi DB → `skills/database/SKILL.md`). **Maksimal 2 versi aktif** (yang sekarang + satu sebelumnya) — begitu `/v3/` lahir, yang tertua masuk jadwal mati; tanpa rem ini tiap versi lama ikut dirawat & diuji selamanya. Endpoint yang mau dimatikan: kirim header **`Sunset`** dulu (beri klien waktu — mis. 1 siklus rilis / beberapa bulan, sesuaikan kontrak, jangan jadikan angka mati), balas **`410 Gone`** setelah lewat. ⚠️ Isi `Sunset` **wajib format tanggal HTTP** (`Sunset: Sat, 01 Jan 2026 00:00:00 GMT`) — `2026-01-01` bukan format sah dan **diabaikan diam-diam** oleh klien/SDK, jadi peringatannya tak pernah sampai. Umumkan lebih dulu → `skills/devops/SKILL.md`.
     - 💡 **Versi di URL = baku kit** (paling gampang dilihat, di-log, dan di-cache). Ada gaya lain: versi lewat header (`Accept: application/vnd.<app>.v2+json`) — URL bersih tapi lebih gampang terlupa & sulit diuji manual. Kalau project client **sudah** memakai gaya header, **IKUTI yang ada** (kenyataan kode client MENANG, AGENTS.md §4.3) — jangan diseragamkan paksa ke URL, itu justru breaking change untuk klien mereka.

### Contoh pola ❌→✅ (ambil POLANYA, jangan salin mentah — cek versi paket/provider terpasang)

🧪 **Ambil kolom seperlunya, JANGAN `SELECT *`/`select('*')` (butir 4 di atas)**:

❌ **SALAH** (semua kolom ikut keluar, termasuk yang tak pernah dimaksudkan publik):
```ts
const { data } = await supabase.from('users').select('*').eq('id', id).single()
return Response.json({ ok: true, data }) // password_hash + catatan_internal ikut terkirim ke browser
```
✅ **BENAR** (sebut kolom eksplisit — respons hanya berisi yang memang untuk keluar):
```ts
const { data, error } = await supabase.from('users').select('id, nama, email').eq('id', id).single()
if (error) throw new AppError('Gagal ambil user', { cause: error }) // jangan ditelan (§2 butir 5 → rujukan/penanganan-error.md) — penerjemah boundary yang memberi status
return Response.json({ ok: true, data }) // kolom internal tak pernah menyentuh jaringan
```
