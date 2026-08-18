import { NextRequest, NextResponse } from "next/server";
import { addCoins, getBalance, getCoinMeta, setCoinMeta } from "@/lib/store";
import { resolveUserEmail } from "@/lib/session";
import { CHECKIN_BONUS } from "@/lib/coins";
import { guardMutation } from "@/lib/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// POST /api/coins/checkin  { email? }
// Bonus koin sekali per hari (mendorong user kembali tiap hari).
export async function POST(req: NextRequest) {
  const blocked = guardMutation(req, {
    bucket: "coins:checkin",
    limit: 10,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const id = await resolveUserEmail(req);
  if (!id) {
    return NextResponse.json({ error: "Login dulu." }, { status: 401 });
  }

  const d = today();
  const meta = await getCoinMeta(id.email);
  if (meta.lastCheckin === d) {
    return NextResponse.json({
      ok: false,
      already: true,
      balance: await getBalance(id.email),
      message: "Kamu sudah check-in hari ini. Balik lagi besok ya!",
    });
  }

  const balance = await addCoins(id.email, CHECKIN_BONUS);
  await setCoinMeta(id.email, { ...meta, lastCheckin: d });

  return NextResponse.json({ ok: true, bonus: CHECKIN_BONUS, balance });
}
