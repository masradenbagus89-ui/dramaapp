"use client";

// Layar "Episode terkunci" (paywall) di pemutar: muncul saat episode premium
// belum dibuka. Dipisah dari FeedPlayer.tsx. Data (nomor episode, email, saldo,
// status) + aksi (buka, nonton iklan) disuplai induk lewat prop; konstanta koin
// diimpor sendiri. Tampilan & perilaku sama persis seperti versi sebelumnya.
import Link from "next/link";
import { Lock, LockOpen, Clapperboard, Coins } from "lucide-react";
import { COIN_PER_EPISODE, FREE_EPISODES, REWARD_PER_AD } from "@/lib/coins";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function EpisodePaywall({
  episodeNumber,
  email,
  balance,
  unlocking,
  payMsg,
  onUnlock,
  onWatchAd,
}: {
  episodeNumber: number;
  email: string;
  balance: number;
  unlocking: boolean;
  payMsg: string | null;
  onUnlock: () => void;
  onWatchAd: () => void;
}) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 px-6">
      <div className="w-full max-w-xs text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-400/15 text-amber-300">
          <Lock className="h-7 w-7" />
        </div>
        <h2 className="mt-3 text-lg font-bold text-white">
          Episode {episodeNumber} terkunci
        </h2>
        <p className="mt-1 text-xs text-zinc-400">
          Episode 1–{FREE_EPISODES} gratis. Buka episode ini dengan {COIN_PER_EPISODE} koin.
        </p>

        {email ? (
          <>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-zinc-200">
              Saldo kamu:
              <Badge className="gap-1 bg-amber-400/20 text-amber-300">
                <Coins className="h-3 w-3" />
                {balance} koin
              </Badge>
            </p>
            <Button
              onClick={onUnlock}
              disabled={unlocking || balance < COIN_PER_EPISODE}
              className="mt-3 w-full rounded-full py-2.5 text-sm font-bold hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {unlocking ? (
                "Membuka…"
              ) : (
                <>
                  <LockOpen className="h-4 w-4" />
                  Buka • {COIN_PER_EPISODE} koin
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onWatchAd}
              className="mt-2 w-full rounded-full border-amber-400/60 bg-amber-400/10 py-2.5 text-sm font-semibold text-amber-300 hover:bg-amber-400/20 hover:text-amber-200"
            >
              <Clapperboard className="h-4 w-4" />
              Nonton iklan +{REWARD_PER_AD} koin
            </Button>
            <Link
              href="/profile#koin"
              className="mt-2 inline-block text-xs text-zinc-400 underline hover:text-zinc-200"
            >
              Beli koin
            </Link>
          </>
        ) : (
          <>
            <Button
              asChild
              className="mt-4 w-full rounded-full py-2.5 text-sm font-bold hover:bg-amber-300"
            >
              <Link href="/login">Masuk untuk lanjut nonton</Link>
            </Button>
            <p className="mt-2 text-[11px] text-zinc-500">
              Gratis daftar — dapat koin dari check-in & nonton iklan.
            </p>
          </>
        )}

        {payMsg && <p className="mt-3 text-xs text-rose-400">{payMsg}</p>}
      </div>
    </div>
  );
}
