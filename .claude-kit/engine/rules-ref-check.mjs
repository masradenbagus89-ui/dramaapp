#!/usr/bin/env node
// engine/rules-ref-check.mjs - Penjaga Rujukan berkas rujukan on-demand (folder rules/).
//
// KENAPA ADA: dulu detail aturan hidup di 1 berkas raksasa LINTASAI_WORKFLOWS_v1.md dan rujukannya
// berbentuk "§4.13" yang harus DITEBAK AI lewat pola judul - audit 2026-07-10 membuktikan 11 dari 25
// rujukan gagal ditemukan + 1 rujukan (§7.3a) menunjuk seksi yang tidak ada. Jalur gagalnya mahal:
// AI membaca utuh ~177 KB (~44-51rb token) atau mengarang isi aturan dari ingatan. Sejak pecah-per-seksi,
// rujukan = PATH BERKAS LITERAL (rules/<nomor>-<slug>.md) sehingga keberadaannya biner (ada/tidak) -
// dan robot ini yang menjamin 100% rujukan tersambung SEBELUM rilis (doktrin §6.4: yang mengingat = MESIN).
//
// 6 PEMERIKSAAN (semua deterministik, ~0 token AI):
//   1. FORWARD  - tiap rujukan `rules/*.md` di berkas kit wajib menunjuk berkas NYATA.   [PENTING]
//   2. REVERSE  - tiap berkas rules/ terdaftar di rules/INDEX.md (nol berkas yatim). [PENTING]
//   3. PENSIUN  - pola rujukan lama "LINTASAI_WORKFLOWS_v1.md §X" DILARANG menyelinap balik. [PENTING]
//   4. PENANDA  - baris-1 tiap berkas = `<!-- LINTAS:SEKSI §<id> ... -->`, id unik lintas-berkas,
//                 dan id pertama muncul di nama berkasnya (typo nama/penanda ketahuan).       [PENTING]
//   5. INDEX    - tiap path `rules/...md` yang disebut INDEX.md wajib ada berkasnya.      [PENTING]
//   6. ANGGARAN - berkas seksi > ambang (default 18.000 char) -> saran pecah (non-blokir).    [RAPIKAN]
//
// SIFAT: CUMA-BACA + deterministik. AUTO-SKIP anggun: folder rules/ tak ketemu (client belum
// update / repo lama) -> present:false (INFO), bukan error. Inti PURE (analyzeRules menerima teks
// yang disuntik) - teruji di tests/rules-refs.test.mjs tanpa menyentuh disk.
//
// CLI: node engine/rules-ref-check.mjs [--project-root <dir>] [--report]
//   --report = mode inventaris: daftar SEMUA rujukan (gaya lama §X + gaya baru path) + status resolve.
//              Dipakai saat migrasi sebagai checklist sapu-rujukan (alat migrasi = alat penjaga).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripBom, readTextSafe, isDir, isFile } from './fs-text.mjs'

// Langit-langit anti-regresi ukuran per-berkas seksi (bukan target; seksi terbesar saat pecah ~17,5 KB).
// Lewat ambang -> RAPIKAN (saran sub-pecah, tak memblokir) - filosofi sama rules-budget-check.
export const DEFAULT_SECTION_BUDGET = 18000

// Ambang TERPISAH untuk berkas templates/ - sengaja lebih longgar dari berkas seksi rules/.
// Alasan: templates/ memang wajar lebih besar (banyak berisi contoh siap-tempel/skrip utuh yang tak
// bisa dipecah tanpa merusak kegunaannya), sedangkan rules/ = aturan yang memang harus tipis.
// Tingkat RAPIKAN saja (memantau pertumbuhan, TIDAK memblokir) - filosofi sama DEFAULT_SECTION_BUDGET.
export const DEFAULT_TEMPLATE_BUDGET = 25000

// Rujukan gaya BARU: path berkas di folder rules/ (boleh berprefiks .claude-kit/).
// Batas-kiri (negative lookbehind) WAJIB: tanpa itu, path client yang KEBETULAN memuat segmen
// 'rules/' (mis. docs/rules/x.md, src/rules/y.md, .github/workflows/README.md milik
// PROJECT client sendiri, disebut di AGENTS.md/CLAUDE.md kustom mereka) ikut tertangkap sebagai
// rujukan rak kit -> temuan "rujukan putus" PALSU tingkat PENTING yang MEMBLOKIR `preflight --strict`
// (gerbang rilis client). Lookbehind menolak match bila 'rules/' didahului karakter jalur
// (huruf/angka/._-/\) = tanda ia sub-segmen path lain, bukan awal rujukan rak.
const PATH_REF_RE = /(?<![A-Za-z0-9._/\\-])(?:\.claude-kit\/)?rules\/[A-Za-z0-9][A-Za-z0-9._\-/]*\.md/g
// Rujukan gaya LAMA (PENSIUN): "LINTASAI_WORKFLOWS_v1.md §X" (dgn/tanpa backtick, spasi bebas).
const LEGACY_REF_RE = /LINTASAI_WORKFLOWS(?:_v1)?\.md`?\s*(§[\w.-]+(?:\s*(?:Aturan|#)\s*\S+)?)/g
// Penanda mesin-baca di baris-1 tiap berkas seksi: <!-- LINTAS:SEKSI §id [§id2 ...] -->
const MARKER_RE = /^<!--\s*LINTAS:SEKSI\s+((?:§[a-z0-9.-]+\s*)+)-->\s*$/

// Rujukan ke rak templates/. Batas-kiri sama seperti PATH_REF_RE (cegah tertangkapnya path client
// yang kebetulan memuat segmen 'templates/'). Ditambahkan 2026-07-18: sebelumnya SELURUH permukaan
// rujukan workflows->templates (26 rujukan) TIDAK dijaga siapa pun - 3 bug lolos diam-diam sekaligus
// (path salah tulis, anchor menunjuk judul tak ada, dan rujukan ke berkas tak-terkirim).
const TEMPLATE_REF_RE = /(?<![A-Za-z0-9._/\\-])(?:\.claude-kit\/)?templates\/[A-Za-z0-9][A-Za-z0-9._\-/]*\.md/g
// Anchor seksi yang menempel SETELAH rujukan, mis. `templates/X.md` §2.6b  /  `templates/Y.md` §keamanan
const ANCHOR_AFTER_RE = /^`?\s*§([A-Za-z0-9._-]+)/

// --- (14)(15) BUKU ALAMAT (§4.13) - dinyalakan saat berkas aturan memuat penanda region ---
// Buku Alamat = tabel navigasi 9-bidang di §4.13 (ditulis Tugas 13 rencana v4). Ia dibatasi penanda
// mesin-baca supaya robot tahu PERSIS wilayahnya. Tanpa penanda (mis. sebelum §4.13 ditulis ulang,
// atau di client kit lama) kedua cek DILEWATI diam - auto-skip anggun, bukan alarm palsu.
export const BUKU_ALAMAT_MULAI = '<!-- BUKU-ALAMAT:MULAI -->'
export const BUKU_ALAMAT_SELESAI = '<!-- BUKU-ALAMAT:SELESAI -->'
// Plafon anti-router (meniru engine/rak-pemicu.mjs:19-22): Buku Alamat yang boleh tumbuh bebas = router
// terselubung. Barisnya = SUMBU kerja (9 bidang tetap), bukan topik - 12 memberi sedikit ruang di atas
// 9 tanpa membuka pintu ledakan; maks 3 path/baris menjaga tiap baris = 1 lompatan, bukan daftar.
export const MAKS_BARIS_BUKU_ALAMAT = 12
export const MAKS_PATH_PER_BARIS = 3
// Label bertingkat B4 (§4.13): 🔒 HASIL · 📐 CARA BAKU · 💡 SARAN · 🧪 CONTOH KASUS · 🗃️ LATAR.
// Pola sengaja "emoji + NAMA" (bukan emoji telanjang) supaya penyebutan emoji di prosa biasa tak
// salah-hitung sebagai label. Ambang >=2 = sebuah berkas yang benar-benar dilabeli, bukan 1 stray.
const LABEL_B4_RE = /(🔒\s*HASIL|📐\s*CARA BAKU|💡\s*SARAN|🧪\s*CONTOH KASUS|🗃️\s*LATAR)/g
export function berlabelB4(text) {
  return (String(text || '').match(LABEL_B4_RE) || []).length >= 2
}
// Hub navigasi yang BUKAN rak-pengetahuan-berlabel (dikecualikan dari cek label): INDEX = daftar isi,
// 4.14-stack-packs = sumbu STACK (dideteksi dari berkas config, bukan pengetahuan bertingkat).
const BUKU_ALAMAT_LABEL_EXEMPT = new Set(['rules/INDEX.md', 'rules/4.14-stack-packs.md'])
// Ambil wilayah Buku Alamat dari sebuah dokumen (di antara penanda MULAI..SELESAI). null = tak ada.
export function extractBukuAlamat(text) {
  const s = String(text || '')
  const i = s.indexOf(BUKU_ALAMAT_MULAI)
  if (i === -1) return null
  const j = s.indexOf(BUKU_ALAMAT_SELESAI, i + BUKU_ALAMAT_MULAI.length)
  if (j === -1) return null
  return s.slice(i + BUKU_ALAMAT_MULAI.length, j)
}

// Berkas yang BOLEH tetap menyebut pola lama (riwayat/arsip/cadangan) - bukan rujukan hidup.
const LEGACY_EXEMPT = [
  /(^|\/)CHANGELOG(_ARCHIVE)?\.md$/i,
  /(^|\/)UPGRADING\.md$/i,
  /(^|\/)LINTASAI_WORKFLOWS_v1\.md$/i, // pengalih/stub - justru tugasnya menjelaskan pola lama
  /(^|\/)docs\/decisions\//i,
  /(^|\/)docs\/plans\//i, // dokumen rencana/audit = catatan sejarah keputusan
  /(^|\/)docs\/arsip\//i, // ADR-027: berkas terarsip = snapshot beku, rujukan internalnya historis (bukan hidup)
  /(^|\/)docs\/serap-skill\//i, // katalog serapan ECC internal = catatan riwayat
  /(^|\/)BUKU_PELAJARAN\.md$/i,
  /\.local\.md$/i, // berkas lokal owner (*.local.md) - tak dikirim ke client, boleh sebut path lama
]

export function extractPathRefs(text) {
  const out = []
  const lines = String(text).split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    for (const m of lines[i].matchAll(PATH_REF_RE)) {
      out.push({ ref: m[0].replace(/^\.claude-kit\//, ''), line: i + 1 })
    }
  }
  return out
}

// Rujukan ke templates/ + anchor seksinya (kalau ada). Anchor dipakai pemeriksaan (8).
export function extractTemplateRefs(text) {
  const out = []
  const lines = String(text).split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    for (const m of lines[i].matchAll(TEMPLATE_REF_RE)) {
      const sisa = lines[i].slice(m.index + m[0].length)
      const a = ANCHOR_AFTER_RE.exec(sisa)
      out.push({ ref: m[0].replace(/^\.claude-kit\//, ''), anchor: a ? a[1] : null, line: i + 1 })
    }
  }
  return out
}

// Judul (heading markdown) sebuah berkas, sudah dinormalkan: tanpa '#', tanpa tanda baca depan.
export function extractHeadings(text) {
  const out = []
  for (const baris of String(text).split(/\r?\n/)) {
    const m = /^#{1,6}\s+(.*\S)\s*$/.exec(baris)
    if (m) out.push(m[1].trim())
  }
  return out
}

// Apakah anchor `§X` menunjuk judul NYATA di berkas tujuan?
// Aturan SENGAJA ketat: judul harus DIAWALI teks anchor (bukan sekadar memuatnya di tengah).
// Kenapa ketat: `§keamanan` "memuat"-cocok ke judul "Gerbang lint keamanan + a11y" - padahal yang
// dimaksud "Security Checklist". Cocok-longgar meloloskan anchor SESAT (AI membaca seksi yang SALAH
// lalu percaya diri) = bug KEBENARAN, bukan cuma boros. Diuji lawan 6 anchor nyata: 5 anchor bernomor
// (§3, §2.3, §6, §7, §2.6b, §8) semua cocok; hanya §keamanan yang jatuh - persis bug yang dicari.
export function anchorCocok(anchor, headings) {
  if (!anchor) return true
  const norm = (s) => String(s).toLowerCase().replace(/[.:)\]]+$/, '').trim()
  const a = norm(anchor)
  if (!a) return true
  return headings.some((h) => {
    const hn = norm(h)
    return hn === a || hn.startsWith(a + '.') || hn.startsWith(a + ' ') || hn.startsWith(a + ':')
  })
}

export function extractLegacyRefs(text) {
  const out = []
  const lines = String(text).split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    for (const m of lines[i].matchAll(LEGACY_REF_RE)) {
      out.push({ ref: m[1].trim(), line: i + 1 })
    }
  }
  return out
}

export function parseMarker(firstLine) {
  const m = String(firstLine || '').match(MARKER_RE)
  if (!m) return null
  return m[1].trim().split(/\s+/).map((s) => s.replace(/^§/, ''))
}

// INTI PURE - seluruh isi disuntik, tak menyentuh disk.
//   scanDocs:     [{ rel, text }] berkas kit yang boleh merujuk (CLAUDE_universal, prompts, templates, docs).
//   sectionFiles: [{ rel, text }] berkas di rules/ (rel diawali 'rules/'), TANPA INDEX.md.
//   indexText:    isi rules/INDEX.md (null = INDEX hilang).
// Berkas RUJUKAN BESAR yang CLAUDE_universal_v1.md §6 tandai eksplisit "Grep kata-kunci/anchor dulu,
// jangan baca utuh". Sumber daftar = §6 itu sendiri; kalau §6 menambah nama, tambahkan di sini juga.
export const BERKAS_GREP_DULU = [
  'JALANKAN_KIT.md',
  'SPLIT_REPO_MIGRATION_PROMPT_v1.md',
  'PROJECT_LIFECYCLE_PROMPT_v1.md',
  'AUDIT_POST_SETUP_PROMPT_v1.md',
]
// Frasa yang memerintahkan MEMUAT SELURUHNYA. Sengaja sempit: cuma bentuk perintah, bukan tiap
// penyebutan kata "baca". "baca bagian"/"baca seksi" TIDAK termasuk - itu justru perilaku yang benar.
const BACA_UTUH_RE = /(internalisasi\s+(?:semua|seluruh)|baca\s+(?:utuh|seluruh)|muat\s+seluruh|dibaca\s+utuh)/gi
// Jarak maksimum antara frasa perintah dan nama berkasnya supaya dianggap SATU instruksi.
const JENDELA_BACA_UTUH = 200

// PENGECUALIAN SAH: §6 sendiri mengizinkan JALANKAN_KIT.md Bagian 1-2 dibaca mendekati utuh saat
// Fase Aktivasi §4.3b (alur bercabang/stateful, biaya sekali-per-instalasi). Tanpa pengecualian ini,
// robot akan memerahkan aturan yang justru benar - dan penjaga yang beralarm-palsu akan diabaikan.
const KECUALI_AKTIVASI_RE = /(fase aktivasi|§?4\.3b|bagian 1-2|sekali-per-instalasi)/i

// Cari perintah baca-utuh yang menyasar berkas dalam daftar Grep-dulu.
export function cariPerintahBacaUtuh(text) {
  const out = []
  const lines = String(text || '').split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const baris = lines[i]
    for (const m of baris.matchAll(BACA_UTUH_RE)) {
      const mulai = Math.max(0, m.index - JENDELA_BACA_UTUH)
      const jendela = baris.slice(mulai, m.index + m[0].length + JENDELA_BACA_UTUH)
      if (KECUALI_AKTIVASI_RE.test(jendela)) continue
      for (const berkas of BERKAS_GREP_DULU) {
        if (jendela.includes(berkas)) {
          out.push({ frasa: m[0], berkas, line: i + 1 })
          break
        }
      }
    }
  }
  return out
}

// Ambang "berkas raksasa": berkas terkirim di atas ini TERLALU MAHAL untuk dibuka demi 1 potong info.
// Angka ini PILIHAN, bukan kebenaran - kalau alarm-palsu bermunculan, NAIKKAN ambangnya, jangan matikan
// pemeriksanya (pelajaran LP-012: penjaga yang beralarm-palsu akan diabaikan orang).
export const DEFAULT_RAKSASA_CHARS = 50000

// Berkas yang dimuat AI di SETIAP sesi - instruksi di sini paling mahal kalau salah arah.
export const BERKAS_ALWAYS_LOAD = ['AGENTS.md.template', 'CLAUDE.md.template', 'CLAUDE_universal_v1.md', 'AGENTS.md', 'CLAUDE.md']

// Alat yang BENAR-BENAR memotong bacaan. SENGAJA hanya alat - bukan kata sifat.
// KENAPA penting: instruksi lama berbunyi "cek BARIS TERATAS ./.claude-kit/CHANGELOG.md" - terdengar
// membatasi, padahal cuma harapan; AI yang memakai `Read` (tool paling wajar untuk .md) tetap menarik
// seluruh 183.781 char demi satu angka versi. Frasa "baris teratas"/"sekilas"/"bagian awal" TIDAK
// boleh dianggap pembatas, justru itu yang membuat bug ini terasa aman bertahun-tahun.
const ALAT_PEMBATAS_RE = /(npx\s+lintasai|`?\bGrep\b|\bgrep\b|\bhead\b|\bsed\s+-n|§[A-Za-z0-9])/i
const JENDELA_RAKSASA = 200

// Kata yang MENGAJAK MEMBUKA berkas. Tanpa ini robot menandai tiap PENYEBUTAN nama berkas - terbukti
// melahirkan alarm-palsu di percobaan pertama (mis. "Header auto-isi setup-pola-b.mjs" = menyebut
// program mana yang mengisi, bukan menyuruh membacanya). Menyebut nama != menyuruh membuka.
// Catatan regex: idiom pointer ("Detail =") dipisah dari kata kerja, sebab `\b` sesudah `=` tak pernah
// cocok (`=` dan spasi dua-duanya bukan karakter kata) - versi pertama diam-diam melewatkannya.
const AJAKAN_BUKA_RE = /(?:\b(?:cek|baca|lihat|buka|periksa|rujuk|tengok)\b|(?:Detail|Rincian|Sumber|Selengkapnya)\s*=)/i

// Cari instruksi yang menyuruh membuka berkas raksasa TANPA alat pembatas.
// `raksasa` = Map basename -> jumlah char.
export function cariBacaRaksasa(text, raksasa) {
  const out = []
  const lines = String(text || '').split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const baris = lines[i]
    for (const [nama, chars] of raksasa) {
      let idx = baris.indexOf(nama)
      while (idx !== -1) {
        const jendela = baris.slice(Math.max(0, idx - JENDELA_RAKSASA), idx + nama.length + JENDELA_RAKSASA)
        if (AJAKAN_BUKA_RE.test(jendela) && !ALAT_PEMBATAS_RE.test(jendela)) {
          out.push({ berkas: nama, chars, line: i + 1 })
          break // satu temuan per berkas per baris sudah cukup
        }
        idx = baris.indexOf(nama, idx + nama.length)
      }
    }
  }
  return out
}

// Ambang bobot KELUARGA seksi: perintah "WAJIB/otomatis" atas rujukan §id yang menyeret berkas
// sebesar ini WAJIB menyebut klausa pas-ukuran. Angka ini PILIHAN - alarm-palsu banyak? NAIKKAN,
// jangan matikan pemeriksanya (LP-012).
export const DEFAULT_BORONGAN_CHARS = 15000

// Kata yang menjadikan sebuah kalimat PERINTAH, bukan sekadar keterangan.
const PERINTAH_RE = /(WAJIB|wajib baca|\botomatis\b|bukan opsi|tanpa kecuali)/
// Kata kerja MEMUAT. Ini pembeda kritisnya: "8 divisi WAJIB, tak boleh dihapus" itu pernyataan MANDAT
// (apakah aturannya berlaku) - bukan perintah membaca berkas. Yang mahal cuma yang menyuruh MEMUAT.
// Tanpa syarat ini, percobaan pertama melahirkan 33 temuan yang mayoritas pernyataan mandat biasa;
// menambalnya dengan menaburkan kata "pas-ukuran" = mengakali robot, bukan memperbaiki apa pun.
const KATA_MUAT_RE = /\b(baca|dibaca|membaca|terapkan|diterapkan|tarik|ditarik|menarik|muat|dimuat|Read)\b/i
// Klausa yang membatasi KAPAN/SEBERAPA BANYAK ditarik. Tanpa ini, "WAJIB … otomatis" terbaca borongan.
const PAS_UKURAN_RE = /(pas-ukuran|saat dibutuhkan|saat dipakai|relevan saja|bukan borongan|yang relevan|saat menggarap|kalau perlu|seperlunya)/i
// Rujukan gaya anchor seksi: §4.14 / §4.13-keamanan / §4.15-a-perbaiki-error
const ID_REF_RE = /§([a-z0-9][a-z0-9.-]*)/gi
const JENDELA_BORONGAN = 220
// Jarak maksimum kata-muat dari §id supaya dianggap SATU perintah ("WAJIB baca + terapkan … §4.14").
const JARAK_MUAT = 45

// Bobot sebuah §id = berkasnya sendiri + SELURUH turunannya (§id-*). Inilah yang benar-benar
// tertarik saat aturan bilang "WAJIB baca §4.14" - bukan cuma hub-nya.
// `bobotId` = Map id -> jumlah char berkasnya.
export function bobotKeluarga(id, bobotId) {
  let total = 0
  const awalan = String(id).toLowerCase() + '-'
  for (const [k, v] of bobotId) {
    const kl = k.toLowerCase()
    if (kl === String(id).toLowerCase() || kl.startsWith(awalan)) total += v
  }
  return total
}

// Cari perintah borongan: kata perintah + rujukan §id ber-bobot besar, TANPA klausa pas-ukuran.
export function cariPerintahBorongan(text, bobotId, ambang = DEFAULT_BORONGAN_CHARS) {
  const out = []
  const lines = String(text || '').split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const baris = lines[i]
    if (!PERINTAH_RE.test(baris)) continue
    const dilihat = new Set()
    for (const m of baris.matchAll(ID_REF_RE)) {
      const id = m[1].replace(/[.-]+$/, '')
      if (dilihat.has(id)) continue // sudah DILAPORKAN (bukan sekadar sudah dilihat) - lihat catatan di bawah
      const bobot = bobotKeluarga(id, bobotId)
      if (bobot <= ambang) continue
      // Kata-muat harus DEKAT dengan §id-nya (bukan sekadar ada di baris yang sama). Tanpa syarat
      // jarak ini, "dibaca-cepat vs dibaca-lambat" (soal kecepatan HALAMAN, bukan membaca berkas) di
      // §10 ikut tertangkap - contoh nyata kenapa kedekatan itu sinyal, bukan sekadar keberadaan kata.
      const dekat = baris.slice(Math.max(0, m.index - JARAK_MUAT), m.index + JARAK_MUAT)
      if (!KATA_MUAT_RE.test(dekat)) continue
      const jendela = baris.slice(Math.max(0, m.index - JENDELA_BORONGAN), m.index + JENDELA_BORONGAN)
      if (PAS_UKURAN_RE.test(jendela)) continue
      // Dedupe SESUDAH menilai, bukan sebelum: satu baris sering menyebut §id yang sama dua kali -
      // sekali sebagai judul ("**+ Paket Stack (§4.14):**", tanpa kata-muat) lalu sekali sebagai
      // perintah ("WAJIB baca + terapkan Paket Stack §4.14"). Menyaring di muka membuat kemunculan
      // pertama yang TAK bersalah membungkam yang kedua - dan bug NYATA yang dicari justru lolos.
      dilihat.add(id)
      out.push({ id, bobot, line: i + 1 })
    }
  }
  return out
}

export function analyzeRules({
  scanDocs = [],
  sectionFiles = [],
  indexText = null,
  sectionBudget = DEFAULT_SECTION_BUDGET,
  templateFiles = [],
  shippedTemplates = null,
  templateBudget = DEFAULT_TEMPLATE_BUDGET,
  berkasRaksasa = null,
  boronganChars = DEFAULT_BORONGAN_CHARS,
} = {}) {
  const findings = []
  const sectionSet = new Set(sectionFiles.map((f) => f.rel))
  const add = (tingkat, cek, pesan) => findings.push({ tingkat, cek, pesan })

  // (1) FORWARD: rujukan path -> berkas seksi nyata (INDEX.md sendiri juga target sah).
  // Berkas seksi ikut dipindai - rujukan-silang ANTAR-seksi juga wajib tersambung.
  const targetSet = new Set([...sectionSet, 'rules/INDEX.md'])
  const livingDocs = [...scanDocs, ...sectionFiles]
  for (const doc of livingDocs) {
    // LEGACY_EXEMPT (riwayat/arsip: CHANGELOG/UPGRADING/docs-decisions/docs-plans/BUKU_PELAJARAN) memuat
    // rujukan HISTORIS ke path yang sudah dipindah/diarsip (mis. ADR-027 memindah rules/stack/ ->
    // skills/). Memerahkannya = memaksa menulis-ulang sejarah (selaras exemption cek (3) PENSIUN + tmpl
    // baris 402). Yang tetap dijaga forward = berkas HIDUP (rules/skills/rules/templates).
    if (LEGACY_EXEMPT.some((re) => re.test(doc.rel))) continue
    for (const { ref, line } of extractPathRefs(doc.text)) {
      if (!targetSet.has(ref)) add('PENTING', 'forward', `${doc.rel}:${line} merujuk '${ref}' - berkas TIDAK ADA (rujukan putus).`)
    }
  }

  // (3) PENSIUN: pola lama dilarang di berkas hidup (termasuk di dalam berkas seksi sendiri).
  for (const doc of livingDocs) {
    if (LEGACY_EXEMPT.some((re) => re.test(doc.rel))) continue
    for (const { ref, line } of extractLegacyRefs(doc.text)) {
      add('PENTING', 'pensiun', `${doc.rel}:${line} masih pakai rujukan gaya lama 'LINTASAI_WORKFLOWS_v1.md ${ref}' - ganti ke path rules/<berkas>.md.`)
    }
  }

  // (4) PENANDA baris-1 + id unik + id pertama nyambung ke nama berkas.
  const seenIds = new Map() // id -> rel
  for (const f of sectionFiles) {
    const firstLine = stripBom(f.text).split(/\r?\n/, 1)[0]
    const ids = parseMarker(firstLine)
    if (!ids || ids.length === 0) {
      add('PENTING', 'penanda', `${f.rel} baris-1 tanpa penanda '<!-- LINTAS:SEKSI §<id> -->' (cadangan Grep hilang).`)
      continue
    }
    for (const id of ids) {
      if (seenIds.has(id)) add('PENTING', 'penanda', `id '§${id}' DOBEL: ${seenIds.get(id)} dan ${f.rel} (rujukan jadi ambigu).`)
      else seenIds.set(id, f.rel)
    }
    const base = path.posix.basename(f.rel, '.md')
    if (!base.includes(ids[0])) add('PENTING', 'penanda', `${f.rel}: id pertama '§${ids[0]}' tak muncul di nama berkas (nama vs penanda tak nyambung).`)
  }

  // (2) REVERSE + (5) INDEX sinkron.
  if (indexText == null) {
    if (sectionFiles.length > 0) add('PENTING', 'index', `rules/INDEX.md HILANG - daftar isi wajib ada (fallback AI + peta manusia).`)
  } else {
    const indexRefs = new Set(extractPathRefs(indexText).map((r) => r.ref))
    for (const f of sectionFiles) {
      if (!indexRefs.has(f.rel)) add('PENTING', 'reverse', `${f.rel} tidak terdaftar di rules/INDEX.md (berkas yatim - AI tak bisa menemukannya lewat fallback).`)
    }
    for (const ref of indexRefs) {
      if (ref !== 'rules/INDEX.md' && !sectionSet.has(ref)) add('PENTING', 'index', `rules/INDEX.md menyebut '${ref}' - berkasnya TIDAK ADA (daftar isi basi).`)
    }
  }

  // (6) ANGGARAN ukuran per-berkas seksi.
  for (const f of sectionFiles) {
    const chars = stripBom(f.text).length
    if (chars > sectionBudget) add('RAPIKAN', 'anggaran', `${f.rel} ${chars.toLocaleString('en-US')} char > ambang ${sectionBudget.toLocaleString('en-US')} - pertimbangkan sub-pecah (§4.18).`)
  }

  // (7)(8)(9) RAK templates/ - permukaan yang dulu sama sekali tak berpenjaga.
  if (templateFiles.length > 0) {
    const tmplSet = new Set(templateFiles.map((f) => f.rel))
    const headingCache = new Map()
    for (const doc of livingDocs) {
      // Riwayat/arsip/rencana = CATATAN SEJARAH, bukan rute hidup. Berkas yang dulu ada lalu dihapus
      // memang WAJIB tetap tersebut di CHANGELOG - memerahkannya = memaksa menulis-ulang sejarah.
      // Dipakai ulang dari daftar yang sama dengan pemeriksaan (3) PENSIUN, bukan daftar baru.
      if (LEGACY_EXEMPT.some((re) => re.test(doc.rel))) continue
      for (const { ref, anchor, line } of extractTemplateRefs(doc.text)) {
        // (7) FORWARD: berkasnya ada?
        if (!tmplSet.has(ref)) {
          add('PENTING', 'tmpl-forward', `${doc.rel}:${line} merujuk '${ref}' - berkas TIDAK ADA (rujukan putus).`)
          continue
        }
        // (8) KIRIM: ada di repo tapi tak ikut ke project client = rujukan mati di sisi client.
        if (shippedTemplates && !shippedTemplates.has(ref)) {
          add('PENTING', 'tmpl-kirim', `${doc.rel}:${line} merujuk '${ref}' - berkasnya TIDAK ikut terkirim ke project client (cek engine/kit-files.json). Client disuruh membuka berkas yang tak ada di komputernya.`)
        }
        // (9) ANCHOR: `§X` wajib menunjuk judul NYATA - cegah AI mendarat di seksi yang SALAH.
        if (anchor) {
          if (!headingCache.has(ref)) {
            const t = templateFiles.find((f) => f.rel === ref)
            headingCache.set(ref, t ? extractHeadings(t.text) : [])
          }
          if (!anchorCocok(anchor, headingCache.get(ref))) {
            add('RAPIKAN', 'tmpl-anchor', `${doc.rel}:${line} menunjuk '${ref}' §${anchor} - tak ada judul yang diawali '${anchor}' di berkas itu. AI bisa mendarat di seksi SALAH atau membaca berkas utuh; pakai judul literal yang nyata.`)
          }
        }
      }
    }
    // (10) ANGGARAN ukuran berkas templates/ (ambang terpisah, memantau - bukan memblokir).
    for (const f of templateFiles) {
      const chars = stripBom(f.text).length
      if (chars > templateBudget) {
        add('RAPIKAN', 'tmpl-anggaran', `${f.rel} ${chars.toLocaleString('en-US')} char > ambang ${templateBudget.toLocaleString('en-US')} - pastikan dirujuk ber-anchor seksi (jangan disuruh baca utuh).`)
      }
    }
  }

  // (11) BACA-UTUH: dokumen kit DILARANG memerintahkan "baca/internalisasi seluruhnya" atas berkas
  // yang kebijakan §6 sendiri tandai "Grep dulu, jangan baca utuh".
  for (const doc of livingDocs) {
    if (LEGACY_EXEMPT.some((re) => re.test(doc.rel))) continue
    for (const t of cariPerintahBacaUtuh(doc.text)) {
      add('PENTING', 'baca-utuh', `${doc.rel}:${t.line} memerintahkan baca-utuh ('${t.frasa}') atas '${t.berkas}' - padahal §6 menandai berkas itu Grep-dulu. Satu kalimat begini menelan puluhan ribu karakter tiap sesi. Ganti: sebut anchor/tabel rutenya, lalu Grep bagian yang dipakai saja.`)
    }
  }

  // (12) BACA-RAKSASA: berkas always-load DILARANG menyuruh membuka berkas terkirim raksasa tanpa
  // alat pembatas. Satu kalimat 150 char bisa memerintahkan pembacaan 183.781 char (~45rb token).
  if (berkasRaksasa && berkasRaksasa.size > 0) {
    for (const doc of livingDocs) {
      const nama = doc.rel.replace(/^.*\//, '')
      if (!BERKAS_ALWAYS_LOAD.includes(nama)) continue
      for (const t of cariBacaRaksasa(doc.text, berkasRaksasa)) {
        add('PENTING', 'baca-raksasa', `${doc.rel}:${t.line} menyuruh membuka '${t.berkas}' (${t.chars.toLocaleString('en-US')} char) tanpa alat pembatas - berkas ini dimuat TIAP sesi, jadi instruksinya bisa menarik ~${Math.round(t.chars / 4).toLocaleString('en-US')} token. Sebut alat yang benar-benar memotong (\`npx lintasai …\`, \`Grep\`, \`head\`, atau anchor §…). Kata sifat seperti "baris teratas" TIDAK memotong apa pun.`)
      }
    }
  }

  // (13) WAJIB-BORONGAN: perintah "WAJIB/otomatis" atas §id yang menyeret berkas besar TANPA klausa
  // pas-ukuran. Terbukti nyata: `4.13-division-skills.md:17` menyuruh "WAJIB baca + terapkan Paket Stack
  // §4.14 — otomatis" tanpa syarat, padahal berkas otoritatifnya (`4.14-stack-packs.md:10`) justru
  // berkata "tarik saat dibutuhkan, BUKAN borongan di muka". AI membaca yang induk dulu -> perbaikan
  // 1 tombol menarik 36.245 char resep. Ini bukan cuma boros: §4.17 memperingatkan resep yang
  // dijejalkan sebelum AI melihat kode NYATA membuat AI mengikuti resep alih-alih pola project.
  const bobotId = new Map()
  for (const [id, rel] of seenIds) {
    const f = sectionFiles.find((x) => x.rel === rel)
    if (f) bobotId.set(id, stripBom(f.text).length)
  }
  if (bobotId.size > 0) {
    for (const doc of livingDocs) {
      if (LEGACY_EXEMPT.some((re) => re.test(doc.rel))) continue
      for (const t of cariPerintahBorongan(doc.text, bobotId, boronganChars)) {
        add('PENTING', 'wajib-borongan', `${doc.rel}:${t.line} memerintahkan (WAJIB/otomatis) §${t.id} yang menyeret ${t.bobot.toLocaleString('en-US')} char (berkasnya + seluruh turunan §${t.id}-*) TANPA klausa pas-ukuran. Tambahkan kapan-ditariknya (mis. "pas-ukuran, saat irisan yang membutuhkannya dikerjakan, bukan borongan") - mandatnya TIDAK berubah, cuma waktunya.`)
      }
    }
  }

  // (14) LABEL BUKU ALAMAT + (15) PLAFON ANTI-ROUTER. Auto-skip kalau tak ada penanda region di
  // dokumen mana pun (Tugas 12 sebelum §4.13 ditulis ulang / client kit lama). Keduanya RAPIKAN -
  // memantau, TIDAK memblokir gerbang (kenyataan kode client tetap MENANG, §4.17).
  const sectionTextByRel = new Map(sectionFiles.map((f) => [f.rel, f.text]))
  for (const doc of livingDocs) {
    const region = extractBukuAlamat(doc.text)
    if (region == null) continue
    // (15) plafon: maks 12 baris ber-path, maks 3 path/baris.
    let barisBerpath = 0
    for (const baris of region.split(/\r?\n/)) {
      const paths = [...baris.matchAll(PATH_REF_RE)]
      if (paths.length === 0) continue
      barisBerpath++
      if (paths.length > MAKS_PATH_PER_BARIS) {
        add('RAPIKAN', 'buku-alamat-plafon', `${doc.rel}: satu baris Buku Alamat menyebut ${paths.length} path rak > ${MAKS_PATH_PER_BARIS} - baris = 1 lompatan, bukan daftar. Ekor panjang pindah ke rules/INDEX.md.`)
      }
    }
    if (barisBerpath > MAKS_BARIS_BUKU_ALAMAT) {
      add('RAPIKAN', 'buku-alamat-plafon', `${doc.rel}: Buku Alamat ${barisBerpath} baris ber-path > plafon ${MAKS_BARIS_BUKU_ALAMAT} - ia tabel DIMENSI (9 bidang tetap), bukan daftar topik. Topik baru masuk rules/INDEX.md, jangan tambah baris di sini.`)
    }
    // (14) tiap rak yang DITUNJUK Buku Alamat wajib sudah dilabeli B4.
    const sudah = new Set()
    for (const { ref } of extractPathRefs(region)) {
      if (BUKU_ALAMAT_LABEL_EXEMPT.has(ref) || sudah.has(ref)) continue
      sudah.add(ref)
      const t = sectionTextByRel.get(ref)
      if (t == null) continue // rujukan putus sudah dilaporkan cek (1) FORWARD - jangan dobel-lapor
      if (!berlabelB4(t)) {
        add('RAPIKAN', 'buku-alamat-label', `${ref} ditunjuk Buku Alamat (§4.13) tapi BELUM dilabeli B4 (🔒/📐/💡/🧪/🗃️) - AI membacanya tanpa tahu mana HASIL wajib vs CARA baku vs contoh. Labeli lewat prosedur B4.`)
      }
    }
  }

  return { findings, counts: countLevels(findings), sections: sectionFiles.length, ids: seenIds.size, templates: templateFiles.length }
}

function countLevels(findings) {
  const c = { GENTING: 0, PENTING: 0, RAPIKAN: 0 }
  for (const f of findings) c[f.tingkat] = (c[f.tingkat] || 0) + 1
  return c
}

// --- Pengumpul berkas dari disk (orkestrasi; intinya tetap analyzeRules yang PURE) ---

// Folder yang TAK pernah dipindai (bukan bagian kit / bukan sumber rujukan hidup).
const SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'coverage', '.claude', 'scratchpad'])

function walkMd(dir, baseForRel, out) {
  let entries = []
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walkMd(path.join(dir, e.name), baseForRel, out)
    } else if (e.isFile() && (e.name.toLowerCase().endsWith('.md') || e.name.toLowerCase().endsWith('.md.template'))) {
      // .md.template (AGENTS.md.template / CLAUDE.md.template) = berkas kiriman ber-rujukan hidup - ikut dipindai
      const abs = path.join(dir, e.name)
      out.push({ abs, rel: path.relative(baseForRel, abs).split(path.sep).join('/') })
    }
  }
}

// Temukan "basis kit": repo kit (root, ada engine/kit-files.json) ATAU project client (.claude-kit/).
export function findKitBase(repoRoot = process.cwd()) {
  if (isFile(path.join(repoRoot, 'engine', 'kit-files.json'))) return { base: repoRoot, mode: 'kit' }
  if (isDir(path.join(repoRoot, '.claude-kit'))) return { base: path.join(repoRoot, '.claude-kit'), mode: 'client' }
  return null
}

// Orkestrasi: kumpulkan berkas dari disk lalu jalankan inti PURE. present:false = auto-skip anggun.
export function runRulesRefCheck({ repoRoot = process.cwd(), sectionBudget = DEFAULT_SECTION_BUDGET } = {}) {
  const found = findKitBase(repoRoot)
  if (!found) return { present: false }
  const { base, mode } = found
  const rulesDir = path.join(base, 'rules')
  if (!isDir(rulesDir)) return { present: false, mode } // belum pecah-per-seksi / client belum update

  const all = []
  walkMd(base, base, all)
  const scanDocs = []
  const sectionFiles = []
  const templateFiles = []
  let indexText = null
  for (const f of all) {
    const text = readTextSafe(f.abs)
    if (text == null) continue
    if (f.rel === 'rules/INDEX.md') indexText = text
    else if (f.rel.startsWith('rules/')) sectionFiles.push({ rel: f.rel, text })
    else {
      scanDocs.push({ rel: f.rel, text })
      // Berkas templates/ ikut jadi TARGET pemeriksaan rak (selain tetap jadi perujuk di scanDocs).
      if (f.rel.startsWith('templates/')) templateFiles.push({ rel: f.rel, text })
    }
  }
  const shippedTemplates = bacaDaftarKirimTemplates(base)
  const berkasRaksasa = hitungBerkasRaksasa(base)
  // Project client: AGENTS.md/CLAUDE.md kustom di AKAR project juga perujuk hidup.
  if (mode === 'client') {
    for (const name of ['AGENTS.md', 'CLAUDE.md']) {
      const t = readTextSafe(path.join(repoRoot, name))
      if (t != null) scanDocs.push({ rel: name, text: t })
    }
  }
  return { present: true, mode, base, ...analyzeRules({ scanDocs, sectionFiles, indexText, sectionBudget, templateFiles, shippedTemplates, berkasRaksasa }) }
}

// Berkas TERKIRIM yang di atas ambang raksasa -> Map basename -> jumlah char.
// CLAUDE_universal_v1.md SENGAJA dikecualikan: ia memang berkas always-load yang dibaca utuh tiap sesi,
// jadi menyebutnya bukan jebakan. Ukuran dihitung dari disk (fakta), bukan dari daftar tulis-tangan.
export function hitungBerkasRaksasa(base, ambang = DEFAULT_RAKSASA_CHARS) {
  const out = new Map()
  const manifestPath = path.join(base, 'engine', 'kit-files.json')
  let manifest
  try {
    manifest = JSON.parse(readTextSafe(manifestPath) || '{}')
  } catch {
    return out
  }
  for (const grup of Object.values(manifest)) {
    if (!Array.isArray(grup)) continue
    for (const rel of grup) {
      if (typeof rel !== 'string') continue
      const nama = rel.replace(/^.*\//, '')
      if (nama === 'CLAUDE_universal_v1.md') continue
      const teks = readTextSafe(path.join(base, rel))
      if (teks != null && teks.length > ambang) out.set(nama, teks.length)
    }
  }
  return out
}

// Daftar berkas templates/ yang BENAR-BENAR dikirim ke project client, dibaca dari engine/kit-files.json.
// 3 grup memuat path berprefiks templates/: `templates`, `decisions`, `github_assets`.
// FAIL-SAFE: manifest tak ada/rusak -> null = pemeriksaan (8) dilewati diam (bukan alarm palsu).
export function bacaDaftarKirimTemplates(base) {
  try {
    const raw = readTextSafe(path.join(base, 'engine', 'kit-files.json'))
    if (raw == null) return null
    const j = JSON.parse(stripBom(raw))
    const out = new Set()
    for (const grup of ['templates', 'decisions', 'github_assets']) {
      for (const p of Array.isArray(j[grup]) ? j[grup] : []) {
        if (typeof p === 'string' && p.startsWith('templates/')) out.add(p)
      }
    }
    return out.size > 0 ? out : null
  } catch {
    return null
  }
}

// Mode --report: inventaris SEMUA rujukan (lama + baru) + status - checklist migrasi/sapu-rujukan.
export function runReport({ repoRoot = process.cwd() } = {}) {
  const found = findKitBase(repoRoot)
  if (!found) return { present: false }
  const { base, mode } = found
  const all = []
  walkMd(base, base, all)
  const rows = []
  const sectionSet = new Set(all.filter((f) => f.rel.startsWith('rules/')).map((f) => f.rel))
  for (const f of all) {
    if (f.rel.startsWith('rules/')) continue
    const text = readTextSafe(f.abs)
    if (text == null) continue
    for (const { ref, line } of extractLegacyRefs(text)) {
      rows.push({ gaya: 'LAMA', berkas: f.rel, baris: line, rujukan: ref, status: LEGACY_EXEMPT.some((re) => re.test(f.rel)) ? 'dikecualikan (arsip)' : 'PERLU DISAPU' })
    }
    for (const { ref, line } of extractPathRefs(text)) {
      rows.push({ gaya: 'BARU', berkas: f.rel, baris: line, rujukan: ref, status: sectionSet.has(ref) || ref === 'rules/INDEX.md' ? 'tersambung' : 'PUTUS' })
    }
  }
  return { present: true, mode, base, rows }
}

// --- CLI ---
function main() {
  let repoRoot = process.cwd()
  let report = false
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--project-root') repoRoot = argv[++i] || repoRoot
    else if (argv[i] === '--report') report = true
  }

  if (report) {
    const r = runReport({ repoRoot })
    if (!r.present) { console.log('Rujukan rules: DILEWATI - bukan repo kit / tak ada .claude-kit/.'); process.exit(0) }
    console.log('')
    console.log(`Inventaris Rujukan rules (mode ${r.mode}, basis ${r.base}) - READ-ONLY`)
    console.log('-'.repeat(72))
    for (const row of r.rows) console.log(`  [${row.gaya}] ${row.berkas}:${row.baris}  ${row.rujukan}  -> ${row.status}`)
    const sapu = r.rows.filter((x) => x.status === 'PERLU DISAPU').length
    const putus = r.rows.filter((x) => x.status === 'PUTUS').length
    console.log('-'.repeat(72))
    console.log(`Total ${r.rows.length} rujukan | gaya lama perlu disapu: ${sapu} | path putus: ${putus}`)
    process.exit(0)
  }

  const res = runRulesRefCheck({ repoRoot })
  if (!res.present) { console.log('Rujukan rules: DILEWATI - folder rules/ tak ketemu (belum pecah-per-seksi / belum update).'); process.exit(0) }
  console.log('')
  console.log('Penjaga Rujukan rules/ (READ-ONLY)')
  console.log('-'.repeat(72))
  console.log(`  Basis: ${res.base} (mode ${res.mode}) | berkas seksi: ${res.sections} | id anchor: ${res.ids}`)
  if (res.findings.length === 0) {
    console.log('BERSIH: semua rujukan tersambung, nol berkas yatim, INDEX sinkron.')
    process.exit(0)
  }
  for (const f of res.findings) console.log(`  [${f.tingkat}] (${f.cek}) ${f.pesan}`)
  console.log('-'.repeat(72))
  console.log(`Ringkasan: GENTING ${res.counts.GENTING} | PENTING ${res.counts.PENTING} | RAPIKAN ${res.counts.RAPIKAN}`)
  process.exit(res.counts.GENTING + res.counts.PENTING > 0 ? 1 : 0)
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main()
