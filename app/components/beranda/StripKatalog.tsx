"use client";

import Link from "next/link";
import { useRef } from "react";
import { ChevronRight } from "lucide-react";
import type { NavItem } from "@/lib/nav-katalog";
import { cn } from "@/lib/utils";
import { SHELL } from "./shell";

type Props = {
  /** Isi strip. Biasanya `STRIP_KATALOG` — daftar tetap milik owner. */
  items: NavItem[];
  /**
   * Alamat penyaring yang sedang berlaku. Chip yang alamatnya sama persis
   * disorot, supaya penonton tahu chip mana yang sedang bekerja. Halaman yang
   * tidak menyaring di tempat (mis. halaman depan) cukup mengosongkannya.
   */
  activeHref?: string;
};

const ITEM_CLASS =
  "shrink-0 px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide transition-colors";

/**
 * Strip kuning di bawah bar cari — deretan pintasan katalog gaya situs
 * streaming.
 *
 * Bentuknya SATU BARIS pintasan yang semuanya tautan ke /discover. Sampai
 * 2026-09-21 komponen ini punya dua mode (genre sebagai tombol saring-di-tempat
 * DI SINI, sisanya tautan ke halaman lain) — dua chip bersebelahan berperilaku
 * beda tanpa ada tandanya. Sejak isinya jadi daftar tetap milik owner yang
 * mencampur kategori, genre sinema, negara, dan tahun, mode saring-di-tempat
 * tak bisa dipakai lagi: /beranda hanya menyimpan genre kategori di state
 * lokalnya, jadi chip seperti CINA atau SCI-FI akan diam saja kalau diklik.
 * Satu perilaku untuk semua chip = tidak ada tombol yang diam-diam mati.
 *
 * Penyaringan genre di tempat pada /beranda TIDAK hilang — masih ada di
 * dropdown "Semua genre" pada bar cari halaman itu.
 */
export default function StripKatalog({ items, activeHref }: Props) {
  /**
   * Wadah yang digeser oleh panah di ujung kanan.
   *
   * ⚠️ Hook WAJIB dipanggil sebelum `return null` di bawah — aturan React:
   * jumlah hook harus sama di tiap render. Menaruhnya sesudah penjaga
   * "items kosong" membuat komponen ini melempar begitu katalog kosong.
   */
  const laci = useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  return (
    /* Strip genre ikut palet "soft sage" (owner 2026-11-23). Sampai hari itu
       ia gradasi kuning `from-emas-400 to-yellow-400` dengan garis
       `amber-600`. Kuning terang tepat di bawah bar merah adalah dua warna
       jenuh yang bertumpuk — itu bagian dari yang owner sebut "sakit mata".

       `sage-100` + teks `sage-900` = kontras 12,51:1 (dihitung, lihat palet di
       app/globals.css). Chip aktif dibalik jadi `sage-700` + teks putih =
       7,58:1. Keduanya jauh di atas ambang 4,5:1. */
    <div className="border-b border-emas-700/30 bg-gelap-800">
      <div className={cn(SHELL, "flex items-center gap-2 px-2 md:px-4")}>
        {/* Digeser ke samping kalau tak muat (layar sempit), bukan membungkus:
            daftar ini sengaja dijaga pendek oleh owner supaya muat satu baris di
            layar lebar, dan strip yang berbaris-baris akan mendorong poster
            pertama turun keluar layar pertama.

            Pembungkus `flex-1` dipertahankan walau ujung kanannya kini kosong:
            ia yang menjaga chip tetap satu baris yang bisa digeser kalau suatu
            saat ada yang dipasang di sebelahnya lagi. */}
        <div
          ref={laci}
          className="no-scrollbar flex flex-1 items-center overflow-x-auto"
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.href === activeHref ? "page" : undefined}
              className={cn(
                ITEM_CLASS,
                item.href === activeHref
                  ? "rounded-full bg-emas-500 text-gelap-950"
                  : "rounded-full text-redup hover:bg-emas-500/15 hover:text-emas-300",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* PANAH GESER di ujung kanan — owner 2026-11-23: *"di ujung fiksi
            ilmiah kamu kasih tanda panah jadi tanda masih bisa di geser"*.

            Strip ini memang lebih panjang dari layar HP dan selama ini SATU
            SATUNYA petunjuknya adalah chip terakhir yang terpotong di tepi —
            petunjuk yang gampang terbaca sebagai "memang segitu isinya".

            ⚠️ BENAR-BENAR MENGGESER, bukan hiasan. Panah yang tampak seperti
            tombol tapi diam saat diketuk lebih buruk daripada tidak ada:
            penonton menyimpulkan bagian itu rusak. Caranya menyalin pola
            `BarisGeser.tsx:107` — satu layar dikurangi sedikit supaya chip di
            tepi tetap terlihat sebagai jangkar, bukan melompat jauh. */}
        <button
          type="button"
          aria-label="Geser pintasan ke kanan"
          onClick={() => {
            const el = laci.current;
            if (!el) return;
            el.scrollBy({ left: el.clientWidth * 0.8, behavior: "smooth" });
          }}
          /* Hijau LEMBUT, bukan pekat (owner 2026-11-23: *"tanda panah warna
             hijau juga bikin soft aja"*). `sage-800` di atas `sage-200` =
             10,34:1, jadi panahnya tetap terbaca jelas walau tidak lagi
             menonjok. */
          /* `md:hidden` — HP SAJA (owner 2026-11-23: *"untuk versi web yang
             tanda panah itu tidak perlu, kamu hapus; untuk versi HP saja"*).
             Di layar komputer seluruh pintasan memang muat satu baris, jadi
             panahnya tidak menggeser apa pun — tombol yang diklik lalu tidak
             terjadi apa-apa justru membuat penonton mengira bagian itu rusak.

             ❓ BATAS JUJUR: ambangnya LEBAR LAYAR (768px), bukan "apakah
             stripnya benar-benar bisa digeser". Di jendela komputer yang
             disempitkan ke ±800px, strip bisa saja meluap tanpa panah.
             Mengukur keterluapan sungguhan menuntut pengukuran di browser +
             pemantau perubahan ukuran — mekanisme baru untuk kasus yang
             jarang, jadi sengaja tidak dibangun. */
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emas-500/20 text-emas-300 transition-colors outline-none hover:bg-emas-500/35 focus-visible:ring-2 focus-visible:ring-emas-400 md:hidden"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
