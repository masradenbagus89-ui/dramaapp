"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readUser } from "@/lib/auth";
import {
  WALLET_EVENT,
  claimCheckin,
  fetchCoinHistory,
  fetchWallet,
  topup,
  type CoinHistoryItem,
} from "@/lib/wallet";
import {
  CHECKIN_BONUS,
  COIN_PACKS,
  PAYWALL_ENABLED,
  REWARD_PER_AD,
  formatIDR,
} from "@/lib/coins";
import RewardedAdModal from "./RewardedAdModal";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type SnapCallbacks = {
  onSuccess?: () => void;
  onPending?: () => void;
  onError?: () => void;
  onClose?: () => void;
};
type SnapApi = { pay: (token: string, cb?: SnapCallbacks) => void };

// Muat snap.js sekali. URL & client key datang dari server (sandbox/prod).
function loadSnap(url: string, clientKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    const w = window as unknown as { snap?: SnapApi };
    if (w.snap) return resolve();
    const existing = document.getElementById(
      "midtrans-snap",
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("load error")));
      return;
    }
    const s = document.createElement("script");
    s.id = "midtrans-snap";
    s.src = url;
    s.setAttribute("data-client-key", clientKey);
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("load error"));
    document.body.appendChild(s);
  });
}

export default function CoinWallet() {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<CoinHistoryItem[]>([]);
  const [adOpen, setAdOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(
    null,
  );

  const loadHistory = () => {
    fetchCoinHistory()
      .then((h) => setHistory(h.history ?? []))
      .catch(() => setHistory([]));
  };

  useEffect(() => {
    setMounted(true);
    const u = readUser();
    setEmail(u?.email ?? "");
    if (u?.email) {
      fetchWallet().then((w) => setBalance(w.balance ?? 0)).catch(() => {});
      loadHistory();
    }

    const onWallet = (e: Event) => {
      const detail = (e as CustomEvent).detail as { balance?: number };
      if (typeof detail?.balance === "number") setBalance(detail.balance);
      loadHistory();
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

  const refreshBalance = () => {
    fetchWallet().then((w) => setBalance(w.balance ?? 0)).catch(() => {});
    // Koin masuk lewat webhook yang bisa telat sedikit → cek ulang.
    window.setTimeout(
      () => fetchWallet().then((w) => setBalance(w.balance ?? 0)).catch(() => {}),
      4000,
    );
  };

  const onTopup = async (packId: string) => {
    setBusy(true);
    setMsg(null);
    const { data } = await topup(packId);

    // Jalur Midtrans: buka popup pembayaran.
    if (data.mode === "midtrans" && data.token) {
      try {
        await loadSnap(data.snapUrl ?? "", data.clientKey ?? "");
      } catch {
        setMsg({ type: "error", text: "Gagal memuat pembayaran Midtrans." });
        setBusy(false);
        return;
      }
      const snap = (window as unknown as { snap?: SnapApi }).snap;
      if (!snap) {
        setMsg({ type: "error", text: "Midtrans belum siap. Coba lagi." });
        setBusy(false);
        return;
      }
      snap.pay(data.token, {
        onSuccess: () => {
          setMsg({ type: "ok", text: "Pembayaran berhasil! Koin masuk sebentar lagi." });
          refreshBalance();
        },
        onPending: () => setMsg({ type: "ok", text: "Menunggu pembayaran kamu…" }),
        onError: () => setMsg({ type: "error", text: "Pembayaran gagal." }),
        onClose: () => setMsg({ type: "error", text: "Pembayaran dibatalkan." }),
      });
      setBusy(false);
      return;
    }

    // Jalur demo (tanpa Midtrans).
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
      <Card id="koin" className="mt-6 gap-3 border-zinc-800 bg-zinc-900/50 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-base text-white">Koin Saya</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <p className="text-sm text-zinc-400">
            Masuk untuk mengumpulkan koin & membuka episode premium.
          </p>
          <Button
            asChild
            className="mt-3 rounded-full bg-amber-400 font-bold text-black hover:bg-amber-300"
          >
            <Link href="/login">Masuk</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="koin" className="mt-6 gap-3 border-zinc-800 bg-zinc-900/50 py-4">
      <CardHeader className="flex-row items-center justify-between px-4">
        <CardTitle className="text-base text-white">Koin Saya</CardTitle>
        <Badge className="gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-sm font-bold text-amber-300">
          <span className="text-base">🪙</span> {balance}
        </Badge>
      </CardHeader>
      <CardContent className="px-4">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCheckin}
            disabled={busy}
            className="h-auto flex-col items-start gap-0 rounded-xl border-zinc-700 bg-zinc-900 px-3 py-3 text-left hover:border-amber-400 hover:bg-zinc-900"
          >
            <div className="text-sm font-semibold text-white">Check-in harian</div>
            <div className="text-xs text-amber-300">+{CHECKIN_BONUS} koin</div>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setAdOpen(true)}
            disabled={busy}
            className="h-auto flex-col items-start gap-0 rounded-xl border-zinc-700 bg-zinc-900 px-3 py-3 text-left hover:border-amber-400 hover:bg-zinc-900"
          >
            <div className="text-sm font-semibold text-white">Nonton iklan</div>
            <div className="text-xs text-amber-300">+{REWARD_PER_AD} koin / iklan</div>
          </Button>
        </div>

        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Beli koin
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {COIN_PACKS.map((p) => (
            <Button
              key={p.id}
              type="button"
              variant="outline"
              onClick={() => onTopup(p.id)}
              disabled={busy}
              className="relative h-auto flex-col gap-0 overflow-visible rounded-xl border-zinc-700 bg-zinc-900 px-3 py-3 text-center hover:border-amber-400 hover:bg-zinc-900"
            >
              {p.badge && (
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-bold text-black">
                  {p.badge}
                </Badge>
              )}
              <div className="text-lg font-black text-amber-300">{p.coins}</div>
              <div className="text-[10px] text-zinc-500">koin</div>
              <div className="mt-1 text-xs font-semibold text-white">
                {formatIDR(p.priceIDR)}
              </div>
            </Button>
          ))}
        </div>

        {history.length > 0 && (
          <>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Riwayat terakhir
            </p>
            <div className="mt-2 space-y-1.5">
              {history.slice(0, 5).map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-zinc-900/60 px-3 py-2 text-sm"
                >
                  <span className="text-zinc-300">{item.label}</span>
                  {typeof item.coins === "number" && (
                    <span
                      className={cn(
                        "font-semibold",
                        item.coins >= 0 ? "text-emerald-400" : "text-red-400",
                      )}
                    >
                      {item.coins >= 0 ? "+" : ""}
                      {item.coins}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {msg && (
          <div
            className={cn(
              "mt-3 rounded-lg border px-3 py-2 text-sm",
              msg.type === "ok"
                ? "border-emerald-700 bg-emerald-900/30 text-emerald-300"
                : "border-red-700 bg-red-900/30 text-red-300",
            )}
          >
            {msg.text}
          </div>
        )}

        <RewardedAdModal
          open={adOpen}
          onClose={() => setAdOpen(false)}
          onRewarded={(b) => setBalance(b)}
        />
      </CardContent>
    </Card>
  );
}
