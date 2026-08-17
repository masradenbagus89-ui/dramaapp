"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Drama } from "@/lib/types";
import { readMyList } from "@/lib/myList";
import { getFavoriteDramas } from "@/lib/profile-dashboard";
import DramaCard from "@/app/components/DramaCard";
import { Button } from "@/components/ui/button";
import { Bookmark } from "lucide-react";

type Props = {
  dramas: Drama[];
  maxItems?: number;
};

export default function FavoritesRow({ dramas, maxItems = 6 }: Props) {
  const [ids, setIds] = useState<string[] | null>(null);

  useEffect(() => {
    const refresh = () => setIds(readMyList());
    refresh();
    window.addEventListener("dramaku:my-list-changed", refresh);
    return () => window.removeEventListener("dramaku:my-list-changed", refresh);
  }, []);

  const favorites = useMemo(() => {
    if (ids === null) return null;
    return getFavoriteDramas(ids, dramas, maxItems);
  }, [ids, dramas, maxItems]);

  if (favorites === null) {
    return (
      <section>
        <h2 className="text-lg font-bold text-white">Favorit</h2>
        <div className="mt-3 text-sm text-zinc-500">Memuat...</div>
      </section>
    );
  }

  if (favorites.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bookmark className="size-5 fill-amber-400 text-amber-400" />
          <h2 className="text-lg font-bold text-white">Favorit</h2>
        </div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-auto rounded-full px-3 py-1 text-xs font-semibold text-zinc-400 hover:text-white"
        >
          <Link href="/my-list">Lihat semua</Link>
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {favorites.map((drama) => (
          <DramaCard key={drama.id} drama={drama} />
        ))}
      </div>
    </section>
  );
}
