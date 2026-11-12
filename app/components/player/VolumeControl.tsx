"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

// Tombol volume di panel bawah pemutar drama (sebelah kiri tombol layar
// penuh). Ketuk ikon → garis pengatur muncul SEJAJAR di kiri ikon, satu baris
// dengan tombol layar penuh (permintaan 2026-11-12). Bukan lewat hover
// seperti PlaylyPlayer: di HP tidak ada hover). Catatan: Safari iPhone
// mengabaikan `video.volume` (hanya tombol fisik HP yang bisa), jadi di sana
// yang efektif cuma bisu/tidak — geser ke 0 = bisu.
export default function VolumeControl({
  volume,
  muted,
  hidden,
  onChange,
}: {
  volume: number;
  muted: boolean;
  /** Kontrol sedang memudar → tutup garisnya supaya tidak tertinggal terbuka. */
  hidden: boolean;
  onChange: (next: { volume: number; muted: boolean }) => void;
}) {
  const [open, setOpen] = useState(false);
  const silent = muted || volume === 0;

  useEffect(() => {
    if (hidden) setOpen(false);
  }, [hidden]);

  return (
    <div className="relative flex items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Volume"
        title={silent ? "Bisu" : `${Math.round(volume * 100)}%`}
        className="flex h-10 w-10 items-center justify-center rounded-full text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] hover:bg-white/10 active:scale-95"
      >
        {silent ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
      </button>

      {open && (
        // Tanpa ikon speaker kedua di dalam garis: tepat di sebelahnya sudah
        // ada tombol speaker. Bisu = geser ke 0.
        <div className="absolute right-full top-1/2 mr-1 flex h-9 -translate-y-1/2 items-center gap-2 rounded-full bg-black/80 px-3 ring-1 ring-white/10">
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
          <span className="w-8 text-right text-[11px] tabular-nums text-white/80">
            {silent ? "Bisu" : `${Math.round(volume * 100)}%`}
          </span>
        </div>
      )}
    </div>
  );
}
