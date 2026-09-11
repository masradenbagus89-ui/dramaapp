import type { Metadata } from "next";
import { getAllDramasCachedSafe } from "@/lib/dramas";
import { homeCatalogRows } from "@/lib/beranda-catalog";
import FeaturedRow from "@/app/components/beranda/FeaturedRow";
import { SHELL } from "@/app/components/beranda/shell";
import { Clapperboard } from "lucide-react";

// Disimpan & dipakai ulang, disegarkan tiap 60 detik (menggantikan force-dynamic
// yang membangun ulang halaman untuk tiap pengunjung).
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Shorts — Cuplikan Drama China Pendek",
  description:
    "Kumpulan cuplikan drama China pendek di DramaKu. Tonton sekilas sebelum lanjut ke episode penuh — gratis dan tanpa perlu daftar.",
  alternates: { canonical: "/shorts" },
};

export default async function ShortsPage() {
  const dramas = await getAllDramasCachedSafe();

  /*
   * Susunan BARIS POSTER PADAT (owner 2026-09-09), menggantikan 6 kartu besar
   * 2 kolom yang lama. Barisnya memakai `homeCatalogRows` — sumber yang SAMA
   * dengan halaman depan, jadi kalau urutannya diperbaiki di satu tempat,
   * semua halaman ikut.
   *
   * Sekalian membetulkan judul yang dulu berbohong: versi lama memakai
   * `.slice(0, 6)` — itu 6 drama PERTAMA di katalog, bukan yang paling banyak
   * ditonton, padahal judulnya "Shorts Trending". Sekarang baris "Paling
   * Banyak Ditonton" benar-benar diurutkan dari jumlah penonton.
   */
  const rows = homeCatalogRows(dramas);

  return (
    <div className="pb-10">
      <div className={`${SHELL} pt-6 pb-3`}>
        <h1 className="text-xl font-bold text-white md:text-2xl">
          Shorts Trending
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Cuplikan singkat drama paling populer minggu ini. Klik poster untuk
          langsung memutar cuplikannya.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <Clapperboard className="size-8 text-zinc-700" />
          <p className="text-sm text-zinc-500">Belum ada shorts trending.</p>
        </div>
      ) : (
        rows.map((row) => (
          <FeaturedRow
            key={row.key}
            title={row.title}
            dramas={row.items}
            href={row.href}
            /* Kartu menuju PEMUTAR CUPLIKAN, bukan halaman detail — perilaku
               yang sama dengan versi lama halaman ini. Tanpa prop ini kartunya
               akan diam-diam berpindah tujuan ke /drama/<id>. */
            cardHrefPrefix="/feed"
          />
        ))
      )}
    </div>
  );
}
