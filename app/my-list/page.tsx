"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Drama } from "@/lib/types";
import { readMyList } from "@/lib/myList";
import DramaCard from "@/app/components/DramaCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bookmark } from "lucide-react";
import TombolKembali from "@/app/components/TombolKembali";
import { cn } from "@/lib/utils";
import { BADAN_TERANG } from "@/app/components/beranda/shell";

export default function MyListPage() {
  const [ids, setIds] = useState<string[] | null>(null);
  const [allDramas, setAllDramas] = useState<Drama[]>([]);

  useEffect(() => {
    fetch("/api/katalog")
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
    <div className={cn(BADAN_TERANG, "min-h-screen")}>
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 md:px-6">
      {/* Judul SENGAJA "Favorit", bukan "Daftar Saya" (owner 2026-11-07).
          Nama itu dipakai di SELURUH situs untuk konsep yang sama: tombol di
          tiap kartu drama berbunyi "Tambah Favorit"/"Dalam Favorit"
          (SaveButton.tsx) dan menu akun berbunyi "Favorit" (MenuAkun.tsx).
          Judul halaman adalah satu-satunya tempat yang menyebutnya lain, jadi
          judulnya yang ikut — bukan sebaliknya. Satu konsep = satu nama
          (AGENTS.md §3.3): nama yang berbeda membuat orang mengira ia membuka
          halaman yang salah. Alamatnya tetap /my-list supaya tautan lama dan
          yang sudah di-bookmark tidak putus. */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white terang:text-zinc-900 md:text-2xl">Favorit</h1>
          <p className="mt-1 text-sm text-zinc-400 terang:text-zinc-600">
            Drama yang Anda simpan untuk ditonton nanti.
          </p>
        </div>
        <TombolKembali />
      </div>

      {ids === null ? (
        <div className="mt-12 text-center text-sm text-zinc-500 terang:text-zinc-600">Memuat...</div>
      ) : dramas.length === 0 ? (
        <Card className="mt-16 border-zinc-800 bg-zinc-900/40 terang:border-zinc-200 terang:bg-white">
          <CardContent className="flex flex-col items-center text-center">
            <Bookmark className="h-16 w-16 fill-zinc-700 text-zinc-700 terang:fill-zinc-300 terang:text-zinc-300" />
            <p className="mt-3 text-sm text-zinc-500 terang:text-zinc-600">
              Belum ada drama favorit.
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
    </div>
  );
}
