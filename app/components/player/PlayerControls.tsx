"use client";

import { fmtTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  LayoutGrid,
  ChevronRight,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import PlayerSettings, { type PlayerSettingsProps } from "./PlayerSettings";

export default function PlayerControls({
  title,
  currentEp,
  episodes,
  cueText,
  lockedActive,
  controlsVisible,
  paused,
  curTime,
  dur,
  seekBarRef,
  onSeekDown,
  onSeekMove,
  onSeekUp,
  onTogglePlay,
  onOpenEpisodes,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  volume,
  muted,
  onVolume,
  onToggleMute,
  settings,
}: {
  title: string;
  currentEp: number;
  episodes: number;
  cueText: string;
  lockedActive: boolean;
  controlsVisible: boolean;
  paused: boolean;
  curTime: number;
  dur: number;
  seekBarRef: React.RefObject<HTMLDivElement | null>;
  onSeekDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onSeekMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onSeekUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onTogglePlay: () => void;
  onOpenEpisodes: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  volume: number;
  muted: boolean;
  onVolume: (n: number) => void;
  onToggleMute: () => void;
  settings: PlayerSettingsProps;
}) {
  const silent = muted || volume === 0;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col bg-gradient-to-t from-black/85 via-black/35 to-transparent pb-7 pt-10">
      <div className="px-3 pr-20">
        <h1 className="line-clamp-2 text-[13px] font-semibold leading-tight text-white/95 drop-shadow-md">
          {title}
        </h1>
        <button
          onClick={onOpenEpisodes}
          className="pointer-events-auto mt-1 flex min-h-11 items-center gap-1 text-[11px] font-medium text-white/70 active:text-white"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Eps {currentEp} / {episodes}
          <ChevronRight className="h-3 w-3" strokeWidth={2.5} />
        </button>
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
        <div
          ref={seekBarRef}
          onPointerDown={onSeekDown}
          onPointerMove={onSeekMove}
          onPointerUp={onSeekUp}
          onPointerCancel={onSeekUp}
          role="slider"
          aria-label="Posisi video"
          aria-valuenow={Math.round(curTime)}
          className="pointer-events-auto mb-3 flex h-6 cursor-pointer touch-none select-none items-center"
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

        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onPrev}
            disabled={!hasPrev}
            aria-label="Episode sebelumnya"
            className="size-9 text-white hover:bg-white/15 hover:text-white disabled:opacity-30"
          >
            <SkipBack className="size-5 fill-white" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onTogglePlay}
            aria-label={paused ? "Putar" : "Jeda"}
            className="size-11 text-white transition-transform hover:bg-white/15 hover:text-white active:scale-90"
          >
            {paused ? (
              <Play className="size-7 fill-white" strokeWidth={0} />
            ) : (
              <Pause className="size-7 fill-white" strokeWidth={0} />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onNext}
            disabled={!hasNext}
            aria-label="Episode berikutnya"
            className="size-9 text-white hover:bg-white/15 hover:text-white disabled:opacity-30"
          >
            <SkipForward className="size-5 fill-white" />
          </Button>
          <span className="hidden text-xs tabular-nums text-white/80 sm:inline">
            {fmtTime(curTime)} / {fmtTime(dur)}
          </span>

          <div className="ml-1 flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onToggleMute}
              aria-label={silent ? "Nyalakan suara" : "Bisukan"}
              className="size-9 text-white hover:bg-white/15 hover:text-white"
            >
              {silent ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
            </Button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={silent ? 0 : volume}
              onChange={(e) => onVolume(Number(e.target.value))}
              aria-label="Volume"
              className="hidden h-1.5 w-16 cursor-pointer accent-amber-400 sm:block"
            />
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenEpisodes}
            aria-label="Daftar episode"
            className="hidden h-8 gap-1 rounded-full bg-white/15 px-2.5 text-xs font-bold text-white hover:bg-white/25 hover:text-white sm:inline-flex"
          >
            <LayoutGrid className="size-4" />
            Episode
          </Button>

          <PlayerSettings {...settings} />
        </div>
        <p className="mt-1 text-[10px] tabular-nums text-white/60 sm:hidden">
          {fmtTime(curTime)} / {fmtTime(dur)}
        </p>
        </div>
      )}
    </div>
  );
}
