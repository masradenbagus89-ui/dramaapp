"use client";

// Dropdown saringan seragam untuk baris saringan panel IMDb.
//
// KENAPA ADA (owner 2026-11-21): baris saringan itu butuh ±990px sementara
// panelnya ±750px, jadi isinya terpotong dan menimpa kotak cari. Owner memilih
// meringkas tombol-tombolnya jadi dropdown — satu dropdown ±130px
// menggantikan empat tombol ±470px.
//
// Dipisah jadi komponen sendiri, bukan tiga <select> yang ditulis berulang:
// ketiganya berdampingan di satu baris, dan beda beberapa piksel pada tinggi
// atau sudut membuat barisnya terlihat miring — jenis cacat yang tak akan
// dilaporkan siapa pun tapi membuat panel terasa asal jadi. Satu tempat juga
// berarti perubahan gaya berikutnya mustahil tertinggal di salah satunya.
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Warna saat saringannya menyala. Kelas ditulis UTUH, JANGAN dirakit jadi
 * `border-${nada}-500` — Tailwind v4 memindai kode sebagai TEKS, dan kelas
 * yang baru terbentuk saat program jalan tidak pernah ikut dibangun. Gejalanya
 * cuma "warnanya hilang", tanpa satu pun error.
 */
const NADA_AKTIF = {
  amber: "border-amber-500 bg-amber-500/15 text-amber-700",
  sky: "border-sky-500 bg-sky-500/15 text-sky-700",
  bahaya: "border-rose-600 bg-rose-600/10 text-rose-700",
} as const;

export type NadaSaringan = keyof typeof NADA_AKTIF;

export default function DropdownSaringan({
  label,
  ikon: Ikon,
  nilai,
  onNilai,
  aktif,
  nada = "sky",
  children,
}: {
  /** Dibacakan pembaca layar; tidak tampil karena ikonnya sudah mewakili. */
  label: string;
  ikon: LucideIcon;
  nilai: string;
  onNilai: (nilai: string) => void;
  /** true = sedang menyaring sesuatu (bukan pilihan bawaannya). */
  aktif: boolean;
  nada?: NadaSaringan;
  /** <option> / <optgroup>-nya. */
  children: React.ReactNode;
}) {
  return (
    <label className="inline-flex min-w-0 items-center gap-1.5">
      <span className="sr-only">{label}</span>
      <Ikon className="size-3.5 shrink-0 text-zinc-500" aria-hidden="true" />
      <select
        value={nilai}
        onChange={(e) => onNilai(e.target.value)}
        className={cn(
          // `min-w-0` + `truncate` menahan kerusakan yang sudah terjadi sekali:
          // tanpa keduanya, <select> menolak menyusut di bawah lebar opsi
          // terpanjangnya dan mendorong dirinya menimpa kotak cari di
          // sebelahnya (terlihat 2026-11-21 sebagai teks "Semua tangga" yang
          // terpotong di atas kotak cari).
          "min-h-8 min-w-0 truncate rounded-full border px-3 py-1.5 text-xs font-semibold outline-none transition",
          aktif
            ? NADA_AKTIF[nada]
            : "border-zinc-700 bg-transparent text-zinc-400 hover:border-zinc-500 focus-visible:border-zinc-500",
        )}
      >
        {children}
      </select>
    </label>
  );
}
