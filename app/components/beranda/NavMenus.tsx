"use client";

import Link from "next/link";
import type { NavMenu } from "@/lib/nav-katalog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Deretan menu dropdown di bar cari — pola situs katalog streaming: satu baris
 * berisi logo, kotak cari, lalu menu penyaring yang membuka daftar saat diklik.
 *
 * Komponen ini sengaja TIDAK tahu apa-apa soal katalog: isinya datang jadi dari
 * `buildNavMenus` (lib/nav-katalog.ts). Pemisahan itu yang membuat aturan
 * "jangan gambar menu kosong" bisa diuji tanpa browser.
 *
 * Di layar sempit deretannya digeser ke samping (overflow-x-auto), BUKAN
 * dilipat ke tombol hamburger: menu yang butuh dua klik untuk terlihat sama
 * saja dengan menu yang disembunyikan, padahal justru ini yang diminta owner.
 */
/**
 * Kelas grid per jumlah kolom. Ditulis UTUH sebagai teks, bukan dirangkai
 * (`grid-cols-${n}`): Tailwind memindai kode sebagai teks biasa, jadi nama
 * kelas yang baru terbentuk saat program berjalan TIDAK pernah ikut ke CSS —
 * hasilnya menu tetap satu kolom, tanpa satu pun error.
 *
 * Jenjangnya naik bertahap mengikuti lebar layar. Tahun (angka 4 huruf)
 * memakai sel sempit. Genre dan Negara memakai sel lebar (`lebarNama`) supaya
 * "Fiksi Ilmiah" dan "Uni Emirat Arab" tetap SATU baris — kalau terbungkus,
 * tingginya naik dan scrollbar yang diminta owner hilang justru kembali.
 *
 * Di HP keduanya mulai 2 kolom, bukan 4: 4 kolom pada lebar 393px memotong
 * nama. 2 kolom untuk 24 nama = 12 baris, masih muat di tinggi layar HP.
 */
const KELAS_KOLOM: Record<number, string> = {
  2: "grid grid-cols-1 gap-x-1 sm:w-[21rem] sm:grid-cols-2",
  3: "grid grid-cols-1 gap-x-1 sm:w-[21rem] sm:grid-cols-2 lg:w-[30rem] lg:grid-cols-3",
  4: "grid grid-cols-2 gap-x-1 w-[13rem] sm:w-[23rem] sm:grid-cols-4",
};

/** 4 kolom seperti Tahun, tetapi selnya cukup untuk nama negara/genre. */
const KELAS_EMPAT_NAMA =
  "grid grid-cols-2 gap-x-1 w-[22rem] whitespace-nowrap sm:w-[36rem] sm:grid-cols-4";

function kelasKolom(menu: NavMenu): string | undefined {
  if (!menu.kolom) return undefined;
  if (menu.kolom === 4 && menu.lebarNama) return KELAS_EMPAT_NAMA;
  return KELAS_KOLOM[menu.kolom];
}

export default function NavMenus({ menus }: { menus: NavMenu[] }) {
  if (menus.length === 0) return null;

  return (
    <nav
      aria-label="Menu katalog"
      className="no-scrollbar flex items-center gap-0.5 overflow-x-auto"
    >
      {menus.map((m) => (
        <DropdownMenu key={m.key}>
          <DropdownMenuTrigger className="group flex h-9 shrink-0 items-center gap-1 rounded-sm px-2.5 text-[13px] font-semibold text-white transition-colors outline-none hover:bg-black/25 focus-visible:bg-black/25 data-[state=open]:bg-black/30">
            {m.label}
            {/* Panah ikut berputar saat menu terbuka — penanda "ini bisa dibuka"
                yang dipahami tanpa perlu dijelaskan. */}
            <ChevronDown className="size-3 transition-transform duration-150 group-data-[state=open]:rotate-180" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className={cn(
              // Tinggi dibatasi TINGGI LAYAR, bukan angka tetap: dropdown yang
              // lebih panjang dari layar membuat pilihan terakhir mustahil
              // dicapai di HP — ia tergambar di bawah tepi layar dan daftarnya
              // tidak ikut bergulir bersama halaman.
              "max-h-[min(70vh,34rem)] min-w-44 overflow-y-auto border-zinc-700 bg-zinc-900 text-zinc-200",
              kelasKolom(m),
            )}
          >
            {m.items.map((item) => (
              <DropdownMenuItem
                key={item.href}
                asChild
                className="cursor-pointer text-sm focus:bg-zinc-800 focus:text-amber-400"
              >
                <Link href={item.href}>{item.label}</Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ))}
    </nav>
  );
}
