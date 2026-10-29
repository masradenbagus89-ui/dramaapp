"use client";

import { useEffect, useState } from "react";
import { isSaved, toggleSaved } from "@/lib/myList";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Bookmark } from "lucide-react";

export default function SaveButton({
  id,
  variant = "block",
  className,
  terang = false,
}: {
  id: string;
  variant?: "block" | "hero";
  className?: string;
  /**
   * Gambar untuk LATAR TERANG (halaman film sejak owner 2026-10-29).
   * Default `false` = tampilan gelap seperti semula, jadi pemakai lain —
   * termasuk layar pemutar — tidak ikut berubah.
   */
  terang?: boolean;
}) {
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSaved(isSaved(id));
    const handler = () => setSaved(isSaved(id));
    window.addEventListener("dramaku:my-list-changed", handler);
    return () => window.removeEventListener("dramaku:my-list-changed", handler);
  }, [id]);

  const onClick = () => {
    setSaved(toggleSaved(id));
  };

  const label = mounted ? (saved ? "Favorit" : "Tambah Favorit") : "Tambah Favorit";
  const heroLabel = mounted
    ? saved
      ? "Dalam My List"
      : "Tambah ke My List"
    : "Tambah ke My List";

  if (variant === "hero") {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={onClick}
        aria-pressed={saved}
        className={cn(
          "h-11 rounded-full border-zinc-600 bg-black/40 px-5 text-sm font-semibold text-white backdrop-blur hover:border-amber-400 hover:text-amber-400",
          saved && "border-amber-400 text-amber-400 hover:text-amber-400",
          className,
        )}
      >
        <Bookmark className="size-4" fill={saved ? "currentColor" : "none"} />
        {heroLabel}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      aria-pressed={saved}
      className={cn(
        "h-auto w-full rounded-full border py-3 text-sm font-semibold transition-colors",
        terang ? "bg-white" : "bg-zinc-900",
        saved
          ? "border-amber-500 text-amber-600 hover:text-amber-600"
          : terang
            ? "border-zinc-300 text-zinc-700"
            : "border-zinc-700 text-zinc-200",
      )}
    >
      <Bookmark className="size-4" fill={saved ? "currentColor" : "none"} />
      {mounted ? (saved ? "Dalam Favorit" : "Tambah Favorit") : "Tambah Favorit"}
    </Button>
  );
}
