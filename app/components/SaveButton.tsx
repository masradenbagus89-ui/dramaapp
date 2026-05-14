"use client";

import { useEffect, useState } from "react";
import { isSaved, toggleSaved } from "@/lib/myList";

export default function SaveButton({ id }: { id: string }) {
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

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-center gap-2 rounded-full border py-3 text-sm font-semibold transition-colors ${
        saved
          ? "border-amber-400 bg-zinc-900 text-amber-400"
          : "border-zinc-700 bg-zinc-900 text-zinc-200"
      }`}
      aria-pressed={saved}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M6 2h12a2 2 0 012 2v18l-8-4-8 4V4a2 2 0 012-2z" />
      </svg>
      {mounted ? (saved ? "Tersimpan" : "Simpan") : "Simpan"}
    </button>
  );
}
