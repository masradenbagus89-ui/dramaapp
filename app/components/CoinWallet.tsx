"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readUser } from "@/lib/auth";
import {
  WALLET_EVENT,
  claimCheckin,
  fetchWallet,
  topup,
} from "@/lib/wallet";
import {
  CHECKIN_BONUS,
  COIN_PACKS,
  PAYWALL_ENABLED,
  REWARD_PER_AD,
  formatIDR,
} from "@/lib/coins";
import RewardedAdModal from "./RewardedAdModal";

export default function CoinWallet() {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [balance, setBalance] = useState(0);
  const [adOpen, setAdOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(
    null,
  );

  useEffect(() => {
    setMounted(true);
    const u = readUser();
    setEmail(u?.email ?? "");
    if (u?.email) fetchWallet().then((w) => setBalance(w.balance ?? 0)).catch(() => {});

    const onWallet = (e: Event) => {
      const detail = (e as CustomEvent).detail as { balance?: number };
      if (typeof detail?.balance === "number") setBalance(detail.balance);
    };
    window.addEventListener(WALLET_EVENT, onWallet);
    return () => window.removeEventListener(WALLET_EVENT, onWallet);
  }, []);

  const onCheckin = async () => {
    setBusy(true);
    setMsg(null);
    const { data } = await claimCheckin();
    if (data.ok) {
      setMsg({ type: "ok", text: `Check-in berhasil! +${CHECKIN_BONUS} koin.` });
    } else {
      setMsg({ type: "error", text: data.message ?? data.error ?? "Sudah check-in." });
    }
    setBusy(false);
  };

  const onTopup = async (packId: string) => {
    setBusy(true);
    setMsg(null);
    const { data } = await topup(packId);
    if (data.ok) {
      setMsg({
        type: "ok",
        text: data.demo
          ? `+${data.coins} koin (mode demo).`
          : `+${data.coins} koin.`,
      });
    } else {
      setMsg({ type: "error", text: data.error ?? "Top-up gagal." });
    }
    setBusy(false);
  };

  // Paywall mati → koin belum dipakai untuk apa pun, sembunyikan toko koin.
  if (!PAYWALL_ENABLED) return null;

  if (!mounted) return null;

  if (!email) {
    return (
      <div id="koin" className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="text-base font-semibold text-white">Koin Saya</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Masuk untuk mengumpulkan koin & membuka episode premium.
        </p>
        <Link
          href="/login"
          className="mt-3 inline-block rounded-full bg-amber-400 px-5 py-2 text-sm font-bold text-black hover:bg-amber-300"
        >
          Masuk
        </Link>
      </div>
    );
  }

  return (
    <div id="koin" className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">Koin Saya</h2>
        <span className="flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-sm font-bold text-amber-300">
          <span className="text-base">🪙</span> {balance}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={onCheckin}
          disabled={busy}
          className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3 text-left hover:border-amber-400 disabled:opacity-50"
        >
          <div className="text-sm font-semibold text-white">Check-in harian</div>
          <div className="text-xs text-amber-300">+{CHECKIN_BONUS} koin</div>
        </button>
        <button
          onClick={() => setAdOpen(true)}
          disabled={busy}
          className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3 text-left hover:border-amber-400 disabled:opacity-50"
        >
          <div className="text-sm font-semibold text-white">Nonton iklan</div>
          <div className="text-xs text-amber-300">+{REWARD_PER_AD} koin / iklan</div>
        </button>
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Beli koin
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {COIN_PACKS.map((p) => (
          <button
            key={p.id}
            onClick={() => onTopup(p.id)}
            disabled={busy}
            className="relative rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3 text-center hover:border-amber-400 disabled:opacity-50"
          >
            {p.badge && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-bold text-black">
                {p.badge}
              </span>
            )}
            <div className="text-lg font-black text-amber-300">{p.coins}</div>
            <div className="text-[10px] text-zinc-500">koin</div>
            <div className="mt-1 text-xs font-semibold text-white">
              {formatIDR(p.priceIDR)}
            </div>
          </button>
        ))}
      </div>

      {msg && (
        <div
          className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
            msg.type === "ok"
              ? "border-emerald-700 bg-emerald-900/30 text-emerald-300"
              : "border-red-700 bg-red-900/30 text-red-300"
          }`}
        >
          {msg.text}
        </div>
      )}

      <RewardedAdModal
        open={adOpen}
        onClose={() => setAdOpen(false)}
        onRewarded={(b) => setBalance(b)}
      />
    </div>
  );
}
