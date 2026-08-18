// -------------------------------------------------------------------------
// Klien Supabase minimal lewat PostgREST REST API — TANPA dependency tambahan
// (pola yang sama seperti akses Upstash REST sebelumnya: cukud `fetch`).
//
// Aktif kalau env Supabase di-set. Kalau tidak, lib lain (store.ts, dramas.ts)
// otomatis fallback ke file JSON lokal di folder data/ — jadi `npm run dev`
// tetap jalan tanpa Supabase.
//
// PENTING: pakai SERVICE ROLE key (server-side saja, JANGAN diekspos ke client).
// Service role mem-bypass RLS, jadi route server bisa baca/tulis bebas.
// -------------------------------------------------------------------------

const RAW_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_URL = RAW_URL.replace(/\/+$/, "");
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY ?? "";

/** True kalau Supabase dikonfigurasi; kalau false, semua lib pakai file lokal. */
export const useSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);

function baseHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function ensureOk(res: Response, what: string): Promise<Response> {
  if (!res.ok) {
    throw new Error(`Supabase ${what} ${res.status}: ${await res.text()}`);
  }
  return res;
}

/** Encode sebuah nilai jadi filter "eq.<value>" yang aman untuk PostgREST. */
export function eq(value: string): string {
  return `eq.${encodeURIComponent(value)}`;
}

/**
 * SELECT. `query` contoh: "dramas?id=eq.foo&select=*". Kembalikan array baris.
 *
 * Default TANPA cache — jalur tulis, admin, dan koin wajib melihat data terbaru;
 * membaca data basi di sana bisa menimpa perubahan orang lain atau memotong koin
 * berdasarkan harga lama. Halaman publik yang boleh sedikit basi harus MEMINTA
 * cache secara eksplisit lewat `revalidate` (satuan detik).
 *
 * Catatan Next.js: satu fetch `no-store` membuat SELURUH halaman jadi dinamis —
 * itu sebabnya opsi ini ada, bukan sekadar penghematan jaringan.
 */
export async function sbSelect<T>(
  query: string,
  opts: { revalidate?: number } = {},
): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
    headers: baseHeaders(),
    ...(opts.revalidate === undefined
      ? { cache: "no-store" as const }
      : { next: { revalidate: opts.revalidate } }),
  });
  await ensureOk(res, "select");
  return (await res.json()) as T[];
}

/** UPSERT (insert; on conflict pada kolom `conflict` -> merge). */
export async function sbUpsert<T>(
  table: string,
  rows: T | T[],
  conflict: string,
): Promise<void> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${conflict}`,
    {
      method: "POST",
      headers: baseHeaders({
        Prefer: "resolution=merge-duplicates,return=minimal",
      }),
      body: JSON.stringify(Array.isArray(rows) ? rows : [rows]),
      cache: "no-store",
    },
  );
  await ensureOk(res, "upsert");
}

/** DELETE baris yang cocok filter. `filter` contoh: "id=eq.foo". */
export async function sbDelete(table: string, filter: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: "DELETE",
    headers: baseHeaders({ Prefer: "return=minimal" }),
    cache: "no-store",
  });
  await ensureOk(res, "delete");
}

/** Panggil fungsi Postgres (RPC). Mengembalikan hasil JSON-nya apa adanya. */
export async function sbRpc<T>(
  fn: string,
  args: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: baseHeaders(),
    body: JSON.stringify(args),
    cache: "no-store",
  });
  await ensureOk(res, `rpc ${fn}`);
  return (await res.json()) as T;
}
