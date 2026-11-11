"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Pause, Play } from "lucide-react";
import ActionRail from "./ActionRail";
import EpisodeSheet from "./EpisodeSheet";
import { getProgressEntry, resumePosition, setProgress } from "@/lib/progress";
import { subtitleLabel, type DownloadProvider } from "@/lib/types";
import {
  OFF,
  initialSubtitle,
  subtitleUrl,
  writeSubtitlePref,
} from "@/lib/subtitles";
import { readUser } from "@/lib/auth";
import { decideVideoError } from "@/lib/video";
import { seekTime } from "@/lib/seek";
import { fetchWallet, unlockEpisode, unlockAllEpisodes } from "@/lib/wallet";
import { PAYWALL_ENABLED, isEpisodeLocked } from "@/lib/coins";
import RewardedAdModal from "./RewardedAdModal";
import EpisodePaywall from "./player/EpisodePaywall";
import CommentsDrawer from "./player/CommentsDrawer";
import PlayerControls from "./player/PlayerControls";
import PlayerSettings from "./player/PlayerSettings";
import { posisiSesudahLoncat } from "./player/PlaylyPlayer";

const DOUBLE_TAP_MS = 280; // ambang ketuk-ganda (double tap) untuk maju cepat
const CONTROLS_AUTO_HIDE_MS = 3500; // sembunyikan kontrol setelah diam beberapa detik
const LONCAT_DETIK = 10; // ketuk-ganda = maju/mundur sejauh ini
const TANDA_LONCAT_MS = 700; // lama tanda "+10 detik" tampil
const SAVE_PROGRESS_MS = 5000; // jangan tulis localStorage tiap frame timeupdate
// Rasio bingkai video sebelum metadata aslinya terbaca. 9:16 = potret ala
// Melolo/TikTok, bentuk mayoritas episode di sini.
const DEFAULT_VIDEO_RATIO = 9 / 16;

// Feed vertikal ala Melolo: tiap episode = 1 slide full-screen, geser ke atas =
// episode berikutnya, autoplay saat slide terlihat, video habis = auto lanjut.
export default function FeedPlayer({
  dramaId,
  title,
  episodes,
  startEp,
  posterImage,
  subtitles = [],
  premium = false,
  resumeFromHistory = false,
  isMovie = false,
  providers = [],
}: {
  dramaId: string;
  title: string;
  episodes: number;
  startEp: number;
  posterImage?: string;
  subtitles?: string[];
  premium?: boolean;
  resumeFromHistory?: boolean;
  /** Film = 1 video utuh: tanpa slide berikutnya & tanpa tombol episode. */
  isMovie?: boolean;
  /**
   * Sumber unduhan drama ini, diteruskan apa adanya ke ActionRail supaya
   * penonton bisa membuka daftarnya TANPA keluar dari video. Kosong = ikon
   * Unduh di rail tidak digambar (lihat ActionRail).
   */
  providers?: DownloadProvider[];
}) {
  const eps = Array.from({ length: episodes }, (_, i) => i + 1);
  const [active, setActive] = useState(startEp - 1);
  const [paused, setPaused] = useState(false);
  // Arah loncat terakhir untuk tanda "+10 / -10 detik"; null = tanda tersembunyi.
  const [tandaLoncat, setTandaLoncat] = useState<"maju" | "mundur" | null>(null);
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
  const [sound, setSound] = useState({ volume: 1, muted: false });
  const [episodesOpen, setEpisodesOpen] = useState(false);
  const [seeking, setSeeking] = useState(false);
  // Episode yang sumbernya benar-benar gagal dimuat (mis. PC backup / tunnel
  // mati). Ditampilkan sebagai pesan + tombol Coba lagi, BUKAN layar hitam.
  const [failedEps, setFailedEps] = useState<Set<number>>(new Set());
  // Rasio (lebar/tinggi) video episode aktif, dibaca dari berkasnya sendiri
  // supaya panggung overlay berukuran persis sebesar gambar yang tampil.
  const [videoRatio, setVideoRatio] = useState(DEFAULT_VIDEO_RATIO);

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

  // Alamat video TIDAK lagi dirakit di browser — diminta ke server.
  //
  // KENAPA diubah (temuan 2026-10-27, diukur di produksi): versi lama memanggil
  // `videoSrc(baseUrl, ...)` di sini, sehingga alamat episode BERBAYAR ikut
  // tercetak ke HTML dan terbaca siapa pun dari View Source — lalu tunnel
  // melayaninya tanpa syarat (206, `video/mp4`, `ftypmp42`). Sekarang alamat
  // hanya LAHIR di server, sesudah gerbang `lib/paywall-guard.ts` lolos, lalu
  // ditandatangani. Episode yang tak berhak **tidak punya alamat sama sekali**
  // di halaman — bukan sekadar disembunyikan.
  const [srcMap, setSrcMap] = useState<Record<string, string>>({});
  // Kunci yang sudah/sedang diminta, supaya satu slide tak meminta berulang.
  // Ref, bukan state: isinya alat pembukuan dan tak boleh memicu render.
  const sudahDiminta = useRef<Set<string>>(new Set());
  // Kunci yang pemutarannya sudah PERNAH dimulai. Dipisah dari `sudahDiminta`
  // karena menjawab pertanyaan lain: yang itu "alamatnya sudah diminta?", yang
  // ini "videonya sudah disuruh jalan?". Ref, bukan state — alat pembukuan.
  const sudahDimulai = useRef<Set<string>>(new Set());
  const srcKeyFor = (ep: number) => `${ep}|${resolution}`;
  /** Alamat siap pakai, atau `undefined` selagi diambil / kalau tak berhak. */
  const srcFor = (ep: number) => srcMap[srcKeyFor(ep)];

  // Ambil alamat untuk slide yang benar-benar dimount (maks 3: aktif ± 1) —
  // sejalan dengan syarat `near` di bagian render, jadi nol permintaan untuk
  // episode yang elemen videonya memang tidak dibuat.
  //
  // `unlocked` ikut jadi pemicu DENGAN SENGAJA: episode yang BARU DIBAYAR harus
  // langsung dapat alamat tanpa penonton memuat ulang halaman. Tanpa ini,
  // pelanggan membayar lalu videonya tetap tak jalan — kerusakan yang lebih
  // buruk daripada kebocoran yang sedang ditutup.
  useEffect(() => {
    let batal = false;
    const epSekitar = [active - 1, active, active + 1]
      .filter((i) => i >= 0 && i < episodes)
      .map((i) => i + 1);

    for (const ep of epSekitar) {
      const k = `${ep}|${resolution}`;
      if (sudahDiminta.current.has(k)) continue;
      sudahDiminta.current.add(k);
      void (async () => {
        try {
          const r = await fetch(
            `/api/video-url?id=${encodeURIComponent(dramaId)}&ep=${ep}` +
              `&res=${encodeURIComponent(resolution)}`,
            { cache: "no-store" },
          );
          if (!r.ok) {
            // Ditolak gerbang (belum bayar / belum login) atau server sakit.
            // Dilepas dari pembukuan supaya bisa diminta LAGI begitu `unlocked`
            // berubah. Panel paywall & panel gagal yang sudah ada yang bicara
            // ke penonton — di sini cukup diam.
            sudahDiminta.current.delete(k);
            return;
          }
          const { url } = (await r.json()) as { url?: string };
          if (!batal && url) setSrcMap((m) => ({ ...m, [k]: url }));
        } catch {
          sudahDiminta.current.delete(k);
        }
      })();
    }
    return () => {
      batal = true;
    };
  }, [active, resolution, dramaId, episodes, unlocked]);

  // Tombol "Coba lagi" pada panel gagal: hapus penanda gagal lalu paksa elemen
  // <video> memuat ulang. dataset.resfb ikut dibersihkan supaya percobaan
  // turun-resolusi boleh berjalan lagi dari awal.
  const retryEpisode = useCallback(
    (ep: number, idx: number) => {
      setFailedEps((prev) => {
        if (!prev.has(ep)) return prev;
        const next = new Set(prev);
        next.delete(ep);
        return next;
      });
      // Buang alamat yang tersimpan supaya "Coba lagi" MEMINTA ALAMAT BARU,
      // bukan memuat ulang alamat yang sama. Penting sejak alamat bertanda
      // tangan: tanda tangan punya masa berlaku, dan penyebab paling mungkin
      // sebuah episode gagal setelah lama dijeda adalah tanda tangannya habis —
      // memuat ulang alamat yang sama akan gagal lagi, selamanya.
      const k = `${ep}|${resolution}`;
      sudahDiminta.current.delete(k);
      // Ikut dilepas, kalau tidak "Coba lagi" akan mendapat alamat baru tapi
      // tak pernah disuruh jalan (lihat efek PEMULAI PEMUTARAN di bawah).
      sudahDimulai.current.delete(k);
      setSrcMap((m) => {
        if (!(k in m)) return m;
        const next = { ...m };
        delete next[k];
        return next;
      });
      const v = videoRefs.current[idx];
      if (v) {
        delete v.dataset.resfb;
        v.load();
      }
    },
    [resolution],
  );

  // Episode terkunci? Ep awal gratis; admin bebas; sisanya butuh sudah-dibuka.
  const isLocked = useCallback(
    (ep: number) => isEpisodeLocked(ep, { premium, isAdmin, unlocked }),
    [premium, isAdmin, unlocked],
  );
  const lockedActive = isLocked(active + 1);

  // Muat status wallet (saldo + episode yang sudah dibuka) saat mount.
  //
  // Saklar koin mati → dilewati seluruhnya: tak ada paywall untuk ditegakkan,
  // jadi saldo & daftar episode terbuka tak dipakai siapa pun di sini. Menyimpan
  // panggilannya berarti satu permintaan sia-sia (dan satu 404) tiap kali
  // pemutar dibuka — di halaman yang paling sering dibuka penonton.
  useEffect(() => {
    if (!PAYWALL_ENABLED) return;
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

  // Terapkan kecepatan ke video aktif (juga tiap pindah episode).
  useEffect(() => {
    const v = videoRefs.current[active];
    if (!v) return;
    v.playbackRate = speed;
  }, [active, speed]);

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

  // PEMULAI PEMUTARAN saat alamatnya tiba — pasangan wajib dari efek di atas.
  //
  // KENAPA ADA (diukur 2026-10-28, tests/beli-lalu-tonton.test.ts): efek di
  // atas bereaksi pada "episode/aksesnya berubah" dan berjalan SINKRON dengan
  // perubahan state, sementara alamat video baru datang BELAKANGAN (jawaban
  // /api/video-url). Di jalur beli-lalu-tonton keduanya tak pernah bertemu:
  // koin terpotong → `unlocked` berubah → play() dipanggil pada <video> yang
  // masih TANPA `src` → nol byte dimuat. Paywall hilang, layar tetap diam,
  // dan tak ada yang melapor - pelanggan membayar lalu tak dapat apa-apa.
  //
  // Dicatat per-kunci `ep|resolusi` supaya satu alamat hanya DIMULAI SEKALI:
  // tanpa pembukuan itu, render ulang berikutnya akan merebut kembali kendali
  // dari penonton yang baru menjeda sendiri.
  useEffect(() => {
    if (paused) return; // penonton menjeda sendiri → jangan diambil alih
    const ep = active + 1;
    const k = `${ep}|${resolution}`;
    if (!srcMap[k] || sudahDimulai.current.has(k)) return;
    if (isLocked(ep)) return;
    const v = videoRefs.current[active];
    if (!v) return;
    sudahDimulai.current.add(k);
    v.play().catch(() => setPaused(true)); // autoplay diblokir → tombol play
  }, [active, resolution, srcMap, paused, isLocked]);

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

  // Volume berlaku ke SEMUA video yang ter-mount (slide sebelah ikut), supaya
  // geser ke episode berikutnya tidak tiba-tiba kembali keras/bisu.
  useEffect(() => {
    for (const v of Object.values(videoRefs.current)) {
      if (!v) continue;
      v.volume = sound.volume;
      v.muted = sound.muted;
    }
  }, [sound, active]);

  // Auto-hide kontrol biar video jadi fokus; sentuh layar utk memunculkan lagi.
  const revealControls = useCallback(() => {
    setControlsVisible(true);
    setTick((t) => t + 1);
  }, []);

  const changeSound = (next: { volume: number; muted: boolean }) => {
    setSound(next);
    revealControls(); // sedang mengatur → jangan biarkan rail memudar di tengah geser
  };

  useEffect(() => {
    // Jangan sembunyikan saat jeda / menu kebuka / overlay aktif.
    if (paused || lockedActive || settingsOpen || commentsOpen || episodesOpen || adOpen) {
      setControlsVisible(true);
      return;
    }
    const t = window.setTimeout(() => setControlsVisible(false), CONTROLS_AUTO_HIDE_MS);
    return () => window.clearTimeout(t);
  }, [paused, lockedActive, settingsOpen, commentsOpen, episodesOpen, adOpen, active, tick]);

  // Unduh episode aktif: bikin <a> tak-terlihat lalu klik otomatis.
  //
  // LEWAT /api/download, bukan alamat tunnel yang dirakit di sini (diubah
  // 2026-10-27). Dulu `downloadUrl(baseUrl, ...)` menempelkan alamat tunnel
  // langsung — jalur kedua yang sama bocornya dengan `videoSrc`: episode
  // berbayar bisa diunduh siapa pun yang membaca HTML.
  //
  // Nol yang hilang dari penonton: /api/download menegakkan gerbang paywall
  // yang sama lalu membalas 307 ke `...?dl=1`, dan Caddy PC backup yang
  // mengirim `Content-Disposition: attachment` (pc-backup-agent/Caddyfile:20-25).
  // Jadi unduhan tetap langsung dari tunnel — NOL byte lewat server kita,
  // syarat yang dikunci tests/download-redirect.test.ts.
  const onDownload = () => {
    const ep = active + 1;
    const a = document.createElement("a");
    a.href = `/api/download?id=${encodeURIComponent(dramaId)}&ep=${ep}`;
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

  // Ketuk-ganda ala YouTube: separuh kanan = maju, separuh kiri = mundur
  // LONCAT_DETIK. Like TIDAK lagi lewat ketuk-ganda (permintaan 2026-11-07) —
  // tombol hati di ActionRail tetap jalurnya.
  const loncat = (arah: "maju" | "mundur") => {
    if (lockedActive) return;
    const v = videoRefs.current[active];
    if (!v) return;
    const delta = arah === "maju" ? LONCAT_DETIK : -LONCAT_DETIK;
    const t = posisiSesudahLoncat(v.currentTime, delta, v.duration);
    v.currentTime = t;
    setCurTime(t);
    setTandaLoncat(arah);
    window.setTimeout(() => setTandaLoncat(null), TANDA_LONCAT_MS);
  };

  // 1x tap: kalau kontrol tersembunyi → munculkan saja; kalau sudah tampil →
  // play/pause. 2x tap = maju/mundur 10 detik tergantung sisi yang diketuk.
  // Patokan tengahnya = tengah elemen <video> (selebar layar); di layar lebar
  // kolom video ada di tengah, jadi garis pembaginya tetap tengah gambar.
  const onTap = (e: React.MouseEvent<HTMLVideoElement>) => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      const rect = e.currentTarget.getBoundingClientRect();
      loncat(e.clientX < rect.left + rect.width / 2 ? "mundur" : "maju");
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
                    // Ukuran asli video baru diketahui di sini — dipakai untuk
                    // mengukur panggung overlay (lihat komentar panggung).
                    if (v.videoWidth > 0 && v.videoHeight > 0) {
                      setVideoRatio(v.videoWidth / v.videoHeight);
                    }
                    v.playbackRate = speed;
                    v.volume = sound.volume;
                    v.muted = sound.muted;
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
                    const aksi = decideVideoError({
                      resolution,
                      resolutionTried: v.dataset.resfb ?? "",
                      alreadyFailed: failedEps.has(ep),
                    });
                    // Varian resolusi tak ada → balik ke Asli (tetap jalan).
                    if (aksi === "turun-ke-asli") {
                      v.dataset.resfb = resolution;
                      pendingSeek.current = v.currentTime || pendingSeek.current;
                      setResolution("");
                      return;
                    }
                    if (aksi === "menyerah") {
                      setFailedEps((prev) => new Set(prev).add(ep));
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

              {/* Sumber video mati → beri tahu penonton apa yang terjadi.
                  Tidak ditampilkan untuk episode terkunci, karena di situ sudah
                  ada EpisodePaywall (jangan dua panel bertumpuk). */}
              {failedEps.has(ep) && !isLocked(ep) ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/90 px-6 text-center">
                  <p className="text-base font-semibold text-white">
                    Video sedang tidak bisa diputar
                  </p>
                  <p className="max-w-xs text-sm text-zinc-400">
                    Sumber videonya sedang mati. Coba lagi beberapa menit lagi.
                  </p>
                  <button
                    type="button"
                    onClick={() => retryEpisode(ep, idx)}
                    className="mt-1 rounded-full bg-white px-5 py-2 text-sm font-medium text-black"
                  >
                    Coba lagi
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* PANGGUNG — kotak tak terlihat seukuran gambar video yang BENAR-BENAR
          tampil. Video dirender object-contain, jadi di layar lebar video 9:16
          menyusut jadi kolom di tengah dan sisanya pita hitam; overlay yang
          menempel ke tepi LAYAR akan mendarat di pita hitam itu. Dibungkus di
          sini, semua tombol menempel ke tepi VIDEO.
          Rumusnya = aturan object-contain itu sendiri: lebar dibatasi
          tinggi x rasio, tinggi dibatasi lebar / rasio — yang lebih kecil yang
          mengikat. Di layar sempit (HP) tak ada yang mengikat, panggung = satu
          layar penuh, jadi tampilan HP tidak berubah.
          pointer-events-none supaya ketukan play/pause & ketuk-ganda maju tetap
          sampai ke <video> di bawahnya; tiap anak yang bisa diklik menyalakan
          pointer-events-auto sendiri.
          Paywall, sheet episode, drawer komentar & modal SENGAJA di luar
          panggung: ketiganya panel penuh, bukan tombol yang menempel di video. */}
      <div
        className="pointer-events-none absolute inset-0 z-20 m-auto"
        style={{
          maxWidth: `calc(100dvh * ${videoRatio})`,
          maxHeight: `calc(100vw / ${videoRatio})`,
        }}
      >
        {/* Overlay tetap di atas slide aktif */}
        <Link
          href={`/drama/${dramaId}`}
          className="pointer-events-auto absolute left-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"
          aria-label="Kembali"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>

        <ActionRail
          dramaId={dramaId}
          title={title}
          posterImage={posterImage}
          onComment={() => setCommentsOpen(true)}
          providers={providers}
          visible={controlsVisible}
          sound={{ ...sound, onChange: changeSound }}
        />

        {/* Gerigi pengaturan di kanan atas — panel bawah sengaja hanya judul +
            bar posisi + timer (permintaan 2026-11-07). Ikut memudar bersama
            kontrol lain; disembunyikan saat episode terkunci seperti dulu. */}
        {!lockedActive && (
          <div
            className={`absolute right-3 top-3 z-30 transition-opacity duration-300 ${
              controlsVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <PlayerSettings
              open={settingsOpen}
              speed={speed}
              resolution={resolution}
              subtitles={subtitles}
              subLang={subLang}
              isFullscreen={isFullscreen}
              onToggle={() => setSettingsOpen((v) => !v)}
              onSpeed={setSpeedTo}
              onResolution={chooseRes}
              onSubtitle={chooseSub}
              onDownload={onDownload}
              onToggleFullscreen={toggleFullscreen}
            />
          </div>
        )}

        {/* Panel bawah: judul, episode, subtitle, bar posisi + timer —
            komponen sendiri (PlayerControls). */}
        <PlayerControls
          title={title}
          currentEp={active + 1}
          episodes={episodes}
          isMovie={isMovie}
          cueText={cueText}
          lockedActive={lockedActive}
          controlsVisible={controlsVisible}
          curTime={curTime}
          dur={dur}
          seekBarRef={seekRef}
          onSeekDown={onSeekDown}
          onSeekMove={onSeekMove}
          onSeekUp={onSeekUp}
          onOpenEpisodes={() => setEpisodesOpen(true)}
        />

        {/* Tombol putar/jeda di TENGAH video. Saat jeda: lapisan inset-0 supaya
            ketuk di mana saja memutar. Saat berputar: hanya lingkarannya yang
            bisa diklik (muncul bersama kontrol), sisa layar tetap tembus ke
            <video> agar ketuk-ganda maju/mundur 10 detik tetap jalan. */}
        {!lockedActive && (paused || controlsVisible) && (
          <button
            onClick={togglePlay}
            className={`pointer-events-auto absolute z-10 ${
              paused
                ? "inset-0"
                : "left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full"
            }`}
            aria-label={paused ? "Putar" : "Jeda"}
          >
            <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/50">
              {paused ? (
                <Play className="h-8 w-8 fill-white" strokeWidth={0} />
              ) : (
                <Pause className="h-8 w-8 fill-white" strokeWidth={0} />
              )}
            </span>
          </button>
        )}

        {tandaLoncat && (
          <div
            className={`pointer-events-none absolute top-1/2 z-30 -translate-y-1/2 rounded-full bg-black/60 px-3 py-1.5 text-sm font-semibold text-white ${
              tandaLoncat === "maju" ? "right-6" : "left-6"
            }`}
          >
            {tandaLoncat === "maju" ? "+" : "-"}
            {LONCAT_DETIK} detik
          </div>
        )}

        {/* Petunjuk geser hanya masuk akal kalau memang ada episode berikutnya. */}
        {!isMovie && active === 0 && !cueText && controlsVisible && (
          <div className="pointer-events-none absolute bottom-60 left-1/2 z-10 -translate-x-1/2 text-center text-[11px] text-white/70">
            Geser ke atas untuk episode berikutnya ↑
          </div>
        )}
      </div>

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
    </div>
  );
}
