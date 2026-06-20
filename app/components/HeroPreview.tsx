"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  /** URL file episode (mp4) untuk teaser hero. */
  src: string;
  /** Gambar poster/hero — tampil saat loading & kalau video gagal. */
  poster?: string;
  title: string;
  /** Lewati intro: mulai dari detik ke-(startAt). */
  startAt?: number;
  /** Panjang potongan teaser yang diulang (detik). */
  windowSec?: number;
  /**
   * Cara video & poster mengisi bingkai.
   * - "contain": tidak pernah memotong wajah; sisa ruang diisi blur. Dipakai saat
   *   bingkai TIDAK sebangun dgn video.
   * - "cover" (default): isi penuh tanpa pillar. AMAN dari crop HANYA jika bingkai
   *   sebangun dgn sumbernya. Kotak hero kita dibuat 9:16 menyamai video potret →
   *   cover jadi no-op (tak ada crop wajah, tak ada pilar blur). Kalau poster
   *   LANDSCAPE jadi fallback di kotak 9:16, crop dikendalikan via objectPosition.
   */
  fit?: "contain" | "cover";
  /**
   * Posisi crop saat fit="cover" dan rasio media ≠ rasio kotak (mis. poster
   * LANDSCAPE jatuh ke kotak 9:16). "top" → crop dibuang dari BAWAH (tepi/teks
   * promo), subjek (biasanya tengah/atas) tetap aman. Default "center".
   */
  objectPosition?: "center" | "top";
  /** Tampilkan latar blur dari poster (isi pillar saat fit="contain"). Default ikut fit. */
  showBlurBg?: boolean;
  /** Sudut membulat utk kartu inset (bingkai HP). */
  rounded?: boolean;
  /** Posisi tombol mute. */
  mutePosition?: "top-right" | "bottom-left";
  /** Kelas tambahan utk wrapper (ukuran/posisi diatur pemanggil). */
  className?: string;
};

// Hero ala Netflix/Melolo: klip episode jalan diam-diam (muted, loop) di banner
// supaya viewer penasaran. Kalau tunnel mati / autoplay diblokir / src kosong →
// otomatis jatuh ke gambar poster (tidak pernah blank, TANPA geser layout karena
// poster & video memakai bingkai + object-fit yang sama). Klip diputar sebagai
// potongan pendek (lewati intro, ulang) biar terasa "teaser" & hemat bandwidth.
//
// Tak ada video kedua: latar "cinematic" cukup dari poster yang di-blur (satu
// decode saja) supaya hemat di tunnel cloudflared yang rapuh.
export default function HeroPreview({
  src,
  poster,
  title,
  startAt = 4,
  windowSec = 24,
  fit = "cover",
  objectPosition = "center",
  showBlurBg,
  rounded = false,
  mutePosition = "top-right",
  className = "",
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false); // video sudah bisa diputar
  const [failed, setFailed] = useState(false); // video error → poster saja
  const [muted, setMuted] = useState(true);

  const showVideo = Boolean(src) && !failed;
  const objectFit = fit === "cover" ? "object-cover" : "object-contain";
  const posClass = objectPosition === "top" ? "object-top" : "object-center";
  // Gabungan fit + posisi, dipakai IDENTIK oleh poster & video → kotak sama,
  // tidak ada layout shift saat video error.
  const mediaClass = `${objectFit} ${posClass}`;
  // Blur latar berguna saat "contain" (ada pillar). Bisa dipaksa via prop.
  const wantBlur = showBlurBg ?? fit === "contain";

  const muteBtnPos =
    mutePosition === "bottom-left"
      ? "left-2 bottom-2 h-9 w-9"
      : "right-3 top-3 h-9 w-9";

  // Sinkronkan status mute ke elemen video.
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted, ready]);

  return (
    <div
      className={`absolute inset-0 overflow-hidden ${
        rounded ? "rounded-[1.75rem]" : ""
      } ${className}`}
    >
      {/* Latar blur dari gambar yang sama → isi ruang kosong tanpa memotong. */}
      {poster && wantBlur && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl"
        />
      )}

      {/* Poster utuh — selalu ada di bawah video; tampil sebelum video siap /
          saat video gagal. Object-fit + posisi SAMA dgn video → no layout shift. */}
      {poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt={title}
          className={`absolute inset-0 h-full w-full ${mediaClass}`}
        />
      )}

      {showVideo && (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden
          className={`absolute inset-0 h-full w-full ${mediaClass} transition-opacity duration-700 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            if (Number.isFinite(v.duration) && v.duration > startAt + 2) {
              v.currentTime = startAt; // lewati intro
            }
          }}
          onCanPlay={() => setReady(true)}
          onTimeUpdate={(e) => {
            // Ulang potongan teaser saja (tanpa memutar sampai habis).
            const v = e.currentTarget;
            if (
              Number.isFinite(v.duration) &&
              v.duration > startAt + windowSec &&
              v.currentTime > startAt + windowSec
            ) {
              v.currentTime = startAt;
            }
          }}
          onError={() => setFailed(true)}
        />
      )}

      {/* Tombol suara — default diam (syarat autoplay); klik utk dengar. */}
      {showVideo && ready && (
        <button
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Nyalakan suara" : "Matikan suara"}
          className={`absolute z-30 flex items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition-colors hover:bg-black/70 ${muteBtnPos}`}
        >
          {muted ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 00-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 00-2.5-4.03v8.05A4.5 4.5 0 0016.5 12zM14 3.23v2.06a7.001 7.001 0 010 13.42v2.06a9.001 9.001 0 000-17.54z" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
