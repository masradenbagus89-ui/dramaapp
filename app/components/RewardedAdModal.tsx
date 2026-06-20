"use client";

import { useEffect, useRef, useState } from "react";
import { claimReward } from "@/lib/wallet";
import { REWARD_PER_AD } from "@/lib/coins";

// Iklan berhadiah pakai IKLAN SPONSOR SENDIRI (house ad). Admin pasang gambar +
// link di /admin; modal ini ambil acak dari /api/ads, hitung view/klik, lalu
// kasih koin setelah hitung mundur. Pendapatan = deal langsung/affiliate di link.
// Kalau belum ada iklan, fallback ke promo DramaKu (house default).

type SponsorAd = {
  id: string;
  title?: string;
  imageUrl: string;
  linkUrl: string;
};

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
            <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-white/80">
              Iklan
            </span>
            {ad.title && (
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-left text-sm font-semibold text-white">
                {ad.title}
              </span>
            )}
          </a>
        ) : (
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
        )}

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
