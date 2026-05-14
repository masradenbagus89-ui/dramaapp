"use client";

import { useEffect, useState } from "react";
import { isLiked, setLiked } from "@/lib/myLikes";

export default function LikeButton({ dramaId }: { dramaId: string }) {
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
    <button
      onClick={onClick}
      disabled={pending}
      className={`flex w-full items-center justify-center gap-2 rounded-full border py-3 text-sm font-semibold transition-colors disabled:opacity-60 ${
        liked
          ? "border-rose-500 bg-rose-500/15 text-rose-300"
          : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-rose-500 hover:text-rose-400"
      }`}
      aria-pressed={liked}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
      {mounted ? (liked ? "Disukai" : "Suka") : "Suka"}
      {count !== null && count > 0 && (
        <span className="text-xs text-zinc-400">· {count}</span>
      )}
    </button>
  );
}
