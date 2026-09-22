"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STRIP_KATALOG, type NavMenu } from "@/lib/nav-katalog";
import SearchBar from "./SearchBar";
import StripKatalog from "./StripKatalog";
import { chromeKatalog } from "./KepalaKatalog";

type Props = {
  /** Isi menu dropdown, dihitung DI SERVER oleh `buildNavMenus`. */
  menus: NavMenu[];
};

/**
 * Kepala situs /discover yang tergambar SELAGI katalognya belum siap.
 *
 * Kenapa ada (owner 2026-09-22): `app/discover/page.tsx` membungkus
 * `DramaBrowser` dalam `<Suspense>` — wajib, karena komponen itu memakai
 * `useSearchParams()`. Akibatnya HTML yang dikirim server untuk halaman ini
 * TIDAK memuat isi apa pun, dan sampai 2026-09-22 penggantinya cuma tulisan
 * "Memuat..." di layar hitam kosong: tanpa logo, tanpa kotak cari, tanpa
 * penanda apa pun bahwa ini DramaKu. Selama sepersekian detik sebelum
 * JavaScript aktif, halaman katalog utama terbaca seperti situs rusak.
 *
 * Kerangka ini memakai komponen bar merah & strip yang SUNGGUHAN (bukan
 * tiruan), dengan susunan dari `chromeKatalog()` yang sama persis dipakai
 * kepala aslinya — jadi bentuknya mustahil menyimpang dan tak ada yang
 * "melompat" saat isinya masuk.
 *
 * Kotak carinya SENGAJA dibuat berfungsi, bukan dimatikan: penonton yang
 * mengetik di jendela sesaat ini tetap terlayani — ketikannya melempar ke
 * /discover?q=..., dan `DramaBrowser` membaca alamat itu begitu aktif. Kotak
 * yang tergambar tapi diam adalah kerusakan yang lebih membingungkan
 * daripada tulisan "Memuat...", jadi menggambarnya tanpa menyambungkannya
 * bukan pilihan.
 *
 * Yang TIDAK ditiru: sorotan chip yang sedang aktif (`activeHref`). Nilainya
 * berasal dari penyaring di alamat URL — justru data yang hanya bisa dibaca
 * `DramaBrowser` sesudah aktif. Mengarangnya di sini berarti menyorot chip
 * yang belum tentu benar, jadi strip ini tampil tanpa sorotan sampai isinya
 * masuk.
 */
export default function KerangkaKepalaKatalog({ menus }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const cari = () => {
    const q = query.trim();
    router.push(q ? `/discover?q=${encodeURIComponent(q)}` : "/discover");
  };

  return (
    <>
      {/* `sticky top-0` disamakan dengan kepala asli di DramaBrowser — beda
          posisi menempel membuat bar bergeser saat isinya masuk. */}
      <SearchBar
        value={query}
        onValueChange={setQuery}
        onSubmit={cari}
        className="sticky top-0"
        chrome={chromeKatalog(menus)}
      />
      <StripKatalog items={STRIP_KATALOG} />
    </>
  );
}
