"use client";

// Kotak pemutar untuk video yang player-nya milik server lain (embed/iframe).
//
// Beda dengan FeedPlayer (pemutar buatan sendiri untuk file .mp4 dari PC
// backup): di sini tombol play, posisi menit, dan subtitle dikendalikan
// penyedia. Aplikasi kita hanya menyediakan "bingkai"-nya. Karena isi iframe
// beda domain, kita memang TIDAK bisa membaca progres nontonnya.
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

export default function EmbedPlayer({
  src,
  title,
  className = "",
}: {
  src: string;
  title: string;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);

  // Ganti video -> balikkan ke keadaan "memuat" lagi.
  useEffect(() => {
    setLoaded(false);
  }, [src]);

  // Sabuk pengaman kedua (yang utama ada di server, lib/external-video.ts):
  // kalau alamatnya bukan https, jangan dipasang sama sekali.
  const aman = src.startsWith("https://");

  if (!aman) {
    return (
      <div
        className={`flex aspect-video w-full items-center justify-center rounded-xl bg-zinc-900 px-6 text-center ${className}`}
      >
        <p className="flex items-center gap-2 text-sm text-rose-300">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Alamat video ditolak karena bukan https.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`relative aspect-video w-full overflow-hidden rounded-xl bg-black ${className}`}
    >
      {!loaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-900">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-amber-400" />
          <span className="sr-only">Memuat pemutar video…</span>
        </div>
      )}
      <iframe
        key={src}
        src={src}
        title={title}
        className="absolute inset-0 h-full w-full border-0"
        // allow = izin fitur yang dibutuhkan player (putar otomatis, layar penuh,
        // video berhak cipta/DRM, dan tampil melayang di pojok layar).
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
        // sandbox = pagar untuk isi iframe. SENGAJA tanpa "allow-popups":
        // banyak penyedia embed gratis menyelipkan iklan pop-up; ini menahannya.
        // allow-same-origin di sini aman: origin iframe = domain PENYEDIA,
        // jadi ia tetap tidak bisa mengintip halaman/cookie kita.
        sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
        // Kirim nama domain kita saja (bukan alamat halaman lengkap) — banyak
        // penyedia memakainya untuk anti-hotlink, sekaligus jaga privasi.
        referrerPolicy="origin"
        loading="lazy"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
