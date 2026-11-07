"use client";

// Daftar saran yang menggantung di bawah kotak cari (owner 2026-11-07).
//
// Dipisah dari SearchBar supaya tampilannya bisa diuji sendiri, dan supaya
// SearchBar tetap mengurus SATU hal: kotak cari + tombolnya.
import Link from "next/link";
import Image from "next/image";
import type { SaranCari } from "@/lib/saran-cari";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

type Props = {
  saran: SaranCari[];
  /** Baris yang sedang disorot panah atas/bawah; -1 = tak ada. */
  aktif: number;
  /** Alamat halaman hasil lengkap, dipakai baris terakhir. */
  hrefSemua: string;
  /** Dipanggil saat sebuah baris dipilih — pemanggil menutup kotaknya. */
  onPilih: () => void;
  onSorot: (index: number) => void;
};

export default function DaftarSaran({
  saran,
  aktif,
  hrefSemua,
  onPilih,
  onSorot,
}: Props) {
  if (saran.length === 0) return null;

  return (
    <div
      // `absolute` + `z-40`: daftar ini MENGGANTUNG di atas isi halaman, tidak
      // mendorongnya. Mendorong isi halaman membuat poster di bawah bergeser
      // tiap huruf diketik, dan yang mau diklik penonton ikut melompat.
      className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-xl shadow-black/30"
      role="listbox"
      aria-label="Saran pencarian"
    >
      {saran.map((s, i) => (
        <Link
          key={`${s.href}-${s.id}`}
          href={s.href}
          onClick={onPilih}
          onMouseEnter={() => onSorot(i)}
          role="option"
          aria-selected={i === aktif}
          className={cn(
            "flex items-center gap-3 px-3 py-2 transition-colors",
            i === aktif ? "bg-amber-50" : "hover:bg-zinc-50",
          )}
        >
          <span className="relative h-12 w-9 shrink-0 overflow-hidden rounded bg-zinc-200">
            {s.poster && (
              <Image
                src={s.poster}
                alt=""
                fill
                sizes="36px"
                className="object-cover"
                // Gambar saran TIDAK pernah jadi LCP (ia baru ada sesudah
                // orang mengetik), jadi `unoptimized` menghindari biaya
                // optimasi untuk gambar yang mungkin tak sempat dilihat.
                unoptimized
              />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-zinc-900">
              {s.judul}
            </span>
            {s.tahun && (
              <span className="block text-xs text-zinc-500">{s.tahun}</span>
            )}
          </span>
        </Link>
      ))}

      {/* Jalan keluar yang WAJIB ada: saran dibatasi 6 baris, jadi tanpa baris
          ini judul ke-7 jadi tak terjangkau dan daftar yang membatasi diri
          terbaca seperti katalog yang kekurangan isi. */}
      <Link
        href={hrefSemua}
        onClick={onPilih}
        onMouseEnter={() => onSorot(saran.length)}
        role="option"
        aria-selected={aktif === saran.length}
        className={cn(
          "flex items-center gap-2 border-t border-zinc-200 px-3 py-2 text-xs font-semibold text-rose-700 transition-colors",
          aktif === saran.length ? "bg-amber-50" : "hover:bg-zinc-50",
        )}
      >
        <Search className="size-3.5" />
        Lihat semua hasil
      </Link>
    </div>
  );
}
