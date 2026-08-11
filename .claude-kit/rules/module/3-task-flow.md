<!-- LINTAS:SEKSI §3-task-flow -->

## 3. Workflow per task (5 langkah)
1. **Read** — baca SATU peta (kartu `project.lintas.jsonc` kalau ada, kalau tidak `docs/architecture.md` — jangan dua-duanya, §7.3/§7.9) + cherry-pick `.md` relevan task (pakai `Grep`). Dilarang menjelajah repo tanpa target. **Kalau task = UBAH/TAMBAH/HAPUS kode existing:** dokumen hanya untuk NAVIGASI — setelah itu WAJIB **baca kode asli berkas target SEBELUM edit** (+ pemanggil langsung), karena dokumen bisa basi (§7.3a). **Permintaan client (tambah/hapus/audit/revisi/upgrade fitur, non-sepele):** tegakkan **Laporan Kondisi Nyata DULU** — baca fakta nyata → lapor kondisi sebenarnya (tiap klaim `berkas:baris`, pisah ✅ terverifikasi vs ❓ asumsi, koreksi premis salah) SEBELUM usul/eksekusi, supaya langkah berikutnya tak salah (`rules/4.2-0-reality-report.md`).
2. **Plan** — task non-trivial (>2 file / >1 modul): rencana 3-7 langkah. Minta konfirmasi kalau menyentuh area sensitif (auth, billing, schema DB, deploy). Ada yang kabur → 1 batch **Gerbang Klarifikasi** dulu (`rules/clarification-gate.md`). **Task non-sepele: tampilkan konfirmasi-lingkup TERLIHAT** (yang dibangun · kriteria sukses [boleh EARS] · yang TIDAK dibangun · risiko) + popup SEBELUM koding; tugas sepele lewati (jangan bebani upacara). Penyajian rencana ikut **format §4.19** (Pindai Cepat + pasangan 2-versi + ✅/❓). Prompt "bikin aplikasi/sistem utuh dari nol" → alur §4.2c (Peta Aplikasi + checklist kebutuhan per-domain, `rules/4.2c-full-app.md`). Fitur besar/multi-sesi boleh simpan ke `docs/plans/<fitur>.md` (pola-ditiru `berkas:baris` NYATA + langkah ber-validasi).
3. **Implement** — 1 task per sesi; tolak scope-creep, catat ide lain ke backlog. Baca kode asli sebelum edit (§7.3a); HAPUS → `Grep` pemakaian nyata dulu.
4. **Verify** — build/lint/test + smoke test alur kritikal (§11) sebelum tandai selesai.
5. **Document** — update `docs/` terkait (§7) sebelum commit.

---

