"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import type { Drama } from "@/lib/types";
import { getProgressEntry } from "@/lib/progress";
import { tujuanNonton } from "@/lib/tujuan-nonton";
import {
  HERO_TEASER_DELAY_MS,
  cuplikanSelesai,
  teaserSrc,
  trailerSrc,
} from "@/lib/hero-teaser";

/**
 * Sumber video yang sedang dicoba. Urutannya SENGAJA menurun: yang paling
 * bagus dulu, lalu jalan mundur yang selalu tersedia.
 *   "trailer" — berkas trailer.mp4 buatan owner. Belum tentu ada.
 *   "ep1"     — pembukaan Episode 1. Selalu ada selama dramanya punya video.
 *   null      — diam (belum mulai, atau sudah selesai/menyerah).
 */
type SumberCuplikan = "trailer" | "ep1" | null;

/**
 * Lapisan hidup di ATAS gambar besar halaman detail: cuplikan yang mulai
 * sendiri, plus tombol play yang membawa penonton LANGSUNG ke tontonannya.
 *
 * ⚠️ Gambarnya sendiri SENGAJA ditinggal di `app/drama/[id]/page.tsx` yang
 * Server Component. Gambar itu LCP halaman ini (elemen terbesar yang
 * menentukan "halaman terasa cepat atau tidak"); memindahkannya ke komponen
 * client berarti menunda justru elemen yang paling menentukan kesan itu.
 * Komponen ini hanya menumpuk lapisan di atasnya.
 *
 * Gagal-aman berlapis: trailer tak ada → pembukaan Episode 1; itu pun gagal →
 * gambar diam tetap tampil. Tombol play TIDAK pernah ikut mati, karena
 * tujuannya sama sekali tidak bergantung pada video.
 */
export default function HeroDramaMedia({ drama }: { drama: Drama }) {
  const [sumber, setSumber] = useState<SumberCuplikan>(null);
  const [playing, setPlaying] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

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
    const t = window.setTimeout(() => setSumber("trailer"), HERO_TEASER_DELAY_MS);
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

  const berhenti = () => {
    setSumber(null);
    setPlaying(false);
  };

  /**
   * Satu sumber gagal → turun ke sumber berikutnya, habis itu menyerah.
   *
   * Trailer yang 404 BUKAN kerusakan: mayoritas drama memang belum punya
   * berkas trailer, dan itulah justru alasan jalan mundur ini ada.
   */
  const turunSumber = () => {
    setPlaying(false);
    setSumber((kini) => (kini === "trailer" ? "ep1" : null));
  };

  return (
    <div ref={boxRef} className="absolute inset-0">
      {sumber && (
        <video
          ref={videoRef}
          // `key` WAJIB berganti saat sumber berganti: tanpa itu React memakai
          // ulang elemen <video> yang sama dan browser tidak selalu memuat
          // ulang src barunya — jalan mundur ke Episode 1 jadi diam saja.
          key={sumber}
          src={sumber === "trailer" ? trailerSrc(drama.id) : teaserSrc(drama.id, 1)}
          autoPlay
          muted
          playsInline
          preload="auto"
          aria-hidden
          // `object-top` WAJIB sama dengan gambar diamnya di page.tsx. Kalau
          // video dipusatkan sementara gambar ditempel ke atas, framing-nya
          // LOMPAT tepat saat video muncul — dan penonton melihatnya sebagai
          // gambar yang tiba-tiba bergeser, bukan sebagai cuplikan yang mulai.
          className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-500 ${
            playing ? "opacity-100" : "opacity-0"
          }`}
          onPlaying={() => setPlaying(true)}
          onTimeUpdate={(e) => {
            if (cuplikanSelesai(e.currentTarget.currentTime)) berhenti();
          }}
          onEnded={berhenti}
          onError={turunSumber}
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
          ▶ Cuplikan
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
