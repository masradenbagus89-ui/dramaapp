"use client";

import { useRef } from "react";
import Link from "next/link";
import type { Drama } from "@/lib/types";
import Poster from "./Poster";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";

type Props = {
  title: string;
  subtitle?: string;
  dramas: Drama[];
  /** Link "Lihat semua" di kanan judul (opsional). */
  href?: string;
  /** id -> episode terakhir. Kalau ada, item jadi "Lanjut Eps X" → /feed. */
  continueMap?: Record<string, number>;
};

// Baris konten horizontal ala Netflix/Melolo: judul + carousel poster yang bisa
// digeser. Di HP cukup swipe; di desktop muncul tombol panah saat hover.
export default function ContentRow({
  title,
  subtitle,
  dramas,
  href,
  continueMap,
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
          <h2 className="text-base font-bold text-white md:text-lg">{title}</h2>
          {subtitle && <p className="text-[11px] text-zinc-500">{subtitle}</p>}
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
        {/* Tombol panah (desktop, muncul saat hover baris) */}
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={() => scroll(-1)}
          aria-label="Geser kiri"
          className="absolute left-0 top-[42%] z-10 hidden h-10 w-10 -translate-y-1/2 rounded-full bg-black/70 text-white opacity-0 shadow-lg hover:bg-black md:flex md:group-hover/row:opacity-100"
        >
          <ChevronLeft className="size-6" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={() => scroll(1)}
          aria-label="Geser kanan"
          className="absolute right-0 top-[42%] z-10 hidden h-10 w-10 -translate-y-1/2 rounded-full bg-black/70 text-white opacity-0 shadow-lg hover:bg-black md:flex md:group-hover/row:opacity-100"
        >
          <ChevronRight className="size-6" />
        </Button>

        <div
          ref={scroller}
          className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1 md:px-0"
        >
          {dramas.map((d) => {
            const ep = continueMap?.[d.id];
            const to = ep ? `/feed/${d.id}?ep=${ep}` : `/drama/${d.id}`;
            return (
              <Link
                key={d.id}
                href={to}
                className="block w-28 shrink-0 transition-transform hover:-translate-y-1 sm:w-32 md:w-36"
              >
                <Poster drama={d} />
                <h3 className="mt-1.5 line-clamp-1 text-xs font-medium text-white">
                  {d.title}
                </h3>
                {ep ? (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-amber-400">
                    <Play className="size-3 fill-amber-400 text-amber-400" />
                    Lanjut Eps {ep}
                  </p>
                ) : (
                  <p className="line-clamp-1 text-[11px] text-zinc-500">
                    {d.category}
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
