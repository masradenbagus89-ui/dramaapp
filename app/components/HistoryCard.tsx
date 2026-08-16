"use client";

import Link from "next/link";
import type { Drama } from "@/lib/types";
import { continueLabel, watchPercent } from "@/lib/progress";
import Poster from "./Poster";
import { Button } from "@/components/ui/button";
import { Play, X } from "lucide-react";

type Props = {
  drama: Drama;
  episode: number;
  positionSec: number;
  durationSec: number;
  onRemove: () => void;
};

export default function HistoryCard({
  drama,
  episode,
  positionSec,
  durationSec,
  onRemove,
}: Props) {
  const pct = watchPercent(
    { episode, positionSec, durationSec },
    drama.episodes,
  );

  return (
    <div className="group relative">
      <Link
        href={`/feed/${drama.id}?ep=${episode}`}
        className="block transition-transform hover:-translate-y-1"
      >
        <div className="relative">
          <Poster
            drama={drama}
            className="shadow-sm transition-shadow group-hover:shadow-lg group-hover:shadow-black/40"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
            <Play className="size-10 fill-white text-white opacity-0 drop-shadow-lg transition-opacity group-hover:opacity-100" />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/60">
            <div
              className="h-full bg-amber-400"
              style={{ width: `${pct}%` }}
              aria-hidden
            />
          </div>
        </div>
        <h3 className="mt-2 line-clamp-2 px-0.5 text-sm font-semibold text-white">
          {drama.title}
        </h3>
        <p className="mt-0.5 px-0.5 text-[11px] font-medium leading-snug text-amber-400">
          {continueLabel({ episode, positionSec })}
        </p>
      </Link>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        aria-label={`Hapus ${drama.title} dari riwayat`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove();
        }}
        className="absolute right-1 top-1 z-10 h-11 w-11 rounded-full bg-black/80 text-white shadow-md hover:bg-red-600 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
      >
        <X className="size-5" />
      </Button>
    </div>
  );
}
