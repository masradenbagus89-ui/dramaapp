"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bar tipis berisi satu tombol yang membuka isinya saat diklik (accordion).
 *
 * KENAPA ADA: bentuk ini sudah hidup di `LanjutMenonton.tsx` sejak 2026-10-09
 * (pintu akun di landing page), dan owner 2026-10-29 meminta baris "Lanjut
 * Menonton" di `/beranda` memakai bentuk yang SAMA — *"disembunyikan, kalau
 * dipisah masih terlihat sama"*.
 *
 * Diangkat jadi komponen bersama, BUKAN disalin: dua accordion yang mirip pasti
 * menyimpang begitu salah satunya diubah, dan repo ini sudah tiga kali kena
 * masalah itu pada kepala situs (riwayatnya di KepalaKatalog.tsx).
 *
 * Isinya dirender HANYA saat terbuka, bukan disembunyikan dengan CSS: isi yang
 * tersembunyi tapi tetap hidup masih bisa dijangkau Tab dan masih dibacakan
 * pembaca layar — penonton "menabrak" isi yang tak terlihat di layar.
 */
export default function PanelLipat({
  judul,
  children,
  bawaanTerbuka = false,
}: {
  /** Tulisan di tombol, mis. "Lanjutkan Menonton". */
  judul: string;
  children: ReactNode;
  /** Terbuka sejak awal. Bawaannya tertutup — itu inti permintaan owner. */
  bawaanTerbuka?: boolean;
}) {
  const [terbuka, setTerbuka] = useState(bawaanTerbuka);
  // Id unik per-panel: `aria-controls` harus menunjuk id yang benar-benar ada,
  // dan id yang ditulis tetap akan bertabrakan kalau nanti ada dua panel di
  // satu halaman.
  const idIsi = useId();

  return (
    <section className="border-y border-zinc-800 bg-zinc-900">
      <div className="shell-wide mx-auto px-4 md:px-6">
        <button
          type="button"
          onClick={() => setTerbuka((b) => !b)}
          aria-expanded={terbuka}
          aria-controls={idIsi}
          /* min-h-11 = ~44px: batas target sentuh yang masih nyaman ditekan
             jari di HP (standar aksesibilitas, skills/a11y). */
          className="flex min-h-11 w-full items-center justify-center gap-1.5 text-sm font-bold text-amber-400 transition-colors hover:text-amber-300"
        >
          {judul}
          <ChevronDown
            className={cn(
              "size-4 transition-transform duration-200",
              terbuka && "rotate-180",
            )}
          />
        </button>

        {terbuka && (
          <div id={idIsi} className="pb-5">
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
