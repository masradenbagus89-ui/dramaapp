"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isMovie, type Drama } from "@/lib/types";
import {
  PLAYING_ROTATE_MS,
  swipeDirection,
  teaserSrc,
  splitHeroTitle,
  type TeaserStatus,
} from "@/lib/hero-teaser";
import HeroPreview from "./HeroPreview";
import WatchCta from "./WatchCta";
import SaveButton from "./SaveButton";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ROTATE_MS = 9000;

export default function HomeHero({
  dramas,
}: {
  dramas: Drama[];
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

  // Navigasi keyboard untuk aksesibilitas.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const hero = dramas[index];
  if (!hero) return null;

  const still = hero.heroImage || hero.posterImage;
  const teaser = teaserSrc(hero.id);
  const genres = (hero.genre || hero.category)
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);
  const titleParts = splitHeroTitle(hero.title, 3);
  const status = hero.status || "Ongoing";

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
      <div className="relative min-h-[80svh] w-full md:min-h-[90svh] lg:min-h-[92svh]">
        {/* Background: video/poster memenuhi layar, di-remount per slide. */}
        <div className="absolute inset-0" key={hero.id}>
          <HeroPreview
            src={reduceMotion ? "" : teaser}
            poster={still}
            title={hero.title}
            objectPosition="center"
            showBlurBg
            mutePosition="bottom-right"
            startAt={0}
            windowSec={20}
            onStatus={onStatus}
            onMutedChange={onMutedChange}
          />
        </div>

        {/* Gradient gelap dari kiri & bawah supaya teks tetap terbaca. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/85 via-black/35 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />

        {/* Konten utama: kiri-bawah, lebar dibatasi. */}
        <div className="pointer-events-none absolute inset-0 flex items-end px-4 pb-20 pt-24 md:px-10 md:pb-24 lg:px-16">
          <div
            className="hero-content-in pointer-events-auto w-full max-w-2xl"
            key={`content-${hero.id}`}
          >
            <Badge className="mb-3 w-fit rounded-sm bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-black">
              Trending
            </Badge>

            <h1 className="hero-title line-clamp-2 text-2xl leading-[1.1] text-white md:line-clamp-3 md:text-4xl lg:text-5xl">
              {titleParts[0]}
              {titleParts[1] && (
                <>
                  <br />
                  {titleParts[1]}
                </>
              )}
              {titleParts[2] && (
                <>
                  <br />
                  {titleParts[2]}
                </>
              )}
            </h1>

            {/* Info minimal: rating, tahun, episode, genre, status. */}
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-medium text-white/85 md:text-sm">
              {hero.imdbRating && (
                <span className="inline-flex items-center gap-1 text-amber-300">
                  <span>★</span>
                  {hero.imdbRating}
                </span>
              )}
              {hero.year && <span>{hero.year}</span>}
              <span>{isMovie(hero) ? "Film" : `${hero.episodes} Episode`}</span>
              {genres.slice(0, 2).map((g) => (
                <span key={g} className="text-white/70">
                  {g}
                </span>
              ))}
              <Badge
                className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                  status === "Completed"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-amber-400/20 text-amber-300"
                }`}
              >
                {status}
              </Badge>
            </div>

            <p className="mt-4 hidden max-w-lg text-sm leading-relaxed text-white/80 md:line-clamp-2">
              {hero.synopsis}
            </p>

            {/* Tombol aksi modern. */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <WatchCta
                dramaId={hero.id}
                className="btn-hero-primary h-11 rounded-full bg-red-600 px-7 text-sm font-bold text-white shadow-lg hover:bg-red-500 md:h-12 md:text-base"
              />
              <SaveButton
                id={hero.id}
                variant="hero"
                className="btn-hero-secondary h-11 rounded-full border-white/30 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur hover:border-amber-400 hover:bg-white/15 hover:text-amber-400 md:h-12"
              />
            </div>
          </div>
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Drama unggulan sebelumnya"
              className="absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/70 md:left-4"
            >
              <ChevronLeft className="size-6" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Drama unggulan berikutnya"
              className="absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/70 md:right-4"
            >
              <ChevronRight className="size-6" />
            </button>
            <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5">
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
                  className="flex h-10 min-w-10 items-center justify-center px-1"
                >
                  <span
                    className={`hero-dot block h-1 rounded-full bg-white/50 ${
                      i === index ? "hero-dot-active" : "w-2"
                    }`}
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
