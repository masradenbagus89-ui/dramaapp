"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Drama } from "@/lib/types";
import {
  getProgressEntry,
  readHistory,
  resumePosition,
  type HistoryItem,
} from "@/lib/progress";
import HistoryCard from "@/app/components/HistoryCard";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { removeProgress } from "@/lib/progress";
import { getContinueWatching } from "@/lib/profile-dashboard";

type Props = {
  dramas: Drama[];
  maxItems?: number;
};

export default function ContinueWatchingRow({ dramas, maxItems = 6 }: Props) {
  const [items, setItems] = useState<HistoryItem[] | null>(null);

  useEffect(() => {
    const refresh = () => setItems(readHistory());
    refresh();
    window.addEventListener("dramaku:progress-changed", refresh);
    return () => window.removeEventListener("dramaku:progress-changed", refresh);
  }, []);

  const byId = useMemo(() => new Map(dramas.map((d) => [d.id, d])), [dramas]);

  const visible = useMemo(() => {
    if (!items) return [];
    return getContinueWatching(items, dramas, maxItems);
  }, [items, dramas, maxItems]);

  if (items === null) {
    return (
      <section>
        <h2 className="text-lg font-bold text-white">Lanjut Menonton</h2>
        <div className="mt-3 text-sm text-zinc-500">Memuat...</div>
      </section>
    );
  }

  if (visible.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock className="size-5 text-amber-400" />
          <h2 className="text-lg font-bold text-white">Lanjut Menonton</h2>
        </div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-auto rounded-full px-3 py-1 text-xs font-semibold text-zinc-400 hover:text-white"
        >
          <Link href="/history">Lihat semua</Link>
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {visible.map((item) => {
          const drama = byId.get(item.dramaId)!;
          const entry = getProgressEntry(item.dramaId);
          const positionSec = resumePosition(entry, item.episode);
          return (
            <HistoryCard
              key={item.dramaId}
              drama={drama}
              episode={item.episode}
              positionSec={positionSec}
              durationSec={item.durationSec}
              onRemove={() => removeProgress(item.dramaId)}
            />
          );
        })}
      </div>
    </section>
  );
}
