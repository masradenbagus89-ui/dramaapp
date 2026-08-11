---
nama: python
deskripsi: Python (FastAPI/Django) kelas industri — validasi Pydantic di boundary, async aman, ruff/mypy/bandit, dependensi terkunci.
divisi: stack
pemicu: [python, fastapi, django, pydantic, ruff]
rawan_keamanan: false
menggantikan: []
---

# Skill: Python (FastAPI / Django / script) — kelas industri

> **Kapan skill ini aktif:** **utama = deteksi config** — project punya `requirements.txt`/`pyproject.toml`, berkas `*.py`, `fastapi`/`django` di dependencies (§4.14 auto-detect). Teks "python/fastapi/django/pydantic/ruff" jadi pemicu sekunder. Skill ini paket-stack: tarik pas-ukuran saat menggarap kode Python, DI ATAS standar inti (§5/§8).
>
> 🙂 **Analogi:** kode Python yang rapi = pasien yang ditangani rumah sakit lengkap — ada **satpam di pintu** (`bandit` memindai rahasia yang ketinggalan di kode), **rekam medis diberi label jelas** (type hints), dan tiap keluhan **dicatat sebabnya** bukan cuma "sakit" (exception chaining `from e`). FastAPI/Django: "loket" (router/view) tetap tipis, kerja berat pindah ke "dapur" (service/CRUD) biar rapi & mudah diperbaiki.

Skill ini **advisory** (§4.17): otak native yang memutuskan adopsi/adaptasi/abaikan tiap 📐/💡. Butir **🔒 HASIL** = hasil keselamatan yang tak boleh gagal apa pun caranya. Cek versi terpasang (`pip show <paket>`, `requirements.txt`/`pyproject.toml`) sebelum menyalin pola — API pustaka (terutama Pydantic v1↔v2) berubah total antar-versi (§8.2 A3); jangan salin contoh mentah.

---

## 1. Kontrak (yang HARUS benar — 6 pagar wajib sebelum kode Python dianggap aman)

- 🔒 **HASIL — Rahasia (secret) TAK PERNAH di-hardcode.** Ambil dari `os.environ[...]` / `python-dotenv`; jalankan **bandit** (`bandit -r src/` — pemindai keamanan statis Python) berkala untuk menangkap rahasia/pola berbahaya yang ketinggalan di kode. Detail → §2.
- 🔒 **HASIL — Error TAK BOLEH ditelan diam-diam (anti *silent failure*).** `except: pass` DILARANG; saat melempar-ulang error teknis jadi error domain sendiri, WAJIB `raise ErrorDomain(...) from e` (exception chaining = merantai error) — tanpa `from e`, jejak akar penyebab hilang dari log. Detail → §2.
- 🔒 **HASIL — Kolom yang harus unik WAJIB `UNIQUE`/unique index di DATABASE** (SQLAlchemy `unique=True`; Django `unique=True`). Tanpa constraint di level DB, penangkapan error di aplikasi TIDAK bisa mencegah data dobel saat 2 permintaan datang hampir bersamaan (balapan/*race condition*). Pola lengkap → §3.
- 🔒 **HASIL — Serializer DRF DILARANG `fields = '__all__'`; tiap endpoint FastAPI WAJIB `response_model`.** `fields = '__all__'` mengekspos SEMUA kolom termasuk `password_hash`/`is_admin`/token internal; `response_model` = pagar anti-bocor yang sama untuk FastAPI. Detail → §2.
- 🔒 **HASIL — Django produksi WAJIB setelan keamanan lengkap sebelum online** (`DEBUG=False`, HTTPS dipaksa, cookie aman, dst — daftar lengkap §3). Satu setelan lupa = pintu terbuka.
- 🔒 **HASIL — `PASSWORD_HASHERS` MD5 HANYA boleh di setelan TES, TIDAK PERNAH di `settings.py` produksi** (MD5 gampang dibobol). Detail → §2/§3.

---

## 2. Cara rakit (prinsip — 📐 CARA BAKU, boleh diganti cara lain yang capai HASIL sama)

1. 📐 **Type hints** di fungsi publik; hindari `Any` kalau bisa spesifik; `Optional` untuk yang boleh `None`. Idiom Pythonic: `is None` (bukan `== None`), `isinstance()` (bukan `type() ==`), default argumen JANGAN mutable (`def f(x=None)`, bukan `def f(x=[])` — sumber bug klasik).
2. 📐 **Error:** dilarang `except: pass` (menelan diam-diam); tangkap spesifik + pakai context manager `with` untuk file/koneksi. **Bungkus error WAJIB `raise ErrorDomain(...) from e`** — saat menangkap error teknis lalu melemparnya ulang jadi error domain sendiri, sertakan `from e` supaya log menampilkan RANTAI sampai akar penyebab ("`ConfigError` disebabkan oleh `JSONDecodeError`"). Tanpa `from e`, jejak akar (*traceback* = catatan langkah menuju error) HILANG → debugging jadi menebak. Sepasang dengan hierarki exception domain: `class AppError(Exception)` induk, lalu `ValidationError`/`NotFoundError` turunannya (pemanggil bisa tangkap per-jenis). (🙂 seperti lapor "mesin mati KARENA aki soak", bukan cuma "mesin mati".)
3. 📐 **FastAPI:** konstruksi app di `create_app()`; router TIPIS (logika ke service/CRUD); schema request/update/response **terpisah**; DB session + auth lewat *dependencies*; `async` benar (jangan campur operasi sync-blocking di dalam `async`).
   - **Anti-blokir "event loop":** "event loop" = pengatur giliran satu-jalur yang melayani banyak permintaan bergantian; kalau SATU panggilan menahannya, SEMUA permintaan lain ngantri (gejala menipu: di dev lancar, di produksi throughput anjlok saat ramai). DB → pakai async (`await db.execute(select(Item))`), JANGAN `db.query(Item).all()` sync di route `async`. Library sync-only (`requests.get()`, olah gambar/CPU berat) → bungkus `await asyncio.to_thread(fn, arg)` (Python 3.9+) atau `loop.run_in_executor(None, fn, arg)`. (🙂 pekerjaan lama dititipkan ke petugas belakang biar kasir tetap melayani antrean.)
4. 📐 **Django (kalau dipakai):** cegah N+1 (`select_related`/`prefetch_related`); migrasi terversion; serializer DRF untuk API; jangan query di template.
   - 🔒 **`DRF fields = '__all__'` = bocor SEMUA kolom (termasuk rahasia).** `ModelSerializer` (penerjemah baris DB → JSON balasan API) dengan `fields = '__all__'` mengekspos SETIAP kolom — termasuk `password_hash`, `is_admin`, token internal. WAJIB: daftar kolom eksplisit (`fields = ['id', 'email', 'username']`); `read_only_fields` untuk kolom auto (`id`, `created_at`); isi konteks pemilik data di `perform_create` (`serializer.save(user=self.request.user)`), BUKAN dari body request (cegah user mengaku jadi orang lain); di Django Admin pakai `readonly_fields` untuk data sensitif. (🙂 `__all__` = fotokopi SELURUH map arsip lalu dikirim ke pelanggan — slip gaji & kartu akses ikut kebawa; aman = pilih kolom satu per satu.)
5. 📐 **Tes:** `pytest` (+ coverage); validasi input di boundary (Pydantic/serializer), bukan di tengah logika.
6. 📐 **Supabase dari Python:** `service_role` key server-only (BYPASS RLS — *Row Level Security* = aturan level-database siapa boleh baca/tulis baris mana); RLS tetap pertahanan utama.

### Pydantic v2 (WAJIB cek versi dulu — v1 vs v2 beda API)

7. 📐 Cek versi terpasang (`pip show pydantic`) sebelum menyalin — v1↔v2 beda total (`orm_mode`→`from_attributes`, `.dict()`→`.model_dump()`, `@validator`→`@model_validator`, `BaseSettings` pindah ke paket `pydantic-settings`). Kalau project masih v1, verifikasi ke dokumentasi versi terpasang (§8.2 Aturan 1).
   - **Response schema** pakai `model_config = {"from_attributes": True}` (v1: `orm_mode = True`) supaya objek ORM langsung bisa jadi respons.
   - **Update parsial (PATCH)** pakai `payload.model_dump(exclude_unset=True)` — hanya field yang benar-benar dikirim yang diproses. Tanpa `exclude_unset`, field yang tak dikirim jadi `None` → menimpa data lama jadi kosong (bug klasik PATCH).
   - **Validasi antar-field** pakai `@model_validator(mode="after")` (mis. cek `password` == `password_confirm`).
   - **Konfigurasi aplikasi** pakai `pydantic-settings` `BaseSettings` (baca `.env` otomatis).
   - **Tiap endpoint WAJIB `response_model`** (mis. `@router.post(..., response_model=UserResponse)`) — pagar anti-bocor: field sensitif (password ter-hash, PII/data pribadi) yang tak tercantum otomatis TIDAK terkirim ke klien. (🔒 lihat §1.)
   - 🙂 Non-Programmer: `response_model` = daftar tamu di pintu keluar — hanya data tercantum yang boleh keluar, sisanya (mis. password ter-acak) ditahan. `exclude_unset` untuk edit-sebagian = aturan "yang tidak diisi jangan diubah" (kalau lupa, kolom kosong malah menghapus isi lama).

### Django produksi — cek versi dulu

8. 📐 Cek versi (§8.2 Aturan 1): `SECURE_BROWSER_XSS_FILTER` sudah **usang/tak berefek di Django 4.0+** — JANGAN pakai. Nama setelan lain stabil di Django 3-5. Daftar gembok lengkap + kode → §3. Plus: JANGAN `@csrf_exempt` kecuali endpoint webhook yang memverifikasi tanda-tangan pengirim.

### Tes Django cepat: `factory_boy` (data uji) + setelan tes ngebut

9. 📐 **Data uji pakai `factory_boy`** (ganti bikin objek manual berulang): `DjangoModelFactory` + `Sequence` (nilai unik anti-tabrakan, mis. `email = factory.Sequence(lambda n: f"user{n}@example.com")`), `Faker` (data realistis), `SubFactory` (relasi otomatis), `UserFactory.create_batch(10)`.
10. 📐 **Suite ngebut:** `pytest.ini` `addopts = --reuse-db --nomigrations` (jangan bangun-ulang skema tiap run) + DB test `sqlite :memory:` + `CELERY_TASK_ALWAYS_EAGER = True` (task jalan langsung tanpa worker). 🔒 `PASSWORD_HASHERS` MD5 HANYA di setelan TES ini — lihat §1, JANGAN PERNAH ke `settings.py` produksi.
    - 🙂 Non-Programmer: `factory` = "cetakan data uji" (sekali cetak, ratusan data contoh); setelan tes cepat = tes ratusan skenario dalam detik, bukan menit. "Kunci gembok tes" (MD5) sengaja lemah biar cepat — cuma boleh di ruang latihan, tak boleh di gedung asli.
11. 💡 SARAN: project yang sudah pakai `ruff` (linter cepat) / `mypy` (pemeriksa tipe statis) → masukkan ke rangkaian pemeriksa sebelum kirim, dijalankan sesuai konfigurasi project (`pyproject.toml`/`ruff.toml`/`mypy.ini`) — cek dokumentasi versi terpasang sebelum menaruh flag di CI (§8.2 A3), jangan menebak flag dari ingatan.

🙂 **Non-Programmer (ringkasan):** kode Python dapat "ahli khusus" otomatis — cek rahasia (bandit = satpam pintu), tulisan rapi (type hints = label jelas di kotak arsip), error tak ditelan diam-diam. FastAPI: "loket" (router) tipis, kerja berat di "dapur" (service) — biar rapi & mudah diperbaiki.

---

## 3. Powerful — pola siap-adaptasi (ambil polanya, JANGAN salin mentah)

### Cek unik: andalkan constraint DB, JANGAN precheck SELECT-lalu-INSERT (anti balapan 2-klik)

🗃️ LATAR: "Balapan" (*race condition*) = 2 permintaan masuk hampir bersamaan; keduanya lolos pengecekan lalu sama-sama menyimpan → data dobel. Kelas bug yang LOLOS semua tes biasa (tes jalan 1 permintaan) tapi muncul di produksi saat ramai.

🚨 **SYARAT MUTLAK:** kolom yang harus unik WAJIB punya `UNIQUE`/unique index di DB (SQLAlchemy `unique=True`; Django `unique=True`). Tanpa ini, penangkapan error di aplikasi TIDAK bisa mencegah dobel.

🧪 **CONTOH KASUS** — JANGAN `get_by_email()` dulu lalu insert (ada jeda antara cek & simpan — 2 request bisa lolos bareng). Langsung `add()` + `commit()`, tangkap `IntegrityError` → `rollback()` + `raise DuplicateError`. Biarkan DB (atomik) jadi wasit tunggal.

```python
# SQLAlchemy (async) — andalkan constraint, bukan precheck
from sqlalchemy.exc import IntegrityError
self.db.add(user)
try:
    await self.db.commit()
except IntegrityError as exc:
    await self.db.rollback()
    raise DuplicateUserError from exc   # 'from exc' = simpan jejak error asli
```

```python
# Django — pola sama
from django.db import IntegrityError, transaction
try:
    with transaction.atomic():
        user = User.objects.create(email=email, ...)
except IntegrityError as exc:
    raise DuplicateUserError() from exc
```

🙂 Non-Programmer: seperti pesan kursi bioskop — jangan "lihat dulu kursi kosong, baru duduk" (2 orang bisa lihat kosong lalu rebutan). Biarkan sistem tiket menolak kursi dobel. Di sini "tiket"-nya = aturan UNIK di database.

| Anti-pola | Perbaikan |
|---|---|
| `SELECT ... WHERE email=?` lalu `INSERT` kalau kosong | langsung `INSERT`/`add()`, tangkap `IntegrityError` |
| Andalkan cek aplikasi TANPA `UNIQUE` di DB | pasang `UNIQUE`/unique index dulu (wasit atomik) |
| `except: pass` menelan `IntegrityError` | terjemahkan ke `DuplicateError` + pesan awam |

### Django produksi — setelan keamanan WAJIB sebelum online (`settings.py`)

> Cek versi (§8.2 Aturan 1): `SECURE_BROWSER_XSS_FILTER` sudah **usang/tak berefek di Django 4.0+** — JANGAN pakai. Nama setelan lain stabil di Django 3-5.

🧪 **CONTOH KASUS** — "daftar gembok" produksi:
```python
DEBUG = False                                 # 🚨 JANGAN True di produksi (bocor traceback + setelan)
SECRET_KEY = os.environ["DJANGO_SECRET_KEY"]  # dari env; kalau kosong -> ImproperlyConfigured (fail-fast)
ALLOWED_HOSTS = os.environ["ALLOWED_HOSTS"].split(",")
SECURE_SSL_REDIRECT = True                    # paksa HTTPS
SECURE_HSTS_SECONDS = 31536000                # 1 tahun
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True; CSRF_COOKIE_SECURE = True    # cookie hanya via HTTPS
SESSION_COOKIE_HTTPONLY = True; SESSION_COOKIE_SAMESITE = "Lax"
CSRF_TRUSTED_ORIGINS = ["https://app.contoh.com"]
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"                       # cegah clickjacking (situs dibingkai iframe jahat)
PASSWORD_HASHERS = ["django.contrib.auth.hashers.Argon2PasswordHasher", ...]  # Argon2 di posisi 1
```
Plus: JANGAN `@csrf_exempt` kecuali endpoint webhook yang memverifikasi tanda-tangan pengirim.

🙂 Non-Programmer: daftar gembok yang WAJIB dikunci sebelum situs dibuka untuk umum — paksa HTTPS, kunci cookie, sembunyikan mode-debug, ambil kunci rahasia dari brankas (env) bukan ditulis di kode. Satu gembok lupa = pintu terbuka.

### Jebakan ORM Django (hilang-data & salah-diam)

🧪 **CONTOH KASUS:**

| Jebakan | Akibat | Perbaikan |
|---|---|---|
| `bulk_create([...])` tanpa `update_conflicts`/`ignore_conflicts` | baris bentrok unique-key DIAM-DIAM hilang | `bulk_create(objs, update_conflicts=True, unique_fields=[...], update_fields=[...])` (Django 4.1+) |
| `save()` tanpa `update_fields` | menimpa SEMUA kolom → 2 request barengan saling menghapus | `obj.save(update_fields=["status"])` |
| `.get(...)` tanpa handle `DoesNotExist` | 500 error tak tertangani | `try/except Model.DoesNotExist` atau `get_object_or_404` |
| `len(queryset)` untuk hitung | tarik SEMUA baris ke memori | `queryset.count()` |
| `if queryset:` untuk cek ada | eksekusi + cache seluruh queryset | `queryset.exists()` |
| `RunPython` tanpa `reverse_code` | migrasi tak bisa di-rollback | sertakan `reverse_code` (atau `migrations.RunPython.noop`) |

🙂 Non-Programmer: perintah "borongan" (`bulk_create`) bisa diam-diam membuang barang bernama kembar; simpan-polos (`save()`) menimpa seluruh baris — sebut kolom yang diedit biar tak menimpa data tetangga yang sedang diedit orang lain.

### Error migrasi Django — tabel obat (JANGAN hapus file migrasi)

> 2 prinsip keras: (1) **JANGAN pernah HAPUS file migrasi** yang sudah jalan — "fake"-kan (`--fake`); menghapus = merusak riwayat di lingkungan lain. (2) **SELALU `python manage.py check`** sesudah beres.

🧪 **CONTOH KASUS:**

| Error | Sebab | Obat |
|---|---|---|
| `InconsistentMigrationHistory` | migrasi jalan tak urut | `migrate --fake <app> <migrasi>` / squash |
| `Multiple leaf nodes in the migration graph` | 2 cabang migrasi | `python manage.py makemigrations --merge` |
| `Table already exists` | tabel ada, migrasi awal belum tercatat | `migrate --fake-initial` |
| kolom/tabel "tak ada" saat query | migrasi belum dijalankan | `python manage.py migrate` |

🔴 **DEV-ONLY (menghapus data app):** reset total `migrate <app> zero` → `makemigrations` → `migrate`. JANGAN di staging/produksi. (Prisma padanan: `prisma migrate resolve --applied <nama>` untuk menandai migrasi yang sudah terlanjur jalan.)

🙂 Non-Programmer: error migrasi = catatan perubahan database "berantakan". Aturan: JANGAN robek halaman buku catatan (hapus file migrasi) — cukup coret & tandai "sudah beres" (`--fake`), lalu cek ulang.

---

## 4. Self-verify (sangkal diri sendiri SEBELUM bilang "selesai" — §8.2 Aturan 3)

- [ ] Rahasia diambil dari env/`python-dotenv` (tak ada hardcode); `bandit -r src/` sudah dijalankan?
- [ ] Tak ada `except: pass`; error yang dilempar-ulang pakai `raise ErrorDomain(...) from e`?
- [ ] Kolom unik punya `UNIQUE`/unique index di DB (bukan cuma precheck `SELECT` di aplikasi)?
- [ ] `IntegrityError` ditangkap + diterjemahkan ke error domain (`DuplicateError`), bukan ditelan?
- [ ] FastAPI: `async` tak dicampur operasi sync-blocking (DB pakai `await`, kerja CPU/sync dibungkus `asyncio.to_thread`)?
- [ ] Tiap endpoint FastAPI punya `response_model`; serializer DRF **tak pernah** `fields = '__all__'`?
- [ ] Pydantic: versi terpasang dicek (v1 vs v2); PATCH pakai `exclude_unset=True`?
- [ ] Django produksi: `DEBUG=False` + daftar gembok §3 lengkap; `PASSWORD_HASHERS` MD5 **hanya** di setelan tes?
- [ ] Migrasi Django: tak ada file migrasi yang dihapus; `python manage.py check` lulus?
- [ ] `pytest` (+ coverage) lulus; validasi input di boundary (Pydantic/serializer)?

> **Verifikasi WAJIB cuma-baca** (§8.2 Aturan 3): membuktikan = baca kode + jalankan `bandit`/`pytest` (cuma-periksa) + menalar, JANGAN jalankan migrasi destruktif di lingkungan hidup.

---

## 5. Definition-of-Done (kapan skill Python dianggap benar-selesai)

- [ ] **Kontrak (§1) terpenuhi:** 6 pagar (rahasia, error tak ditelan, unique constraint DB, anti-bocor field, setelan produksi Django, MD5 hanya di tes).
- [ ] **Edge case** ditangani: 2 request barengan mendaftar email sama (balapan), PATCH tanpa `exclude_unset` menghapus data, migrasi jalan tak urut, endpoint tanpa `response_model` bocor field sensitif.
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris`.
- [ ] `bandit -r src/` + `pytest` (+ coverage) lulus lokal; kalau project pakai `ruff`/`mypy`, keduanya juga lulus.
- [ ] **Gerbang Pra-Rilis §4.6 LULUS** — "selesai" = terbukti (tes dijalankan, keluaran dilihat), bukan "sudah kutulis".

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 **Kalau yang dibangun API** (desain kode status, bentuk respons, versi endpoint) — **jangan dirancang ulang di sini** → `skills/backend/SKILL.md`.
- 📐 **Keamanan web mendalam** (IDOR, rate-limit, CORS, SSRF, input tak-tepercaya) → `skills/owasp/SKILL.md`.
- 📐 **Login/sesi/cek-izin** (RBAC, alur auth) → `skills/auth/SKILL.md`.
- 📐 **Struktur DB / migrasi aman umum / RLS / index** (di luar jebakan ORM Django spesifik di §3) → `skills/database/SKILL.md`.
- 📐 **Kerja latar/antrean** (Celery dan sejenisnya) → `skills/background-job/SKILL.md`.
- 📐 **Panggilan API luar tahan-gagal** (retry/backoff/circuit-breaker) → `skills/tahan-gagal/SKILL.md`.
- 📐 **Supabase dari sisi Python** (RLS, `service_role`) → `skills/supabase-prisma/SKILL.md` untuk konsep umum RLS lintas-stack.
- 🗃️ **LATAR — kredit (MIT © Affaan Mustafa):** cek-unik anti-balapan, exception chaining, anti-blokir event loop, Pydantic v2, penjaga serializer DRF, setelan produksi + jebakan ORM + error migrasi + tes cepat Django diadaptasi dari skill/agen ECC v2.0.0 `fastapi-patterns`, `python-patterns`, `django-reviewer`, `django-security`, `django-build-resolver`, `django-tdd`, `python-testing` (ditulis-ulang non-programmer + dinetralkan).

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** data user (kolom sensitif lewat serializer/response) & integritas database (unik, migrasi). **Mode-gagal khas:** rahasia ke-commit ke kode, error `except: pass` menyembunyikan kegagalan, dua request barengan lolos precheck lalu dobel-insert, serializer `__all__` mengekspos `password_hash`, Django online dengan `DEBUG=True`/cookie tak aman, file migrasi terhapus merusak riwayat lingkungan lain. **Mitigasi:** `bandit` + env untuk rahasia, exception chaining `from e`, `UNIQUE` di DB + tangkap `IntegrityError`, `response_model`/kolom eksplisit, daftar gembok `settings.py` produksi, `--fake` bukan hapus migrasi.
- 🗃️ **LATAR — Batas jujur:** skill ini menaikkan **lantai** keandalan & keamanan kode Python (FastAPI/Django); **tidak menggantikan** review keamanan mendalam untuk auth/pembayaran (buka `skills/owasp/SKILL.md`) maupun load-testing untuk skala tinggi. Pydantic v1↔v2 dan setelan Django berubah antar-versi — selalu cek versi terpasang (§8.2 A3) sebelum menyalin.

🙂 **Non-Programmer:** kode Python dapat "ahli khusus" otomatis — cek rahasia (bandit = satpam pintu), tulisan rapi (type hints = label jelas di kotak arsip), error tak ditelan diam-diam (dicatat sebabnya, bukan cuma "gagal"). FastAPI/Django: "loket" (router/view) tipis, kerja berat di "dapur" (service) — biar rapi & mudah diperbaiki. Django yang mau dibuka ke publik punya "daftar gembok" wajib dikunci; satu lupa = pintu terbuka.
