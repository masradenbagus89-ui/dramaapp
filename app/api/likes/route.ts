import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InteractionsFile = { likes: Record<string, number> };

const DATA_FILE = join(process.cwd(), "data", "interactions.json");

function readInteractions(): InteractionsFile {
  if (!existsSync(DATA_FILE)) return { likes: {} };
  try {
    const raw = readFileSync(DATA_FILE, "utf-8");
    const data = JSON.parse(raw);
    return { likes: data?.likes ?? {} };
  } catch {
    return { likes: {} };
  }
}

function writeInteractions(data: InteractionsFile): void {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET() {
  const data = readInteractions();
  return NextResponse.json(data);
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
    const data = readInteractions();
    const current = data.likes[dramaId] ?? 0;
    if (action === "unlike") {
      data.likes[dramaId] = Math.max(0, current - 1);
    } else {
      data.likes[dramaId] = current + 1;
    }
    writeInteractions(data);
    return NextResponse.json({ ok: true, dramaId, count: data.likes[dramaId] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Like gagal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
