import Link from "next/link";
import { Play } from "lucide-react";
import type { Drama } from "@/lib/types";
import type { KartuKatalog } from "@/lib/beranda-video";
import BarisGeser from "./BarisGeser";
import { ROW_CARD_CLASS, TOMBOL_UTAMA } from "./shell";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Baris TONTONAN UNGGULAN di kepala beranda — deretan poster yang bisa digeser
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
/**
 * Tujuan tombol besar di bawah baris unggulan ("NONTON BARENG").
 *
 * SATU nilai, bukan ditulis di tiap halaman: `/` dan `/beranda` sama-sama
 * menggambar tombol ini, dan sampai 2026-11-27 keduanya memakai `/discover`
 * dari dua tempat berbeda. Dua tulisan terpisah = dua tujuan yang bisa
 * menyimpang tanpa ada yang tahu, persis jenis kerusakan yang sudah terjadi
 * pada nama tab (lihat `judulDariLabel` di lib/tab-katalog.ts).
 *
 * `/film`, BUKAN `/discover`: baris poster DI ATAS tombol ini berisi film, dan
 * seksi "Nonton Bareng" di bawahnya juga menuju `/film`. Mengirim penonton ke
 * daftar drama sesudah ia melihat deretan film = janji yang tidak ditepati.
 */
export const HREF_TOMBOL_UTAMA = "/film";

export default function FeaturedRow({
  dramas = [],
  items,
  href = HREF_TOMBOL_UTAMA,
  title,
  cardHrefPrefix,
  cardClass = ROW_CARD_CLASS,
  tombolBawah = true,
  panahSelalu = false,
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
   * false = jangan gambar tombol besar "Temukan tontonan favoritmu" di bawah
   * baris. Dipakai deret tab halaman depan (TabKatalogTampilan) yang sudah
   * punya tombolnya sendiri di kepala bagian — dua tombol dengan maksud sama
   * di satu bagian membuat penonton ragu yang mana yang benar.
   * Default `true` supaya pemanggil lama tidak berubah sama sekali.
   */
  tombolBawah?: boolean;
  /** true = panah geser selalu kelihatan, bukan hanya saat kursor lewat. */
  panahSelalu?: boolean;
}) {
  // Satu daftar untuk digambar. `items` menang kalau diisi; kalau tidak,
  // `dramas` dibungkus di sini supaya pemanggil lama tak perlu tahu apa-apa
  // soal bentuk campuran.
  const kartu: KartuKatalog[] =
    items ?? dramas.map((d) => ({ jenis: "drama", drama: d }));

  if (kartu.length === 0) return null;

  return (
    <section
      aria-label={title ?? "Tontonan unggulan"}
      className="relative border-b border-gelap-800 py-4 terang:border-zinc-200 terang:bg-zinc-100"
    >
      <div className="shell-wide relative mx-auto px-4 md:px-6">
        {title && (
          <div className="mb-2 flex items-end justify-between gap-3">
            <h2 className="text-base font-bold text-white terang:text-zinc-900 md:text-lg">
              {title}
            </h2>
            <Link
              href={href}
              className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-emas-400 terang:text-emas-700 hover:underline"
            >
              Lihat semua
            </Link>
          </div>
        )}

        <BarisGeser
          kartu={kartu}
          cardClass={cardClass}
          cardHrefPrefix={cardHrefPrefix}
          panahSelalu={panahSelalu}
        />

        {/* ⚠️ TULISANNYA "NONTON BARENG" sejak 2026-11-27 (owner: *"menu
            temukan tontonan favoritmu jadikan menu nonton bareng"*), dan
            tujuannya ikut berpindah ke `/film`.

            Keduanya berubah BERSAMAAN dengan sengaja. "Nonton Bareng" adalah
            nama seksi tepat di bawah tombol ini (label tab `terbaru`, diganti
            owner 2026-11-24), dan tombol SEMUA seksi itu menuju `/film` —
            sebab isinya film, bukan drama (lihat `SEKSI_BERISI_FILM` di
            lib/tab-katalog.ts). Kalau tombol ini tetap menuju `/discover`
            yang berisi DRAMA, dua tombol bernama sama di satu layar akan
            mendarat di daftar yang isinya lain sama sekali.

            🪤 JANGAN membacanya sebagai pintu fitur Nonton Bareng (room
            tonton bersama). Fitur itu dimulai dari dalam pemutar film, dan
            owner sudah diberi tahu bedanya sebelum memilih nama ini.

            Riwayat yang digantikan: tulisan lama "Temukan tontonan favoritmu"
            (owner 2026-10-31, dipertahankan 2026-11-17) sengaja memakai kata
            "tontonan" karena tujuannya saat itu katalog campuran. Alasan itu
            gugur begitu tujuannya jadi `/film`. */}
        {!title && tombolBawah && (
          <div className="mt-4 flex justify-center">
            <Button
              asChild
              className={cn(
                TOMBOL_UTAMA,
                "h-11 rounded-full px-7 text-xs font-bold uppercase tracking-wide shadow-lg",
              )}
            >
              {/* Ikon ▶ mengikuti mockup owner (2026-11-24). `aria-hidden`:
                  ia hiasan murni — tulisan tombolnya sudah menjelaskan
                  tujuannya, jadi pembaca layar tidak perlu menyebut "ikon". */}
              <Link href={href} className="inline-flex items-center gap-2">
                <Play className="size-4 shrink-0 fill-current" aria-hidden="true" />
                Nonton Bareng
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
