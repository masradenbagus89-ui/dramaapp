"use client";

import { useEffect, useRef, useState } from "react";
import type { Drama } from "@/lib/types";
import Poster from "@/app/components/Poster";
import { FREE_EPISODES, PAYWALL_ENABLED } from "@/lib/coins";
import {
  HERO_TEASER_DELAY_MS,
  TRAILER_CLIP_SEC,
  TRAILER_START_SEC,
  nextTrailerEpisode,
  shouldGiveUpVideo,
  teaserSrc,
  trailerClipDone,
  trailerTotalClips,
} from "@/lib/hero-teaser";

/**
 * Poster halaman detail yang memutar trailer montase: cuplikan pendek tiap
 * episode bergiliran (tanpa suara), lalu kembali ke poster diam.
 *
 * Tidak ada berkas trailer terpisah — potongannya diambil dari berkas episode
 * yang sudah ada lewat /api/teaser, jadi tiap drama otomatis punya trailer.
 * Video gagal/tak tersedia = poster biasa tetap tampil (gagal-aman).
 */
export default function DramaTrailer({ drama }: { drama: Drama }) {
  // Drama premium saat paywall menyala: hanya episode gratis yang digilir.
  // Episode terkunci ditolak /api/teaser (montase macet) dan memutarnya di
  // trailer sama saja membocorkan isi berbayar.
  const jumlahEp =
    PAYWALL_ENABLED && drama.premium
      ? Math.min(drama.episodes, FREE_EPISODES)
      : drama.episodes;
  const [ep, setEp] = useState(0); // 0 = belum mulai / sudah selesai
  const [playing, setPlaying] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const startAtRef = useRef(0);
  const clipsRef = useRef(0);
  const errorsRef = useRef(0);
  // timeupdate bisa terpicu beberapa kali sebelum episode berganti — kunci ini
  // memastikan satu potongan hanya dihitung sekali (tanpa itu episode terlompati).
  const clipDoneRef = useRef(false);

  // Mulai sesudah jeda (pengunjung sekejap & bot tak ikut menarik video),
  // dan tidak sama sekali bagi yang memilih "kurangi animasi".
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => setEp(1), HERO_TEASER_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  // Jeda saat kotak tergulung keluar layar — hemat kuota penonton & PC backup.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const io = new IntersectionObserver(([entry]) => {
      const v = videoRef.current;
      if (!v) return;
      if (entry.isIntersecting) v.play().catch(() => {});
      else v.pause();
    });
    io.observe(box);
    return () => io.disconnect();
  }, []);

  const stop = () => {
    setEp(0);
    setPlaying(false);
  };

  const advance = () => {
    if (clipDoneRef.current) return;
    clipDoneRef.current = true;
    clipsRef.current += 1;
    if (clipsRef.current >= trailerTotalClips(jumlahEp)) return stop();
    const next = nextTrailerEpisode(ep, jumlahEp);
    // Drama 1 episode (film): src tak berubah, jadi ulang potongannya manual.
    if (next === ep && videoRef.current) {
      videoRef.current.currentTime = startAtRef.current;
      clipDoneRef.current = false;
      return;
    }
    // Sembunyikan video sampai potongan berikutnya benar-benar jalan: yang
    // terlihat sesaat adalah poster, bukan layar hitam.
    setPlaying(false);
    setEp(next);
  };

  const media =
    ep > 0 ? (
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          key={ep}
          src={teaserSrc(drama.id, ep)}
          autoPlay
          muted
          playsInline
          preload="auto"
          aria-hidden
          className={`h-full w-full object-cover transition-opacity duration-500 ${
            playing ? "opacity-100" : "opacity-0"
          }`}
          onLoadedMetadata={(e) => {
            // Lewati intro kalau episodenya cukup panjang; kalau pendek, dari awal.
            const v = e.currentTarget;
            startAtRef.current =
              v.duration > TRAILER_START_SEC + TRAILER_CLIP_SEC ? TRAILER_START_SEC : 0;
            v.currentTime = startAtRef.current;
            clipDoneRef.current = false;
          }}
          onPlaying={() => {
            errorsRef.current = 0;
            setPlaying(true);
          }}
          onTimeUpdate={(e) => {
            if (trailerClipDone(e.currentTarget.currentTime, startAtRef.current)) advance();
          }}
          onEnded={advance}
          onError={() => {
            // Satu episode rusak → lompati; terlalu banyak berturut-turut → menyerah.
            errorsRef.current += 1;
            if (shouldGiveUpVideo(errorsRef.current)) return stop();
            // Metadata tak pernah termuat, jadi kunci potongan belum dibuka di sana.
            clipDoneRef.current = false;
            advance();
          }}
        />
        {playing && (
          <span className="pointer-events-none absolute inset-x-0 bottom-7 z-20 mx-auto w-fit rounded-sm bg-black/70 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white md:text-[11px]">
            ▶ Cuplikan Ep {ep}
          </span>
        )}
      </div>
    ) : null;

  return (
    <div ref={boxRef}>
      <Poster drama={drama} showBadge={false} media={media} />
    </div>
  );
}
