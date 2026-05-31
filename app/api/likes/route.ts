import { NextRequest, NextResponse } from "next/server";
import { getLikes, changeLike } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const likes = await getLikes();
  return NextResponse.json({ likes });
}

export async function POST(req: NextRequest) {
  try {
    const { dramaId, action } = (await req.json()) as {
      dramaId?: string;
      action?: "like" | "unlike";
    };
    if (!dramaId) {
      return NextResponse.json({ error: "dramaId wajib." }, { status: 400 });
    }
    const count = await changeLike(dramaId, action === "unlike" ? "unlike" : "like");
    return NextResponse.json({ ok: true, dramaId, count });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Like gagal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
