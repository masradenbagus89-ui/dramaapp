import Link from "next/link";
import type { Drama } from "@/lib/types";
import type { KartuKatalog } from "@/lib/beranda-video";
import BarisGeser from "./BarisGeser";
import { ROW_CARD_CLASS } from "./shell";
import { Button } from "@/components/ui/button";

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
 *
 * Sejak 2026-10-10 mekanisme geser + panahnya TIDAK lagi tinggal di sini
 * melainkan di `BarisGeser` — komponen yang sama dipakai seksi halaman depan.
 * Yang tersisa di berkas ini murni pembungkusnya: judul, tautan "Lihat semua",
 * dan tombol besar di bawah.
 *
 * "use client" ikut DILEPAS pada hari yang sama: setelah hook `useRef` pindah,
 * berkas ini tidak punya satu pun hook maupun penangan klik, jadi memaksanya
 * dirakit di browser cuma menambah JavaScript yang tidak dipakai.
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
  /** Awalan alamat tiap kartu drama; diteruskan apa adanya ke `BarisGeser`. */
  cardHrefPrefix?: string;
  /** Tujuan tautan/tombol "lihat semua". */
  href?: string;
  /**
   * Judul baris (mis. "Drama Action"). Ada judul = baris kategori biasa:
   * judul di kiri + tautan kecil di kanan. Tanpa judul = baris UNGGULAN di
   * kepala halaman, yang pakai tombol besar di tengah supaya menonjol.
   */
  title?: string;
  /** Lebar satu kartu; diteruskan apa adanya ke `BarisGeser`. */
  cardClass?: string;
  /**
   * false = jangan gambar tombol besar "Lihat semua film unggulan" di bawah
   * baris. Dipakai deret tab halaman depan (TabKatalogTampilan) yang sudah
   * punya tombolnya sendiri di kepala bagian — dua tombol dengan maksud sama
   * di satu bagian membuat penonton ragu yang mana yang benar.
   * Default `true` supaya pemanggil lama tidak berubah sama sekali.
   */
  tombolBawah?: boolean;
}) {
  // Satu daftar untuk digambar. `items` menang kalau diisi; kalau tidak,
  // `dramas` dibungkus di sini supaya pemanggil lama tak perlu tahu apa-apa
  // soal bentuk campuran.
  const kartu: KartuKatalog[] =
    items ?? dramas.map((d) => ({ jenis: "drama", drama: d }));

  if (kartu.length === 0) return null;

  return (
    <section
      aria-label={title ?? "Film unggulan"}
      className="relative border-b border-zinc-900 bg-black py-4 terang:border-zinc-200 terang:bg-zinc-100"
    >
      <div className="shell-wide relative mx-auto px-4 md:px-6">
        {title && (
          <div className="mb-2 flex items-end justify-between gap-3">
            <h2 className="text-base font-bold text-white terang:text-zinc-900 md:text-lg">
              {title}
            </h2>
            <Link
              href={href}
              className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-amber-400 terang:text-amber-700 hover:underline"
            >
              Lihat semua
            </Link>
          </div>
        )}

        <BarisGeser
          kartu={kartu}
          cardClass={cardClass}
          cardHrefPrefix={cardHrefPrefix}
        />

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
