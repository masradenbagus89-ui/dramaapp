import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRequesterAdmin(email: string | null): boolean {
  if (!email) return false;
  try {
    const path = join(process.cwd(), "data", "admins.json");
    const raw = readFileSync(path, "utf-8");
    const data = JSON.parse(raw) as { admins?: { email: string }[] };
    return (data.admins ?? []).some(
      (a) => a.email.trim().toLowerCase() === email.trim().toLowerCase(),
    );
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    const requesterEmail = req.headers.get("x-admin-email");
    if (!isRequesterAdmin(requesterEmail)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dramaId = searchParams.get("id")?.trim();
    if (!dramaId) {
      return NextResponse.json({ error: "Parameter 'id' wajib." }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_VIDEO_BASE_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_VIDEO_BASE_URL belum di-set di Vercel env vars." },
        { status: 500 },
      );
    }

    const folderUrl = `${baseUrl.replace(/\/$/, "")}/${encodeURIComponent(dramaId)}/`;
    let res: Response;
    try {
      res = await fetch(folderUrl, { cache: "no-store" });
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      return NextResponse.json(
        { error: `Tidak bisa fetch ${folderUrl}: ${m}. Pastikan Caddy + cloudflared masih jalan di PC backup.` },
        { status: 502 },
      );
    }
    if (!res.ok) {
      return NextResponse.json(
        { error: `Folder tidak ditemukan: ${folderUrl} (HTTP ${res.status}). Pastikan folder "${dramaId}" sudah dibuat di PC backup.` },
        { status: 404 },
      );
    }
    const html = await res.text();
    const matches = [...html.matchAll(/href="(?:\.\/)?(\d+)\.mp4"/g)];

    const epNums = matches
      .map((m) => parseInt(m[1], 10))
      .filter((n) => Number.isFinite(n));

    if (epNums.length === 0) {
      return NextResponse.json(
        {
          error: `Folder "${dramaId}" tidak punya file pattern <angka>.mp4. File harus dinamai "1.mp4", "2.mp4", dst.`,
          folderUrl,
        },
        { status: 404 },
      );
    }

    const uniq = Array.from(new Set(epNums)).sort((a, b) => a - b);
    const max = uniq[uniq.length - 1];
    const min = uniq[0];
    const missing: number[] = [];
    for (let i = 1; i <= max; i++) {
      if (!uniq.includes(i)) missing.push(i);
    }

    return NextResponse.json({
      ok: true,
      folderUrl,
      count: uniq.length,
      min,
      max,
      missing,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scan gagal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
