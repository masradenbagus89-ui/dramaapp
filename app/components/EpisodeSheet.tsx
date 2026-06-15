"use client";

import { useEffect, useState } from "react";

const GROUP = 30; // jumlah episode per tab (kalau drama panjang)

// Bottom-sheet daftar episode ala PineDrama: grid nomor episode, dikelompokkan
// per GROUP kalau banyak, sorot episode yang sedang diputar. Tap = lompat ke ep.
export default function EpisodeSheet({
  open,
  onClose,
  total,
  current,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  total: number;
  current: number; // 1-based
  onPick: (ep: number) => void;
}) {
  const groups = Math.ceil(total / GROUP);
  const [tab, setTab] = useState(0);

  // Saat dibuka, langsung ke tab yang memuat episode aktif.
  useEffect(() => {
    if (open) setTab(Math.floor((current - 1) / GROUP));
  }, [open, current]);

  if (!open) return null;

  const start = tab * GROUP + 1;
  const end = Math.min(total, (tab + 1) * GROUP);
  const eps = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      <button
        className="absolute inset-0 bg-black/60"
        aria-label="Tutup daftar episode"
        onClick={onClose}
      />
      <div className="relative max-h-[72vh] overflow-y-auto rounded-t-2xl border-t border-zinc-800 bg-zinc-950 px-4 pb-8 pt-3">
        <div className="sticky top-0 z-10 -mx-4 mb-3 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/95 px-4 pb-3 backdrop-blur">
          <h3 className="text-sm font-bold text-white">
            Pilih Episode{" "}
            <span className="font-normal text-zinc-500">({total} eps)</span>
          </h3>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-full p-1 text-zinc-400 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {groups > 1 && (
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
            {Array.from({ length: groups }, (_, g) => {
              const s = g * GROUP + 1;
              const e = Math.min(total, (g + 1) * GROUP);
              return (
                <button
                  key={g}
                  onClick={() => setTab(g)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                    g === tab
                      ? "bg-amber-400 text-black"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  {s}-{e}
                </button>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
          {eps.map((ep) => {
            const isCur = ep === current;
            return (
              <button
                key={ep}
                onClick={() => onPick(ep)}
                className={`flex h-11 items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                  isCur
                    ? "bg-amber-400 text-black"
                    : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                }`}
              >
                {ep}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
