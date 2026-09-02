"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import type { Drama } from "@/lib/types";
import { teaserSrc, type TeaserStatus } from "@/lib/hero-teaser";
import HeroPreview from "./HeroPreview";

/**
 * Lama satu judul diputar di hero landing sebelum ganti (detik) — sesuai
 * permintaan pemilik: 60 detik (1 menit) per film. HeroPreview mengulang
 * potongan yang sama dari cache browser, jadi judul berikutnya baru menarik
 * byte baru.
 */
const WINDOW_SEC = 60;

/** Jeda ganti slide saat video gagal/dimatikan (poster saja) — sama seperti beranda. */
const FALLBACK_ROTATE_MS = 9000;

/**
 * Latar hero landing yang "hidup": cuplikan episode 1 berputar antar judul.
 *
 * HEMAT KUOTA VERCEL (insiden 2026-08-26, project di-pause karena 29,71 GB):
 * src memakai /api/teaser yang membalas 307 redirect — byte video mengalir
 * langsung dari PC backup ke browser, TIDAK lewat server Vercel. Ditambah
 * pagar bawaan HeroPreview: jeda unduh 1,2 detik (pengunjung sekejap/bot tak
 * menarik video) + preload="metadata" + potongan diulang dari cache.
 */
export default function LandingHero({ dramas }: { dramas: Drama[] }) {
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<TeaserStatus>("loading");
  const [reduceMotion, setReduceMotion] = useState(false);
  const count = dramas.length;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const onStatus = useCallback((s: TeaserStatus) => setStatus(s), []);

  useEffect(() => {
    if (reduceMotion || count < 2 || status === "loading") return;
    const delay = status === "playing" ? WINDOW_SEC * 1000 : FALLBACK_ROTATE_MS;
    const t = window.setTimeout(() => {
      setIndex((i) => (i + 1) % count);
      setStatus("loading");
    }, delay);
    return () => window.clearTimeout(t);
  }, [reduceMotion, count, status, index]);

  const hero = dramas[index];
  if (!hero) return null;

  const still = hero.heroImage || hero.posterImage;

  return (
    <div className="absolute inset-0">
      {/* key memaksa remount per slide, persis pola HomeHero beranda. */}
      <div className="absolute inset-0" key={hero.id}>
        <HeroPreview
          src={reduceMotion ? "" : teaserSrc(hero.id)}
          poster={still}
          title={hero.title}
          objectPosition="center"
          showBlurBg
          mutePosition="bottom-right"
          startAt={0}
          windowSec={WINDOW_SEC}
          onStatus={onStatus}
        />
      </div>

      {/* Label judul yang sedang diputar; menuntun pengunjung baru ke daftar.
          left-4 md:left-6 di bawah ini jadi PATOKAN garis kiri seluruh landing:
          header & container hero di app/page.tsx memakai px-4 md:px-6 yang sama
          persis supaya logo · judul · label ini sejajar. Ubah angkanya di sini →
          ubah juga di sana, kalau tidak kesejajarannya putus tanpa error apa pun. */}
      <Link
        href="/daftar"
        className="absolute bottom-4 left-4 z-20 inline-flex max-w-[70%] items-center gap-2 rounded-full border border-white/20 bg-black/50 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition-colors hover:border-amber-400 hover:text-amber-300 md:bottom-6 md:left-6"
      >
        <Play className="size-3.5 shrink-0 fill-current" />
        <span className="truncate">{hero.title}</span>
      </Link>
    </div>
  );
}
