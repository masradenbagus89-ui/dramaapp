"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

// Tombol volume untuk rail kanan pemutar drama. Ketuk ikon → garis pengatur
// muncul di KIRI ikon (bukan lewat hover seperti PlaylyPlayer: di HP tidak ada
// hover). Catatan: Safari iPhone mengabaikan `video.volume` (hanya tombol fisik
// HP yang bisa), jadi di sana yang efektif cuma bisu/tidak — geser ke 0 = bisu.
export default function VolumeControl({
  volume,
  muted,
  hidden,
  onChange,
}: {
  volume: number;
  muted: boolean;
  /** Rail sedang memudar → tutup garisnya supaya tidak tertinggal terbuka. */
  hidden: boolean;
  onChange: (next: { volume: number; muted: boolean }) => void;
}) {
  const [open, setOpen] = useState(false);
  const silent = muted || volume === 0;

  useEffect(() => {
    if (hidden) setOpen(false);
  }, [hidden]);

  return (
    <div className="relative flex flex-col items-center gap-0.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Volume"
        className="flex h-11 w-11 items-center justify-center rounded-full text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] transition-transform hover:scale-110 hover:bg-white/10 active:scale-95"
      >
        {silent ? <VolumeX className="size-6" /> : <Volume2 className="size-6" />}
      </button>
      <span className="text-[10px] font-medium text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
        {silent ? "Bisu" : `${Math.round(volume * 100)}%`}
      </span>

      {open && (
        <div className="absolute right-full top-1 mr-1 flex h-9 items-center gap-2 rounded-full bg-black/80 px-3 ring-1 ring-white/10">
          <button
            type="button"
            onClick={() => onChange({ volume: volume === 0 ? 1 : volume, muted: !silent })}
            aria-label={silent ? "Nyalakan suara" : "Bisukan"}
            className="text-white"
          >
            {silent ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={silent ? 0 : volume}
            onChange={(e) => {
              const v = Number(e.target.value);
              onChange({ volume: v, muted: v === 0 });
            }}
            aria-label="Atur volume"
            className="h-1 w-24 cursor-pointer accent-amber-400"
          />
        </div>
      )}
    </div>
  );
}
