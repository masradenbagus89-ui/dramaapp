#!/usr/bin/env node
// engine/rak-pemicu.mjs - SATU acuan pemetaan "topik -> rak skills/" (fungsi MURNI, ~0 token).
//
// MASALAH YANG DIPECAHKAN (terukur, uji buta 2026-07-19): isi detail standar kit tinggal di rak
// on-demand dan dibaca SUKARELA. Pengukuran 6 prompt client nyata: hanya 8 dari 56 rak
// relevan yang dibuka (~14%); pada tugas RINGAN = 0%. Bukan karena AI menolak - ia lupa membuka lalu
// langsung meluncur ke kode. Modul ini menyediakan bahan untuk DUA pemakai:
//   1. engine/lang-reminder.mjs  -> "Petunjuk Rak": menyodorkan PATH rak yang relevan (lunak, tak memblokir).
//   2. engine/rak-gate.mjs       -> "Palang Rak": menentukan rak wajib untuk berkas berdampak-tinggi.
//
// SEJAK ADR-034: rak = `skills/<nama>/SKILL.md` SAJA (folder rak lama dicabut seluruhnya).
//
// BUKAN ROUTER YANG MEMUTUSKAN (batas yang TIDAK boleh diseberangi):
// keluarannya = PETUNJUK/kandidat, bukan perintah. Sifatnya ADITIF - tak pernah MENGURANGI/mematikan
// lensa apa pun; nol-cocok -> daftar kosong -> pemakai berperilaku persis seperti sebelum modul ini ada.
// Yang MEMUTUSKAN relevan-tidaknya tetap penalaran otak Claude/Kimi (AGENTS.md §4 loop kerja).
//
// PAGAR ANTI-DRIFT (dikunci tests/rak-pemicu.test.mjs): tabel < 4.000 char - maks 2 rak per grup -
// maks 3 grup per keluaran - tiap path WAJIB ada di disk (dicek pemanggil lewat `adaBerkas`) DAN
// terdaftar di engine/kit-files.json. Tabel yang boleh tumbuh bebas = router
// terselubung; plafon ini yang mencegahnya.

// --- Tabel pemicu: topik -> maks 2 rak. Urutan array = urutan prioritas keluaran (deterministik). ---
export const RAK_PEMICU = [
  // `daftar` telanjang DICABUT 2026-07-27: FP terukur ("ganti warna tombol daftar", "daftar pesanan").
  // Cakupan pendaftaran akun dijaga frasa frontmatter auth (daftar-akun/form-pendaftaran/...).
  { id: 'login/akun', re: /\b(login|masuk|signup|sign.?in|sign.?up|akun|auth|oauth|sso|sesi|session|peran|role|hak.?akses|rbac|password|otentikasi)\b/i,
    rak: ['skills/auth/SKILL.md', 'skills/owasp/SKILL.md'] },
  { id: 'pembayaran', re: /\b(bayar|pembayaran|payment|checkout|invoice|faktur|tagihan|langganan|subscription|midtrans|xendit|stripe)\b/i,
    rak: ['skills/pembayaran/SKILL.md', 'skills/owasp/SKILL.md'] },
  // `foto`/`gambar` telanjang DICABUT 2026-07-27: FP terukur ("gambar produknya lama munculnya" =
  // keluhan performa, bukan upload). `foto.?profil` frontmatter owasp menjaga kasus unggah yang sah.
  { id: 'unggah-berkas', re: /\b(unggah|upload|avatar|lampiran|attachment|berkas.?masuk|file.?upload)\b/i,
    rak: ['skills/owasp/SKILL.md'] },
  { id: 'skema-database', re: /\b(migrasi|migration|skema|schema|tabel.?baru|kolom.?baru|prisma|supabase|rls|index.?database|database|basis.?data)\b/i,
    rak: ['skills/supabase-prisma/SKILL.md'] },
  { id: 'rilis/produksi', re: /\b(rilis|release|deploy|produksi|production|mau.?online|go.?live)\b/i,
    rak: ['skills/deploy/SKILL.md'] },
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
  // Grup 'rapikan/refactor' DICABUT (ADR-034): satu-satunya raknya (doktrin refactor bertahap) ikut
  // lenyap bersama folder rak lama. Tanpa tujuan yang nyata, pemicu = petunjuk ke path mati.
  // Tiga rak ini butuh pemicu mesin sendiri: tanpa pemicu, mereka jadi YATIM - praktis tak pernah
  // terjangkau kecuali staff mengetik "skill webdesign", padahal §4.2 menyatakan otomatis-tanpa-mengetik
  // itu "KUNCI non-programmer". Pemicu di bawah menutup celah tersebut.
  //
  // ⚠️ SENGAJA TIDAK memakai kata telanjang 'tampilan'/'tombol'/'google':
  // - 'ganti tulisan tombol' = tugas sepele yang §4.3 BEBASKAN dari upacara (lihat catatan di atas);
  // - 'google' telanjang akan menyalakan SEO pada "tambah login google" - petunjuk yang menyesatkan.
  // Yang dituntut = kata ber-NIAT desain / aksesibilitas / temu-di-mesin-pencari.
  { id: 'tampilan/desain', re: /\b(desain|design|tata.?letak|layout|antarmuka|landing|halaman.?depan|hero|mockup|branding|tipografi|font|palet|tema.?(warna|gelap|terang))\b|\btampilan\b[\s\S]{0,40}\b(bikin|buat|ubah|baru|rapikan|perbaiki)\b|\b(bikin|buat|ubah|rapikan|perbaiki)\b[\s\S]{0,40}\btampilan\b/i,
    rak: ['skills/design-direction/SKILL.md'] },
  { id: 'aksesibilitas', re: /\b(aksesibilitas|a11y|wcag|disabilitas|difabel|tunanetra|buta.?warna|pembaca.?layar|screen.?reader|kontras|ramah.?difabel)\b|susah.?di(pencet|klik|tekan)/i,
    rak: ['skills/a11y/SKILL.md'] },
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
// KONTRAK PEMISAH (2026-07-27, penulis pemicu MEMILIH lewat karakter pemisah - nol sintaks baru):
//  - TANDA-HUBUNG = KETAT (persis perilaku lama `[\s-]?`): utk istilah majemuk satu-konsep
//    ('sign-in', 'top-up', 'react-query', 'buku-besar') - melonggarkannya = memecah satu kata jadi
//    dua kata bebas (terukur 20+ FP di korpus adversarial, mayoritas rak 🔒).
//  - SPASI = LONGGAR (boleh disisipi maks 2 kata): utk frasa kalimat awam ('data bocor' menangkap
//    "data pelanggan saya bocor"). {0,2} + [\s-]? = saat nol sisipan bentuknya PERSIS pola lama,
//    jadi fungsi ini SUPERSET murni - cocok lama tak mungkin hilang, risiko hanya satu arah (FP)
//    dan dipagari probe ANTI-FP tests/rak-routing-natural.test.mjs (b5).
// KONTRAK MORFOLOGI (2026-08-09): sufiks JAMAK INGGRIS `(?:e?s)?` diterima di ujung, DIGERBANGI panjang.
//  - MASALAH: 'test' gagal pada "write unit tests", 'cache' pada "clear the caches" - client yang
//    mencampur Inggris-Indonesia diperlakukan kelas dua (9 prompt umum -> NOL rak, terukur).
//  - GERBANG >=4 huruf alfanumerik pada SEGMEN TERAKHIR (pecah spasi -> pecah tanda-hubung): pemicu
//    pendek adalah tempat FP lahir ('job' -> "jobs board", 'sso' -> "ssos", 'api' -> "apis"). Empat
//    huruf = ambang di mana kata jadi cukup khas untuk menanggung sufiks.
//  - `nya` SENGAJA DITOLAK (jangan diusulkan ulang): terukur atas registry NYATA, alternatif
//    `(?:e?s|nya)?` menyalakan 14 dari 15 kalimat Indonesia netral - 8 di antaranya rak 🔒
//    ('bayarnya'->pembayaran, 'saldonya'->wallet-ledger, 'masuknya'/'sesinya'/'perannya'->auth).
//    Sufiks `-nya` adalah kepemilikan sehari-hari, bukan penanda topik. Dipagari blok (b7).
// Escape meta per-token DULU, baru rakit pemisah. try/catch: pemicu korup -> false (bukan crash).
const CELAH_SISIPAN = '(?:[\\s-]+\\S+){0,2}[\\s-]?' // maks 2 kata sisipan antar-token spasi
const MIN_HURUF_JAMAK = 4 // ambang gerbang sufiks; di bawah ini pemicu terlalu pendek = ladang FP
export function cocokPemicu(kw, teks) {
  const k = String(kw || '').trim()
  if (!k) return false
  const esc = k.split(/\s+/)
    .map((tok) => tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/-+/g, '[\\s-]?'))
    .join(CELAH_SISIPAN)
  const segAkhir = k.split(/\s+/).pop().split('-').pop()
  const ekor = new RegExp(`^[a-z0-9]{${MIN_HURUF_JAMAK},}$`, 'i').test(segAkhir) ? '(?:e?s)?' : ''
  try { return new RegExp(`\\b${esc}${ekor}\\b`, 'i').test(String(teks || '')) } catch { return false }
}

// --- Deteksi dari PATH berkas (untuk Palang Rak). MURNI. ----------------------------------------
// Bergaya pola "berkas berdampak-tinggi", tapi memetakan ke rak - bukan sekadar ya/tidak.
//
// KRITERIA MASUK PETA (sengaja SEMPIT, beda dari Buku Alamat §4.2 yang luas): HANYA bidang yang
// kerusakannya SENYAP - kalau salah, ada yang bocor/rusak/hilang/salah-bayar DAN pemakainya tak bisa
// tahu sendiri (kriteria label 🔒 §4.2). Palang ini MENAHAN edit, jadi ia harus konservatif; menahan
// tiap edit tampilan = upacara yang §4.3 larang. Karena itu:
//  - MASUK  : login/auth · pembayaran · struktur DB/migrasi · unggah · API/backend · DevOps/infra.
//  - TIDAK  : Frontend & SEO - kerusakannya KELIHATAN di layar (tombol rusak langsung terlihat), bukan
//             senyap. Keduanya TETAP terjangkau lewat Petunjuk Rak LUNAK (grup tampilan/desain,
//             aksesibilitas, seo/temu-google di atas) + Buku Alamat §4.2 - cuma tak sampai MENAHAN.
//             Dikunci tes: page.tsx / Tombol.tsx WAJIB -> [] (tests/rak-pemicu.test.mjs + rak-gate.test.mjs).
// DevOps DITAMBAHKAN 2026-07-20 (Tugas 17/F2): Dockerfile/CI/nginx/systemd/vercel yang salah = rahasia
// bocor atau deploy rusak DIAM-DIAM - itu kerusakan senyap, jadi ia LOLOS kriteria, beda dari frontend.
const PETA_BERKAS = [
  // Config AI (2026-07-27) - WAJIB DI INDEX 0. `rakUntukBerkas` = HIT PERTAMA MENANG, dan entri di
  // bawah sudah terbukti salah-klaim berkas config yang namanya kebetulan mirip topik lain:
  // `.claude/agents/auth-reviewer.md` -> auth+owasp, `.claude/hooks/payment-check.sh` -> pembayaran.
  // Ditaruh di bawah = rak SALAH yang menang. Lolos kriteria "kerusakan SENYAP" di atas: izin AI yang
  // kelewat lebar / server MCP tak tepercaya / hook unduh-lalu-jalankan tak terlihat di layar sama
  // sekali - beda dari tombol rusak. Sengaja SEMPIT (di-anchor ke .claude/ / .cursor/ / .mcp.json)
  // supaya `src/settings.json` & `.vscode/settings.json` TIDAK ikut tertahan (dikunci tes ANTI-FP).
  { re: /(^|[/\\])\.mcp\.json$|(^|[/\\])\.(claude|cursor)[/\\](settings[\w.-]*\.json$|mcp\.json$|hooks[/\\]|agents[/\\])/i,
    rak: ['skills/permukaan-ai/SKILL.md'] },
  { re: /(auth|login|session|oauth|jwt|permission|guard|rbac)/i, rak: ['skills/auth/SKILL.md', 'skills/owasp/SKILL.md'] },
  { re: /(billing|payment|invoice|checkout|webhook)/i, rak: ['skills/pembayaran/SKILL.md'] },
  // Django/Python (2026-07-27) - WAJIB DI ATAS baris `migrations` di bawah. Sebelum ini PETA_BERKAS nol
  // pola `.py`: `models.py`/`views.py`/`tasks.py` -> NOL rak (rak python tak pernah bisa dituntut dari
  // path), dan `app/migrations/0002_x.py` justru direbut baris `migrations` = rak yang bicara Prisma/
  // Supabase untuk migrasi DJANGO. Semua pola di-anchor `\.py$` supaya `migration.sql` TETAP ke
  // supabase-prisma (dikunci tes F2). SENGAJA SEMPIT - hanya nama berkas yang kerusakannya SENYAP:
  // `urls.py`/`forms.py`/`admin.py`/`manage.py` DIBUANG (kerusakannya kelihatan = upacara, sec.4.3), dan
  // `permissions.py` sengaja DIBIARKAN ke baris auth di atas (izin = auth+owasp, rak yang lebih tepat).
  { re: /(^|[/\\])(views|serializers|settings)\.py$|(^|[/\\])settings[/\\]\w+\.py$/i,
    rak: ['skills/python/SKILL.md', 'skills/owasp/SKILL.md'] },
  { re: /(^|[/\\])models\.py$|(^|[/\\])migrations[/\\][^/\\]+\.py$/i,
    rak: ['skills/python/SKILL.md', 'skills/database/SKILL.md'] },
  { re: /(^|[/\\])(tasks|celery)\.py$/i, rak: ['skills/python/SKILL.md', 'skills/background-job/SKILL.md'] },
  // FIX FP `rls` (2026-07-27, ketangkap tes ANTI-FP Django): `rls` tanpa anchor cocok di dalam kata -
  // `urls.py`/`urls.ts`/`curls.ts`/`hurls/` semua salah tertahan dgn rak Prisma/Supabase. Cacat ini
  // PRA-EKSISTING (bukan dari entri Django di atas). Anchor ke pembatas nama; RLS asli tetap tertangkap
  // (`supabase/rls/`, `db/rls.ts`, `rls-policies.ts`, `rls_tenant.sql`) - diuji 15 kasus, nol yang hilang.
  { re: /(migration|migrations|[/\\]migrations?[/\\]|schema\.prisma|[/\\]prisma[/\\]|policy|(^|[/\\_.-])rls([/\\_.-]|$)|\.sql$)/i, rak: ['skills/supabase-prisma/SKILL.md'] },
  { re: /(upload|storage|avatar|[/\\]media[/\\])/i, rak: ['skills/owasp/SKILL.md'] },
  { re: /([/\\]api[/\\]|route\.(t|j)sx?$|middleware|proxy|[/\\](handlers?|controllers?)[/\\])/i, rak: ['skills/backend/SKILL.md', 'skills/owasp/SKILL.md'] },
  { re: /(Dockerfile|docker-compose|(^|[/\\])\.github[/\\]workflows[/\\]|(^|[/\\])nginx(\.conf)?\b|\.service$|(^|[/\\])vercel\.json$)/i, rak: ['skills/devops/SKILL.md'] },
  // Next.js Server Action (2026-07-25): endpoint tersembunyi (mutasi data, bisa IDOR / bocor secret ke
  // browser). Di-SCOPE ke pohon app/ (anchor ^ATAU sep supaya `app/` di AKAR ikut) supaya TIDAK salah-
  // tangkap Redux `store/actions.ts` (client state, bukan server action). Konvensi `"use server"` tak
  // terlihat hook PreToolUse (cuma path), jadi nama berkas = sinyal terbaik yang ada. Dikunci tes anti-FP.
  { re: /(^|[/\\])app[/\\].*actions\.(t|j)sx?$/i, rak: ['skills/next-core/SKILL.md', 'skills/backend/SKILL.md'] },
  // Supabase Edge Function (2026-07-25): endpoint serverless Deno, kerap pakai service_role (bypass RLS)
  // -> rawan bocor kolom / tanpa otorisasi. Path sangat spesifik -> FP nyaris nol.
  { re: /supabase[/\\]functions[/\\]/i, rak: ['skills/backend/SKILL.md', 'skills/owasp/SKILL.md'] },
  // Buku besar saldo internal (2026-07-27): saldo salah-hitung/entri-dobel tak kelihatan di layar =
  // kerusakan SENYAP par-excellence. SENGAJA PALING BAWAH (hit-pertama-menang): app/api/wallet/route.ts
  // tetap milik baris /api/ (backend+owasp) - entri ini murni ADITIF utk berkas server di luarnya.
  // Anchor \.(t|j)s$ (BUKAN .tsx): komponen React (SaldoCard.tsx dsb) bukan urusan palang (frontend
  // dikecualikan, lihat kriteria di atas). Alternatif direktori wallet|ledger utk modul terstruktur.
  { re: /(^|[/\\])(wallet|ledger|saldo)[\w.-]*\.(t|j)s$|(^|[/\\])(wallet|ledger)[/\\]/i,
    rak: ['skills/wallet-ledger/SKILL.md'] },
]

// Himpunan NAMA rak yang bisa MENAHAN edit lewat PETA_BERKAS. DITURUNKAN dari tabel di atas, bukan
// daftar tangan: daftar tangan pasti melenceng begitu PETA_BERKAS berubah, dan yang memakainya
// (tools/skill-format-check.mjs) akan diam-diam menuntut skill yang salah.
// KENAPA PENTING: rak yang boleh menahan edit WAJIB berisi pola siap-tiru — kalau AI ditahan lalu yang
// ia temukan cuma paragraf nasihat, penahanannya sia-sia.
export function rakYangDijagaPalang() {
  const nama = new Set()
  for (const m of PETA_BERKAS) {
    for (const p of m.rak) {
      const cocok = /^skills\/([\w-]+)\/SKILL\.md$/.exec(String(p))
      if (cocok) nama.add(cocok[1])
    }
  }
  return nama
}

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
      'Titik risiko -> buka rak SEBELUM edit pertama; tak cocok -> lewati + sebut alasan (§4.3).',
    ].join('\n')
  }
  if (umum && ada('skills/registry.json')) {
    return [
      '[Pengingat lintasAI - rak relevan]',
      'Belum ada rak spesifik yang cocok. Pemicu lengkap: skills/registry.json (kolom pemicu tiap skill).',
    ].join('\n')
  }
  return '' // nol-cocok -> keluaran KOSONG -> pemakai berperilaku persis seperti sebelum modul ini ada
}
