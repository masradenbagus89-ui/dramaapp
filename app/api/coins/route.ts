import { NextRequest, NextResponse } from "next/server";
import { getBalance, getUnlocks } from "@/lib/store";
import { resolveUserEmail } from "@/lib/session";
import {
  COIN_PER_EPISODE,
  FREE_EPISODES,
  REWARD_PER_AD,
  CHECKIN_BONUS,
  DAILY_AD_LIMIT,
} from "@/lib/coins";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONFIG = {
  freeEpisodes: FREE_EPISODES,
  coinPerEpisode: COIN_PER_EPISODE,
  rewardPerAd: REWARD_PER_AD,
  checkinBonus: CHECKIN_BONUS,
  dailyAdLimit: DAILY_AD_LIMIT,
};

// GET /api/coins?email=...&dramaId=...
// Status wallet user: saldo + episode yang sudah dibuka untuk satu drama.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = await resolveUserEmail(req);

  if (!id) {
    return NextResponse.json({
      ok: true,
      loggedIn: false,
      isAdmin: false,
      balance: 0,
      unlockedEps: [],
      config: CONFIG,
    });
  }

  const dramaId = searchParams.get("dramaId")?.trim();
  const [balance, unlocks] = await Promise.all([
    getBalance(id.email),
    getUnlocks(id.email),
  ]);

  const prefix = dramaId ? `${dramaId}:` : null;
  const unlockedEps = prefix
    ? unlocks
        .filter((t) => t.startsWith(prefix))
        .map((t) => Number(t.slice(prefix.length)))
        .filter((n) => Number.isFinite(n))
    : [];

  return NextResponse.json({
    ok: true,
    loggedIn: true,
    isAdmin: id.isAdmin,
    balance,
    unlockedEps,
    config: CONFIG,
  });
}
