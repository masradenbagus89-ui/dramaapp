// -------------------------------------------------------------------------
// GET /api/videos/:id — detail 1 video.
// Salin ke: app/api/videos/[id]/route.ts
// -------------------------------------------------------------------------
import { corsHeaders, handlePreflight } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// >>> SESUAIKAN DENGAN DATABASE-MU <<< (samakan dengan videos-route.ts)
const TABEL = "videos";
const KOLOM = "id,title,description,video_url,thumbnail_url,created_at";

function konfigSupabase() {
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY ?? "";
  return { url, key, siap: Boolean(url && key) };
}

export async function OPTIONS(req: Request) {
  return handlePreflight(req);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const cors = corsHeaders(req.headers.get("origin"));

  try {
    const { id } = await params; // Next.js 15/16: params berupa Promise

    // Batasi bentuk id sebelum dipakai — jangan pernah menyambung teks dari
    // luar langsung ke query.
    if (!id || !/^[\w-]{1,64}$/.test(id)) {
      return Response.json(
        { error: "Format id tidak valid." },
        { status: 400, headers: cors },
      );
    }

    const { url, key, siap } = konfigSupabase();
    if (!siap) {
      return Response.json(
        { error: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum di-set." },
        { status: 503, headers: cors },
      );
    }

    const query =
      `${TABEL}?id=eq.${encodeURIComponent(id)}` +
      `&select=${encodeURIComponent(KOLOM)}&limit=1`;

    const res = await fetch(`${url}/rest/v1/${query}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("[videos/:id] Supabase error:", res.status, await res.text());
      return Response.json(
        { error: "Gagal membaca detail video." },
        { status: 500, headers: cors },
      );
    }

    const rows = (await res.json()) as unknown[];
    if (rows.length === 0) {
      return Response.json(
        { error: "Video tidak ditemukan." },
        { status: 404, headers: cors },
      );
    }

    return Response.json(
      { ok: true, data: rows[0] },
      { status: 200, headers: cors },
    );
  } catch (err) {
    console.error("[videos/:id] error:", err);
    return Response.json(
      { error: "Gagal membaca detail video." },
      { status: 500, headers: cors },
    );
  }
}
