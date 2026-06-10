"use client";

import { useEffect, useRef, useState } from "react";
import { claimReward } from "@/lib/wallet";
import { REWARD_PER_AD } from "@/lib/coins";

// Iklan berhadiah (rewarded ad). Versi ini SIMULASI: hitung mundur beberapa
// detik lalu beri koin. Untuk pendapatan nyata, ganti blok <SlotIklan/> dengan
// SDK ad network (mis. Google AdSense rewarded, atau jaringan video-ad seperti
// AdGate/Pollfish). Panggil onAdCompleted() saat callback "reward" dari SDK.

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
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 text-center">
        {/* === SlotIklan: ganti dengan SDK iklan nyata di produksi === */}
        <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-indigo-700 via-purple-800 to-zinc-900">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-white/60">
              Iklan
            </p>
            <p className="mt-1 text-2xl font-black text-white">DramaKu+</p>
            <p className="mt-1 text-xs text-white/70">
              Tonton iklan, dapat koin gratis
            </p>
          </div>
        </div>

        <div className="p-4">
          {phase === "playing" && left > 0 && (
            <p className="text-sm text-zinc-300">
              Iklan berakhir dalam{" "}
              <span className="font-bold text-amber-400">{left}s</span>…
            </p>
          )}

          {phase === "playing" && left === 0 && (
            <button
              onClick={onClaim}
              className="w-full rounded-full bg-amber-400 py-2.5 text-sm font-bold text-black hover:bg-amber-300"
            >
              🎁 Klaim +{REWARD_PER_AD} koin
            </button>
          )}

          {phase === "claiming" && (
            <p className="text-sm text-zinc-400">Memberi koin…</p>
          )}

          {(phase === "done" || phase === "error") && (
            <p
              className={`text-sm ${phase === "done" ? "text-emerald-400" : "text-red-400"}`}
            >
              {msg}
            </p>
          )}

          <button
            onClick={onClose}
            disabled={phase === "claiming"}
            className="mt-3 w-full rounded-full border border-zinc-700 py-2 text-xs font-semibold text-zinc-300 hover:border-zinc-500 disabled:opacity-40"
          >
            {phase === "done" ? "Tutup & lanjut nonton" : "Tutup"}
          </button>

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
