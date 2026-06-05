"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import ActionRail from "./ActionRail";
import { setProgress } from "@/lib/progress";
import { setLiked } from "@/lib/myLikes";

const FALLBACK = "/sample.mp4";

// Feed vertikal ala Melolo: tiap episode = 1 slide full-screen, geser ke atas =
// episode berikutnya, autoplay saat slide terlihat, video habis = auto lanjut.
export default function FeedPlayer({
  dramaId,
  title,
  episodes,
  baseUrl,
  startEp,
  posterImage,
}: {
  dramaId: string;
  title: string;
  episodes: number;
  baseUrl: string;
  startEp: number;
  posterImage?: string;
}) {
  const eps = Array.from({ length: episodes }, (_, i) => i + 1);
  const [active, setActive] = useState(startEp - 1);
  const [paused, setPaused] = useState(false);
  const [heart, setHeart] = useState(false);

  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const lastTap = useRef(0);

  const srcFor = (ep: number) =>
    baseUrl ? `${baseUrl}/${dramaId}/${ep}.mp4` : `/videos/${dramaId}/${ep}.mp4`;

  // Loncat ke episode awal saat pertama kali render.
  useEffect(() => {
    slideRefs.current[startEp - 1]?.scrollIntoView({ behavior: "auto" });
  }, [startEp]);

  // Deteksi slide mana yang sedang terlihat → jadikan "active".
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.6) {
            setActive(Number((e.target as HTMLElement).dataset.idx));
          }
        }
      },
      { threshold: [0.6] },
    );
    slideRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [episodes]);

  // Saat active berubah: mainkan yang aktif, pause sisanya, simpan progress.
  useEffect(() => {
    setPaused(false);
    setProgress(dramaId, active + 1);
    for (const [k, v] of Object.entries(videoRefs.current)) {
      if (!v) continue;
      if (Number(k) === active) {
        v.play().catch(() => setPaused(true)); // browser blokir autoplay → tampil tombol play
      } else {
        v.pause();
      }
    }
  }, [active, dramaId]);

  const goNext = useCallback(() => {
    slideRefs.current[active + 1]?.scrollIntoView({ behavior: "smooth" });
  }, [active]);

  const togglePlay = () => {
    const v = videoRefs.current[active];
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
  };

  // 1x tap = play/pause, 2x tap = like (dengan animasi hati).
  const onTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      lastTap.current = 0;
      setLiked(dramaId, true);
      fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dramaId, action: "like" }),
      }).catch(() => {});
      setHeart(true);
      window.setTimeout(() => setHeart(false), 700);
    } else {
      lastTap.current = now;
      window.setTimeout(() => {
        if (lastTap.current === now) togglePlay();
      }, 280);
    }
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black">
      <div className="h-full w-full snap-y snap-mandatory overflow-y-scroll [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
        {eps.map((ep, idx) => {
          const near = Math.abs(idx - active) <= 1; // hanya mount video di sekitar slide aktif
          return (
            <div
              key={ep}
              data-idx={idx}
              ref={(el) => {
                slideRefs.current[idx] = el;
              }}
              className="relative flex h-[100dvh] w-full snap-start items-center justify-center"
            >
              {near ? (
                <video
                  ref={(el) => {
                    videoRefs.current[idx] = el;
                  }}
                  src={srcFor(ep)}
                  playsInline
                  preload={idx === active ? "auto" : "metadata"}
                  onEnded={() => idx === active && goNext()}
                  onError={(e) => {
                    const v = e.currentTarget;
                    if (!v.dataset.fb) {
                      v.dataset.fb = "1";
                      v.src = FALLBACK;
                    }
                  }}
                  onClick={idx === active ? onTap : undefined}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="h-full w-full bg-zinc-950" />
              )}
            </div>
          );
        })}
      </div>

      {/* Overlay tetap di atas slide aktif */}
      <Link
        href={`/drama/${dramaId}`}
        className="absolute left-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"
        aria-label="Kembali"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
        </svg>
      </Link>

      <div className="pointer-events-none absolute bottom-24 left-3 right-20 z-10">
        <h1 className="text-base font-semibold text-white drop-shadow-lg">{title}</h1>
        <p className="text-xs text-zinc-300 drop-shadow-lg">
          Episode {active + 1} / {episodes}
        </p>
      </div>

      <ActionRail dramaId={dramaId} title={title} posterImage={posterImage} />

      {/* Bar progress episode tipis di bawah */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-1 bg-white/15">
        <div
          className="h-full bg-amber-400 transition-all"
          style={{ width: `${((active + 1) / episodes) * 100}%` }}
        />
      </div>

      {paused && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 z-10 flex items-center justify-center"
          aria-label="Putar"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50">
            <svg viewBox="0 0 24 24" className="h-8 w-8 fill-white">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      )}

      {heart && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="h-28 w-28 animate-ping fill-rose-500/90">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
        </div>
      )}

      {active === 0 && (
        <div className="pointer-events-none absolute bottom-10 left-1/2 z-10 -translate-x-1/2 text-center text-[11px] text-white/70">
          Geser ke atas untuk episode berikutnya ↑
        </div>
      )}
    </div>
  );
}
