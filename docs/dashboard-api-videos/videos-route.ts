// -------------------------------------------------------------------------
// GET /api/videos — daftar semua video. Salin ke: app/api/videos/route.ts
//
// Membaca tabel Supabase lewat REST (PostgREST) memakai fetch bawaan, jadi
// TIDAK butuh paket tambahan. Kalau dashboard-mu sudah memakai
// @supabase/supabase-js, silakan ganti bagian query-nya — bentuk balasannya
// yang penting tetap sama.
// -------------------------------------------------------------------------
import { corsHeaders, handlePreflight } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// >>> SESUAIKAN DENGAN DATABASE-MU <<<
const TABEL = "videos";
const KOLOM = "id,title,description,video_url,thumbnail_url,created_at";
const KOLOM_URUT = "created_at.desc"; // terbaru di atas
const LIMIT_MAKS = 100;

function konfigSupabase() {
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY ?? "";
  return { url, key, siap: Boolean(url && key) };
}

export async function OPTIONS(req: Request) {
  return handlePreflight(req);
}

export async function GET(req: Request) {
  const cors = corsHeaders(req.headers.get("origin"));

  try {
    const { url, key, siap } = konfigSupabase();
    if (!siap) {
      return Response.json(
        { error: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum di-set." },
        { status: 503, headers: cors },
      );
    }

    // Batas jumlah: satu permintaan tidak boleh menarik ribuan baris sekaligus.
    const query =
      `${TABEL}?select=${encodeURIComponent(KOLOM)}` +
      `&order=${encodeURIComponent(KOLOM_URUT)}` +
      `&limit=${LIMIT_MAKS}`;

    const res = await fetch(`${url}/rest/v1/${query}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      // Pesan asli Supabase TIDAK diteruskan ke publik — bisa membocorkan
      // nama kolom/struktur database. Cukup dicatat di log server.
      console.error("[videos] Supabase error:", res.status, await res.text());
      return Response.json(
        { error: "Gagal membaca daftar video." },
        { status: 500, headers: cors },
      );
    }

    const rows = (await res.json()) as unknown[];

    return Response.json(
      { ok: true, count: rows.length, data: rows },
      { status: 200, headers: cors },
    );
  } catch (err) {
    console.error("[videos] error:", err);
    return Response.json(
      { error: "Gagal membaca daftar video." },
      { status: 500, headers: cors },
    );
  }
}
