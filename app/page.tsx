import type { Metadata } from "next";
import { getAllDramasCachedSafe } from "@/lib/dramas";
import { getPlaylyVideosGabunganCached } from "@/lib/playly-gabungan";
import { featuredHeroSlides } from "@/lib/hero-teaser";
import RedirectIfAuthed from "@/app/components/RedirectIfAuthed";
import BadanKatalog from "@/app/components/beranda/BadanKatalog";
import PublicTopBars from "@/app/components/beranda/PublicTopBars";
import { rakitIndeksSaran } from "@/lib/saran-cari";
import LanjutMenonton from "@/app/components/beranda/LanjutMenonton";
import { TAB_GRID_ITEMS } from "@/lib/tab-katalog";
import { MAKS_SERIES_PLAYLY_DI_SEKSI, pisahFilmSeries } from "@/lib/jenis-video";
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
  /**
   * Film dan serial DIPISAH DULU, baru masing-masing dipotong (owner
   * 2026-11-05: drama berseri yang di-upload rekan mendarat di "Film Terbaru").
   *
   * ⚠️ Urutannya tidak boleh dibalik. Kalau daftarnya dipotong 20 dulu lalu
   * dipisah di komponen, tiap serial yang kebetulan ada di 20 teratas akan
   * MENGURANGI isi seksi Film (20 kartu jadi 19) — dan karena video terbaru
   * selalu di depan, justru upload terbaru yang paling sering memicunya.
   * Kerusakannya senyap: tak ada error, cuma barisnya menyusut sendiri.
   */
  const { film, series } = pisahFilmSeries(videos);
  /**
   * Sudah terurut TAHUN RILIS (terbaru lebih dulu) sejak dirakit di
   * lib/playly-gabungan.ts — owner 2026-11-14: "seragam ikut tahun rilis".
   * Halaman ini SENGAJA tidak mengurut lagi: aturan yang disalin ke tiap
   * halaman cepat atau lambat menyimpang, dan menyimpangnya tak memunculkan
   * error — cuma urutan yang berbeda antar halaman.
   */
  const filmTerbaru = film.slice(0, TAB_GRID_ITEMS);
  // Jatah serial Playly di seksi "Series Terbaru" sengaja dibatasi supaya satu
  // drama berepisode banyak tidak mendorong keluar drama katalog — alasannya di
  // lib/jenis-video.ts `MAKS_SERIES_PLAYLY_DI_SEKSI`.
  const seriesTerbaru = series.slice(0, MAKS_SERIES_PLAYLY_DI_SEKSI);
  const heroSlides = featuredHeroSlides(dramas, FEATURED_ROW_COUNT);
  // Genre yang BENAR-BENAR berisi, untuk kolom "Genre Populer" di kaki situs.
  // Dihitung di server dari katalog yang sudah di tangan — nol pembacaan
  // tambahan, dan yang terkirim ke browser cuma daftar nama.
  const genres = availableGenres(dramas);
  // Isi menu dihitung DI SERVER: hasilnya cuma label + alamat, jauh lebih
  // ringan dikirim ke browser daripada seluruh katalog. Isi strip kuning tidak
  // ikut dihitung — sejak 2026-09-21 daftarnya TETAP, ditentukan owner.
  // Film ikut dioper supaya menu Negara dihitung dari katalog LENGKAP —
  // lihat alasannya di `opsiNegaraGabungan` (lib/film-jelajah.ts).
  const menus = buildNavMenus(dramas, videos);

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
      <PublicTopBars menus={menus} indeksSaran={rakitIndeksSaran(dramas, videos)} />

      {/* Judul halaman untuk mesin pencari. SENGAJA tak terlihat (sr-only):
          hero di bawah meniru situs katalog pembanding yang tak punya judul
          teks, tapi halaman tetap WAJIB punya satu <h1> supaya Google tahu
          isi situs ini apa. Teksnya tetap ada di HTML & dibaca pembaca layar
          — judul jujur dari halaman yang sama, bukan teks untuk mengelabui.
          Sampai 2026-10-09 peran ini dipegang strip ajakan daftar yang kini
          dibuang bersama tombol Masuk/Daftar-nya. */}
      <h1 className="sr-only">Nonton Drama China Sub Indo Gratis — DramaKu</h1>

      {/* Badan halaman — hero, bar lanjut-menonton, seksi tab, kaki situs.
          DIPAKAI BERSAMA dengan /beranda sejak 2026-10-28 (owner: "tampilan
          beranda sama dengan landing page"). Susunannya sengaja TIDAK ditulis
          lagi di sini: dua salinan pasti melenceng, dan itu yang sudah terjadi
          sampai hari ini. Lihat app/components/beranda/BadanKatalog.tsx. */}
      <BadanKatalog
        dramas={dramas}
        heroSlides={heroSlides}
        filmTerbaru={filmTerbaru}
        seriesTerbaru={seriesTerbaru}
        genres={genres}
        heroHref="/discover"
        /* Bar "Lanjutkan Menonton" = pintu akun TUNGGAL halaman ini (owner
           2026-10-09): tertutup dulu, terbuka saat diklik. Di /beranda slot yang
           sama diisi baris riwayat, karena di sana penontonnya sudah login. */
        slotAtas={<LanjutMenonton />}
      />
    </div>
  );
}
