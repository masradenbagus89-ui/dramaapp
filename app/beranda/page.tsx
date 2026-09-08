import type { Metadata } from "next";
import { getAllDramasCachedSafe } from "@/lib/dramas";
import { featuredHeroSlides } from "@/lib/hero-teaser";
import { FEATURED_ROW_COUNT } from "@/lib/beranda-catalog";
import AdBanner from "../components/AdBanner";
import CatalogBrowser from "../components/beranda/CatalogBrowser";
import FeaturedRow from "../components/beranda/FeaturedRow";
import PersonalRows from "../components/beranda/PersonalRows";

// Disimpan & dipakai ulang, disegarkan tiap 60 detik (menggantikan force-dynamic
// yang membangun ulang halaman untuk tiap pengunjung).
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Beranda — Nonton Drama China Terbaru",
  description:
    "Katalog lengkap drama China DramaKu: cari judul, saring per genre, dan telusuri halaman demi halaman. Lanjutkan tontonan terakhir kamu — semuanya gratis.",
  alternates: { canonical: "/beranda" },
};

export default async function BerandaPage() {
  const dramas = await getAllDramasCachedSafe();
  const slides = featuredHeroSlides(dramas, FEATURED_ROW_COUNT);

  if (slides.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center text-sm text-zinc-500">
        Belum ada drama. Tambahkan dari panel admin.
      </div>
    );
  }

  return (
    <div className="pb-10">
      {/*
        Urutan halaman (permintaan owner 2026-09-07): bar cari + strip genre +
        grid poster HARUS terlihat di layar pertama.

        Banner hero yang berganti sendiri DIBUANG dari halaman ini atas permintaan
        owner ("jangan berjalan lagi") — diganti FeaturedRow: deretan poster yang
        hanya bergerak kalau digeser penonton. HomeHero sendiri tidak dihapus,
        masih dipakai /discover.

        Syarat yang ikut berubah: TopNav tidak boleh memakai posisi `fixed` di
        halaman ini, kalau tidak bar cari tertutup navbar. Diatur di
        app/components/TopNav.tsx (`overlayHero`).
      */}
      <CatalogBrowser
        dramas={dramas}
        heroSlot={<FeaturedRow dramas={slides} />}
        beforeGridSlot={
          <div className="space-y-8 pt-6">
            {/* Slot iklan 1 dari 3. Jumlahnya dipertahankan persis seperti
                susunan beranda sebelumnya (permintaan owner 2026-09-03) —
                ketiganya sengaja berdiri sendiri & berjauhan, tidak digandeng
                ke daftar mana pun yang bisa kosong, supaya slot pendapatan tak
                ikut menghilang. */}
            <AdBanner />

            {/* Baris personal (Lanjut Menonton dsb). Menghilang sendiri untuk
                penonton yang belum punya riwayat/favorit — itu sebabnya slot
                iklan di atas tidak ditempel ke sini.

                -mx-4 md:mx-0 membatalkan padding mobile milik pembungkus:
                ContentRow sudah membawa `px-4` sendiri, tanpa ini jaraknya
                dobel di HP. */}
            <div className="-mx-4 md:mx-0">
              <PersonalRows dramas={dramas} />
            </div>
          </div>
        }
        adSlot={<AdBanner />}
      />

      {/* Slot iklan 3 — penutup halaman, sesudah nomor halaman. */}
      <div className="shell-wide mx-auto px-4 pt-8 md:px-6">
        <AdBanner />
      </div>
    </div>
  );
}
