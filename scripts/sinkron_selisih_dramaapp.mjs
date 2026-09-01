// Menyalin selisih data dari database LAMA (iicrzdnmcpontfytfypi, schema
// `public`) ke database BARU (nvblmpkwyzbpdbshyvzw, schema `dramaapp`).
//
// KENAPA ADA: migrasi menyalin isi database pada 2026-08-29, tapi produksi
// masih melayani penonton dari database LAMA sesudah itu. Jadi setiap like,
// perubahan setelan, dan alamat tunnel video yang baru hanya tercatat di
// database lama. Selisih itu harus disusulkan SEBELUM env Vercel ditukar,
// kalau tidak aktivitas penonton sejak 29 Agu hilang.
//
// YANG PALING KRITIS: kunci `videobase` di app_data menyimpan alamat tunnel
// video yang sedang hidup. Alamat itu berganti tiap PC backup restart. Kalau
// tidak ikut disalin, seluruh video mati begitu produksi pindah database.
//
// AMAN: hanya menyalin baris yang BERBEDA, arahnya selalu lama -> baru, dan
// TIDAK PERNAH menghapus apa pun. Idempoten — dijalankan berulang kali hasilnya
// sama. Jalankan lagi tepat sebelum menukar env untuk menangkap selisih menit
// terakhir.
//
// Jalankan:  node scripts/sinkron_selisih_dramaapp.mjs
// Butuh   :  C:\Users\user18\Downloads\key-lama.txt  (service_role project LAMA)
//            .env.local                              (kredensial project BARU)

import { readFileSync } from "node:fs";

const OLD_URL = "https://iicrzdnmcpontfytfypi.supabase.co";
const OLD_KEY_FILE = "C:/Users/user18/Downloads/key-lama.txt";
const SCHEMA_BARU = "dramaapp";

// tabel -> { kunci: cara membaca identitas baris, konflik: kolom PK untuk upsert }
const TABEL = {
  app_data: { kunci: (r) => r.key, konflik: "key" },
  dramas: { kunci: (r) => r.id, konflik: "id" },
  likes: { kunci: (r) => r.drama_id, konflik: "drama_id" },
  wallets: { kunci: (r) => r.email, konflik: "email" },
  unlocks: { kunci: (r) => `${r.email}|${r.token}`, konflik: "email,token" },
};

function envLocal(nama) {
  const isi = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const m = isi.match(new RegExp(`^${nama}=(.*)$`, "m"));
  if (!m) throw new Error(`${nama} tidak ada di .env.local`);
  return m[1].trim();
}

const OLD_KEY = readFileSync(OLD_KEY_FILE, "utf8").trim();
const NEW_URL = envLocal("SUPABASE_URL").replace(/\/+$/, "");
const NEW_KEY = envLocal("SUPABASE_SERVICE_ROLE_KEY");

async function baca(url, key, tabel, schema) {
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  if (schema) headers["Accept-Profile"] = schema;
  const res = await fetch(`${url}/rest/v1/${tabel}?select=*`, { headers });
  if (!res.ok) throw new Error(`baca ${tabel}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function tulis(tabel, rows, konflik) {
  const res = await fetch(
    `${NEW_URL}/rest/v1/${tabel}?on_conflict=${konflik}`,
    {
      method: "POST",
      headers: {
        apikey: NEW_KEY,
        Authorization: `Bearer ${NEW_KEY}`,
        "Content-Profile": SCHEMA_BARU,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
    },
  );
  if (!res.ok) throw new Error(`tulis ${tabel}: ${res.status} ${await res.text()}`);
}

/** Baris di LAMA yang belum ada atau isinya beda di BARU. */
function cariSelisih(lama, baru, kunci) {
  const petaBaru = new Map(baru.map((r) => [kunci(r), r]));
  return lama.filter((r) => {
    const pasangan = petaBaru.get(kunci(r));
    return !pasangan || JSON.stringify(r) !== JSON.stringify(pasangan);
  });
}

let totalDisalin = 0;

for (const [tabel, { kunci, konflik }] of Object.entries(TABEL)) {
  const lama = await baca(OLD_URL, OLD_KEY, tabel, null);
  const baru = await baca(NEW_URL, NEW_KEY, tabel, SCHEMA_BARU);
  const selisih = cariSelisih(lama, baru, kunci);

  if (!selisih.length) {
    console.log(`${tabel.padEnd(10)} sudah sama (${lama.length} baris)`);
    continue;
  }

  console.log(`${tabel.padEnd(10)} menyalin ${selisih.length} baris: ${selisih.map(kunci).join(", ")}`);
  await tulis(tabel, selisih, konflik);
  totalDisalin += selisih.length;

  // Verifikasi ulang — "ditulis" belum tentu "tersimpan benar".
  const cek = cariSelisih(lama, await baca(NEW_URL, NEW_KEY, tabel, SCHEMA_BARU), kunci);
  if (cek.length) {
    throw new Error(`${tabel}: masih beda sesudah disalin -> ${cek.map(kunci).join(", ")}`);
  }
  console.log(`${" ".repeat(10)} terverifikasi cocok`);
}

console.log();
console.log(
  totalDisalin
    ? `Selesai: ${totalDisalin} baris disalin & diverifikasi.`
    : "Selesai: tidak ada selisih, kedua database sudah sama.",
);
