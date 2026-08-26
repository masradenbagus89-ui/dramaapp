"use client";

// Grid video Playly + pemutarnya. Dipakai halaman /playly dan baris di /discover.
//
// Pemutarnya milik Playly (embed/iframe), jadi tombol play, posisi menit, dan
// subtitle dikendalikan mereka — kita hanya menyediakan bingkainya. Karena isi
// iframe beda domain, progres nonton video Playly memang tidak bisa kita baca.
import { useRef, useState } from "react";
import Link from "next/link";
import { Clock, Film, Play, User } from "lucide-react";
import EmbedPlayer from "./EmbedPlayer";
import type { PlaylyVideoPublik } from "@/lib/playly-publik";

export default function PlaylyVideoGrid({
  videos,
  /** Batas jumlah kartu; sisanya disembunyikan (dipakai baris ringkas di /discover). */
  limit,
}: {
  videos: PlaylyVideoPublik[];
  limit?: number;
}) {
  const [aktif, setAktif] = useState<PlaylyVideoPublik | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);

  const tampil = typeof limit === "number" ? videos.slice(0, limit) : videos;
  if (tampil.length === 0) return null;

  // Klik kartu -> pasang pemutar + gulirkan layar ke sana, supaya di HP
  // pengunjung tidak bingung "kok tidak terjadi apa-apa".
  const putar = (v: PlaylyVideoPublik) => {
    setAktif(v);
    requestAnimationFrame(() => {
      playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div>
      <div ref={playerRef} className="scroll-mt-4">
        {aktif && (
          <div className="mb-6">
            <EmbedPlayer src={aktif.embedUrl} title={aktif.title} />
            <h3 className="mt-3 text-base font-semibold text-white">{aktif.title}</h3>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
              {aktif.creator && <span>{aktif.creator}</span>}
              {aktif.durationLabel !== "-" && <span>{aktif.durationLabel}</span>}
              {aktif.dramaHref && aktif.dramaTitle && (
                <Link href={aktif.dramaHref} className="text-amber-400 underline">
                  {aktif.dramaTitle}
                  {aktif.episode ? ` · Episode ${aktif.episode}` : ""}
                </Link>
              )}
            </p>
          </div>
        )}
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tampil.map((v) => {
          const dipilih = aktif?.id === v.id;
          return (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => putar(v)}
                aria-current={dipilih ? "true" : undefined}
                className={`group w-full overflow-hidden rounded-xl border text-left transition ${
                  dipilih
                    ? "border-amber-400 ring-2 ring-amber-400/40"
                    : "border-zinc-800 hover:border-zinc-600"
                }`}
              >
                <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-zinc-800">
                  {v.thumbnail ? (
                    // Sampul dari Playly berupa data URI atau alamat https yang
                    // sudah disaring di server. next/image sengaja tidak dipakai:
                    // ia tidak bisa mengoptimalkan data URI, dan menambahkannya ke
                    // daftar domain hanya untuk ini tidak sepadan.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={v.thumbnail}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <Film className="h-7 w-7 text-zinc-600" aria-hidden="true" />
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                    <Play className="h-8 w-8 fill-white text-white" aria-hidden="true" />
                  </span>
                  {v.durationLabel !== "-" && (
                    <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-medium text-zinc-100">
                      {v.durationLabel}
                    </span>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="line-clamp-2 text-xs font-semibold text-zinc-100">
                    {v.title}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[11px] text-zinc-500">
                    {v.creator && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" aria-hidden="true" />
                        {v.creator}
                      </span>
                    )}
                    {v.durationLabel !== "-" && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        {v.durationLabel}
                      </span>
                    )}
                  </p>
                  {v.dramaTitle && (
                    <p className="mt-1 line-clamp-1 text-[11px] text-amber-400/80">
                      {v.dramaTitle}
                      {v.episode ? ` · Eps ${v.episode}` : ""}
                    </p>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
