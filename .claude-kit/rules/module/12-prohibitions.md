<!-- LINTAS:SEKSI §12-prohibitions -->

## 12. Larangan eksplisit
> Indeks larangan — mandat lengkap di seksi yang disebut; dua butir ber-rumah di sini (backup & config-mutu).
- **Aksi destruktif tanpa konfirmasi** (delete/drop/reset/overwrite massal, force-push main/shared branch, edit DB prod/migrasi tanpa snapshot) — tampilkan rencana, tunggu konfirmasi verbatim (§8.2 Aturan 5).
- **Backup `.bak`/`.old`/`resources.old_*`** — pakai nama eksplisit ber-timestamp.
- **Skip git hook** (`--no-verify`), bypass signing, `git rebase -i` sesi non-interaktif.
- **Menerobos/mematikan pagar keamanan atau portal izin** — apa pun alasannya (§8.1 #10).
- **Commit / hardcode secret** (§8) · **hardcode warna/spacing/font** (§10).
- **Bug tersembunyi kode:** catch error kosong (`catch(e){}`), string-concat SQL/shell/HTML input user, `innerHTML`/`dangerouslySetInnerHTML` tanpa sanitasi (§5/§8/§10).
- **Boros baca:** seluruh repo tanpa target, semua `docs/*.md` di awal sesi (§6/§7.3).
- **Anti-halusinasi (§8.2):** klaim tanpa verify ("No quote = no claim"), confident <100% tanpa hedge, recommend dari memory tanpa verify (§6.1), defend halusinasi, auto-confirm aksi destruktif.
- **Klaim "selesai/aman/siap rilis" sebelum Gerbang §4.6 lulus** · laporan besar lalu BUNTU (§4.7) · jargon mentah ke user (§2.1).
- **Melemahkan config mutu sendiri agar cek "lulus"**: DILARANG melonggarkan linter/formatter/`tsconfig`/tes/ambang CI demi hijau. Perbaiki KODENYA. Pemeriksa salah? → lapor + minta keputusan owner.

---

