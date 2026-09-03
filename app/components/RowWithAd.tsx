"use client";

import type { ComponentProps, CSSProperties } from "react";
import ContentRow from "./ContentRow";
import AdBanner from "./AdBanner";

// Satu baris film + kolom iklan di KANANNYA (gaya rail seperti Netflix), bukan
// iklan melintang di bawah baris. Alasannya: iklan melintang memutus alur
// menelusuri deretan drama, sedangkan kolom di samping ikut satu garis dengan
// barisnya sehingga mata penonton tetap mengalir ke poster.
//
// Poster tetap yang MENANG secara visual — kolom iklan sengaja tidak diberi
// judul, bayangan, atau warna mencolok sendiri; ia hanya memakai bingkai yang
// sama dengan slot iklan lain.
//
// Berdampingan baru menyala di xl (>=1280px), BUKAN lg (1024px). Diukur: pada
// 1024 carousel cuma kebagian 412px = sekitar 2,5 poster — terlalu sesak, iklan
// jadi terasa merebut tempat konten. Di bawah xl grid jatuh jadi satu kolom
// sehingga tampilannya kembali bertumpuk seperti sebelum perubahan ini.

/**
 * Tinggi kolom iklan di layar lebar (px). Disamakan dengan tinggi satu baris
 * poster: poster md 144px x rasio 3/4 = 192, + judul & label ~40, + header
 * baris ~36 = ~268. Jadi tepi atas & bawah iklan lurus dengan barisnya.
 */
const RAIL_H = 270;

/**
 * Lebar kolom iklan (px). RAIL_W / RAIL_H = 2,0 — SENGAJA disamakan dengan
 * rasio creative iklan yang terpasang (1774x887) supaya gambar mengisi penuh
 * tanpa pita kosong. Creative berbentuk lain tetap tampil UTUH (tidak pernah
 * dipotong), hanya menyisakan ruang — konsekuensi yang disadari, bukan bug.
 */
const RAIL_W = 540;

type Props = ComponentProps<typeof ContentRow>;

export default function RowWithAd(props: Props) {
  // Baris bisa kosong (mis. "Rating Tertinggi" saat belum ada drama ber-rating)
  // dan ContentRow mengembalikan null. Iklannya JANGAN ikut lenyap — slot ini
  // sumber pendapatan. Jatuhkan ke bentuk melintang seperti sebelumnya.
  if (props.dramas.length === 0) {
    return (
      <div className="px-4 md:px-0">
        <AdBanner />
      </div>
    );
  }

  return (
    <div
      // Lebar kolom disimpan sebagai satu variabel supaya angkanya tidak
      // tercecer di dua tempat lalu bergeser sendiri saat salah satu diubah.
      style={{ "--ad-rail-w": `${RAIL_W}px` } as CSSProperties}
      className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_var(--ad-rail-w)] xl:gap-6"
    >
      {/* min-w-0 WAJIB. Tanpa ini kolom grid memakai lebar KONTEN (seluruh
          poster berjejer, ribuan px), grid melar melewati layar, dan halaman
          jadi bisa digeser ke samping. Kegagalannya SENYAP — tidak ada error,
          hanya layout yang bocor. */}
      <div className="min-w-0">
        <ContentRow {...props} />
      </div>

      {/* min-w-0 di sini SAMA WAJIBNYA dengan di kolom carousel: kotak iklan
          punya lebar definit 540px, dan grid item tanpa min-w-0 menolak
          menyusut di bawah lebar isinya — di layar 390px iklannya tetap 540px,
          halaman bocor bisa digeser ke samping. Terbukti: bug ini benar-benar
          terjadi dan tertangkap uji sebelum sampai ke penonton.

          self-center: kolom iklan ditengahkan terhadap tinggi barisnya, jadi
          tetap sejajar walau tinggi baris berubah (mis. label "Lanjut Menonton"
          yang dua baris). Sengaja BUKAN flex container — kotak iklan memakai
          lebar definit + max-width persen, yang tidak punya acuan jelas kalau
          induknya ikut menyusut mengikuti isi. */}
      <div className="min-w-0 px-4 md:px-0 xl:self-center">
        <AdBanner maxCreativeHeight={RAIL_H} />
      </div>
    </div>
  );
}
