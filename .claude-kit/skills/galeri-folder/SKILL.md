---
nama: galeri-folder
deskripsi: Galeri struktur folder project — contoh tata-letak berkas per jenis project (rumah yang benar untuk berkas baru).
divisi: stack
pemicu: [struktur-folder, galeri-folder, layout-project]
rawan_keamanan: false
menggantikan: []
---

# Skill: Galeri Folder — struktur project per-stack (contoh acuan)

> **Kapan skill ini aktif:** AI mau bikin berkas/folder **baru** di project staff dan perlu tahu "ini rumahnya di mana" — pemicu teks "struktur folder / galeri folder / layout project", atau otomatis saat project **masih kosong / belum punya struktur jelas**. Kalau project SUDAH punya struktur sendiri, galeri ini kalah oleh pola yang sudah ADA (lihat §1).
>
> 🙂 **Analogi:** struktur folder yang rapi = **lemari arsip** berlabel jelas (surat di laci A, kontrak di laci B) — bukan kardus campur aduk. Folder rapi = staff/AI berikutnya gampang lanjut kerja (istilah kit: **bus factor** naik — makin banyak orang bisa lanjutkan project tanpa nyangkut di satu kepala).

Skill ini **advisory** (§4.17): bukan cetakan paku-mati, tapi **denah contoh**. Otak native yang memutuskan pakai galeri ini apa adanya, adaptasi, atau abaikan — tapi butir **🔒 HASIL** di §1 tak boleh dilanggar apa pun keadaannya. Stack di galeri = Next.js/React dan Python (FastAPI/Django); stack lain ikuti konvensi resminya sendiri (§2 butir 3). Cek versi terpasang sebelum menyalin pola library (`zod`, dsb) — API berubah antar-versi (§8.2 A3).

---

## 1. Kontrak (yang HARUS benar sebelum galeri ini dipakai)

- 🔒 **HASIL — pola yang sudah ADA di repo SELALU menang.** Galeri ini **denah contoh, BUKAN cetakan paku-mati**. Saat AI bikin berkas baru di project staff, ikuti pola yang **sudah ADA** di repo itu dulu; galeri ini cuma acuan kalau project **masih kosong / belum punya struktur jelas**. Memaksakan galeri ke project yang sudah berstruktur beda = merusak konsistensi yang sudah dibangun tim.
- 🔒 **HASIL — notasi stabilo WAJIB dipahami sebelum dipakai, jangan disalin literal.** **(ISI sesuai project)** = ganti dengan nama domain project yang SEBENARNYA (mis. `orders/`, `invoices/`, `payment/`) — BUKAN folder bernama harfiah `<domain>` atau `(ISI sesuai project)`. **(biarkan)** = nama folder standar, dipakai apa adanya tanpa diubah. Salah paham notasi ini bikin AI membuat folder salah-nama di project asli.

---

## 2. Cara rakit (prinsip — 📐 CARA BAKU, boleh diganti cara lain yang capai HASIL sama)

1. 📐 **Kenapa struktur folder penting:** pemisahan jelas (route/komponen/lib/types/domain) bikin kode mudah dinavigasi, di-test, di-reuse — bukan satu folder raksasa. Folder rapi = staff/AI berikutnya gampang lanjut (bus factor naik, lihat analogi lemari arsip di atas).
2. 📐 **Nama domain diisi sesuai bisnis project.** Placeholder `<domain>`/`<service>` di dua galeri §3 = **ISI sesuai project** (contoh nyata: `invoices/`, `payment/`, `accounts/`, `orders/`, `products/`) — bukan dibiarkan sebagai teks placeholder.
3. 📐 **Stack di luar dua galeri §3 (bukan Next.js/React atau Python FastAPI/Django) → ikuti konvensi resmi stack itu sendiri**, tetap penuhi standar inti aturan kerja (§5 standar kode, §8 keamanan minimum, §9 DB & data, §10 frontend/UX/SEO, §11 proses dari `CLAUDE_universal_v1.md`).
4. 💡 SARAN: kalau ragu apakah project "sudah punya struktur jelas" atau "masih kosong" — lihat isi folder utama (`src/`, `app/`, dsb); ada >1 domain nyata sudah ditata = **sudah punya struktur**, galeri jadi rujukan tambahan bukan cetakan.

🙂 **Non-Programmer:** galeri ini bukan aturan kaku yang harus diikuti persis — anggap seperti **contoh denah rumah** di majalah. Kalau rumahmu (project) sudah punya tata-letak sendiri, AI ikuti tata-letak yang sudah ada; denah majalah cuma dipakai kalau rumahnya masih kosong.

---

## 3. Powerful — 2 galeri struktur + 1 cuplikan pola (🧪 ambil polanya, jangan salin mentah)

🧪 **CONTOH KASUS 1 — Next.js / React (web app modern — cek versi terpasang, §8.2):**

```
src/
  app/                 # (biarkan) Halaman + route — tiap folder = 1 URL
    (auth)/            # (biarkan) Grup halaman login/daftar/lupa-password
    (dashboard)/       # (biarkan) Grup halaman yang butuh login dulu
    api/
      webhooks/        # (ISI sesuai project) Pintu masuk notif luar (mis. pembayaran)
    layout.tsx         # (biarkan) Kerangka utama + provider (tema, sesi)
  components/
    ui/                # (biarkan) Komponen tampilan dasar (tombol, kartu)
    forms/             # (biarkan) Form + validasinya
    <domain>/          # (ISI sesuai project) Komponen khusus fitur, mis. invoices/
  hooks/               # (biarkan) Fungsi React pakai-ulang (custom hooks)
  lib/                 # (biarkan) "Dapur" logika: koneksi DB, helper, util
    <service>/         # (ISI sesuai project) Klien layanan luar, mis. payment/
  types/               # (biarkan) Definisi tipe data dipakai lintas-file (1 sumber)
```

- 👨‍💻 Programmer: validasi input di boundary (`app/api/*`, server action) pakai schema (mis. `zod`); tipe lintas-modul didefinisikan sekali di `types/` lalu di-import — jangan ditebak inline (selaras §5 standar kode). Detail lengkap Next.js → `skills/nextjs/SKILL.md`.
- 🙂 Non-Programmer: folder `app/` = **etalase** (yang dilihat pengunjung), folder `lib/` = **dapur** (logika tersembunyi). Pisah etalase dan dapur biar pas ganti resep, etalase nggak ikut berantakan.

🧪 **CONTOH KASUS 2 — Python: FastAPI / Django (API / backend — cek versi terpasang, §8.2):**

```
config/                # (biarkan) Pengaturan global aplikasi
  settings/
    base.py            # (biarkan) Setelan dipakai SEMUA lingkungan
    local.py           # (biarkan) Khusus komputer dev (DEBUG nyala)
    production.py      # (biarkan) Khusus server live (DEBUG mati, ketat)
  urls.py              # (biarkan) Daftar alamat utama (peta route)
apps/                  # (biarkan) Tiap sub-folder = 1 domain bisnis
  <domain>/            # (ISI sesuai project) mis. accounts/, orders/, products/
    models.py          # (biarkan) Bentuk tabel database
    serializers.py     # (biarkan) Saringan data masuk/keluar (validasi + format)
    views.py           # (biarkan) Penerima request — TIPIS, panggil services
    services.py        # (biarkan) Logika bisnis inti (aturan + transaksi)
    tasks.py           # (ISI kalau perlu) Kerja latar (kirim email, dll)
    tests/             # (biarkan) Tes otomatis per-domain
core/                  # (biarkan) Barang bersama lintas-domain
  exceptions.py        # (biarkan) Jenis error khusus
  permissions.py       # (biarkan) Aturan "siapa boleh apa"
  pagination.py        # (biarkan) Pengatur data per-halaman
  middleware.py        # (biarkan) Pencatat request + waktu
```

- 👨‍💻 Programmer: **service layer wajib** — `views.py` tipis (terima request, panggil `services.py`), logika + transaksi DB di `services.py`. Multi-write bungkus `transaction.atomic()` + `select_for_update()` cegah balapan stok/saldo (atomik, §5 standar kode). Detail lengkap Python → `skills/python/SKILL.md`.
- 🙂 Non-Programmer: `views.py` = **resepsionis** (terima + arahkan), `services.py` = **dapur** (yang mengerjakan). "Transaksi atomik" = kayak **transfer BCA**: gagal di tengah → saldo balik utuh.

🧪 **CONTOH KASUS 3 — cuplikan pola "service layer" (Python):** logika create-order taruh di `services.py`, view cukup memanggilnya.

```python
# apps/orders/services.py — logika bisnis dipisah dari view
def create_order(*, customer, product_id, quantity):
    product = Product.objects.select_for_update().get(id=product_id)  # kunci baris (anti balapan stok)
    if product.stock < quantity:
        raise InsufficientStockError()                                # gagal jujur, jangan dipaksa
    with transaction.atomic():                                        # semua-berhasil atau semua-batal
        order = Order.objects.create(customer=customer, product=product, quantity=quantity)
        product.stock -= quantity
        product.save(update_fields=["stock", "updated_at"])
    return order
```

---

## 4. Self-verify (sangkal diri sendiri SEBELUM bilang "selesai" — §8.2 Aturan 3)

- [ ] Sudah dicek: project ini **sudah punya struktur sendiri** (folder domain nyata sudah ada) atau **masih kosong**? Kalau sudah ada, galeri ini TIDAK dipaksakan?
- [ ] Placeholder `<domain>`/`<service>`/`(ISI sesuai project)` sudah **diganti nama bisnis nyata** — tak ada folder tersisa bernama harfiah `<domain>` di project asli?
- [ ] Notasi `(biarkan)` dipakai apa adanya, tak ikut diganti-ganti tanpa alasan?
- [ ] Kalau stack-nya BUKAN Next.js/React atau Python FastAPI/Django: konvensi resmi stack itu diikuti + standar inti (§5/§8/§9/§10/§11) tetap dipenuhi?
- [ ] Validasi boundary (Next.js) / service layer + `transaction.atomic()` (Python) diterapkan kalau memang membangun fitur di area itu, bukan cuma folder kosong?

> **Verifikasi WAJIB cuma-baca** (§8.2 Aturan 3): membuktikan = baca struktur repo yang sudah ADA (`Glob`/`Read`) sebelum menyimpulkan "project ini kosong" — jangan menebak.

---

## 5. Definition-of-Done (kapan skill galeri-folder dianggap benar-selesai)

- [ ] **Kontrak (§1) terpenuhi:** pola existing repo dicek dulu (menang atas galeri) + notasi stabilo dipahami benar.
- [ ] **Edge case** ditangani: project setengah-terstruktur (sebagian domain sudah rapi, sebagian belum) — folder baru ikut pola area terdekat, bukan galeri mentah.
- [ ] **Self-verify (§4) tercentang** dengan bukti (folder yang benar-benar dilihat, bukan asumsi).
- [ ] Nama domain final = nama bisnis nyata project (tak ada sisa placeholder `<domain>`/`<service>` di berkas yang dibuat).
- [ ] **Gerbang Pra-Rilis §4.6 LULUS** — "selesai" = struktur folder terbukti dilihat/dibuat, bukan "sudah kubayangkan".

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 **Detail teknis Next.js/React** (versi terpasang, pola lanjut) → `skills/nextjs/SKILL.md`.
- 📐 **Detail teknis Python** (FastAPI/Django, versi terpasang) → `skills/python/SKILL.md`.
- 📐 **Stack backend lain** → `skills/php/SKILL.md` · `skills/go/SKILL.md` (ikuti konvensi resmi masing-masing, §2 butir 3).
- 📐 **Pola API/service layer/kontrak endpoint** (di luar galeri folder ini) → `skills/backend/SKILL.md`.
- 📐 **Struktur DB / migrasi / RLS** (bukan struktur folder, tapi struktur data) → `skills/database/SKILL.md`.
- 🗃️ **LATAR — kredit (MIT):** adaptasi struktur-folder per-stack (saas-nextjs + django-api) ECC v2.0.0 (ditulis-ulang non-programmer).

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** konsistensi struktur project & kemudahan navigasi (bus factor). **Mode-gagal khas** (bukan kode salah, tapi struktur berantakan): galeri dipaksakan ke project yang sudah berstruktur beda hingga jadi dua pola campur-aduk; placeholder `<domain>`/`(ISI sesuai project)` tersalin literal jadi nama folder asli; folder baru ditaruh sembarangan di root. **Mitigasi:** cek pola existing dulu (§1) + pahami notasi stabilo + isi nama domain nyata + stack di luar galeri ikuti konvensi resminya.
- 🗃️ **LATAR — Batas jujur:** galeri ini baru mencontohkan 2 stack (Next.js/React, Python FastAPI/Django) — stack lain tak digambar eksplisit di sini, rujuk skill stack masing-masing (§6). Skill ini **tidak menggantikan** keputusan arsitektur nyata (kapan pisah modul/repo) — itu ranah §4.2 Refactor Bertingkat di aturan inti.

🙂 **Non-Programmer:** galeri folder ini cuma **contoh denah**, bukan aturan wajib-ikut. Aturan yang wajib cuma satu: kalau project sudah punya tata-letak sendiri, jangan diubah paksa jadi galeri ini — biarkan yang sudah ada, AI cuma menambah berkas baru dengan pola yang sama.
