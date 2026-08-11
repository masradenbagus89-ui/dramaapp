import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/session";
import { fetchImdbDraft, isValidImdbId } from "@/lib/imdb-tool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint admin untuk mengambil draft drama dari IMDb lewat OMDb API.
 * Hanya admin yang login (cookie sesi terverifikasi) yang boleh pakai.
 *
 * Query: ?imdbId=tt19869990
 * Response: { ok: true, draft: { imdbId, slug, title, year, synopsis, ... } }
 */
export async function GET(req: NextRequest) {
  try {
    if (!(await isAdminRequest(req))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const imdbId = req.nextUrl.searchParams.get("imdbId");
    if (!imdbId || !isValidImdbId(imdbId)) {
      return NextResponse.json(
        { error: "ID IMDb tidak valid — contoh: tt19869990" },
        { status: 400 },
      );
    }

    const draft = await fetchImdbDraft(imdbId);
    return NextResponse.json({ ok: true, draft });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal mengambil data dari IMDb";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
