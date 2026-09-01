import type { Metadata } from "next";
import { getAllDramasCachedSafe } from "@/lib/dramas";
import { featuredHeroSlides } from "@/lib/hero-teaser";
import BerandaRows from "../components/BerandaRows";
import AdBanner from "../components/AdBanner";
import HomeHero from "../components/HomeHero";

// Disimpan & dipakai ulang, disegarkan tiap 60 detik (menggantikan force-dynamic
// yang membangun ulang halaman untuk tiap pengunjung).
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Beranda — Drama China Terbaru",
  description:
    "Lihat drama China terbaru dan lanjutkan tontonan kamu di DramaKu. Deretan drama pilihan, trending, dan rekomendasi sesuai selera — semuanya gratis.",
  alternates: { canonical: "/beranda" },
};

export default async function BerandaPage() {
  const dramas = await getAllDramasCachedSafe();
  const slides = featuredHeroSlides(dramas);

  if (slides.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center text-sm text-zinc-500">
        Belum ada drama. Tambahkan dari panel admin.
      </div>
    );
  }

  return (
    <div className="pb-10">
      {/* Tanpa prop alamat video: teaser hero memakai /api/teaser (same-origin),
          yang membaca alamat terbaru di sisi server. Jadi ISR 60 detik halaman
          ini tetap utuh. */}
      <HomeHero dramas={slides} />

      <div className="mx-auto max-w-7xl px-4 pt-6 md:px-6">
        <AdBanner />
      </div>

      <div className="mx-auto max-w-7xl md:px-6">
        <BerandaRows dramas={dramas} />
      </div>
    </div>
  );
}
