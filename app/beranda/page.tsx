import type { Metadata } from "next";
import { getAllDramasCachedSafe } from "@/lib/dramas";
import { getPlaylyVideosPublik } from "@/lib/playly-publik";
import { featuredHeroSlides } from "@/lib/hero-teaser";
import { FEATURED_ROW_COUNT } from "@/lib/beranda-catalog";
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

  // Video Playly untuk bagian hasil pencarian di bawah grid (owner 2026-09-12).
  // Judul seperti "Beyond The Last Signal" ada di sini, BUKAN di katalog
  // Supabase — tanpa ini kotak cari membalas "tidak ada yang cocok" untuk video
  // yang jelas-jelas tayang di situs.
  //
  // Aman terhadap revalidate=60 di atas: seluruh pembacaannya ber-cache 5 menit
  // dan tidak pernah melempar error (lib/playly-publik.ts), jadi halaman ini
  // tidak berubah jadi dibangun ulang untuk tiap pengunjung.
  const { videos: playlyVideos } = await getPlaylyVideosPublik();

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
        hanya bergerak kalau digeser penonton. Komponen hero lama (HomeHero) sudah
        DIHAPUS 2026-09-09 setelah /discover ikut lepas darinya.

        Syarat yang ikut berubah: TopNav tidak boleh memakai posisi `fixed` di
        halaman ini, kalau tidak bar cari tertutup navbar. Diatur di
        app/components/TopNav.tsx (`overlayHero`).

        ⚠️ SLOT IKLAN DI HALAMAN INI SENGAJA DIHAPUS (owner, 2026-09-08): banner
        ungu di antara baris film memutus susunan poster. Ini MEMBATALKAN
        permintaan owner 2026-09-03 yang justru meminta 3 slot melintang — jadi
        JANGAN dikembalikan tanpa perintah baru. Komponen AdBanner sendiri tidak
        dihapus; masih dipakai /drama/[id] dan /profile.
      */}
      <CatalogBrowser
        dramas={dramas}
        playlyVideos={playlyVideos}
        heroSlot={<FeaturedRow dramas={slides} />}
        beforeGridSlot={
          <div className="pt-6">
            {/* Baris personal (Lanjut Menonton dsb). Menghilang sendiri untuk
                penonton yang belum punya riwayat/favorit.

                -mx-4 md:mx-0 membatalkan padding mobile milik pembungkus:
                ContentRow sudah membawa `px-4` sendiri, tanpa ini jaraknya
                dobel di HP. */}
            <div className="-mx-4 md:mx-0">
              <PersonalRows dramas={dramas} />
            </div>
          </div>
        }
      />

    </div>
  );
}
