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

export async function POST(req: NextRequest) {
  try {
    const requesterEmail = req.headers.get("x-admin-email");
    if (!isRequesterAdmin(requesterEmail)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { dramaId?: string };
    const dramaId = body.dramaId?.trim();
    if (!dramaId) {
      return NextResponse.json({ error: "dramaId wajib." }, { status: 400 });
    }
    if (!/^[a-z0-9-]+$/.test(dramaId)) {
      return NextResponse.json(
        { error: "dramaId harus huruf kecil, angka, dan dash." },
        { status: 400 },
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_VIDEO_BASE_URL;
    const agentSecret = process.env.HARDLINK_AGENT_SECRET;
    if (!baseUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_VIDEO_BASE_URL belum di-set di Vercel env vars." },
        { status: 500 },
      );
    }
    if (!agentSecret) {
      return NextResponse.json(
        {
          error:
            "HARDLINK_AGENT_SECRET belum di-set di Vercel env vars. Set token yang sama dengan agent di PC backup.",
        },
        { status: 500 },
      );
    }

    const agentUrl = `${baseUrl.replace(/\/$/, "")}/_agent/hardlink`;
    let res: Response;
    try {
      res = await fetch(agentUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-agent-secret": agentSecret,
        },
        body: JSON.stringify({ dramaId }),
        cache: "no-store",
      });
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      return NextResponse.json(
        {
          error: `Tidak bisa connect ke hardlink-agent di PC backup: ${m}. Pastikan Node.js agent + Caddy (Caddyfile) + cloudflared semua jalan.`,
        },
        { status: 502 },
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Hardlink request gagal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
