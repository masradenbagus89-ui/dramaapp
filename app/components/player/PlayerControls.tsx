"use client";

import { fmtTime } from "@/lib/format";
import { LayoutGrid, ChevronRight, Maximize, Minimize } from "lucide-react";
import VolumeControl from "./VolumeControl";

// Panel bawah pemutar feed: judul + episode + subtitle + bar posisi + timer.
// Tombol putar ada di tengah video & gerigi di kanan atas (FeedPlayer).
// Di atas bar, rata kanan: Volume + Layar penuh berdampingan (permintaan
// 2026-11-12 — dulu Volume ada di rail kanan dan membuat rail terlalu tinggi).
export default function PlayerControls({
  title,
  currentEp,
  episodes,
  isMovie = false,
  cueText,
  lockedActive,
  controlsVisible,
  curTime,
  dur,
  seekBarRef,
  onSeekDown,
  onSeekMove,
  onSeekUp,
  onOpenEpisodes,
  sound,
  isFullscreen,
  onToggleFullscreen,
}: {
  title: string;
  currentEp: number;
  episodes: number;
  /** Film = 1 video utuh: semua tombol berbau episode disembunyikan. */
  isMovie?: boolean;
  cueText: string;
  lockedActive: boolean;
  controlsVisible: boolean;
  curTime: number;
  dur: number;
  seekBarRef: React.RefObject<HTMLDivElement | null>;
  onSeekDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onSeekMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onSeekUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onOpenEpisodes: () => void;
  sound: {
    volume: number;
    muted: boolean;
    onChange: (next: { volume: number; muted: boolean }) => void;
  };
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col bg-gradient-to-t from-black/85 via-black/35 to-transparent pb-7 pt-10">
      <div className="px-3 pr-20">
        <h1 className="line-clamp-2 text-[13px] font-semibold leading-tight text-white/95 drop-shadow-md">
          {title}
        </h1>
        {isMovie ? (
          <p className="mt-1 text-[11px] font-medium text-white/70">Film</p>
        ) : (
          <button
            onClick={onOpenEpisodes}
            className="pointer-events-auto mt-1 flex min-h-11 items-center gap-1 text-[11px] font-medium text-white/70 active:text-white"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Eps {currentEp} / {episodes}
            <ChevronRight className="h-3 w-3" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {cueText && (
        <div className="mt-2 flex justify-center px-3 pr-20">
          <span className="whitespace-pre-line rounded bg-black/60 px-2 py-0.5 text-center text-[13px] font-medium leading-snug text-white sm:text-sm">
            {cueText}
          </span>
        </div>
      )}

      {!lockedActive && (
        <div
          className={`mt-3 px-3 transition-opacity duration-300 ${
            controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
        <div className="pointer-events-auto mb-0.5 flex justify-end gap-1">
          <VolumeControl
            volume={sound.volume}
            muted={sound.muted}
            hidden={!controlsVisible}
            onChange={sound.onChange}
          />
          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? "Keluar layar penuh" : "Layar penuh"}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] hover:bg-white/10 active:scale-95"
          >
            {isFullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
          </button>
        </div>

        <div
          ref={seekBarRef}
          onPointerDown={onSeekDown}
          onPointerMove={onSeekMove}
          onPointerUp={onSeekUp}
          onPointerCancel={onSeekUp}
          role="slider"
          aria-label="Posisi video"
          aria-valuenow={Math.round(curTime)}
          className="pointer-events-auto mb-1 flex h-6 cursor-pointer touch-none select-none items-center"
        >
          <div className="relative h-1.5 w-full rounded-full bg-white/25">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-amber-400"
              style={{ width: dur ? `${(curTime / dur) * 100}%` : "0%" }}
            />
            <div
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400 shadow"
              style={{ left: dur ? `${(curTime / dur) * 100}%` : "0%" }}
            />
          </div>
        </div>

        <p className="text-[11px] tabular-nums text-white/80">
          {fmtTime(curTime)} / {fmtTime(dur)}
        </p>
        </div>
      )}
    </div>
  );
}
