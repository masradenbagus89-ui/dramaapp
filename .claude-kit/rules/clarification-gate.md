<!-- LINTAS:SEKSI §clarification-gate -->

## Gerbang Klarifikasi — tanya dulu sebelum rencana non-sepele (rujukan on-demand)

> Pemicu: rencana/fitur non-sepele di §3 langkah Plan / §4.19. Adopsi prinsip `/clarify` (GitHub Spec Kit) — akurasi di depan memangkas revisi belakang. Untuk staff non-programmer: 1 batch, tidak bertele-tele.

### Kapan jalan
Sebelum menyusun rencana non-sepele dan ada yang **kabur** (maksud/lingkup belum jelas). Task sepele / sudah jelas → LEWATI (jangan bebani upacara). Bukan pengganti konfirmasi-lingkup §3 — ini SEBELUMnya, saat masih ada yang perlu ditanya.

### Aturan
1. **1 BATCH saja** (anti-capek/decision-fatigue). Kumpulkan semua pertanyaan penting jadi satu popup `AskUserQuestion` (§14.1), bukan tanya beruntun.
2. Sasar area rawan-ambigu yang MENYETIR rencana:
   - **Akses/peran** — siapa yang boleh pakai/lihat fitur ini? (publik / login / admin saja)
   - **Data** — data apa yang disimpan? di mana? (ada data pribadi/sensitif?)
   - **Kriteria sukses** — "berhasil" itu seperti apa? (bentuk EARS bila cocok, `rules/ears-criteria.md`)
   - **Edge case** — input kosong / jaringan putus / gagal pihak-ketiga → mau bagaimana?
   - **Lingkup** — yang TIDAK termasuk (biar tak melebar)?
3. Rekomendasi di posisi [1] + alasan awam (§14.1). Popup tak muncul / user 2× jawab bebas → beralih ke daftar teks bernomor.
4. Jawaban → langsung masuk konfirmasi-lingkup §3 + kriteria sukses rencana. JANGAN tanya ulang hal yang sudah jelas dari prompt/kode.

### Yang TIDAK diadopsi
Mesin spec multi-berkas (specs/001-*/ 6 berkas ala Spec Kit) = terlalu berupacara untuk staff non-programmer → hanya prinsip klarifikasinya. Cek-konsistensi lintas-artefak (`/analyze`) sudah ditutup robot `consistency-check` + preflight (§4.6) — tak perlu diadopsi ulang.
