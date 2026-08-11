<!-- LINTAS:SEKSI §5-code-standards -->

## 5. Standar kode
- **Reuse > duplikasi.** Sebelum bikin util/komponen baru, cari di repo (grep nama domain + sinonim). Tulis 1 baris hasil di komentar/PR. Ini prinsip **DRY** (*Don't Repeat Yourself*); temannya **KISS** (solusi paling sederhana yang jalan, jangan over-engineering) & **YAGNI** (*You Aren't Gonna Need It* — jangan bangun fitur yang belum dibutuhkan).
- **Fungsi kecil, satu tanggung jawab.** Pecah file >300 baris atau yang menangani >1 peran.
- **Jangan mutasi data lama — buat salinan baru.** Ubah objek/array dengan menyalin dulu (`{...obj, x}` / `[...arr, item]`), BUKAN mengubah aslinya (`obj.x=...`, `arr.push()`, `arr.sort()`) — mutasi diam-diam = sumber bug susah dilacak + bisa gagal memicu render ulang UI.
- **Validasi di boundary** (pintu masuk data: handler/route, consumer queue, parser file). Tiap data dari luar (HTTP, queue, file, env, header, URL) divalidasi & disanitasi di pintu masuk.
- **Tipe data lintas-modul** didefinisikan sekali, dipakai ulang. Jangan ditebak inline.
- **Desain API rapi (endpoint publik):** bentuk respons **konsisten** di seluruh endpoint (amplop seragam: status sukses · data · error · info paginasi) · pakai **kode status HTTP yang BENAR** — 200/201 berhasil, 400 permintaan salah, 401 belum login, 403 tak berhak, 404 tak ada, 409 bentrok, 422 isi tak valid, 429 kebanyakan permintaan, 500 error server — **JANGAN kirim semua sebagai 200** (klien jadi tak bisa membedakan sukses dari gagal) · beri **versi** (`/v1/`) untuk perubahan yang memutus klien lama. Pendalaman: `skills/backend/SKILL.md`.
- **Error handling jelas:** tangkap spesifik, kasih konteks (apa, di mana, ID), jangan ditelan. Pesan user generik + actionable; detail teknis hanya ke log internal.
- **Log terstruktur** dengan request-id/trace-id di entry point & error path. info/warn/error. Jangan log secret/PII mentah.
- **Atomik** (semua berhasil / semua batal) **atau idempoten** (diulang 2× hasil sama) untuk operasi multi-write / retry-able.
- **Operasi independen jalan bareng, bukan antre.** Proses yang TIDAK saling bergantung dijalankan serentak (`Promise.all` di JS/TS, `asyncio.gather` di Python, goroutine di Go), bukan satu-per-satu menunggu — total waktu tunggu = yang paling lama saja.
- **Default deny.** Role/scope/policy/credential mulai NOL, tambah minimum yang perlu.
- **Microcopy UI:** suara aktif, max ~8 kata, hindari jargon. "Simpan" bukan "Submit modifikasi entity".
- **Aksi destruktif** wajib konfirmasi yang menyebut nama/jumlah objek ("Hapus 42 invoice?").

---

