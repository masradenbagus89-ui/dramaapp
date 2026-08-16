---
nama: python
deskripsi: Python (FastAPI/Django) kelas industri — validasi Pydantic di boundary, async aman, ruff/mypy/bandit, dependensi terkunci.
divisi: stack
pemicu: [python, fastapi, django, pydantic, ruff, drf, celery, pytest, serializer]
rawan_keamanan: false
menggantikan: []
---

# Skill: Python (FastAPI / Django / script) — kelas industri

> **Inti:** kode Python yang rapi berarti: `bandit` memindai rahasia yang ketinggalan di kode, type hints memberi label tipe data yang jelas, dan tiap error dicatat sebabnya lewat exception chaining (`from e`) — bukan cuma pesan generik. FastAPI/Django: router/view tetap tipis, logika berat dipindah ke service/CRUD supaya rapi & mudah diperbaiki.

---

## 1. Kontrak (yang HARUS benar — 7 pagar wajib sebelum kode Python dianggap aman)

- 🔒 **HASIL — Rahasia (secret) TAK PERNAH di-hardcode.** Ambil dari `os.environ[...]` / `python-dotenv`; jalankan **bandit** (`bandit -r src/` — pemindai keamanan statis Python) berkala untuk menangkap rahasia/pola berbahaya yang ketinggalan di kode. Detail → §2.
- 🔒 **HASIL — Error TAK BOLEH ditelan diam-diam (anti *silent failure*).** `except: pass` DILARANG; saat melempar-ulang error teknis jadi error domain sendiri, WAJIB `raise ErrorDomain(...) from e` (exception chaining = merantai error) — tanpa `from e`, jejak akar penyebab hilang dari log. Detail → §2.
- 🔒 **HASIL — Kolom yang harus unik WAJIB `UNIQUE`/unique index di DATABASE** (SQLAlchemy `unique=True`; Django `unique=True`). Tanpa constraint di level DB, penangkapan error di aplikasi TIDAK bisa mencegah data dobel saat 2 permintaan datang hampir bersamaan (balapan/*race condition*). Pola lengkap → §3.
- 🔒 **HASIL — Serializer DRF DILARANG `fields = '__all__'`; tiap endpoint FastAPI WAJIB `response_model`.** `fields = '__all__'` mengekspos SEMUA kolom termasuk `password_hash`/`is_admin`/token internal; `response_model` = pagar anti-bocor yang sama untuk FastAPI. Detail → §2.
- 🔒 **HASIL — Django produksi WAJIB setelan keamanan lengkap sebelum online** (`DEBUG=False`, HTTPS dipaksa, cookie aman, dst — daftar lengkap §3). Satu setelan lupa = pintu terbuka.
- 🔒 **HASIL — `PASSWORD_HASHERS` MD5 HANYA boleh di setelan TES, TIDAK PERNAH di `settings.py` produksi** (MD5 gampang dibobol). Detail → §2/§3.
- 🔒 **HASIL — task latar WAJIB dikirim SESUDAH transaksi commit.** `kirim_email.delay(obj.pk)` yang dipanggil DI DALAM `transaction.atomic()` bisa diambil worker **sebelum** datanya benar-benar tersimpan → task gagal "data tak ditemukan" secara ACAK (lolos di dev yang sepi, muncul di produksi saat ramai). WAJIB `transaction.on_commit(lambda: kirim_email.delay(obj.pk))`. Pola + jebakan turunannya → §3.

---

## 2. Cara rakit (prinsip — 📐 CARA BAKU, boleh diganti cara lain yang capai HASIL sama)

> Detail butir 1-13 (+ contoh kode) dipindah ke berkas rujukan on-demand — buka yang relevan saja:
> - Butir 1-3, 5-7 (type hints/idiom, error `from e`, FastAPI async anti-blokir, tes boundary, Supabase, Pydantic v2) → `skills/python/rujukan/fastapi-pydantic.md` — kapan: tiap kode Python/FastAPI/Pydantic.
> - Butir 4 & 8 (Django ORM anti-N+1 + serializer DRF anti-`__all__`; jebakan setelan per-versi, `check --deploy`) → `skills/python/rujukan/django-produksi.md` — kapan: project Django/DRF.
> - Butir 9-13 (`factory_boy`, suite ngebut + batas SQLite-vs-Postgres, kunci hitungan query, coverage bergigi, ruff/mypy) → `skills/python/rujukan/tes-django.md` — kapan: menulis/merapikan tes Django.

---

## 3. Powerful — pola siap-adaptasi (ambil polanya, JANGAN salin mentah)

> Pola lengkap + contoh kode dipindah ke berkas rujukan:
> - Cek unik anti-balapan (`UNIQUE` DB + tangkap `IntegrityError`) · tabel jebakan ORM Django · tabel obat error migrasi → `skills/python/rujukan/orm-migrasi.md` — kapan: insert data unik, query ORM, error migrasi.
> - Setelan keamanan produksi Django (`settings.py` lengkap WAJIB sebelum online) → `skills/python/rujukan/django-produksi.md` — kapan: mau online-kan Django.

---


### 🧪 Pasangan ❌ SALAH → ✅ BENAR — task latar vs transaksi (butir 🔒 §1 terakhir)

🙂 Non-Programmer: ini bug yang lolos di komputer sendiri lalu muncul acak di server ramai — paling mahal dicari karena tidak bisa ditiru ulang.

❌ SALAH — worker bisa mengambil task SEBELUM datanya benar-benar tersimpan:
```python
with transaction.atomic():
    pesanan = Pesanan.objects.create(**data)
    kirim_email.delay(pesanan.pk)   # gagal ACAK: "Pesanan matching query does not exist"
```

✅ BENAR — task baru dikirim setelah commit benar-benar terjadi:
```python
with transaction.atomic():
    pesanan = Pesanan.objects.create(**data)
    transaction.on_commit(lambda: kirim_email.delay(pesanan.pk))
```

> Lolos di dev karena beban sepi (commit selesai sebelum worker sempat mengambil), muncul di produksi saat ramai. Berlaku untuk SEMUA efek-samping luar di dalam `atomic()`: kirim email, panggil webhook, invalidasi cache.

---

## 4. Self-verify (sangkal diri sendiri SEBELUM bilang "selesai")

- [ ] Rahasia diambil dari env/`python-dotenv` (tak ada hardcode); `bandit -r src/` sudah dijalankan?
- [ ] Tak ada `except: pass`; error yang dilempar-ulang pakai `raise ErrorDomain(...) from e`?
- [ ] Kolom unik punya `UNIQUE`/unique index di DB (bukan cuma precheck `SELECT` di aplikasi)?
- [ ] `IntegrityError` ditangkap + diterjemahkan ke error domain (`DuplicateError`), bukan ditelan?
- [ ] FastAPI: `async` tak dicampur operasi sync-blocking (DB pakai `await`, kerja CPU/sync dibungkus `asyncio.to_thread`)?
- [ ] Tiap endpoint FastAPI punya `response_model`; serializer DRF **tak pernah** `fields = '__all__'`?
- [ ] Pydantic: versi terpasang dicek (v1 vs v2); PATCH pakai `exclude_unset=True`?
- [ ] Django produksi: `DEBUG=False` + daftar setelan keamanan §3 lengkap; `PASSWORD_HASHERS` MD5 **hanya** di setelan tes?
- [ ] Migrasi Django: tak ada file migrasi yang dihapus; `python manage.py check` lulus (produksi: `check --deploy` juga)?
- [ ] Tiap `tugas.delay(...)` di dalam transaksi dibungkus `transaction.on_commit`, dan yang dikirim **kunci** (`obj.pk`), bukan objek model?
- [ ] `select_for_update()` selalu berada di dalam `transaction.atomic()`?
- [ ] Django+AJAX: `CSRF_COOKIE_HTTPONLY` **tidak** dipasang; nilai ke `<script>` pakai `json_script` (bukan `escapejs`)?
- [ ] Endpoint yang rawan N+1 dikunci hitungan query (`django_assert_num_queries`/`assertNumQueries`)?
- [ ] `pytest` (+ coverage ber-`--cov-fail-under`) lulus; validasi input di boundary (Pydantic/serializer)?
- [ ] Jalur kritis + migrasi diuji di engine DB yang SAMA dengan produksi (bukan cuma SQLite `:memory:`)?

> **Verifikasi WAJIB cuma-baca**: membuktikan = baca kode + jalankan `bandit`/`pytest` (cuma-periksa) + menalar, JANGAN jalankan migrasi destruktif di lingkungan hidup.

---

## 5. Definition-of-Done (kapan skill Python dianggap benar-selesai)

- [ ] **Kontrak (§1) terpenuhi:** 7 pagar (rahasia, error tak ditelan, unique constraint DB, anti-bocor field, setelan produksi Django, MD5 hanya di tes, task latar sesudah commit).
- [ ] **Edge case** ditangani: 2 request barengan mendaftar email sama (balapan), PATCH tanpa `exclude_unset` menghapus data, migrasi jalan tak urut, endpoint tanpa `response_model` bocor field sensitif, task latar jalan sebelum commit ("data tak ditemukan" acak).
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris`.
- [ ] `bandit -r src/` + `pytest` (+ coverage) lulus lokal; kalau project pakai `ruff`/`mypy`, keduanya juga lulus.

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 **Kalau yang dibangun API** (desain kode status, bentuk respons, versi endpoint) — **jangan dirancang ulang di sini** → `skills/backend/SKILL.md`.
- 📐 **Keamanan web mendalam** (IDOR, rate-limit, CORS, SSRF, input tak-tepercaya) → `skills/owasp/SKILL.md`.
- 📐 **Login/sesi/cek-izin** (RBAC, alur auth) → `skills/auth/SKILL.md`.
- 📐 **Struktur DB / migrasi aman umum / RLS / index** (di luar jebakan ORM Django spesifik di §3) → `skills/database/SKILL.md`.
- 📐 **Kerja latar/antrean** (Celery dan sejenisnya) → `skills/background-job/SKILL.md`.
- 📐 **Panggilan API luar tahan-gagal** (retry/backoff/circuit-breaker) → `skills/tahan-gagal/SKILL.md`.
- 📐 **Supabase dari sisi Python** (RLS, `service_role`) → `skills/supabase-prisma/SKILL.md` untuk konsep umum RLS lintas-stack.
- 🗃️ **LATAR — kredit (MIT © Affaan Mustafa):** cek-unik anti-balapan, exception chaining, anti-blokir event loop, Pydantic v2, penjaga serializer DRF, setelan produksi + jebakan ORM + error migrasi + tes cepat Django diadaptasi dari skill/agen ECC v2.0.0 `fastapi-patterns`, `python-patterns`, `django-reviewer`, `django-security`, `django-build-resolver`, `django-tdd`, `python-testing` (ditulis-ulang non-programmer + dinetralkan). Gelombang 2026-07-27: "kirim `obj.pk` bukan objek model" diserap dari `django-celery`.
- 🗃️ **LATAR — ASLI kit (BUKAN dari sumber luar, jangan salah-kreditkan):** `transaction.on_commit` sebelum enqueue task (§1/§3 — ECC `django-celery` nol sebutan, ia justru cuma menambal gejalanya), pengunci hitungan query `assertNumQueries`/`django_assert_num_queries` (§2 — nol di kedua belah pihak; ECC hanya menyarankan periksa N+1 MANUAL lewat Debug Toolbar), `--cov-fail-under` sebagai gerbang bergigi, koreksi `CSRF_COOKIE_HTTPONLY` + `escapejs`→`json_script` + DRF 403-bukan-401 (ketiganya membetulkan nasihat ECC yang salah/kontradiktif), dan peringatan paritas SQLite-tes vs Postgres-produksi.

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** data user (kolom sensitif lewat serializer/response) & integritas database (unik, migrasi). **Mode-gagal khas:** rahasia ke-commit ke kode, error `except: pass` menyembunyikan kegagalan, dua request barengan lolos precheck lalu dobel-insert, serializer `__all__` mengekspos `password_hash`, Django online dengan `DEBUG=True`/cookie tak aman, file migrasi terhapus merusak riwayat lingkungan lain. **Mitigasi:** `bandit` + env untuk rahasia, exception chaining `from e`, `UNIQUE` di DB + tangkap `IntegrityError`, `response_model`/kolom eksplisit, daftar setelan keamanan `settings.py` produksi, `--fake` bukan hapus migrasi.
- 🗃️ **LATAR — Batas jujur:** skill ini menaikkan **lantai** keandalan & keamanan kode Python (FastAPI/Django); **tidak menggantikan** review keamanan mendalam untuk auth/pembayaran (buka `skills/owasp/SKILL.md`) maupun load-testing untuk skala tinggi. Pydantic v1↔v2 dan setelan Django berubah antar-versi — selalu cek versi terpasang sebelum menyalin.

🙂 **Non-Programmer:** kode Python diperiksa otomatis — cek rahasia (`bandit`), tulisan rapi (type hints), error tak ditelan diam-diam (dicatat sebabnya, bukan cuma "gagal"). FastAPI/Django: router/view tipis, kerja berat di service — biar rapi & mudah diperbaiki. Django yang mau dibuka ke publik punya daftar setelan keamanan wajib diaktifkan; satu yang terlewat = celah keamanan.
