import { Suspense, type ReactNode } from "react";
import type { Drama } from "@/lib/types";
import type { PlaylyVideoPublik } from "@/lib/playly-publik";
import FeaturedRow from "./FeaturedRow";
import FooterSitus from "./FooterSitus";
import TabKatalog from "./TabKatalog";
import TabKatalogTampilan from "./TabKatalogTampilan";
import { TAB_BAWAAN } from "@/lib/tab-katalog";

/**
 * BADAN BERSAMA halaman katalog utama — dipakai `/` (landing, untuk yang belum
 * login) DAN `/beranda` (sesudah login).
 *
 * KENAPA ADA (owner 2026-10-28: "tampilan beranda sama dengan landing page"):
 * sampai hari ini kedua halaman merakit susunannya SENDIRI-SENDIRI, dan diam-diam
 * jadi berbeda — `/` menggambar isi tiap tab sebagai seksi bertumpuk, sementara
 * `/beranda` memakai deret tab sebagai menu lalu menampilkan baris kategori.
 * Disamakan lewat komponen bersama, BUKAN dengan menyalin susunannya: dua salinan
 * pasti melenceng lagi begitu salah satunya diubah, dan itulah yang sudah terjadi.
 *
 * Yang BOLEH berbeda antar halaman dioper lewat prop — semuanya punya alasan:
 *   - `slotAtas`  : `/` memasang bar "Lanjutkan Menonton" (pintu Masuk/Daftar),
 *                   `/beranda` memasang baris "Lanjut Menonton" dari riwayat.
 *   - `basePath`  : tujuan klik tab. WAJIB beda, lihat peringatan di bawah.
 */
export default function BadanKatalog({
  dramas,
  heroSlides,
  filmTerbaru,
  genres,
  basePath,
  heroHref,
  denganKaki = true,
  slotAtas,
}: {
  dramas: Drama[];
  /** Poster unggulan di baris paling atas (hero). */
  heroSlides: Drama[];
  /** Film dari penyedia luar untuk seksi "Film Terbaru". Kosong = seksi tak digambar. */
  filmTerbaru: PlaylyVideoPublik[];
  /** Daftar genre untuk kaki situs. */
  genres: string[];
  /**
   * Alamat dasar deret tab. Kosong = `/`.
   *
   * ⚠️ `/beranda` WAJIB mengisi `"/beranda"` dan JANGAN dibiarkan menunjuk `/`:
   * `app/components/RedirectIfAuthed.tsx` memantulkan penonton yang sudah login
   * dari `/` kembali ke `/beranda`, sehingga tabnya terlihat MATI — diklik, tak
   * terjadi apa-apa. Peringatan ini dipindahkan ke sini dari
   * `app/beranda/page.tsx` supaya ikut terbaca oleh pemakai komponen berikutnya.
   */
  basePath?: string;
  /** Tujuan tombol "Lihat semua film unggulan". */
  heroHref?: string;
  /**
   * Gambar kaki situs 4 kolom di bawah halaman. Bawaannya `true`.
   *
   * `/beranda` mematikannya atas permintaan owner (2026-10-28): di halaman yang
   * dibuka penonton yang SUDAH login, blok itu cuma memanjangkan halaman —
   * isinya (tentang situs, tautan jelajah, genre, disclaimer) berguna untuk
   * pengunjung baru yang mendarat di landing page, bukan untuk orang yang
   * memang datang untuk menonton.
   */
  denganKaki?: boolean;
  /** Diselipkan antara hero dan badan terang. */
  slotAtas?: ReactNode;
}) {
  return (
    <>
      {/* HERO — SATU baris poster unggulan berlatar HITAM (owner 2026-10-09).
          Latarnya gelap karena berada DI LUAR pembungkus tema-terang di bawah. */}
      <FeaturedRow dramas={heroSlides} href={heroHref} />

      {slotAtas}

      {/* BADAN TERANG — dari sini ke bawah berlatar putih-abu. Pembungkus inilah
          SATU-SATUNYA saklar tema terang (lihat @custom-variant terang di
          app/globals.css). */}
      <div className="tema-terang bg-zinc-100">
        {/* DERET TAB KATALOG (owner 2026-09-22, meniru situs katalog pembanding):
            TERBARU · SERIES UNGGULAN · SERIES UPDATE · TERPOPULER · REKOMENDASI ·
            <tahun>, plus tombol FILTER di ujung kanan. `seksiLengkap` membuat isi
            tiap tab digambar sebagai seksi bertumpuk, bukan sekadar menu.

            <Suspense> WAJIB: isinya membaca alamat lewat `useSearchParams()`, dan
            tanpa pembungkus ini `next build` GAGAL. Katalognya dioper sebagai prop
            (bukan dibaca ulang di browser) supaya halaman pemanggil TETAP statis —
            menaruh `searchParams` di halamannya akan memaksa Next membangun ulang
            seluruh halaman untuk tiap pengunjung dan `revalidate` jadi percuma.

            Isi fallback sengaja berbentuk SAMA (tab bawaan) supaya halaman tidak
            melompat saat bagian yang membaca alamat menyusul. */}
        <Suspense
          fallback={
            <TabKatalogTampilan
              dramas={dramas}
              tab={TAB_BAWAAN}
              semua={false}
              seksiLengkap
              videos={filmTerbaru}
              basePath={basePath}
            />
          }
        >
          <TabKatalog
            dramas={dramas}
            seksiLengkap
            videos={filmTerbaru}
            basePath={basePath}
          />
        </Suspense>
      </div>

      {/* KAKI SITUS — empat kolom (owner 2026-10-10). Sengaja tetap gelap,
          menutup halaman dengan warna yang sama seperti hero di atas.
          Dimatikan di /beranda sejak 2026-10-28 — lihat `denganKaki`. */}
      {denganKaki && <FooterSitus genres={genres} />}
    </>
  );
}
