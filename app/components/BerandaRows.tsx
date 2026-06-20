"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Drama } from "@/lib/types";
import { readMyList } from "@/lib/myList";
import { parseViews } from "@/lib/format";
import ContentRow from "./ContentRow";

// Urutan kategori yang ditampilkan sebagai baris (yang ada isinya saja).
const CATEGORY_ORDER = [
  "Romance",
  "Action",
  "Tycoon",
  "Time Travel",
  "Harem",
  "Comedy",
  "Fantasy",
] as const;

const PROGRESS_KEY = "dramaku:progress";

// Semua baris konten Beranda. Baris personalisasi (Lanjut Nonton, Daftar Saya)
// dibaca dari localStorage → hanya muncul setelah mount agar SSR tidak bentrok.
export default function BerandaRows({ dramas }: { dramas: Drama[] }) {
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
    const loadProgress = () => {
      try {
        const raw = localStorage.getItem(PROGRESS_KEY);
        const obj = raw ? JSON.parse(raw) : {};
        setProgress(obj && typeof obj === "object" ? obj : {});
      } catch {
        setProgress({});
      }
    };
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
    return Object.entries(progress)
      .filter(([id, ep]) => byId.has(id) && typeof ep === "number" && ep >= 1)
      .map(([id]) => byId.get(id)!);
  }, [mounted, progress, byId]);

  const savedDramas = useMemo(() => {
    if (!mounted) return [];
    return saved
      .map((id) => byId.get(id))
      .filter((d): d is Drama => Boolean(d));
  }, [mounted, saved, byId]);

  return (
    <div className="space-y-7 pt-4 md:space-y-9 md:pt-6">
      {/* Chip kategori cepat */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 md:px-0">
        <Link
          href="/discover"
          className="shrink-0 rounded-full bg-zinc-800 px-3.5 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
        >
          Semua
        </Link>
        {presentCats.map((c) => (
          <Link
            key={c}
            href={`/discover?q=${encodeURIComponent(c)}`}
            className="shrink-0 rounded-full bg-zinc-800 px-3.5 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
          >
            {c}
          </Link>
        ))}
      </div>

      {mounted && continueWatching.length > 0 && (
        <ContentRow
          title="Lanjut Nonton"
          subtitle="Teruskan dari episode terakhir"
          dramas={continueWatching}
          continueMap={progress}
        />
      )}

      {mounted && savedDramas.length > 0 && (
        <ContentRow title="Daftar Saya" dramas={savedDramas} href="/my-list" />
      )}

      <ContentRow
        title="Populer Minggu Ini"
        subtitle="Paling banyak ditonton"
        dramas={trending}
        href="/discover"
      />

      <ContentRow
        title="Baru Ditambahkan"
        dramas={newest}
        href="/discover"
      />

      {byCategory.map(({ category, items }) => (
        <ContentRow
          key={category}
          title={category}
          dramas={items}
          href={`/discover?q=${encodeURIComponent(category)}`}
        />
      ))}
    </div>
  );
}
