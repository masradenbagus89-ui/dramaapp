"use client";

// Baris "Video dari Playly" di halaman publik /discover.
//
// Datanya TIDAK diambil dari Playly saat pengunjung membuka halaman. Yang
// dipakai adalah alamat player yang sudah disimpan admin waktu memilih video
// (lihat /admin/videos/playly). Dua keuntungannya:
//   1. Halaman tetap cepat dan tetap tampil walau server Playly sedang lambat.
//   2. Kunci API Playly sama sekali tidak ikut main di jalur publik.
//
// Pemutarnya milik Playly (embed/iframe), jadi tombol play, posisi menit, dan
// subtitle dikendalikan mereka — kita hanya menyediakan bingkainya.
import { useRef, useState } from "react";
import { Clock, Film, Play, User } from "lucide-react";
import EmbedPlayer from "./EmbedPlayer";
import type { PlaylyEmbed } from "@/lib/store";

export default function PlaylyRow({
  embeds,
  dramaTitles,
}: {
  embeds: PlaylyEmbed[];
  /** Peta dramaId -> judul drama, supaya kartu bisa menyebut asal videonya. */
  dramaTitles: Record<string, string>;
}) {
  const [aktif, setAktif] = useState<PlaylyEmbed | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);

  if (embeds.length === 0) return null;

  // Klik kartu -> pasang pemutar + gulirkan layar ke sana, supaya di HP
  // pengunjung tidak bingung "kok tidak terjadi apa-apa".
  const putar = (e: PlaylyEmbed) => {
    setAktif(e);
    requestAnimationFrame(() => {
      playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <section className="mt-10" aria-labelledby="judul-video-playly">
      <h2 id="judul-video-playly" className="text-lg font-bold text-white">
        Video dari Playly
      </h2>
      <p className="mt-1 text-sm text-zinc-400">
        Diputar langsung dari pemutar milik Playly.
      </p>

      <div ref={playerRef} className="scroll-mt-4">
        {aktif && (
          <div className="mt-4">
            <EmbedPlayer src={aktif.embedUrl} title={aktif.title} />
            <h3 className="mt-2 text-sm font-semibold text-white">{aktif.title}</h3>
            <p className="mt-1 text-xs text-zinc-400">
              {dramaTitles[aktif.dramaId] ?? aktif.dramaId}
              {aktif.episode ? ` · Episode ${aktif.episode}` : ""}
              {aktif.creator ? ` · ${aktif.creator}` : ""}
            </p>
          </div>
        )}
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {embeds.map((e) => {
          const dipilih = aktif?.videoId === e.videoId;
          return (
            <li key={e.videoId}>
              <button
                type="button"
                onClick={() => putar(e)}
                aria-current={dipilih ? "true" : undefined}
                className={`group w-full overflow-hidden rounded-xl border text-left transition ${
                  dipilih
                    ? "border-amber-400 ring-2 ring-amber-400/40"
                    : "border-zinc-800 hover:border-zinc-600"
                }`}
              >
                <div className="relative flex aspect-video w-full items-center justify-center bg-zinc-800">
                  <Film className="h-7 w-7 text-zinc-600" aria-hidden="true" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                    <Play className="h-8 w-8 fill-white text-white" aria-hidden="true" />
                  </span>
                  {e.durationLabel && e.durationLabel !== "-" && (
                    <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-medium text-zinc-100">
                      {e.durationLabel}
                    </span>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="line-clamp-2 text-xs font-semibold text-zinc-100">
                    {e.title}
                  </p>
                  <p className="mt-1 line-clamp-1 text-[11px] text-zinc-400">
                    {dramaTitles[e.dramaId] ?? e.dramaId}
                    {e.episode ? ` · Eps ${e.episode}` : ""}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[11px] text-zinc-500">
                    {e.creator && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" aria-hidden="true" />
                        {e.creator}
                      </span>
                    )}
                    {e.durationLabel && e.durationLabel !== "-" && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        {e.durationLabel}
                      </span>
                    )}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
