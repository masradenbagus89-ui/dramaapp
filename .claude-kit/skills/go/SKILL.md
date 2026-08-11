---
nama: go
deskripsi: Backend Go/Golang kelas industri — tiap err diperiksa, tiap panggilan keluar ber-timeout, connection pool dibatasi, berhenti dengan rapi (graceful shutdown).
divisi: stack
pemicu: [golang, goroutine, go-module, errgroup, graceful-shutdown]
rawan_keamanan: false
menggantikan: []
---

# Skill: Go / Golang — backend kelas industri

> **Kapan skill ini aktif:** **utama = deteksi config** — project punya `go.mod` / berkas `*.go` (§4.14 auto-detect). Teks "golang/goroutine/errgroup" jadi pemicu sekunder. Skill ini paket-stack: tarik pas-ukuran saat menggarap kode Go, DI ATAS standar inti (§5/§8).
>
> 🙂 **Analogi:** server Go yang sehat = **restoran yang teratur** — tiap pesanan punya **batas waktu** (timeout), **jumlah koki dibatasi** (connection pool) biar dapur tak kacau, dan saat tutup tamu yang sudah pesan **tetap dilayani sampai selesai** (graceful shutdown) sebelum lampu dimatikan.

Skill ini **advisory** (§4.17): otak native yang memutuskan adopsi/adaptasi/abaikan tiap 📐/💡. Butir **🔒 HASIL** = hasil keandalan yang tak boleh gagal. Cek perilaku **versi terpasang** (`go.mod`) — API & flag alat berubah antar-versi (§8.2 A3); jangan salin contoh mentah.

---

## 1. Kontrak (yang HARUS benar — 3 penyebab utama server Go tumbang diam-diam)

- 🔒 **HASIL — Tiap `err` diperiksa; tak boleh ada kegagalan yang lewat diam-diam.** Membuang error ke `_` pada operasi tulis (simpan DB, tutup berkas, kirim HTTP) bikin program lanjut seolah berhasil padahal datanya tak tersimpan — pemakai tak punya cara tahu (*silent failure*).
- 🔒 **HASIL — Tiap panggilan keluar punya batas waktu (timeout).** Panggilan HTTP ke API luar / query DB tanpa batas waktu bisa menggantung selamanya; goroutine (= pekerja paralel ringan bawaan Go) menumpuk sampai server kehabisan memori — dari luar tampak "lambat", bukan "error".
- 🔒 **HASIL — Kolam koneksi database (connection pool) dibatasi.** `database/sql` bawaannya **tak membatasi** jumlah koneksi terbuka; saat trafik naik, aplikasi membuka ratusan koneksi dan yang tumbang justru **database**-nya — sering menyeret layanan lain yang memakai DB sama.

---

## 2. Cara rakit (prinsip — 📐 CARA BAKU, boleh diganti cara lain yang capai HASIL sama)

1. 📐 **Cara baku error:** `if err != nil { return fmt.Errorf("simpan pesanan %s: %w", id, err) }`. `%w` = membungkus error asli supaya rantai penyebabnya tetap terbaca; bandingkan dengan `errors.Is` (cocokkan jenis error, mis. `sql.ErrNoRows`) / `errors.As` (ambil tipe error khusus), **jangan** banding teks pesan — teks gampang berubah.
   - 💡 SARAN: beberapa error yang harus dilaporkan sekaligus → `errors.Join` (tersedia sejak Go 1.20; cek `go.mod` dulu).
2. 📐 **`context.Context` = pembawa batas waktu + sinyal batal.** Aturannya: (a) selalu argumen **pertama**, dinamai `ctx`; (b) **jangan disimpan di dalam struct** — context itu per-permintaan, struct berumur panjang; (c) diteruskan turun ke tiap fungsi yang melakukan I/O; (d) `defer cancel()` tiap kali membuat context berbatas.
   - `ctx, cancel := context.WithTimeout(ctx, 3*time.Second)` lalu `db.QueryContext(ctx, ...)` / `http.NewRequestWithContext(ctx, ...)`. `http.DefaultClient` **tak punya** batas waktu bawaan → buat `&http.Client{Timeout: 10 * time.Second}` sendiri.
   - 🗃️ LATAR: membatalkan context bukan sekadar "berhenti menunggu" — sinyal batal merambat ke semua pekerja di bawahnya, jadi koneksi DB & goroutine yang nyangkut ikut dibebaskan. Tanpa itu, satu pemakai yang menutup browser tetap membakar sumber daya server sampai selesai.
3. 📐 **Tiap goroutine punya kondisi berhenti yang jelas** (context batal, channel ditutup, atau `sync.WaitGroup` selesai — `WaitGroup` = penghitung "berapa pekerja yang belum kelar"). *Channel* = pipa antar-pekerja: satu menaruh data, satu mengambil. Data yang dipakai bersama dilindungi `sync.Mutex` (= gembok agar cuma satu pekerja menyentuh data itu pada satu saat) **atau** dialirkan lewat channel — jangan dua-duanya sekaligus untuk data yang sama.
4. 📐 **Sekumpulan goroutine yang ditunggu bersama → `errgroup`** (`golang.org/x/sync/errgroup`): paket **resmi pelengkap** dari tim Go, bukan pustaka standar inti — harus ditambahkan ke `go.mod`. `g, ctx := errgroup.WithContext(ctx)` → tiap `g.Go(func() error { ... })` → `g.Wait()` mengembalikan error pertama **dan** membatalkan `ctx` supaya sisanya berhenti, bukan jalan terus sia-sia.
5. 📐 **Setel batas connection pool eksplisit** saat membuat `*sql.DB` (sekali di awal — `*sql.DB` itu kolam, bukan satu koneksi; jangan buka-tutup per permintaan): `SetMaxOpenConns` (sesuaikan `max_connections` DB dibagi jumlah instance), `SetMaxIdleConns`, `SetConnMaxLifetime` (umur koneksi — mencegah koneksi basi setelah DB restart/gagal-alih).
6. 📐 **`rows` selalu ditutup:** `rows, err := db.QueryContext(...)` → `defer rows.Close()` tepat setelah cek error. Lupa menutup = koneksi tak pernah kembali ke kolam sampai aplikasi buntu, dan gejalanya muncul jam-jaman kemudian jauh dari kode penyebabnya. Setelah perulangan, periksa juga `rows.Err()` — perulangan bisa berhenti karena error, bukan karena data habis.
7. 📐 **Query selalu berparameter** — nilai dikirim terpisah dari teks SQL, jangan pernah dirangkai dengan `fmt.Sprintf`: `db.QueryContext(ctx, "SELECT ... WHERE id = ?", id)`. ⚠️ **Bentuk penanda isian berbeda per driver** (`?` di MySQL/SQLite, `$1` di Postgres, dan ada driver yang pakai nama) — jangan salin contoh mentah-mentah, cek dokumentasi driver yang benar-benar ada di `go.mod`. Latar serangan penyuntikan SQL (**SQL injection**) → `skills/owasp/SKILL.md`.
8. 📐 **Server HTTP produksi punya batas waktu baca/tulis/idle.** `http.ListenAndServe(...)` memakai server bawaan **tanpa** batas waktu apa pun: koneksi yang sengaja dibuat lambat (kirim 1 byte per menit) menahan sumber daya sampai server tak bisa melayani siapa pun (serangan *slowloris*). Bangun `&http.Server{Addr, Handler, ReadHeaderTimeout, ReadTimeout, WriteTimeout, IdleTimeout}` lalu `srv.ListenAndServe()`. Nilai wajar bergantung beban (unggah berkas besar butuh `WriteTimeout` longgar) — tentukan sadar, jangan biarkan kosong.
9. 📐 **Berhenti dengan rapi (graceful shutdown):** tangkap sinyal berhenti dari sistem (`signal.NotifyContext` dengan `os.Interrupt` + `syscall.SIGTERM` — sinyal yang dikirim penyedia server saat mengganti versi; di Windows lokal perilakunya beda, jadi uji di lingkungan yang menyerupai produksi) lalu `srv.Shutdown(ctx)` dengan context berbatas waktu — server berhenti menerima permintaan baru tapi **menyelesaikan** yang sedang berjalan. Tanpa ini, tiap kali kirim-versi-baru-ke-server, permintaan yang sedang diproses terputus di tengah jalan. Tutup sumber daya lain setelahnya (`db.Close()`, worker antrean), juga berbatas waktu.
10. 📐 **Struktur project secukupnya:** `cmd/<nama>/main.go` untuk titik masuk, `internal/` untuk kode yang tak boleh diimpor project lain (ditegakkan kompiler, bukan sekadar kesepakatan). Bagi per bidang masalah (`internal/order`, `internal/billing`), bukan per lapisan teknis.
    - 💡 SARAN: **JANGAN berlebihan bikin lapisan.** Go mengutamakan sederhana & eksplisit: jangan bikin *interface* (= daftar kemampuan yang harus dipenuhi, tanpa isi — supaya kode tak terikat pada satu implementasi) untuk sesuatu yang cuma punya satu implementasi; jangan bikin lapisan "manager/helper/base" berlapis; jangan pakai *generics* (= satu fungsi yang bisa melayani banyak tipe data sekaligus) kalau fungsi biasa sudah cukup. Interface didefinisikan di **pihak yang memakai**, dan kecil (1-3 metode).
11. 📐 **Idiomatik:** `defer` untuk menutup berkas/koneksi; `panic` hanya untuk kondisi yang benar-benar mustahil, bukan error biasa; log terstruktur pakai `log/slog` (pustaka standar sejak Go 1.21), dan jangan pernah mencatat rahasia/token.

---

## 3. Powerful — 2 pola siap-adaptasi

🧪 **CONTOH KASUS `errgroup` (ambil polanya, jangan salin mentah):** satu halaman memanggil 3 layanan (profil, saldo, riwayat) bersamaan. Dengan `errgroup`, kalau saldo gagal di detik ke-1, dua panggilan lain langsung dibatalkan dan pemakai dapat 1 error jelas — bukan menunggu 30 detik untuk tetap gagal.

📐 **Rangkaian pemeriksa sebelum kirim — 4 lapis, urut:** rapikan format · bangun · periksa kekeliruan umum · tes termasuk mode pendeteksi balapan-data. Di Go itu jatuh ke `gofmt` · `go build ./...` · `go vet ./...` · `go test ./... -race`, lalu dua pemeriksa tambahan di luar distribusi resmi yang **dipasang terpisah**: `staticcheck` (penganalisis statis mendalam) dan `govulncheck` (pemindai dependensi yang punya celah keamanan terlapor). Kedua nama itu dipakai robot kit sendiri (`engine/stack-check.mjs`), jadi bukan tebakan — tapi flag-nya bisa berubah antar-versi, cek `go help` + halaman resmi alat versi terpasang sebelum menaruhnya di CI.
- 📐 CARA BAKU: versi dependensi terkunci di `go.mod`; yang wajib ikut **di-commit** adalah `go.sum` (= sidik jari tiap dependensi — tanpa itu isi paket bisa diganti diam-diam tanpa ketahuan).
- 🗃️ LATAR `-race`: pendeteksi balapan-data (dua pekerja menyentuh data sama bersamaan) hanya melihat tabrakan yang **benar-benar terjadi** saat tes berjalan, tak semua platform mendukungnya, dan tesnya jadi jauh lebih lambat. **Nol laporan ≠ bukti bebas balapan** — perbanyak tes yang menjalankan jalur bersamaan.
- 💡 SARAN: kalau baris `go 1.x` di `go.mod` **di bawah 1.22**, variabel perulangan `for` dipakai bersama semua iterasi (goroutine di dalam `for` menangkap nilai terakhir — bug klasik). Sejak 1.22 tiap iterasi dapat variabel sendiri; cek dulu sebelum menyalin pola lama dari internet.

---

## 4. Self-verify (sangkal diri sendiri SEBELUM bilang "selesai" — §8.2 Aturan 3)

- [ ] Tiap `err` diperiksa (tak ada `_ = ...` pada operasi tulis; error dibungkus `%w` + konteks)?
- [ ] Tiap panggilan keluar (HTTP/DB) **ber-timeout** via `context` + `http.Client{Timeout}`?
- [ ] Tiap goroutine punya **kondisi berhenti**; data bersama dilindungi mutex ATAU lewat channel (bukan dua-duanya)?
- [ ] Connection pool **dibatasi** (`SetMaxOpenConns`/`SetConnMaxLifetime`); `rows` selalu `defer Close()` + cek `rows.Err()`?
- [ ] Query **berparameter** (bukan `fmt.Sprintf`), penanda isian cocok driver di `go.mod`?
- [ ] Server HTTP punya `Read/Write/Idle Timeout` + **graceful shutdown** (`signal.NotifyContext` + `srv.Shutdown`)?
- [ ] `gofmt`+`go build`+`go vet`+`go test -race` lulus; `go.sum` di-commit?

> **Verifikasi WAJIB cuma-baca** (§8.2 Aturan 3): membuktikan = baca kode + `go vet`/`staticcheck` (cuma-periksa) + menalar. **Nol laporan `-race` ≠ bukti bebas balapan.**

---

## 5. Definition-of-Done (kapan skill Go dianggap benar-selesai)

- [ ] **Kontrak (§1) terpenuhi:** err diperiksa + timeout tiap panggilan keluar + pool dibatasi.
- [ ] **Edge case** ditangani: API luar timeout/lambat, DB penuh koneksi, goroutine nyangkut, server dimatikan saat melayani (graceful), balapan-data.
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris`.
- [ ] Rangkaian 4 pemeriksa (`gofmt`/`build`/`vet`/`test -race`) + `staticcheck`/`govulncheck` lulus lokal; `go.sum` di-commit.
- [ ] **Gerbang Pra-Rilis §4.6 LULUS** — "selesai" = terbukti (build+tes lulus, keluaran dilihat), bukan "sudah kutulis".

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 **Kalau yang dibangun API** (desain kode status, bentuk respons, versi endpoint) — **jangan dirancang ulang di sini** → `skills/backend/SKILL.md`.
- 📐 **Keamanan web** (SQL injection, input tak-tepercaya, rate-limit) → `skills/owasp/SKILL.md`.
- 📐 **Panggilan API luar tahan-gagal** (retry/backoff/circuit-breaker) → `skills/tahan-gagal/SKILL.md`. **Kerja latar/antrean** → `skills/background-job/SKILL.md`.
- 🗃️ **LATAR — kredit (MIT):** adaptasi paket stack Go ECC v2.0.0 (`golang-*`) — ditulis-ulang non-programmer. Robot pemeriksa: `engine/stack-check.mjs`.

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** ketersediaan & konsistensi layanan Go. **Mode-gagal khas** (kode "benar" tapi server jatuh): tak ada timeout (1 panggilan macet menyandera server), koneksi DB tak dibatasi/tak ditutup (DB jebol duluan), server dimatikan mendadak saat melayani, balapan-data, error ditelan `_`. **Mitigasi:** err diperiksa + timeout + context batal + pool dibatasi + `rows.Close` + graceful shutdown + `-race` + query berparameter.
- 🗃️ **LATAR — Batas jujur:** skill ini menaikkan **lantai** keandalan backend Go; **tidak menggantikan** load-testing / profiling untuk skala tinggi. Cek `go.mod` untuk perilaku versi (loop-var 1.22, `errors.Join` 1.20, `slog` 1.21). API & flag alat berubah antar-versi — cek dokumentasi resmi versi terpasang (§8.2 A3).

🙂 **Non-Programmer:** Go memaksa tiap kemungkinan gagal diperiksa satu per satu — merepotkan saat menulis, tapi itu yang bikin layanannya jarang tumbang diam-diam. Tiga hal yang paling sering menjatuhkan server Go padahal kodenya "benar": tak ada batas waktu, koneksi database tak dibatasi/tak ditutup, dan server dimatikan mendadak saat masih melayani orang. Analogi restoran di atas menutup ketiganya.
