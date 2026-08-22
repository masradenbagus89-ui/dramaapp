import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/session";
import { getVideoBaseUrl } from "@/lib/video-base";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    if (!(await isAdminRequest(req))) {
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

    const baseUrl = await getVideoBaseUrl();
    const agentSecret = process.env.HARDLINK_AGENT_SECRET;
    if (!baseUrl) {
      return NextResponse.json(
        {
          error:
            "Alamat sumber video belum ada. PC backup belum pernah melapor, dan NEXT_PUBLIC_VIDEO_BASE_URL juga kosong di env Vercel.",
        },
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

    const agentUrl = `${baseUrl}/_agent/hardlink`;
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
        // PENTING di sini: permintaan ini membawa header x-agent-secret. Kalau
        // redirect diikuti, rahasianya ikut terkirim ke host tujuan redirect.
        redirect: "manual",
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
