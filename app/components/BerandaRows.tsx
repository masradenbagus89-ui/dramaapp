"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Drama } from "@/lib/types";
import { readMyList } from "@/lib/myList";
import { readHistory, type HistoryItem } from "@/lib/progress";
import { parseRating, parseViews } from "@/lib/format";
import { recommendDramas } from "@/lib/recommend";
import { genreChipClass } from "@/lib/genre-accent";
import ContentRow from "./ContentRow";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const CATEGORY_ORDER = [
  "Romance",
  "Action",
  "Tycoon",
  "Time Travel",
  "Harem",
  "Comedy",
  "Fantasy",
] as const;

export default function BerandaRows({ dramas }: { dramas: Drama[] }) {
  const [mounted, setMounted] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
    const loadProgress = () => setHistory(readHistory());
    const loadSaved = () => setSaved(readMyList());
    loadProgress();
    loadSaved();
    window.addEventListener("dramaku:progress-changed", loadProgress);
    window.addEventListener("dramaku:my-list-changed", loadSaved);
    return () => {
      window.removeEventListener("dramaku:progress-changed", loadProgress);
      window.removeEventListener("dramaku:my-list-changed", loadSaved);
    };
  }, []);

  const byId = useMemo(
    () => new Map(dramas.map((d) => [d.id, d])),
    [dramas],
  );

  const trending = useMemo(
    () =>
      [...dramas]
        .sort((a, b) => parseViews(b.views) - parseViews(a.views))
        .slice(0, 12),
    [dramas],
  );

  const newest = useMemo(() => [...dramas].reverse().slice(0, 12), [dramas]);

  const popular = useMemo(() => {
    const head = new Set(trending.slice(0, 6).map((d) => d.id));
    return [...dramas]
      .sort((a, b) => parseViews(b.views) - parseViews(a.views))
      .filter((d) => !head.has(d.id))
      .slice(0, 12);
  }, [dramas, trending]);

  const topRated = useMemo(
    () =>
      [...dramas]
        .filter((d) => parseRating(d.imdbRating) > 0)
        .sort((a, b) => parseRating(b.imdbRating) - parseRating(a.imdbRating))
        .slice(0, 12),
    [dramas],
  );

  const byCategory = useMemo(() => {
    const map = new Map<string, Drama[]>();
    for (const d of dramas) {
      const arr = map.get(d.category);
      if (arr) arr.push(d);
      else map.set(d.category, [d]);
    }
    return CATEGORY_ORDER.filter((c) => (map.get(c)?.length ?? 0) >= 2).map(
      (c) => ({ category: c, items: map.get(c)! }),
    );
  }, [dramas]);

  const presentCats = useMemo(
    () => CATEGORY_ORDER.filter((c) => dramas.some((d) => d.category === c)),
    [dramas],
  );

  const continueWatching = useMemo(() => {
    if (!mounted) return [];
    return history
      .map((h) => byId.get(h.dramaId))
      .filter((d): d is Drama => Boolean(d));
  }, [mounted, history, byId]);

  const continueMap = useMemo(() => {
    const map: Record<string, { episode: number; positionSec: number }> = {};
    for (const h of history) {
      map[h.dramaId] = { episode: h.episode, positionSec: h.positionSec };
    }
    return map;
  }, [history]);

  const savedDramas = useMemo(() => {
    if (!mounted) return [];
    return saved
      .map((id) => byId.get(id))
      .filter((d): d is Drama => Boolean(d));
  }, [mounted, saved, byId]);

  const recommended = useMemo(() => {
    if (!mounted) return { genre: null as string | null, items: [] as Drama[] };
    return recommendDramas(
      dramas,
      history.map((h) => h.dramaId),
      saved,
    );
  }, [mounted, dramas, history, saved]);

  return (
    <div className="space-y-7 pt-4 md:space-y-9 md:pt-6">
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 md:px-0">
        <Badge
          asChild
          variant="secondary"
          className={cn(
            "shrink-0 border px-3.5 py-1.5 text-xs font-semibold",
            genreChipClass("Semua"),
          )}
        >
          <Link href="/discover">Semua</Link>
        </Badge>
        {presentCats.map((c) => (
          <Badge
            key={c}
            asChild
            variant="secondary"
            className={cn(
              "shrink-0 border px-3.5 py-1.5 text-xs font-semibold",
              genreChipClass(c),
            )}
          >
            <Link href={`/discover?q=${encodeURIComponent(c)}`}>{c}</Link>
          </Badge>
        ))}
      </div>

      {mounted && continueWatching.length > 0 && (
        <ContentRow
          title="Lanjut Menonton"
          subtitle="Teruskan dari menit terakhir"
          dramas={continueWatching}
          continueMap={continueMap}
          href="/history"
        />
      )}

      {mounted && recommended.items.length > 0 && (
        <ContentRow
          title={
            recommended.genre
              ? `Karena kamu suka ${recommended.genre}`
              : "Rekomendasi Untuk Kamu"
          }
          subtitle={recommended.genre ? "Rekomendasi Untuk Kamu" : undefined}
          accent={recommended.genre ?? undefined}
          dramas={recommended.items}
          href="/discover"
        />
      )}

      {mounted && savedDramas.length > 0 && (
        <ContentRow title="Favorit Saya" dramas={savedDramas} href="/my-list" />
      )}

      <ContentRow
        title="Trending Drama"
        subtitle="Paling banyak ditonton"
        dramas={trending}
        href="/discover"
      />

      <ContentRow
        title="Drama Terbaru"
        dramas={newest}
        href="/discover"
      />

      {popular.length > 0 && (
        <ContentRow
          title="Drama Populer"
          dramas={popular}
          href="/discover"
        />
      )}

      {topRated.length > 0 && (
        <ContentRow
          title="Rating Tertinggi"
          subtitle="Berdasarkan IMDb"
          dramas={topRated}
          href="/discover"
        />
      )}

      {byCategory.map(({ category, items }) => (
        <ContentRow
          key={category}
          title={category}
          accent={category}
          dramas={items}
          href={`/discover?q=${encodeURIComponent(category)}`}
        />
      ))}
    </div>
  );
}
