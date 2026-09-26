"use client";

import { useRef } from "react";
import Link from "next/link";
import type { Drama } from "@/lib/types";
import type { KartuKatalog } from "@/lib/beranda-video";
import CatalogCard from "./CatalogCard";
import KartuVideo from "./KartuVideo";
import { ROW_CARD_CLASS } from "./shell";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Baris FILM UNGGULAN di kepala beranda — deretan poster yang bisa digeser
 * ke samping, lalu satu tombol "lihat semua" di bawahnya.
 *
 * Menggantikan banner hero yang berganti sendiri (permintaan owner 2026-09-07:
 * "jangan berjalan lagi"). Di sini TIDAK ADA yang bergerak otomatis: tak ada
 * timer ganti-slide, tak ada video yang diputar sendiri. Poster hanya bergeser
 * kalau penonton menekan panah atau menggeser dengan jari.
 *
 * Menggantikan `HomeHero` yang lama; komponen itu sudah dihapus 2026-09-09
 * setelah /, /beranda, dan /discover semuanya lepas darinya.
 */
export default function FeaturedRow({
  dramas = [],
  items,
  href = "/discover",
  title,
  cardHrefPrefix,
  cardClass = ROW_CARD_CLASS,
  tombolBawah = true,
}: {
  /** Baris berisi drama saja — bentuk lama, dipakai empat pemanggil. */
  dramas?: Drama[];
  /**
   * Isi baris berupa CAMPURAN drama + video (lib/beranda-video.ts). Kalau
   * diisi, inilah yang digambar dan `dramas` diabaikan.
   *
   * Kenapa prop tambahan dan bukan mengganti `dramas`: komponen ini dipakai
   * lima halaman (/, /beranda, /shorts, tab katalog, baris unggulan). Bentuk
   * opsional membuat kelimanya nol perubahan, sementara logika geser, panah,
   * dan ukuran kartunya tetap SATU — tidak ada baris kedua yang bisa
   * menyimpang diam-diam saat salah satunya diperbaiki.
   */
  items?: KartuKatalog[];
  /**
   * Awalan alamat tiap kartu; tautannya jadi `<awalan>/<id drama>`.
   * Mis. "/feed" -> /feed/<id>. Kosong = kartu memakai bawaannya (/drama/<id>).
   *
   * Sengaja TEKS, bukan fungsi: komponen ini dirakit di browser sedangkan
   * halaman pemanggilnya dirakit di server, dan Next.js MELARANG fungsi
   * menyeberang di antara keduanya (halaman langsung error 500). Typecheck
   * TIDAK menangkap ini — aturannya baru berlaku saat dijalankan.
   */
  cardHrefPrefix?: string;
  /** Tujuan tautan/tombol "lihat semua". */
  href?: string;
  /**
   * Judul baris (mis. "Drama Action"). Ada judul = baris kategori biasa:
   * judul di kiri + tautan kecil di kanan. Tanpa judul = baris UNGGULAN di
   * kepala halaman, yang pakai tombol besar di tengah supaya menonjol.
   */
  title?: string;
  /**
   * Lebar satu kartu. Default `ROW_CARD_CLASS` = ukuran baris unggulan, jadi
   * pemanggil lama (halaman depan `/`) tidak berubah sama sekali.
   *
   * Ada supaya baris KATEGORI /beranda bisa memakai poster yang lebih kecil
   * (`ROW_KATEGORI_CARD_CLASS`) tanpa perlu komponen baris kedua — logika
   * geser, panah, dan kartunya tetap satu, jadi tak ada yang perlu diperbaiki
   * dua kali.
   */
  cardClass?: string;
  /**
   * false = jangan gambar tombol besar "Lihat semua film unggulan" di bawah
   * baris. Dipakai deret tab halaman depan (TabKatalogTampilan) yang sudah
   * punya tombol "Semua" sendiri di kepala bagian — dua tombol dengan maksud
   * sama di satu bagian membuat penonton ragu yang mana yang benar.
   * Default `true` supaya pemanggil lama tidak berubah sama sekali.
   */
  tombolBawah?: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  // Satu daftar untuk digambar. `items` menang kalau diisi; kalau tidak,
  // `dramas` dibungkus di sini supaya pemanggil lama tak perlu tahu apa-apa
  // soal bentuk campuran.
  const kartu: KartuKatalog[] =
    items ?? dramas.map((d) => ({ jenis: "drama", drama: d }));

  if (kartu.length === 0) return null;

  const geser = (arah: -1 | 1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: arah * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section
      aria-label={title ?? "Film unggulan"}
      className="group/unggulan relative border-b border-zinc-900 bg-black py-4"
    >
      <div className="shell-wide relative mx-auto px-4 md:px-6">
        {title && (
          <div className="mb-2 flex items-end justify-between gap-3">
            <h2 className="text-base font-bold text-white md:text-lg">
              {title}
            </h2>
            <Link
              href={href}
              className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-amber-400 hover:underline"
            >
              Lihat semua
            </Link>
          </div>
        )}
        {/* Panah geser. Sengaja hanya di layar lebar: di HP menggeser dengan
            jari sudah lebih enak daripada menekan tombol kecil. */}
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={() => geser(-1)}
          aria-label="Geser ke kiri"
          className="absolute left-1 top-[45%] z-20 hidden size-9 -translate-y-1/2 rounded-full border border-white/25 bg-black/80 text-white opacity-0 shadow-lg transition-opacity hover:bg-black md:flex md:group-hover/unggulan:opacity-100"
        >
          <ChevronLeft className="size-5" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={() => geser(1)}
          aria-label="Geser ke kanan"
          className="absolute right-1 top-[45%] z-20 hidden size-9 -translate-y-1/2 rounded-full border border-white/25 bg-rose-600 text-white opacity-0 shadow-lg transition-opacity hover:bg-rose-500 md:flex md:group-hover/unggulan:opacity-100"
        >
          <ChevronRight className="size-5" />
        </Button>

        <div
          ref={scroller}
          className="no-scrollbar flex gap-2 overflow-x-auto scroll-smooth md:gap-2.5"
        >
          {kartu.map((k) =>
            // Lebar dikunci di sini (bukan di kartunya) supaya kartunya tetap
            // kartu yang SAMA dengan yang dipakai grid di bawah — lencana, hover,
            // dan cuplikannya tidak perlu dibuat versi kedua. Angkanya sendiri
            // ada di ./shell: ROW_CARD_CLASS (bawaan, sejajar lebar kolom grid)
            // atau ROW_KATEGORI_CARD_CLASS kalau pemanggil meminta yang kecil.
            //
            // `cardHrefPrefix` sengaja TIDAK berlaku untuk kartu video: ia ada
            // untuk halaman Shorts yang melempar ke /feed/<id drama>, dan video
            // tidak punya halaman feed. Alamatnya selalu halaman tonton miliknya
            // sendiri (lib/tonton.ts).
            k.jenis === "drama" ? (
              <div key={`d-${k.drama.id}`} className={cardClass}>
                <CatalogCard
                  drama={k.drama}
                  href={
                    cardHrefPrefix ? `${cardHrefPrefix}/${k.drama.id}` : undefined
                  }
                />
              </div>
            ) : (
              <div key={`v-${k.video.id}`} className={cardClass}>
                <KartuVideo video={k.video} />
              </div>
            ),
          )}
        </div>

        {!title && tombolBawah && (
          <div className="mt-4 flex justify-center">
            <Button
              asChild
              className="h-10 rounded-sm bg-gradient-to-r from-fuchsia-600 to-rose-600 px-6 text-xs font-bold uppercase tracking-wide text-white shadow-lg hover:from-fuchsia-500 hover:to-rose-500"
            >
              <Link href={href}>Lihat semua film unggulan</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
