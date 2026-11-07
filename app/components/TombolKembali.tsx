"use client";

// Tombol "Kembali" di pojok kanan atas halaman (permintaan owner 2026-11-07).
//
// 🪤 KENAPA BUKAN `router.back()` POLOS: kalau penonton mendarat LANGSUNG di
// halaman ini — hasil Google, alamat diketik, tautan dibagikan teman — riwayat
// browsernya tidak berisi halaman kita. `router.back()` di situ akan
// MEMBAWANYA KELUAR dari situs, dan tombol bernama "Kembali" yang melempar
// orang ke Google terbaca seperti situs rusak. Tidak ada error apa pun yang
// muncul, jadi kerusakannya senyap: yang kena cuma pengunjung baru, yaitu
// orang yang paling tidak akan melaporkannya.
//
// Aturannya: mundur HANYA kalau halaman sebelumnya memang masih di situs ini;
// kalau tidak, pulang ke `tujuanCadangan`.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function TombolKembali({
  tujuanCadangan = "/beranda",
  className,
}: {
  /** Dipakai saat penonton mendarat langsung (tak ada halaman kita di riwayat). */
  tujuanCadangan?: string;
  className?: string;
}) {
  const router = useRouter();
  const [dariDalamSitus, setDariDalamSitus] = useState(false);

  useEffect(() => {
    const asal = document.referrer;
    if (!asal) return; // mendarat langsung → biarkan false
    try {
      setDariDalamSitus(new URL(asal).origin === window.location.origin);
    } catch {
      // referrer yang tak bisa diurai dianggap BUKAN dari situs ini.
      // Gagal-aman: lebih baik pulang ke beranda daripada melempar keluar.
    }
  }, []);

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => {
        if (dariDalamSitus) router.back();
        else router.push(tujuanCadangan);
      }}
      className={cn(
        "shrink-0 rounded-full border-zinc-700 bg-transparent text-xs font-semibold text-zinc-300 transition-colors hover:border-amber-400 hover:text-amber-400 terang:border-zinc-300 terang:text-zinc-700 terang:hover:border-amber-500 terang:hover:text-amber-600",
        className,
      )}
    >
      <ArrowLeft className="mr-1.5 size-4" />
      Kembali
    </Button>
  );
}
