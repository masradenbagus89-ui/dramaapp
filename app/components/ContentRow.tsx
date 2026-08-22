"use client";

import { useRef } from "react";
import Link from "next/link";
import type { Drama } from "@/lib/types";
import { continueLabel } from "@/lib/progress";
import { teaserSrc } from "@/lib/hero-teaser";
import { genreBarClass, genreTextClass } from "@/lib/genre-accent";
import Poster from "./Poster";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { cn } from "@/lib/utils";

type ContinueMeta = { episode: number; positionSec: number };

type Props = {
  title: string;
  subtitle?: string;
  dramas: Drama[];
  href?: string;
  continueMap?: Record<string, ContinueMeta>;
  accent?: string;
};

export default function ContentRow({
  title,
  subtitle,
  dramas,
  href,
  continueMap,
  accent,
}: Props) {
  const scroller = useRef<HTMLDivElement>(null);

  if (dramas.length === 0) return null;

  const scroll = (dir: -1 | 1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section className="group/row">
      <div className="mb-2 flex items-end justify-between px-4 md:px-0">
        <div>
          <h2
            className={cn(
              "text-base font-bold md:text-lg",
              accent ? genreTextClass(accent) : "text-white",
            )}
          >
            {title}
          </h2>
          {accent && (
            <span
              className={cn(
                "mt-1 block h-0.5 w-8 rounded-full",
                genreBarClass(accent),
              )}
            />
          )}
          {subtitle && <p className="mt-0.5 text-[11px] text-zinc-500">{subtitle}</p>}
        </div>
        {href && (
          <Link
            href={href}
            className="shrink-0 text-xs text-amber-400 hover:underline"
          >
            Lihat semua →
          </Link>
        )}
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-[5] hidden w-8 bg-gradient-to-r from-black to-transparent md:block" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-[5] hidden w-8 bg-gradient-to-l from-black to-transparent md:block" />
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={() => scroll(-1)}
          aria-label="Geser kiri"
          className="absolute left-0 top-[42%] z-10 hidden h-11 w-11 -translate-y-1/2 rounded-full border border-white/30 bg-black/75 text-white opacity-80 shadow-lg hover:bg-black md:flex md:group-hover/row:opacity-100"
        >
          <ChevronLeft className="size-6" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={() => scroll(1)}
          aria-label="Geser kanan"
          className="absolute right-0 top-[42%] z-10 hidden h-11 w-11 -translate-y-1/2 rounded-full border border-white/30 bg-black/75 text-white opacity-80 shadow-lg hover:bg-black md:flex md:group-hover/row:opacity-100"
        >
          <ChevronRight className="size-6" />
        </Button>

        <div
          ref={scroller}
          className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2 md:px-0"
        >
          {dramas.map((d) => {
            const cont = continueMap?.[d.id];
            const to = cont ? `/feed/${d.id}?ep=${cont.episode}` : `/drama/${d.id}`;
            return (
              <Link
                key={d.id}
                href={to}
                className="group/card block w-28 shrink-0 transition-transform hover:-translate-y-1 sm:w-32 md:w-36"
              >
                <div className="relative">
                  {/* /api/teaser (same-origin) — lihat alasan di DramaCard.tsx */}
                  <Poster drama={d} previewSrc={teaserSrc(d.id)} />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 transition-colors group-hover/card:bg-black/35">
                    <Play className="size-9 fill-white text-white opacity-0 drop-shadow-lg transition-opacity group-hover/card:opacity-100" />
                  </div>
                </div>
                <h3 className="mt-1.5 line-clamp-1 text-xs font-medium text-white">
                  {d.title}
                </h3>
                {cont ? (
                  <p className="line-clamp-2 text-[11px] font-medium leading-snug text-amber-400">
                    {continueLabel(cont)}
                  </p>
                ) : (
                  <p className="line-clamp-1 text-[11px] text-zinc-500">
                    {d.imdbRating ? `★ ${d.imdbRating}` : d.category}
                    {d.year ? ` · ${d.year}` : ""}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
