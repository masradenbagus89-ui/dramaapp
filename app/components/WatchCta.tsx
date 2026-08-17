"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProgressEntry } from "@/lib/progress";
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
  const [href, setHref] = useState(`/feed/${dramaId}?ep=1`);
  const [label, setLabel] = useState("Mulai Nonton");

  useEffect(() => {
    const entry = getProgressEntry(dramaId);
    if (!entry) {
      setHref(`/feed/${dramaId}?ep=1`);
      setLabel("Mulai Nonton");
      return;
    }
    setHref(`/feed/${dramaId}`);
    setLabel("Lanjut Nonton");
  }, [dramaId]);

  return (
    <Button
      asChild
      className={cn(
        "h-11 rounded-full bg-amber-400 px-5 text-sm font-bold text-black hover:bg-amber-300",
        className,
      )}
    >
      <Link href={href}>
        <Play className="size-4 fill-current text-current" />
        {label}
      </Link>
    </Button>
  );
}
