<!-- LINTAS:SEKSI §pencarian -->

## §pencarian. Capability Pack — Pencarian (full-text & faceted) kelas-industri

> **Kapan dibaca:** "fitur pencarian / search bar / cari produk-artikel / filter & sortir hasil / autocomplete / cari cepat di banyak data". Resep merakit pencarian yang **cepat, relevan, dan tak bocorkan data**. Untuk pencarian **berbasis arti/AI (semantik/vektor)** → rujuk peta-jalan pgvector Gelombang-3, jangan disalin ke sini. Baca induk `workflows/cap-packs.md`.

🙂 Analogi: pencarian = **pustakawan + indeks buku**. Pustakawan hebat tak membaca ulang semua rak tiap kali ditanya (lambat) — ia menyiapkan **indeks** supaya jawaban yang relevan muncul cepat.

### Kontrak (yang harus benar)
- **Input:** kata kunci + filter (faset). **Output:** hasil relevan yang user **berhak lihat**, terurut & terhalaman. **Error:** query kosong/aneh → hasil ramah + saran, bukan error. **Rahasia:** hasil **TAK PERNAH** memuat dokumen yang user tak berhak (saring izin di server, bukan sekadar disembunyikan di tampilan).

### Langkah rakit (prinsip — cek dokumentasi DB/mesin pencari versi terpasang §8.2)
1. **Jangan pakai `LIKE '%kata%'` untuk pencarian serius.** Lambat (memindai seluruh tabel, tak memanfaatkan index) + hasil tak relevan. Untuk teks: pakai **full-text search** bawaan DB (Postgres `tsvector` — kolom teks yang sudah disiapkan agar bisa dicari cepat — + index **GIN**, jenis index Postgres yang mempercepat pencarian teks) atau **mesin pencari khusus** (Meilisearch/Typesense/OpenSearch) sesuai skala.
2. **Saring izin di server, selalu.** Pencarian = jalan bocor data klasik: indeks memuat banyak dokumen sekaligus → wajib saring hasil sesuai izin user (**dan** kunci tenant untuk multi-pelanggan) **di server**, bukan disembunyikan di UI (cegah **IDOR** — user mengubah query/ID/filter untuk mengintip data orang lain; rujuk `workflows/cap/auth.md`). User bisa mengubah query/paginasi untuk mengintip — server yang menjaga.
3. **Faceted search (filter berjenjang):** kategori/harga/tanggal sebagai faset dengan hitungan. Index kolom faset; untuk data besar jangan hitung ulang faset dari nol tiap request.
4. **Relevansi & UX:** urutkan berdasar relevansi + boleh boost (judul > isi); toleransi salah-ketik (fuzzy) bila mesin mendukung; saran/autocomplete; sorot kata cocok (highlight); **empty-state jelas** ("tak ada hasil untuk X" + saran koreksi).
5. **Sinkronkan indeks dengan data.** Data berubah → indeks diperbarui (langsung untuk yang kritis, atau via latar untuk skala besar — rujuk `workflows/cap/background-job.md`). Indeks basi = hasil menampilkan data lama/terhapus. Rencanakan cara **reindex** dari awal.
6. **Skala & biaya:** paginasi berbasis **kursor** (lanjut dari item terakhir) untuk hasil dalam — bukan `OFFSET` besar (melompati N baris dari awal; makin dalam makin lambat); batasi kedalaman; cache query populer bila perlu. Untuk **autocomplete**: pasangkan **debounce** di sisi klien (~200-300 md — tunggu user berhenti mengetik sesaat sebelum kirim) + minimal 2-3 huruf **dengan** **rate-limit** di server (mahal + sasaran scraping/abuse). Tanpa debounce, tiap ketukan tombol = 1 request → rate-limit server malah memblokir user sendiri.
7. **Pencarian semantik/vektor** (mencari berdasar *arti*, bukan kata persis) = **peta-jalan Gelombang-3** (belum dibangun — rencananya di `docs/plans/perkuat-jangan-kurung-roadmap.md`; nanti mendarat di `workflows/stack/4.14-2-supabase-prisma.md` sebagai pgvector) + `workflows/cap/ai-rag-aman.md` untuk RAG. **Jangan salin ke sini** — full-text ≠ vektor; keduanya sering digabung (hybrid), tapi mekanik vektor milik Gelombang-3.

### Gotcha (sering salah)
- `LIKE '%x%'` di tabel besar → lambat + tak relevan + membebani DB.
- Saring izin **cuma di UI** → user ubah query/paginasi → bocor dokumen orang/tenant lain.
- `OFFSET` besar untuk "muat lagi" → makin dalam makin lambat (dan bisa lewatkan/dobel item saat data berubah).
- Indeks tak disinkron → hasil menampilkan data basi/terhapus.
- Autocomplete/search **tanpa rate-limit** → mahal + gampang di-scrape.
- Multi-tenant lupa **kunci tenant** di indeks → bocor lintas-pelanggan.

### Rujuk-silang (reuse-first — jangan salin)
- Otorisasi / anti-IDOR pada hasil → `workflows/cap/auth.md` + `workflows/stack/4.14-5-owasp.md`.
- Reindex via latar → `workflows/cap/background-job.md`.
- Pencarian semantik/vektor (pgvector) → peta-jalan Gelombang-3 `workflows/stack/4.14-2-supabase-prisma.md` + `workflows/cap/ai-rag-aman.md`.
- Index DB (GIN / kolom WHERE-JOIN-ORDER) → `workflows/stack/4.14-2-supabase-prisma.md`.

### Threat-model 3-baris
- **Aset:** data terindeks (bisa sensitif / lintas-tenant), ketersediaan (search itu mahal). **Penyerang:** pembocor data via query/paginasi melewati izin, penyalahguna resource (query mahal / scraping), pelaku injeksi query. **Mitigasi:** saring izin + tenant server-side + query terparametrisasi + rate-limit + paginasi kursor + batas kedalaman.

### Batas jujur
Relevansi pencarian = **penyetelan terus-menerus** (tak ada "benar" mutlak) — butuh iterasi dari data & perilaku nyata. Skala sangat besar (jutaan dokumen, ribuan query/detik) butuh arsitektur mesin-pencari khusus di luar cakupan pack. Pencarian semantik sengaja diserahkan ke Gelombang-3. Cek dokumentasi DB/mesin pencari **versi terpasang** (sintaks full-text & fitur berbeda antar-versi).
