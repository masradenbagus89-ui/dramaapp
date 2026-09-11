"use client";

import { useEffect, useMemo, useState } from "react";
import type { Drama } from "@/lib/types";
import { readMyList } from "@/lib/myList";
import { readHistory, type HistoryItem } from "@/lib/progress";
import {
  latestHistoryDrama,
  recommendDramas,
  similarToDrama,
  trendingInGenre,
} from "@/lib/recommend";
import ContentRow from "../ContentRow";

/**
 * Baris carousel yang isinya BEDA per penonton: lanjut menonton, drama serupa,
 * rekomendasi, favorit.
 *
 * Sengaja terpisah dari grid katalog (CatalogBrowser). Bedanya bukan gaya,
 * tapi SUMBER data: baris di sini dibaca dari localStorage browser, jadi hanya
 * bisa dihitung SESUDAH komponen menempel (mounted) — kalau digabung ke grid,
 * seluruh katalog ikut tertunda menunggu data yang cuma milik satu orang.
 *
 * Baris generik (Trending / Terbaru / Populer / Rating tertinggi) TIDAK ada di
 * sini lagi: semuanya sudah jadi pilihan "Urutkan" di grid katalog, dan dua
 * tempat yang menampilkan daftar sama hanya membuat beranda memanjang.
 */
export default function PersonalRows({ dramas }: { dramas: Drama[] }) {
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

  const byId = useMemo(() => new Map(dramas.map((d) => [d.id, d])), [dramas]);

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
    return saved.map((id) => byId.get(id)).filter((d): d is Drama => Boolean(d));
  }, [mounted, saved, byId]);

  const latestDrama = useMemo(() => {
    if (!mounted || history.length === 0) return null;
    return latestHistoryDrama(
      dramas,
      history.map((h) => h.dramaId),
    );
  }, [mounted, dramas, history]);

  const similar = useMemo(() => {
    if (!mounted || !latestDrama)
      return { base: null as Drama | null, items: [] as Drama[] };
    return similarToDrama(
      latestDrama.id,
      dramas,
      history.map((h) => h.dramaId),
      saved,
    );
  }, [mounted, latestDrama, dramas, history, saved]);

  const recommended = useMemo(() => {
    if (!mounted) return { genre: null as string | null, items: [] as Drama[] };
    return recommendDramas(
      dramas,
      history.map((h) => h.dramaId),
      saved,
    );
  }, [mounted, dramas, history, saved]);

  const trendingGenre = useMemo(() => {
    if (!mounted) return [] as Drama[];
    return trendingInGenre(recommended.genre, dramas, 12);
  }, [mounted, recommended.genre, dramas]);

  // Penonton baru (belum pernah menonton & belum menyimpan apa pun) tidak punya
  // satu baris pun di sini. Kembalikan null supaya beranda tidak menyisakan
  // jarak kosong yang tak jelas asalnya.
  if (!mounted) return null;

  return (
    <div className="space-y-7 md:space-y-9">
      {continueWatching.length > 0 && (
        <ContentRow
          title="Lanjut Menonton"
          subtitle="Teruskan dari menit terakhir"
          dramas={continueWatching}
          continueMap={continueMap}
          href="/history"
        />
      )}

      {similar.base && similar.items.length > 0 && (
        <ContentRow
          title={`Karena kamu menonton ${similar.base.title}`}
          subtitle="Drama serupa yang belum kamu tonton"
          accent={similar.base.category}
          dramas={similar.items}
          href="/discover"
        />
      )}

      {!similar.base && recommended.items.length > 0 && (
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

      {trendingGenre.length > 0 && recommended.genre && (
        <ContentRow
          title={`Trending di ${recommended.genre}`}
          subtitle="Paling banyak ditonton di genre favoritmu"
          accent={recommended.genre}
          dramas={trendingGenre}
          href={`/discover?q=${encodeURIComponent(recommended.genre)}`}
        />
      )}

      {savedDramas.length > 0 && (
        <ContentRow title="Favorit Saya" dramas={savedDramas} href="/my-list" />
      )}
    </div>
  );
}
