"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import FilterFilmPopup from "./FilterFilmPopup";

/**
 * Tombol FILTER di ujung kanan baris tab — PEMICU pop up "Filter Film".
 *
 * ⚠️ ISINYA BERGANTI TOTAL 2026-11-23 (owner: *"isi filter samakan dengan
 * filter di bawah"*). Jangan dikembalikan mengira sedang memperbaiki.
 *   DULU: dropdown rakitan sendiri berisi 3 pengurutan + daftar genre + daftar
 *         tahun yang DIHITUNG dari katalog, masing-masing tautan ke /discover.
 *   KINI: tombol ini membuka `FilterFilmPopup` — pop up yang SAMA PERSIS dengan
 *         yang dibuka tombol "Filter" di bar bawah HP.
 *
 * KENAPA DIGANTI, bukan sekadar permintaan selera: sampai hari ini situs punya
 * DUA alat penyaring yang isinya berbeda — dropdown di sini (3 pengurutan,
 * genre, tahun) dan pop up di bar bawah (6 dropdown: urutan, jenis, 2 genre,
 * negara, tahun). Penonton yang memakai HP lalu membuka situs yang sama di
 * komputer mendapat alat yang bukan cuma beda bentuk, tapi beda KEMAMPUAN.
 * Satu komponen untuk keduanya = mustahil menyimpang lagi (§3.3).
 *
 * 🪤 BUG YANG IKUT TERBAWA PERGI: dropdown lama memuat tautan
 * `/discover?sort=judul`, padahal nilai yang dikenal `title` — jadi "Judul A-Z"
 * diklik lalu menampilkan katalog apa adanya. Sempat diperbaiki beberapa jam
 * sebelum dropdown-nya dibuang. Pop up penggantinya membaca `SORT_OPTIONS`
 * langsung dari lib/discover.ts, jadi seluruh kelas salah-ketik itu tak bisa
 * kambuh di sini lagi.
 *
 * ⚠️ PROP `dramas` DILEPAS, dan itu WAJIB — bukan kerapian. Komponen ini kini
 * ber-"use client", sedangkan pemanggilnya (`TabKatalogTampilan`) komponen
 * SERVER. Prop apa pun yang menyeberang batas itu ikut dikirim ke browser
 * sebagai data di dalam HTML; `dramas` berisi seluruh katalog beserta
 * sinopsisnya. Pop up penggantinya mengambil katalog sendiri lewat
 * `/api/dramas` SAAT DIBUKA, jadi pengunjung yang tak pernah menyentuh filter
 * tidak membayar ongkos datanya sama sekali.
 *
 * Tombolnya sendiri HANYA tergambar di layar komputer — aturan itu dipasang
 * pemanggilnya, bukan di sini; alasannya ada di `TabKatalogTampilan.tsx`.
 */
export default function FilterKatalog() {
  const [terbuka, setTerbuka] = useState(false);

  return (
    <>
      <Button
        size="sm"
        type="button"
        onClick={() => setTerbuka(true)}
        aria-haspopup="dialog"
        aria-expanded={terbuka}
        // Bayangan emas senada tombolnya — sepadan dengan tab aktif di
        // sebelahnya, supaya keduanya terbaca sebagai satu baris kontrol
        // yang terangkat (owner 2026-09-26: "kasih shadow biar nampak pro").
        //
        // ⚠️ Tulisannya GELAP di atas emas. Emas itu warna TERANG: teks putih
        // di `emas-500` = 2,04:1 (praktis lenyap), teks gelap = 9,56:1.
        className="h-9 shrink-0 gap-1.5 rounded-sm bg-emas-500 px-3 text-[11px] font-extrabold uppercase tracking-wide text-gelap-950 shadow-lg shadow-emas-600/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emas-400 hover:shadow-xl md:text-xs"
      >
        <SlidersHorizontal className="size-3.5" />
        Filter
        <ChevronDown className="size-3.5" />
      </Button>

      {/* ⚠️ DIPASANG HANYA SAAT TERBUKA, dan ini BEDA dari cara `BottomNav`
          memakainya (di sana ia selalu terpasang). Bukan kelalaian — sebabnya
          dua, keduanya nyata:
            1. Pemanggil tombol ini komponen SERVER yang dirender di tiap
               halaman katalog. `FilterFilmPopup` memanggil `useRouter()` di
               badan fungsinya, jadi memasangnya terus-menerus menyalakan hook
               itu untuk tombol yang mungkin tak pernah diklik.
            2. Enam berkas tes merender baris tab ini tanpa membungkusnya
               dengan konteks router Next. Dengan dipasang terus, keenamnya
               harus mulai mem-mock `next/navigation` — enam berkas berubah
               demi satu tombol.
          Ongkosnya: animasi muncul Radix tidak sempat berjalan pada pembukaan
          pertama. Dipilih sadar, bukan tak terlihat. */}
      {terbuka && (
        <FilterFilmPopup terbuka onTutup={() => setTerbuka(false)} />
      )}
    </>
  );
}
