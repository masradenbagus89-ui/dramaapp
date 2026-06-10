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
  applySubtitle,
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
  const [speed, setSpeed] = useState(1);
  const [curTime, setCurTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);

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

  const srcFor = (ep: number) =>
    baseUrl ? `${baseUrl}/${dramaId}/${ep}.mp4` : `/videos/${dramaId}/${ep}.mp4`;

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

  // Terapkan pilihan subtitle ke video yang sedang aktif tiap kali berubah.
  useEffect(() => {
    applySubtitle(videoRefs.current[active], subLang);
  }, [active, subLang]);

  const chooseSub = (code: string) => {
    setSubLang(code);
    writeSubtitlePref(code);
    setSubMenu(false);
    applySubtitle(videoRefs.current[active], code);
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
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black">
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
                    setDur(e.currentTarget.duration || 0);
                    e.currentTarget.playbackRate = speed;
                  }}
                  onError={(e) => {
                    const v = e.currentTarget;
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

      {/* Tombol CC (subtitle) — hanya muncul kalau drama punya subtitle */}
      {subtitles.length > 0 && (
        <div className="absolute right-3 top-3 z-30">
          <button
            onClick={() => setSubMenu((v) => !v)}
            className={`flex h-9 items-center gap-1 rounded-full px-3 text-xs font-bold ${
              subLang !== OFF ? "bg-amber-400 text-black" : "bg-black/50 text-white"
            }`}
            aria-label="Pilih subtitle"
            aria-expanded={subMenu}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M7 13h3M14 13h3M7 10h2M13 10h4" strokeLinecap="round" />
            </svg>
            {subLang === OFF ? "CC" : subLang.toUpperCase()}
          </button>

          {subMenu && (
            <div className="absolute right-0 mt-2 w-40 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900/95 py-1 shadow-xl backdrop-blur">
              <p className="px-3 pb-1 pt-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
                Subtitle
              </p>
              <button
                onClick={() => chooseSub(OFF)}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-800 ${
                  subLang === OFF ? "text-amber-400" : "text-zinc-200"
                }`}
              >
                Mati
                {subLang === OFF && <span>✓</span>}
              </button>
              {subtitles.map((code) => (
                <button
                  key={code}
                  onClick={() => chooseSub(code)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-800 ${
                    subLang === code ? "text-amber-400" : "text-zinc-200"
                  }`}
                >
                  {subtitleLabel(code)}
                  {subLang === code && <span>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-36 left-3 right-20 z-10">
        <h1 className="text-base font-semibold text-white drop-shadow-lg">{title}</h1>
        <p className="text-xs text-zinc-300 drop-shadow-lg">
          Episode {active + 1} / {episodes}
        </p>
      </div>

      <ActionRail
        dramaId={dramaId}
        title={title}
        posterImage={posterImage}
        onComment={() => setCommentsOpen(true)}
      />

      {/* Control bar video — diangkat dari tepi bawah supaya gampang diklik
          (tidak ketutup taskbar) + ada seek bar & pengatur kecepatan. */}
      {!lockedActive && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pb-10 pt-12">
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

          <div className="pointer-events-auto flex items-center gap-4">
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
            <button
              onClick={cycleSpeed}
              aria-label="Kecepatan putar"
              className="ml-auto rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/25"
            >
              {speed}×
            </button>
          </div>
        </div>
      )}

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

      {active === 0 && (
        <div className="pointer-events-none absolute bottom-32 left-1/2 z-10 -translate-x-1/2 text-center text-[11px] text-white/70">
          Geser ke atas untuk episode berikutnya ↑
        </div>
      )}
    </div>
  );
}
