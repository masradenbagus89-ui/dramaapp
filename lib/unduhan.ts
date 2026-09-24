// -------------------------------------------------------------------------
// PROVIDER UNDUHAN per drama (Google Share / Telegram / Cast / Mega / ...) —
// disimpan TERPISAH dari tabel `dramas`, sebagai SATU dokumen di tabel
// `app_data` (key -> jsonb).
//
// UTANG TEKNIS YANG DISENGAJA — dicatat terbuka, bukan disembunyikan (§3.2).
// Bentuknya sama persis dengan lib/kualitas-drama.ts, karena sebabnya sama.
//
// Tempat yang BENAR untuk data ini adalah kolom `download_providers jsonb` di
// `dramaapp.dramas`: satu baris = satu drama, ikut terbawa tiap query.
//
// Kenapa TIDAK dipakai sekarang: menambah kolom butuh DDL (perintah pengubah
// struktur tabel) dan SEMUA jalur ke sana masih tertutup sejak 2026-09-22 —
// password database tidak berlaku, Supabase CLI tak terpasang, tak ada Personal
// Access Token, owner tak punya akses dashboard. PostgREST (jalur yang dipakai
// aplikasi) cuma bisa baca/tulis BARIS, bukan mengubah struktur — tapi ia BISA
// menulis tabel `app_data` yang sudah ada. Itu celah yang dipakai di sini.
//
// BATASNYA (jujur, supaya tak ada yang mengira ini gratis):
//   1. Tidak ada CHECK constraint di database. Satu-satunya pagar isinya adalah
//      `parseDownloadProviders` (lib/types.ts) — dan di sini pagar itu BUKAN
//      soal kerapian: alamat provider dipasang di atribut `href`, jadi
//      penyaring yang bocor berarti XSS. Karena itu tiap pembacaan di bawah
//      menyaring ULANG, bukan memercayai isi dokumen.
//   2. Satu pembacaan tambahan tiap pengambilan katalog. Ikut cache yang sama
//      (`revalidate`), jadi biayanya ~nol — TAPI pemanggil WAJIB mengoper
//      `revalidate`-nya; kalau tidak, SELURUH halaman pemanggil dibangun ulang
//      untuk tiap pengunjung (jebakan yang sudah tercatat di lib/supabase.ts).
//   3. Menghapus drama tidak otomatis membersihkan entri providernya; sisa
//      entri itu tak terpakai & tak terlihat (dibuang saat drama ber-id sama
//      dibuat lagi).
//
// CARA NAIK KELAS kalau akses database pulih: buat kolomnya, pindahkan isi
// dokumen ini ke sana, kembalikan `downloadProviders` ke `dramaToRow`/
// `rowToDrama` di lib/dramas.ts, lalu hapus berkas ini.
// -------------------------------------------------------------------------
import {
  parseDownloadProviders,
  type Drama,
  type DownloadProvider,
} from "./types";
import { eq, sbSelect, sbUpsert, useSupabase } from "./supabase";

/** Kunci dokumen di tabel `app_data`. Satu dokumen untuk SELURUH katalog. */
export const KUNCI_UNDUHAN = "unduhan";

/** Peta id drama -> daftar providernya. Drama yang belum diisi tak punya entri. */
export type PetaUnduhan = Record<string, DownloadProvider[]>;

/**
 * Saring dokumen mentah jadi peta yang sah.
 *
 * Isi dokumen diperlakukan sebagai DATA TAK-TEPERCAYA (lihat batas 1 di atas).
 * Entri yang daftarnya kosong setelah disaring TIDAK disimpan sebagai array
 * kosong — kunci yang ada tapi isinya nol akan membuat tombol DOWNLOAD membuka
 * modal kosong, padahal yang benar adalah jatuh ke perilaku unduh lama.
 */
export function bacaPetaUnduhan(raw: unknown): PetaUnduhan {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: PetaUnduhan = {};
  for (const [id, nilai] of Object.entries(raw as Record<string, unknown>)) {
    const daftar = parseDownloadProviders(nilai);
    if (daftar.length) out[id] = daftar;
  }
  return out;
}

/**
 * Tempelkan daftar provider ke katalog. Murni (tanpa jaringan) supaya bisa diuji.
 *
 * Dua mode dilayani satu fungsi: dengan Supabase datanya dari peta `app_data`;
 * mode file lokal (data/dramas.json) menyimpannya langsung di judulnya dan di
 * sana petanya memang kosong — itu arti urutan `?? d.downloadProviders`.
 *
 * Hasilnya SELALU lewat penyaring, termasuk yang sudah menempel di drama:
 * berkas JSON lokal pun bisa salah ketik, dan yang dipertaruhkan di sini alamat
 * yang akan dipasang di `href`. Daftar yang habis disaring dibuang dari objek,
 * bukan ditinggal sebagai array kosong.
 */
export function gabungUnduhan<T extends Drama>(
  dramas: T[],
  peta: PetaUnduhan,
): T[] {
  return dramas.map((d) => {
    const daftar = parseDownloadProviders(peta[d.id] ?? d.downloadProviders);
    if (daftar.length) return { ...d, downloadProviders: daftar };
    if (!d.downloadProviders) return d;
    const salinan = { ...d };
    delete salinan.downloadProviders;
    return salinan;
  });
}

/** Baca peta provider dari `app_data`. Mode file lokal memulangkan peta kosong. */
export async function ambilPetaUnduhan(
  opts: { revalidate?: number } = {},
): Promise<PetaUnduhan> {
  if (!useSupabase) return {};
  const rows = await sbSelect<{ value: unknown }>(
    `app_data?key=${eq(KUNCI_UNDUHAN)}&select=value&limit=1`,
    opts,
  );
  return rows.length ? bacaPetaUnduhan(rows[0].value) : {};
}

/**
 * Simpan/hapus daftar provider SATU drama.
 *
 * Daftar kosong = HAPUS entrinya (kembali "belum diisi"), bukan menyimpan array
 * kosong — lihat alasannya di `bacaPetaUnduhan`.
 *
 * BATAS JUJUR: baca-ubah-tulis pada SATU dokumen bersama. Dua admin yang
 * menyimpan drama berbeda dalam jeda milidetik yang sama bisa membuat satu
 * tulisan tertimpa. Sangat jarang (panel admin dipakai satu orang), dan pola
 * yang sama sudah dipakai dokumen `kualitas`/`comments`/`admins`. Hilang
 * sendiri begitu naik ke kolom asli.
 */
export async function simpanUnduhan(
  dramaId: string,
  providers: DownloadProvider[],
): Promise<void> {
  if (!useSupabase) return;
  const peta = await ambilPetaUnduhan();
  const bersih = parseDownloadProviders(providers);
  if (bersih.length) peta[dramaId] = bersih;
  else delete peta[dramaId];
  await sbUpsert("app_data", { key: KUNCI_UNDUHAN, value: peta }, "key");
}
