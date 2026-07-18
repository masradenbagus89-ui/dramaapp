<!-- LINTAS:SEKSI §moderasi-konten -->

## §moderasi-konten. Capability Pack — Moderasi Konten (UGC: teks/gambar/video) kelas-industri

> **Kapan dibaca:** "moderasi konten / saring komentar / filter kata kasar / laporkan konten / cegah konten berbahaya / user bisa unggah & posting / kelola ulasan". Resep merakit moderasi konten buatan-user (UGC) yang **melindungi user, patuh hukum, dan bisa dijalankan tim kecil**. Baca induk `workflows/cap-packs.md`.

🙂 Analogi: moderasi = **satpam + petugas di kotak saran publik**. Kalau siapa pun boleh menempel apa saja di dinding tokomu (komentar, foto, ulasan), kamu wajib bisa mencegah/menurunkan yang berbahaya, ilegal, atau menyakiti orang lain.

### Kontrak (yang harus benar)
- **Input:** konten buatan-user (UGC — *user-generated content*): teks, gambar, video, nama tampilan, unggahan. **Output:** keputusan (loloskan / tahan-tinjau / tolak / sembunyikan) + **jejak keputusan**. **Error/ragu:** konten berisiko tinggi → default **tahan**, bukan loloskan. **Rahasia:** identitas pelapor & korban dilindungi; jejak moderasi = data audit sensitif.

### Langkah rakit (prinsip — cek dokumentasi API/model moderasi versi terpasang §8.2)
1. **Petakan tingkat risiko konten dulu** — perlakuan beda: spam/promosi < kata kasar < pelecehan/ancaman < **konten ilegal**. 🚨 **Konten pelecehan seksual anak (CSAM) & sejenisnya = kewajiban hukum, bukan keputusan produk:** banyak yurisdiksi mewajibkan blokir dari akses publik + lapor ke otoritas (mis. NCMEC di AS) + **JANGAN menyebar/meneruskan/mengunduh-ulang** salinannya. **Hati-hati: "jangan sebar" ≠ "hapus segera".** Sebagian yurisdiksi (mis. aturan pelaporan CSAM di AS) justru **mewajibkan mengamankan bukti** untuk penyelidikan — menghapus sepihak bisa **memusnahkan barang bukti** dan jadi pelanggaran tersendiri. **Konsultasi hukum WAJIB** menentukan cara amankan-simpan + lapor; jangan improvisasi.
2. **Dua lapis: saring otomatis + tinjauan manusia.** Otomatis (filter kata, klasifikasi ML, pencocokan-hash untuk gambar berbahaya yang sudah diketahui) menyaring volume; manusia memutus kasus ambigu & banding. Otomatis SAJA = banyak salah (salah-tangkap & lolos); manusia SAJA = tak terskala. Keduanya saling menutup.
3. **Pra-moderasi vs pasca-moderasi (pilih per risiko × volume):** area berisiko tinggi (mis. profil/konten menyangkut anak) → **tahan sebelum tayang** (pra); area volume tinggi risiko rendah → **tayang lalu tinjau saat dilaporkan** (pasca).
4. **Sediakan pelaporan + antrean tinjau.** Tombol "laporkan" untuk user; konten terlapor masuk antrean prioritas (rujuk `workflows/cap/background-job.md`). Boleh auto-sembunyikan sementara bila laporan menumpuk — **dengan pengaman anti-abuse** (cegah "brigading" = ramai-ramai melaporkan untuk membungkam orang tak bersalah): rate-limit + bobot laporan + tinjauan manusia sebelum sanksi permanen.
5. **Jika memakai AI untuk moderasi** (klasifikasi/deskripsi otomatis) → tunduk `workflows/cap/ai-rag-aman.md`: input tak-tepercaya, jangan biarkan output AI jadi keputusan **final** tanpa pagar manusia, batasi biaya, dan jangan kirim konten pribadi ke pihak ketiga tanpa dasar hukum/privasi.
6. **Keadilan + banding + transparansi.** Beri alasan penolakan sejauh aman + jalur **banding ke manusia**. Simpan **jejak keputusan** (siapa/apa/kapan/kenapa) untuk audit, konsistensi, dan pembelaan hukum (audit-trail append-only = **peta-jalan Gelombang-3**, rencananya di `docs/plans/perkuat-jangan-kurung-roadmap.md`; nanti mendarat di `workflows/stack/4.14-2-supabase-prisma.md`).
7. **Lindungi moderator & korban.** Konten berbahaya melukai moderator manusia (paparan trauma) — batasi paparan, rotasi tugas, sediakan dukungan. Data korban/pelapor dijaga ketat: **jangan bocor ke pihak terlapor** (cegah pembalasan).

### Gotcha (sering salah)
- Andalkan **filter kata mentah** → mudah dilewati (tulisan "l33t"/spasi disisipkan) + banyak salah-tangkap kata sah.
- Otomatis memutus **final** tanpa banding manusia → salah-blokir user sah, tanpa jalan keluar.
- Menyimpan/meneruskan **konten ilegal (CSAM)** → melanggar hukum; wajib jalur khusus + lapor otoritas.
- Tombol "laporkan" **tanpa anti-abuse** → dipakai brigading membungkam orang.
- Kirim konten user ke **API moderasi pihak ketiga** tanpa dasar privasi → langgar UU PDP.
- Lupa lindungi **identitas pelapor** → jadi sasaran pembalasan.

### Rujuk-silang (reuse-first — jangan salin)
- Antrean tinjau + auto-proses konten terlapor → `workflows/cap/background-job.md`.
- Kabari moderator (laporan baru) & user (hasil keputusan/banding) → `workflows/cap/email-notifikasi.md` + `workflows/cap/push-notification.md`.
- Unggahan (gambar/video) aman + pindai berkas → `workflows/cap/upload-storage.md`.
- Moderasi berbasis AI (pagar input/output/biaya) → `workflows/cap/ai-rag-aman.md`.
- Jejak keputusan append-only (audit-trail) → peta-jalan Gelombang-3 (`docs/plans/perkuat-jangan-kurung-roadmap.md`; nanti di `workflows/stack/4.14-2-supabase-prisma.md`).
- Privasi data pelapor/korban + jangan bocor di log → `workflows/stack/4.14-5-owasp.md` + peta-jalan `templates/PRIVASI_PDP_NON_LEGAL`.

### Threat-model 3-baris
- **Aset:** keselamatan user & komunitas, kepatuhan hukum, kesehatan moderator, reputasi platform. **Penyerang:** penyebar konten berbahaya/ilegal, penyalahguna sistem lapor (brigading), pelaku evasi filter. **Mitigasi:** dua-lapis (otomatis + manusia) + pra-moderasi area berisiko + jalur hukum CSAM + banding + jejak audit + anti-abuse pelaporan.

### Batas jujur
Moderasi konten = masalah **sosio-teknis yang tak pernah sempurna**: selalu ada salah-tangkap & konten lolos; tak ada filter yang menangkap semua tanpa salah. Kewajiban hukum (CSAM, konten teroris, notice-and-takedown, UU platform) **wajib tinjauan legal sungguhan** — pack ini panduan **non-legal** untuk menaikkan lantai, bukan nasihat hukum. Cek dokumentasi API/model moderasi **versi terpasang** + regulasi wilayahmu.
