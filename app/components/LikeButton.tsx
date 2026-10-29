"use client";

import { useEffect, useState } from "react";
import { isLiked, setLiked } from "@/lib/myLikes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Heart } from "lucide-react";

export default function LikeButton({
  dramaId,
  terang = false,
}: {
  dramaId: string;
  /**
   * Gambar untuk LATAR TERANG (halaman film sejak owner 2026-10-29).
   * Default `false` = tampilan gelap seperti semula, jadi pemakai lain tidak
   * ikut berubah.
   */
  terang?: boolean;
}) {
  const [liked, setLikedState] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [pending, setPending] = useState(false);

  const refreshCount = async () => {
    try {
      const res = await fetch("/api/likes");
      if (!res.ok) return;
      const data = (await res.json()) as { likes?: Record<string, number> };
      setCount(data.likes?.[dramaId] ?? 0);
    } catch {
      setCount(0);
    }
  };

  useEffect(() => {
    setMounted(true);
    setLikedState(isLiked(dramaId));
    refreshCount();
  }, [dramaId]);

  const onClick = async () => {
    if (pending) return;
    const next = !liked;
    setPending(true);
    setLikedState(next);
    setLiked(dramaId, next);
    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dramaId, action: next ? "like" : "unlike" }),
      });
      const data = await res.json();
      if (typeof data?.count === "number") setCount(data.count);
    } catch {
      // rollback ringan: tetap dengan state local
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={pending}
      aria-pressed={liked}
      className={cn(
        "h-auto w-full rounded-full border py-3 text-sm font-semibold transition-colors disabled:opacity-60",
        terang ? "bg-white" : "bg-zinc-900",
        liked
          ? "border-rose-500 bg-rose-500/15 text-rose-600 hover:text-rose-600"
          : terang
            ? "border-zinc-300 text-zinc-700 hover:border-rose-500 hover:text-rose-600"
            : "border-zinc-700 text-zinc-200 hover:border-rose-500 hover:text-rose-400",
      )}
    >
      <Heart
        className="size-4"
        fill={liked ? "currentColor" : "none"}
      />
      {mounted ? (liked ? "Disukai" : "Suka") : "Suka"}
      {count !== null && count > 0 && (
        <span className={cn("text-xs", terang ? "text-zinc-500" : "text-zinc-400")}>· {count}</span>
      )}
    </Button>
  );
}
