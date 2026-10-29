"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Berapa lama tulisan "Link disalin" bertahan sebelum kembali normal. */
const FEEDBACK_MS = 2000;

/**
 * Bagikan halaman ini. Di HP memakai menu bagikan bawaan sistem (Web Share
 * API); di browser yang tak mendukungnya, link disalin ke clipboard.
 *
 * Preview yang muncul di WhatsApp/Facebook berasal dari metadata OG di
 * app/drama/[id]/page.tsx — jadi tombol ini tak perlu mengurus gambar.
 */
export default function ShareButton({
  title,
  className,
  terang = false,
}: {
  title: string;
  /**
   * Penyesuaian ukuran/warna untuk pemakai di luar halaman detail drama.
   * Kosong = tampilan lama persis, jadi halaman yang sudah ada tidak berubah;
   * kotak info video Playly memakainya untuk versi yang lebih kecil.
   */
  className?: string;
  /**
   * Gambar untuk LATAR TERANG (halaman film sejak owner 2026-10-29).
   * Default `false` = tampilan gelap seperti semula, jadi pemakai lain —
   * termasuk layar pemutar — tidak ikut berubah.
   */
  terang?: boolean;
}) {
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
      className={cn(
        "h-auto w-full rounded-full border py-3 text-sm font-semibold transition-colors hover:border-amber-500",
        terang
          ? "border-zinc-300 bg-white text-zinc-700 hover:text-amber-600"
          : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:text-amber-400",
        className,
      )}
    >
      {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
      {copied ? "Link disalin" : "Bagikan"}
    </Button>
  );
}
