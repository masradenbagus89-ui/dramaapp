"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Drama } from "@/lib/types";
import { readMyList } from "@/lib/myList";
import DramaCard from "@/app/components/DramaCard";

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
        <div className="mt-16 flex flex-col items-center text-center">
          <svg viewBox="0 0 24 24" className="h-16 w-16 fill-zinc-700">
            <path d="M6 2h12a2 2 0 012 2v18l-8-4-8 4V4a2 2 0 012-2z" />
          </svg>
          <p className="mt-3 text-sm text-zinc-500">Daftar Anda masih kosong.</p>
          <Link
            href="/discover"
            className="mt-4 rounded-full bg-amber-400 px-5 py-2 text-sm font-semibold text-black"
          >
            Jelajahi drama
          </Link>
        </div>
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
