# swallowed-error-check.md — Robot "Error-ditelan-diam" (cuma-baca)

> Versi 1 · 2026-07-08 · pendamping `lib/swallowed-error-check.mjs`

## Tujuan
Memindai berkas kode (JS/TS + Python) untuk **blok penangkap-error yang KOSONG** — yaitu `try/catch` (atau `.catch(...)`, atau `except:` Python) yang **menelan error tanpa berbuat apa pun dan tanpa komentar-alasan**. Pola ini menyembunyikan kegagalan: program tampak "jalan mulus" padahal ada error yang ditelan diam-diam, jadi bug baru ketahuan jauh belakangan (atau tak pernah).

🏢 Analogi: seperti **alarm rumah yang dimatikan diam-diam** — kalau memang sengaja (mis. lagi bor tembok), tempel catatan "sengaja dimatikan sampai jam 3"; kalau tanpa catatan, tak ada yang tahu apakah alarm mati karena rusak atau sengaja.

Ini standar industri sejati: **ESLint `no-empty`** (bagian dari `eslint:recommended`) dan **Go `errcheck`** menegakkan hal yang sama. Ide diadaptasi dari `willey-labs/agent-skills` (lisensi MIT) lalu ditulis ulang untuk Node + Bahasa Indonesia non-programmer (`docs/plans/WILLEY_BORROW_IMPLEMENTASI.md` Item #1).

## Jalan-keluar sah (penting)
Kalau pengabaian error memang **disengaja**, tulis **komentar-alasan DI DALAM blok** → blok dianggap "tak kosong" → **lolos**. Ini cermin desain resmi ESLint `no-empty` ("a comment inside the block is a valid escape").

```js
// ❌ Ditandai (menelan error tanpa jejak):
try { kirim() } catch (e) {}

// ✅ Lolos (alasan tertulis di dalam blok):
try { kirim() } catch (e) { /* offline is fine — will retry on next tick */ }
```
```python
# ❌ Ditandai:            # ✅ Lolos:
except Exception:         except Exception:
    pass                      pass  # optional metric; ok to skip
```

## 🔒 Keamanan (WAJIB)
**Cuma-baca**: robot hanya **membaca** berkas + menghitung pola. Tidak menulis/mengubah berkas, **tidak menjalankan** kode yang dipindai, tidak mengirim apa pun ke jaringan. Laporan hanya menyebut **lokasi** (`berkas:baris`) + jenis pola — bukan isi kode/rahasia. Dikunci tes `tests/swallowed-error-check.test.mjs` (termasuk uji "memindai tak mengubah berkas"). Selaras `CLAUDE_universal_v1.md` §8.1 (keamanan) + §8.2 Aturan 3 (verifikasi cuma-baca).

## Cara Pakai
```bash
# Dari dalam folder project (pindai semua kode di bawah folder kerja):
npx lintasai swallowed-check
# atau beri path berkas/folder tertentu:
npx lintasai swallowed-check src/ lib/handler.js
# keluaran mesin-baca:
npx lintasai swallowed-check --json
```
Keluar kode = **jumlah temuan** (0 = bersih). Robot ini **juga jalan otomatis** di Gerbang Pra-Rilis (`npm run preflight`) sebagai **SARAN** (lihat "Mode" di bawah).

## Input / Output
- **Input:** path berkas/folder (opsional; default = folder kerja). `--project-root <folder>` / `--repo-root <folder>` untuk menetapkan akar. `--json` untuk keluaran JSON.
- **Output:** daftar temuan `{ File, Line, Col, Kind }`. `Kind` = `catch-kosong` (try/catch kosong), `.catch()-kosong` (handler promise kosong), atau `except-pass` (Python `except: pass`/`...`).

## Mode (keputusan penting)
Di `npm run preflight` robot ini dipasang sebagai **PERINGATAN (level RAPIKAN)** — **tidak pernah memblokir** gerbang, bahkan saat `--strict`. Alasan (§4.6):
- Mutu-kode itu **bisa-dibalik** (reversible) → biaya salah-blok > biaya kelewat.
- Robot baru ini **belum punya angka laju-alarm-palsu** nyata → belum layak menyandera rilis. Naik ke pemblokir (PENTING, memblokir saat `--strict`) **hanya setelah** ada evaluasi laju-alarm-palsu — jangan dinaikkan lebih dulu.

Selaras keputusan `runAiConfigCheck` (SARAN owner-gated, RAPIKAN).

## Cara kerja singkat (buat yang penasaran)
Robot **menyamarkan** isi string-literal (→ spasi) dan isi komentar (→ karakter pengisi non-spasi) sebelum mencocokkan pola. Asimetri ini yang membuat dua hal benar sekaligus: (1) komentar-alasan **di dalam** `catch { … }` bikin blok "tak kosong" → lolos; (2) pola `catch {}` yang kebetulan ada **di dalam** string/komentar → tak ikut memicu. Nomor baris tetap akurat karena panjang teks dijaga.

## Dependensi
Node 18+. Tanpa modul eksternal. Cuma-baca (`fs`). Reuse `readTextSafe` (`lib/fs-text.mjs`). Memakai regex *lookbehind* (didukung Node modern).

## Catatan
- **Berkas yang dilewati** (anti alarm-palsu): `*.test.*` / `*.spec.*` / `test_*.py` / `*_test.py` (fixtures tes sengaja berisi pola "buruk"), `*.min.js`, `*.d.ts`, dan folder `node_modules/`, `dist/`, `build/`, `.next/`, `.git/`, `coverage/`, `.claude-kit/`, dll.
- **Batas jujur (bukan bug) — sudah dikeraskan lewat verifikasi adversarial 2026-07-08:**
  - **Method BERNAMA `catch`** (bukan `try/catch`) tak lagi salah-ditandai: robot mensyaratkan `}` penutup blok `try` tepat sebelum `catch`. Sisa sangat langka: method KOSONG bernama `catch` yang kebetulan tepat setelah `}` method lain (mis. `class { a(){} catch(){} }`) masih bisa ke-tandai — dampak kecil (pemeriksa tak memblokir).
  - **Regex-literal ber-tanda-kutip** (mis. `/it's/`, `/a"b/`) tak lagi "menular" ke baris lain: status string di-reset tiap baris (kutip `'`/`"` JS memang tak boleh lintas-baris), jadi kekacauan penyamar dibatasi ke satu baris.
  - **Regex-literal 1-baris yang isinya persis `catch {}`** (mis. `/catch {}/`) masih bisa memicu di baris itu sendiri — sangat langka. Karena ini pemeriksa **PERINGATAN** (tak memblokir), diterima; kalau muncul, tambah komentar/abaikan.
  - **Di luar cakupan yang sengaja:** argumen kedua `.then(f, () => {})` yang kosong (robot hanya memindai `.catch`), badan `catch { ; }` yang cuma titik-koma (konsisten dgn ESLint `no-empty`), dan `catch {}` kosong di dalam interpolasi template `` `${...}` `` (isi backtick disamarkan penuh). Semua ini langka + tier-peringatan.
- **Bukan pengganti linter penuh.** Untuk penegakan mutu-kode menyeluruh, pakai preset ESLint/ruff ketat di gerbang (rencana Item #1 menolak port hook AST pemblokir-keras). Robot ini menutup **satu** kelas paling berbahaya (error ditelan) dengan biaya ~0 token, tanpa ketergantungan tambahan.
