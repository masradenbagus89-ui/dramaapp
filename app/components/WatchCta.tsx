"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProgressEntry } from "@/lib/progress";
import { tujuanNonton } from "@/lib/tujuan-nonton";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

export default function WatchCta({
  dramaId,
  className,
}: {
  dramaId: string;
  className?: string;
}) {
  // Aturan "lanjut atau mulai" tinggal di lib/tujuan-nonton.ts — dipakai
  // bersama gambar besar hero, supaya dua tombol di halaman yang SAMA tak
  // pernah mengarah ke episode yang berbeda.
  const [tujuan, setTujuan] = useState(() => tujuanNonton(dramaId, null));

  useEffect(() => {
    setTujuan(tujuanNonton(dramaId, getProgressEntry(dramaId)));
  }, [dramaId]);

  return (
    <Button
      asChild
      className={cn(
        "h-11 rounded-full bg-amber-400 px-5 text-sm font-bold text-black hover:bg-amber-300",
        className,
      )}
    >
      <Link href={tujuan.href}>
        <Play className="size-4 fill-current text-current" />
        {tujuan.label}
      </Link>
    </Button>
  );
}
