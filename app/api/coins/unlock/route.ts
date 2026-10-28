import { NextRequest, NextResponse } from "next/server";
import { getBalance, spendUnlock } from "@/lib/store";
import { resolveUserEmail } from "@/lib/session";
import { getDrama } from "@/lib/dramas";
import { COIN_PER_EPISODE, isFreeEpisode, unlockToken } from "@/lib/coins";
import { guardFitur, guardMutation } from "@/lib/request-guard";
import { PAYWALL_ENABLED } from "@/lib/saklar-fitur";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/coins/unlock  { email?, dramaId, ep }
// Buka 1 episode terkunci dengan koin. Idempoten & atomik.
export async function POST(req: NextRequest) {
  // Fitur ini sedang DIJEDA lewat saklar di lib/saklar-fitur.ts. Digerbang di
  // route juga — bukan cuma disembunyikan di layar — karena alamat API tetap
  // bisa dipanggil langsung oleh siapa pun yang tahu namanya.
  const mati = guardFitur(PAYWALL_ENABLED, "koin");
  if (mati) return mati;
  const blocked = guardMutation(req, {
    bucket: "coins:unlock",
    limit: 30,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  let body: { email?: string; dramaId?: string; ep?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const id = await resolveUserEmail(req);
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

  // Admin nonton gratis; episode awal gratis; drama non-premium SELALU gratis.
  const drama = await getDrama(dramaId);
  if (id.isAdmin || !drama?.premium || isFreeEpisode(ep)) {
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
