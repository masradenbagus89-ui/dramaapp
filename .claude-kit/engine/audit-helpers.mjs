#!/usr/bin/env node
// engine/audit-helpers.mjs - Append-only audit log (port Node dari audit-helpers.ps1).
//
// MIGRASI grup [A] (ADR-003): robot PENULIS paling ringan (append-only). v2.0.0: berkas .ps1
// sudah dihapus - ini satu-satunya implementasi.
//
// Format per baris (ISO 8601 UTC): <TIMESTAMP> | <SOURCE> | <ACTION> | <DETAIL>
//
// Catatan encoding (uji-banding): versi PS pakai Add-Content -Encoding UTF8 (di PS5.1 = BOM +
// CRLF). Versi Node ini tulis UTF-8 NO-BOM + LF (lebih bersih, sejalan PS7). FORMAT BARIS
// byte-identik; perbedaan BOM/line-ending = kosmetik (log dibaca manusia/grep; Get-Content +
// split(/\r?\n/) menormalkannya). Kalau perlu byte-match ketat dgn log PS-lama, ganti ke CRLF.
import fs from 'node:fs'
import path from 'node:path'

// Tiruan Add-LintasAuditEntry: tulis 1 baris audit. Non-fatal (warn, JANGAN throw - audit
// transparency != availability). auditDir default = cwd (PS pakai $kitDir scope-caller; di Node
// pemanggil mengoper eksplisit).
export function addLintasAuditEntry({ source, action, detail, auditDir = null } = {}) {
  let auditPath
  try {
    const dir = auditDir || process.cwd()
    auditPath = path.join(dir, '.audit-log')
    const timestamp = new Date().toISOString().replace(/\.\d+Z$/, 'Z') // 'yyyy-MM-ddTHH:mm:ssZ' (tanpa milidetik)
    const entry = `${timestamp} | ${source} | ${action} | ${detail}`
    fs.appendFileSync(auditPath, entry + '\n', 'utf8') // UTF-8 no-BOM, append
  } catch (e) {
    console.warn(`AUDIT log gagal ditulis ke '${auditPath}': ${e.message}`)
  }
}
