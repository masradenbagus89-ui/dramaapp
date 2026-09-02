"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AdCreative from "./AdCreative";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// =====================================================================
// Banner IKLAN OTOMATIS (auto ads). Beda dari RewardedAdModal (iklan koin
// yang dikelola manual di /admin) — ini slot pasif buat passive income.
//
// Diatur lewat env (semua NEXT_PUBLIC_ → terbaca di browser):
//
//   NEXT_PUBLIC_ADSENSE_CLIENT  → id penerbit AdSense, mis "ca-pub-1234567890123456"
//   NEXT_PUBLIC_ADSENSE_SLOT    → id unit iklan default (boleh ditimpa lewat prop slot)
//   NEXT_PUBLIC_AD_BANNER_HTML  → (opsional) tempel kode banner network lain
//                                 (Adsterra/Monetag) kalau AdSense ditolak.
//
// Prioritas: kode mentah > AdSense > house ad (iklan manual /admin → promo DramaKu).
// Kalau tidak ada network yang diset, slot menampilkan iklan manual kamu atau
// promo DramaKu, jadi tidak pernah kosong/rusak.
// =====================================================================

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim() || "";
const ADSENSE_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT?.trim() || "";
const RAW_HTML = process.env.NEXT_PUBLIC_AD_BANNER_HTML?.trim() || "";

type SponsorAd = {
  id: string;
  title?: string;
  imageUrl: string;
  linkUrl: string;
};

export default function AdBanner({
  slot,
  className = "",
}: {
  slot?: string;
  className?: string;
}) {
  const effectiveSlot = (slot || ADSENSE_SLOT).trim();
  const mode: "raw" | "adsense" | "house" = RAW_HTML
    ? "raw"
    : ADSENSE_CLIENT && effectiveSlot
      ? "adsense"
      : "house";

  // ---- Mode 1: kode mentah dari network lain (Adsterra/Monetag/dll) -------
  const rawRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (mode !== "raw" || !rawRef.current) return;
    const host = rawRef.current;
    host.innerHTML = RAW_HTML;
    // innerHTML tidak menjalankan <script> — buat ulang supaya tereksekusi.
    host.querySelectorAll("script").forEach((old) => {
      const s = document.createElement("script");
      for (const a of Array.from(old.attributes)) s.setAttribute(a.name, a.value);
      s.text = old.textContent ?? "";
      old.replaceWith(s);
    });
  }, [mode]);

  // ---- Mode 2: Google AdSense unit ----------------------------------------
  const pushed = useRef(false);
  useEffect(() => {
    if (mode !== "adsense" || pushed.current) return;
    if (!document.getElementById("adsbygoogle-lib")) {
      const s = document.createElement("script");
      s.id = "adsbygoogle-lib";
      s.async = true;
      s.crossOrigin = "anonymous";
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
      document.head.appendChild(s);
    }
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] };
      (w.adsbygoogle = w.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      /* AdSense belum siap — akan diproses saat library termuat. */
    }
  }, [mode]);

  // ---- Mode 3: house ad (ambil iklan manual /admin, fallback promo) -------
  const [ad, setAd] = useState<SponsorAd | null>(null);
  useEffect(() => {
    if (mode !== "house") return;
    let alive = true;
    fetch("/api/ads", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { ads?: SponsorAd[] } | null) => {
        if (!alive) return;
        const list = d?.ads ?? [];
        if (!list.length) return;
        const picked = list[Math.floor(Math.random() * list.length)];
        setAd(picked);
        fetch("/api/ads/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: picked.id, type: "view" }),
        }).catch(() => {});
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [mode]);

  const onHouseClick = () => {
    if (!ad) return;
    fetch("/api/ads/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ad.id, type: "click" }),
    }).catch(() => {});
  };

  // Bingkai selebar penuh untuk mode raw/adsense/promo — ketiganya memang harus
  // membentang. Cabang house ad bergambar TIDAK memakai ini (lihat di bawah).
  // cn() (tailwind-merge) supaya class dari pemanggil menimpa dengan pemenang
  // yang pasti, bukan bergantung urutan CSS seperti pada template string.
  const shell = cn(
    "relative overflow-hidden rounded-2xl border border-zinc-800",
    className,
  );

  if (mode === "raw") {
    return (
      <div className={shell}>
        <Badge
          variant="secondary"
          className="absolute left-2 top-2 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-white/70"
        >
          Iklan
        </Badge>
        <div ref={rawRef} className="flex min-h-[90px] items-center justify-center" />
      </div>
    );
  }

  if (mode === "adsense") {
    return (
      <div className={shell}>
        <Badge
          variant="secondary"
          className="absolute left-2 top-2 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-white/70"
        >
          Iklan
        </Badge>
        <ins
          className="adsbygoogle"
          style={{ display: "block", minHeight: 90 }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={effectiveSlot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  // House ad: iklan manual sponsor (kalau ada) atau promo DramaKu.
  if (ad) {
    // Dua batas lebar yang berbeda sengaja dipisah ke DUA elemen supaya tidak
    // saling menggusur (keduanya properti CSS yang sama, max-width):
    //   • pembungkus luar  → batas dari pemanggil (max-w-7xl, max-w-2xl, mt-6);
    //   • <a> bingkai      → `w-fit max-w-full`: memeluk kotak pas-badan dari
    //     AdCreative, tapi tak pernah melewati lebar pembungkusnya.
    // Digabung jadi satu elemen, class pemanggil menang lewat tailwind-merge,
    // `max-w-full` hilang, dan bingkai bisa membludak keluar layar di HP.
    return (
      <div className={cn("relative", className)}>
        <a
          href={ad.linkUrl}
          target="_blank"
          rel="noopener sponsored"
          onClick={onHouseClick}
          className="group relative mx-auto block w-fit max-w-full overflow-hidden rounded-2xl border border-zinc-800"
        >
          <AdCreative src={ad.imageUrl} alt={ad.title ?? "Iklan"} hover />
          <Badge
            variant="secondary"
            className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-white/80 backdrop-blur-sm"
          >
            Iklan
          </Badge>
        </a>
      </div>
    );
  }

  // Fallback terakhir: promo DramaKu sendiri (slot tidak pernah kosong).
  return (
    <Link
      href="/beranda"
      className={`flex h-24 items-center justify-between bg-gradient-to-br from-indigo-700 via-purple-800 to-zinc-900 px-5 sm:h-28 ${shell}`}
    >
      <Badge
        variant="secondary"
        className="absolute left-2 top-2 rounded bg-black/40 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-white/60"
      >
        Iklan
      </Badge>
      <div>
        <p className="text-lg font-black text-white sm:text-xl">DramaKu+</p>
        <p className="text-xs text-white/70">Nonton ratusan drama China, gratis.</p>
      </div>
      <Badge className="shrink-0 rounded-full bg-amber-400 px-4 py-2 text-xs font-bold text-black">
        Tonton →
      </Badge>
    </Link>
  );
}
