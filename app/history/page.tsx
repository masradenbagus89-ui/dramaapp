"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Drama } from "@/lib/types";
import {
  clearProgress,
  groupHistoryByBucket,
  readHistory,
  removeProgress,
  type HistoryItem,
} from "@/lib/progress";
import HistoryCard from "@/app/components/HistoryCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [allDramas, setAllDramas] = useState<Drama[]>([]);
  const [dramasReady, setDramasReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/dramas", { signal: ac.signal })
      .then((r) => r.json())
      .then((data: Drama[]) => {
        setAllDramas(Array.isArray(data) ? data : []);
        setLoadError(false);
        setDramasReady(true);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setAllDramas([]);
        setLoadError(true);
        setDramasReady(true);
      });
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const refresh = () => setItems(readHistory());
    refresh();
    window.addEventListener("dramaku:progress-changed", refresh);
    return () => window.removeEventListener("dramaku:progress-changed", refresh);
  }, []);

  const byId = useMemo(
    () => new Map(allDramas.map((d) => [d.id, d])),
    [allDramas],
  );

  const visible = useMemo(() => {
    if (!items) return [];
    return items.filter((h) => byId.has(h.dramaId));
  }, [items, byId]);

  const sections = useMemo(() => groupHistoryByBucket(visible), [visible]);

  const onRemove = (dramaId: string) => {
    removeProgress(dramaId);
  };

  const onClearAll = () => {
    if (
      !confirm(
        "Hapus semua riwayat tontonan? Baris Lanjut Nonton di Beranda juga ikut kosong.",
      )
    ) {
      return;
    }
    clearProgress();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 md:px-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white md:text-2xl">
            Riwayat tontonan
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Drama yang baru saja kamu tonton. Tersimpan di perangkat ini.
          </p>
        </div>
        {visible.length > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={onClearAll}
            className="shrink-0 rounded-full border-zinc-700 bg-transparent text-xs font-semibold text-zinc-300 hover:border-red-500 hover:text-red-400"
          >
            Hapus semua
          </Button>
        )}
      </div>

      {items === null || !dramasReady ? (
        <div className="mt-12 text-center text-sm text-zinc-500">Memuat...</div>
      ) : loadError ? (
        <Card className="mt-16 border-zinc-800 bg-zinc-900/40">
          <CardContent className="flex flex-col items-center text-center">
            <Clock className="h-16 w-16 text-zinc-700" />
            <p className="mt-3 text-sm text-zinc-500">
              Gagal memuat daftar drama. Coba buka ulang halaman ini.
            </p>
          </CardContent>
        </Card>
      ) : visible.length === 0 ? (
        <Card className="mt-16 border-zinc-800 bg-zinc-900/40">
          <CardContent className="flex flex-col items-center text-center">
            <Clock className="h-16 w-16 text-zinc-700" />
            <p className="mt-3 text-sm text-zinc-500">
              Belum ada riwayat. Nonton drama, lalu kembali ke sini.
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
        <div className="mt-8 space-y-9">
          {sections.map((section) => (
            <section key={section.id}>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-400">
                {section.label}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-5 lg:grid-cols-5 xl:grid-cols-6">
                {section.items.map((item) => {
                  const drama = byId.get(item.dramaId);
                  if (!drama) return null;
                  return (
                    <HistoryCard
                      key={item.dramaId}
                      drama={drama}
                      episode={item.episode}
                      positionSec={item.positionSec}
                      durationSec={item.durationSec}
                      onRemove={() => onRemove(item.dramaId)}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
