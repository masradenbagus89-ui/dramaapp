import Link from "next/link";
import { Award, Flame, Sparkles } from "lucide-react";

import { SITE_NAME } from "@/lib/site";

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

export default function LayarindoMenawarkan() {
  return (
    /* ⚠️ BUKAN <section> BERGARIS LAGI (owner 2026-11-23, dengan sketsa di
       tangkapan layar: judul + chip DISEDERETKAN dengan tombol tab).
       DULU: pita sendiri ber-`border-y` + `bg-gelap-900` + lebar `SHELL`,
       duduk di atas baris tab sebagai baris terpisah.
       KINI: kelompok sebaris yang DITITIPKAN ke dalam kotak baris tab lewat
       prop `slotBarisTab` (lihat BadanKatalog.tsx). Latar, garis, dan batas
       lebarnya kini milik kotak itu — kalau dipasang lagi di sini, hasilnya
       kotak bergaris di dalam kotak bergaris.

       `role="group"` + `aria-labelledby` dipertahankan supaya pembaca layar
       tetap mengumumkan ketiga chip ini sebagai satu kelompok bernama, walau
       pembungkus <section>-nya sudah hilang. */
    <div
      role="group"
      aria-labelledby="judul-tawaran"
      /* `min-w-0` + `flex-wrap`: di layar HP kelompok ini WAJIB boleh
         menyusut & membungkus. Tanpa keduanya ia jadi satu benda panjang yang
         tak bisa dipecah, dan chip ketiga terpotong di tepi layar — terbukti
         saat mock-nya dipotret sebelum dipasang. Di layar komputer semuanya
         memang muat satu baris, jadi pembungkusan tak pernah terpakai. */
      className="flex min-w-0 flex-wrap items-center gap-2"
    >
      <h2 id="judul-tawaran" className="shrink-0 text-sm font-bold text-white">
        {SITE_NAME} Menawarkan
      </h2>

      <ul className="flex min-w-0 flex-wrap items-center gap-2">
        {TAWARAN.map(({ label, href, Ikon }) => (
          <li key={href}>
            <Link
              href={href}
                /* min-h-11 (~44px) = ambang target sentuh yang dipakai seluruh
                   situs ini. Chip di gambar acuan lebih tipis, tapi chip tipis
                   di HP sering meleset saat diketuk jempol — dan chip yang
                   meleset terbaca sebagai tombol mati. */
                className="flex min-h-11 items-center gap-1.5 rounded-full border border-emas-700/55 bg-gelap-800 px-3.5 text-[11px] font-extrabold uppercase tracking-wide text-white transition-colors outline-none hover:bg-gelap-700 hover:text-emas-300 focus-visible:ring-2 focus-visible:ring-emas-400 md:text-xs"
              >
                <Ikon className="size-3.5 shrink-0" aria-hidden="true" />
                {label}
              </Link>
            </li>
        ))}
      </ul>
    </div>
  );
}
