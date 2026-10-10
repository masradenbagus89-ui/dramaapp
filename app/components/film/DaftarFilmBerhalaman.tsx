"use client";

import { useMemo, useRef, useState } from "react";
import type { PlaylyVideoPublik } from "@/lib/playly-publik";
import { pageOfCatalog } from "@/lib/beranda-catalog";
import PlaylyVideoGrid from "@/app/components/PlaylyVideoGrid";
import NomorHalaman from "@/app/components/NomorHalaman";

/**
 * Berapa film per halaman.
 *
 * Dipilih 24, bukan 60 seperti grid poster drama (`CATALOG_PER_PAGE`): kartu
 * film berbentuk MELINTANG 16:9 dan lebarnya minimal 240px — tiga kali luas
 * poster tegak. Dengan 60 kartu, satu halaman jadi gulungan sangat panjang dan
 * nomor halaman di dasarnya praktis tak pernah tercapai.
 */
export const FILM_PER_HALAMAN = 24;

/**
 * Daftar film + nomor halaman di bawahnya (owner 2026-10-10: tombol "Lainnya"
 * di halaman depan harus mendarat di daftar yang benar-benar bisa ditelusuri,
 * bukan satu halaman raksasa berisi ratusan film sekaligus).
 *
 * KENAPA nomor halaman dihitung DI BROWSER, bukan lewat `?page=` di alamat:
 * halaman /film disimpan hasil render-nya (`revalidate = 300`). Begitu ia
 * membaca `searchParams`, Next membangunnya ulang untuk TIAP pengunjung dan
 * angka itu jadi percuma — halaman paling berat di situs ini justru kehilangan
 * simpanannya. Seluruh daftar memang tetap dikirim ke browser, tapi itu sudah
 * terjadi sejak dulu (PlaylyVideoGrid menerima semuanya); yang berubah hanya
 * berapa yang DIGAMBAR.
 *
 * ⚠️ Konsekuensi yang disengaja: nomor halaman TIDAK masuk alamat, jadi
 * "halaman 5" tak bisa dibagikan atau di-bookmark. Pola yang sama sudah
 * dipakai grid /beranda. Kalau nanti dibutuhkan, cara menaikkannya: pindah ke
 * `?page=` + ubah halaman /film jadi dinamis, dengan konsekuensi performa di
 * atas.
 */
export default function DaftarFilmBerhalaman({
  videos,
}: {
  videos: PlaylyVideoPublik[];
}) {
  const [halaman, setHalaman] = useState(1);
  const atasRef = useRef<HTMLDivElement>(null);

  const potongan = useMemo(
    () => pageOfCatalog(videos, halaman, FILM_PER_HALAMAN),
    [videos, halaman],
  );

  const pindah = (nomor: number) => {
    setHalaman(nomor);
    // Tanpa ini, menekan "2" di dasar halaman memulangkan daftar baru yang
    // dimulai jauh di atas layar — penonton melihat bagian bawah daftar dan
    // mengira tombolnya tidak bekerja.
    atasRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div>
      {/* scroll-mt menahan baris pertama dari balik navbar yang menempel. */}
      <div ref={atasRef} className="scroll-mt-20" />

      <p className="mb-4 text-xs text-zinc-500">
        Menampilkan {potongan.from}&ndash;{potongan.to} dari {potongan.total}{" "}
        judul
      </p>

      <PlaylyVideoGrid videos={potongan.items} />

      <NomorHalaman
        halaman={potongan.page}
        totalHalaman={potongan.totalPages}
        onPindah={pindah}
        label="Halaman film"
      />
    </div>
  );
}
