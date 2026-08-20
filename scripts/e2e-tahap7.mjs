// Penjaga end-to-end Tahap 7 (kode pemulihan password penonton).
//
//     npm run e2e:tahap7                       -> uji ke produksi
//     E2E_BASE=http://localhost:3000 npm run e2e:tahap7  -> uji ke server lokal
//
// KENAPA di scripts/ dan BUKAN di tests/: skrip ini menembak server sungguhan
// lewat jaringan dan MENULIS satu akun uji ke Supabase produksi. `npm test`
// harus tetap cepat, offline, dan bebas efek samping - jadi vitest sengaja
// hanya memuat tests/**, dan penjaga ini dijalankan manual sesudah deploy.
//
// Akun uji memakai domain .invalid (TLD yang dijamin standar internet tidak
// pernah jadi milik siapa pun) + timestamp, jadi mustahil menabrak email
// penonton sungguhan. Pembersihan berjalan di blok finally: walau uji gagal
// di tengah jalan, akun uji tetap dihapus.
//
// Kode pemulihan TIDAK pernah dicetak utuh ke layar/log - hanya 4 karakter
// pertama. Kode asli hanya boleh terlihat sekali oleh pemiliknya.
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// --- muat .env.local (pola sama dengan scripts/seed-supabase.mjs) -----------
const envPath = join(root, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const BASE = (process.env.E2E_BASE ?? "https://dramaapp.vercel.app").replace(/\/+$/, "");
const SB_URL = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY ?? "";

// Gagal-aman: tanpa kunci Supabase, akun uji TIDAK bisa dibersihkan setelahnya.
// Berhenti SEBELUM akun dibuat, bukan sesudah - sampah di database produksi
// jauh lebih mahal daripada uji yang tidak jadi jalan.
if (!SB_URL || !SB_KEY) {
  console.error(
    "ERROR: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY wajib ada (di .env.local atau env).\n" +
      "Tanpa itu akun uji tak bisa dihapus lagi, jadi uji dibatalkan sebelum membuat data.",
  );
  process.exit(1);
}

const stempel = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
const EMAIL = `uji-e2e-tahap7-${stempel}@contoh.invalid`;
const PASS_LAMA = "UjiLamaTahap7#2026";
const PASS_BARU = "UjiBaruTahap7#2026";

/** Alfabet kode pemulihan - harus sama persis dengan lib/recovery-code.ts. */
const KODE_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}(-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}){3}$/;

const hasil = [];
function cek(nama, ok, detail) {
  hasil.push({ nama, ok });
  console.log(`${ok ? "LULUS" : "GAGAL"} | ${nama} | ${detail}`);
}
const mask = (k) => (k ? `${k.slice(0, 4)}-****-****-**** (${k.length} karakter)` : "(tidak ada)");
const tidur = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * POST ke API aplikasi. Header Origin diisi supaya lolos penjaga anti-CSRF
 * (lib/request-guard.ts menolak POST dari domain asing).
 *
 * 429 = pembatas laju sengaja ketat di endpoint pemulihan (5 percobaan/menit).
 * Itu perilaku yang BENAR, jadi skrip menunggunya, bukan menganggapnya gagal.
 */
async function post(path, body, cookie) {
  const headers = { "Content-Type": "application/json", Origin: BASE };
  if (cookie) headers.Cookie = cookie;
  for (let coba = 1; coba <= 3; coba++) {
    const res = await fetch(BASE + path, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      redirect: "manual",
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}
    if (res.status === 429 && coba < 3) {
      const jeda = Number(res.headers.get("retry-after") ?? 60) + 3;
      console.log(`   (batas laju kena di ${path} - itu memang pengamannya; tunggu ${jeda} detik)`);
      await tidur(jeda * 1000);
      continue;
    }
    const viewer = (res.headers.getSetCookie?.() ?? []).find((c) => c.startsWith("dramaku_viewer="));
    return { status: res.status, json, text, viewerCookie: viewer ? viewer.split(";")[0] : null };
  }
}

// --- pembersihan akun uji di Supabase --------------------------------------
const sbHeaders = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
};

async function cariBarisUji() {
  const res = await fetch(
    `${SB_URL}/rest/v1/app_data?key=like.*${encodeURIComponent(EMAIL)}*&select=key`,
    { headers: sbHeaders },
  );
  if (!res.ok) throw new Error(`select ${res.status}: ${await res.text()}`);
  return (await res.json()).map((r) => r.key);
}

async function bersihkan() {
  // Sabuk pengaman ganda: hanya email uji bertanda .invalid yang boleh dihapus,
  // dan penghapusan memakai key PERSIS (eq), bukan pola menyapu.
  if (!EMAIL.endsWith("@contoh.invalid")) throw new Error("Tolak menghapus: bukan email uji");
  for (const k of await cariBarisUji()) {
    const res = await fetch(`${SB_URL}/rest/v1/app_data?key=eq.${encodeURIComponent(k)}`, {
      method: "DELETE",
      headers: { ...sbHeaders, Prefer: "return=representation" },
    });
    if (!res.ok) throw new Error(`delete ${res.status}: ${await res.text()}`);
    console.log(`   bersih: ${k} (${(await res.json()).length} baris)`);
  }
  const sisa = await cariBarisUji();
  console.log(
    `   verifikasi: ${sisa.length} baris tersisa ${sisa.length === 0 ? "(BERSIH)" : "(MASIH ADA - hapus manual!)"}`,
  );
  return sisa.length === 0;
}

console.log(`Target  : ${BASE}`);
console.log(`Akun uji: ${EMAIL}`);
console.log("Catatan : butuh ~1-2 menit karena pembatas laju 5 percobaan/menit sengaja ditunggu.\n");

let bersihOk = false;
try {
  // --- 1. Daftar: penonton baru langsung menerima 1 kode pemulihan ----------
  const r1 = await post("/api/auth/register", {
    name: "Uji E2E Tahap 7",
    email: EMAIL,
    password: PASS_LAMA,
  });
  const kode1 = r1.json?.recoveryCode;
  cek("1. Daftar akun baru balas 200", r1.status === 200, `status=${r1.status}`);
  cek("2. Daftar memberi kode pemulihan berformat benar", KODE_RE.test(kode1 ?? ""), mask(kode1));
  cek("3. Kode tanpa karakter rancu (0/O/1/I/L)", !/[01OIL]/.test(kode1 ?? "x0"), "alfabet aman terverifikasi");
  cek("4. Daftar langsung memberi sesi (cookie dramaku_viewer)", !!r1.viewerCookie, r1.viewerCookie ? "cookie sesi ada" : "TIDAK ADA");

  // --- 2. Gagal harus terlihat SAMA, apa pun sebabnya ----------------------
  const rSalah = await post("/api/auth/reset-password", {
    email: EMAIL,
    code: "ZZZZ-ZZZZ-ZZZZ-ZZZZ",
    newPassword: PASS_BARU,
  });
  const rAsing = await post("/api/auth/reset-password", {
    email: `tidak-ada-${stempel}@contoh.invalid`,
    code: "ZZZZ-ZZZZ-ZZZZ-ZZZZ",
    newPassword: PASS_BARU,
  });
  cek("5. Kode salah ditolak 401", rSalah.status === 401, `status=${rSalah.status} pesan="${rSalah.json?.error}"`);
  cek("6. Email tak terdaftar ditolak 401", rAsing.status === 401, `status=${rAsing.status}`);
  cek(
    "7. Pesan gagal IDENTIK (tak bocorkan email mana yang terdaftar)",
    rSalah.json?.error === rAsing.json?.error && rSalah.status === rAsing.status,
    `"${rSalah.json?.error}" vs "${rAsing.json?.error}"`,
  );

  // --- 3. Pulihkan password: kode ditulis huruf kecil & tanpa tanda hubung --
  const r2 = await post("/api/auth/reset-password", {
    email: EMAIL,
    code: (kode1 ?? "").toLowerCase().replace(/-/g, ""),
    newPassword: PASS_BARU,
  });
  const kode2 = r2.json?.recoveryCode;
  cek("8. Reset password pakai kode (huruf kecil, tanpa strip) berhasil", r2.status === 200, `status=${r2.status}`);
  cek("9. Reset memberi kode BARU yang berbeda", KODE_RE.test(kode2 ?? "") && kode2 !== kode1, mask(kode2));
  cek("10. Reset langsung memberi sesi (tak perlu login ulang)", !!r2.viewerCookie, r2.viewerCookie ? "cookie sesi ada" : "TIDAK ADA");

  // --- 4. Kode lama hangus (sekali pakai) ----------------------------------
  const r3 = await post("/api/auth/reset-password", {
    email: EMAIL,
    code: kode1,
    newPassword: "PasswordKetiga#2026",
  });
  cek("11. Kode LAMA hangus setelah dipakai (sekali pakai)", r3.status === 401, `status=${r3.status} pesan="${r3.json?.error}"`);

  // --- 5. Password benar-benar berganti ------------------------------------
  const l1 = await post("/api/auth/login", { email: EMAIL, password: PASS_LAMA });
  const l2 = await post("/api/auth/login", { email: EMAIL, password: PASS_BARU });
  cek("12. Password LAMA ditolak", l1.status === 401, `status=${l1.status}`);
  cek("13. Password BARU diterima", l2.status === 200, `status=${l2.status}`);

  // --- 6. Jalur profil: buat kode baru selagi masih bisa masuk -------------
  const sesi = l2.viewerCookie;
  const p0 = await post("/api/auth/recovery-code", { password: PASS_BARU }, null);
  const p1 = await post("/api/auth/recovery-code", { password: "salah-sekali" }, sesi);
  const p2 = await post("/api/auth/recovery-code", { password: PASS_BARU }, sesi);
  const kode3 = p2.json?.recoveryCode;
  cek("14. Buat kode baru tanpa login ditolak 401", p0.status === 401, `status=${p0.status}`);
  cek("15. Buat kode baru dengan password salah ditolak 401", p1.status === 401, `status=${p1.status} pesan="${p1.json?.error}"`);
  cek("16. Buat kode baru dari profil berhasil", p2.status === 200 && KODE_RE.test(kode3 ?? ""), mask(kode3));
  cek("17. Kode dari profil berbeda dari kode sebelumnya", kode3 !== kode2 && kode3 !== kode1, "ketiganya unik");

  // --- 7. Kode yang digantikan lewat profil ikut hangus --------------------
  const r4 = await post("/api/auth/reset-password", {
    email: EMAIL,
    code: kode2,
    newPassword: "PasswordKeempat#2026",
  });
  cek("18. Kode sebelumnya hangus setelah buat kode baru di profil", r4.status === 401, `status=${r4.status}`);

  // --- 8. Kode terbaru masih sah (rantai pemulihan tak putus) --------------
  const r5 = await post("/api/auth/reset-password", {
    email: EMAIL,
    code: kode3,
    newPassword: "PasswordKelima#2026",
  });
  cek(
    "19. Kode TERBARU dari profil bisa dipakai memulihkan",
    r5.status === 200 && KODE_RE.test(r5.json?.recoveryCode ?? ""),
    `status=${r5.status}`,
  );
} finally {
  console.log("\nMembersihkan akun uji dari database...");
  bersihOk = await bersihkan();
}

const gagal = hasil.filter((h) => !h.ok);
console.log(`\n=== RINGKASAN: ${hasil.length - gagal.length}/${hasil.length} lulus ===`);
for (const g of gagal) console.log(`  GAGAL: ${g.nama}`);
if (!bersihOk) console.log("  PERINGATAN: akun uji belum bersih - hapus manual di Supabase.");
process.exitCode = gagal.length === 0 && bersihOk ? 0 : 1;
