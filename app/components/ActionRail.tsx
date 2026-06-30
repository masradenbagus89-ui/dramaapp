"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Bookmark, Share2, Clapperboard } from "lucide-react";
import { isLiked, setLiked } from "@/lib/myLikes";
import { isSaved, toggleSaved } from "@/lib/myList";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
        className="h-11 w-11 overflow-hidden rounded-full border-2 border-amber-400/80 bg-zinc-800 shadow-lg ring-2 ring-black/20 transition-transform hover:scale-105"
        aria-label="Detail drama"
      >
        {posterImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={posterImage} alt={title} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-amber-400">
            <Clapperboard className="h-5 w-5" />
          </span>
        )}
      </Link>

      <RailButton
        label={count && count > 0 ? String(count) : "Suka"}
        onClick={onLike}
        active={liked}
        activeColor="text-rose-500"
      >
        <Heart className="h-7 w-7" fill={liked ? "currentColor" : "none"} />
      </RailButton>

      <RailButton label="Komen" onClick={() => onComment?.()}>
        <MessageCircle className="h-7 w-7" />
      </RailButton>

      <RailButton label={saved ? "Tersimpan" : "Simpan"} onClick={onSave} active={saved} activeColor="text-amber-400">
        <Bookmark className="h-7 w-7" fill={saved ? "currentColor" : "none"} />
      </RailButton>

      <RailButton label="Bagikan" onClick={onShare}>
        <Share2 className="h-7 w-7" />
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
    <div className="flex flex-col items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onClick}
        aria-pressed={active}
        aria-label={label}
        className={cn(
          "h-12 w-12 rounded-full bg-black/30 backdrop-blur-sm transition-transform hover:scale-110 hover:bg-black/45 active:scale-95 [&_svg:not([class*='size-'])]:size-7",
          active ? activeColor : "text-white drop-shadow-lg",
        )}
      >
        {children}
      </Button>
      <span className="text-[11px] font-medium text-white drop-shadow-lg">{label}</span>
    </div>
  );
}

