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
  isMovie = false,
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
  /** Film = 1 video utuh: semua tombol berbau episode disembunyikan. */
  isMovie?: boolean;
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

  /* `pb-6` di HP (bukan `pb-7`): 4px terakhir yang ikut menurunkan seluruh isi
     panel. JANGAN turun lagi di bawah ini — tombol play sudah berada ~24px dari
     tepi bawah layar, dan di HP tepi itu milik gesture "kembali" sistem;
     merapatkannya lagi membuat jari yang menekan play sesekali menarik gesture
     sistem. */
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col bg-gradient-to-t from-black/85 via-black/35 to-transparent pb-6 pt-10 sm:pb-7">
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

      {/* SUBTITLE (teks terjemahan).

          Jaraknya dari blok judul dilebarkan di HP (owner 2026-11-02: *"posisi
          tulisannya agak di tengah, buat turun sedikit"*). Teks "Eps 1 / 43" di
          atasnya duduk di tengah tombol setinggi 44px (`min-h-11`, target
          sentuh — jangan dikecilkan), jadi dengan `mt-2` subtitle berhenti
          hanya ±20px di bawahnya dan terbaca menyatu dengan blok judul, bukan
          sebagai terjemahan film.

          ⚠️ SUBTITLE TIDAK BOLEH DIPINDAH KE DALAM BLOK KONTROL di bawah demi
          menurunkannya lebih jauh. Blok itu memudar jadi `opacity-0` saat
          kontrol disembunyikan, dan subtitle akan ikut lenyap padahal filmnya
          masih berjalan — hilang tanpa satu pun error. Karena itu seberapa
          rendah subtitle bisa turun dibatasi oleh tinggi blok kontrol
          (seek bar + baris tombol + baris waktu), dan sisa ruangnya dipanen
          lewat dua `mt`/`mb` di bawah, bukan dengan memindahkannya.

          Semua penyesuaian berawalan HP-dulu + `sm:` kembali ke nilai semula:
          layar lebar punya ruang berlebih dan tidak pernah dikeluhkan. */}
      {cueText && (
        <div className="mt-6 flex justify-center px-3 pr-20 sm:mt-2">
          <span className="whitespace-pre-line rounded bg-black/60 px-2 py-0.5 text-center text-[13px] font-medium leading-snug text-white sm:text-sm">
            {cueText}
          </span>
        </div>
      )}

      {!lockedActive && (
        <div
          /* `mt-0` di HP (bukan `mt-3`): 12px yang dilepas di sini ikut
             menurunkan SEMUA yang ada di atasnya — blok judul dan subtitle.
             Lihat catatan di blok subtitle: inilah ruang yang bisa dipanen
             tanpa memindahkan apa pun ke dalam blok yang memudar ini. */
          className={`mt-0 px-3 transition-opacity duration-300 sm:mt-3 ${
            controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
        {/* SATU BARIS: garis geser + angka durasi HP di sampingnya.

            Angka durasi dulu punya barisnya sendiri DI BAWAH tombol, dan baris
            itu memakan ~18px yang mendorong seluruh blok judul ke atas (owner
            2026-11-02, putaran kedua: *"tulisannya masih agak ke atas"*).
            Dipindah ke samping garis geser, tingginya menumpang baris yang
            sudah ada — ruangnya kembali TANPA penonton kehilangan angkanya.

            ⚠️ `seekBarRef` WAJIB tetap menempel pada kotak garis gesernya,
            BUKAN pada pembungkus baris ini. Posisi lompatan video dihitung dari
            `getBoundingClientRect()` elemen ber-ref (FeedPlayer.tsx:577): kalau
            ref naik ke pembungkus, lebarnya ikut menghitung angka durasi, dan
            setiap ketukan mendarat di detik yang salah — makin ke kanan makin
            meleset, tanpa error apa pun. */}
        <div className="mb-2 flex items-center gap-2 sm:mb-3">
        <div
          ref={seekBarRef}
          onPointerDown={onSeekDown}
          onPointerMove={onSeekMove}
          onPointerUp={onSeekUp}
          onPointerCancel={onSeekUp}
          role="slider"
          aria-label="Posisi video"
          aria-valuenow={Math.round(curTime)}
          /* `h-6` = area sentuh garis geser. Sudah di bawah ambang target
             sentuh 44px dan sengaja dibiarkan (garis tipis khas pemutar) —
             JANGAN dikecilkan lagi demi memanen piksel. */
          className="pointer-events-auto flex h-6 flex-1 cursor-pointer touch-none select-none items-center"
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
          {/* Hanya di HP — di `sm` ke atas angka ini sudah ada di baris tombol. */}
          <span className="shrink-0 text-[10px] tabular-nums text-white/60 sm:hidden">
            {fmtTime(curTime)} / {fmtTime(dur)}
          </span>
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-3">
          {!isMovie && (
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
          )}
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
          {!isMovie && (
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
          )}
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

          {!isMovie && (
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
          )}

          <PlayerSettings {...settings} />
        </div>
        </div>
      )}
    </div>
  );
}
