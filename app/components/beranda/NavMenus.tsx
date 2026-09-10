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
export default function NavMenus({ menus }: { menus: NavMenu[] }) {
  if (menus.length === 0) return null;

  return (
    <nav
      aria-label="Menu katalog"
      className="no-scrollbar flex items-center gap-0.5 overflow-x-auto"
    >
      {menus.map((m) => (
        <DropdownMenu key={m.key}>
          <DropdownMenuTrigger className="group flex h-9 shrink-0 items-center gap-1 rounded-sm px-2.5 text-xs font-bold uppercase tracking-wide text-white transition-colors outline-none hover:bg-black/25 focus-visible:bg-black/25 data-[state=open]:bg-black/30">
            {m.label}
            {/* Panah ikut berputar saat menu terbuka — penanda "ini bisa dibuka"
                yang dipahami tanpa perlu dijelaskan. */}
            <ChevronDown className="size-3 transition-transform duration-150 group-data-[state=open]:rotate-180" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="max-h-80 min-w-44 border-zinc-700 bg-zinc-900 text-zinc-200"
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
