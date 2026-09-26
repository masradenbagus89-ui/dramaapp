import type { Metadata } from "next";
import { Suspense } from "react";
import { getAllDramasCachedSafe } from "@/lib/dramas";
import { TAB_BAWAAN } from "@/lib/tab-katalog";
import { getPlaylyVideosGabunganCached } from "@/lib/playly-gabungan";
import { featuredHeroSlides } from "@/lib/hero-teaser";
import { FEATURED_ROW_COUNT } from "@/lib/beranda-catalog";
import CatalogBrowser from "../components/beranda/CatalogBrowser";
import FeaturedRow from "../components/beranda/FeaturedRow";
import PersonalRows from "../components/beranda/PersonalRows";
import TabKatalog from "../components/beranda/TabKatalog";
import TabKatalogTampilan from "../components/beranda/TabKatalogTampilan";

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
  // Sejak 2026-09-18 sumbernya GABUNGAN katalog + webhook, bukan katalog saja —
  // tanpa itu video yang masuk lewat webhook tampil di /playly tapi tidak di
  // sini, dan penonton mengira videonya hilang.
  //
  // WAJIB varian Cached. Aman terhadap revalidate=60 di atas hanya selama
  // SELURUH pembacaannya ber-cache: satu saja pembacaan `no-store` membuat
  // halaman ini dibangun ulang untuk tiap pengunjung dan ikut mati saat Supabase
  // tak menjawab (lib/supabase.ts:204). Buktinya bukan baris ini, melainkan
  // kolom Static/Dynamic di keluaran `npm run build`.
  const { videos: playlyVideos } = await getPlaylyVideosGabunganCached();

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
        /* Deret tab katalog + tombol FILTER — bentuk situs katalog pembanding
           yang diminta owner 2026-09-26. Komponennya SAMA dengan yang dipakai
           halaman depan `/`, bukan salinan kedua.

           `hanyaMenu` + `basePath="/katalog"` (owner 2026-09-26): di sini
           baris tab berfungsi sebagai MENU — tiap tab MEMBUKA HALAMAN sendiri
           yang isinya daftar itu saja. Isinya sengaja TIDAK digambar di sini;
           kalau digambar, daftar yang sama muncul dua kali dalam satu halaman
           (persis keluhan "ada 2 rekomendasi").

           Jangan kembalikan basePath ke `/`: `RedirectIfAuthed` memantulkan
           penonton yang sudah login dari sana, dan tabnya terlihat mati.

           <Suspense> WAJIB: isinya membaca `?tab=` lewat `useSearchParams()`,
           dan tanpa pembungkus ini `next build` GAGAL. Isi fallback-nya sengaja
           bentuk yang SAMA (tab bawaan) supaya halaman tidak melompat saat
           bagian browsernya menyusul. */
        tabSlot={
          <Suspense
            fallback={
              <TabKatalogTampilan
                dramas={dramas}
                tab={TAB_BAWAAN}
                semua={false}
                basePath="/katalog"
                hanyaMenu
              />
            }
          >
            <TabKatalog dramas={dramas} basePath="/katalog" hanyaMenu />
          </Suspense>
        }
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
