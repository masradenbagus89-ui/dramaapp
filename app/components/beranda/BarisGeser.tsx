"use client";

import { useRef } from "react";
import type { KartuKatalog } from "@/lib/beranda-video";
import CatalogCard from "./CatalogCard";
import KartuVideo from "./KartuVideo";
import { ROW_CARD_CLASS } from "./shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * DERETAN KARTU YANG BISA DIGESER ke kiri/kanan, dengan panah di kedua ujung.
 *
 * KENAPA KOMPONEN SENDIRI (2026-10-10): mekanisme ini sebelumnya tertanam di
 * `FeaturedRow`, dan seksi halaman depan sekarang membutuhkan yang sama (owner:
 * "diujung kasih tanda panah agar bisa geser ke kanan/kiri"). Disalin, dua
 * baris itu pasti menyimpang pelan-pelan — satu diperbaiki, satu tertinggal,
 * tanpa satu pun error yang memberi tahu (§3.3).
 *
 * Komponen ini SENGAJA tidak tahu apa-apa soal judul, keterangan, maupun tombol
 * "Semua". Tugasnya satu: menggambar kartu dalam satu baris yang bisa digeser.
 * Pemanggilnya yang menyusun sisanya.
 *
 * Tidak ada yang bergerak sendiri di sini — tak ada timer, tak ada slide yang
 * berganti otomatis (permintaan owner 2026-09-07 "jangan berjalan lagi").
 * Posisi hanya berubah kalau panah ditekan atau barisnya digeser dengan jari.
 */
export default function BarisGeser({
  kartu,
  cardClass = ROW_CARD_CLASS,
  cardHrefPrefix,
  panahSelalu = false,
}: {
  kartu: KartuKatalog[];
  /**
   * Lebar SATU kartu. Angkanya ada di ./shell — `ROW_CARD_CLASS` (bawaan,
   * sejajar lebar kolom grid) atau `ROW_KATEGORI_CARD_CLASS` yang lebih kecil.
   * Dikunci di sini, bukan di kartunya, supaya kartunya tetap kartu yang SAMA
   * dengan yang dipakai grid — lencana, hover, dan cuplikannya tidak perlu
   * dibuat versi kedua.
   */
  cardClass?: string;
  /**
   * Awalan alamat tiap kartu drama; tautannya jadi `<awalan>/<id drama>`.
   * Mis. "/feed" -> /feed/<id>. Kosong = kartu memakai bawaannya (/drama/<id>).
   *
   * Sengaja TEKS, bukan fungsi: komponen ini dirakit di browser sedangkan
   * halaman pemanggilnya dirakit di server, dan Next.js MELARANG fungsi
   * menyeberang di antara keduanya (halaman langsung error 500). Typecheck
   * TIDAK menangkap ini — aturannya baru berlaku saat dijalankan.
   *
   * SENGAJA tidak berlaku untuk kartu video: awalan ini ada untuk halaman
   * Shorts yang melempar ke /feed/<id drama>, dan video tidak punya halaman
   * feed. Alamatnya selalu halaman tonton miliknya sendiri (lib/tonton.ts).
   */
  cardHrefPrefix?: string;
  /**
   * true = panah SELALU terlihat di layar lebar, bukan cuma saat kursor lewat.
   *
   * Dipakai seksi halaman depan (owner 2026-10-10 meminta "tanda panah"): di
   * sana barisnya padat poster dan tanpa tanda yang terlihat, penonton tidak
   * tahu masih ada judul lain di sebelah kanan. Baris unggulan di puncak
   * halaman tetap memakai bawaan `false` supaya panahnya tidak menutupi poster
   * besar saat halaman baru dibuka.
   */
  panahSelalu?: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  if (kartu.length === 0) return null;

  const geser = (arah: -1 | 1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: arah * el.clientWidth * 0.8, behavior: "smooth" });
  };

  /**
   * Bentuk kedua panah. Ditulis sekali supaya tombol kiri & kanan mustahil
   * berbeda ukuran/warna — satu-satunya yang boleh beda cuma posisi & arahnya.
   *
   * Panah SENGAJA hanya di layar lebar (`md:flex`): di HP menggeser dengan jari
   * sudah lebih enak daripada menekan tombol kecil, dan tombol melayang justru
   * menutupi poster.
   */
  const kelasPanah = cn(
    "absolute top-1/2 z-20 hidden size-9 -translate-y-1/2 rounded-full border border-white/25 text-white shadow-lg transition-opacity md:flex",
    panahSelalu
      ? "opacity-90 hover:opacity-100"
      : "opacity-0 md:group-hover/geser:opacity-100",
  );

  return (
    <div className="group/geser relative">
      <Button
        type="button"
        variant="secondary"
        size="icon"
        onClick={() => geser(-1)}
        aria-label="Geser ke kiri"
        className={cn(kelasPanah, "left-1 bg-black/80 hover:bg-black")}
      >
        <ChevronLeft className="size-5" />
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        onClick={() => geser(1)}
        aria-label="Geser ke kanan"
        className={cn(kelasPanah, "right-1 bg-rose-600 hover:bg-rose-500")}
      >
        <ChevronRight className="size-5" />
      </Button>

      <div
        ref={scroller}
        className="no-scrollbar flex gap-2 overflow-x-auto scroll-smooth md:gap-2.5"
      >
        {kartu.map((k) =>
          k.jenis === "drama" ? (
            <div key={`d-${k.drama.id}`} className={cardClass}>
              <CatalogCard
                drama={k.drama}
                href={cardHrefPrefix ? `${cardHrefPrefix}/${k.drama.id}` : undefined}
              />
            </div>
          ) : (
            <div key={`v-${k.video.id}`} className={cardClass}>
              <KartuVideo video={k.video} />
            </div>
          ),
        )}
      </div>
    </div>
  );
}
