// Sebarkan tahun 34 serial yang saat ini SERAGAM "2024" menjadi bervariasi.
//
// KENAPA ADA SKRIP INI: `scripts/isi-lencana-lewat-rest.mjs` (2026-09-22) mengisi
// kolom `year` yang masih kosong dengan satu nilai tetap `TAHUN_BARU = "2024"`.
// Komentar di skrip itu menyatakan sendiri nilainya "DARI OWNER, bukan dari sumber
// teknis mana pun". Akibatnya 34 serial memajang tahun yang sama persis dan deretan
// poster terbaca seperti data palsu. Owner (2026-09-23) meminta tahunnya disebar,
// dengan daftar angka: 2024, 2023, 2021, 2022, 2020, 2020.
//
// ⛔ YANG TIDAK BOLEH DISENTUH: 7 FILM. Tahun mereka (2006, 2008, 2017, 2025, 2026)
// adalah tahun rilis SUNGGUHAN dari metadata IMDb — mengacaknya = merusak data yang
// benar. Penyaringnya karena itu DUA syarat sekaligus: bukan film, DAN tahunnya
// masih persis "2024". Satu syarat saja tidak cukup.
//
// KENAPA BUKAN Math.random(): hasilnya harus bisa diulang dan diperiksa. Dengan
// pengacak ber-benih (seeded PRNG) tetap, menjalankan skrip ini dua kali memberi
// hasil yang SAMA — jadi rencana yang dilihat saat simulasi benar-benar rencana
// yang dikirim saat dijalankan. Math.random() membuat keduanya berbeda diam-diam.
//
// Pakai:
//   node scripts/acak-tahun-serial.mjs              (simulasi — tidak mengirim apa pun)
//   node scripts/acak-tahun-serial.mjs --jalankan   (kirim perubahan)
//   node scripts/acak-tahun-serial.mjs --kembalikan (pulihkan dari berkas cadangan)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

const JALANKAN = process.argv.includes("--jalankan");
const KEMBALIKAN = process.argv.includes("--kembalikan");

/**
 * Daftar tahun persis seperti yang diketik owner 2026-09-23, termasuk 2020 yang
 * disebut DUA KALI — pengulangan itu dipertahankan apa adanya sebagai bobot, bukan
 * dianggap salah ketik. Dibagikan berputar ke seluruh serial, lalu diacak posisinya.
 */
const POLA_TAHUN = ["2024", "2023", "2021", "2022", "2020", "2020"];

/** Tahun seragam yang sedang diperbaiki. Hanya baris bernilai INI yang disentuh. */
const TAHUN_LAMA = "2024";

/** Rekaman nilai sebelum diubah — satu-satunya jalan pulang kalau hasilnya tak disukai. */
/** Benih pengacak — tetap, supaya simulasi dan eksekusi memberi hasil yang sama persis. */
const BENIH_ACAK = 20260923;

const BERKAS_CADANGAN = "scripts/cadangan/2026-09-23-tahun-serial.json";

// --- env (tidak pernah dicetak) --------------------------------------------
const env = Object.fromEntries(
  readFileSync(".env.local", "utf-8")
    .split("\n")
    .map((b) => b.trim())
    .filter((b) => b && !b.startsWith("#") && b.includes("="))
    .map((b) => {
      const i = b.indexOf("=");
      return [b.slice(0, i), b.slice(i + 1).replace(/^"|"$/g, "")];
    }),
);
const URL_DASAR = (env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const KUNCI = env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!URL_DASAR || !KUNCI) {
  console.error("BERHENTI: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY tidak terbaca dari .env.local");
  process.exit(1);
}

const HEADER = {
  apikey: KUNCI,
  Authorization: `Bearer ${KUNCI}`,
  "Content-Type": "application/json",
  "Accept-Profile": "dramaapp",
  "Content-Profile": "dramaapp",
};

async function minta(jalur, opsi = {}) {
  const res = await fetch(`${URL_DASAR}/rest/v1/${jalur}`, {
    ...opsi,
    headers: { ...HEADER, ...(opsi.headers ?? {}) },
  });
  const teks = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} ${jalur} -> ${teks.slice(0, 200)}`);
  return teks ? JSON.parse(teks) : null;
}

/**
 * Pengacak ber-benih (mulberry32). Benihnya konstanta, jadi urutan acak yang
 * dihasilkan selalu sama persis di tiap komputer dan tiap kali dijalankan.
 */
function pengacak(benih) {
  let a = benih;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates memakai pengacak ber-benih di atas. Menyalin, tidak mengubah asalnya. */
function acak(daftar, benih) {
  const hasil = [...daftar];
  const rng = pengacak(benih);
  for (let i = hasil.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [hasil[i], hasil[j]] = [hasil[j], hasil[i]];
  }
  return hasil;
}

/** Kirim satu nilai tahun ke sekelompok id. Penyaring id WAJIB eksplisit. */
async function kirimTahun(tahun, ids) {
  if (!ids.length) return;
  await minta(`dramas?id=in.(${ids.map(encodeURIComponent).join(",")})`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ year: tahun }),
  });
  console.log(`  ok  year = '${tahun}' pada ${ids.length} judul`);
}

/** Kelompokkan [id, tahun] menjadi { tahun: [id...] } supaya 1 tahun = 1 PATCH. */
function kelompokkan(pasangan) {
  const peta = {};
  for (const [id, tahun] of pasangan) (peta[tahun] ??= []).push(id);
  return peta;
}

// ===========================================================================
// DUA MODE — dipisah jadi dua fungsi, masing-masing satu tugas.
//
// Sengaja TIDAK memakai process.exit() di jalur sukses: Node di Windows
// melempar `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` kalau proses
// dimatikan paksa selagi koneksi keep-alive milik fetch masih terbuka. Pesan itu
// muncul SESUDAH semua pekerjaan selesai, jadi ia palsu — tapi pembaca berikutnya
// akan membacanya sebagai kegagalan. Membiarkan fungsi selesai sendiri = tidak ada
// pesan palsu.
// ===========================================================================

/** Pulihkan tahun ke nilai sebelum diacak, dibaca dari berkas cadangan. */
async function pulihkan() {
  if (!existsSync(BERKAS_CADANGAN)) {
    console.error(`BERHENTI: berkas cadangan tidak ada di ${BERKAS_CADANGAN}`);
    process.exitCode = 1;
    return;
  }
  const cadangan = JSON.parse(readFileSync(BERKAS_CADANGAN, "utf-8"));
  const pasangan = cadangan.sebelum.map((b) => [b.id, b.year]);
  console.log(`Memulihkan ${pasangan.length} judul ke tahun sebelum diacak...`);
  for (const [tahun, ids] of Object.entries(kelompokkan(pasangan))) {
    await kirimTahun(tahun, ids);
  }
  const cek = await minta("dramas?select=id,year&kind=not.eq.movie&order=sort_index.asc");
  console.log(`\nBUKTI: ${cek.filter((d) => d.year === TAHUN_LAMA).length} serial kembali ke '${TAHUN_LAMA}'`);
}

/** Sebarkan tahun serial yang masih seragam. Tanpa --jalankan hanya mencetak rencana. */
async function sebarkan() {
  const baris = await minta("dramas?select=id,title,kind,year&order=sort_index.asc");
  console.log(`Katalog: ${baris.length} judul`);

  // DUA syarat: bukan film DAN masih bertahun seragam. Film tidak pernah ikut.
  const sasaran = baris.filter(
    (d) => d.kind !== "movie" && String(d.year ?? "").trim() === TAHUN_LAMA,
  );
  const film = baris.filter((d) => d.kind === "movie");

  console.log(`  film (tahun asli, TIDAK disentuh) : ${film.length} -> ${film.map((d) => d.year).join(", ")}`);
  console.log(`  serial bertahun '${TAHUN_LAMA}'          : ${sasaran.length}  <- yang akan disebar`);

  const lain = baris.length - sasaran.length - film.length;
  if (lain > 0) console.log(`  serial bertahun LAIN (dilewati)   : ${lain}`);

  if (!sasaran.length) {
    console.log("\nTidak ada yang perlu diubah.");
    return;
  }

  // Bagikan POLA_TAHUN berputar sampai menutupi seluruh sasaran, lalu ACAK posisinya.
  // Tanpa pengacakan, urutannya jadi pola berulang yang justru terbaca lebih palsu
  // daripada seragam: 2024, 2023, 2021, 2022, 2020, 2020, 2024, 2023, ...
  const jatah = acak(
    Array.from({ length: sasaran.length }, (_, i) => POLA_TAHUN[i % POLA_TAHUN.length]),
    BENIH_ACAK,
  );

  const pasangan = sasaran.map((d, i) => [d.id, jatah[i]]);
  const perTahun = kelompokkan(pasangan);

  console.log(`\nSebaran hasil (${sasaran.length} serial):`);
  for (const tahun of [...new Set(POLA_TAHUN)].sort()) {
    console.log(`  ${tahun} -> ${(perTahun[tahun] ?? []).length} judul`);
  }

  console.log(`\nContoh 6 judul pertama:`);
  for (const [id, tahun] of pasangan.slice(0, 6)) {
    const judul = sasaran.find((d) => d.id === id)?.title ?? id;
    console.log(`  ${TAHUN_LAMA} -> ${tahun}  ${judul.slice(0, 50)}`);
  }

  if (!JALANKAN) {
    console.log("\nSIMULASI — tidak ada yang dikirim. Tambahkan --jalankan untuk menerapkan.");
    console.log("(Hasilnya akan sama persis saat dijalankan: pengacaknya ber-benih tetap.)");
    return;
  }

  // Cadangan ditulis SEBELUM PATCH pertama: kalau pengiriman putus di tengah,
  // catatan nilai lama sudah aman di disk.
  mkdirSync(dirname(BERKAS_CADANGAN), { recursive: true });
  writeFileSync(
    BERKAS_CADANGAN,
    JSON.stringify(
      {
        dibuat: new Date().toISOString(),
        alasan: "sebelum menyebar tahun serial yang seragam 2024 (permintaan owner 2026-09-23)",
        sebelum: sasaran.map((d) => ({ id: d.id, year: d.year })),
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`\nCadangan ditulis: ${BERKAS_CADANGAN} (${sasaran.length} judul)`);

  console.log("\nMenerapkan:");
  for (const [tahun, ids] of Object.entries(perTahun)) {
    await kirimTahun(tahun, ids);
  }

  // Buktikan dengan MEMBACA ULANG, bukan dengan menganggap PATCH-nya berhasil.
  const cek = await minta("dramas?select=id,kind,year&order=sort_index.asc");
  const sebaranAkhir = {};
  for (const d of cek) {
    const t = d.year ?? "(kosong)";
    sebaranAkhir[t] = (sebaranAkhir[t] ?? 0) + 1;
  }
  console.log("\nBUKTI (dibaca ulang dari database):");
  for (const [tahun, n] of Object.entries(sebaranAkhir).sort()) console.log(`  ${tahun} = ${n} judul`);
  console.log(`  film tetap bertahun asli: ${cek.filter((d) => d.kind === "movie").map((d) => d.year).join(", ")}`);
}

await (KEMBALIKAN ? pulihkan() : sebarkan());
