// Isi data lencana kartu (rating · tahun · durasi · kualitas) lewat PostgREST.
//
// KENAPA LEWAT REST, BUKAN SQL: menambah kolom butuh DDL, dan semua jalur ke
// sana tertutup 2026-09-22 (password database tidak berlaku, tak ada Supabase
// CLI/Personal Access Token, owner tak punya akses dashboard). PostgREST tidak
// bisa mengubah STRUKTUR, tapi BISA mengubah ISI — dan tiga dari empat data ini
// kolomnya memang sudah ada:
//     rating -> imdb_rating   tahun -> year   durasi -> runtime
// Yang keempat (kualitas) tidak punya kolom, jadi disimpan sebagai satu dokumen
// di tabel `app_data` (lihat lib/kualitas-drama.ts).
//
// NILAINYA DARI OWNER (2026-09-22), bukan dari sumber teknis mana pun:
//     rating 7.8 · tahun 2024 · durasi 119 menit (tergambar "01:59")
//     kualitas: film yang masih tayang di bioskop (tahun 2026) = CAM (merah),
//               SISANYA = HD (hijau)
//
// ⛔ ATURAN YANG TIDAK BOLEH DILANGGAR: hanya mengisi yang MASIH KOSONG.
// Tanpa ini, rating asli The Dark Knight (9.1) ikut jadi 7.8 dan durasi asli
// ketujuh film diseragamkan jadi 01:59 — kerusakan SENYAP: tidak ada error,
// cuma informasi yang jadi salah di mata penonton.
//
// PENGAMAN: tanpa bendera --jalankan, skrip hanya MENCETAK rencananya tanpa
// mengirim satu pun perubahan. Tiap PATCH selalu memakai penyaring daftar id
// yang eksplisit — tidak pernah PATCH tanpa filter (itu mengubah SELURUH tabel).
//
// Pakai:
//   node scripts/isi-lencana-lewat-rest.mjs              (simulasi)
//   node scripts/isi-lencana-lewat-rest.mjs --jalankan   (kirim perubahan)
import { readFileSync } from "node:fs";

const JALANKAN = process.argv.includes("--jalankan");

const RATING_BARU = "7.8";
const TAHUN_BARU = "2024";
const DURASI_BARU = "119 min"; // 1 jam 59 menit -> lencana "01:59"
const TAHUN_MASIH_BIOSKOP = "2026";

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

const kosong = (v) => v === null || v === undefined || String(v).trim() === "";

// --- 1. baca keadaan sekarang ----------------------------------------------
const baris = await minta("dramas?select=id,kind,year,runtime,imdb_rating&order=sort_index.asc");
console.log(`Katalog: ${baris.length} judul\n`);

const perluRating = baris.filter((d) => kosong(d.imdb_rating)).map((d) => d.id);
const perluTahun = baris.filter((d) => kosong(d.year)).map((d) => d.id);
const perluDurasi = baris.filter((d) => kosong(d.runtime)).map((d) => d.id);

// Kualitas dihitung dari tahun SESUDAH pengisian: judul yang tahunnya baru diisi
// 2024 bukan film bioskop, jadi otomatis masuk kelompok HD.
const tahunFinal = (d) => (kosong(d.year) ? TAHUN_BARU : String(d.year).trim());
const cam = baris.filter((d) => d.kind === "movie" && tahunFinal(d) === TAHUN_MASIH_BIOSKOP);
const hd = baris.filter((d) => !cam.includes(d));

console.log(`Rencana (hanya yang MASIH KOSONG yang disentuh):`);
console.log(`  rating  '${RATING_BARU}'   -> ${perluRating.length} judul  (${baris.length - perluRating.length} punya rating asli, DIPERTAHANKAN)`);
console.log(`  tahun   '${TAHUN_BARU}'  -> ${perluTahun.length} judul  (${baris.length - perluTahun.length} punya tahun asli, DIPERTAHANKAN)`);
console.log(`  durasi  '${DURASI_BARU}' -> ${perluDurasi.length} judul  (${baris.length - perluDurasi.length} punya durasi asli, DIPERTAHANKAN)`);
console.log(`  kualitas CAM (merah)  -> ${cam.length} judul: ${cam.map((d) => d.id).join(", ") || "-"}`);
console.log(`  kualitas HD  (hijau)  -> ${hd.length} judul`);

if (!JALANKAN) {
  console.log("\nSIMULASI — tidak ada yang dikirim. Tambahkan --jalankan untuk menerapkan.");
} else {
  // --- 2. terapkan ------------------------------------------------------------
  // Tiap PATCH WAJIB berpenyaring daftar id eksplisit. PATCH tanpa filter akan
  // mengubah SELURUH tabel — itulah bedanya "mengisi yang kosong" dengan "menimpa
  // semuanya".
  async function isiKolom(kolom, nilai, ids) {
    if (!ids.length) return;
    await minta(`dramas?id=in.(${ids.map(encodeURIComponent).join(",")})`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ [kolom]: nilai }),
    });
    console.log(`  ok  ${kolom} = '${nilai}' pada ${ids.length} judul`);
  }

  console.log("\nMenerapkan:");
  await isiKolom("imdb_rating", RATING_BARU, perluRating);
  await isiKolom("year", TAHUN_BARU, perluTahun);
  await isiKolom("runtime", DURASI_BARU, perluDurasi);

  const peta = {};
  for (const d of cam) peta[d.id] = "CAM";
  for (const d of hd) peta[d.id] = "HD";
  await minta("app_data", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ key: "kualitas", value: peta }),
  });
  console.log(`  ok  dokumen app_data 'kualitas' berisi ${Object.keys(peta).length} judul`);

  // --- 3. buktikan dengan membaca ULANG ---------------------------------------
  const cek = await minta("dramas?select=id,year,runtime,imdb_rating&order=sort_index.asc");
  const dok = await minta("app_data?key=eq.kualitas&select=value&limit=1");
  const petaCek = dok?.[0]?.value ?? {};
  console.log("\nBUKTI (dibaca ulang dari database):");
  console.log(`  judul tanpa rating : ${cek.filter((d) => kosong(d.imdb_rating)).length}`);
  console.log(`  judul tanpa tahun  : ${cek.filter((d) => kosong(d.year)).length}`);
  console.log(`  judul tanpa durasi : ${cek.filter((d) => kosong(d.runtime)).length}`);
  console.log(`  entri kualitas     : ${Object.keys(petaCek).length}  (CAM: ${Object.values(petaCek).filter((v) => v === "CAM").length}, HD: ${Object.values(petaCek).filter((v) => v === "HD").length})`);
}
