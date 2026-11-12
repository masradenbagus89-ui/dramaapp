"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Bookmark, Share2, Clapperboard, Download } from "lucide-react";
import { isLiked, setLiked } from "@/lib/myLikes";
import { isSaved, toggleSaved } from "@/lib/myList";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DownloadProvider } from "@/lib/types";
import DownloadModal from "./DownloadModal";

// Rail ikon vertikal ala Melolo/TikTok yang menempel di sisi kanan feed.
// Pakai ulang store like (/api/likes) + myList (simpan) yang sudah ada.
export default function ActionRail({
  dramaId,
  title,
  posterImage,
  onComment,
  providers = [],
  visible = true,
}: {
  dramaId: string;
  title: string;
  posterImage?: string;
  onComment?: () => void;
  /**
   * Daftar sumber unduhan drama ini. KOSONG = ikon Unduh tidak digambar sama
   * sekali — bukan digambar lalu membuka modal kosong. Penonton yang dramanya
   * belum punya daftar provider tetap bisa mengunduh lewat menu gerigi
   * (PlayerSettings.tsx:153), jadi tidak ada yang hilang.
   */
  providers?: DownloadProvider[];
  /**
   * false = rail memudar (video sedang berputar & kontrol disembunyikan);
   * ketuk layar memunculkannya lagi. Default true supaya pemanggil lama aman.
   */
  visible?: boolean;
}) {
  const [liked, setLikedState] = useState(false);
  const [saved, setSavedState] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);

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
    <>
      <div
        className={cn(
          // `gap-2` (8px), bukan `gap-4` (owner 2026-11-12: "untuk komen dan
          // yang lainnya bisa di perkecil lalu di dekatkan jadi tidak terlalu
          // tinggi"). Rail yang terlalu jangkung memanjang sampai menutupi
          // gambar film dari atas ke bawah — dan ruang kosong antar ikonlah
          // yang paling banyak memakannya, bukan ikonnya sendiri.
          "absolute bottom-32 right-2 z-20 flex flex-col items-center gap-2 transition-opacity duration-300",
          visible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <Link
          href={`/drama/${dramaId}`}
          className="h-9 w-9 overflow-hidden rounded-full border-2 border-amber-400/80 bg-zinc-800 shadow-lg ring-2 ring-black/20 transition-transform hover:scale-105"
          aria-label="Detail drama"
        >
          {posterImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={posterImage} alt={title} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-amber-400">
              <Clapperboard className="h-4 w-4" />
            </span>
          )}
        </Link>

        <RailButton
          label={count && count > 0 ? String(count) : "Suka"}
          onClick={onLike}
          active={liked}
          activeColor="text-rose-500"
        >
          <Heart fill={liked ? "currentColor" : "none"} />
        </RailButton>

        <RailButton label="Komen" onClick={() => onComment?.()}>
          <MessageCircle />
        </RailButton>

        <RailButton label={saved ? "Tersimpan" : "Simpan"} onClick={onSave} active={saved} activeColor="text-amber-400">
          <Bookmark fill={saved ? "currentColor" : "none"} />
        </RailButton>

        <RailButton label="Bagikan" onClick={onShare}>
          <Share2 />
        </RailButton>

        {/* 🪤 TOMBOL VOLUME SUDAH TIDAK DI SINI (owner 2026-11-12: "volume
            pindahkan ke samping durasi"). Tempatnya kini di panel bawah,
            sebaris dengan angka durasi — lihat PlayerControls.tsx.
            Jangan dipasang kembali ke rail tanpa membuang yang di sana: dua
            tombol volume di satu layar membuat penonton mengira keduanya
            mengatur hal yang berbeda. Penjaganya:
            tests/action-rail-tampil.test.ts. */}

        {providers.length > 0 && (
          <RailButton label="Unduh" onClick={() => setDownloadOpen(true)}>
            <Download />
          </RailButton>
        )}
      </div>

      {/* Modal SENGAJA di luar div rail di atas, bukan di dalamnya: div itu
          `absolute ... z-20` sehingga membuat stacking context, dan `z-50`
          milik modal hanya berlaku DI DALAM stacking context induknya —
          dipasang di dalam, modalnya tetap tertimbun lapisan lain yang
          angkanya lebih kecil tapi berada di luar (mis. BottomNav `z-30`). */}
      <DownloadModal
        open={downloadOpen}
        onClose={() => setDownloadOpen(false)}
        providers={providers}
        title={title}
      />
    </>
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
    <div className="flex flex-col items-center gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onClick}
        aria-pressed={active}
        aria-label={label}
        className={cn(
          // Tanpa lingkaran gelap: ikon telanjang + bayangan, mengikuti acuan
          // pemutar Playly.
          //
          // 📐 36px kotak sentuh + ikon 20px (owner 2026-11-12: "bisa di
          // perkecil lalu di dekatkan jadi tidak terlalu tinggi"). Sebelumnya
          // 44px + ikon 24px.
          //
          // ⚠️ 36px ADA DI BAWAH ambang sentuh nyaman 44px, dan itu pertukaran
          // yang DIPILIH owner, bukan kelalaian — rail enam ikon pada 44px
          // memanjang menutupi gambar film. JANGAN dikecilkan lagi di bawah
          // ini: di bawah ±32px jempol mulai sering meleset, dan tombol
          // "Suka"/"Simpan" yang meleset ke "Bagikan" membuka panel berbagi
          // tanpa diminta.
          "h-9 w-9 rounded-full transition-transform hover:scale-110 hover:bg-white/10 active:scale-95 [&_svg:not([class*='size-'])]:size-5",
          "drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]",
          active ? activeColor : "text-white",
        )}
      >
        {children}
      </Button>
      {/* `leading-none` + 9px: label dua-tiga kata ("Tersimpan") tetap satu
          baris, dan tinggi barisnya tidak lagi menambah jarak tersembunyi
          antar ikon — itulah sisa ketinggian yang tidak kelihatan asalnya. */}
      <span className="text-[9px] font-medium leading-none text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
        {label}
      </span>
    </div>
  );
}

