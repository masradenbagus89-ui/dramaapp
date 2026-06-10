"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readUser } from "@/lib/auth";
import { WALLET_EVENT, fetchWallet } from "@/lib/wallet";
import { PAYWALL_ENABLED } from "@/lib/coins";

// Chip saldo koin di nav. Tampil hanya untuk penonton login saat paywall aktif
// (admin nonton gratis → tidak perlu). Sinkron otomatis lewat WALLET_EVENT.
export default function CoinChip() {
  const [show, setShow] = useState(false);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (!PAYWALL_ENABLED) return;

    const load = () => {
      const u = readUser();
      if (!u?.email || u.role === "admin") {
        setShow(false);
        return;
      }
      setShow(true);
      fetchWallet()
        .then((w) => setBalance(w.balance ?? 0))
        .catch(() => {});
    };
    load();

    const onWallet = (e: Event) => {
      const d = (e as CustomEvent).detail as { balance?: number };
      if (typeof d?.balance === "number") setBalance(d.balance);
    };
    window.addEventListener(WALLET_EVENT, onWallet);
    window.addEventListener("dramaku:auth-changed", load);
    return () => {
      window.removeEventListener(WALLET_EVENT, onWallet);
      window.removeEventListener("dramaku:auth-changed", load);
    };
  }, []);

  if (!PAYWALL_ENABLED || !show) return null;

  return (
    <Link
      href="/profile#koin"
      title="Koin saya"
      className="flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-xs font-bold text-amber-300 transition-colors hover:bg-amber-400/20"
    >
      <span className="text-sm leading-none">🪙</span>
      <span>{balance}</span>
    </Link>
  );
}
