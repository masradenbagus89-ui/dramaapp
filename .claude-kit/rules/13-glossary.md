<!-- LINTAS:SEKSI §13 -->

## 13. Glossary (rujukan on-demand)

> Dipindah dari `CLAUDE_universal_v1.md` §13. Dibaca AI saat perlu arti istilah. Untuk staff non-programmer: `docs/GLOSSARY_NON_PROGRAMMER.md`.

- **CLAUDE.md / AGENTS.md** - file aturan AI yang auto-load tiap sesi.
- **memory** - catatan internal AI yang auto-load lintas sesi.
- **tie-breaker** - aturan penentu saat dua aturan bentrok.
- **edge case** - kondisi pinggiran (input kosong, 0, null, network putus) yang sering bikin bug.
- **reuse** - pakai ulang kode yang sudah ada, bukan duplikasi.
- **least privilege** - beri akses sesedikit mungkin; default deny.
- **DoD (Definition of Done)** - checklist "selesai" yang harus lulus.
- **a11y** - *accessibility*, ramah disabilitas (label, kontras, keyboard).
- **boundary** - pintu masuk data ke proses (handler route, consumer queue, parser file).
- **atomik** - semua berhasil atau semua dibatalkan (transaction).
- **idempoten** - dijalankan 2x hasilnya sama (pakai unique key / cek dulu sebelum insert).
- **fallback** - rencana cadangan kalau cara utama gagal (mis. popup GUI gagal → otomatis pakai prompt teks console).
- **kontrak** - catatan singkat: data masuk apa, keluar apa, error apa, status code berapa.
- **IDOR** - ganti ID di URL untuk akses data orang lain.
- **XSS / SQLi / SSRF** - injection lewat HTML / SQL / paksa server fetch URL internal.
- **RLS (Row Level Security)** - aturan di DB siapa boleh baca/tulis baris mana.
- **kardinalitas tinggi** - banyak nilai unik (mis. email) - cocok di-index.
- **zero-downtime** - perubahan tanpa memutus user (pola expand-then-contract).
- **expand-then-contract** - tambah baru dulu → migrasi → hapus lama.
- **Refactoring** (*in-place*) - rapikan kode tanpa ubah struktur/perilaku (nama, hapus duplikat, pecah fungsi). Tetap 1 repo; bentuk default tiap "refactor". Detail: `rules/4.2-pattern-driven.md`.
- **Modular Monolith** - 1 repo disusun jadi modul/paket terpisah-jelas (masih **1 repo**). Bentuk lanjutan refactor bertahap.
- **Repository Split** - pisah 1 repo jadi beberapa repo (multi-repo). Fitur terpisah + keputusan owner/lead (`SPLIT_REPO_MIGRATION_PROMPT_v1.md`). Lawan dari monorepo.
- **Microservice** - banyak layanan/repo terpisah. **MURNI** = tiap layanan punya **database SENDIRI** (database-per-service). **VARIAN SHARED-DATABASE** = banyak repo berbagi **1 database** (schema-per-service) — lebih sederhana, biasa dipakai tim lintasAI. Repository Split dengan 1 DB bersama = varian shared-database. Detail: `docs/plans/POLA_REPO_AMAN.md`.
- **Strangler Fig** - pola migrasi **bertahap**: cabut/ekstrak satu bagian sekali jalan, sistem lama tetap hidup sampai bagian baru terbukti. Lawan *big-bang*.
- **branch-by-abstraction** - ganti "mesin" internal yang dipakai banyak pemanggil TANPA big-bang: (1) sisipkan lapisan tipis (abstraksi) di depan implementasi lama, (2) bangun baru di belakang lapisan itu, (3) pindahkan pemakai satu per satu, (4) buang yang lama. Beda Strangler Fig (mencabut ke sistem BARU) — ini mengganti isi DI TEMPAT. 🏢 ganti mesin mobil sambil mobil tetap jalan.
- **parallel-change** (alias *expand-then-contract* untuk KODE) - ubah kontrak (signature/tipe) lintas-modul bertahap: tambah yang baru berdampingan → pindahkan pemanggil → hapus yang lama. Pola sama dengan expand-then-contract di DB (§9), diterapkan ke kode. Cegah "ubah semua pemanggil sekaligus dalam 1 perubahan besar".
- **Conventional Commits** - standar pesan commit (`feat:`, `fix:`, dst).
- **OG (Open Graph)** - metadata preview link di WhatsApp/FB/Twitter.
- **CVE** - laporan publik kerentanan library.
- **lockfile** - file kunci versi dependency (`package-lock.json`, `pnpm-lock.yaml`).
- **skeleton** - placeholder abu-abu mirip layout asli saat loading. *(contoh: Tailwind `animate-pulse`)*
- **slug** - bagian URL deskriptif (mis. `/blog/aturan-ai`).
- **runbook** - dokumen langkah-demi-langkah saat insiden/rollback.
- **threat model** - daftar singkat: aset / attacker / mitigasi.
- **halusinasi AI** - AI ngarang fakta dengan confidence tinggi (mis. klaim file/fungsi ada padahal tidak). Mitigasi: seksi 8.2 Anti-Halusinasi Protocol.
- **bus factor** - berapa orang yang tahu cara kerja sesuatu. Bus factor = 1 berbahaya (kalau dia hilang, no one continues). Target sehat: >=2 per file CRITICAL. Detail seksi 7.7.
- **blast radius** - seberapa luas dampak kalau aksi salah (1 user vs 1.000 user kena, reversible vs irreversible).
- **reversibility** - seberapa cepat & mudah balikin ke state sebelumnya. `git revert` = high reversibility. `DROP TABLE` di prod = low reversibility (butuh restore backup).
- **adversarial verify** - sangkal klaim sendiri sebelum kirim. Multi-agent skeptic pattern untuk audit / security review.
- **force citation rule** - "no quote = no claim". Klaim file/fungsi/config WAJIB verify via tool sebelum diutter.
- **humble mode** - default ke "tidak yakin" + hedge language kalau bukti < 100%. Lawan dari "overconfident".
- **exception chaining (`raise ... from e`)** - saat membungkus error teknis jadi error domain sendiri, sertakan `from e` agar log menunjukkan rantai sampai akar penyebab; tanpa itu jejak akar (traceback) hilang & debugging jadi buta. Python inti (3+).

---
