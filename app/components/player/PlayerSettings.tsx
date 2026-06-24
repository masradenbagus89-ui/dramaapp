"use client";

import { OFF } from "@/lib/subtitles";
import { subtitleLabel } from "@/lib/types";

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
      <button
        onClick={onToggle}
        aria-label="Pengaturan"
        className={`flex h-8 w-8 items-center justify-center rounded-full ${
          open ? "bg-amber-400 text-black" : "bg-white/15 text-white hover:bg-white/25"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-60 rounded-xl border border-zinc-700 bg-zinc-900/95 p-3 shadow-xl backdrop-blur">
          {/* Kecepatan */}
          <p className="mb-1.5 text-[10px] uppercase tracking-wider text-zinc-500">Kecepatan</p>
          <div className="mb-3 flex gap-1.5">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => onSpeed(s)}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold ${
                  speed === s ? "bg-amber-400 text-black" : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                }`}
              >
                {s}×
              </button>
            ))}
          </div>

          {/* Resolusi */}
          <p className="mb-1.5 text-[10px] uppercase tracking-wider text-zinc-500">Resolusi</p>
          <div className="mb-3 flex gap-1.5">
            {RESOLUTIONS.map((r) => (
              <button
                key={r.code}
                onClick={() => onResolution(r.code)}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold ${
                  resolution === r.code ? "bg-amber-400 text-black" : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Subtitle (kalau ada) */}
          {subtitles.length > 0 && (
            <>
              <p className="mb-1.5 text-[10px] uppercase tracking-wider text-zinc-500">Subtitle</p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                <button
                  onClick={() => onSubtitle(OFF)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${
                    subLang === OFF ? "bg-amber-400 text-black" : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                  }`}
                >
                  Mati
                </button>
                {subtitles.map((code) => (
                  <button
                    key={code}
                    onClick={() => onSubtitle(code)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${
                      subLang === code ? "bg-amber-400 text-black" : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                    }`}
                  >
                    {subtitleLabel(code)}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Aksi: unduh + layar penuh */}
          <div className="flex gap-2">
            <button
              onClick={onDownload}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-zinc-800 py-2 text-xs font-bold text-zinc-100 hover:bg-zinc-700"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 19h14" />
              </svg>
              Unduh
            </button>
            <button
              onClick={onToggleFullscreen}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-zinc-800 py-2 text-xs font-bold text-zinc-100 hover:bg-zinc-700"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 9V5a1 1 0 011-1h4M20 9V5a1 1 0 00-1-1h-4M4 15v4a1 1 0 001 1h4M20 15v4a1 1 0 01-1 1h-4" />
              </svg>
              {isFullscreen ? "Keluar" : "Layar penuh"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
