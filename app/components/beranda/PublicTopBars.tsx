"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import GenreStrip from "./GenreStrip";
import SearchBar from "./SearchBar";

/**
 * Kepala halaman DEPAN (sebelum login): bar cari + strip genre, bentuknya sama
 * persis dengan /beranda.
 *
 * Bedanya cuma arti: di sini belum ada grid untuk disaring, jadi pencarian &
 * genre MELEMPAR ke /discover. Halaman itu memang publik (bisa dibuka tanpa
 * login), jadi tautan ini tidak membuka apa pun yang tadinya tertutup.
 */
export default function PublicTopBars({ genres }: { genres: string[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const cari = () => {
    const q = query.trim();
    router.push(q ? `/discover?q=${encodeURIComponent(q)}` : "/discover");
  };

  return (
    <>
      {/* top-0: header halaman depan TIDAK menempel (posisinya `relative`),
          jadi bar ini yang jadi elemen menempel paling atas — beda dari
          /beranda yang harus memberi ruang h-14 untuk navbar. */}
      <SearchBar
        value={query}
        onValueChange={setQuery}
        onSubmit={cari}
        className="sticky top-0"
      />
      <GenreStrip
        genres={["Semua", ...genres]}
        hrefFor={(g) =>
          g === "Semua" ? "/discover" : `/discover?cat=${encodeURIComponent(g)}`
        }
        moreHref="/discover"
      />
    </>
  );
}
