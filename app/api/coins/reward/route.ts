import { NextRequest, NextResponse } from "next/server";
import { addCoins, getBalance, getCoinMeta, setCoinMeta } from "@/lib/store";
import { resolveUserEmail } from "@/lib/session";
import { DAILY_AD_LIMIT, REWARD_PER_AD } from "@/lib/coins";
import { guardMutation } from "@/lib/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function today(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

// POST /api/coins/reward  { email? }
// Dipanggil setelah user menyelesaikan 1 iklan berhadiah. Ada kuota harian.
export async function POST(req: NextRequest) {
  const blocked = guardMutation(req, {
    bucket: "coins:reward",
    limit: 20,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const id = await resolveUserEmail(req, body.email);
  if (!id) {
    return NextResponse.json(
      { error: "Login dulu untuk dapat koin." },
      { status: 401 },
    );
  }

  const d = today();
  const meta = await getCoinMeta(id.email);
  const count = meta.adDate === d ? meta.adCount ?? 0 : 0;

  if (count >= DAILY_AD_LIMIT) {
    return NextResponse.json(
      {
        error: `Batas ${DAILY_AD_LIMIT} iklan/hari sudah tercapai. Coba lagi besok.`,
        balance: await getBalance(id.email),
        remaining: 0,
      },
      { status: 429 },
    );
  }

  const balance = await addCoins(id.email, REWARD_PER_AD);
  await setCoinMeta(id.email, { ...meta, adDate: d, adCount: count + 1 });

  return NextResponse.json({
    ok: true,
    reward: REWARD_PER_AD,
    balance,
    remaining: DAILY_AD_LIMIT - (count + 1),
  });
}
