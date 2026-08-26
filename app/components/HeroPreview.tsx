"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import {
  HERO_TEASER_DELAY_MS,
  shouldGiveUpVideo,
  teaserShouldLoop,
  type TeaserStatus,
} from "@/lib/hero-teaser";

type Props = {
  /** URL file episode (mp4) untuk teaser hero. */
  src: string;
  /** Gambar poster/hero — tampil saat loading & kalau video gagal. */
  poster?: string;
  title: string;
  /** Lewati intro: mulai dari detik ke-(startAt). 0 = langsung frame pertama. */
  startAt?: number;
  /** Panjang potongan teaser yang diulang (detik). */
  windowSec?: number;
  /** Jeda sebelum teaser mulai diunduh (ms). 0 = langsung. */
  delayMs?: number;
  fit?: "contain" | "cover";
  objectPosition?: "center" | "top";
  showBlurBg?: boolean;
  rounded?: boolean;
  mutePosition?: "top-right" | "bottom-left" | "bottom-right";
  className?: string;
  onStatus?: (status: TeaserStatus) => void;
  onMutedChange?: (muted: boolean) => void;
};

// Poster SELALU hidup (geser kamera), supaya hero tidak pernah terasa foto kaku.
// Video episode ditumpuk di atas begitu frame pertama siap. File/tunnel gagal
// ≠ layar mati: animasi poster tetap jalan.
export default function HeroPreview({
  src,
  poster,
  title,
  startAt = 0,
  windowSec = 24,
  delayMs = HERO_TEASER_DELAY_MS,
  fit = "cover",
  objectPosition = "center",
  showBlurBg,
  rounded = false,
  mutePosition = "top-right",
  className = "",
  onStatus,
  onMutedChange,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const errorCount = useRef(0);
  const retryTimer = useRef<number>(0);
  const playAttempt = useRef(0);
  const [ready, setReady] = useState(false);
  const [hasMeta, setHasMeta] = useState(false);
  const [failed, setFailed] = useState(false);
  const [muted, setMuted] = useState(true);
  // Video belum boleh dipasang sebelum jeda lewat - lihat effect di bawah.
  const [armed, setArmed] = useState(false);

  const showVideo = Boolean(src) && !failed && armed;
  const objectFit = fit === "cover" ? "object-cover" : "object-contain";
  const posClass = objectPosition === "top" ? "object-top" : "object-center";
  const mediaClass = `${objectFit} ${posClass}`;
  const wantBlur = showBlurBg ?? fit === "contain";

  const muteBtnPos =
    mutePosition === "bottom-left"
      ? "left-3 bottom-4 h-11 w-11"
      : mutePosition === "bottom-right"
        ? "right-4 bottom-5 h-11 w-11 md:right-8"
        : "right-3 top-3 h-9 w-9";

  const report = useCallback(
    (status: TeaserStatus) => {
      onStatus?.(status);
    },
    [onStatus],
  );

  useEffect(() => {
    errorCount.current = 0;
    playAttempt.current = 0;
    setFailed(false);
    setReady(false);
    setHasMeta(false);
    if (!src) {
      report("failed");
      return;
    }
    report("loading");
  }, [src, report]);

  // Tahan pengunduhan teaser selama delayMs. Pengunjung yang cuma lewat (dan
  // bot perayap) keburu pergi sebelum ini menyala, jadi nol byte video terpakai.
  // Selama menahan, status tetap "loading" -> carousel ikut menunggu, tidak
  // berputar ke slide yang videonya belum sempat mulai.
  useEffect(() => {
    if (!src || delayMs <= 0) {
      setArmed(Boolean(src));
      return;
    }
    setArmed(false);
    const t = window.setTimeout(() => setArmed(true), delayMs);
    return () => window.clearTimeout(t);
  }, [src, delayMs]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
    onMutedChange?.(muted);
  }, [muted, ready, onMutedChange]);

  const markPlaying = useCallback(() => {
    setReady(true);
    report("playing");
  }, [report]);

  const tryPlay = useCallback(() => {
    const v = videoRef.current;
    if (!v || failed || ready) return;
    v.muted = true;
    playAttempt.current += 1;
    void v.play().then(markPlaying).catch(() => {
      // Autoplay diblokir: coba lagi beberapa saat, maksimal 5 kali.
      if (playAttempt.current < 5) {
        window.clearTimeout(retryTimer.current);
        retryTimer.current = window.setTimeout(() => tryPlay(), 600);
      }
    });
  }, [failed, markPlaying, ready]);

  useEffect(() => {
    return () => window.clearTimeout(retryTimer.current);
  }, []);

  return (
    <div
      className={`hero-bg-in absolute inset-0 overflow-hidden ${
        rounded ? "rounded-[1.75rem]" : ""
      } ${className}`}
    >
      {poster && wantBlur && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          aria-hidden
          className="hero-live absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl"
        />
      )}

      {poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt={title}
          className={`hero-live absolute inset-0 h-full w-full ${mediaClass} transition-opacity duration-700 ${
            ready || hasMeta ? "opacity-0" : "opacity-100"
          }`}
        />
      )}

      {showVideo && (
        <video
          ref={videoRef}
          src={src}
          autoPlay
          muted
          loop
          playsInline
          // "metadata", bukan "auto": browser cuma ambil header video dulu,
          // lalu menambah buffer sesuai yang benar-benar diputar. "auto" =
          // izin menarik sebanyak-banyaknya sejak detik pertama.
          preload="metadata"
          aria-hidden
          className={`absolute inset-0 h-full w-full ${mediaClass} transition-opacity duration-700 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
          onLoadedMetadata={(e) => {
            setHasMeta(true);
            const v = e.currentTarget;
            if (
              startAt > 0 &&
              Number.isFinite(v.duration) &&
              v.duration > startAt + 2
            ) {
              try {
                v.currentTime = startAt;
              } catch {
                // Server tanpa seek: tetap putar dari detik 0.
              }
            }
            tryPlay();
          }}
          onLoadedData={() => {
            setHasMeta(true);
            tryPlay();
          }}
          onCanPlay={() => {
            setHasMeta(true);
            tryPlay();
          }}
          onPlaying={markPlaying}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (teaserShouldLoop(v.currentTime, v.duration, startAt, windowSec)) {
              v.currentTime = startAt;
            }
          }}
          onError={() => {
            errorCount.current += 1;
            if (shouldGiveUpVideo(errorCount.current)) {
              setFailed(true);
              setReady(false);
              report("failed");
              return;
            }
            const v = videoRef.current;
            window.clearTimeout(retryTimer.current);
            retryTimer.current = window.setTimeout(() => {
              if (!v) return;
              v.load();
              tryPlay();
            }, 400 * errorCount.current);
          }}
        />
      )}

      <div className="hero-grain pointer-events-none absolute inset-0" aria-hidden />
      <div className="hero-sweep pointer-events-none absolute inset-0" aria-hidden />

      {showVideo && ready && (
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Nyalakan suara" : "Matikan suara"}
          className={`absolute z-30 flex items-center justify-center rounded-full border border-white/70 bg-black/60 text-white shadow-lg backdrop-blur transition-colors hover:bg-black/80 ${muteBtnPos}`}
        >
          {muted ? (
            <VolumeX className="h-5 w-5" />
          ) : (
            <Volume2 className="h-5 w-5" />
          )}
        </button>
      )}
    </div>
  );
}
