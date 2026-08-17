"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import ActionRail from "./ActionRail";
import EpisodeSheet from "./EpisodeSheet";
import { getProgressEntry, resumePosition, setProgress } from "@/lib/progress";
import { setLiked } from "@/lib/myLikes";
import { subtitleLabel } from "@/lib/types";
import {
  OFF,
  initialSubtitle,
  subtitleUrl,
  writeSubtitlePref,
} from "@/lib/subtitles";
import { readUser } from "@/lib/auth";
import { videoSrc, downloadUrl } from "@/lib/video";
import { seekTime } from "@/lib/seek";
import { fetchWallet, unlockEpisode, unlockAllEpisodes } from "@/lib/wallet";
import { isEpisodeLocked } from "@/lib/coins";
import RewardedAdModal from "./RewardedAdModal";
import EpisodePaywall from "./player/EpisodePaywall";
import CommentsDrawer from "./player/CommentsDrawer";
import PlayerControls from "./player/PlayerControls";

const FALLBACK = "/sample.mp4";
const DOUBLE_TAP_MS = 280; // ambang ketuk-ganda (double tap) untuk like
const CONTROLS_AUTO_HIDE_MS = 3500; // sembunyikan kontrol setelah diam beberapa detik
const HEART_ANIM_MS = 700; // durasi animasi hati saat like
const SAVE_PROGRESS_MS = 5000; // jangan tulis localStorage tiap frame timeupdate

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
  resumeFromHistory = false,
}: {
  dramaId: string;
  title: string;
  episodes: number;
  baseUrl: string;
  startEp: number;
  posterImage?: string;
  subtitles?: string[];
  premium?: boolean;
  resumeFromHistory?: boolean;
}) {
  const eps = Array.from({ length: episodes }, (_, i) => i + 1);
  const [active, setActive] = useState(startEp - 1);
  const [paused, setPaused] = useState(false);
  const [heart, setHeart] = useState(false);
  const [subLang, setSubLang] = useState(OFF);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cueText, setCueText] = useState("");
  const [speed, setSpeed] = useState(1);
  const [curTime, setCurTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [resolution, setResolution] = useState("");
  const [controlsVisible, setControlsVisible] = useState(true);
  const [tick, setTick] = useState(0); // bump utk reset timer auto-hide kontrol
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [episodesOpen, setEpisodesOpen] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const pendingSeek = useRef<number | null>(null); // simpan posisi saat ganti resolusi
  const wasPlaying = useRef(true);
  const seekRef = useRef<HTMLDivElement>(null);

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
  const lastSaveAt = useRef(0);
  const prevActiveRef = useRef(active);

  const srcFor = (ep: number) => videoSrc(baseUrl, dramaId, ep, resolution);

  // Episode terkunci? Ep awal gratis; admin bebas; sisanya butuh sudah-dibuka.
  const isLocked = useCallback(
    (ep: number) => isEpisodeLocked(ep, { premium, isAdmin, unlocked }),
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

  const onUnlockAll = async () => {
    if (unlocking) return;
    if (!email) {
      setPayMsg("Masuk dulu untuk membuka episode ini.");
      return;
    }
    setUnlocking(true);
    setPayMsg(null);
    const { status, data } = await unlockAllEpisodes(dramaId);
    if (status === 200 && data.ok) {
      if (typeof data.balance === "number") setBalance(data.balance);
      // Refresh status wallet supaya unlockedEps terisi ulang.
      fetchWallet(dramaId)
        .then((w) => {
          setBalance(w.balance ?? 0);
          setUnlocked(new Set(w.unlockedEps ?? []));
        })
        .catch(() => {});
      setPayMsg(null);
    } else if (status === 402) {
      if (typeof data.balance === "number") setBalance(data.balance);
      setPayMsg(
        data.error ?? "Koin kurang untuk membuka semua episode.",
      );
    } else {
      setPayMsg(data.error ?? "Gagal membuka semua episode.");
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
  };

  // Loncat ke episode awal, atau ke episode terakhir di riwayat kalau URL tanpa ?ep=.
  useEffect(() => {
    let idx = startEp - 1;
    if (resumeFromHistory) {
      const entry = getProgressEntry(dramaId);
      if (entry) idx = Math.min(Math.max(0, entry.episode - 1), episodes - 1);
    }
    slideRefs.current[idx]?.scrollIntoView({ behavior: "auto" });
  }, [startEp, resumeFromHistory, dramaId, episodes]);

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

  // Terapkan kecepatan & volume ke video aktif (juga tiap pindah episode).
  useEffect(() => {
    const v = videoRefs.current[active];
    if (!v) return;
    v.playbackRate = speed;
    v.volume = volume;
    v.muted = muted;
  }, [active, speed, volume, muted]);

  // Saat active berubah: simpan posisi episode lama, mainkan yang aktif.
  useEffect(() => {
    const prev = prevActiveRef.current;
    if (prev !== active) {
      const prevVideo = videoRefs.current[prev];
      if (prevVideo && !isLocked(prev + 1)) {
        setProgress(dramaId, prev + 1, {
          positionSec: prevVideo.currentTime || 0,
          durationSec: prevVideo.duration || 0,
        });
      }
      prevActiveRef.current = active;
    }
    setPaused(false);
    setControlsVisible(true);
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

  const persistProgress = useCallback(
    (opts?: { completed?: boolean; force?: boolean }) => {
      if (lockedActive) return;
      const now = Date.now();
      if (!opts?.force && !opts?.completed && now - lastSaveAt.current < SAVE_PROGRESS_MS) {
        return;
      }
      lastSaveAt.current = now;
      const v = videoRefs.current[active];
      setProgress(dramaId, active + 1, {
        positionSec: v?.currentTime ?? 0,
        durationSec: v?.duration || 0,
        completed: opts?.completed,
      });
    },
    [active, dramaId, lockedActive],
  );

  const goNext = useCallback(() => {
    slideRefs.current[active + 1]?.scrollIntoView({ behavior: "smooth" });
  }, [active]);

  const goPrev = useCallback(() => {
    if (active <= 0) return;
    slideRefs.current[active - 1]?.scrollIntoView({ behavior: "smooth" });
  }, [active]);

  // Lompat ke episode tertentu dari daftar episode (loncatan jauh = instan).
  const goTo = useCallback(
    (ep: number) => {
      const idx = Math.min(Math.max(0, ep - 1), episodes - 1);
      slideRefs.current[idx]?.scrollIntoView({ behavior: "auto" });
      setEpisodesOpen(false);
    },
    [episodes],
  );

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
      persistProgress({ force: true });
    }
  };

  // Set kecepatan putar langsung dari menu pengaturan.
  const setSpeedTo = (s: number) => {
    setSpeed(s);
    const v = videoRefs.current[active];
    if (v) v.playbackRate = s;
  };

  // Ganti resolusi — simpan posisi & status main dulu, lalu restore saat reload.
  const chooseRes = (code: string) => {
    const v = videoRefs.current[active];
    pendingSeek.current = v ? v.currentTime : 0;
    wasPlaying.current = v ? !v.paused : true;
    setResolution(code);
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

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") persistProgress({ force: true });
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, [persistProgress]);

  // Auto-hide kontrol biar video jadi fokus; sentuh layar utk memunculkan lagi.
  const revealControls = useCallback(() => {
    setControlsVisible(true);
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    // Jangan sembunyikan saat jeda / menu kebuka / overlay aktif.
    if (paused || lockedActive || settingsOpen || commentsOpen || episodesOpen || adOpen) {
      setControlsVisible(true);
      return;
    }
    const t = window.setTimeout(() => setControlsVisible(false), CONTROLS_AUTO_HIDE_MS);
    return () => window.clearTimeout(t);
  }, [paused, lockedActive, settingsOpen, commentsOpen, episodesOpen, adOpen, active, tick]);

  // Unduh episode aktif: bikin <a> tak-terlihat lalu klik otomatis. Aturan
  // alamat unduh (tunnel ?dl=1 vs proxy /api/download) ada di downloadUrl().
  const onDownload = () => {
    const ep = active + 1;
    const a = document.createElement("a");
    a.href = downloadUrl(baseUrl, dramaId, ep);
    a.download = `${dramaId}-ep${ep}.mp4`; // dihormati saat same-origin (dev)
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Seek bar yang bisa DIGESER (touch & mouse) — biar gampang maju/mundur di HP.
  const seekToClientX = (clientX: number) => {
    const v = videoRefs.current[active];
    const bar = seekRef.current;
    if (!v || !bar || !v.duration) return;
    const rect = bar.getBoundingClientRect();
    const t = seekTime(clientX, rect.left, rect.width, v.duration);
    v.currentTime = t;
    setCurTime(t);
  };
  const onSeekDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lockedActive) return;
    setSeeking(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    seekToClientX(e.clientX);
  };
  const onSeekMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!seeking) return;
    seekToClientX(e.clientX);
  };
  const onSeekUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!seeking) return;
    setSeeking(false);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  // 1x tap: kalau kontrol tersembunyi → munculkan saja; kalau sudah tampil →
  // play/pause. 2x tap = like (dengan animasi hati).
  const onTap = () => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      setLiked(dramaId, true);
      fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dramaId, action: "like" }),
      }).catch(() => {});
      setHeart(true);
      window.setTimeout(() => setHeart(false), HEART_ANIM_MS);
    } else {
      lastTap.current = now;
      const wasHidden = !controlsVisible;
      revealControls();
      window.setTimeout(() => {
        if (lastTap.current === now && !wasHidden) togglePlay();
      }, DOUBLE_TAP_MS);
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
                  onEnded={() => {
                    if (idx !== active) return;
                    persistProgress({ completed: true, force: true });
                    goNext();
                  }}
                  onPlay={(e) => {
                    // HP kadang reset playbackRate saat mulai play → set ulang
                    // supaya kontrol kecepatan benar-benar berfungsi di mobile.
                    e.currentTarget.playbackRate = speed;
                    e.currentTarget.volume = volume;
                    e.currentTarget.muted = muted;
                  }}
                  onRateChange={(e) => {
                    if (idx === active && e.currentTarget.playbackRate !== speed) {
                      e.currentTarget.playbackRate = speed;
                    }
                  }}
                  onTimeUpdate={(e) => {
                    if (idx !== active || seeking) return;
                    setCurTime(e.currentTarget.currentTime);
                    setDur(e.currentTarget.duration || 0);
                    persistProgress();
                  }}
                  onLoadedMetadata={(e) => {
                    if (idx !== active) return;
                    const v = e.currentTarget;
                    setDur(v.duration || 0);
                    v.playbackRate = speed;
                    v.volume = volume;
                    v.muted = muted;
                    // Restore posisi setelah ganti resolusi, atau lanjut dari riwayat.
                    if (pendingSeek.current != null) {
                      v.currentTime = pendingSeek.current;
                      pendingSeek.current = null;
                      if (wasPlaying.current) v.play().catch(() => {});
                    } else {
                      const pos = resumePosition(getProgressEntry(dramaId), ep);
                      if (pos > 0) v.currentTime = pos;
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
        <ChevronLeft className="h-5 w-5" />
      </Link>

      <ActionRail
        dramaId={dramaId}
        title={title}
        posterImage={posterImage}
        onComment={() => setCommentsOpen(true)}
      />

      {/* Panel bawah: judul, episode, subtitle, kontrol — komponen sendiri
          (PlayerControls). Semua data + aksi disuplai dari sini lewat prop. */}
      <PlayerControls
        title={title}
        currentEp={active + 1}
        episodes={episodes}
        cueText={cueText}
        lockedActive={lockedActive}
        controlsVisible={controlsVisible}
        paused={paused}
        curTime={curTime}
        dur={dur}
        seekBarRef={seekRef}
        onSeekDown={onSeekDown}
        onSeekMove={onSeekMove}
        onSeekUp={onSeekUp}
        onTogglePlay={togglePlay}
        onOpenEpisodes={() => setEpisodesOpen(true)}
        onPrev={goPrev}
        onNext={goNext}
        hasPrev={active > 0}
        hasNext={active < episodes - 1}
        volume={volume}
        muted={muted}
        onVolume={(n) => {
          setVolume(n);
          setMuted(n === 0);
        }}
        onToggleMute={() => setMuted((m) => !m)}
        settings={{
          open: settingsOpen,
          speed,
          resolution,
          subtitles,
          subLang,
          isFullscreen,
          onToggle: () => setSettingsOpen((v) => !v),
          onSpeed: setSpeedTo,
          onResolution: chooseRes,
          onSubtitle: chooseSub,
          onDownload,
          onToggleFullscreen: toggleFullscreen,
        }}
      />

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
        <EpisodePaywall
          episodeNumber={active + 1}
          email={email}
          balance={balance}
          unlocking={unlocking}
          payMsg={payMsg}
          totalEpisodes={episodes}
          unlockedCount={unlocked.size}
          onUnlock={onUnlock}
          onUnlockAll={onUnlockAll}
          onWatchAd={() => setAdOpen(true)}
        />
      )}

      <RewardedAdModal
        open={adOpen}
        onClose={() => setAdOpen(false)}
        onRewarded={(b) => setBalance(b)}
      />

      <EpisodeSheet
        open={episodesOpen}
        onClose={() => setEpisodesOpen(false)}
        total={episodes}
        current={active + 1}
        onPick={goTo}
      />

      {/* Drawer komentar — buka di dalam feed tanpa meninggalkan video */}
      <CommentsDrawer
        open={commentsOpen}
        dramaId={dramaId}
        onClose={() => setCommentsOpen(false)}
      />

      {heart && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="h-28 w-28 animate-ping fill-rose-500/90">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
        </div>
      )}

      {active === 0 && !cueText && controlsVisible && (
        <div className="pointer-events-none absolute bottom-60 left-1/2 z-10 -translate-x-1/2 text-center text-[11px] text-white/70">
          Geser ke atas untuk episode berikutnya ↑
        </div>
      )}
    </div>
  );
}
