import { NextRequest, NextResponse } from "next/server";
import { incrementAdStat } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/ads/event { id, type: "view" | "click" } — catat impresi/klik iklan.
// Publik (cuma penghitung vanity untuk admin); tidak menyimpan data sensitif.
export async function POST(req: NextRequest) {
  let body: { id?: string; type?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }
  const id = (body.id ?? "").trim();
  const type = body.type === "click" ? "clicks" : body.type === "view" ? "views" : null;
  if (!id || !type) {
    return NextResponse.json({ error: "id & type wajib." }, { status: 400 });
  }
  await incrementAdStat(id, type);
  return NextResponse.json({ ok: true });
}
