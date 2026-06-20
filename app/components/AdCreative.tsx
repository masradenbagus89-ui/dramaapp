"use client";

import { useState } from "react";

// Penyaji creative iklan yang ADAPTIF terhadap bentuk gambar:
//   • Gambar LANDSCAPE (rasio ≥ ~2.4, mis. 1200×300) → tampil edge-to-edge,
//     mengisi penuh lebar banner (persis gaya banner mockup).
//   • Gambar tegak/persegi → kartu sinematik: creative tampil UTUH (object-
//     contain) di tengah, dengan latar blur berwarna dari gambar yang sama.
//
// Dipakai bareng oleh banner beranda (AdBanner) dan pratinjau admin
// (SponsorAdsManager) supaya tampilannya selalu identik (WYSIWYG).

const WIDE_THRESHOLD = 2.4;

export default function AdCreative({
  src,
  alt = "",
  hover = false,
}: {
  src: string;
  alt?: string;
  hover?: boolean;
}) {
  const [ratio, setRatio] = useState<number | null>(null);
  const onLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setRatio(img.naturalWidth / img.naturalHeight);
    }
  };

  const wide = ratio !== null && ratio >= WIDE_THRESHOLD;

  if (wide) {
    // Landscape → isi penuh, tinggi mengikuti gambar (4:1 → banner pendek rapi).
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        onLoad={onLoad}
        className={`block h-auto w-full ${
          hover ? "transition-transform duration-300 group-hover:scale-[1.01]" : ""
        }`}
      />
    );
  }

  // Tegak/persegi (atau belum terukur) → kartu sinematik tinggi tetap.
  return (
    <div className="relative h-36 w-full overflow-hidden sm:h-40">
      {/* Latar sinematik: gambar sama, blur kuat + sedikit gelap. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        aria-hidden
        onLoad={onLoad}
        className="absolute inset-0 h-full w-full scale-125 object-cover blur-2xl"
      />
      <div className="absolute inset-0 bg-black/30" />
      {/* Creative utuh di tengah dengan bayangan halus. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`relative mx-auto h-full w-auto max-w-full object-contain shadow-2xl shadow-black/50 ${
          hover ? "transition-transform duration-300 group-hover:scale-[1.02]" : ""
        }`}
      />
    </div>
  );
}
