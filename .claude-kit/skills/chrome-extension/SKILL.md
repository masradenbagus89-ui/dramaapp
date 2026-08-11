---
nama: chrome-extension
deskripsi: Extension Chrome (Manifest V3) kelas industri — izin seminimal mungkin, pesan aman antar-konteks, service worker, CSP.
divisi: stack
pemicu: [chrome-extension, manifest-v3, content-script, extension-service-worker]
rawan_keamanan: false
menggantikan: []
---

# Skill: Extension Google Chrome (Manifest V3)

> **Kapan skill ini aktif:** **utama = deteksi config** — project punya `manifest.json` ber-`manifest_version: 3`, folder ekstensi, atau kode yang memanggil API `chrome.*` (§4.14 auto-detect). Teks "chrome-extension/manifest-v3/content-script/extension-service-worker" jadi pemicu sekunder. Skill ini paket-stack: tarik pas-ukuran saat menggarap ekstensi Chrome, DI ATAS standar inti (§5/§8).
>
> 🙂 **Analogi:** ekstensi Chrome = **pegawai magang yang dititipkan di meja orang lain** — jangan selipkan kunci/password ke sakunya (taruh di kantor/backend), catat hal penting di buku besar (bukan hafalan, karena dia bisa "dipulangkan" kapan saja tanpa pamit), dan kasih dia kunci ruangan seperlunya saja.

Skill ini **advisory** (§4.17): otak native yang memutuskan adopsi/adaptasi/abaikan tiap 📐/💡. Butir **🔒 HASIL** = hasil keamanan & keandalan yang tak boleh gagal apa pun caranya. Manifest terus bertambah kunci baru dan perilaku sebagian kunci berubah antar rilis Chrome — sebelum menyalin contoh apa pun, cocokkan dulu dengan dokumentasi resmi Chrome Extensions untuk versi yang kamu targetkan (§8.2 Aturan 1 & A3: ingatan model bisa basi, kenyataan platform yang menang).

---

## 1. Kontrak (yang HARUS benar — 4 kerusakan senyap khas ekstensi Chrome MV3)

- 🔒 **HASIL — state ekstensi WAJIB selamat ketika service worker dimatikan browser.** Ini kerusakan senyap khas MV3: di komputer developer lancar (worker masih hangat), di komputer user setelah beberapa menit menganggur worker dimatikan → hitungan, antrean, sesi hilang tanpa error apa pun. User cuma merasa "kadang ekstensinya lupa".
- 🔒 **HASIL — tidak ada kunci API, token, atau kredensial berbayar di dalam paket ekstensi** — termasuk di kode ter-*minify* (dipadatkan sampai tak enak dibaca), di `chrome.storage`, maupun disamarkan lewat base64 (pengacakan teks yang bisa dibalik siapa saja dalam hitungan detik). Ekstensi terpasang di komputer user; siapa pun bisa membuka foldernya dan membaca isinya. Kunci bocor = kuota/tagihan dipakai orang lain, dan kamu baru tahu dari tagihan.
- 🔒 **HASIL — ekstensi hanya meminta izin yang benar-benar dipakai, untuk domain yang benar-benar disentuh.** `host_permissions` seluas `<all_urls>` berarti ekstensimu boleh membaca isi SEMUA halaman yang user buka — termasuk internet banking dan email kantor. Satu bug atau satu update yang disusupi = kebocoran skala besar yang user tak punya cara mendeteksinya.
- 🔒 **HASIL — tiap pesan masuk diperlakukan sebagai masukan tak-tepercaya sampai asal-usulnya terbukti.** Content script-mu duduk di dalam halaman yang mungkin jahat, jadi apa pun yang halaman itu lemparkan (lewat `window.postMessage` atau event DOM buatan) bisa ditangkap content script-mu; kalau diteruskan mentah ke service worker dan diturut, halaman itu efektif meminjam SELURUH izin ekstensimu (membaca tab lain, memanggil backend-mu atas nama user) tanpa gejala yang terlihat. Content script = pintu depan yang selalu berhadapan dengan orang asing.

---

## 2. Cara rakit (prinsip — 📐 CARA BAKU, boleh diganti cara lain yang capai HASIL sama)

1. 📐 **Service worker & state yang tahan worker-mati.**
   - 🗃️ LATAR: Manifest V3 (= format ekstensi Chrome yang berlaku sekarang) membuang "background page" lama — halaman tersembunyi yang hidup terus selama browser nyala. Gantinya **service worker ekstensi**: proses kecil yang dibangunkan saat ada kejadian, lalu dimatikan browser lagi. Kode tutorial MV2 (`background.page`, `chrome.extension.getBackgroundPage()`, `browser_action`) TIDAK jalan di MV3 — jangan disalin.
   - 📐 CARA BAKU: latar belakang dideklarasikan lewat kunci `background.service_worker`, tombol toolbar lewat `action`. Manifest terus bertambah kunci baru dan perilaku sebagian kunci berubah antar rilis Chrome — sebelum menyalin contoh apa pun, cocokkan dulu dengan dokumentasi resmi Chrome Extensions untuk versi yang kamu targetkan (§8.2 Aturan 1 & A3).
   - 📐 CARA BAKU: JANGAN simpan kondisi penting di variabel global modul (`let antrean = []`). Simpan di `chrome.storage` (persisten di disk) atau `chrome.storage.session` (di memori, hilang saat browser ditutup — untuk token sesi yang tak boleh mendarat di disk; siapa saja yang boleh membacanya diatur terpisah dan bakunya ketat, cek dokumentasi resmi sebelum mengaksesnya dari content script). Tiap worker bangun, BACA ulang, jangan berasumsi variabelnya masih terisi. Penjadwalan pakai `chrome.alarms`, bukan `setTimeout` panjang (mati bersama workernya). Pendaftaran listener taruh di level atas berkas worker, bukan di dalam fungsi async — supaya sudah terdaftar saat worker baru dibangunkan.

2. 📐 **Kunci API/token — jangan pernah ikut dipaketkan.**
   - 📐 CARA BAKU: kunci tinggal di backend milikmu. Ekstensi memanggil endpoint backend-mu, backend yang memegang kunci + memasang batas laju per-user. Pola auth/otorisasi endpoint jangan disalin ke sini — ikuti `skills/owasp/SKILL.md` dan `skills/auth/SKILL.md`.
   - 💡 SARAN: butuh login ke layanan pihak ketiga → pakai alur OAuth (= user login sendiri di situs layanan itu, lalu layanan memberi izin terbatas atas nama user — ekstensimu tak pernah memegang password-nya), bukan kunci milikmu yang dititipkan di ekstensi. Menyamarkan kunci (obfuscate) BUKAN pengaman, cuma memperlambat pembongkaran beberapa menit.
   - 🗃️ LATAR: `chrome.storage` ekstensi **bukan brankas** — isinya bisa dibaca siapa pun yang memegang perangkat itu. Anggap setara catatan di laci meja: praktis, tidak rahasia.

3. 📐 **Pilih jenis storage sesuai sifat data.**
   - 📐 CARA BAKU: pilih penyimpanan sesuai sifat data — `local` untuk data besar yang tinggal di satu perangkat, `sync` untuk preferensi kecil yang ikut akun Google user ke perangkat lain, `session` untuk yang tak boleh menyentuh disk. `sync` jauh lebih ketat: kuota total & per-item hitungan KB (versus megabyte untuk `local`) **plus batas jumlah tulis per menit/jam**. Angka pastinya berubah antar versi Chrome — baca dokumentasi resmi, jangan hafalan.
   - 📐 CARA BAKU: SELALU periksa hasil operasi tulis — tergantung gaya API yang kamu pakai, kegagalan muncul sebagai janji-hasil yang ditolak (*Promise reject*, tangkap dengan `try/catch` + `await`) atau lewat `chrome.runtime.lastError` di dalam callback. Kuota `sync` terlampaui → tulisan GAGAL, dan kalau hasilnya tak diperiksa, gagalnya diam. Cache/daftar besar taruh di `local`, jangan di `sync`.

4. 📐 **CSP (aturan keamanan konten) — tak ada kode dari luar paket.**
   - 🗃️ LATAR: aturan keamanan konten (CSP = daftar sumber kode mana saja yang boleh dijalankan) di MV3 melarang **kode dari luar paket**: tidak ada `<script src="https://cdn...">`, tidak `eval()`/`new Function()` atas string dari jaringan, tidak `<script>` inline di halaman ekstensi, tidak unduh-lalu-jalankan. Seluruh kode yang dijalankan ekstensi ikut dipaketkan dan ikut ditinjau toko.
   - 📐 CARA BAKU: pindahkan tiap `onclick="..."` dan `<script>…</script>` inline ke berkas `.js` + `addEventListener`. Library pihak ketiga digabung ikut ke dalam paket ekstensi lewat alat pemaket (*bundler* seperti esbuild/Vite/webpack), bukan ditarik dari CDN (server berkas milik orang lain) saat ekstensi jalan. Data/konfigurasi JSON dari jaringan tetap boleh — yang dilarang **kode**, bukan data.
   - 💡 SARAN: perlu memblokir/mengalihkan permintaan jaringan → pakai pendekatan aturan-deklaratif (`declarativeNetRequest`) alih-alih menyuntik kode; itu arah desain MV3 dan lebih mudah lolos tinjauan toko.

5. 📐 **Izin (permissions) seminimal mungkin.**
   - 📐 CARA BAKU: mulai dari NOL izin, tambah satu per satu saat ada fitur yang benar-benar butuh (default-deny, sejalan §5). `host_permissions` sesempit mungkin (`https://api.contoh.com/*`, bukan `*://*/*`). Izin untuk fitur opsional taruh di `optional_permissions` / `optional_host_permissions` lalu minta saat fitur dipakai (`chrome.permissions.request()`, umumnya HARUS dipicu klik user — verifikasi syarat ini di dokumentasi resmi versi Chrome-mu) — instalasi awal jadi terasa ringan.
   - 💡 SARAN: perlu menyuntik skrip ke tab → timbang izin bergaya "aktif saat diklik" (`activeTab`) + `chrome.scripting`, cakupannya hanya tab yang user klik sendiri, bukan akses permanen ke semua situs.

6. 📐 **Tiga konteks terisolasi + pesan diperlakukan sebagai masukan tak-tepercaya.**
   - 🗃️ LATAR: tiga konteks ekstensi punya hak berbeda dan **tidak berbagi memori**. **Content script** disuntik ke halaman web: berbagi DOM halaman itu (DOM = struktur isi halaman yang terlihat di layar — tombol, teks, gambar), TAPI jalan di "dunia terisolasi" — variabel JavaScript halaman tak terlihat olehnya dan sebaliknya; akses `chrome.*`-nya terbatas. **Service worker** = pusat logika, akses `chrome.*` terluas, tanpa DOM halaman. **Halaman ekstensi** (popup/options/side panel) punya DOM sendiri, hidup hanya selama terbuka. Jembatannya pesan: `chrome.runtime.sendMessage`/`onMessage`, dan `chrome.tabs.sendMessage` untuk menyasar tab tertentu.
   - 📐 CARA BAKU di `chrome.runtime.onMessage`: jangan percaya isi pesan sebelum PENGIRIMnya lolos periksa. Objek `sender` membawa identitas ekstensi pengirim (samakan dengan id ekstensimu sendiri) dan, kalau asalnya content script, info tab + alamat halamannya — cocokkan alamat itu dengan daftar situs yang memang kamu layani. Nama persis tiap properti `sender` beda-beda antar versi Chrome: `console.log(sender)` sekali di kodemu sendiri, atau baca dokumentasi resmi `MessageSender` untuk versi terpasang — JANGAN salin nama properti dari ingatan/tutorial (§8.2 Aturan A3). Lalu perlakukan pesan sebagai perintah ber-daftar-putih (`switch` atas jenis yang kamu kenal + validasi bentuk datanya), bukan "jalankan apa pun yang dikirim".
   - 📐 CARA BAKU di `window.postMessage`: WAJIB cek `event.origin` (asal domain pengirim) dan `event.source === window` sebelum percaya — tanpa itu, iframe iklan di halaman (= halaman lain yang ditanam di dalam halaman) pun bisa mengirim. Jangan pernah menerima "URL yang harus di-fetch" atau "kode yang harus dijalankan" dari halaman. Kalau sengaja membuka jalur langsung dari situsmu sendiri ke ekstensi, itu harus dideklarasikan eksplisit di manifest (kunci `externally_connectable`, pesannya masuk lewat handler pesan-eksternal yang terpisah dari `onMessage`) — batasi daftar domainnya seketat mungkin, dan pastikan perilaku bakunya di dokumentasi resmi sebelum mengandalkannya sebagai pengaman.
   - 💡 SARAN: data dari halaman yang ditampilkan ulang di popup/options → sisipkan sebagai teks (`textContent`), jangan HTML mentah — kalau dirender sebagai HTML, halaman bisa menitipkan kode yang ikut jalan di dalam ekstensimu (XSS = penyusupan kode lewat konten). Prinsip penyaringan/anti-XSS-nya tak diulang di sini: `skills/owasp/SKILL.md`.

7. 📐 **Rilis ke Chrome Web Store.**
   - 🗃️ LATAR: alur rilis Chrome Web Store = unggah paket → isi form privasi & justifikasi izin → tinjauan manusia/otomatis → terbit. Lama tinjauan TIDAK dijanjikan tetap dan berubah-ubah (unggahan pertama biasanya paling lama) — jangan menjadwalkan peluncuran dengan mengandalkan angka hari tertentu. Penolakan mengirimmu balik ke antrean, jadi murah sekali memeriksa daftar di bawah SEBELUM unggah.
   - 📐 CARA BAKU — penolakan tersering + penawarnya: **izin tak dijelaskan/tak terpakai** → hapus yang tak dipakai, justifikasi sisanya dengan fitur konkret ("`storage` untuk menyimpan daftar situs yang di-mute user"), bukan "untuk fungsi ekstensi" · **deskripsi/screenshot tak cocok fungsi nyata** → deskripsi toko harus menggambarkan yang benar-benar dilakukan, jangan tinggalkan teks template · **fungsi bertumpuk tanpa benang merah** → kebijakan toko menuntut satu tujuan jelas; pecah jadi dua ekstensi kalau memang dua produk · **mengumpulkan data tanpa pengungkapan** → isi tab praktik privasi dengan jujur + sediakan kebijakan privasi yang bisa diakses; klaim di form itu mengikat · **kode dari luar** → lihat butir CSP di atas, ini penolakan paling umum untuk developer yang terbiasa web biasa.
   - 💡 SARAN: naikkan `version` di `manifest.json` tiap unggahan (toko menolak versi sama/turun), dan simpan peta-sumber (source map) supaya kamu bisa menjawab kalau reviewer bertanya soal kode ter-minify.

8. 📐 **Uji sebelum kirim.**
   - 💡 SARAN: uji dengan memuat folder ekstensi tanpa dipaketkan lewat `chrome://extensions` (mode developer). Dua uji yang paling sering dilewatkan: (1) biarkan menganggur beberapa menit lalu pakai lagi — memancing bug service-worker-mati; (2) pakai di profil browser baru yang storage-nya kosong — memancing bug "asumsi datanya sudah ada".

---

## 3. Powerful — 2 pola kerusakan-senyap siap-dikenali

🧪 **CONTOH KASUS 1 (ambil polanya, jangan salin mentah) — timer yang "lupa":** pencatat waktu menyimpan `let mulai = Date.now()` di worker. Dev tes 2 menit → benar. User pindah tab 5 menit → worker mati → saat dibangunkan `mulai` jadi `undefined` → durasi tersimpan `NaN` ke laporan, tanpa pesan error. Penawarnya = butir §2.1 (`chrome.storage`/`chrome.storage.session`, baca ulang tiap worker bangun).

🧪 **CONTOH KASUS 2 (ambil polanya, jangan salin mentah) — dunia terisolasi content script:** content script membaca `window.appState` milik halaman → dapat `undefined`, bukan salah ketik, tapi karena dunia terisolasi. Jalur sah: baca dari DOM, atau halaman sengaja mengirim lewat `window.postMessage` yang **kamu validasi** (§2.6).

---

## 4. Self-verify (sangkal diri sendiri SEBELUM bilang "selesai" — §8.2 Aturan 3)

- [ ] State penting (hitungan/antrean/sesi) disimpan di `chrome.storage`/`chrome.storage.session`, bukan variabel global modul; tiap worker bangun BACA ulang; penjadwalan pakai `chrome.alarms` bukan `setTimeout` panjang; listener terdaftar di level atas berkas?
- [ ] Tidak ada kunci API/token/kredensial di dalam paket ekstensi (termasuk kode ter-minify, `chrome.storage`, atau base64)? Kunci tetap di backend, dipanggil lewat endpoint sendiri?
- [ ] Storage dipilih sesuai sifat data (`local`/`sync`/`session`) dan hasil tulis SELALU diperiksa (`try/catch`+`await` atau `chrome.runtime.lastError`)?
- [ ] Tak ada `<script>`/`onclick="..."` inline; library pihak ketiga dipaketkan lewat bundler (esbuild/Vite/webpack), bukan ditarik dari CDN; CSP tak dilanggar?
- [ ] `host_permissions` sesempit mungkin (bukan `<all_urls>` tanpa alasan kuat); izin fitur opsional lewat `optional_permissions`/`optional_host_permissions`?
- [ ] `chrome.runtime.onMessage` cek `sender` (id ekstensi + origin tab) sebelum percaya isi pesan, diperlakukan sebagai daftar-putih? `window.postMessage` cek `event.origin` + `event.source === window`?
- [ ] Data dari halaman yang ditampilkan ulang di popup/options disisipkan sebagai teks (`textContent`), bukan HTML mentah?
- [ ] Diuji: dibiarkan menganggur beberapa menit lalu dipakai lagi (memancing bug worker-mati) DAN di profil browser baru yang storage-nya kosong?
- [ ] Checklist penolakan Chrome Web Store (izin tak terpakai/dijelaskan · deskripsi tak cocok · fungsi bertumpuk · data tanpa pengungkapan · kode dari luar) sudah dicek sebelum unggah?

> **Verifikasi WAJIB cuma-baca** (§8.2 Aturan 3): membuktikan = baca kode + `console.log(sender)`/DevTools + menalar, JANGAN sisipkan kunci/kredensial sungguhan cuma untuk "coba dulu".

---

## 5. Definition-of-Done (kapan skill Extension Chrome dianggap benar-selesai)

- [ ] **Kontrak (§1) terpenuhi:** state tahan worker-mati + tak ada secret di paket + izin minimal + pesan tak-tepercaya divalidasi.
- [ ] **Edge case** ditangani: service worker dimatikan browser di tengah proses, storage kosong (profil baru/instalasi awal), kuota `sync` terlampaui, pesan dari halaman/iframe jahat, submission ditolak reviewer toko.
- [ ] **Self-verify (§4) tercentang** dengan bukti (perilaku teruji di `chrome://extensions`, bukan cuma "kelihatannya benar").
- [ ] Diuji manual minimal: load unpacked → biarkan menganggur lalu pakai lagi → uji di profil browser baru.
- [ ] Sebelum unggah ke Chrome Web Store: `manifest.json` — izin sudah dipangkas + tiap izin tersisa punya justifikasi konkret, deskripsi toko cocok fungsi nyata, `version` dinaikkan.
- [ ] **Gerbang Pra-Rilis §4.6 LULUS** — "selesai" = terbukti (diuji + dilihat hasilnya), bukan "sudah kutulis".

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 **Pola auth/otorisasi endpoint backend yang dipanggil ekstensi** — jangan dirancang ulang di sini → `skills/owasp/SKILL.md` dan `skills/auth/SKILL.md`.
- 📐 **Prinsip penyaringan/anti-XSS** saat menampilkan data dari halaman di popup/options — tak diulang di sini → `skills/owasp/SKILL.md`.
- 📐 **Kalau backend-nya sendiri yang dibangun** (kontrak endpoint, kode status, rate-limit per-user) → `skills/backend/SKILL.md`.
- 🗃️ **LATAR — rak asal skill ini:** `skills/chrome-extension/SKILL.md`.

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** kredensial & privasi user yang browsernya terpasang ekstensi ini, plus kunci/kuota backend milikmu. **Mode-gagal khas** (ekstensi "jalan" tapi bocor/rusak diam-diam): service worker dimatikan di tengah proses → state hilang tanpa error · kunci API tertanam di paket → siapa saja yang buka folder ekstensi bisa membacanya · `host_permissions` kelewat luas (`<all_urls>`) → satu bug/update disusupi = baca semua halaman termasuk banking/email · pesan dari halaman/iframe jahat dipercaya mentah → efektif meminjam seluruh izin ekstensi. **Mitigasi:** state di `chrome.storage`/`chrome.storage.session` + `chrome.alarms` · kunci tetap di backend + alur OAuth · izin minimal + `optional_permissions` · validasi `sender`/`event.origin` tiap pesan · CSP dijaga (tak ada kode dari luar paket, library dipaketkan lewat bundler).
- 🗃️ **LATAR — Batas jujur:** skill ini menaikkan **lantai** keamanan & keandalan ekstensi Chrome MV3; **tidak menggantikan** tinjauan manusia Chrome Web Store, maupun audit keamanan mendalam untuk ekstensi berizin sangat luas atau yang menangani data sangat sensitif. Manifest & API `chrome.*` terus berubah antar versi Chrome — cek dokumentasi resmi Chrome Extensions untuk versi yang ditargetkan sebelum menyalin contoh (§8.2 A3), jangan andalkan ingatan.

🙂 **Non-Programmer:** ekstensi itu seperti pegawai magang yang kamu titipkan di dalam browser orang lain. Dia duduk di meja user, bukan mejamu — apa pun yang kamu selipkan di sakunya (kunci, password) bisa dibaca siapa pun yang memegang laptop itu; kunci disimpan di kantor (backend), magangnya cukup menelepon kantor. Dia juga bukan pegawai tetap: browser memulangkannya kapan saja tanpa pamit, jadi catatan penting harus ditulis di buku (storage), bukan dihafal. Dan mintalah kunci ruangan seperlunya — minta kunci seluruh gedung "biar gampang" itu yang bikin lamaranmu ditolak toko, sekaligus bikin satu kesalahan kecil berubah jadi kebocoran besar.
