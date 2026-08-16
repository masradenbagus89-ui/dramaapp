"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  episodeDurationSec,
  getProgressEntry,
  isEpisodeWatched,
  type ProgressEntry,
} from "@/lib/progress";
import { fmtTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Check, Play } from "lucide-react";

export default function EpisodeList({
  dramaId,
  episodes,
  posterImage,
  title,
}: {
  dramaId: string;
  episodes: number;
  posterImage?: string;
  title: string;
}) {
  const [entry, setEntry] = useState<ProgressEntry | null>(null);

  useEffect(() => {
    const load = () => setEntry(getProgressEntry(dramaId));
    load();
    window.addEventListener("dramaku:progress-changed", load);
    return () => window.removeEventListener("dramaku:progress-changed", load);
  }, [dramaId]);

  const list = Array.from({ length: episodes }, (_, i) => i + 1);

  return (
    <ol className="mt-3 space-y-2">
      {list.map((ep) => {
        const watched = isEpisodeWatched(entry, ep);
        const current = entry?.episode === ep && !watched;
        const dur = episodeDurationSec(entry, ep);
        return (
          <li key={ep}>
            <Link
              href={`/feed/${dramaId}?ep=${ep}`}
              className="flex min-h-16 items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-2 pr-3 transition-colors hover:border-amber-400/60 hover:bg-zinc-900"
            >
              <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                {posterImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={posterImage}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
                <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                  {watched ? (
                    <Check className="size-5 text-amber-400" />
                  ) : (
                    <Play className="size-5 fill-white text-white" />
                  )}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">
                  Episode {ep}
                  <span className="sr-only"> {title}</span>
                </p>
                <p className="text-[11px] text-zinc-500">
                  {dur > 0 ? fmtTime(dur) : "Durasi —"}
                </p>
              </div>
              <Badge
                variant="secondary"
                className={
                  watched
                    ? "shrink-0 bg-amber-400/15 text-[10px] font-semibold text-amber-300"
                    : current
                      ? "shrink-0 bg-white/10 text-[10px] font-semibold text-white"
                      : "shrink-0 bg-zinc-800 text-[10px] font-normal text-zinc-400"
                }
              >
                {watched ? "Ditonton" : current ? "Sedang ditonton" : "Belum"}
              </Badge>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
