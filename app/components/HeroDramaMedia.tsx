"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import type { Drama } from "@/lib/types";
import { FREE_EPISODES, PAYWALL_ENABLED } from "@/lib/coins";
import { getProgressEntry } from "@/lib/progress";
import { tujuanNonton } from "@/lib/tujuan-nonton";
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
 * Lapisan hidup di ATAS gambar besar halaman detail: trailer montase yang
 * mulai sendiri (cuplikan Ep 1 → Ep 2 → … bergiliran, tanpa suara), plus
 * tombol play yang membawa penonton LANGSUNG ke tontonannya.
 *
 * ⚠️ Gambarnya sendiri SENGAJA ditinggal di `app/drama/[id]/page.tsx` yang
 * Server Component. Gambar itu LCP halaman ini (elemen terbesar yang
 * menentukan "halaman terasa cepat atau tidak"); memindahkannya ke komponen
 * client berarti menunda justru elemen yang paling menentukan kesan itu.
 * Komponen ini hanya menumpuk lapisan di atasnya.
 *
 * Gagal-aman di dua lapis: video gagal → gambar diam tetap tampil, dan tombol
 * play tetap berfungsi karena tujuannya sama sekali tidak bergantung pada video.
 *
 * Asal-usul: lahir sebagai `DramaTrailer` (trailer di poster kecil kiri-bawah,
 * rilis 2026-11-09). Owner memindahkannya ke gambar besar di hari yang sama —
 * mesin montasenya dipertahankan apa adanya, yang berganti cuma wadah + tombol.
 */
export default function HeroDramaMedia({ drama }: { drama: Drama }) {
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

  // Tujuan tombol play. Nilai AWAL sengaja "Mulai Nonton": `localStorage` cuma
  // ada di browser, jadi menebaknya saat render server bikin HTML server dan
  // browser berbeda (hydration mismatch). Pola yang sama dipakai WatchCta.
  const [tujuan, setTujuan] = useState(() => tujuanNonton(drama.id, null));
  useEffect(() => {
    setTujuan(tujuanNonton(drama.id, getProgressEntry(drama.id)));
  }, [drama.id]);

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
    // terlihat sesaat adalah gambar diam, bukan layar hitam.
    setPlaying(false);
    setEp(next);
  };

  return (
    <div ref={boxRef} className="absolute inset-0">
      {ep > 0 && (
        <video
          ref={videoRef}
          key={ep}
          src={teaserSrc(drama.id, ep)}
          autoPlay
          muted
          playsInline
          preload="auto"
          aria-hidden
          // `object-top` WAJIB sama dengan gambar diamnya di page.tsx. Kalau
          // video dipusatkan sementara gambar ditempel ke atas, framing-nya
          // LOMPAT tepat saat video muncul — dan penonton melihatnya sebagai
          // gambar yang tiba-tiba bergeser, bukan sebagai trailer yang mulai.
          className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-500 ${
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
      )}

      {/* Gelap-bertingkat dipindah KE SINI dari page.tsx supaya video ikut
          digelapkan persis seperti gambar diamnya — tanpa itu tampilan melompat
          jadi terang saat video muncul.
          ⚠️ `pointer-events-none` WAJIB: lapisan ini menutupi SELURUH kotak,
          jadi tanpa itu ia menelan setiap klik dan tombol play di bawahnya
          tidak pernah bisa ditekan — rusak SENYAP, nol error di layar. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/10" />

      {playing && (
        <span className="pointer-events-none absolute right-3 top-3 z-20 rounded-sm bg-black/70 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white md:text-[11px]">
          ▶ Cuplikan Ep {ep}
        </span>
      )}

      {/* Tombol play: satu-satunya bagian kotak ini yang bisa diklik. Sengaja
          BUKAN seluruh gambar — hero selebar layar yang jadi tautan raksasa
          membuat penonton tak sengaja meninggalkan halaman saat hendak menggeser. */}
      <Link
        href={tujuan.href}
        aria-label={`${tujuan.label}: ${drama.title}`}
        className="absolute left-1/2 top-1/2 z-20 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/80 bg-black/40 text-white backdrop-blur-sm transition hover:scale-110 hover:bg-black/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 md:h-20 md:w-20"
      >
        <Play className="h-7 w-7 fill-current md:h-9 md:w-9" />
      </Link>
    </div>
  );
}
