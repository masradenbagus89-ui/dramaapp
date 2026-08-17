"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Drama } from "@/lib/types";
import { readHistory, type HistoryItem } from "@/lib/progress";
import HistoryCard from "@/app/components/HistoryCard";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import { removeProgress } from "@/lib/progress";
import { getContinueWatching } from "@/lib/profile-dashboard";

type Props = {
  dramas: Drama[];
  maxItems?: number;
};

export default function RecentHistoryRow({ dramas, maxItems = 6 }: Props) {
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
        <h2 className="text-lg font-bold text-white">Riwayat Terbaru</h2>
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
          <History className="size-5 text-amber-400" />
          <h2 className="text-lg font-bold text-white">Riwayat Terbaru</h2>
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
          return (
            <HistoryCard
              key={item.dramaId}
              drama={drama}
              episode={item.episode}
              positionSec={item.positionSec}
              durationSec={item.durationSec}
              onRemove={() => removeProgress(item.dramaId)}
            />
          );
        })}
      </div>
    </section>
  );
}
