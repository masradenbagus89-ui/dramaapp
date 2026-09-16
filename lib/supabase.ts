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

// Schema PostgREST yang dipakai app. Project Supabase saat ini
// (nvblmpkwyzbpdbshyvzw) dipakai bersama aplikasi lain, jadi tabel DramaApp
// sengaja ditaruh di schema `dramaapp` (bukan `public`) supaya tidak tabrakan.
// Header di bawah memberi tahu PostgREST schema mana yang dibaca — syaratnya
// schema itu sudah di-expose di Dashboard Supabase -> Settings -> API.
const SUPABASE_SCHEMA = "dramaapp";

/**
 * Bedakan setelan yang sengaja KOSONG dari yang RUSAK.
 *
 * Kosong = pilihan sadar: seluruh lib jatuh ke file JSON di data/ (mode dev).
 * Terisi-tapi-salah = salah ketik atau placeholder .env.example yang lupa
 * diganti. Yang kedua TIDAK boleh ikut jalur fallback: di produksi folder data/
 * read-only, jadi tiap tulisan gagal tanpa ada yang melapor — penonton melihat
 * situs "jalan" sementara komentar & koin menguap. Lebih baik berhenti di sini
 * dengan pesan yang menyebut langkah perbaikannya.
 *
 * Batasnya jujur: yang diperiksa cuma BENTUKNYA. Host yang salah ketik tapi
 * bentuknya sah (...dbshyvzw vs ...dbshyvzx) baru ketahuan saat request pertama.
 */
export function periksaSetelanSupabase(url: string, key: string): string | null {
  if (!url && !key) return null; // sengaja kosong = mode file lokal, sah

  if (!url || !key) {
    const terisi = url ? "SUPABASE_URL" : "SUPABASE_SERVICE_ROLE_KEY";
    const kosong = url ? "SUPABASE_SERVICE_ROLE_KEY" : "SUPABASE_URL";
    return `baru ${terisi} yang diisi, ${kosong} masih kosong`;
  }

  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return "SUPABASE_URL bukan alamat yang sah";
  }

  // http polos mengirim service_role key tanpa enkripsi — kunci yang menembus
  // RLS tidak boleh lewat jalur itu. localhost dikecualikan untuk Supabase yang
  // dijalankan di komputer sendiri.
  const lokal = u.hostname === "localhost" || u.hostname === "127.0.0.1";
  if (u.protocol !== "https:" && !lokal) {
    return "SUPABASE_URL harus https:// — http polos mengirim service_role key tanpa enkripsi";
  }

  // Dua placeholder bawaan .env.example: "xxxxxxxxxxxx.supabase.co" & "eyJhbGciOi..."
  if (/^x+$/i.test(u.hostname.split(".")[0])) {
    return "SUPABASE_URL masih placeholder contoh dari .env.example";
  }
  if (key.endsWith("...")) {
    return "SUPABASE_SERVICE_ROLE_KEY masih placeholder contoh dari .env.example";
  }

  return null;
}

const masalahSetelan = periksaSetelanSupabase(SUPABASE_URL, SUPABASE_KEY);
if (masalahSetelan) {
  throw new Error(
    `[supabase] Setelan database belum benar: ${masalahSetelan}. ` +
      "Perbaiki di .env.local (lokal) atau Vercel -> Settings -> Environment Variables " +
      "(produksi); nilainya ada di Supabase Dashboard -> Settings -> API. " +
      "Kalau memang mau jalan TANPA database (pakai file di data/), kosongkan KEDUA baris itu.",
  );
}

/** True kalau Supabase dikonfigurasi; kalau false, semua lib pakai file lokal. */
export const useSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);

function baseHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    // Accept-Profile = schema untuk request BACA (GET);
    // Content-Profile = schema untuk request TULIS (POST/DELETE). PostgREST
    // hanya memakai yang relevan, jadi aman dikirim dua-duanya.
    "Accept-Profile": SUPABASE_SCHEMA,
    "Content-Profile": SUPABASE_SCHEMA,
    ...extra,
  };
}

// --- Ketahanan jalur ke Supabase -----------------------------------------
// Angka-angka di bawah menjawab kejadian nyata 2026-09-16: server Supabase
// berhenti menjawab query, lalu SELURUH route /api yang menyentuh database
// balas 500 kosong setelah tepat 20 detik (batas jalan fungsi di Vercel).
// Tanpa batas waktu sendiri, kita mati di tengah jalan tanpa sempat memberi
// pesan; dengan batas ini kita yang menyerah baik-baik sambil menjelaskan.

/** Batas satu request ke Supabase — sengaja jauh di bawah batas fungsi Vercel. */
const BATAS_WAKTU_MS = 6_000;

/** 2 = sekali coba + sekali ulang. Terburuk ~12,3 detik, masih di bawah 20. */
const MAKS_COBA_BACA = 2;
const JEDA_ULANG_MS = 300;

/**
 * Status yang berarti "jalurnya sedang terganggu", bukan "permintaannya salah"
 * — hanya ini yang layak diulang. 520-524 = kode khusus Cloudflare (penjaga di
 * depan Supabase); 522 = Cloudflare menyerah menunggu Supabase menjawab.
 * 500 SENGAJA tidak masuk daftar: dari PostgREST itu umumnya query yang keliru,
 * jadi mengulangnya cuma membuang jatah waktu yang tersisa.
 */
const STATUS_LAYAK_ULANG = new Set([408, 429, 502, 503, 504, 520, 521, 522, 523, 524]);

/**
 * Pendekkan badan balasan error jadi satu baris yang masih bisa dibaca manusia.
 *
 * Kenapa perlu: saat Supabase tak menjawab, yang kembali BUKAN JSON melainkan
 * halaman HTML Cloudflare ribuan karakter. Sebelum perbaikan ini isi halaman
 * itu ikut terbawa utuh ke pesan error — masuk log, lalu tercetak mentah di
 * kotak merah halaman login sampai penonton tak tahu apa yang terjadi.
 */
export function ringkasBalasan(teks: string, maks = 200): string {
  const bersih = teks.trim();
  if (!bersih) return "(balasan kosong)";

  if (/^<(?:!doctype|html)/i.test(bersih)) {
    const judul = bersih.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();
    return judul
      ? `server membalas halaman error HTML: "${judul}"`
      : "server membalas halaman error HTML, bukan data";
  }

  return bersih.length > maks ? `${bersih.slice(0, maks)}…` : bersih;
}

async function ensureOk(res: Response, what: string): Promise<Response> {
  if (!res.ok) {
    throw new Error(
      `Supabase ${what} ${res.status}: ${ringkasBalasan(await res.text())}`,
    );
  }
  return res;
}

/**
 * Fetch untuk operasi BACA: berbatas waktu + satu kali ulang saat jalur
 * terganggu.
 *
 * SENGAJA hanya untuk baca. Operasi TULIS tidak boleh lewat sini: `coin_add`
 * dan `like_change` menambah nilai, sementara timeout tak pernah bisa
 * memastikan apakah server sudah terlanjur mengerjakannya — mengulangnya bisa
 * menambah koin dua kali. Membaca ulang tidak pernah merusak apa pun.
 */
async function ambilBaca(url: string, init: RequestInit): Promise<Response> {
  let sebab = "sebab tidak diketahui";

  for (let coba = 1; coba <= MAKS_COBA_BACA; coba++) {
    try {
      const res = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(BATAS_WAKTU_MS),
      });
      if (coba === MAKS_COBA_BACA || !STATUS_LAYAK_ULANG.has(res.status)) return res;

      // Body percobaan yang dibuang tetap dibaca supaya koneksinya dilepas.
      sebab = `status ${res.status} (${ringkasBalasan(await res.text().catch(() => ""), 80)})`;
    } catch (err) {
      // TimeoutError = batas waktu kita sendiri; sisanya = jaringan gagal.
      sebab = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      if (coba === MAKS_COBA_BACA) break;
    }
    await new Promise((lanjut) => setTimeout(lanjut, JEDA_ULANG_MS));
  }

  throw new Error(
    `Supabase tidak menjawab setelah ${MAKS_COBA_BACA} percobaan (${sebab}). ` +
      "Biasanya server database sedang bermasalah, bukan salah setelan.",
  );
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
  const res = await ambilBaca(`${SUPABASE_URL}/rest/v1/${query}`, {
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
