"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import ActionRail from "./ActionRail";
import Comments from "./Comments";
import { setProgress } from "@/lib/progress";
import { setLiked } from "@/lib/myLikes";
import { subtitleLabel } from "@/lib/types";
import {
  OFF,
  initialSubtitle,
  subtitleUrl,
  writeSubtitlePref,
} from "@/lib/subtitles";
import { readUser } from "@/lib/auth";
import { fetchWallet, unlockEpisode } from "@/lib/wallet";
import {
  COIN_PER_EPISODE,
  FREE_EPISODES,
  PAYWALL_ENABLED,
  REWARD_PER_AD,
} from "@/lib/coins";
import RewardedAdModal from "./RewardedAdModal";

const FALLBACK = "/sample.mp4";
const SPEEDS = [1, 1.25, 1.5, 2];

// Resolusi: butuh file varian di PC backup dgn pola <ep>.<res>.mp4
// (mis. 1.720p.mp4). "" = file asli <ep>.mp4. Kalau varian tak ada → balik Asli.
const RESOLUTIONS: { code: string; label: string }[] = [
  { code: "", label: "Asli" },
  { code: "720p", label: "720p" },
  { code: "480p", label: "480p" },
  { code: "360p", label: "360p" },
];

function fmtTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// Feed vertikal ala Melolo: tiap episode = 1 slide full-screen, geser ke atas =
// episode berikutnya, autoplay saat slide terlihat, video habis = auto lanjut.
export default function FeedPlayer({
  dramaId,
  title,
  episodes,
  baseUrl,
  startEp,
  posterImage,
  subtitles = [],
  premium = false,
}: {
  dramaId: string;
  title: string;
  episodes: number;
  baseUrl: string;
  startEp: number;
  posterImage?: string;
  subtitles?: string[];
  premium?: boolean;
}) {
  const eps = Array.from({ length: episodes }, (_, i) => i + 1);
  const [active, setActive] = useState(startEp - 1);
  const [paused, setPaused] = useState(false);
  const [heart, setHeart] = useState(false);
  const [subLang, setSubLang] = useState(OFF);
  const [subMenu, setSubMenu] = useState(false);
  const [cueText, setCueText] = useState("");
  const [speed, setSpeed] = useState(1);
  const [curTime, setCurTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [resolution, setResolution] = useState("");
  const [resMenu, setResMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const pendingSeek = useRef<number | null>(null); // simpan posisi saat ganti resolusi
  const wasPlaying = useRef(true);

  // --- Koin / paywall ---
  const [email, setEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [balance, setBalance] = useState(0);
  const [unlocked, setUnlocked] = useState<Set<number>>(new Set());
  const [adOpen, setAdOpen] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [payMsg, setPayMsg] = useState<string | null>(null);

  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const lastTap = useRef(0);

  const srcFor = (ep: number) => {
    const dir = baseUrl ? `${baseUrl}/${dramaId}` : `/videos/${dramaId}`;
    return resolution ? `${dir}/${ep}.${resolution}.mp4` : `${dir}/${ep}.mp4`;
  };

  // Episode terkunci? Ep awal gratis; admin bebas; sisanya butuh sudah-dibuka.
  const isLocked = useCallback(
    (ep: number) =>
      PAYWALL_ENABLED &&
      premium &&
      !isAdmin &&
      ep > FREE_EPISODES &&
      !unlocked.has(ep),
    [premium, isAdmin, unlocked],
  );
  const lockedActive = isLocked(active + 1);

  // Muat status wallet (saldo + episode yang sudah dibuka) saat mount.
  useEffect(() => {
    const u = readUser();
    setEmail(u?.email ?? "");
    setIsAdmin(u?.role === "admin");
    let alive = true;
    fetchWallet(dramaId)
      .then((w) => {
        if (!alive) return;
        setBalance(w.balance ?? 0);
        setIsAdmin((prev) => prev || w.isAdmin);
        setUnlocked(new Set(w.unlockedEps ?? []));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [dramaId]);

  const onUnlock = async () => {
    if (unlocking) return;
    if (!email) {
      setPayMsg("Masuk dulu untuk membuka episode ini.");
      return;
    }
    setUnlocking(true);
    setPayMsg(null);
    const ep = active + 1;
    const { status, data } = await unlockEpisode(dramaId, ep);
    if (status === 200 && data.ok) {
      setUnlocked((s) => new Set(s).add(ep));
      if (typeof data.balance === "number") setBalance(data.balance);
    } else if (status === 402) {
      if (typeof data.balance === "number") setBalance(data.balance);
      setPayMsg("Koin kurang — tonton iklan atau beli koin dulu.");
    } else {
      setPayMsg(data.error ?? "Gagal membuka episode.");
    }
    setUnlocking(false);
  };

  // Set bahasa subtitle awal dari preferensi user (setelah mount, agar SSR aman).
  useEffect(() => {
    if (subtitles.length) setSubLang(initialSubtitle(subtitles));
  }, [subtitles]);

  // Render subtitle SENDIRI: track di-set "hidden" (tidak digambar browser, tapi
  // cue tetap aktif) lalu teks cue aktif ditampilkan di elemen kita sendiri —
  // jadi posisinya terkontrol & tidak menumpuk dengan judul/kontrol.
  useEffect(() => {
    const v = videoRefs.current[active];
    setCueText("");
    if (!v) return;
    const tracks = Array.from(v.textTracks);
    let activeTrack: TextTrack | null = null;
    for (const t of tracks) {
      if (subLang !== OFF && t.language === subLang) {
        t.mode = "hidden";
        activeTrack = t;
      } else {
        t.mode = "disabled";
      }
    }
    if (!activeTrack) return;
    const onCue = () => {
      const cues = activeTrack?.activeCues;
      if (cues && cues.length) {
        setCueText(
          Array.from(cues)
            .map((c) => (c as VTTCue).text ?? "")
            .join("\n")
            .replace(/<[^>]+>/g, ""),
        );
      } else {
        setCueText("");
      }
    };
    activeTrack.addEventListener("cuechange", onCue);
    onCue();
    return () => activeTrack?.removeEventListener("cuechange", onCue);
  }, [active, subLang]);

  const chooseSub = (code: string) => {
    setSubLang(code);
    writeSubtitlePref(code);
    setSubMenu(false);
  };

  // Loncat ke episode awal saat pertama kali render.
  useEffect(() => {
    slideRefs.current[startEp - 1]?.scrollIntoView({ behavior: "auto" });
  }, [startEp]);

  // Deteksi slide mana yang sedang terlihat → jadikan "active".
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.6) {
            setActive(Number((e.target as HTMLElement).dataset.idx));
          }
        }
      },
      { threshold: [0.6] },
    );
    slideRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [episodes]);

  // Terapkan kecepatan ke video aktif (juga tiap pindah episode).
  useEffect(() => {
    const v = videoRefs.current[active];
    if (v) v.playbackRate = speed;
  }, [active, speed]);

  // Saat active berubah: mainkan yang aktif (kecuali terkunci), pause sisanya.
  useEffect(() => {
    setPaused(false);
    setPayMsg(null);
    setCurTime(0);
    setDur(0);
    setProgress(dramaId, active + 1);
    const locked = isLocked(active + 1);
    for (const [k, v] of Object.entries(videoRefs.current)) {
      if (!v) continue;
      if (Number(k) === active) {
        if (locked) {
          v.pause(); // jangan putar episode terkunci → tampilkan paywall
        } else {
          v.play().catch(() => setPaused(true)); // autoplay diblokir → tombol play
        }
      } else {
        v.pause();
      }
    }
  }, [active, dramaId, isLocked]);

  const goNext = useCallback(() => {
    slideRefs.current[active + 1]?.scrollIntoView({ behavior: "smooth" });
  }, [active]);

  const togglePlay = () => {
    if (lockedActive) return; // terkunci → paywall yang menangani, bukan play
    const v = videoRefs.current[active];
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
  };

  // Ganti kecepatan putar (1x → 1.25x → 1.5x → 2x → balik).
  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
    const v = videoRefs.current[active];
    if (v) v.playbackRate = next;
  };

  // Ganti resolusi — simpan posisi & status main dulu, lalu restore saat reload.
  const chooseRes = (code: string) => {
    const v = videoRefs.current[active];
    pendingSeek.current = v ? v.currentTime : 0;
    wasPlaying.current = v ? !v.paused : true;
    setResolution(code);
    setResMenu(false);
  };

  // Fullscreen pada container player.
  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      el.requestFullscreen?.().catch(() => {});
    }
  };

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Unduh episode aktif lewat proxy same-origin (/api/download) yang memaksa
  // unduh via Content-Disposition — berfungsi di HP & lintas-origin.
  const onDownload = () => {
    const a = document.createElement("a");
    a.href = `/api/download?id=${encodeURIComponent(dramaId)}&ep=${active + 1}`;
    a.download = `${dramaId}-ep${active + 1}.mp4`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Klik di seek bar → loncat ke posisi itu.
  const onSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (lockedActive) return;
    const v = videoRefs.current[active];
    if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    v.currentTime = ratio * v.duration;
    setCurTime(v.currentTime);
  };

  // 1x tap = play/pause, 2x tap = like (dengan animasi hati).
  const onTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      lastTap.current = 0;
      setLiked(dramaId, true);
      fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dramaId, action: "like" }),
      }).catch(() => {});
      setHeart(true);
      window.setTimeout(() => setHeart(false), 700);
    } else {
      lastTap.current = now;
      window.setTimeout(() => {
        if (lastTap.current === now) togglePlay();
      }, 280);
    }
  };

  return (
    <div ref={containerRef} className="relative h-[100dvh] w-full overflow-hidden bg-black">
      <div className="h-full w-full snap-y snap-mandatory overflow-y-scroll [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
        {eps.map((ep, idx) => {
          const near = Math.abs(idx - active) <= 1; // hanya mount video di sekitar slide aktif
          return (
            <div
              key={ep}
              data-idx={idx}
              ref={(el) => {
                slideRefs.current[idx] = el;
              }}
              className="relative flex h-[100dvh] w-full snap-start items-center justify-center"
            >
              {near ? (
                <video
                  ref={(el) => {
                    videoRefs.current[idx] = el;
                  }}
                  src={srcFor(ep)}
                  playsInline
                  preload={idx === active ? "auto" : "metadata"}
                  onEnded={() => idx === active && goNext()}
                  onTimeUpdate={(e) => {
                    if (idx !== active) return;
                    setCurTime(e.currentTarget.currentTime);
                    setDur(e.currentTarget.duration || 0);
                  }}
                  onLoadedMetadata={(e) => {
                    if (idx !== active) return;
                    const v = e.currentTarget;
                    setDur(v.duration || 0);
                    v.playbackRate = speed;
                    // Restore posisi setelah ganti resolusi.
                    if (pendingSeek.current != null) {
                      v.currentTime = pendingSeek.current;
                      pendingSeek.current = null;
                      if (wasPlaying.current) v.play().catch(() => {});
                    }
                  }}
                  onError={(e) => {
                    const v = e.currentTarget;
                    // Varian resolusi tak ada → balik ke Asli (tetap jalan).
                    if (resolution && v.dataset.resfb !== resolution) {
                      v.dataset.resfb = resolution;
                      pendingSeek.current = v.currentTime || pendingSeek.current;
                      setResolution("");
                      return;
                    }
                    if (!v.dataset.fb) {
                      v.dataset.fb = "1";
                      v.src = FALLBACK;
                    }
                  }}
                  onClick={idx === active ? onTap : undefined}
                  className="h-full w-full object-contain"
                >
                  {/* Track subtitle di-proxy same-origin (/api/subtitle) → tanpa
                      crossOrigin, jadi request video .mp4 tetap non-CORS & aman. */}
                  {subtitles.map((code) => (
                    <track
                      key={code}
                      kind="subtitles"
                      srcLang={code}
                      label={subtitleLabel(code)}
                      src={subtitleUrl(dramaId, ep, code)}
                    />
                  ))}
                </video>
              ) : (
                <div className="h-full w-full bg-zinc-950" />
              )}
            </div>
          );
        })}
      </div>

      {/* Overlay tetap di atas slide aktif */}
      <Link
        href={`/drama/${dramaId}`}
        className="absolute left-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"
        aria-label="Kembali"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
        </svg>
      </Link>

      <ActionRail
        dramaId={dramaId}
        title={title}
        posterImage={posterImage}
        onComment={() => setCommentsOpen(true)}
      />

      {/* Panel bawah: judul, episode, subtitle, kontrol disusun dalam SATU
          kolom flex sehingga tidak pernah saling menumpuk (rapi seperti app
          sejenis). Dulu masing-masing absolute dgn bottom tebak-tebakan →
          subtitle jatuh ke area control bar & judul panjang membludak. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col bg-gradient-to-t from-black/85 via-black/35 to-transparent pb-7 pt-10">
        {/* Judul + episode — kecil & rapi ala PineDrama: rata kiri, maks 2 baris,
            beri ruang utk rail ikon di kanan. Sengaja kecil (13px) supaya tidak
            membludak di HP layar kecil & video tetap jadi fokus. */}
        <div className="px-3 pr-20">
          <h1 className="line-clamp-2 text-[13px] font-semibold leading-tight text-white/95 drop-shadow-md">
            {title}
          </h1>
          <p className="mt-1 text-[11px] font-medium text-white/55">
            Eps {active + 1} · {episodes} episode
          </p>
        </div>

        {/* Subtitle — baris tersendiri di tengah, tak menumpuk judul/kontrol */}
        {cueText && (
          <div className="mt-2 flex justify-center px-3 pr-20">
            <span className="whitespace-pre-line rounded bg-black/60 px-2 py-0.5 text-center text-[13px] font-medium leading-snug text-white sm:text-sm">
              {cueText}
            </span>
          </div>
        )}

        {/* Control bar video — seek bar + tombol kontrol */}
        {!lockedActive && (
          <div className="mt-3 px-3">
          {/* Seek bar — klik untuk loncat ke posisi */}
          <div
            onClick={onSeek}
            role="slider"
            aria-label="Posisi video"
            aria-valuenow={Math.round(curTime)}
            className="pointer-events-auto mb-3 flex h-4 cursor-pointer items-center"
          >
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-amber-400"
                style={{ width: dur ? `${(curTime / dur) * 100}%` : "0%" }}
              />
            </div>
          </div>

          <div className="pointer-events-auto flex flex-wrap items-center gap-x-3 gap-y-2">
            <button
              onClick={togglePlay}
              aria-label={paused ? "Putar" : "Jeda"}
              className="text-white transition-transform active:scale-90"
            >
              {paused ? (
                <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white">
                  <path d="M8 5v14l11-7z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white">
                  <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                </svg>
              )}
            </button>
            <span className="text-xs tabular-nums text-white/80">
              {fmtTime(curTime)} / {fmtTime(dur)}
            </span>

            <div className="ml-auto flex items-center gap-1.5">
              {/* Subtitle (CC) */}
              {subtitles.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => {
                      setSubMenu((v) => !v);
                      setResMenu(false);
                    }}
                    aria-label="Subtitle"
                    className={`flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-bold ${
                      subLang !== OFF
                        ? "bg-amber-400 text-black"
                        : "bg-white/15 text-white hover:bg-white/25"
                    }`}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="M7 13h3M14 13h3M7 10h2M13 10h4" strokeLinecap="round" />
                    </svg>
                    {subLang === OFF ? "CC" : subLang.toUpperCase()}
                  </button>
                  {subMenu && (
                    <div className="absolute bottom-full right-0 mb-2 w-36 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900/95 py-1 shadow-xl backdrop-blur">
                      <p className="px-3 pb-1 pt-1 text-[10px] uppercase tracking-wider text-zinc-500">Subtitle</p>
                      <button
                        onClick={() => chooseSub(OFF)}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-800 ${subLang === OFF ? "text-amber-400" : "text-zinc-200"}`}
                      >
                        Mati {subLang === OFF && <span>✓</span>}
                      </button>
                      {subtitles.map((code) => (
                        <button
                          key={code}
                          onClick={() => chooseSub(code)}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-800 ${subLang === code ? "text-amber-400" : "text-zinc-200"}`}
                        >
                          {subtitleLabel(code)} {subLang === code && <span>✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Resolusi */}
              <div className="relative">
                <button
                  onClick={() => {
                    setResMenu((v) => !v);
                    setSubMenu(false);
                  }}
                  aria-label="Resolusi"
                  className="flex h-8 items-center gap-1 rounded-full bg-white/15 px-2.5 text-xs font-bold text-white hover:bg-white/25"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
                  </svg>
                  {resolution || "HD"}
                </button>
                {resMenu && (
                  <div className="absolute bottom-full right-0 mb-2 w-36 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900/95 py-1 shadow-xl backdrop-blur">
                    <p className="px-3 pb-1 pt-1 text-[10px] uppercase tracking-wider text-zinc-500">Resolusi</p>
                    {RESOLUTIONS.map((r) => (
                      <button
                        key={r.code}
                        onClick={() => chooseRes(r.code)}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-800 ${resolution === r.code ? "text-amber-400" : "text-zinc-200"}`}
                      >
                        {r.label} {resolution === r.code && <span>✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Kecepatan */}
              <button
                onClick={cycleSpeed}
                aria-label="Kecepatan putar"
                className="h-8 rounded-full bg-white/15 px-2.5 text-xs font-bold text-white hover:bg-white/25"
              >
                {speed}×
              </button>

              {/* Unduh */}
              <button
                onClick={onDownload}
                aria-label="Unduh episode"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 19h14" />
                </svg>
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? "Keluar layar penuh" : "Layar penuh"}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
              >
                {isFullscreen ? (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 9H5m4 0V5m0 4L4 4m11 5h4m-4 0V5m0 4l5-5M9 15H5m4 0v4m0-4l-5 5m11-5h4m-4 0v4m0-4l5 5" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 9V5a1 1 0 011-1h4M20 9V5a1 1 0 00-1-1h-4M4 15v4a1 1 0 001 1h4M20 15v4a1 1 0 01-1 1h-4" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          </div>
        )}
      </div>

      {paused && !lockedActive && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 z-10 flex items-center justify-center"
          aria-label="Putar"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50">
            <svg viewBox="0 0 24 24" className="h-8 w-8 fill-white">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      )}

      {/* Paywall: episode terkunci */}
      {lockedActive && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 px-6">
          <div className="w-full max-w-xs text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-400/15 text-amber-300">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 018 0v4" />
              </svg>
            </div>
            <h2 className="mt-3 text-lg font-bold text-white">
              Episode {active + 1} terkunci
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Episode 1–{FREE_EPISODES} gratis. Buka episode ini dengan {COIN_PER_EPISODE} koin.
            </p>

            {email ? (
              <>
                <p className="mt-3 text-sm text-zinc-200">
                  Saldo kamu: <span className="font-bold text-amber-400">{balance} koin</span>
                </p>
                <button
                  onClick={onUnlock}
                  disabled={unlocking || balance < COIN_PER_EPISODE}
                  className="mt-3 w-full rounded-full bg-amber-400 py-2.5 text-sm font-bold text-black hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {unlocking ? "Membuka…" : `🔓 Buka • ${COIN_PER_EPISODE} koin`}
                </button>
                <button
                  onClick={() => setAdOpen(true)}
                  className="mt-2 w-full rounded-full border border-amber-400/60 bg-amber-400/10 py-2.5 text-sm font-semibold text-amber-300 hover:bg-amber-400/20"
                >
                  🎬 Nonton iklan +{REWARD_PER_AD} koin
                </button>
                <Link
                  href="/profile#koin"
                  className="mt-2 inline-block text-xs text-zinc-400 underline hover:text-zinc-200"
                >
                  Beli koin
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="mt-4 inline-block w-full rounded-full bg-amber-400 py-2.5 text-sm font-bold text-black hover:bg-amber-300"
                >
                  Masuk untuk lanjut nonton
                </Link>
                <p className="mt-2 text-[11px] text-zinc-500">
                  Gratis daftar — dapat koin dari check-in & nonton iklan.
                </p>
              </>
            )}

            {payMsg && (
              <p className="mt-3 text-xs text-rose-400">{payMsg}</p>
            )}
          </div>
        </div>
      )}

      <RewardedAdModal
        open={adOpen}
        onClose={() => setAdOpen(false)}
        onRewarded={(b) => setBalance(b)}
      />

      {/* Drawer komentar — buka di dalam feed tanpa meninggalkan video */}
      {commentsOpen && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end">
          <button
            className="absolute inset-0 bg-black/50"
            aria-label="Tutup komentar"
            onClick={() => setCommentsOpen(false)}
          />
          <div className="relative max-h-[78vh] overflow-y-auto rounded-t-2xl border-t border-zinc-800 bg-zinc-950 px-4 pb-8 pt-3 text-left">
            <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between bg-zinc-950/95 px-4 pb-2 backdrop-blur">
              <span className="mx-auto h-1 w-10 rounded-full bg-zinc-700" />
              <button
                onClick={() => setCommentsOpen(false)}
                aria-label="Tutup"
                className="absolute right-3 top-0 rounded-full p-1 text-zinc-400 hover:text-white"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <Comments dramaId={dramaId} />
          </div>
        </div>
      )}

      {heart && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="h-28 w-28 animate-ping fill-rose-500/90">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
        </div>
      )}

      {active === 0 && !cueText && (
        <div className="pointer-events-none absolute bottom-60 left-1/2 z-10 -translate-x-1/2 text-center text-[11px] text-white/70">
          Geser ke atas untuk episode berikutnya ↑
        </div>
      )}
    </div>
  );
}
