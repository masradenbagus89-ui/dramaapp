"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Drama } from "@/lib/types";
import {
  PLAYING_ROTATE_MS,
  swipeDirection,
  teaserSrc,
  type TeaserStatus,
} from "@/lib/hero-teaser";
import HeroPreview from "./HeroPreview";
import WatchCta from "./WatchCta";
import SaveButton from "./SaveButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ROTATE_MS = 9000;

export default function HomeHero({
  dramas,
}: {
  dramas: Drama[];
  /** Tetap diterima dari halaman (alamat tunnel); teaser memakai /api/teaser. */
  baseUrl?: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [listening, setListening] = useState(false);
  const [teaserStatus, setTeaserStatus] = useState<TeaserStatus>("loading");
  const [reduceMotion, setReduceMotion] = useState(false);
  const touch = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const onStatus = useCallback((s: TeaserStatus) => setTeaserStatus(s), []);
  const onMutedChange = useCallback((m: boolean) => setListening(!m), []);

  const count = dramas.length;
  const go = useCallback(
    (dir: -1 | 1) => {
      if (count < 2) return;
      setIndex((i) => (i + dir + count) % count);
      setTeaserStatus("loading");
      setListening(false);
    },
    [count],
  );

  useEffect(() => {
    if (paused || listening || reduceMotion || count < 2) return;
    if (teaserStatus === "loading") return;
    const delay = teaserStatus === "playing" ? PLAYING_ROTATE_MS : ROTATE_MS;
    const t = window.setInterval(() => go(1), delay);
    return () => window.clearInterval(t);
  }, [paused, listening, reduceMotion, count, go, index, teaserStatus]);

  const hero = dramas[index];
  if (!hero) return null;

  const still = hero.heroImage || hero.posterImage;
  const teaser = teaserSrc(hero.id);
  const genres = (hero.genre || hero.category)
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button, a")) return;
    touch.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button, a")) return;
    const dir = swipeDirection(
      touch.current.x,
      touch.current.y,
      e.clientX,
      e.clientY,
    );
    if (dir !== 0) go(dir);
  };

  return (
    <section
      className="relative w-full touch-pan-y overflow-hidden bg-black"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      aria-roledescription="carousel"
      aria-label="Drama unggulan"
    >
      <div className="relative min-h-[78svh] w-full md:min-h-[88svh]">
        <div
          className={`absolute inset-0 bg-gradient-to-br ${hero.gradient}`}
        >
          <HeroPreview
            key={hero.id}
            src={reduceMotion ? "" : teaser}
            poster={still}
            title={hero.title}
            fit="contain"
            objectPosition="center"
            showBlurBg
            mutePosition="bottom-right"
            startAt={0}
            windowSec={20}
            onStatus={onStatus}
            onMutedChange={onMutedChange}
          />
        </div>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/75 via-black/25 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/25" />

        <div className="pointer-events-none relative z-10 flex min-h-[78svh] flex-col justify-end px-4 pb-16 pt-24 md:min-h-[88svh] md:px-10 md:pb-20 lg:max-w-3xl lg:px-16">
          <div className="pointer-events-auto">
            <Badge className="w-fit rounded-sm bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-black">
              Trending
            </Badge>
            <h1 className="title-gold mt-3 text-4xl leading-[0.95] md:text-6xl lg:text-7xl">
              {hero.title}
            </h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/90">
              {hero.imdbRating && (
                <span className="font-semibold text-amber-300">
                  ★ {hero.imdbRating}
                </span>
              )}
              {hero.year && <span>{hero.year}</span>}
              {hero.episodes > 1 && <span>{hero.episodes} episode</span>}
              {genres.slice(0, 3).map((g) => (
                <span key={g}>{g}</span>
              ))}
            </p>
            <p className="mt-3 max-w-xl line-clamp-3 text-sm leading-relaxed text-zinc-200 md:text-base">
              {hero.synopsis}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <WatchCta
                dramaId={hero.id}
                className="h-12 px-7 text-base shadow-[0_0_24px_rgba(251,191,36,0.35)]"
              />
              <SaveButton id={hero.id} variant="hero" />
              <Button
                asChild
                variant="outline"
                className="h-12 rounded-full border-white/40 bg-black/30 px-6 text-sm font-semibold text-white backdrop-blur hover:border-amber-400 hover:text-amber-400"
              >
                <Link href={`/drama/${hero.id}`}>Detail</Link>
              </Button>
            </div>
          </div>
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Drama unggulan sebelumnya"
              className="absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/50 text-white backdrop-blur hover:bg-black/80 md:left-4"
            >
              <ChevronLeft className="size-6" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Drama unggulan berikutnya"
              className="absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/50 text-white backdrop-blur hover:bg-black/80 md:right-4"
            >
              <ChevronRight className="size-6" />
            </button>
            <div className="absolute bottom-5 left-4 z-20 flex items-center gap-1.5 md:left-10 lg:left-16">
              {dramas.map((d, i) => (
                <button
                  key={d.id}
                  type="button"
                  aria-label={`Tampilkan ${d.title}`}
                  aria-current={i === index ? "true" : undefined}
                  onClick={() => {
                    setIndex(i);
                    setTeaserStatus("loading");
                    setListening(false);
                  }}
                  className="flex h-11 min-w-11 items-center justify-center px-1"
                >
                  <span
                    className={
                      i === index
                        ? "block h-1.5 w-9 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]"
                        : "block h-1.5 w-2 rounded-full bg-white/55"
                    }
                  />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
