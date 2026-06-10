import { NextRequest, NextResponse } from "next/server";
import { getBalance, spendUnlock } from "@/lib/store";
import { resolveUserEmail } from "@/lib/session";
import { COIN_PER_EPISODE, isFreeEpisode, unlockToken } from "@/lib/coins";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/coins/unlock  { email?, dramaId, ep }
// Buka 1 episode terkunci dengan koin. Idempoten & atomik.
export async function POST(req: NextRequest) {
  let body: { email?: string; dramaId?: string; ep?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const id = await resolveUserEmail(req, body.email);
  if (!id) {
    return NextResponse.json(
      { error: "Login dulu untuk membuka episode." },
      { status: 401 },
    );
  }

  const dramaId = body.dramaId?.trim();
  const ep = Number(body.ep);
  if (!dramaId || !Number.isInteger(ep) || ep < 1) {
    return NextResponse.json(
      { error: "dramaId & ep wajib valid." },
      { status: 400 },
    );
  }

  // Admin nonton gratis; episode awal juga gratis.
  if (id.isAdmin || isFreeEpisode(ep)) {
    return NextResponse.json({
      ok: true,
      unlocked: true,
      free: true,
      balance: await getBalance(id.email),
    });
  }

  const res = await spendUnlock(
    id.email,
    unlockToken(dramaId, ep),
    COIN_PER_EPISODE,
  );
  if (!res.ok) {
    return NextResponse.json(
      {
        error: "Koin tidak cukup.",
        balance: res.balance,
        needed: COIN_PER_EPISODE,
      },
      { status: 402 },
    );
  }

  return NextResponse.json({ ok: true, unlocked: true, balance: res.balance });
}
