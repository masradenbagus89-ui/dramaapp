// -------------------------------------------------------------------------
// KUALITAS VIDEO per drama (CAM / HD / WEB-DL / ...) — disimpan TERPISAH dari
// tabel `dramas`, sebagai SATU dokumen di tabel `app_data` (key -> jsonb).
//
// ⚠️ UTANG TEKNIS YANG DISENGAJA — dicatat terbuka, bukan disembunyikan (§3.2).
//
// Tempat yang BENAR untuk data ini adalah kolom `quality` di `dramaapp.dramas`:
// satu baris = satu drama, ikut terbawa tiap query, dijaga CHECK constraint di
// level database. Berkas SQL-nya sudah ditulis dan siap pakai:
//   supabase_migrations/add_quality_to_dramas.sql
//
// Kenapa TIDAK dipakai sekarang: menambah kolom butuh DDL (perintah pengubah
// struktur tabel), dan SEMUA jalur ke sana tertutup pada 2026-09-22 —
//   - password database di Downloads/password.txt sudah tidak berlaku
//     ("password authentication failed"), padahal sesi 2026-09-07 masih memakai
//     jalur itu untuk menambah kolom `status`;
//   - Supabase CLI tidak terpasang & tidak ada Personal Access Token;
//   - owner tidak punya akses dashboard Supabase.
// PostgREST (jalur yang dipakai aplikasi) hanya bisa baca/tulis BARIS, bukan
// mengubah struktur. Tapi ia BISA menulis tabel `app_data` yang sudah ada —
// itulah celah yang dipakai di sini.
//
// BATASNYA (jujur, supaya tak ada yang mengira ini gratis):
//   1. Tidak ada CHECK constraint di database. Penjaga nilainya cuma di kode
//      (`parseDramaQuality`), jadi tulisan dari alat LAIN tidak tersaring.
//      Karena itu tiap pembacaan di bawah menyaring ulang, bukan percaya isi.
//   2. Satu pembacaan tambahan per pengambilan katalog. Ikut cache yang sama
//      (`revalidate`), jadi biayanya ~nol — TAPI pemanggil WAJIB mengoper
//      `revalidate`-nya, kalau tidak seluruh halaman jadi dibangun ulang tiap
//      pengunjung (jebakan yang sudah tercatat di lib/supabase.ts).
//   3. Menghapus drama tidak otomatis membersihkan entri kualitasnya; sisa
//      entri itu tak terpakai dan tak terlihat (dibuang saat drama ber-id sama
//      dibuat lagi).
//
// CARA NAIK KELAS kalau akses database pulih: jalankan berkas SQL di atas,
// pindahkan isi dokumen ini ke kolomnya, lalu kembalikan `quality` ke
// `dramaToRow`/`rowToDrama` di lib/dramas.ts dan hapus berkas ini.
// -------------------------------------------------------------------------
import { parseDramaQuality, type Drama, type DramaQuality } from "./types";
import { eq, sbSelect, sbUpsert, useSupabase } from "./supabase";

/** Kunci dokumen di tabel `app_data`. Satu dokumen untuk SELURUH katalog. */
export const KUNCI_KUALITAS = "kualitas";

/** Peta id drama -> kualitasnya. Drama yang belum diisi tidak punya entri. */
export type PetaKualitas = Record<string, DramaQuality>;

/**
 * Saring dokumen mentah jadi peta yang sah.
 *
 * Isi dokumen diperlakukan sebagai DATA TAK-TEPERCAYA: tidak ada constraint di
 * database yang menjaganya (lihat batas 1 di atas), jadi nilai di luar daftar
 * resmi DIBUANG di sini — poster lebih baik tanpa label daripada memajang label
 * ngawur yang dipercaya penonton.
 */
export function bacaPetaKualitas(raw: unknown): PetaKualitas {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: PetaKualitas = {};
  for (const [id, nilai] of Object.entries(raw as Record<string, unknown>)) {
    const q = parseDramaQuality(nilai);
    if (q) out[id] = q;
  }
  return out;
}

/**
 * Tempelkan kualitas ke daftar drama. Murni (tanpa jaringan) supaya bisa diuji.
 *
 * Kualitas yang SUDAH menempel di drama TIDAK ditimpa: mode file lokal
 * (data/dramas.json) menyimpan `quality` langsung di judulnya, dan di sana peta
 * ini memang kosong. Urutan `?? d.quality` membuat satu fungsi melayani kedua
 * mode tanpa percabangan di pemanggil.
 */
export function gabungKualitas<T extends Drama>(dramas: T[], peta: PetaKualitas): T[] {
  return dramas.map((d) => {
    const q = peta[d.id] ?? d.quality;
    return q ? { ...d, quality: q } : d;
  });
}

/** Baca peta kualitas dari `app_data`. Mode file lokal memulangkan peta kosong. */
export async function ambilPetaKualitas(
  opts: { revalidate?: number } = {},
): Promise<PetaKualitas> {
  if (!useSupabase) return {};
  const rows = await sbSelect<{ value: unknown }>(
    `app_data?key=${eq(KUNCI_KUALITAS)}&select=value&limit=1`,
    opts,
  );
  return rows.length ? bacaPetaKualitas(rows[0].value) : {};
}

/**
 * Simpan/hapus kualitas SATU drama.
 *
 * `undefined` = hapus entrinya (kembali "belum diisi"), bukan menyimpan nilai
 * kosong — entri kosong akan lolos pembacaan lalu tergambar sebagai lencana
 * tanpa tulisan.
 *
 * BATAS JUJUR: baca-ubah-tulis pada SATU dokumen bersama. Dua admin yang
 * menyimpan drama berbeda dalam jeda milidetik yang sama bisa membuat satu
 * tulisan tertimpa. Sangat jarang (panel admin dipakai satu orang), dan pola
 * yang sama sudah dipakai dokumen `comments`/`admins` di lib/store.ts. Hilang
 * sendiri begitu naik ke kolom asli.
 */
export async function simpanKualitas(
  dramaId: string,
  kualitas: DramaQuality | undefined,
): Promise<void> {
  if (!useSupabase) return;
  const peta = await ambilPetaKualitas();
  if (kualitas) peta[dramaId] = kualitas;
  else delete peta[dramaId];
  await sbUpsert("app_data", { key: KUNCI_KUALITAS, value: peta }, "key");
}
