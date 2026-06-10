"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isLiked, setLiked } from "@/lib/myLikes";
import { isSaved, toggleSaved } from "@/lib/myList";

// Rail ikon vertikal ala Melolo/TikTok yang menempel di sisi kanan feed.
// Pakai ulang store like (/api/likes) + myList (simpan) yang sudah ada.
export default function ActionRail({
  dramaId,
  title,
  posterImage,
  onComment,
}: {
  dramaId: string;
  title: string;
  posterImage?: string;
  onComment?: () => void;
}) {
  const [liked, setLikedState] = useState(false);
  const [saved, setSavedState] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setLikedState(isLiked(dramaId));
    setSavedState(isSaved(dramaId));
    const onSave = () => setSavedState(isSaved(dramaId));
    const onLike = () => setLikedState(isLiked(dramaId));
    window.addEventListener("dramaku:my-list-changed", onSave);
    window.addEventListener("dramaku:liked-changed", onLike);

    fetch("/api/likes")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { likes?: Record<string, number> } | null) =>
        setCount(d?.likes?.[dramaId] ?? 0),
      )
      .catch(() => setCount(0));

    return () => {
      window.removeEventListener("dramaku:my-list-changed", onSave);
      window.removeEventListener("dramaku:liked-changed", onLike);
    };
  }, [dramaId]);

  const onLike = async () => {
    if (pending) return;
    const next = !liked;
    setPending(true);
    setLikedState(next);
    setLiked(dramaId, next);
    setCount((c) => (c === null ? c : Math.max(0, c + (next ? 1 : -1))));
    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dramaId, action: next ? "like" : "unlike" }),
      });
      const data = await res.json();
      if (typeof data?.count === "number") setCount(data.count);
    } catch {
      // biarkan state lokal
    } finally {
      setPending(false);
    }
  };

  const onSave = () => setSavedState(toggleSaved(dramaId));

  const onShare = async () => {
    const url = `${window.location.origin}/feed/${dramaId}`;
    const navAny = navigator as Navigator & {
      share?: (d: { title: string; url: string }) => Promise<void>;
    };
    if (navAny.share) {
      try {
        await navAny.share({ title, url });
      } catch {
        /* user batal */
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        alert("Link disalin ke clipboard");
      } catch {
        /* abaikan */
      }
    }
  };

  return (
    <div className="pointer-events-auto absolute bottom-32 right-2 z-20 flex flex-col items-center gap-5">
      <Link
        href={`/drama/${dramaId}`}
        className="h-11 w-11 overflow-hidden rounded-full border-2 border-white/80 bg-zinc-800"
        aria-label="Detail drama"
      >
        {posterImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={posterImage} alt={title} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-lg">🎬</span>
        )}
      </Link>

      <RailButton label={count && count > 0 ? String(count) : "Suka"} onClick={onLike} active={liked}>
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
      </RailButton>

      <RailButton label="Komen" onClick={() => onComment?.()}>
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
        </svg>
      </RailButton>

      <RailButton label={saved ? "Tersimpan" : "Simpan"} onClick={onSave} active={saved} activeColor="text-amber-400">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <path d="M6 2h12a2 2 0 012 2v18l-8-4-8 4V4a2 2 0 012-2z" />
        </svg>
      </RailButton>

      <RailButton label="Bagikan" onClick={onShare}>
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7M16 6l-4-4-4 4M12 2v14" />
        </svg>
      </RailButton>
    </div>
  );
}

function RailButton({
  children,
  label,
  onClick,
  active = false,
  activeColor = "text-rose-500",
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  activeColor?: string;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1" aria-pressed={active}>
      <span className={active ? activeColor : "text-white drop-shadow-lg"}>{children}</span>
      <span className="text-[11px] font-medium text-white drop-shadow-lg">{label}</span>
    </button>
  );
}

