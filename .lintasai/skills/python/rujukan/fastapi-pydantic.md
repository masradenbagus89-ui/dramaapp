# Rujukan: Python inti + FastAPI + Pydantic v2 — detail `skills/python/SKILL.md` §2 butir 1-3, 5-7

> Bagian dari `skills/python` — dibuka on-demand dari SKILL.md inti; membaca berkas ini TERCATAT tanda-terima Palang Rak (path skills/**.md).
> Konteks: detail "Cara rakit" untuk kode Python umum (type hints, error), FastAPI async, dan Pydantic v2. Nomor butir mengikuti §2 asli — butir 4 & 8 ada di `rujukan/django-produksi.md`, butir 9-13 di `rujukan/tes-django.md`.

1. 📐 **Type hints** di fungsi publik; hindari `Any` kalau bisa spesifik; `Optional` untuk yang boleh `None`. Idiom Pythonic: `is None` (bukan `== None`), `isinstance()` (bukan `type() ==`), default argumen JANGAN mutable (`def f(x=None)`, bukan `def f(x=[])` — sumber bug klasik).
2. 📐 **Error:** dilarang `except: pass` (menelan diam-diam); tangkap spesifik + pakai context manager `with` untuk file/koneksi. **Bungkus error WAJIB `raise ErrorDomain(...) from e`** — saat menangkap error teknis lalu melemparnya ulang jadi error domain sendiri, sertakan `from e` supaya log menampilkan RANTAI sampai akar penyebab ("`ConfigError` disebabkan oleh `JSONDecodeError`"). Tanpa `from e`, jejak akar (*traceback* = catatan langkah menuju error) HILANG → debugging jadi menebak. Sepasang dengan hierarki exception domain: `class AppError(Exception)` induk, lalu `ValidationError`/`NotFoundError` turunannya (pemanggil bisa tangkap per-jenis).
3. 📐 **FastAPI:** konstruksi app di `create_app()`; router TIPIS (logika ke service/CRUD); schema request/update/response **terpisah**; DB session + auth lewat *dependencies*; `async` benar (jangan campur operasi sync-blocking di dalam `async`).
   - **Anti-blokir "event loop":** "event loop" = pengatur giliran satu-jalur yang melayani banyak permintaan bergantian; kalau SATU panggilan menahannya, SEMUA permintaan lain ngantri (gejala menipu: di dev lancar, di produksi throughput anjlok saat ramai). DB → pakai async (`await db.execute(select(Item))`), JANGAN `db.query(Item).all()` sync di route `async`. Library sync-only (`requests.get()`, olah gambar/CPU berat) → bungkus `await asyncio.to_thread(fn, arg)` (Python 3.9+) atau `loop.run_in_executor(None, fn, arg)`.
5. 📐 **Tes:** `pytest` (+ coverage); validasi input di boundary (Pydantic/serializer), bukan di tengah logika.
6. 📐 **Supabase dari Python:** `service_role` key server-only (BYPASS RLS — *Row Level Security* = aturan level-database siapa boleh baca/tulis baris mana); RLS tetap pertahanan utama.

## Pydantic v2 (WAJIB cek versi dulu — v1 vs v2 beda API)

7. 📐 Cek versi terpasang (`pip show pydantic`) sebelum menyalin — v1↔v2 beda total (`orm_mode`→`from_attributes`, `.dict()`→`.model_dump()`, `@validator`→`@model_validator`, `BaseSettings` pindah ke paket `pydantic-settings`). Kalau project masih v1, verifikasi ke dokumentasi versi terpasang.
   - **Response schema** pakai `model_config = {"from_attributes": True}` (v1: `orm_mode = True`) supaya objek ORM langsung bisa jadi respons.
   - **Update parsial (PATCH)** pakai `payload.model_dump(exclude_unset=True)` — hanya field yang benar-benar dikirim yang diproses. Tanpa `exclude_unset`, field yang tak dikirim jadi `None` → menimpa data lama jadi kosong (bug klasik PATCH).
   - **Validasi antar-field** pakai `@model_validator(mode="after")` (mis. cek `password` == `password_confirm`).
   - **Konfigurasi aplikasi** pakai `pydantic-settings` `BaseSettings` (baca `.env` otomatis).
   - **Tiap endpoint WAJIB `response_model`** (mis. `@router.post(..., response_model=UserResponse)`) — pagar anti-bocor: field sensitif (password ter-hash, PII/data pribadi) yang tak tercantum otomatis TIDAK terkirim ke klien. (🔒 lihat `skills/python/SKILL.md` §1.)
   - 🙂 Non-Programmer: `response_model` membatasi field yang boleh dikirim ke klien — hanya kolom yang didaftarkan yang keluar, sisanya (mis. password ter-acak) ditahan. `exclude_unset` untuk edit-sebagian = aturan "yang tidak diisi jangan diubah" (kalau lupa, kolom kosong malah menghapus isi lama).
