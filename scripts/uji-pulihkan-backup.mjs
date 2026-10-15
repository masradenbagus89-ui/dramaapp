// Pemeriksa untuk UJI PULIHKAN BACKUP — dipakai oleh
// .github/workflows/uji-pulihkan-backup.yml, dan sengaja dipisah dari workflow
// supaya logikanya bisa DIUJI tanpa GitHub (tests/uji-pulihkan-backup.test.ts).
//
// ═══════════════════════════════════════════════════════════════════════════
// KENAPA BERKAS INI ADA
//
// "Ada berkas backup" dan "punya backup yang terbukti pulih" adalah dua klaim
// berbeda, dan bedanya baru terasa di hari terburuk. Project ini sudah pernah
// kena: 2026-10-14 script export menghasilkan berkas yang terlihat sehat
// sempurna (exit 0, 125 baris, ukuran wajar) tapi NOL baris akan masuk saat
// dipulihkan — satu kolom tertinggal membatalkan seluruh transaksi.
//
// Tiga pagar di sini menutup tiga cara uji pulih bisa "lulus" secara palsu:
//   1. periksaBukanProduksi  — uji yang tanpa sadar menulis ke database PRODUKSI
//   2. periksaDatabaseKosong — database uji yang sudah berisi; `on conflict do
//      nothing` membuat hitungan cocok dari data LAMA, bukan dari pemulihan
//   3. bacaHarapan + bandingkanHitungan — angka pembanding diambil dari BERKAS
//      BACKUP ITU SENDIRI, bukan dari catatan yang bisa basi
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";

/** Tabel yang wajib ikut terpulihkan. `unlocks` boleh 0 baris — memang kosong di produksi. */
export const TABEL = ["app_data", "dramas", "likes", "wallets", "unlocks"];

/**
 * PAGAR 1 — tolak connection string yang menunjuk project PRODUKSI.
 *
 * Kenapa perlu: pemulihan menjalankan DDL (`alter table`, `grant`, `create or
 * replace function`) ke database tujuan. Salah tempel = produksi yang disentuh,
 * dan `on conflict do nothing` TIDAK menolong untuk bagian DDL-nya.
 *
 * Cara mengenalinya: ref project selalu muncul di connection string Supabase,
 * lewat jalur mana pun — pada Direct connection ia ada di HOST
 * (`db.<ref>.supabase.co`), pada Session pooler ia ada di NAMA PENGGUNA
 * (`postgres.<ref>`, hostnya `pooler.supabase.com`). Karena itu yang diperiksa
 * "apakah ref produksi muncul di mana pun dalam teksnya" — menutup kedua bentuk
 * sekaligus tanpa perlu membedah URL-nya.
 *
 * (Bentuk URL-nya sengaja TIDAK ditulis utuh di komentar ini: penjaga rahasia
 * repo menolak pola `skema://pengguna:sandi@` di berkas mana pun, dan aturan itu
 * benar — lihat .github/workflows/secret-guard.yml.)
 */
export function periksaBukanProduksi(connStr, refProduksi) {
  const s = String(connStr ?? "").trim();
  const ref = String(refProduksi ?? "").trim();

  if (!s) {
    return { aman: false, alasan: "DATABASE_URL_UJI_PULIH kosong." };
  }
  if (!ref) {
    // Tanpa ref produksi pagar ini tak bisa membedakan apa pun. Lebih baik
    // berhenti daripada memberi rasa aman yang sebenarnya tidak diperiksa.
    return {
      aman: false,
      alasan:
        "SUPABASE_PROJECT_REF kosong — pagar anti-produksi tak bisa memeriksa apa pun. Dihentikan.",
    };
  }
  if (!/^postgres(ql)?:\/\//i.test(s)) {
    return {
      aman: false,
      alasan:
        "DATABASE_URL_UJI_PULIH bukan connection string postgres (harus diawali postgresql://).",
    };
  }
  if (s.toLowerCase().includes(ref.toLowerCase())) {
    return {
      aman: false,
      alasan:
        "DATABASE_URL_UJI_PULIH menunjuk project PRODUKSI (ref-nya cocok). Uji pulih WAJIB di database kosong terpisah. Dihentikan sebelum satu perintah pun dijalankan.",
    };
  }
  return { aman: true, alasan: "" };
}

/**
 * PAGAR 2 — database tujuan harus benar-benar kosong sebelum dipulihkan.
 * Masukan = keluaran mentah `psql -At -c "select to_regclass('dramaapp.dramas')"`
 * (nama tabel kalau ada, baris kosong kalau tidak).
 *
 * Kenapa ini menentukan: seluruh `insert` di berkas backup berakhiran
 * `on conflict do nothing`. Dijalankan ke database yang SUDAH berisi, nol baris
 * benar-benar masuk — tapi `count(*)` tetap cocok karena data lamanya yang
 * terhitung. Hasilnya "LULUS" yang tidak membuktikan apa pun.
 */
export function periksaDatabaseKosong(keluaranToRegclass) {
  const isi = String(keluaranToRegclass ?? "").trim();
  if (isi === "" || isi.toLowerCase() === "null") {
    return { kosong: true, alasan: "" };
  }
  return {
    kosong: false,
    alasan:
      `Database tujuan SUDAH punya tabel ${isi}. Uji pulih harus dijalankan di database KOSONG: ` +
      "semua insert di backup berakhiran `on conflict do nothing`, jadi di database berisi hitungannya " +
      "akan cocok dari data LAMA dan uji ini jadi lulus palsu. Pakai project baru, atau jalankan " +
      "`drop schema dramaapp cascade;` di database uji dulu.",
  };
}

/**
 * Angka pembanding diambil dari BERKAS BACKUP ITU SENDIRI.
 *
 * `scripts/export-dramaapp-sql.mjs` menulis satu baris komentar per tabel:
 *   -- dramas: 40 baris
 * Memakai itu — bukan angka yang dicatat di dokumen — berarti uji ini tetap
 * benar untuk backup tanggal mana pun, dan tak pernah jadi basi.
 *
 * @param {string} teksSql
 * @returns {Record<string, number>} tabel yang komentarnya tak ketemu TIDAK diisi
 */
export function bacaHarapan(teksSql) {
  /** @type {Record<string, number>} */
  const hasil = {};
  for (const t of TABEL) {
    const m = new RegExp(`^--\\s*${t}:\\s*(\\d+)\\s+baris\\s*$`, "m").exec(
      String(teksSql ?? ""),
    );
    if (m) hasil[t] = Number(m[1]);
  }
  return hasil;
}

/**
 * Keluaran `psql -At -F','` → objek {tabel: jumlah}.
 *
 * @param {string} keluaran
 * @returns {Record<string, number>}
 */
export function bacaHitunganPsql(keluaran) {
  /** @type {Record<string, number>} */
  const hasil = {};
  for (const baris of String(keluaran ?? "").split(/\r?\n/)) {
    const m = /^([a-z_]+),(\d+)$/.exec(baris.trim());
    if (m) hasil[m[1]] = Number(m[2]);
  }
  return hasil;
}

/**
 * Bandingkan harapan vs kenyataan. Tabel yang TIDAK tercantum di harapan
 * dihitung sebagai masalah, bukan dilewati diam-diam: komentar yang hilang
 * berarti berkas backupnya sendiri tidak utuh.
 *
 * @param {Record<string, number>} harapan
 * @param {Record<string, number>} nyata
 * @returns {{lulus: boolean, masalah: string[]}}
 */
export function bandingkanHitungan(harapan, nyata) {
  /** @type {string[]} */
  const masalah = [];
  for (const t of TABEL) {
    const h = harapan[t];
    const n = nyata[t];
    if (h === undefined) {
      masalah.push(
        `${t}: berkas backup tak memuat baris "-- ${t}: N baris" — isinya tidak utuh.`,
      );
      continue;
    }
    if (n === undefined) {
      masalah.push(`${t}: tidak terbaca dari database uji (tabelnya ada?).`);
      continue;
    }
    if (h !== n) {
      masalah.push(`${t}: backup menjanjikan ${h} baris, yang masuk ${n}.`);
    }
  }
  return { lulus: masalah.length === 0, masalah };
}

// ── CLI ────────────────────────────────────────────────────────────────────
// Dipanggil workflow. Tiap mode keluar dengan kode != 0 saat gagal supaya
// langkahnya MERAH, bukan sekadar mencetak peringatan.
const MODE = {
  pagar() {
    const { aman, alasan } = periksaBukanProduksi(
      process.env.DATABASE_URL_UJI_PULIH,
      process.env.SUPABASE_PROJECT_REF,
    );
    // Nilainya sendiri tak pernah dicetak — hanya putusannya.
    if (!aman) {
      console.log(`::error::${alasan}`);
      process.exit(1);
    }
    console.log("✓ pagar anti-produksi lolos: tujuan bukan project produksi");
  },

  kosong(argv) {
    const { kosong, alasan } = periksaDatabaseKosong(argv[0] ?? "");
    if (!kosong) {
      console.log(`::error::${alasan}`);
      process.exit(1);
    }
    console.log("✓ database tujuan kosong — pemulihan akan terukur jujur");
  },

  banding(argv) {
    const [berkasSql, keluaranPsql] = argv;
    const harapan = bacaHarapan(readFileSync(berkasSql, "utf-8"));
    const nyata = bacaHitunganPsql(keluaranPsql);
    for (const t of TABEL) {
      console.log(
        `  ${t}: backup=${harapan[t] ?? "?"}  terpulihkan=${nyata[t] ?? "?"}`,
      );
    }
    const { lulus, masalah } = bandingkanHitungan(harapan, nyata);
    if (!lulus) {
      for (const m of masalah) console.log(`::error::${m}`);
      process.exit(1);
    }
    console.log("✓ jumlah baris COCOK — backup benar-benar bisa dipulihkan");
  },
};

// Jalankan CLI hanya saat berkas ini yang dieksekusi langsung, bukan saat
// diimpor oleh tes. `import.meta.main` belum ada di Node 24.
const berkasDijalankan = (process.argv[1] ?? "").replace(/\\/g, "/");
if (berkasDijalankan.endsWith("uji-pulihkan-backup.mjs")) {
  const mode = process.argv[2];
  const fn = MODE[mode];
  if (!fn) {
    console.error(
      `Mode tak dikenal: ${mode}. Pilih: ${Object.keys(MODE).join(" | ")}`,
    );
    process.exit(2);
  }
  fn(process.argv.slice(3));
}
