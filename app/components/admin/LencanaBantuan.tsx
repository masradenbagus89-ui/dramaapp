"use client";

// Angka notifikasi di menu admin "Laporan & Chat": laporan Pending + chat
// belum dibaca. Ditanya berkala dari SEMUA halaman admin yang memakai
// AdminSidebar, supaya admin tahu ada yang masuk walau sedang mengurus hal lain.
// Nol / gagal / belum login = tidak digambar (bukan angka 0 atau tanda galat).
import { useCallback, useState } from "react";
import { usePolling } from "@/app/components/usePolling";

const JEDA_MS = 30_000;

export default function LencanaBantuan() {
  const [jumlah, setJumlah] = useState(0);

  const tanya = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/bantuan", { cache: "no-store" });
      if (!res.ok) return;
      const d = (await res.json()) as { laporanPending?: number; chatBelumDibaca?: number };
      setJumlah((d.laporanPending ?? 0) + (d.chatBelumDibaca ?? 0));
    } catch {
      /* diam: lencana hanyalah pengingat, halaman bantuannya tetap bisa dibuka */
    }
  }, []);

  usePolling(tanya, JEDA_MS, true);

  if (jumlah <= 0) return null;
  return (
    <span
      className="ml-auto min-w-5 rounded-full bg-rose-500 px-1.5 text-center text-[11px] font-bold leading-5 text-white"
      aria-label={`${jumlah} perlu ditangani`}
    >
      {jumlah > 99 ? "99+" : jumlah}
    </span>
  );
}
