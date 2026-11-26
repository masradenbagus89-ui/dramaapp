// -------------------------------------------------------------------------
// Kumpulan dokumen ber-awalan di tabel `app_data` (key -> value jsonb).
//
// KENAPA ADA: fitur Live Chat & Laporan Video butuh BANYAK baris (satu per
// pesan / laporan), sementara tabel baru tak bisa dibuat (akses DDL tertutup
// sejak 2026-09-22, lihat supabase_migrations/2026-10-05_playly_link_unduhan.sql).
// Jalan keluarnya: satu dokumen app_data PER BARIS dengan kunci ber-awalan
// (`laporan-video:<id>`), lalu dibaca sekaligus lewat filter `like`.
//
// Satu dokumen per baris — BUKAN satu dokumen berisi array — supaya dua tulisan
// yang hampir bersamaan (member & admin mengirim pesan di detik yang sama)
// tidak saling menimpa: kuncinya berbeda, jadi tak ada yang ditulis ulang.
//
// ⚠️ UTANG TEKNIS (disengaja): urut & batas dikerjakan PostgREST atas isi JSON
// tanpa index, jadi makin lambat seiring jumlah baris. Cukup untuk ribuan baris.
// Begitu DDL pulih: pindah ke tabel sendiri ber-index (laporan_video,
// chat_pesan) — pemanggil cukup lewat lib/laporan-video.ts & lib/live-chat.ts,
// jadi hanya berkas ini yang perlu diganti.
//
// Tanpa Supabase (dev lokal) -> satu berkas data/kumpulan-dokumen.json.
// -------------------------------------------------------------------------
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { useSupabase, sbSelect, sbUpsert, eq } from "./supabase";

const BERKAS_LOKAL = "kumpulan-dokumen.json";

/**
 * Awalan & kunci hanya boleh huruf kecil, angka, `:` dan `-`.
 *
 * Bukan soal kerapian: filter `like` di Postgres memperlakukan `_` dan `%`
 * sebagai wildcard. Kunci ber-email (`chat:a_b@x.com`) akan ikut mencocokkan
 * `chat:aXb@x.com` — percakapan orang lain ikut terbaca. Karena itu email
 * TIDAK PERNAH dipakai langsung sebagai kunci (lib/live-chat.ts memakai hash).
 */
const POLA_KUNCI = /^[a-z0-9:-]+$/;

function pastikanKunci(kunci: string): void {
  if (!POLA_KUNCI.test(kunci)) {
    throw new Error(`[kumpulan-dokumen] kunci tidak sah: "${kunci}"`);
  }
}

type BerkasLokal = Record<string, unknown>;

function bacaLokal(): BerkasLokal {
  const p = join(process.cwd(), "data", BERKAS_LOKAL);
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, "utf-8")) as BerkasLokal;
  } catch {
    return {};
  }
}

function tulisLokal(isi: BerkasLokal): void {
  const p = join(process.cwd(), "data", BERKAS_LOKAL);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(isi, null, 2), "utf-8");
}

/** Simpan (buat atau timpa) satu dokumen. */
export async function simpanDokumen<T>(kunci: string, nilai: T): Promise<void> {
  pastikanKunci(kunci);
  if (useSupabase) {
    await sbUpsert("app_data", { key: kunci, value: nilai }, "key");
    return;
  }
  const isi = bacaLokal();
  isi[kunci] = nilai;
  tulisLokal(isi);
}

/** Satu dokumen, atau null kalau belum ada. */
export async function ambilDokumen<T>(kunci: string): Promise<T | null> {
  pastikanKunci(kunci);
  if (useSupabase) {
    const rows = await sbSelect<{ value: T }>(
      `app_data?key=${eq(kunci)}&select=value&limit=1`,
    );
    return rows.length ? rows[0].value : null;
  }
  return (bacaLokal()[kunci] as T | undefined) ?? null;
}

export type OpsiDaftar = {
  /** Nama field di dalam dokumen untuk mengurutkan (terbaru dulu). Isinya ISO string. */
  urutTurunBerdasar: string;
  /** Maksimum dokumen yang dikembalikan. */
  batas: number;
};

/** Semua dokumen yang kuncinya diawali `awalan`, terbaru dulu. */
export async function daftarDokumen<T>(
  awalan: string,
  opsi: OpsiDaftar,
): Promise<T[]> {
  pastikanKunci(awalan);
  if (!/^[a-zA-Z]+$/.test(opsi.urutTurunBerdasar)) {
    throw new Error(`[kumpulan-dokumen] field urut tidak sah: "${opsi.urutTurunBerdasar}"`);
  }
  const batas = Math.max(1, Math.floor(opsi.batas));

  if (useSupabase) {
    // `*` = wildcard versi PostgREST untuk like. Awalan sudah dijamin bebas
    // `_`/`%` oleh POLA_KUNCI, jadi yang cocok hanya awalan persis.
    const rows = await sbSelect<{ value: T }>(
      `app_data?key=like.${encodeURIComponent(awalan)}*&select=value` +
        `&order=value->>${opsi.urutTurunBerdasar}.desc&limit=${batas}`,
    );
    return rows.map((r) => r.value);
  }

  const field = opsi.urutTurunBerdasar;
  return Object.entries(bacaLokal())
    .filter(([k]) => k.startsWith(awalan))
    .map(([, v]) => v as T)
    .sort((a, b) =>
      String((b as Record<string, unknown>)[field] ?? "").localeCompare(
        String((a as Record<string, unknown>)[field] ?? ""),
      ),
    )
    .slice(0, batas);
}
