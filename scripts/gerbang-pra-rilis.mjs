// Gerbang pra-rilis dramaapp — SATU perintah untuk seluruh AGENTS.local.md §6.
//
// Dipakai lewat:  npm run gerbang
//
// ═══════════════════════════════════════════════════════════════════════════
// KENAPA BERKAS INI ADA
//
// §6 menuliskan lima pemeriksaan yang harus dijalankan BERURUTAN sebelum push
// ke `origin main` (= tombol rilis). Selama ini urutannya diketik ulang dengan
// tangan tiap kali, dan justru urutannya yang jadi sumber kesalahan berulang:
//
//   `npm run build` WAJIB mendahului `npx tsc --noEmit`. Dibalik, tsc SELALU
//   melaporkan 4 error PALSU (TS2304: Cannot find name 'PageProps'), sebab
//   next-env.d.ts mengimpor berkas tipe di .next/ yang baru DIBUAT oleh build.
//   Menghapus .next lalu langsung menjalankan tsc = memeriksa berkas yang
//   belum ada. Jebakan ini tercatat menipu TIGA sesi (2026-09-11, 2026-09-14,
//   2026-09-15) — dua di antaranya nyaris melaporkan kerusakan yang tidak ada.
//
// Dengan berkas ini urutannya tidak lagi bergantung pada ingatan siapa pun:
// ia terkunci di konstanta LANGKAH, dijaga periksaUrutanLangkah() yang
// dipanggil SEBELUM langkah pertama jalan, dan dikunci tes
// tests/gerbang-pra-rilis.test.ts.
//
// ⚠️ YANG TIDAK DILAKUKAN BERKAS INI — DISENGAJA:
//   - TIDAK melakukan `git push`. Push ke `origin main` adalah TOMBOL RILIS,
//     dan izinnya milik owner, bukan AI maupun skrip (AGENTS.md §5.5).
//   - TIDAK menjalankan smoke test ke situs produksi. Itu baru masuk akal
//     SESUDAH push, dan hasilnya perlu mata manusia.
//   Gerbang ini berhenti tepat sebelum keduanya, lalu menuliskan apa yang
//   harus dikerjakan manusia berikutnya.
//
// 🪤 PERINGATAN PEMAKAIAN: langkah pertama MENGHAPUS folder .next. Kalau ada
// `next dev` atau `next start` yang sedang melayani pratinjau lokal, pratinjau
// itu akan rusak di tengah pemakaian. Hentikan dulu servernya sebelum
// menjalankan gerbang ini.
// ═══════════════════════════════════════════════════════════════════════════

import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";

/**
 * Lima langkah §6, URUT. Urutannya bukan selera — lihat blok KENAPA di atas.
 *
 * `perintah: null` berarti langkah itu dikerjakan di dalam berkas ini sendiri
 * (bukan memanggil program luar).
 */
export const LANGKAH = [
  {
    nama: "bersihkan",
    judul: "Hapus folder .next",
    perintah: null,
    kenapa:
      "Sisa build lama bisa membuat build berikutnya terlihat sukses padahal memakai berkas basi.",
  },
  {
    nama: "build",
    judul: "npm run build",
    perintah: "npm run build",
    kenapa:
      "Membuktikan kode benar-benar bisa dirakit — DAN menulis berkas tipe di .next/ yang dibutuhkan langkah berikutnya.",
  },
  {
    nama: "tipe",
    judul: "npx tsc --noEmit",
    perintah: "npx tsc --noEmit",
    kenapa:
      "Memeriksa kecocokan tipe. WAJIB sesudah build, kalau tidak hasilnya 4 error palsu PageProps.",
  },
  {
    nama: "tes",
    judul: "npm test",
    perintah: "npm test",
    kenapa:
      "Penjaga perilaku. Kerusakan di pemanggil lain bersifat SENYAP — tak ada yang melapor.",
  },
  {
    nama: "rahasia",
    judul: "Periksa berkas rahasia di antrean push",
    perintah: null,
    kenapa:
      "Hook pre-commit hanya jalan di komputer yang meng-commit. Commit yang datang dari branch rekan TIDAK pernah melewatinya.",
  },
];

/**
 * Urutan yang tidak boleh dilanggar: build harus mendahului tipe.
 *
 * Kontraknya sengaja cuma `{ nama }` — fungsi ini memang HANYA membaca nama
 * langkahnya. Menuntut bentuk penuh LANGKAH akan memaksa tes menulis ulang
 * judul/perintah/kenapa yang tak ada hubungannya dengan urutan, dan penjaga
 * yang merepotkan adalah penjaga yang dilonggarkan orang berikutnya.
 *
 * @param {{ nama: string }[]} langkah
 * @returns {{ lulus: boolean, masalah: string[] }}
 */
export function periksaUrutanLangkah(langkah = LANGKAH) {
  const masalah = [];
  const posisi = (nama) => langkah.findIndex((l) => l.nama === nama);

  const iBuild = posisi("build");
  const iTipe = posisi("tipe");

  if (iBuild === -1) masalah.push("Langkah 'build' hilang dari daftar.");
  if (iTipe === -1) masalah.push("Langkah 'tipe' hilang dari daftar.");
  if (iBuild !== -1 && iTipe !== -1 && iBuild > iTipe) {
    masalah.push(
      "Urutan TERBALIK: 'build' harus SEBELUM 'tipe'. Dibalik, tsc melaporkan error PageProps palsu.",
    );
  }
  return { lulus: masalah.length === 0, masalah };
}

/**
 * Nama berkas yang tidak boleh ikut terdorong ke repo publik.
 *
 * Sengaja memeriksa NAMA berkas, bukan isinya: isi sudah dijaga hook
 * pre-commit, dan mencetak isi berkas rahasia ke layar justru membocorkannya
 * lewat terminal/log.
 */
const POLA_RAHASIA = [
  // Berkas .env asli, termasuk varian bersufiks seperti .env.local.cadangan
  // yang pola ".env*.local" di .gitignore TIDAK tangkap.
  /(^|\/)\.env(\.[A-Za-z0-9_.-]+)?$/,
  /(^|\/)data\/twofa\.json$/,
  /(^|\/)data\/admins\.json$/,
  /(^|\/)data\/playly\.json$/,
  /(^|\/)cookies\.txt$/,
  /(^|\/)pc-backup-agent\/config\.yml$/,
  /recovery-codes.*\.txt$/,
  /kode-pemulihan.*\.txt$/,
  /(^|\/)supabase_export.*\.sql$/,
  /(^|\/)migrasi-full\.sql$/,
];

/** Contoh/placeholder yang memang BOLEH ada di repo — bukan rahasia. */
const POLA_AMAN = /\.(examples?|samples?|templates?|dist|demo)$/;

/**
 * Pure: dari daftar path berkas, pulangkan yang mencurigakan.
 * Dipisah supaya bisa diuji dengan masukan BURUK tanpa menyentuh git.
 *
 * @param {string[]} daftarBerkas
 * @returns {string[]}
 */
export function cariBerkasRahasia(daftarBerkas) {
  return daftarBerkas
    .map((b) => b.trim().replace(/\\/g, "/"))
    .filter((b) => b.length > 0)
    .filter((b) => !POLA_AMAN.test(b))
    .filter((b) => POLA_RAHASIA.some((p) => p.test(b)));
}

// ── Bagian di bawah menyentuh dunia luar (proses, berkas, git) ──────────────

function jalankanPerintah(perintah) {
  const hasil = spawnSync(perintah, { shell: true, stdio: "inherit" });
  if (hasil.error) {
    return { lulus: false, alasan: hasil.error.message };
  }
  // status null = proses dimatikan sinyal (mis. Ctrl+C). Itu BUKAN sukses.
  if (hasil.status !== 0) {
    return { lulus: false, alasan: `keluar dengan kode ${hasil.status}` };
  }
  return { lulus: true };
}

function bacaKeluaran(perintah) {
  const hasil = spawnSync(perintah, { shell: true, encoding: "utf-8" });
  if (hasil.error || hasil.status !== 0) return null;
  return hasil.stdout ?? "";
}

function langkahBersihkan() {
  if (!existsSync(".next")) {
    console.log("  .next memang belum ada — tidak ada yang dihapus.");
    return { lulus: true };
  }
  try {
    rmSync(".next", { recursive: true, force: true });
    console.log("  .next dihapus.");
    return { lulus: true };
  } catch (e) {
    return { lulus: false, alasan: `gagal menghapus .next: ${e.message}` };
  }
}

function langkahRahasia() {
  // `git fetch` dulu supaya pembandingnya tidak basi. Read-only, aman.
  const fetchOk = bacaKeluaran("git fetch origin") !== null;
  if (!fetchOk) {
    // JANGAN diam-diam lulus. Pemeriksa yang tak bisa membaca pembandingnya
    // belum membuktikan apa pun — dan "hijau tanpa bukti" persis yang
    // membuat gerbang berbahaya.
    return {
      lulus: false,
      alasan:
        "`git fetch origin` gagal (jaringan?). Antrean push tidak bisa dibandingkan, jadi pemeriksaan rahasia TIDAK bisa dipercaya.",
    };
  }

  const antrean = bacaKeluaran("git diff --name-only origin/main..HEAD");
  if (antrean === null) {
    return {
      lulus: false,
      alasan: "tidak bisa membaca daftar berkas di antrean push (origin/main..HEAD).",
    };
  }

  const berkas = antrean.split("\n");
  const jumlah = berkas.filter((b) => b.trim().length > 0).length;
  const tersangka = cariBerkasRahasia(berkas);

  if (tersangka.length > 0) {
    console.log("  Berkas yang TIDAK boleh terdorong (isinya tidak ditampilkan):");
    for (const t of tersangka) console.log(`    - ${t}`);
    return {
      lulus: false,
      alasan: `${tersangka.length} berkas rahasia ada di antrean push.`,
    };
  }

  const stagedMentah = bacaKeluaran("git diff --cached --name-only") ?? "";
  const staged = cariBerkasRahasia(stagedMentah.split("\n"));
  if (staged.length > 0) {
    console.log("  Berkas rahasia yang sedang ter-stage:");
    for (const t of staged) console.log(`    - ${t}`);
    return { lulus: false, alasan: `${staged.length} berkas rahasia ter-stage.` };
  }

  console.log(`  ${jumlah} berkas di antrean push, nol di antaranya berkas rahasia.`);
  return { lulus: true };
}

const PENGERJA = {
  bersihkan: langkahBersihkan,
  rahasia: langkahRahasia,
};

function jalankanGerbang() {
  if (!existsSync("package.json")) {
    console.error(
      "GAGAL: jalankan dari folder akar project (tempat package.json berada).",
    );
    return 2;
  }

  const urutan = periksaUrutanLangkah();
  if (!urutan.lulus) {
    console.error("GAGAL: daftar langkah di skrip ini sendiri sudah salah:");
    for (const m of urutan.masalah) console.error(`  - ${m}`);
    return 2;
  }

  console.log("═".repeat(70));
  console.log("GERBANG PRA-RILIS dramaapp — AGENTS.local.md §6");
  console.log("⚠️  Langkah 1 MENGHAPUS .next. Pratinjau lokal yang sedang jalan akan rusak.");
  console.log("═".repeat(70));

  for (let i = 0; i < LANGKAH.length; i++) {
    const l = LANGKAH[i];
    console.log("");
    console.log(`── [${i + 1}/${LANGKAH.length}] ${l.judul}`);
    console.log(`   kenapa: ${l.kenapa}`);

    const hasil = l.perintah
      ? jalankanPerintah(l.perintah)
      : PENGERJA[l.nama]();

    if (!hasil.lulus) {
      console.log("");
      console.error("═".repeat(70));
      console.error(`GERBANG BERHENTI di langkah ${i + 1}: ${l.judul}`);
      console.error(`Sebab: ${hasil.alasan}`);
      console.error("");
      console.error("JANGAN push. Perbaiki dulu penyebabnya, lalu jalankan");
      console.error("`npm run gerbang` lagi dari awal — bukan melanjutkan dari sini.");
      console.error("═".repeat(70));
      return 1;
    }
    console.log(`   ✓ lolos`);
  }

  console.log("");
  console.log("═".repeat(70));
  console.log("✓ GERBANG LOLOS — kelima pemeriksaan hijau.");
  console.log("");
  console.log("Yang BELUM dikerjakan, dan sengaja bukan tugas skrip ini:");
  console.log("  1. `git push dramaku main` lalu `git push origin main`.");
  console.log("     Push ke origin main = TOMBOL RILIS. Izinnya milik owner.");
  console.log("  2. Smoke test di situs SUNGGUHAN sesudah tayang (bukan localhost).");
  console.log("     'Build hijau' tidak membuktikan situsnya masih melayani orang.");
  console.log("═".repeat(70));
  return 0;
}

// Jalankan hanya saat berkas ini dieksekusi langsung, bukan saat diimpor tes.
// `import.meta.main` belum ada di Node 24 — pola yang sama dipakai
// scripts/uji-pulihkan-backup.mjs.
const berkasDijalankan = (process.argv[1] ?? "").replace(/\\/g, "/");
if (berkasDijalankan.endsWith("gerbang-pra-rilis.mjs")) {
  process.exit(jalankanGerbang());
}
