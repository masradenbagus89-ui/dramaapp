# Rujukan: Django produksi + DRF — detail `skills/python/SKILL.md` §2 butir 4 & 8 + pola setelan keamanan §3

> Bagian dari `skills/python` — dibuka on-demand dari SKILL.md inti; membaca berkas ini TERCATAT tanda-terima Palang Rak (path skills/**.md).
> Konteks: ORM dasar + penjaga serializer DRF, jebakan setelan per-versi, dan daftar setelan keamanan `settings.py` WAJIB sebelum online.

## §2 butir 4 — Django & DRF (penjaga serializer)

4. 📐 **Django (kalau dipakai):** cegah N+1 (`select_related`/`prefetch_related`); migrasi terversion; serializer DRF untuk API; jangan query di template.
   - 🔒 **`DRF fields = '__all__'` = bocor SEMUA kolom (termasuk rahasia).** `ModelSerializer` (penerjemah baris DB → JSON balasan API) dengan `fields = '__all__'` mengekspos SETIAP kolom — termasuk `password_hash`, `is_admin`, token internal. WAJIB: daftar kolom eksplisit (`fields = ['id', 'email', 'username']`); `read_only_fields` untuk kolom auto (`id`, `created_at`); isi konteks pemilik data di `perform_create` (`serializer.save(user=self.request.user)`), BUKAN dari body request (cegah user mengaku jadi orang lain); di Django Admin pakai `readonly_fields` untuk data sensitif.

## §2 butir 8 — Django produksi: cek versi dulu

8. 📐 Cek versi: `SECURE_BROWSER_XSS_FILTER` sudah **usang/tak berefek di Django 4.0+** — JANGAN pakai. Nama setelan lain stabil di Django 3-5. Daftar setelan keamanan lengkap + kode → seksi "Setelan keamanan produksi" di bawah (berkas ini). Plus: JANGAN `@csrf_exempt` kecuali endpoint webhook yang memverifikasi tanda-tangan pengirim.
   - 🔒 **`CSRF_COOKIE_HTTPONLY = True` JANGAN dipasang kalau ada AJAX/`fetch`.** `HttpOnly` justru MENGHALANGI JavaScript membaca cookie `csrftoken` — padahal itu tepat yang dibutuhkan untuk mengisi header `X-CSRFToken`. Hasilnya semua POST dari browser tumbang 403. Dokumentasi Django sendiri menyarankan JANGAN. (Pagar CSRF-nya bukan `HttpOnly`, tapi `SameSite` + `CSRF_TRUSTED_ORIGINS`.)
   - 📐 **Nilai Python ke dalam `<script>` pakai `{{ x|json_script:"id" }}`, BUKAN `{{ x|escapejs }}`.** `escapejs` **tidak** menambahkan tanda kutip, jadi `var n = {{ nama|escapejs }};` menghasilkan JavaScript rusak (`var n = budi;` → error) dan menyesatkan orang menganggap sudah aman. `json_script` menulis nilainya sebagai JSON di elemen terpisah, lalu dibaca `JSON.parse(document.getElementById('id').textContent)`.
   - 📐 **DRF: pengunjung anonim dapat `403`, BUKAN `401`, kalau `SessionAuthentication` aktif** (401 hanya keluar bila ada skema yang mengirim `WWW-Authenticate`, mis. `TokenAuthentication`). Jangan menulis tes yang meng-assert 401 tanpa memeriksa `DEFAULT_AUTHENTICATION_CLASSES` project ini dulu.
   - 📐 **`python manage.py check --deploy` = pemeriksa CUMA-BACA** yang menyisir setelan produksi (DEBUG, cookie, HSTS) dan tak menyentuh data. Jalankan sebelum online; ia menangkap setelan lupa lebih cepat daripada membaca `settings.py` baris per baris.
   - 🙂 Non-Programmer: empat hal di atas = jebakan yang gejalanya menipu. Satu setelan cookie yang terlihat "lebih aman" justru bisa membuat semua tombol simpan gagal; satu penyaring teks yang terlihat aman justru menghasilkan halaman rusak. Perintah `check --deploy` = pemeriksa otomatis yang hanya MELIHAT, tak mengubah apa pun.

## §3 pola — Django produksi: setelan keamanan WAJIB sebelum online (`settings.py`)

> Cek versi: `SECURE_BROWSER_XSS_FILTER` sudah **usang/tak berefek di Django 4.0+** — JANGAN pakai. Nama setelan lain stabil di Django 3-5.

🧪 **CONTOH KASUS** — daftar setelan keamanan produksi:
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

🙂 Non-Programmer: daftar setelan keamanan WAJIB diaktifkan sebelum situs dibuka untuk umum — paksa HTTPS, amankan cookie, sembunyikan mode-debug, ambil kunci rahasia dari environment variable (env) bukan ditulis di kode. Satu setelan yang terlewat = celah keamanan.
