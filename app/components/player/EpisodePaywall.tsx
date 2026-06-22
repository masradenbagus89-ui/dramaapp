"use client";

// Layar "Episode terkunci" (paywall) di pemutar: muncul saat episode premium
// belum dibuka. Dipisah dari FeedPlayer.tsx. Data (nomor episode, email, saldo,
// status) + aksi (buka, nonton iklan) disuplai induk lewat prop; konstanta koin
// diimpor sendiri. Tampilan & perilaku sama persis seperti versi sebelumnya.
import Link from "next/link";
import { COIN_PER_EPISODE, FREE_EPISODES, REWARD_PER_AD } from "@/lib/coins";

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
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 018 0v4" />
          </svg>
        </div>
        <h2 className="mt-3 text-lg font-bold text-white">
          Episode {episodeNumber} terkunci
        </h2>
        <p className="mt-1 text-xs text-zinc-400">
          Episode 1–{FREE_EPISODES} gratis. Buka episode ini dengan {COIN_PER_EPISODE} koin.
        </p>

        {email ? (
          <>
            <p className="mt-3 text-sm text-zinc-200">
              Saldo kamu: <span className="font-bold text-amber-400">{balance} koin</span>
            </p>
            <button
              onClick={onUnlock}
              disabled={unlocking || balance < COIN_PER_EPISODE}
              className="mt-3 w-full rounded-full bg-amber-400 py-2.5 text-sm font-bold text-black hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {unlocking ? "Membuka…" : `🔓 Buka • ${COIN_PER_EPISODE} koin`}
            </button>
            <button
              onClick={onWatchAd}
              className="mt-2 w-full rounded-full border border-amber-400/60 bg-amber-400/10 py-2.5 text-sm font-semibold text-amber-300 hover:bg-amber-400/20"
            >
              🎬 Nonton iklan +{REWARD_PER_AD} koin
            </button>
            <Link
              href="/profile#koin"
              className="mt-2 inline-block text-xs text-zinc-400 underline hover:text-zinc-200"
            >
              Beli koin
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="mt-4 inline-block w-full rounded-full bg-amber-400 py-2.5 text-sm font-bold text-black hover:bg-amber-300"
            >
              Masuk untuk lanjut nonton
            </Link>
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
