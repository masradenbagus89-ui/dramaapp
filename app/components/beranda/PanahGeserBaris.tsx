"use client";

import { ChevronRight } from "lucide-react";

/**
 * PANAH GESER di ujung kanan sebuah baris yang bisa digeser menyamping —
 * HP SAJA.
 *
 * KENAPA ADA (owner 2026-11-23, soal strip genre): *"di ujung fiksi ilmiah
 * kamu kasih tanda panah jadi tanda masih bisa di geser"*. Baris yang lebih
 * panjang dari layar HP selama ini cuma punya SATU petunjuk — isi terakhir
 * yang terpotong di tepi — dan petunjuk itu gampang terbaca sebagai "memang
 * segitu isinya".
 *
 * ⚠️ BENAR-BENAR MENGGESER, bukan hiasan. Panah yang tampak seperti tombol
 * tapi diam saat diketuk lebih buruk daripada tidak ada: penonton
 * menyimpulkan bagian itu rusak.
 *
 * ⚠️ KENAPA LEWAT `targetId`, BUKAN `ref`: pemakai keduanya berbeda sifat.
 * `StripKatalog` memang komponen browser, tapi `TabKatalogTampilan` SENGAJA
 * tanpa "use client" — ia dirender di SERVER sebagai isi <Suspense fallback>
 * supaya halaman depan tidak berkedip kosong. Menaruh `useRef` di sana akan
 * memaksanya jadi komponen browser dan membatalkan hal itu. Dengan id, satu
 * tombol kecil inilah yang jadi komponen browser — sisanya tetap di server.
 *
 * KENAPA SATU KOMPONEN, bukan disalin: sampai 2026-11-24 tombol ini ditulis
 * UTUH di dalam StripKatalog. Begitu baris kedua membutuhkannya, salinan
 * kedua pasti menyimpang (jarak geser, warna, label) tanpa satu pun error —
 * cuma dua panah yang terasa beda di satu halaman.
 */
export default function PanahGeserBaris({
  targetId,
  label,
}: {
  /** `id` elemen yang digeser. Elemennya WAJIB `overflow-x-auto`. */
  targetId: string;
  /** Label untuk pembaca layar — sebutkan APA yang digeser, bukan "panah". */
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-controls={targetId}
      onClick={() => {
        const el = document.getElementById(targetId);
        if (!el) return;
        // Satu layar dikurangi sedikit (pola BarisGeser.tsx:107) supaya isi di
        // tepi tetap terlihat sebagai jangkar, bukan melompat jauh.
        el.scrollBy({ left: el.clientWidth * 0.8, behavior: "smooth" });
      }}
      /* `md:hidden` — HP SAJA (owner 2026-11-23: *"untuk versi web yang tanda
         panah itu tidak perlu, kamu hapus; untuk versi HP saja"*). Di layar
         komputer barisnya memang muat, jadi panahnya tidak menggeser apa pun —
         tombol yang diklik lalu tidak terjadi apa-apa justru membuat penonton
         mengira bagian itu rusak.

         ❓ BATAS JUJUR: ambangnya LEBAR LAYAR (768px), bukan "apakah barisnya
         benar-benar meluap". Di jendela komputer yang disempitkan ke ±800px,
         barisnya bisa saja meluap tanpa panah. Mengukur keterluapan sungguhan
         menuntut pengukuran di browser + pemantau perubahan ukuran — mekanisme
         baru untuk kasus yang jarang, jadi sengaja tidak dibangun. */
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emas-500/20 text-emas-300 transition-colors outline-none hover:bg-emas-500/35 focus-visible:ring-2 focus-visible:ring-emas-400 md:hidden"
    >
      <ChevronRight className="size-4" aria-hidden="true" />
    </button>
  );
}
