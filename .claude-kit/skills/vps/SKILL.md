---
nama: vps
deskripsi: Server VPS kelas industri — nginx/Caddy reverse-proxy, systemd/PM2, firewall, TLS, backup, hardening SSH.
divisi: stack
pemicu: [vps, nginx, systemd, pm2, server-sewaan]
rawan_keamanan: false
menggantikan: []
---

# Skill: VPS / Server Kelola-Sendiri — nginx/Caddy, systemd, firewall, TLS, backup, hardening SSH

> **Kapan skill ini aktif:** **utama = deteksi config** — aplikasi dijalankan di server sewaan sendiri: berkas layanan `*.service` systemd, config nginx/Caddy, atau `docker-compose.yml` yang dijalankan di server itu (§4.14 auto-detect). Teks "VPS"/"server sendiri"/"Contabo/Hetzner/DigitalOcean" jadi pemicu sekunder. Skill ini paket-stack: tarik pas-ukuran saat menggarap server sewaan sendiri, DI ATAS standar inti (§5/§8).
>
> 🙂 **Analogi:** pakai platform terkelola itu seperti menyewa kamar hotel — listrik, kunci pintu, dan kebersihan diurus hotel. Pakai VPS itu seperti mengontrak rumah kosong: murah dan bebas, tapi kamu sendiri yang harus memasang gembok, membayar listrik, membuang sampah, dan mengecek atap bocor (detail penuh analogi ini di §7).

Skill ini **advisory** (§4.17): otak native yang memutuskan adopsi/adaptasi/abaikan tiap 📐/💡. Butir **🔒 HASIL** = hasil keamanan-operasional yang tak boleh gagal apa pun caranya. Perilaku pasti tiap alat (nginx/Caddy/certbot/systemd/ufw/Docker) berbeda antar-versi/distro — cek dokumentasi resmi **versi/distro yang benar-benar terpasang** sebelum menyalin perintah (§8.2 A3), jangan andalkan ingatan.

---

## 1. Kontrak (yang HARUS benar — 5 titik bocor paling sering di VPS)

- 🔒 **HASIL — sertifikat HTTPS harus memperbarui diri sendiri secara otomatis.** Sertifikat (= surat identitas situs yang bikin gembok muncul di browser) punya masa berlaku; begitu lewat, seluruh situs mendadak diberi peringatan "tidak aman" di semua browser — tanpa satu pun peringatan sebelumnya. Perpanjangan manual yang "diingat" = bom waktu.
- 🔒 **HASIL — rahasia (kunci API, password database) tidak boleh terbaca oleh pemakai lain di server yang sama.** Berkas layanan systemd lazimnya bisa dibaca semua pemakai mesin itu, jadi menaruh nilai rahasia langsung di dalamnya (`Environment="DB_PASSWORD=..."`) = rahasia terbuka bagi siapa pun yang punya akun di server — tanpa jejak dan tanpa alarm.
- 🔒 **HASIL — database dan port internal tidak boleh bisa dihubungi dari internet.** Ini titik bocor paling sering di VPS: Postgres/MySQL/Redis/MongoDB disetel mendengarkan di `0.0.0.0` (= "terima dari mana saja") supaya gampang dicolok dari laptop, lalu ditemukan pemindai otomatis dalam hitungan jam — dan datanya diambil tanpa satu pun log aplikasi mencatat apa-apa.
- 🔒 **HASIL — rahasia tidak boleh ikut tertanam di dalam image Docker.** Menulis nilai rahasia di `Dockerfile` atau menyalin berkas `.env` ke dalam image bikin rahasianya terbawa selamanya di lapisan image dan terbaca siapa pun yang menarik image itu — termasuk lama setelah kamu merasa "sudah ganti password". Suntikkan saat container dijalankan, bukan saat dibangun.
- 🔒 **HASIL — cadangan wajib pernah diuji pulih.** Cadangan yang tak pernah dicoba dipulihkan belum tentu cadangan: berkasnya bisa kosong, terpotong, atau terkunci dengan kunci yang sudah hilang — dan kamu baru tahu di hari terburuk.

---

## 2. Cara rakit (📐 CARA BAKU per tahap — boleh diganti cara lain yang capai HASIL sama)

**Pintu masuk: reverse proxy + HTTPS**

1. 📐 taruh **reverse proxy** (= penerima tamu di depan yang meneruskan permintaan ke aplikasi di belakang) berupa Caddy atau Nginx di depan aplikasi. Aplikasi mendengarkan hanya di `127.0.0.1:<port>` (= alamat "dalam server ini saja", tak bisa dihubungi dari luar); proxy-lah yang menghadap internet.
2. 📐 Caddy menerbitkan + memperpanjang sertifikat otomatis begitu nama domain ditulis di berkas config-nya (`Caddyfile`). Nginx lazimnya dipasangkan **certbot**, yang memasang penjadwal perpanjangannya sendiri. Apa pun pilihannya, **buktikan perpanjangannya benar-benar jalan**: certbot punya mode simulasi (uji perpanjangan tanpa mengganti sertifikat sungguhan) — cek nama persis perintah/opsinya di dokumentasi resmi versi yang terpasang, jangan salin dari ingatan (§8.2 A3).
3. 💡 di proxy sekalian pasang: pengalihan HTTP→HTTPS, header keamanan dasar, batas ukuran unggahan, dan pembatas laju (*rate limit* = batas berapa kali satu pengunjung boleh menembak alamat yang sama per satuan waktu) untuk alamat yang mahal (login, pencarian). Pilihan header spesifiknya → `skills/owasp/SKILL.md`.

**Proses aplikasi: layanan sistem, bukan sesi terminal**

4. 🗃️ LATAR — aplikasi di VPS harus **hidup lagi sendiri** setelah mati mendadak DAN setelah server dinyalakan ulang. Penyedia VPS bisa menyalakan ulang mesin jam 2 pagi untuk perawatan; kalau aplikasinya tak ikut nyala sendiri, situs mati sampai ada manusia yang login dan sadar.
5. 📐 jalankan sebagai layanan **systemd** (= pengelola layanan bawaan Linux modern; berkasnya berakhiran `*.service`): setel kebijakan nyala-ulang otomatis (`Restart=always`, plus `RestartSec=` untuk jeda antar-percobaan) lalu daftarkan supaya ikut hidup saat server menyala (`systemctl enable <nama>`). Lognya dibaca lewat `journalctl -u <nama>`. Kalau memakai Docker, padanannya kebijakan `restart: unless-stopped` di `docker-compose.yml`.
6. 📐 taruh rahasia di berkas terpisah dengan izin sempit (cuma pemiliknya boleh baca, mis. mode `600`) yang dimuat layanan saat start (`EnvironmentFile=`), atau pakai brankas rahasia (*secret manager* = layanan penyimpan kunci yang menyerahkan nilainya hanya ke proses yang berhak). Berkas itu **jangan pernah** ikut ter-commit ke git.

**Pengerasan akses: SSH + firewall**

7. 📐 pasang firewall bersikap **tolak-semua dulu**, buka hanya yang perlu (SSH + 80 + 443). Di Debian/Ubuntu alat yang lazim `ufw`; distribusi Linux lain memakai alat lain (mis. firewalld/nftables) — pakai yang baku di distro terpasang. Database disetel mendengarkan di `127.0.0.1` saja; butuh akses dari laptop → lewat terowongan SSH (`ssh -L`), bukan dengan membuka portnya.
8. 🗃️ LATAR — firewall di dalam server **bukan satu-satunya lapisan**: penyedia VPS sering punya firewall sendiri di panelnya, dan Docker memasang aturan jaringannya sendiri yang bisa membuat port container tetap terbuka walaupun firewall sistem operasi terlihat menutupnya. Jangan percaya tampilan konfigurasi — **uji dari luar**: coba hubungi portnya dari jaringan lain dan lihat apakah benar-benar tertolak.
9. 📐 pengerasan SSH (= cara masuk ke server lewat baris perintah terenkripsi): login **hanya dengan kunci** (matikan otentikasi password), **dilarang login langsung sebagai `root`** (= akun super yang boleh melakukan apa saja), pakai user biasa + `sudo`. Tambah **fail2ban** (= pembaca log yang otomatis memblokir alamat IP setelah sekian percobaan gagal) untuk meredam serangan tebak-password beruntun.
10. 💡 sebelum mematikan login password, **buka satu sesi SSH kedua yang masih aktif**, lalu uji masuk dengan kunci di sesi baru. Salah konfigurasi + cuma satu sesi terbuka = terkunci di luar server sendiri.
11. 💡 nyalakan pembaruan keamanan otomatis untuk paket sistem operasi (di Debian/Ubuntu mekanismenya lazim disebut `unattended-upgrades`; distro lain beda nama — cek dokumentasi distro yang terpasang), dan sepakati jadwal tenang untuk menyalakan ulang server saat pembaruan inti sistem menuntutnya.

**Docker di VPS (yang khas server sendiri)**

12. 📐 cara mengemas image (= paket beku berisi aplikasi + semua isi perutnya) yang benar — bangun bertahap, jalan sebagai pemakai non-root, kunci versi image dasar, `.dockerignore` — **tidak diulang di sini**; ikuti `skills/deploy/SKILL.md` (bagian Dockerfile produksi). Yang khas VPS: satu mesin dipakai bersama, jadi antar-container (= proses aplikasi yang dijalankan terbungkus dari image) saling berebut memori, CPU, dan disk yang sama.
13. 📐 pasang **batas memori dan CPU per container**. Tanpa batas, satu container yang bocor memori bisa menjatuhkan seluruh server: kernel (= inti sistem operasi) akan memaksa membunuh proses saat memori habis, dan yang dibunuh belum tentu container yang bersalah.
14. 📐 batasi ukuran log container (Docker menyediakan setelan ukuran + perputaran log per-container; cek nama opsinya di dokumentasi versi Docker yang terpasang) dan bersihkan image/container menganggur secara berkala. Log container yang tak dibatasi = penyebab disk penuh nomor satu di VPS ber-Docker.
15. 💡 data database wajib duduk di penyimpanan bernama yang jelas dan tercatat, bukan menumpang di dalam container. Perintah pembersihan yang menyertakan penghapusan volume (mis. `docker compose down -v`) menghapus data itu **tanpa bertanya** — perlakukan sebagai aksi merusak yang butuh konfirmasi verbatim (§8.2 Aturan 5).

**Pencadangan, log, pemantauan**

16. 📐 jadwalkan salinan database (*dump* = ekspor seluruh isi database ke satu berkas) + salinan berkas unggahan pemakai, lalu **simpan salinannya di luar VPS itu** (penyimpanan objek atau mesin lain). Cadangan yang cuma ada di server yang sama ikut lenyap saat servernya lenyap.
17. 📐 jadwalkan **uji pulih** ke lingkungan uji (mis. tiap kuartal) sebagai tugas nyata yang punya penanggung jawab, bukan niat baik. Ukur sekalian berapa lama pulihnya: "punya cadangan" dan "bisa hidup lagi dalam 2 jam" itu dua hal berbeda.
18. 🗃️ LATAR — **disk penuh mematikan server dengan cara yang membingungkan.** Gejalanya bukan tulisan "disk penuh", melainkan aplikasi gagal menyimpan, database menolak transaksi, login SSH jadi aneh, log berhenti — semuanya terlihat seperti bug aplikasi. Penyebab tersering: log aplikasi/proxy/container yang tak pernah dipangkas.
19. 📐 pasang pemangkas log otomatis (di Linux lazimnya `logrotate`) untuk log aplikasi dan proxy; batas log container ikut poin Docker di atas.
20. 📐 pemantauan minimum: peringatan saat pemakaian disk melewati ambang (mis. >80%), cek hidup-mati dari **luar** server (kalau servernya mati, pemantau yang tinggal di dalam server ikut mati dan tak ada yang berteriak), plus pelacak error aplikasi. Selebihnya ikut `templates/PRODUCTION_OBSERVABILITY.md`.
21. 💡 tulis runbook (= catatan langkah darurat 1 halaman) di `docs/runbooks/`: cara menyalakan ulang layanan, cara membaca log, cara memulihkan dari cadangan, siapa yang dihubungi. Ditulis saat tenang, dipakai saat panik.

---

## 3. Powerful — anti-pola yang paling sering terulang

🧪 **CONTOH KASUS (ambil polanya, jangan salin mentah):** anti-pola klasik `npm start &` atau `python app.py &` lewat SSH (= cara masuk ke server lewat baris perintah terenkripsi). Begitu sesi SSH ditutup atau koneksinya putus, prosesnya ikut mati. `screen`/`tmux` sedikit lebih baik, tapi tetap tidak selamat dari server yang dinyalakan ulang — satu-satunya cara yang selamat dari keduanya (mati mendadak + reboot server) adalah menjalankannya sebagai layanan systemd (§2 langkah 5), bukan sesi terminal.

Pola berdaya-ungkit paling tinggi di VPS bukan satu trik tunggal, melainkan **rantai 3 lapis yang saling menjaga**: (1) proxy + TLS auto-renew menjaga pintu depan tak pernah "tidak aman" tiba-tiba, (2) systemd + firewall tolak-semua menjaga mesin tetap hidup dan tak bocor ke internet biarpun server di-reboot penyedia, (3) backup di luar VPS + uji pulih menjaga data selamat biarpun mesinnya sendiri hilang total. Lepas satu lapis, dua lapis lain tak menyelamatkan — itu sebabnya ketiganya masuk 🔒 HASIL di §1, bukan sekadar saran.

---

## 4. Self-verify (sangkal diri sendiri SEBELUM bilang "selesai" — §8.2 Aturan 3)

- [ ] Sertifikat HTTPS **terbukti** memperpanjang otomatis (dry-run certbot dijalankan / config Caddy diverifikasi), bukan cuma "kelihatannya jalan"?
- [ ] Aplikasi jalan sebagai **layanan systemd** (`Restart=always` + `systemctl enable`), bukan proses foreground yang mati saat SSH ditutup?
- [ ] Rahasia **tidak** ada di berkas `.service` mentah / `Dockerfile` / image — dicek lewat `EnvironmentFile=` mode `600` atau secret manager?
- [ ] Database/port internal **diuji dari luar** (bukan cuma dilihat dari config) benar-benar tertolak, dan bind ke `127.0.0.1` bukan `0.0.0.0`?
- [ ] SSH: password login mati, `root` tak bisa login langsung, `fail2ban` aktif — **dan** sesi kedua sempat diuji sebelum password dimatikan?
- [ ] Container Docker punya batas memori/CPU + batas ukuran log; volume DB bernama jelas (bukan menumpang di container)?
- [ ] Backup DB+file terjadwal, tersimpan **di luar** VPS, **dan** pernah diuji pulih (dengan catatan berapa lama pulihnya)?
- [ ] `logrotate`/pemangkas log aktif untuk app+proxy; pemantauan disk (>80%) + uptime-check dari luar terpasang?

> **Verifikasi WAJIB cuma-baca** (§8.2 Aturan 3): membuktikan = baca config + jalankan perintah cek/dry-run (bukan yang mengubah data live) + menalar. "0 masalah" dari perintah yang errornya tak dibaca = palsu.

---

## 5. Definition-of-Done (kapan skill VPS dianggap benar-selesai)

- [ ] **Kontrak (§1) terpenuhi:** TLS auto-renew + rahasia tak terbaca pemakai lain/tak tertanam di image + DB/port internal tak bisa dihubungi dari internet + backup teruji pulih.
- [ ] **Edge case** ditangani: server di-reboot penyedia tanpa pemberitahuan, disk penuh, sesi SSH terputus di tengah pengerasan akses, container bocor memori, sertifikat mendekati kedaluwarsa, cadangan ternyata korup.
- [ ] **Self-verify (§4) tercentang** dengan bukti (output perintah/dry-run yang dilihat langsung).
- [ ] Firewall + SSH hardening + backup off-server sudah **diuji dari luar/dipulihkan**, bukan cuma dikonfigurasi.
- [ ] **Gerbang Pra-Rilis §4.6 LULUS** — "selesai" = terbukti (config diuji, keluaran dilihat), bukan "sudah kutulis config-nya".

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 **Sisi platform terkelola** (PaaS = Vercel/Railway/Render, kamu unggah kode penyedia urus mesin) → `skills/deploy/SKILL.md`. Bagian **Dockerfile produksi** (build bertahap, non-root, `.dockerignore`) juga di sana — §2 langkah 12 rak ini cuma menambah yang khas berbagi-satu-mesin.
- 📐 **Keamanan aplikasinya** (validasi masukan, otorisasi antar-pemakai, penyuntikan skrip, header keamanan proxy, rate-limit) — rak ini **cuma bicara mesinnya**, bukan aplikasinya → `skills/owasp/SKILL.md`.
- 🗃️ **Observability lanjutan** (di luar pemantauan minimum §2 langkah 20) → `templates/PRODUCTION_OBSERVABILITY.md`.
- 📐 **Aksi merusak** (mis. `docker compose down -v` yang menghapus volume data) → konfirmasi verbatim §8.2 Aturan 5, bukan auto-confirm.
- 🗃️ **LATAR — asal rak ini:** `skills/vps/SKILL.md` (rak asal skill ini, sebelum dimigrasi jadi skill mandiri).

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** ketersediaan situs, kerahasiaan rahasia (kunci API/password DB), dan data (database + file unggahan) di server yang sepenuhnya dikelola sendiri. **Mode-gagal khas VPS** (beda dari platform terkelola): sertifikat HTTPS kedaluwarsa tanpa peringatan · aplikasi mati setelah reboot karena bukan layanan sistem · rahasia terbaca pemakai lain di server yang sama · database/port internal ternyata terbuka ke internet dan ditemukan pemindai otomatis dalam hitungan jam · disk penuh oleh log yang tak pernah dipangkas (gejalanya menyamar jadi "bug aplikasi") · cadangan yang ternyata tak bisa dipulihkan. **Mitigasi:** reverse proxy + TLS auto-renew, systemd `Restart=always` + rahasia di berkas berizin sempit, firewall tolak-semua + database bind `127.0.0.1` + pengerasan SSH (kunci saja, non-root, fail2ban), Docker: rahasia disuntik saat run + batas memori/CPU + log dibatasi, backup terjadwal di luar VPS + uji pulih rutin + logrotate + pemantauan disk dari luar.
- 🗃️ **LATAR — Batas jujur (PEMBEDA UTAMA dari platform terkelola):** platform terkelola (Vercel/Railway/Render — sering disebut *PaaS* = kamu unggah kode, penyedia yang mengurus mesinnya) sudah mengurus penambalan keamanan sistem operasi, firewall, sertifikat HTTPS, pencadangan, dan pemantauan. Di VPS (= *Virtual Private Server*, satu komputer sewaan yang kamu kelola sendiri dari nol) **semua itu jadi tanggung jawabmu**. Inilah yang paling sering tak disadari: aplikasinya jalan mulus hari pertama, lalu 3 bulan kemudian disk penuh, sertifikat kedaluwarsa, atau database ternyata terbuka ke internet — dan tak ada siapa pun yang memberi tahu. Sepakati di awal siapa menambal sistem operasi tiap bulan, siapa memantau disk, siapa yang dibangunkan jam 3 pagi — VPS murah di tagihan, mahal di perhatian. Skill ini menaikkan **lantai** operasional VPS; **tidak menggantikan** keamanan aplikasi (→ `skills/owasp/SKILL.md`) atau load-testing/tuning kapasitas.

🙂 **Non-Programmer:** pakai platform terkelola itu seperti menyewa kamar hotel — listrik, kunci pintu, dan kebersihan diurus hotel. Pakai VPS itu seperti mengontrak rumah kosong: murah dan bebas, tapi kamu sendiri yang harus memasang gembok, membayar listrik, membuang sampah, dan mengecek atap bocor. Tiga hal yang paling sering bikin celaka di rumah kontrakan ini: pintu belakang (database) lupa dikunci, tempat sampah (log) tak pernah dibuang sampai rumah penuh, dan salinan dokumen penting (cadangan) yang ternyata kertas kosong karena tak pernah dibuka sejak disimpan.
