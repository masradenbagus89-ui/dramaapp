"use client";

import { fmtTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Play, Pause, LayoutGrid, ChevronRight } from "lucide-react";
import PlayerSettings, { type PlayerSettingsProps } from "./PlayerSettings";

// Panel kontrol bawah pemutar — judul + episode, subtitle, seek bar, tombol
// putar/episode/pengaturan. Disusun dalam SATU kolom flex sehingga tidak pernah
// saling menumpuk (rapi seperti app sejenis). Dipecah dari FeedPlayer (rapikan
// kode): semua data + aksi disuplai induk lewat prop; tampilan & perilaku sama
// persis. Control bar auto-sembunyi (controlsVisible) saat nonton biar video
// jadi fokus; sentuh layar utk memunculkan lagi.
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
  settings: PlayerSettingsProps;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col bg-gradient-to-t from-black/85 via-black/35 to-transparent pb-7 pt-10">
      {/* Judul + episode — kecil & rapi ala PineDrama: rata kiri, maks 2 baris,
          beri ruang utk rail ikon di kanan. Sengaja kecil (13px) supaya tidak
          membludak di HP layar kecil & video tetap jadi fokus. */}
      <div className="px-3 pr-20">
        <h1 className="line-clamp-2 text-[13px] font-semibold leading-tight text-white/95 drop-shadow-md">
          {title}
        </h1>
        <button
          onClick={onOpenEpisodes}
          className="pointer-events-auto mt-1 flex items-center gap-1 text-[11px] font-medium text-white/70 active:text-white"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Eps {currentEp} / {episodes}
          <ChevronRight className="h-3 w-3" strokeWidth={2.5} />
        </button>
      </div>

      {/* Subtitle — baris tersendiri di tengah, tak menumpuk judul/kontrol */}
      {cueText && (
        <div className="mt-2 flex justify-center px-3 pr-20">
          <span className="whitespace-pre-line rounded bg-black/60 px-2 py-0.5 text-center text-[13px] font-medium leading-snug text-white sm:text-sm">
            {cueText}
          </span>
        </div>
      )}

      {/* Control bar video — seek bar + tombol kontrol. Auto-sembunyi saat
          nonton biar video jadi fokus; sentuh layar utk memunculkan lagi. */}
      {!lockedActive && (
        <div
          className={`mt-3 px-3 transition-opacity duration-300 ${
            controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
        {/* Seek bar — bisa DIGESER (touch & mouse) utk maju/mundur di HP */}
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

        <div className="pointer-events-auto flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onTogglePlay}
            aria-label={paused ? "Putar" : "Jeda"}
            className="size-9 text-white transition-transform hover:bg-white/15 hover:text-white active:scale-90"
          >
            {paused ? (
              <Play className="size-7 fill-white" strokeWidth={0} />
            ) : (
              <Pause className="size-7 fill-white" strokeWidth={0} />
            )}
          </Button>
          <span className="text-xs tabular-nums text-white/80">
            {fmtTime(curTime)} / {fmtTime(dur)}
          </span>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenEpisodes}
            aria-label="Daftar episode"
            className="h-8 gap-1 rounded-full bg-white/15 px-2.5 text-xs font-bold text-white hover:bg-white/25 hover:text-white"
          >
            <LayoutGrid className="size-4" />
            Episode
          </Button>

          {/* Pengaturan — gabung resolusi, kecepatan, subtitle, unduh,
              layar penuh ke SATU tombol biar layar tidak penuh tombol. */}
          <PlayerSettings {...settings} />
        </div>
        </div>
      )}
    </div>
  );
}
