import type { Metadata } from "next";
import { Suspense } from "react";
import { getAllDramasCachedSafe } from "@/lib/dramas";
import { getPlaylyVideosGabunganCached } from "@/lib/playly-gabungan";
import { featuredHeroSlides } from "@/lib/hero-teaser";
import RedirectIfAuthed from "@/app/components/RedirectIfAuthed";
import FeaturedRow from "@/app/components/beranda/FeaturedRow";
import PublicTopBars from "@/app/components/beranda/PublicTopBars";
import LanjutMenonton from "@/app/components/beranda/LanjutMenonton";
import FooterSitus from "@/app/components/beranda/FooterSitus";
import TabKatalog from "@/app/components/beranda/TabKatalog";
import TabKatalogTampilan from "@/app/components/beranda/TabKatalogTampilan";
import { TAB_BAWAAN, TAB_GRID_ITEMS } from "@/lib/tab-katalog";
import { availableGenres, FEATURED_ROW_COUNT } from "@/lib/beranda-catalog";
import { buildNavMenus } from "@/lib/nav-katalog";

// Disimpan & dipakai ulang, disegarkan tiap 60 detik (menggantikan force-dynamic
// yang membangun ulang halaman untuk tiap pengunjung).
export const revalidate = 60;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function LandingPage() {
  const dramas = await getAllDramasCachedSafe();
  /**
   * Film dari penyedia video luar, untuk seksi "Film Terbaru" (owner
   * 2026-10-09). `...Cached` + "tidak pernah melempar" adalah SYARAT di
   * halaman ini: ini halaman paling ramai, dan panggilan luar yang bisa gagal
   * atau lambat di sini berarti seluruh halaman depan ikut gagal/lambat.
   * Sumber mati = daftar kosong = seksinya tidak digambar, sisa halaman utuh.
   *
   * Dipotong di SERVER sebelum dioper ke komponen browser: tanpa potongan ini
   * seluruh katalog film (ratusan judul) ikut terkirim ke tiap pengunjung
   * padahal yang tergambar cuma sebagian kecil.
   */
  const { videos } = await getPlaylyVideosGabunganCached();
  const filmTerbaru = videos.slice(0, TAB_GRID_ITEMS);
  const heroSlides = featuredHeroSlides(dramas, FEATURED_ROW_COUNT);
  // Genre yang BENAR-BENAR berisi, untuk kolom "Genre Populer" di kaki situs.
  // Dihitung di server dari katalog yang sudah di tangan — nol pembacaan
  // tambahan, dan yang terkirim ke browser cuma daftar nama.
  const genres = availableGenres(dramas);
  // Isi menu dihitung DI SERVER: hasilnya cuma label + alamat, jauh lebih
  // ringan dikirim ke browser daripada seluruh katalog. Isi strip kuning tidak
  // ikut dihitung — sejak 2026-09-21 daftarnya TETAP, ditentukan owner.
  const menus = buildNavMenus(dramas);

  return (
    <div className="min-h-screen bg-black">
      <RedirectIfAuthed />
      {/* ===== Kepala situs — elemen PALING ATAS halaman ini.
             Baris header hitam terpisah (logo + Masuk/Daftar) DIHAPUS
             2026-09-10: isinya melebur ke bar merah supaya logo, kotak cari,
             menu katalog, dan tombol akun jatuh di satu baris — bentuk yang
             diminta owner dari situs katalog pembanding.

             Struktur ini melanjutkan permintaan owner 2026-09-08: pengunjung
             yang belum login pun langsung melihat pencarian, genre, dan poster,
             bukan blok sambutan sehalaman penuh. Cari, genre & menu melempar ke
             /discover, yang memang publik. ===== */}
      <PublicTopBars menus={menus} />

      {/* Judul halaman untuk mesin pencari. SENGAJA tak terlihat (sr-only):
          hero di bawah meniru situs katalog pembanding yang tak punya judul
          teks, tapi halaman tetap WAJIB punya satu <h1> supaya Google tahu
          isi situs ini apa. Teksnya tetap ada di HTML & dibaca pembaca layar
          — judul jujur dari halaman yang sama, bukan teks untuk mengelabui.
          Sampai 2026-10-09 peran ini dipegang strip ajakan daftar yang kini
          dibuang bersama tombol Masuk/Daftar-nya. */}
      <h1 className="sr-only">Nonton Drama China Sub Indo Gratis — DramaKu</h1>

      {/* ===== HERO — SATU baris poster unggulan berlatar HITAM (owner
             2026-10-09, menyamakan dengan situs katalog pembanding).

             Dipindah ke ATAS dari posisi lamanya (dulu di bawah deret tab).
             Di tempat lama ia menghasilkan DUA baris poster mirip berturut-
             turut — baris isi tab, lalu baris unggulan — dan owner membacanya
             sebagai daftar yang sama tercetak dua kali.

             Latarnya tetap hitam karena berada DI LUAR pembungkus
             tema-terang di bawah: gelap di hero, terang di badan. ===== */}
      <FeaturedRow dramas={heroSlides} href="/discover" />

      <LanjutMenonton />

      {/* ===== BADAN TERANG — dari sini ke bawah berlatar putih-abu.
             Pembungkus inilah SATU-SATUNYA saklar tema terang (lihat
             @custom-variant terang di app/globals.css). ===== */}
      <div className="tema-terang bg-zinc-100">

        {/* ===== DERET TAB KATALOG (owner 2026-09-22, meniru situs katalog):
               TERBARU · SERIES UNGGULAN · SERIES UPDATE · TERPOPULER ·
               REKOMENDASI · <tahun>, plus tombol FILTER di ujung kanan.

               Dibungkus <Suspense> karena isinya membaca alamat lewat
               `useSearchParams()` — tanpa pembungkus ini `next build` GAGAL.
               Katalog dioper sebagai prop (bukan dibaca ulang di browser) supaya
               halaman ini TETAP statis: menaruh `searchParams` di halamannya akan
               membuat Next membangun ulang seluruh halaman untuk tiap pengunjung
               dan `revalidate = 60` di atas jadi percuma. ===== */}
        <Suspense
          fallback={
            <TabKatalogTampilan
              dramas={dramas}
              tab={TAB_BAWAAN}
              semua={false}
              seksiLengkap
              videos={filmTerbaru}
            />
          }
        >
          <TabKatalog dramas={dramas} seksiLengkap videos={filmTerbaru} />
        </Suspense>

        {/* Strip ajakan daftar (judul + tombol Daftar Gratis/Masuk) DIBUANG
            2026-10-09 atas permintaan owner: pintu akun kini TUNGGAL, di bar
            "Lanjutkan Menonton" yang baru terbuka saat diklik. Peran <h1>-nya
            sudah dipindah ke atas (sr-only) supaya SEO tidak ikut hilang. */}

        {/* Baris kategori genre ("Drama Terbaru", "Drama Action", ...) DILEPAS
            dari halaman depan 2026-10-09: isinya kini tumpang tindih dengan
            seksi tab di atas, dan owner meminta susunan yang sama dengan situs
            katalog pembanding — di sana bagian sesudah hero adalah seksi per
            TAB, bukan per genre.

            `homeCatalogRows()` TIDAK dihapus dari lib: /beranda (lewat
            lib/beranda-video.ts) dan /shorts masih memakainya, dan itu dijaga
            tests/beranda-video-render.test.ts. Genre tetap bisa dicapai dari
            strip kuning, menu atas, dan tombol FILTER. */}

        {/* Blok penutup "Siap memulai marathon drama?" DIBUANG 2026-10-09:
            ajakan mendaftar yang ketiga di satu halaman. Lihat LanjutMenonton. */}
      </div>
      {/* ^ tutup BADAN TERANG — footer di bawah sengaja tetap gelap,
          menutup halaman dengan warna yang sama seperti hero di atas. */}

      {/* ===== KAKI SITUS — empat kolom (owner 2026-10-10, mencontoh situs
             katalog pembanding): tentang, jelajahi, genre populer, disclaimer.

             Menggantikan kaki lama satu baris "© 2026 DramaKu · Prototype".
             Kata "Prototype" ikut hilang — situs ini sudah tayang dan dipakai
             penonton sungguhan, jadi label itu justru menyesatkan. ===== */}
      <FooterSitus genres={genres} />
    </div>
  );
}
