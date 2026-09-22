"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STRIP_KATALOG, alamatCari, type NavMenu } from "@/lib/nav-katalog";
import SearchBar, { KELAS_MENEMPEL_KEPALA } from "./SearchBar";
import StripKatalog from "./StripKatalog";
import { chromeKatalog } from "./KepalaKatalog";

type Props = {
  /** Isi menu dropdown, dihitung DI SERVER oleh `buildNavMenus`. */
  menus: NavMenu[];
};

/** Alamat halaman hasil pencarian — dipakai `action` form saat JS belum aktif. */
const TUJUAN_CARI = "/discover";

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
 * tiruan), dengan susunan dari `chromeKatalog()` dan posisi menempel dari
 * `KELAS_MENEMPEL_KEPALA` — keduanya dipakai bersama kepala aslinya, jadi
 * bentuk & posisinya mustahil menyimpang dan tak ada yang "melompat" saat
 * isinya masuk.
 *
 * ⚠️ KOREKSI PENTING atas versi pertama komponen ini (tinjauan hari yang
 * sama). Komentar versi pertama mengaku kotak carinya "sengaja dibuat
 * berfungsi" karena `onSubmit` dipasang. **Itu SALAH justru di jendela
 * kerangka ini satu-satunya terlihat:** sebelum JavaScript aktif React belum
 * memasang satu pun penangan, jadi `onSubmit`/`onValueChange` diam. Lebih
 * buruk lagi, menekan Enter menjalankan pengiriman form BAWAAN browser — dan
 * karena form-nya tak punya `action` dan kotaknya tak punya `name`, yang
 * terjadi cuma memuat ulang halaman dengan KETIKAN PENONTON HILANG.
 *
 * Sekarang benar-benar berfungsi TANPA JavaScript: form membawa
 * `action={TUJUAN_CARI}` dan kotaknya `namaKolom="q"`, jadi Enter melakukan
 * pencarian sungguhan lewat browser. Sesudah JavaScript aktif, `onSubmit`
 * (yang memanggil `preventDefault()`) mengambil alih dan memakai
 * `alamatCari()` — alamat yang SAMA, sehingga hasilnya tak berbeda apa pun
 * keadaannya. Penjaganya: tests/kerangka-discover.test.ts.
 *
 * Yang TIDAK ditiru: sorotan chip yang sedang aktif (`activeHref`). Nilainya
 * berasal dari penyaring di alamat URL — justru data yang hanya bisa dibaca
 * `DramaBrowser` sesudah aktif. Mengarangnya di sini berarti menyorot chip
 * yang belum tentu benar, jadi strip ini tampil tanpa sorotan sampai isinya
 * masuk.
 *
 * ❓ Yang MASIH belum ditangani (jujur, bukan diklaim beres): fokus keyboard
 * bisa terlempar ke awal halaman saat kerangka ditukar isi sungguhan, sebab
 * React mengganti seluruh pohon elemennya. Belum ada pengukurannya, jadi
 * belum diperbaiki — jangan klaim aman tanpa mengukur.
 */
export default function KerangkaKepalaKatalog({ menus }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  return (
    // aria-busy memberi tahu pembaca layar bahwa isi halaman belum lengkap.
    // Tulisan "Memuat..." yang lama memang buruk dipandang, tapi ia SATU-SATUNYA
    // isyarat bahwa halaman sedang bekerja; menggantinya dengan kepala situs
    // yang terlihat "sudah jadi" justru menghapus isyarat itu tanpa gantinya.
    <div aria-busy="true">
      <SearchBar
        value={query}
        onValueChange={setQuery}
        onSubmit={() => router.push(alamatCari(query))}
        className={KELAS_MENEMPEL_KEPALA}
        chrome={chromeKatalog(menus)}
        action={TUJUAN_CARI}
        namaKolom="q"
      />
      <StripKatalog items={STRIP_KATALOG} />
      {/* Pola yang sama dipakai pemutar video (EmbedPlayer.tsx:52): terlihat
          hanya oleh pembaca layar, tak mengubah tampilan sedikit pun. */}
      <span className="sr-only" role="status">
        Memuat katalog drama…
      </span>
    </div>
  );
}
