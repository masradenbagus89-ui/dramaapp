// -------------------------------------------------------------------------
// Penyimpanan SEO isian admin per drama — SATU dokumen di tabel `app_data`
// (key -> jsonb), BUKAN kolom tabel `dramas`.
//
// ⚠️ UTANG TEKNIS YANG DISENGAJA — alasannya sama persis dengan
// lib/kualitas-drama.ts: menambah kolom butuh DDL, dan jalur DDL tidak tersedia
// bagi yang mengerjakan fitur ini. `app_data` sudah ada & bisa ditulis lewat
// PostgREST, jadi fitur ini tayang TANPA SQL migrasi. Batasnya pun sama:
// tanpa constraint di database (tiap baca disaring ulang), satu pembacaan
// tambahan per katalog (ikut cache), entri drama terhapus tertinggal tak
// terpakai, dan baca-ubah-tulis pada satu dokumen bersama.
//
// CARA NAIK KELAS: kolom `seo_title/seo_description/seo_keywords` di
// `dramaapp.dramas`, pindahkan isi dokumen ini, lalu hapus berkas ini.
// -------------------------------------------------------------------------
import type { Drama, SeoDrama } from "./types";
import { parseSeoDrama } from "./seo-drama";
import { eq, sbSelect, sbUpsert, useSupabase } from "./supabase";

export const KUNCI_SEO = "seo";

export type PetaSeo = Record<string, SeoDrama>;

/** Saring dokumen mentah jadi peta yang sah (isinya data tak-tepercaya). */
export function bacaPetaSeo(raw: unknown): PetaSeo {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: PetaSeo = {};
  for (const [id, nilai] of Object.entries(raw as Record<string, unknown>)) {
    const seo = parseSeoDrama(nilai);
    if (seo) out[id] = seo;
  }
  return out;
}

/**
 * Tempelkan SEO ke daftar drama. Mode file lokal menyimpan `seo` langsung di
 * judulnya (petanya kosong) — itu arti `?? d.seo`. Hasil selalu disaring.
 */
export function gabungSeo<T extends Drama>(dramas: T[], peta: PetaSeo): T[] {
  return dramas.map((d) => {
    const seo = parseSeoDrama(peta[d.id] ?? d.seo);
    if (seo) return { ...d, seo };
    if (!d.seo) return d;
    const salinan = { ...d };
    delete salinan.seo;
    return salinan;
  });
}

/** Baca peta SEO dari `app_data`. Mode file lokal memulangkan peta kosong. */
export async function ambilPetaSeo(
  opts: { revalidate?: number } = {},
): Promise<PetaSeo> {
  if (!useSupabase) return {};
  const rows = await sbSelect<{ value: unknown }>(
    `app_data?key=${eq(KUNCI_SEO)}&select=value&limit=1`,
    opts,
  );
  return rows.length ? bacaPetaSeo(rows[0].value) : {};
}

/** Simpan/hapus SEO SATU drama. `undefined` = hapus entri (kembali otomatis). */
export async function simpanSeo(dramaId: string, seo: SeoDrama | undefined): Promise<void> {
  if (!useSupabase) return;
  const peta = await ambilPetaSeo();
  if (seo) peta[dramaId] = seo;
  else delete peta[dramaId];
  await sbUpsert("app_data", { key: KUNCI_SEO, value: peta }, "key");
}
