"use client";

import { useEffect, useRef, useState } from "react";
import { Gift, Coins, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { claimReward } from "@/lib/wallet";
import { REWARD_PER_AD } from "@/lib/coins";
import type { SponsorAd } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Iklan berhadiah pakai IKLAN SPONSOR SENDIRI (house ad). Admin pasang gambar +
// link di /admin; modal ini ambil acak dari /api/ads, hitung view/klik, lalu
// kasih koin setelah hitung mundur. Pendapatan = deal langsung/affiliate di link.
// Kalau belum ada iklan, fallback ke promo DramaKu (house default).

const AD_SECONDS = 5;

export default function RewardedAdModal({
  open,
  onClose,
  onRewarded,
}: {
  open: boolean;
  onClose: () => void;
  onRewarded?: (balance: number) => void;
}) {
  const [left, setLeft] = useState(AD_SECONDS);
  const [phase, setPhase] = useState<"playing" | "claiming" | "done" | "error">(
    "playing",
  );
  const [msg, setMsg] = useState("");
  const [ad, setAd] = useState<SponsorAd | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ambil iklan sponsor acak saat modal dibuka + catat impresi (view).
  useEffect(() => {
    if (!open) return;
    setAd(null);
    let alive = true;
    fetch("/api/ads", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { ads?: SponsorAd[] } | null) => {
        if (!alive) return;
        const list = d?.ads ?? [];
        if (!list.length) return;
        const picked = list[Math.floor(Math.random() * list.length)];
        setAd(picked);
        fetch("/api/ads/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: picked.id, type: "view" }),
        }).catch(() => {});
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLeft(AD_SECONDS);
    setPhase("playing");
    setMsg("");
    timer.current = setInterval(() => {
      setLeft((n) => {
        if (n <= 1) {
          if (timer.current) clearInterval(timer.current);
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [open]);

  const onClaim = async () => {
    setPhase("claiming");
    const { status, data } = await claimReward();
    if (status === 200 && data.ok) {
      setPhase("done");
      setMsg(`+${data.reward ?? REWARD_PER_AD} koin! Saldo: ${data.balance}`);
      if (typeof data.balance === "number") onRewarded?.(data.balance);
    } else {
      setPhase("error");
      setMsg(data.error ?? "Gagal klaim koin.");
    }
  };

  const onAdClick = () => {
    if (!ad) return;
    fetch("/api/ads/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ad.id, type: "click" }),
    }).catch(() => {});
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 text-center">
        {/* Slot iklan — iklan sponsor yang dikelola admin, atau promo default */}
        {ad ? (
          <a
            href={ad.linkUrl}
            target="_blank"
            rel="noopener sponsored"
            onClick={onAdClick}
            className="relative block aspect-video overflow-hidden"
          >
            {/* Latar blur dari gambar yang sama → isi area kosong saat object-contain. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ad.imageUrl}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-xl"
            />
            {/* Gambar utama: tampil UTUH tanpa terpotong. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ad.imageUrl}
              alt={ad.title ?? "Iklan"}
              className="absolute inset-0 h-full w-full object-contain"
            />
            <Badge
              variant="secondary"
              className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-white/80 backdrop-blur-sm"
            >
              Iklan
            </Badge>
            {ad.title && (
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-left text-sm font-semibold text-white">
                {ad.title}
              </span>
            )}
          </a>
        ) : (
          <div className="relative flex aspect-video items-center justify-center bg-gradient-to-br from-indigo-700 via-purple-800 to-zinc-900">
            <Badge
              variant="secondary"
              className="absolute left-2 top-2 rounded bg-black/40 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-white/60 backdrop-blur-sm"
            >
              Iklan
            </Badge>
            <div className="text-center">
              <p className="text-2xl font-black text-white">DramaKu+</p>
              <p className="mt-1 flex items-center justify-center gap-1 text-xs text-white/70">
                <Coins className="size-3.5 text-amber-400" />
                Tonton iklan, dapat koin gratis
              </p>
            </div>
          </div>
        )}

        <div className="p-4">
          {phase === "playing" && left > 0 && (
            <p className="flex items-center justify-center gap-2 text-sm text-zinc-300">
              Iklan berakhir dalam
              <Badge className="rounded-full bg-amber-400/15 px-2 py-0.5 font-bold text-amber-400 tabular-nums">
                {left}s
              </Badge>
            </p>
          )}

          {phase === "playing" && left === 0 && (
            <Button
              onClick={onClaim}
              className="w-full rounded-full bg-amber-400 py-2.5 text-sm font-bold text-black hover:bg-amber-300"
            >
              <Gift className="size-4" />
              Klaim +{REWARD_PER_AD} koin
            </Button>
          )}

          {phase === "claiming" && (
            <p className="flex items-center justify-center gap-2 text-sm text-zinc-400">
              <Loader2 className="size-4 animate-spin" />
              Memberi koin…
            </p>
          )}

          {(phase === "done" || phase === "error") && (
            <p
              className={`flex items-center justify-center gap-2 text-sm ${phase === "done" ? "text-emerald-400" : "text-red-400"}`}
            >
              {phase === "done" ? (
                <CheckCircle2 className="size-4 shrink-0" />
              ) : (
                <AlertCircle className="size-4 shrink-0" />
              )}
              {msg}
            </p>
          )}

          <Button
            onClick={onClose}
            disabled={phase === "claiming"}
            variant="outline"
            className="mt-3 w-full rounded-full border-zinc-700 bg-transparent py-2 text-xs font-semibold text-zinc-300 hover:border-zinc-500 hover:bg-transparent hover:text-zinc-100 disabled:opacity-40 dark:bg-transparent dark:hover:bg-transparent"
          >
            <X className="size-3.5" />
            {phase === "done" ? "Tutup & lanjut nonton" : "Tutup"}
          </Button>

          {phase === "playing" && (
            <p className="mt-2 text-[10px] text-zinc-600">
              Tunggu sampai iklan selesai untuk dapat koin.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
