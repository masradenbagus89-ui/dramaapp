"use client";

// Saklar "lihat sebagai petak atau baris" untuk daftar panel admin.
//
// KENAPA ADA (owner 2026-11-09): "bisa tidak ini ada pilihan mau kita lihat
// sebagai list saja atau seperti yang sekarang". Daftar video Playly berisi 500
// judul bergambar; bentuk petak enak untuk mengenali sampul, bentuk baris jauh
// lebih padat saat yang dicari adalah JUDUL tertentu.
//
// Pilihannya DISIMPAN di browser admin (localStorage) supaya tidak kembali ke
// petak tiap kali halaman dibuka — preferensi tampilan yang harus dipilih ulang
// terus-menerus lebih mengganggu daripada tidak ada pilihannya sama sekali.
import { useEffect, useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

export type TampilanDaftar = "petak" | "baris";

const BAWAAN: TampilanDaftar = "petak";

/**
 * Ingat pilihan tampilan di browser ini.
 *
 * ⚠️ Dibaca lewat `useEffect`, BUKAN sebagai nilai awal `useState`. Alasannya
 * teknis dan kerusakannya nyata: HTML pertama dibuat di server yang tidak punya
 * localStorage, jadi membaca di nilai awal membuat tampilan server ("petak")
 * berbeda dari tampilan klien ("baris") — React menyebutnya hydration mismatch
 * dan bisa menolak menggambar seluruh panel.
 *
 * Tiap akses dibungkus try/catch: browser mode privat / setelan yang memblokir
 * penyimpanan situs melempar error saat localStorage disentuh, dan panel admin
 * tidak boleh mati hanya karena preferensi tampilan tidak bisa disimpan.
 */
export function useTampilanDaftar(kunci: string) {
  const [tampilan, setTampilan] = useState<TampilanDaftar>(BAWAAN);

  useEffect(() => {
    try {
      const tersimpan = window.localStorage.getItem(kunci);
      if (tersimpan === "petak" || tersimpan === "baris") setTampilan(tersimpan);
    } catch {
      // Biarkan memakai bawaan — bukan kondisi yang perlu dilaporkan ke admin.
    }
  }, [kunci]);

  const ubah = (nilai: TampilanDaftar) => {
    setTampilan(nilai);
    try {
      window.localStorage.setItem(kunci, nilai);
    } catch {
      // Pilihannya tetap berlaku untuk sesi ini, cuma tidak diingat nanti.
    }
  };

  return [tampilan, ubah] as const;
}

const PILIHAN: { nilai: TampilanDaftar; label: string; Ikon: typeof List }[] = [
  { nilai: "petak", label: "Tampilan petak", Ikon: LayoutGrid },
  { nilai: "baris", label: "Tampilan baris", Ikon: List },
];

export default function PilihTampilanDaftar({
  nilai,
  onNilai,
  className,
}: {
  nilai: TampilanDaftar;
  onNilai: (nilai: TampilanDaftar) => void;
  className?: string;
}) {
  return (
    // `role="group"` + aria-pressed, bukan dua tombol lepas: keduanya satu
    // pilihan yang saling meniadakan, dan pembaca layar perlu tahu mana yang
    // sedang aktif — warna saja tidak terbaca olehnya.
    <div
      role="group"
      aria-label="Bentuk tampilan daftar"
      className={cn(
        "flex shrink-0 items-center gap-0.5 rounded-lg border border-zinc-700 p-0.5",
        className,
      )}
    >
      {PILIHAN.map(({ nilai: pilihan, label, Ikon }) => {
        const aktif = nilai === pilihan;
        return (
          <button
            key={pilihan}
            type="button"
            onClick={() => onNilai(pilihan)}
            aria-pressed={aktif}
            title={label}
            aria-label={label}
            className={cn(
              "rounded-md p-1.5 transition",
              aktif
                ? "bg-amber-500/20 text-amber-300"
                : "text-zinc-500 hover:text-zinc-200",
            )}
          >
            <Ikon className="size-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
