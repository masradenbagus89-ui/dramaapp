import Link from "next/link";
import { Award, Flame, Sparkles } from "lucide-react";

import { SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";
import { CHIP_BARIS_DIAM, KELAS_CHIP_BARIS } from "./shell";

/**
 * Strip "Layarindo Menawarkan" — tiga pintasan cepat ke katalog, menggantikan
 * panel "Lanjutkan Menonton" di `/beranda` (owner 2026-11-23, dengan gambar
 * acuan: judul di tengah + tiga chip di bawahnya).
 *
 * ⚠️ APA YANG HILANG DARI /beranda, supaya tak ada yang mengira ini kelalaian:
 * panel lama berisi baris "Lanjut Menonton" — satu-satunya pintasan MENERUSKAN
 * episode yang tertinggal di tengah, dari halaman ini. Jalannya TIDAK putus:
 * `/history` tetap bisa dibuka dari menu akun di bar atas
 * (`MenuAkun.tsx` → TUJUAN_AKUN). Yang hilang cuma jalan pintasnya dari
 * beranda. Diperiksa sebelum ditukar, bukan sesudah.
 *
 * Panel lama itu juga sebagian besar KOSONG bagi pengunjung: akun penonton
 * dimatikan (`AKUN_PENONTON_ENABLED = false` di lib/saklar-fitur.ts), jadi
 * riwayatnya cuma yang tersimpan di perangkat masing-masing. Pengunjung baru
 * mengklik "Lanjutkan Menonton" lalu mendapat panel hampa — strip ini selalu
 * punya isi.
 *
 * KENAPA KOMPONEN SENDIRI, bukan ditulis di `app/beranda/page.tsx`: halaman
 * depan `/` punya slot yang sama dan suatu saat mungkin diminta memakai strip
 * ini juga (hari ini slot itu kosong karena akun penonton mati). Markup yang
 * ditulis langsung di halaman harus disalin saat itu, dan salinan pasti
 * menyimpang.
 *
 * SENGAJA tanpa "use client": isinya cuma tautan — nol state, nol hook. Jadi
 * ia nol JavaScript di browser dan tetap berfungsi penuh tanpa JS.
 */

type Tawaran = {
  label: string;
  /**
   * Alamat tujuan. WAJIB benar-benar menyaring sesuatu: nilai `sort` dipakai
   * apa adanya oleh `parseSort` (lib/discover.ts:18), dan nilai yang tidak
   * dikenal diam-diam jatuh ke "relevance" — chip-nya akan terlihat bekerja
   * sambil menampilkan katalog apa adanya. Ketiga nilai di bawah dicocokkan
   * ke `SORT_OPTIONS` (lib/discover.ts:6), bukan ditebak.
   */
  href: string;
  Ikon: typeof Flame;
};

const TAWARAN: Tawaran[] = [
  // "rating" = Rating Tertinggi.
  { label: "Kualitas Terbaik", href: "/discover?sort=rating", Ikon: Award },
  // "terbaru" = Terbaru Ditambah (urut masuk katalog, bukan tahun rilis).
  { label: "Update Terbaru", href: "/discover?sort=terbaru", Ikon: Sparkles },
  // "populer" = Paling Banyak Ditonton.
  { label: "Terpopuler", href: "/discover?sort=populer", Ikon: Flame },
];

/** Id judul — dipakai `aria-labelledby` pada kisi chip di TabKatalogTampilan. */
export const ID_JUDUL_TAWARAN = "judul-tawaran";

/**
 * JUDUL strip, DI TENGAH dan di BARIS SENDIRI (owner 2026-11-24:
 * *"ubah layarindo menawarkan, letakan ditengah"*).
 *
 * ⚠️ INI MEMBATALKAN permintaan owner 2026-11-23 (*"judul + chip disederetkan
 * jadi satu baris"*, commit `e2b4edb`) — dan itu DISENGAJA, bukan kemunduran
 * yang terlewat. Jangan "kembalikan" ke sebaris karena menemukan catatan lama
 * itu; yang berlaku permintaan yang lebih baru.
 *
 * Dipisah dari chipnya supaya kelima chip (tiga dari sini + REKOMENDASI &
 * <tahun> dari deret tab) bisa jadi anak LANGSUNG satu kisi — itulah yang
 * membuat lebarnya bisa benar-benar seragam. Lihat `slotJudulBaris` dan
 * `slotBarisTab` di TabKatalogTampilan.tsx.
 */
export function JudulMenawarkan() {
  return (
    /* DIAPIT GARIS kiri-kanan (owner 2026-11-24, menunjuk gambar acuan:
       *"jadikan layarindo di antara garis"*). Garisnya `flex-1` supaya
       panjangnya mengikuti sisa ruang — judul tetap di tengah di lebar layar
       berapa pun, tanpa satu pun angka lebar yang harus disetel per layar.

       Garisnya `<span>` kosong ber-`aria-hidden`, BUKAN `<hr>`: ini hiasan,
       dan `<hr>` berarti "pergantian topik" bagi pembaca layar — ia akan
       mengumumkan dua pemisah yang tidak ada artinya di sini. */
    <div className="mb-2 flex items-center gap-3">
      <span className="h-px flex-1 bg-emas-700/45" aria-hidden="true" />
      <h2
        id={ID_JUDUL_TAWARAN}
        className="shrink-0 text-center text-sm font-bold text-white"
      >
        {SITE_NAME} Menawarkan
      </h2>
      <span className="h-px flex-1 bg-emas-700/45" aria-hidden="true" />
    </div>
  );
}

/**
 * TIGA CHIP PINTASAN — sengaja TANPA pembungkus apa pun (Fragment).
 *
 * Pembungkus `<div>`/`<ul>` yang dulu ada DIHAPUS 2026-11-24: selama chip-chip
 * ini bersarang di dalam pembungkusnya sendiri, mereka membungkus baris
 * terpisah dari REKOMENDASI & <tahun> — dan itu yang terlihat owner sebagai
 * "tidak seragam". Sebagai anak langsung kisi, kelimanya mendapat kolom yang
 * sama persis.
 *
 * Nama kelompoknya untuk pembaca layar tidak hilang: `role="group"` +
 * `aria-labelledby` pindah ke kisinya di TabKatalogTampilan.tsx.
 */
export default function LayarindoMenawarkan() {
  return (
    <>
      {TAWARAN.map(({ label, href, Ikon }) => (
        <Link key={href} href={href} className={cn(KELAS_CHIP_BARIS, CHIP_BARIS_DIAM)}>
          <Ikon className="size-3.5 shrink-0" aria-hidden="true" />
          {label}
        </Link>
      ))}
    </>
  );
}
