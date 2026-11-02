"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  episodeDurationSec,
  getProgressEntry,
  isEpisodeWatched,
  type ProgressEntry,
} from "@/lib/progress";
import { fmtTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Check, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export default function EpisodeList({
  dramaId,
  episodes,
  posterImage,
  title,
  terang = false,
  ringkas = false,
  className = "mt-3",
}: {
  dramaId: string;
  episodes: number;
  posterImage?: string;
  title: string;
  /**
   * Gambar untuk LATAR TERANG (halaman film sejak owner 2026-10-29).
   * Default `false` = tampilan gelap seperti semula.
   */
  terang?: boolean;
  /**
   * Bentuk untuk KOLOM SEMPIT — sidebar 320px di bingkai hero halaman drama
   * (owner 2026-11-02, saat episode ditukar tempat dengan "Drama Terkait").
   *
   * Dua hal yang dikecilkan, dan dua-duanya karena ARITMATIKA LEBAR, bukan
   * selera: di kolom 320px ruang bersih untuk satu baris tinggal ~276px.
   * Bentuk lebar memakan 96px gambar + ~86px badge status + 24px jarak,
   * menyisakan ~70px untuk judul — kurang dari lebar tulisan "Episode 43",
   * jadi judulnya membungkus jadi dua baris di SETIAP episode dua digit.
   *
   *   • gambar 96px → 80px
   *   • badge status DIBUANG, statusnya turun ke baris kecil di bawah judul
   *
   * Statusnya TIDAK hilang: centang/▶ di atas gambar tetap digambar, dan
   * baris kecil itu menampung status + durasi sekaligus. Default `false`
   * supaya bentuk lebar yang sudah dipakai sejak lama tidak ikut berubah.
   */
  ringkas?: boolean;
  /**
   * Kelas untuk `<ol>` pembungkus. Dipakai PanelEpisode untuk menjadikan
   * daftarnya area gulung di layar lebar; default `mt-3` = jarak seperti
   * semula saat dipasang mengalir di dalam halaman.
   */
  className?: string;
}) {
  const [entry, setEntry] = useState<ProgressEntry | null>(null);

  useEffect(() => {
    const load = () => setEntry(getProgressEntry(dramaId));
    load();
    window.addEventListener("dramaku:progress-changed", load);
    return () => window.removeEventListener("dramaku:progress-changed", load);
  }, [dramaId]);

  const list = Array.from({ length: episodes }, (_, i) => i + 1);

  return (
    <ol className={cn("space-y-2", className)}>
      {list.map((ep) => {
        const watched = isEpisodeWatched(entry, ep);
        const current = entry?.episode === ep && !watched;
        const dur = episodeDurationSec(entry, ep);
        const status = watched
          ? "Ditonton"
          : current
            ? "Sedang ditonton"
            : "Belum";
        return (
          <li key={ep}>
            <Link
              href={`/feed/${dramaId}?ep=${ep}`}
              className={cn(
                "flex min-h-16 items-center gap-3 rounded-xl border p-2 pr-3 transition-colors hover:border-amber-400/60",
                terang
                  ? "border-zinc-200 bg-zinc-50 hover:bg-zinc-100"
                  : "border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900",
              )}
            >
              <div
                className={cn(
                  "relative shrink-0 overflow-hidden rounded-lg bg-zinc-800",
                  ringkas ? "h-12 w-20" : "h-14 w-24",
                )}
              >
                {posterImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={posterImage}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
                <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                  {watched ? (
                    <Check className="size-5 text-amber-400" />
                  ) : (
                    <Play className="size-5 fill-white text-white" />
                  )}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-semibold", terang ? "text-zinc-900" : "text-white")}>
                  Episode {ep}
                  <span className="sr-only"> {title}</span>
                </p>
                <p className={cn("text-[11px]", terang ? "text-zinc-500" : "text-zinc-500")}>
                  {/* Di kolom sempit badge status dibuang, jadi baris inilah
                      satu-satunya tempat status masih tertulis — digabung
                      dengan durasi supaya tetap satu baris. */}
                  {ringkas
                    ? dur > 0
                      ? `${status} · ${fmtTime(dur)}`
                      : status
                    : dur > 0
                      ? fmtTime(dur)
                      : "Durasi —"}
                </p>
              </div>
              {!ringkas && (
                <Badge
                  variant="secondary"
                  className={
                    watched
                      ? "shrink-0 bg-amber-400/15 text-[10px] font-semibold text-amber-300"
                      : current
                        ? "shrink-0 bg-white/10 text-[10px] font-semibold text-white"
                        : "shrink-0 bg-zinc-800 text-[10px] font-normal text-zinc-400"
                  }
                >
                  {status}
                </Badge>
              )}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
