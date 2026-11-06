"use client";

// Judul + tombol "?" yang menyembunyikan keterangan panjang sampai diklik.
//
// KENAPA ADA (owner 2026-11-06): "video playly dibawahnya ada keterangan bisa
// kamu jadikan/masukan icon ?, jadi klo orang mau baca tinggal klik".
// Keterangan di panel admin ditulis panjang supaya orang baru paham — tapi
// bagi yang sudah hafal, dinding teks itu cuma mendorong isi panel ke bawah
// layar setiap kali halaman dibuka.
//
// JUDUL IKUT MASUK KE SINI, bukan ditinggal di pemanggil: tombolnya harus
// duduk sebaris dengan judul sementara kotak keterangannya turun ke bawah.
// Kalau pemanggil yang merangkai sendiri, tiap pemakaian bisa menaruhnya
// berbeda — dan kotak yang nyasar ke dalam baris judul membuat judulnya
// terdorong gepeng ke samping.
//
// DISEMBUNYIKAN LEWAT CSS, bukan dilepas dari halaman: keterangan di dalamnya
// sering memuat ANGKA yang dihitung ulang tiap render (mis. "sudah terisi 376
// dari 500"). Melepasnya dari DOM membuat angka itu berhenti ikut menghitung
// selama tertutup, dan yang terbaca saat dibuka lagi bisa angka lama.
import { useId, useState, type ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BantuanSingkat({
  judul,
  label = "Lihat keterangan",
  children,
}: {
  /** Judul bagian — digambar sebaris dengan tombol "?". */
  judul: ReactNode;
  /** Dibacakan pembaca layar & muncul saat kursor didiamkan di atas tombol. */
  label?: string;
  children: ReactNode;
}) {
  const [buka, setBuka] = useState(false);
  // id dibuat React, bukan ditulis tangan: komponen ini dipakai lebih dari
  // sekali dalam satu halaman, dan id kembar membuat aria-controls menunjuk
  // kotak yang salah.
  const id = useId();

  return (
    <div>
      <div className="flex items-center gap-2">
        {judul}
        <button
          type="button"
          onClick={() => setBuka((b) => !b)}
          aria-expanded={buka}
          aria-controls={id}
          title={label}
          className={cn(
            "inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-zinc-400 transition",
            "hover:border-amber-500 hover:text-amber-400",
            // Saat terbuka tombolnya ikut berubah — tanpa itu, tidak ada
            // petunjuk tombol mana yang membuka kotak yang sedang terlihat.
            buka && "border-amber-500 bg-amber-500/15 text-amber-400",
          )}
        >
          <HelpCircle className="size-4" aria-hidden="true" />
          <span className="sr-only">{label}</span>
        </button>
      </div>

      <div
        id={id}
        className={cn(
          "mt-3 space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-400",
          !buka && "hidden",
        )}
      >
        {children}
      </div>
    </div>
  );
}
