"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Share2 } from "lucide-react";

/** Berapa lama tulisan "Link disalin" bertahan sebelum kembali normal. */
const FEEDBACK_MS = 2000;

/**
 * Bagikan halaman ini. Di HP memakai menu bagikan bawaan sistem (Web Share
 * API); di browser yang tak mendukungnya, link disalin ke clipboard.
 *
 * Preview yang muncul di WhatsApp/Facebook berasal dari metadata OG di
 * app/drama/[id]/page.tsx — jadi tombol ini tak perlu mengurus gambar.
 */
export default function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const onClick = async () => {
    const url = window.location.href;
    const text = `Nonton ${title} di DramaKu`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // Penonton membatalkan menu bagikan, atau sistem menolak —
        // jatuh ke salin link di bawah supaya tombol tetap ada gunanya.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), FEEDBACK_MS);
    } catch {
      // Clipboard diblokir (mis. halaman bukan https) — diamkan; tak ada
      // yang bisa dilakukan tanpa mengganggu penonton.
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className="h-auto w-full rounded-full border border-zinc-700 bg-zinc-900 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:border-amber-500 hover:text-amber-400"
    >
      {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
      {copied ? "Link disalin" : "Bagikan"}
    </Button>
  );
}
