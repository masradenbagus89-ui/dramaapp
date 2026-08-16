const ACCENT: Record<string, { text: string; chip: string; bar: string }> = {
  Semua: {
    text: "text-amber-300",
    chip: "border-amber-500/40 bg-amber-950/40 text-amber-200 hover:bg-amber-900/50",
    bar: "bg-amber-400",
  },
  Romance: {
    text: "text-rose-400",
    chip: "border-rose-500/40 bg-rose-950/50 text-rose-200 hover:bg-rose-900/60",
    bar: "bg-rose-400",
  },
  Action: {
    text: "text-orange-400",
    chip: "border-orange-500/40 bg-orange-950/50 text-orange-200 hover:bg-orange-900/60",
    bar: "bg-orange-400",
  },
  Comedy: {
    text: "text-lime-400",
    chip: "border-lime-500/40 bg-lime-950/50 text-lime-200 hover:bg-lime-900/60",
    bar: "bg-lime-400",
  },
  Fantasy: {
    text: "text-violet-400",
    chip: "border-violet-500/40 bg-violet-950/50 text-violet-200 hover:bg-violet-900/60",
    bar: "bg-violet-400",
  },
  Tycoon: {
    text: "text-amber-400",
    chip: "border-amber-500/40 bg-amber-950/50 text-amber-200 hover:bg-amber-900/60",
    bar: "bg-amber-400",
  },
  Harem: {
    text: "text-fuchsia-400",
    chip: "border-fuchsia-500/40 bg-fuchsia-950/50 text-fuchsia-200 hover:bg-fuchsia-900/60",
    bar: "bg-fuchsia-400",
  },
  "Time Travel": {
    text: "text-cyan-400",
    chip: "border-cyan-500/40 bg-cyan-950/50 text-cyan-200 hover:bg-cyan-900/60",
    bar: "bg-cyan-400",
  },
};

const FALLBACK = {
  text: "text-white",
  chip: "border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700",
  bar: "bg-amber-400",
};

export function genreTextClass(genre: string): string {
  return ACCENT[genre]?.text ?? FALLBACK.text;
}

export function genreChipClass(genre: string): string {
  return ACCENT[genre]?.chip ?? FALLBACK.chip;
}

export function genreBarClass(genre: string): string {
  return ACCENT[genre]?.bar ?? FALLBACK.bar;
}
