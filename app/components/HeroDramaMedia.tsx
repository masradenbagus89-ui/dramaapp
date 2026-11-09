"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import type { Drama } from "@/lib/types";
import { getProgressEntry } from "@/lib/progress";
import { tujuanNonton } from "@/lib/tujuan-nonton";
import {
  DETAIL_CUPLIKAN_SEC,
  DETAIL_TEASER_DELAY_MS,
  teaserShouldLoop,
  teaserSrc,
} from "@/lib/hero-teaser";

/**
 * Lapisan hidup di ATAS gambar besar halaman detail: cuplikan Episode 1 yang
 * mulai sendiri dan tidak pernah berhenti, plus tombol play yang membawa
 * penonton LANGSUNG ke tontonannya.
 *
 * ⚠️ Gambarnya sendiri SENGAJA ditinggal di `app/drama/[id]/page.tsx` yang
 * Server Component. Gambar itu LCP halaman ini (elemen terbesar yang
 * menentukan "halaman terasa cepat atau tidak"); memindahkannya ke komponen
 * client berarti menunda justru elemen yang paling menentukan kesan itu.
 *
 * KENAPA LANGSUNG EPISODE 1 (owner 2026-11-09): jalur trailer khusus sudah
 * ada & teruji di server, tapi mencobanya lebih dulu memakan 1,17 detik pada
 * SETIAP kunjungan selama belum ada satu pun berkas trailer — dan memang belum
 * ada. Cara menyalakannya lagi ditulis di `trailerSrc` (lib/hero-teaser.ts).
 *
 * Gagal-aman: video gagal → gambar diam tetap tampil. Tombol play TIDAK ikut
 * mati, karena tujuannya sama sekali tidak bergantung pada video.
 */
export default function HeroDramaMedia({ drama }: { drama: Drama }) {
  const [mulai, setMulai] = useState(false);
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

  // Mulai sesudah jeda singkat (bot perayap & pengunjung sekejap tak ikut
  // menarik video), dan tidak sama sekali bagi yang memilih "kurangi animasi".
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => setMulai(true), DETAIL_TEASER_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  // Jeda saat kotak tergulung keluar layar — hemat kuota penonton & PC backup.
  //
  // ⚠️ Bergantung pada `mulai`, BUKAN dipasang sekali saat mount. Versi
  // pertama memakai dependency kosong, jadi pengamat ini terpasang saat
  // <video> belum dirender sama sekali: panggilan pertamanya menemukan
  // videoRef kosong lalu keluar, dan sesudah video muncul ia tidak pernah
  // dipanggil lagi selama penonton tidak menggulir. Akibatnya `play()` di
  // sini tak pernah menyentuh video yang baru lahir.
  useEffect(() => {
    const box = boxRef.current;
    if (!box || !mulai) return;
    const io = new IntersectionObserver(([entry]) => {
      const v = videoRef.current;
      if (!v) return;
      if (entry.isIntersecting) v.play().catch(() => {});
      else v.pause();
    });
    io.observe(box);
    return () => io.disconnect();
  }, [mulai]);

  return (
    <div ref={boxRef} className="absolute inset-0">
      {mulai && (
        <video
          ref={videoRef}
          src={teaserSrc(drama.id, 1)}
          autoPlay
          muted
          playsInline
          // `loop` untuk episode yang LEBIH PENDEK dari jendela cuplikan —
          // tanpa ini video pendek berhenti di akhir berkasnya. Episode yang
          // lebih panjang diulang lebih awal oleh onTimeUpdate di bawah.
          loop
          preload="auto"
          aria-hidden
          // `object-top` WAJIB sama dengan gambar diamnya di page.tsx. Kalau
          // video dipusatkan sementara gambar ditempel ke atas, framing-nya
          // LOMPAT tepat saat video muncul — dan penonton melihatnya sebagai
          // gambar yang tiba-tiba bergeser, bukan sebagai cuplikan yang mulai.
          className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-500 ${
            playing ? "opacity-100" : "opacity-0"
          }`}
          // Jaring pengaman: `autoPlay` saja kadang tidak cukup — elemen bisa
          // selesai memuat sesudah browser melewatkan kesempatan autoplay-nya.
          // `.catch` menjaga penolakan browser tidak jadi error di console.
          onCanPlay={(e) => {
            e.currentTarget.play().catch(() => {});
          }}
          onPlaying={() => setPlaying(true)}
          onTimeUpdate={(e) => {
            // Ulang dari awal di detik ke-DETAIL_CUPLIKAN_SEC. INI yang menahan
            // unduhan: tanpa baris ini browser terus menambah buffer sampai
            // seluruh episode (26,8 MB terukur) tersedot, padahal yang terlihat
            // cuma hiasan latar. Potongan yang diulang diputar dari memori,
            // bukan diunduh lagi.
            const v = e.currentTarget;
            if (teaserShouldLoop(v.currentTime, v.duration, 0, DETAIL_CUPLIKAN_SEC)) {
              v.currentTime = 0;
            }
          }}
          // Video gagal = gambar diam tetap tampil. Tidak ada percobaan ulang:
          // Episode 1 adalah sumber paling dasar yang ada — kalau ia pun gagal,
          // mencoba lagi hanya menambah permintaan yang sama-sama gagal.
          onError={() => {
            setMulai(false);
            setPlaying(false);
          }}
        />
      )}

      {/* 🪦 Label "▶ Cuplikan" DIBUANG owner 2026-11-09. Ia menerangkan hal yang
          sudah jelas dari layar (gambarnya memang sedang bergerak) sambil
          menambah satu kotak hitam di pojok yang meramaikan tampilan. */}

      {/* Gelap-bertingkat dipindah KE SINI dari page.tsx supaya video ikut
          digelapkan persis seperti gambar diamnya — tanpa itu tampilan melompat
          jadi terang saat video muncul.
          ⚠️ `pointer-events-none` WAJIB: lapisan ini menutupi SELURUH kotak,
          jadi tanpa itu ia menelan setiap klik dan tombol play di bawahnya
          tidak pernah bisa ditekan — rusak SENYAP, nol error di layar. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/10" />

      {/* Tombol play: satu-satunya bagian kotak ini yang bisa diklik. Sengaja
          BUKAN seluruh gambar — hero selebar layar yang jadi tautan raksasa
          membuat penonton tak sengaja meninggalkan halaman saat hendak menggeser.
          Ukurannya dikecilkan owner 2026-11-09; batas bawahnya 44px — di bawah
          itu tombol jadi sulit dikenai jari di HP. */}
      <Link
        href={tujuan.href}
        aria-label={`${tujuan.label}: ${drama.title}`}
        className="absolute left-1/2 top-1/2 z-20 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-black/35 text-white backdrop-blur-sm transition hover:scale-110 hover:bg-black/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 md:h-14 md:w-14"
      >
        <Play className="h-5 w-5 fill-current md:h-6 md:w-6" />
      </Link>
    </div>
  );
}
