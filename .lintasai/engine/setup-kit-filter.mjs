// engine/setup-kit-filter.mjs — PENENTU "berkas ini ikut ke client atau tidak" + penjaga repo-dev.
//
// Dipecah dari setup-pola-b.mjs (Fase E 2026-07-25): isi dipindah APA ADANYA — tiap pola pengecualian
// dan urutan cabangnya byte-identik. Keduanya dikunci tes: tests/setup-copy-filter.test.mjs,
// tests/paritas-distribusi.test.mjs (dua arah vs `npm pack`), tests/setup-guard-repo-kit.test.mjs.
//
// KENAPA dua hal ini satu modul: keduanya menjawab pertanyaan yang sama dari sisi berbeda —
// "apakah folder/berkas ini milik KIT (boleh disalin/dibersihkan) atau milik REPO PENGEMBANGAN
// (haram disentuh)". Salah menjawabnya pernah menghapus 7 commit yang belum di-push.
import fs from 'node:fs'
import path from 'node:path'
import { NAMA_FOLDER_KIT } from './project-root.mjs'

// Apakah folder INI SENDIRI = akar repo pengembangan lintasAI? Dua syarat serentak:
//   1. ada `.git` (DIREKTORI **atau** BERKAS) -> repo sungguhan, bukan salinan vendor
//   2. package.json name === 'lintasai'       -> kit-nya sendiri, bukan project client mana pun
//
// DIPERLEBAR 2026-07-30 (dulu WAJIB direktori): di **git worktree** dan **submodule**, `.git` adalah
// BERKAS berisi `gitdir: <path>` - bukan direktori. Dengan syarat lama, penjaga BERHENTI MENGGIGIT tepat
// di sana, lalu removeGitMetadata (dipanggil setup-steps.mjs:274) menghapus berkas penaut itu. Akibatnya
// worktree kehilangan tautan ke gitdir utama - kelas kerusakan yang SAMA dengan insiden 7-commit-hilang
// yang melahirkan penjaga ini, cuma bentuk `.git`-nya beda.
// Kenapa aman (tak menambah alarm-palsu): syarat ke-2 tetap mengunci - hanya menggigit kalau package.json
// bernama 'lintasai'. Project client tak pernah bernama itu, dan cabang '.lintasai' di pemanggilnya sudah
// keluar lebih dulu. Dikunci uji-negatif berpasangan di tests/setup-guard-repo-kit.test.mjs.
// FAIL-SAFE: apa pun yang aneh (JSON rusak, izin baca ditolak) -> false.
function adalahAkarRepoKit(dir) {
  try {
    if (!fs.existsSync(path.join(dir, '.git'))) return false
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
    return String(pkg.name).toLowerCase() === 'lintasai'
  } catch {
    return false
  }
}

// Apakah `dir` berada DI DALAM repo PENGEMBANGAN lintasAI (bukan salinan kit di project client)?
// Dipakai sebagai HENTI KERAS sebelum `removeGitMetadata` menghapus .git — lihat alasan lengkap di
// titik pemanggilannya.
// Diperiksa `dir` DAN INDUKNYA. Kenapa induk: setelah pemisahan client/dev, isi kit tinggal di
// `<repo>/kit/` yang TIDAK punya .git/package.json sendiri -> memeriksa `dir` saja membuat penjaga
// BERHENTI MENGGIGIT tepat di skenario yang dulu menghilangkan 7 commit.
// Cabang '.lintasai' KELUAR LEBIH DULU, jadi pelebaran ke induk TIDAK bisa menimbulkan alarm-palsu
// di project client (induk `.lintasai/` = project client, package.json-nya bukan 'lintasai' — dan
// walau kebetulan bernama begitu, cabang nama folder sudah menghentikannya di baris pertama).
// FAIL-SAFE: apa pun yang aneh -> false = perilaku seperti sebelumnya.
export function adalahRepoPengembanganKit(dir) {
  try {
    if (!dir) return false
    if (path.basename(dir) === NAMA_FOLDER_KIT) return false
    if (adalahAkarRepoKit(dir)) return true
    const abs = path.resolve(dir)
    const induk = path.dirname(abs)
    if (induk && induk !== abs) return adalahAkarRepoKit(induk)
    return false
  } catch {
    return false
  }
}

// Berkas/folder yang JANGAN ikut tersalin ke <project>/.lintasai/ saat mode npx (filter fs.cpSync).
// Tujuan: (a) KEAMANAN - cegah rahasia kit-sumber (kunci-segel, profil tim, rencana internal) bocor ke
// project staff saat pemasang dijalankan LANGSUNG dari repo-dev/CI; (b) kurangi bloat. Selaras .npmignore
// + AGENTS.md §5.2 (daftar berkas rahasia yang tak boleh disebar). Jalur npm staff sudah aman
// (tarball whitelist files[]); filter ini = pertahanan-berlapis untuk jalur dev-direct + kalau files[] bocor.
const KIT_COPY_EXCLUDE_NAMES = new Set([
  '.git', '.manifest-secret', '.install-manifest.json', '.audit-log',
  'node_modules', 'experiments', 'testResults.xml',
])
export function shouldCopyKitEntry(srcAbs, kitRootAbs) {
  const rel = path.relative(kitRootAbs, srcAbs).replace(/\\/g, '/')
  if (rel === '') return true // akar kit sendiri
  // PAGAR STRUKTURAL (pemisahan client/dev): apa pun DI LUAR folder kit tak pernah tersalin. Sejak
  // muatan client tinggal di `kit/`, "ikut ke client" ditentukan LETAK, bukan daftar-larangan yang
  // harus diingat tiap kali menambah berkas dev baru. Ini menutup kelas bug "yatim piatu" (berkas
  // yang tak ada di files[] MAUPUN di daftar-larangan, lalu ikut tersalin lewat jalur dev-direct)
  // secara struktural — bukan per-kasus. Kelas bug nyata 2026-07-15 (docs/serap-skill + ledger
  // mendarat di .lintasai klien) kini mustahil terulang lewat jalur ini.
  if (rel === '..' || rel.startsWith('../')) return false
  const base = rel.split('/').pop()
  if (KIT_COPY_EXCLUDE_NAMES.has(base)) return false
  // Pola berkas rahasia / identitas per-staff (di level mana pun):
  if (/\.local\.md$/i.test(base)) return false          // berkas lokal owner (*.local.md)
  if (base.toLowerCase() === '.staff-profile.md') return false
  if (/^\.git-identity-/i.test(base)) return false
  if (/\.(pem|key)$/i.test(base)) return false
  if (/^\.env(\.|$)/i.test(base)) return false
  // SELURUH folder docs/ DICABUT dari distribusi client (v4.0.0): isinya = dokumentasi mesin/keputusan
  // repo kit (architecture, RESEP_PERUBAHAN, SIGNED_RELEASE, doc-robot, ADR, ledger BUKU_PELAJARAN, arsip,
  // rencana internal, bahan serap-skill) = maintainer-facing, BUKAN untuk klien. Klien dapat semua doc yang
  // ia butuh dari templates/ (di-deploy ke docs/ project-nya oleh teamFiles), BUKAN dari .lintasai/docs/.
  // Cermin package.json files[] (pola "docs/" dibuang total). Tanpa baris ini, jalur salin dev-direct
  // (cpSync dari repo) tetap membawa docs/ padahal tarball npm sudah bersih = divergensi diam-diam antar-jalur
  // pasang (kelas bug uji-nyata 2026-07-15: berkas internal mendarat di .lintasai klien lewat jalur dev).
  // Sejak pemisahan client/dev, `docs/` ada di LUAR folder kit sehingga pagar struktural di atas
  // sudah menahannya. Baris ini DIPERTAHANKAN sebagai pertahanan-berlapis untuk tata-letak LAMA
  // (kit = akar repo, mis. client kit versi sebelumnya yang menjalankan pemasang dari salinannya).
  if (rel === 'docs' || rel.startsWith('docs/')) return false
  // lintasAI.md = skill/aturan PRIVAT lintasAI (kebutuhan repo kit sendiri), + CLAUDE.md = pemuat dogfood
  // repo yang meng-@import lintasAI.md. Keduanya repo-only, JANGAN ke client: lintasAI.md privat; klien
  // pakai kernel AGENTS.md (dibuat setup-pola-b di root), bukan CLAUDE.md dogfood ini. CLAUDE_universal_v1.md
  // = kernel LAMA yang sudah diarsipkan (docs/arsip/); kalau ada salinan nyasar di root, jangan ikut ke client.
  // (AGENTS.md kernel MEMANG ikut ke .lintasai/ client - tak dikecualikan.) Tanpa baris ini, salin dev-direct bawa @import menggantung.
  // Cermin: ketiganya juga tak ada di package.json files[] (whitelist npm). Pertahanan-berlapis jalur dev-direct.
  if (rel === 'lintasAI.md' || rel === 'CLAUDE.md' || rel === 'CLAUDE_universal_v1.md') return false
  return true
}
