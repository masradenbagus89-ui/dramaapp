#!/usr/bin/env node
// engine/rak-pemicu.mjs - SATU sumber kebenaran pemetaan "topik -> rak rules/" (fungsi MURNI, ~0 token).
//
// MASALAH YANG DIPECAHKAN (terukur, uji buta 2026-07-19): isi detail standar kit tinggal di rak
// `rules/` (~225 KB) dan dibaca SUKARELA. Pengukuran 6 prompt client nyata: hanya 8 dari 56 rak
// relevan yang dibuka (~14%); pada tugas RINGAN = 0%. Bukan karena AI menolak - ia lupa membuka lalu
// langsung meluncur ke kode. Modul ini menyediakan bahan untuk DUA pemakai:
//   1. engine/lang-reminder.mjs  -> "Petunjuk Rak": menyodorkan PATH rak yang relevan (lunak, tak memblokir).
//   2. engine/rak-gate.mjs       -> "Palang Rak": menentukan rak wajib untuk berkas berdampak-tinggi.
//
// BUKAN ROUTER YANG MEMUTUSKAN (batas yang TIDAK boleh diseberangi):
// keluarannya = PETUNJUK/kandidat, bukan perintah. Sifatnya ADITIF - tak pernah MENGURANGI/mematikan
// lensa apa pun; nol-cocok -> daftar kosong -> pemakai berperilaku persis seperti sebelum modul ini ada.
// Yang MEMUTUSKAN relevan-tidaknya tetap penalaran otak Claude/Kimi (CLAUDE_universal_v1.md sec.4.13,
// sec.4.17). Pemetaan di bawah bukan hal baru: ia turunan dari jalan-pintas yang SUDAH tertulis di
// CLAUDE_universal_v1.md sec.4.13 (15 capability pack) - yang berubah cuma SIAPA yang mengingatnya
// (mesin, bukan ingatan AI di bawah beban).
//
// PAGAR ANTI-DRIFT (dikunci tests/rak-pemicu.test.mjs): tabel < 4.000 char - maks 2 rak per grup -
// maks 3 grup per keluaran - tiap path WAJIB ada di disk (dicek pemanggil lewat `adaBerkas`) DAN
// terdaftar di rules/INDEX.md + engine/kit-files.json. Tabel yang boleh tumbuh bebas = router
// terselubung; plafon ini yang mencegahnya.

// --- Tabel pemicu: topik -> maks 2 rak. Urutan array = urutan prioritas keluaran (deterministik). ---
export const RAK_PEMICU = [
  { id: 'login/akun', re: /\b(login|masuk|daftar|signup|sign.?in|sign.?up|akun|auth|oauth|sso|sesi|session|peran|role|hak.?akses|rbac|password|otentikasi)\b/i,
    rak: ['skills/auth/SKILL.md', 'skills/owasp/SKILL.md'] },
  { id: 'pembayaran', re: /\b(bayar|pembayaran|payment|checkout|invoice|faktur|tagihan|langganan|subscription|midtrans|xendit|stripe)\b/i,
    rak: ['skills/pembayaran/SKILL.md', 'skills/owasp/SKILL.md'] },
  { id: 'unggah-berkas', re: /\b(unggah|upload|foto|gambar|avatar|lampiran|attachment|berkas.?masuk|file.?upload)\b/i,
    rak: ['skills/upload-storage/SKILL.md'] },
  { id: 'skema-database', re: /\b(migrasi|migration|skema|schema|tabel.?baru|kolom.?baru|prisma|supabase|rls|index.?database|database|basis.?data)\b/i,
    rak: ['skills/supabase-prisma/SKILL.md'] },
  { id: 'ekspor/laporan', re: /\b(ekspor|export|unduh|download|csv|excel|laporan|report|rekap)\b/i,
    rak: ['skills/ekspor-laporan/SKILL.md'] },
  { id: 'email/notifikasi', re: /\b(email|surel|otp|kode.?verifikasi|notifikasi|notification|kirim.?pesan)\b/i,
    rak: ['skills/email-notifikasi/SKILL.md'] },
  { id: 'latar/antrean', re: /\b(antrean|antrian|queue|cron|terjadwal|schedule|background|job|worker|batch)\b/i,
    rak: ['skills/background-job/SKILL.md'] },
  { id: 'analitik', re: /\b(analytics|analitik|lacak|tracking|kunjungan|statistik.?pengunjung)\b/i,
    rak: ['skills/analytics/SKILL.md'] },
  { id: 'teregulasi', re: /\b(judi|gambling|fintech|kyc|aml|lisensi|regulator|kepatuhan)\b/i,
    rak: ['skills/kepatuhan-teregulasi/SKILL.md'] },
  { id: 'error/build', re: /\b(error|gagal.?build|build.?gagal|merah|crash|tidak.?jalan|nggak.?jalan|rusak)\b/i,
    rak: ['skills/perbaiki-error/SKILL.md'] },
  { id: 'tes/cakupan', re: /\b(tes|test|testing|coverage|cakupan.?tes|unit.?test)\b/i,
    rak: ['skills/cakupan-tes/SKILL.md'] },
  // 2026-07-19 (ADR-023): rak kedua `div/4.13-devops.md` DIHAPUS - isinya duplikat murni §11 + §4
  // (cek build/lint/tes, rollback, lockfile, smoke test, observability) yang sudah always-load.
  { id: 'rilis/produksi', re: /\b(rilis|release|deploy|produksi|production|mau.?online|go.?live)\b/i,
    rak: ['skills/deploy/SKILL.md'] },
  // DITAMBAHKAN 2026-07-19 sesudah uji: prompt "rapikan kode" TAK cocok grup mana pun -> nihil total,
  // padahal kit punya doktrin refactor yang MAHAL kalau terlewat (refactor bertahap: default in-place,
  // DILARANG loncat ke pecah-repo). Ini bukan upacara - "rapikan" yang salah tingkat = perombakan besar
  // yang tak diminta. Sengaja TIDAK menambah grup untuk ubah-teks/tombol: itu memang tugas sepele yang
  // §4.17 bebaskan dari upacara, dan memaksanya membuka rak = mengarang keharusan.
  // WAJIB berpasangan (kata-benahi + kata-KODE), bukan salah satu saja. Uji menemukan "rapikan
  // tampilan halaman dashboard" ikut tertangkap kalau "rapikan" berdiri sendiri - itu urusan DESAIN,
  // bukan refactor, dan menyodorkan doktrin refactor di situ = petunjuk yang menyesatkan.
  // `\w*` di ekor kata-KODE menampung akhiran Bahasa Indonesia ("berkasnya", "kodenya", "modulnya").
  { id: 'rapikan/refactor', re: /\brefactor\b|(rapikan|rapihkan|merapikan|bersihkan|tata.?ulang|pecah|berantakan|kepanjangan|terlalu.?panjang)[\s\S]{0,60}\b(kode|struktur|modul|berkas|file|src|komponen)\w*|\b(kode|struktur|modul|berkas|src)\w*[\s\S]{0,60}(rapikan|rapihkan|merapikan|bersihkan|berantakan|kepanjangan)/i,
    rak: ['rules/4.2-pattern-driven.md'] },
  // DITAMBAHKAN 2026-07-19 (ADR-023): tiga rak ini dulu NOL pemicu mesin - satu-satunya jalan masuknya
  // adalah mandat §4.13 "8 divisi otomatis" yang kini dicabut. Tanpa pemicu, mereka jadi YATIM: praktis
  // tak pernah terjangkau kecuali staff mengetik "skill webdesign" - padahal §4.13 sendiri menyatakan
  // otomatis-tanpa-mengetik itu "KUNCI non-programmer". Ini yang menutup celah tersebut.
  //
  // ⚠️ SENGAJA TIDAK memakai kata telanjang 'tampilan'/'tombol'/'google':
  // - 'ganti tulisan tombol' = tugas sepele yang §4.17 BEBASKAN dari upacara (lihat catatan di atas);
  // - 'google' telanjang akan menyalakan SEO pada "tambah login google" - petunjuk yang menyesatkan.
  // Yang dituntut = kata ber-NIAT desain / aksesibilitas / temu-di-mesin-pencari.
  { id: 'tampilan/desain', re: /\b(desain|design|tata.?letak|layout|antarmuka|landing|halaman.?depan|hero|mockup|branding|tipografi|font|palet|tema.?(warna|gelap|terang))\b|\btampilan\b[\s\S]{0,40}\b(bikin|buat|ubah|baru|rapikan|perbaiki)\b|\b(bikin|buat|ubah|rapikan|perbaiki)\b[\s\S]{0,40}\btampilan\b/i,
    rak: ['skills/webdesign/SKILL.md'] },
  { id: 'aksesibilitas', re: /\b(aksesibilitas|a11y|wcag|disabilitas|difabel|tunanetra|buta.?warna|pembaca.?layar|screen.?reader|kontras|ramah.?difabel)\b|susah.?di(pencet|klik|tekan)/i,
    rak: ['skills/uiux/SKILL.md'] },
  { id: 'seo/temu-google', re: /\bseo\b|\b(sitemap|robots\.txt|meta.?(tag|deskripsi|description)|kata.?kunci|backlink|core.?web.?vitals)\b|\b(muncul|ditemukan|terindeks|peringkat|ranking|naik)\b[\s\S]{0,30}\b(google|mesin.?pencari|pencarian)\b/i,
    rak: ['skills/seo/SKILL.md'] },
]

// Penangkap-umum: prompt jelas soal web/aplikasi tapi tak cocok grup spesifik mana pun.
export const RAK_UMUM_RE = /\b(web|website|situs|halaman|aplikasi|app|fitur|tombol|form|formulir|api|database|tampilan|dashboard|menu)\b/i

export const MAKS_GRUP = 3          // plafon keluaran (biaya token terkunci)
export const MAKS_RAK_PER_GRUP = 2  // plafon lebar tabel

// --- Deteksi dari TEKS prompt (untuk Petunjuk Rak). MURNI: tak menyentuh disk. -------------------
// Kembalikan { grup: [{id, rak}], umum: boolean }. Nol-cocok -> { grup: [], umum: false }.
export function deteksiRak(teks) {
  const t = String(teks || '').slice(0, 4000) // potong: prompt panjang tetap tertangkap di awal
  if (!t.trim()) return { grup: [], umum: false }
  const grup = []
  for (const p of RAK_PEMICU) {
    if (grup.length >= MAKS_GRUP) break
    if (p.re.test(t)) grup.push({ id: p.id, rak: p.rak.slice(0, MAKS_RAK_PER_GRUP) })
  }
  if (grup.length > 0) return { grup, umum: false }
  return { grup: [], umum: RAK_UMUM_RE.test(t) }
}

// --- Deteksi dari REGISTRY skill (Microkernel+Plugin, ADR-027). MURNI: entri disuntik, tak sentuh disk.
// SHIM: dipakai bangunPetunjukRak DI ATAS deteksiRak. Registry kosong/nol-cocok -> pemakai jatuh ke
// deteksiRak (tabel lama) = perilaku PERSIS seperti sebelum migrasi skill (nol jendela-regresi).
export function deteksiRakRegistry(teks, entri = []) {
  const t = String(teks || '').slice(0, 4000)
  if (!t.trim() || !Array.isArray(entri) || !entri.length) return { grup: [], umum: false }
  const cocokSemua = []
  for (const e of entri) {
    const pemicu = Array.isArray(e && e.pemicu) ? e.pemicu : []
    if (!pemicu.length || !e.path) continue
    if (pemicu.some((kw) => cocokPemicu(kw, t))) {
      cocokSemua.push({
        id: e.nama || e.divisi,                                  // NAMA (unik per-skill) - cegah label dobel saat >1 skill se-divisi
        rak: [e.path],
        rawan: e.rawan_keamanan === true,
        menggantikan: Array.isArray(e.menggantikan) ? e.menggantikan : [], // id grup tabel-lama yg diambil-alih skill (SHIM)
      })
    }
  }
  // rawan_keamanan DIUTAMAKAN: skill keamanan tak boleh terpotong plafon MAKS_GRUP saat banyak skill cocok.
  // sort STABIL (V8) -> di antara sama-rawan, urutan registry (alfabet folder) dipertahankan = deterministik.
  cocokSemua.sort((a, b) => (b.rawan === true) - (a.rawan === true))
  const grup = cocokSemua.slice(0, MAKS_GRUP)
  if (grup.length > 0) return { grup, umum: false }
  return { grup: [], umum: RAK_UMUM_RE.test(t) }
}

// Pencocok SATU pemicu -> teks. Setara semantik regex tabel lama `\b(...)\b` (dikunci uji-parity):
//  - batas-kata DUA sisi: cegah false-positive prefix ('author'->auth, 'akuntansi'->akun, 'perangkat'->peran);
//  - pemisah dalam-kata fleksibel: tangkap 'hak akses'/'hak-akses', 'sign-in'/'sign up' dari SATU pemicu.
// Escape meta DULU, baru ubah pemisah (-/spasi) jadi `[\s-]?`. try/catch: pemicu korup -> false (bukan crash).
export function cocokPemicu(kw, teks) {
  const k = String(kw || '').trim()
  if (!k) return false
  const esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[\s-]+/g, '[\\s-]?')
  try { return new RegExp(`\\b${esc}\\b`, 'i').test(String(teks || '')) } catch { return false }
}

// --- Deteksi dari PATH berkas (untuk Palang Rak). MURNI. ----------------------------------------
// Cermin gaya HIGH_IMPACT di engine/fact-gate.mjs, tapi memetakan ke rak - bukan sekadar ya/tidak.
//
// KRITERIA MASUK PETA (sengaja SEMPIT, beda dari Buku Alamat §4.13 yang luas): HANYA bidang yang
// kerusakannya SENYAP - kalau salah, ada yang bocor/rusak/hilang/salah-bayar DAN pemakainya tak bisa
// tahu sendiri (kriteria label 🔒 §4.13). Palang ini MENAHAN edit, jadi ia harus konservatif; menahan
// tiap edit tampilan = upacara yang §4.17 larang. Karena itu:
//  - MASUK  : login/auth · pembayaran · struktur DB/migrasi · unggah · API/backend · DevOps/infra.
//  - TIDAK  : Frontend & SEO - kerusakannya KELIHATAN di layar (tombol rusak langsung terlihat), bukan
//             senyap. Keduanya TETAP terjangkau lewat Petunjuk Rak LUNAK (grup tampilan/desain,
//             aksesibilitas, seo/temu-google di atas) + Buku Alamat §4.13 - cuma tak sampai MENAHAN.
//             Dikunci tes: page.tsx / Tombol.tsx WAJIB -> [] (tests/rak-pemicu.test.mjs + rak-gate.test.mjs).
// DevOps DITAMBAHKAN 2026-07-20 (Tugas 17/F2): Dockerfile/CI/nginx/systemd/vercel yang salah = rahasia
// bocor atau deploy rusak DIAM-DIAM - itu kerusakan senyap, jadi ia LOLOS kriteria, beda dari frontend.
const PETA_BERKAS = [
  { re: /(auth|login|session|oauth|jwt|permission|guard|rbac)/i, rak: ['skills/auth/SKILL.md', 'skills/owasp/SKILL.md'] },
  { re: /(billing|payment|invoice|checkout|webhook)/i, rak: ['skills/pembayaran/SKILL.md'] },
  { re: /(migration|migrations|[/\\]migrations?[/\\]|schema\.prisma|[/\\]prisma[/\\]|policy|rls|\.sql$)/i, rak: ['skills/supabase-prisma/SKILL.md'] },
  { re: /(upload|storage|avatar|[/\\]media[/\\])/i, rak: ['skills/upload-storage/SKILL.md'] },
  { re: /([/\\]api[/\\]|route\.(t|j)sx?$|middleware|proxy|[/\\](handlers?|controllers?)[/\\])/i, rak: ['skills/backend/SKILL.md', 'skills/owasp/SKILL.md'] },
  { re: /(Dockerfile|docker-compose|(^|[/\\])\.github[/\\]workflows[/\\]|(^|[/\\])nginx(\.conf)?\b|\.service$|(^|[/\\])vercel\.json$)/i, rak: ['skills/devops/SKILL.md'] },
]

export function rakUntukBerkas(filePath) {
  const p = String(filePath || '')
  if (!p) return []
  for (const m of PETA_BERKAS) if (m.re.test(p)) return m.rak.slice(0, MAKS_RAK_PER_GRUP)
  return []
}

// --- Perakit teks Petunjuk Rak (dipakai lang-reminder Claude DAN adaptor Kimi). ------------------
// `adaBerkas` = predikat keberadaan berkas (di-INJEKSI supaya fungsi ini tetap murni + gampang diuji).
// WAJIB: path yang tak ada di disk DIBUANG diam-diam (klien kit lama tak punya semua rak) - jangan
// pernah menyodorkan path hantu; AI yang gagal Read akan membakar ribuan token mencari yang tak ada.
export function bangunPetunjukRak(teks, adaBerkas, entriRegistry = []) {
  const ada = typeof adaBerkas === 'function' ? adaBerkas : () => true
  // SHIM transisi (ADR-027): GABUNG grup registry + grup tabel-lama untuk topik yang BELUM jadi skill.
  // BUKAN either/or - either/or menjatuhkan rak topik lain saat prompt MULTI-TOPIK (regresi terbukti
  // Tugas 11: "login + pembayaran + upload" hanya menyisakan auth). Grup tabel-lama yang sudah
  // diambil-alih skill (frontmatter `menggantikan`) dibuang supaya tak dobel. Registry DULU (prioritas
  // + rawan sudah diurutkan di deteksiRakRegistry), lalu ditutup plafon MAKS_GRUP.
  const reg = deteksiRakRegistry(teks, entriRegistry)
  const lama = deteksiRak(teks)
  const digantikan = new Set(reg.grup.flatMap((g) => g.menggantikan || []))
  const grup = [...reg.grup, ...lama.grup.filter((g) => !digantikan.has(g.id))].slice(0, MAKS_GRUP)
  const umum = grup.length ? false : (reg.umum || lama.umum)
  const baris = []
  for (const g of grup) {
    const nyata = g.rak.filter(ada)
    // 🔒 = penanda rawan_keamanan (skill keamanan) -> buka DULU. Membuat flag rawan berbuat sesuatu yang
    // JUJUR (sinyal lunak), bukan cosmetic. Penegakan KERAS (rak-gate baca registry) = Tugas 12 (ADR-027).
    if (nyata.length) baris.push(`- ${g.rawan ? '🔒 ' : ''}${g.id} -> ${nyata.join(', ')}`)
  }
  if (baris.length) {
    return [
      '[Pengingat lintasAI - rak relevan]',
      'Kandidat rak (PETUNJUK, bukan perintah - kamu yang putuskan relevan/tidak):',
      ...baris,
      'Titik risiko -> buka rak SEBELUM edit pertama; tak cocok -> lewati + sebut alasan (§4.17).',
    ].join('\n')
  }
  if (umum && ada('rules/INDEX.md')) {
    return [
      '[Pengingat lintasAI - rak relevan]',
      'Belum ada rak spesifik yang cocok. Pemicu lengkap: rules/INDEX.md (kolom "Kapan dibaca").',
    ].join('\n')
  }
  return '' // nol-cocok -> keluaran KOSONG -> pemakai berperilaku persis seperti sebelum modul ini ada
}
