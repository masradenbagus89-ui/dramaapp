# Rujukan: Cek unik anti-balapan + jebakan ORM + error migrasi — pola `skills/python/SKILL.md` §3

> Bagian dari `skills/python` — dibuka on-demand dari SKILL.md inti; membaca berkas ini TERCATAT tanda-terima Palang Rak (path skills/**.md).
> Konteks: pola siap-adaptasi (ambil polanya, JANGAN salin mentah) — insert data unik tanpa balapan, tabel jebakan ORM Django, tabel obat error migrasi.

## Cek unik: andalkan constraint DB, JANGAN precheck SELECT-lalu-INSERT (anti balapan 2-klik)

🗃️ LATAR: "Balapan" (*race condition*) = 2 permintaan masuk hampir bersamaan; keduanya lolos pengecekan lalu sama-sama menyimpan → data dobel. Kelas bug yang LOLOS semua tes biasa (tes jalan 1 permintaan) tapi muncul di produksi saat ramai.

🚨 **SYARAT MUTLAK:** kolom yang harus unik WAJIB punya `UNIQUE`/unique index di DB (SQLAlchemy `unique=True`; Django `unique=True`). Tanpa ini, penangkapan error di aplikasi TIDAK bisa mencegah dobel.

🧪 **CONTOH KASUS** — JANGAN `get_by_email()` dulu lalu insert (ada jeda antara cek & simpan — 2 request bisa lolos bareng). Langsung `add()` + `commit()`, tangkap `IntegrityError` → `rollback()` + `raise DuplicateError`. Biarkan constraint di DB (atomik) yang mencegah data dobel.

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

🙂 Non-Programmer: jangan cek dulu data kosong baru simpan — 2 permintaan bisa sama-sama lolos cek lalu bentrok. Biarkan aturan UNIK di database yang menolak data dobel, bukan pengecekan di aplikasi.

| Anti-pola | Perbaikan |
|---|---|
| `SELECT ... WHERE email=?` lalu `INSERT` kalau kosong | langsung `INSERT`/`add()`, tangkap `IntegrityError` |
| Andalkan cek aplikasi TANPA `UNIQUE` di DB | pasang `UNIQUE`/unique index dulu (DB yang menegakkan, atomik) |
| `except: pass` menelan `IntegrityError` | terjemahkan ke `DuplicateError` + pesan awam |

## Jebakan ORM Django (hilang-data & salah-diam)

🧪 **CONTOH KASUS:**

| Jebakan | Akibat | Perbaikan |
|---|---|---|
| `bulk_create([...])` tanpa `update_conflicts`/`ignore_conflicts` | baris bentrok unique-key DIAM-DIAM hilang | `bulk_create(objs, update_conflicts=True, unique_fields=[...], update_fields=[...])` (Django 4.1+) |
| `save()` tanpa `update_fields` | menimpa SEMUA kolom → 2 request barengan saling menghapus | `obj.save(update_fields=["status"])` |
| `.get(...)` tanpa handle `DoesNotExist` | 500 error tak tertangani | `try/except Model.DoesNotExist` atau `get_object_or_404` |
| `len(queryset)` untuk hitung | tarik SEMUA baris ke memori | `queryset.count()` |
| `if queryset:` untuk cek ada | eksekusi + cache seluruh queryset | `queryset.exists()` |
| `RunPython` tanpa `reverse_code` | migrasi tak bisa di-rollback | sertakan `reverse_code` (atau `migrations.RunPython.noop`) |
| 🔒 `tugas.delay(...)` dipanggil DI DALAM `transaction.atomic()` | worker mengambil task sebelum commit → gagal "data tak ditemukan" **acak** (dev sepi lolos, produksi ramai muncul) | `transaction.on_commit(lambda: tugas.delay(obj.pk))` |
| `select_for_update()` di LUAR `transaction.atomic()` | `TransactionManagementError` — kuncinya tak pernah terpasang | bungkus `with transaction.atomic():` dulu, baru `select_for_update()` |
| kirim **objek model** ke task latar (`tugas.delay(obj)`) | objeknya sudah BASI saat task jalan (nilai lama menimpa yang baru) | kirim kunci saja: `tugas.delay(obj.pk)`, lalu muat ulang di dalam task |

🙂 Non-Programmer: perintah "borongan" (`bulk_create`) bisa diam-diam membuang baris berkode kembar; simpan-polos (`save()`) menimpa seluruh baris — sebut kolom yang diedit biar tak menimpa perubahan yang sedang dilakukan pengguna lain secara bersamaan. Tiga baris terakhir soal "pekerjaan latar": kalau tugas dikirim terlalu cepat (sebelum data tersimpan) atau membawa salinan data lama, hasilnya gagal acak — susah dilacak karena di komputer sendiri sering lolos.

## Error migrasi Django — tabel obat (JANGAN hapus file migrasi)

> 2 prinsip keras: (1) **JANGAN pernah HAPUS file migrasi** yang sudah jalan — "fake"-kan (`--fake`); menghapus = merusak riwayat di lingkungan lain. (2) **SELALU `python manage.py check`** sesudah beres.

🧪 **CONTOH KASUS:**

| Error | Sebab | Obat |
|---|---|---|
| `InconsistentMigrationHistory` | migrasi jalan tak urut | `migrate --fake <app> <migrasi>` / squash |
| `Multiple leaf nodes in the migration graph` | 2 cabang migrasi | `python manage.py makemigrations --merge` |
| `Table already exists` | tabel ada, migrasi awal belum tercatat | `migrate --fake-initial` |
| kolom/tabel "tak ada" saat query | migrasi belum dijalankan | `python manage.py migrate` |

🔴 **DEV-ONLY (menghapus data app):** reset total `migrate <app> zero` → `makemigrations` → `migrate`. JANGAN di staging/produksi. (Prisma padanan: `prisma migrate resolve --applied <nama>` untuk menandai migrasi yang sudah terlanjur jalan.)

🙂 Non-Programmer: error migrasi berarti catatan perubahan database jadi tidak sinkron. Aturan: JANGAN hapus file migrasi — tandai `--fake` (sudah dijalankan), lalu cek ulang.
