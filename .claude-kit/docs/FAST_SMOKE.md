# Fast Smoke Test - SOP

> Tier 2 fast smoke = <5 sec. Catch 80% bugs sebelum push.

## Untuk Owner

### Cek cepat kapan saja (jalur Node)

```bash
node .claude-kit/tests/smoke-portable.mjs
```

Atau gerbang lengkap sebelum rilis:

```bash
npm run preflight
```

> v2.0.0: kit 100% Node. Smoke = `tests/smoke-portable.mjs` (Node); gerbang penuh = `npm run preflight`. Tak ada lagi smoke/Pester PowerShell.

## Tier Pyramid (Speed vs Coverage)

| Tier | Duration | When | What |
|------|----------|------|------|
| **FAST** (<5 sec) | `tests/smoke-portable.mjs` (every commit + CI first job `fast-smoke`) | Syntax .mjs, critical files, manifest integrity, orphans, JSON |
| **MEDIUM** (<30 sec) | `npm test` (node --test) + ESLint (CI per-PR) | Behavior + lint |
| **FULL** (gerbang rilis) | `npm run preflight:strict` (semua pemeriksa + kelengkapan rilis) | Complete behavior + release readiness |

## Untuk AI Workflow

### Sebelum apply edit, run fast smoke baseline (jalur Node)

```
Bash: node tests/smoke-portable.mjs > /tmp/baseline.txt
```

### Setelah apply edits, run smoke comparison

```
Bash: node tests/smoke-portable.mjs > /tmp/after.txt
Bash: diff /tmp/baseline.txt /tmp/after.txt
```

### Fail fast: kalau smoke FAST gagal, jangan lanjut

Kalau parse error / critical file missing / orphan refs > 0 di `smoke-portable.mjs`, perbaiki dulu sebelum jalankan `npm test` + preflight penuh. Hemat waktu per workflow.

## Analogi Non-Programmer

Test pyramid kayak **security checkpoint di mal**:
- **INSTANT** = security scanner di pintu (5 detik scan tas)
- **FAST** = CCTV monitoring (real-time)
- **MEDIUM** = pemeriksaan rutin satpam (per jam)
- **SLOW** = audit komprehensif security firm (per bulan)

Tidak setiap orang yang masuk mal di-audit security firm - itu mahal + lambat. Tapi tiap orang lewat security scanner = fast catch obvious issues.
