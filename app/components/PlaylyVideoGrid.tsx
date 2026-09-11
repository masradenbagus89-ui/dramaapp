"use client";

// Grid video Playly + pemutarnya. Dipakai halaman /playly dan baris di /discover.
//
// Sejak 2026-09-09 videonya diputar PEMUTAR KITA SENDIRI (PlaylyPlayer), bukan
// lagi <iframe> milik Playly. Alasannya: dengan iframe, tombol titik tiga yang
// dilihat penonton adalah menu bawaan Chrome (cuma "Playback speed" +
// "Picture in picture") dan tidak bisa kita ubah karena isi iframe beda domain.
// Konsekuensi yang disetujui owner: video tidak lagi lewat pemutar resmi
// Playly, jadi hitungan tayang di dashboard mereka bisa berhenti bertambah.
import { useRef, useState } from "react";
import Link from "next/link";
import { Film, Play, Star } from "lucide-react";
import PlaylyPlayer from "./player/PlaylyPlayer";
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
            <PlaylyPlayer
              key={aktif.id}
              videoId={aktif.id}
              title={aktif.title}
              poster={aktif.thumbnail}
            />
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

      {/* Kolom MENYESUAIKAN SENDIRI: sebanyak mungkin kolom selebar >=240px.
          Sebelumnya dipatok maks 4 kolom (`lg:grid-cols-4`). Itu masih pas waktu
          isi halaman dibatasi 1440px, TAPI sejak batas itu dilepas (2026-09-08,
          globals.css `.shell-wide`), 4 kolom membentang selebar layar dan tiap
          kartu jadi raksasa. Angka 240px dipilih lebih besar dari poster (110px)
          karena kartu video berbentuk melebar 16:9, bukan poster tegak. */}
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
        {tampil.map((v) => {
          const dipilih = aktif?.id === v.id;
          // Tahun & genre digabung jadi satu baris "2026 · Action, Sci-Fi".
          // Keduanya bisa null (video yang belum dikaitkan admin ke drama), jadi
          // yang kosong dibuang dulu — supaya tidak tersisa pemisah "·" menggantung.
          const metaFilm = [v.year, v.genre].filter(Boolean).join(" · ");
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
                  {/* Gelap dari bawah saat hover — biar ikon play & badge tetap
                      terbaca di atas sampul yang terang. */}
                  <span
                    className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
                    aria-hidden="true"
                  />
                  <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/60 backdrop-blur-sm">
                      <Play className="h-5 w-5 fill-white text-white" aria-hidden="true" />
                    </span>
                  </span>
                  {v.rating && (
                    <span className="absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-bold text-amber-300">
                      <Star className="h-3 w-3 fill-amber-300" aria-hidden="true" />
                      {v.rating}
                    </span>
                  )}
                  {v.durationLabel !== "-" && (
                    <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-medium text-zinc-100">
                      {v.durationLabel}
                    </span>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="line-clamp-2 text-xs font-bold text-zinc-100 transition-colors group-hover:text-white sm:text-sm">
                    {v.title}
                  </p>
                  {metaFilm && (
                    <p className="mt-1 line-clamp-1 text-[11px] text-zinc-500">
                      {metaFilm}
                    </p>
                  )}
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
