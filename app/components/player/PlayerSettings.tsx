"use client";

import { OFF } from "@/lib/subtitles";
import { subtitleLabel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Settings, Download, Maximize, Minimize, Gauge, MonitorPlay, Captions } from "lucide-react";

// Kecepatan: opsi statis, dipakai hanya di menu ini → ikut pindah dari FeedPlayer.
const SPEEDS = [1, 1.25, 1.5, 2];

// Resolusi: butuh file varian di PC backup dgn pola <ep>.<res>.mp4
// (mis. 1.720p.mp4). "" = file asli <ep>.mp4. Kalau varian tak ada → balik Asli.
const RESOLUTIONS: { code: string; label: string }[] = [
  { code: "", label: "Asli" },
  { code: "720p", label: "720p" },
  { code: "480p", label: "480p" },
  { code: "360p", label: "360p" },
];

// Menu Pengaturan pemutar — gabung kecepatan, resolusi, subtitle, unduh,
// layar penuh ke SATU tombol gerigi biar layar tidak penuh tombol.
// Dipecah dari FeedPlayer (rapikan kode). Data (status, pilihan aktif) + aksi
// (ganti kecepatan/resolusi/subtitle, unduh, layar penuh) disuplai induk lewat
// prop; konstanta opsi diimpor sendiri. Tampilan & perilaku sama persis.
export type PlayerSettingsProps = {
  open: boolean;
  speed: number;
  resolution: string;
  subtitles: string[];
  subLang: string;
  isFullscreen: boolean;
  onToggle: () => void;
  onSpeed: (s: number) => void;
  onResolution: (code: string) => void;
  onSubtitle: (code: string) => void;
  onDownload: () => void;
  onToggleFullscreen: () => void;
};

export default function PlayerSettings({
  open,
  speed,
  resolution,
  subtitles,
  subLang,
  isFullscreen,
  onToggle,
  onSpeed,
  onResolution,
  onSubtitle,
  onDownload,
  onToggleFullscreen,
}: PlayerSettingsProps) {
  return (
    <div className="relative ml-auto">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onToggle}
        aria-label="Pengaturan"
        className={cn(
          "rounded-full",
          open
            ? "bg-amber-400 text-black hover:bg-amber-400 hover:text-black"
            : "bg-white/15 text-white hover:bg-white/25 hover:text-white"
        )}
      >
        <Settings className="size-4" />
      </Button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-60 rounded-xl border border-zinc-700 bg-zinc-900/95 p-3 shadow-xl backdrop-blur">
          {/* Kecepatan */}
          <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            <Gauge className="size-3" />
            Kecepatan
          </p>
          <div className="mb-3 flex gap-1.5">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => onSpeed(s)}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-xs font-bold transition-colors",
                  speed === s
                    ? "bg-amber-400 text-black"
                    : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                )}
              >
                {s}×
              </button>
            ))}
          </div>

          {/* Resolusi */}
          <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            <MonitorPlay className="size-3" />
            Resolusi
          </p>
          <div className="mb-3 flex gap-1.5">
            {RESOLUTIONS.map((r) => (
              <button
                key={r.code}
                onClick={() => onResolution(r.code)}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-xs font-bold transition-colors",
                  resolution === r.code
                    ? "bg-amber-400 text-black"
                    : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Subtitle (kalau ada) */}
          {subtitles.length > 0 && (
            <>
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                <Captions className="size-3" />
                Subtitle
              </p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                <button
                  onClick={() => onSubtitle(OFF)}
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors",
                    subLang === OFF
                      ? "bg-amber-400 text-black"
                      : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                  )}
                >
                  Mati
                </button>
                {subtitles.map((code) => (
                  <button
                    key={code}
                    onClick={() => onSubtitle(code)}
                    className={cn(
                      "rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors",
                      subLang === code
                        ? "bg-amber-400 text-black"
                        : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                    )}
                  >
                    {subtitleLabel(code)}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Aksi: unduh + layar penuh */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onDownload}
              className="flex-1 bg-zinc-800 text-xs font-bold text-zinc-100 hover:bg-zinc-700"
            >
              <Download className="size-4" />
              Unduh
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onToggleFullscreen}
              className="flex-1 bg-zinc-800 text-xs font-bold text-zinc-100 hover:bg-zinc-700"
            >
              {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
              {isFullscreen ? "Keluar" : "Layar penuh"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
