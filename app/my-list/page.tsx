"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Drama } from "@/lib/types";
import { readMyList } from "@/lib/myList";
import DramaCard from "@/app/components/DramaCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bookmark } from "lucide-react";

export default function MyListPage() {
  const [ids, setIds] = useState<string[] | null>(null);
  const [allDramas, setAllDramas] = useState<Drama[]>([]);

  useEffect(() => {
    fetch("/api/dramas")
      .then((r) => r.json())
      .then((data: Drama[]) => setAllDramas(data))
      .catch(() => setAllDramas([]));
  }, []);

  useEffect(() => {
    const refresh = () => setIds(readMyList());
    refresh();
    window.addEventListener("dramaku:my-list-changed", refresh);
    return () => window.removeEventListener("dramaku:my-list-changed", refresh);
  }, []);

  const dramas = (ids ?? [])
    .map((id) => allDramas.find((d) => d.id === id))
    .filter((d): d is Drama => Boolean(d));

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 md:px-6">
      <h1 className="text-xl font-bold text-white md:text-2xl">Daftar Saya</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Drama yang Anda simpan untuk ditonton nanti.
      </p>

      {ids === null ? (
        <div className="mt-12 text-center text-sm text-zinc-500">Memuat...</div>
      ) : dramas.length === 0 ? (
        <Card className="mt-16 border-zinc-800 bg-zinc-900/40">
          <CardContent className="flex flex-col items-center text-center">
            <Bookmark className="h-16 w-16 fill-zinc-700 text-zinc-700" />
            <p className="mt-3 text-sm text-zinc-500">
              Daftar Anda masih kosong.
            </p>
            <Button
              asChild
              className="mt-4 rounded-full bg-amber-400 px-5 text-sm font-semibold text-black hover:bg-amber-300"
            >
              <Link href="/discover">Jelajahi drama</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-5 lg:grid-cols-5 xl:grid-cols-6">
          {dramas.map((drama) => (
            <DramaCard key={drama.id} drama={drama} />
          ))}
        </div>
      )}
    </div>
  );
}
