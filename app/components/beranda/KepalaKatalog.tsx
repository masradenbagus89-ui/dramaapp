"use client";

import Link from "next/link";
import CoinChip from "../CoinChip";
import MenuAkun from "../MenuAkun";
import MenuKatalogHp from "./MenuKatalogHp";
import { usePenonton } from "../usePenonton";
import type { NavMenu } from "@/lib/nav-katalog";
import NavMenus from "./NavMenus";
import type { SearchBarChrome } from "./SearchBar";

/**
 * KEPALA SITUS untuk halaman berkatalog (/beranda & /discover).
 *
 * Kenapa ada: sampai 2026-09-21 kedua halaman itu memakai DUA baris kepala —
 * navbar hitam (TopNav) di atas bar cari merah. Owner meminta bentuk situs
 * katalog pembanding: cukup DUA baris (bar cari + strip kuning). Navbar hitam
 * karena itu disembunyikan di kedua halaman, dan isinya pindah ke sini.
 *
 * ⚠️ TOMBOL GARIS-TIGA (`MenuAplikasi`) DIHAPUS 2026-11-14 atas permintaan
 * owner ("sembunyikan menu masuk sebagai pengelola, dan hilangkan garis 3").
 * Ia satu-satunya hamburger di seluruh aplikasi, dipakai /beranda, /discover,
 * dan halaman 404.
 *
 * Komentar lama di sini berbunyi "TIDAK boleh sekadar dibuang — inilah
 * satu-satunya jalan menuju Playly, Admin, dan tombol Keluar". Itu benar pada
 * 2026-09-21 dan sudah TIDAK benar lagi; diperiksa satu per satu sebelum
 * dihapus, bukan diasumsikan:
 *   • Admin & Keluar  → pindah ke `MenuAkun` (avatar) sejak 2026-09-26, dan
 *     `TombolAkun` di bawah memasangnya di kedua halaman ini.
 *   • Beranda         → logo di `LogoSitus` menuju ke sana.
 *   • Playly          → sudah dilepas dari daftarnya sejak 2026-09-26.
 *   • Masuk/Daftar    → dijeda `AKUN_PENONTON_ENABLED` sejak 2026-10-29.
 *
 * ⚠️ YANG BENAR-BENAR HILANG, dicatat supaya tidak dikira kelalaian:
 *   1. Tautan "Masuk sebagai pengelola" di /beranda & /discover. Kaki situs
 *      masih memuatnya (`FooterSitus.tsx`), tapi kaki itu TIDAK digambar di
 *      /beranda — jadi di halaman itu satu-satunya jalan ke panel admin kini
 *      mengetik alamat `/login` sendiri. Itu memang yang diminta owner.
 *      Menyembunyikan tautan BUKAN kontrol izin (`skills/auth/SKILL.md`):
 *      penjagaannya tetap di server — password, rate-limit, cookie sesi
 *      bertanda tangan. Jadi keamanan tidak naik maupun turun karena ini.
 *   2. Peringatan "Masuk ulang dengan password admin" (`perluMasukUlang`) di
 *      kedua halaman ini. Ia masih tergambar sebagai pita di `TopNav`, yang
 *      hidup di /admin · /profile · /history · /my-list · /shorts.
 */

/**
 * Lambang + nama situs di ujung kiri bar cari.
 *
 * SATU komponen yang dipakai halaman depan (`PublicTopBars`) DAN halaman
 * berkatalog — sebelumnya markup-nya disalin di dua tempat dan sempat
 * menyimpang (halaman depan memakai kotak kuning berisi huruf "D", yang lain
 * memakai lambang). Ukurannya dinaikkan 2026-09-21 atas permintaan owner:
 * lambang 28px → 36px dan nama situs 16px → 20px, sejajar dengan situs katalog
 * pembanding. 36px sengaja dipilih karena sama dengan tinggi kotak cari
 * (`h-9`), jadi barnya TIDAK ikut meninggi.
 *
 * Nama situs disembunyikan di layar paling sempit: di bawah ±640px ia memakan
 * ruang yang dibutuhkan kotak cari, dan lambangnya sendiri sudah mengenalkan
 * situs.
 */
export function LogoSitus({
  href = "/beranda",
  tanpaTautan = false,
}: {
  href?: string;
  /**
   * Gambar lambangnya saja, TANPA `<Link>` di dalamnya.
   *
   * Dipakai `SearchBarChrome.brandHp`: di HP logo ini duduk DI DALAM sebuah
   * `<button>` pembuka menu katalog (owner 2026-11-21). Menaruh `<a>` di dalam
   * `<button>` adalah HTML tidak sah — browser boleh merombak susunannya
   * sendiri, dan pembaca layar mengumumkan dua kontrol bertumpuk. Jadi versi
   * tanpa tautan ini BUKAN kerapian, melainkan syarat.
   */
  tanpaTautan?: boolean;
}) {
  const KELAS = "flex shrink-0 items-center gap-2";
  const isi = (
    <>
      {/* LOGO LAYARINDO — dipasang 2026-11-23 dari gambar yang dikirim owner.
          ✅ Keadaan DUA NAMA sudah DITUTUP 2026-11-24: owner memutuskan seluruh
          situs memakai "Layarindo", jadi `SITE_NAME` di lib/site.ts ikut diganti
          dari "DramaKu" dan 68 teks di 41 berkas disamakan. Kalau kamu menemukan
          "DramaKu" sekarang, itu KOMENTAR yang memang menyimpan sejarah —
          sengaja TIDAK ditulis ulang, sebab catatan yang menghapus masa lalunya
          sendiri berhenti bisa menjelaskan kenapa sesuatu begini bentuknya.

          ⚠️ WARNA LOGO DIPETAKAN ULANG 2026-11-24 (hijau sage → emas), saat tema
          situs sudah pindah ke gelap+emas dan lambang hijaunya bertabrakan.
          Owner memilih varian "lambang emas, tulisan tetap krem" dari 4 contoh.
          Caranya PERSIS sama dengan `bar-latar-emas.jpg`: tiap piksel yang
          HIJAU (g lebih besar dari r dan b, selisih >10) dipetakan menurut
          KECERAHANNYA ke tangga #3a1d04 → emas-700 → emas-500 → emas-300, jadi
          bentuk & bayangannya utuh. Piksel krem/putih tidak disentuh — itulah
          yang membuat tulisannya tetap menonjol. Terukur sesudahnya: nol piksel
          hijau tersisa, ukuran tetap 423x96 (jadi `width`/`height` di bawah
          tidak perlu diubah). 🪤 JANGAN pakai `hue-rotate`: ia ikut menggeser
          bagian krem jadi merah muda. Skripnya sekali pakai dan sengaja tidak
          disimpan di repo — caranya di sini, bukan di berkas sisa.

          Gambar aslinya banner 1672x941 berlatar HITAM pekat tanpa lapisan
          tembus pandang (950 KB). Yang dipakai di sini hasil potongan: latar
          dibuang jadi transparan, baris kecil "NONTON LEBIH SERU" dihapus
          (di tinggi 36px ia cuma setinggi ~4px — jadi noda, bukan tulisan),
          lalu dikecilkan ke 40 KB. Berkas asli tersimpan di luar repo.
          🪤 Latar TIDAK bisa dibuang dengan memilah "yang gelap": terukur,
          gelombang hiasan di pojok gambar aslinya (0,34–0,37) justru LEBIH
          TERANG daripada sebagian badan logo. Yang memisahkan keduanya LETAK,
          bukan warna. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        data-nama-situs
        src="/logo-layarindo.png"
        alt="Layarindo"
        width={159}
        height={36}
        className="h-9 w-auto shrink-0 object-contain"
      />
      {/* Versi LAMBANG SAJA, dipakai saat kotak cari dibuka di HP — aturan
          penukarnya di SearchBar.tsx. `alt=""` + `aria-hidden`: ia kembaran
          visual dari logo di atas, jadi pembaca layar tidak perlu menyebut
          nama situs dua kali. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        data-lambang-saja
        src="/logo-layarindo-lambang.png"
        alt=""
        aria-hidden="true"
        width={50}
        height={36}
        className="hidden h-9 w-auto shrink-0 object-contain"
      />

    </>
  );

  if (tanpaTautan) return <span className={KELAS}>{isi}</span>;
  return (
    <Link href={href} className={KELAS}>
      {isi}
    </Link>
  );
}

/**
 * Ujung KANAN bar cari (`SearchBarChrome.trailing`): saldo koin + avatar akun.
 *
 * Tombol Masuk · Daftar tetap TIDAK di sini. Owner 2026-09-21: keduanya dobel
 * dengan ajakan yang sudah ada di badan halaman, dan bar ini harus seringkas
 * situs katalog pembanding. Dulu keduanya pindah ke menu garis-tiga; sejak
 * tombol itu dilepas (2026-11-14) mereka memang tidak tergambar di mana pun —
 * dan itu tidak menghilangkan apa-apa, karena `AKUN_PENONTON_ENABLED` sudah
 * menjedanya sejak 2026-10-29. Saldo koin
 * tetap di luar menu karena ia ANGKA yang perlu dilihat sekilas —
 * menyembunyikannya di balik satu klik membuat penonton tidak tahu sisa
 * koinnya sebelum membuka episode berbayar.
 *
 * Avatar ditambahkan 2026-09-26 dan itu WAJIB, bukan hiasan: "Profile" dilepas
 * dari daftar menu pada hari yang sama, jadi tanpa avatar di sini halaman
 * berkatalog kehilangan satu-satunya jalan ke halaman Profil di layar komputer
 * (`BottomNav` cuma muncul di HP). `MenuAkun` diam sendiri saat belum login,
 * jadi bar tetap seringkas sebelumnya untuk pengunjung baru.
 *
 * Sejak tombol garis-tiga dilepas (2026-11-14) perannya BERTAMBAH: avatar ini
 * kini juga satu-satunya jalan ke **Admin** dan tombol **Keluar** di /beranda
 * & /discover. Dijaga tests/kepala-situs.test.ts.
 */
export function TombolAkun() {
  const { user, mounted } = usePenonton();

  if (!mounted || !user) return null;
  return (
    <div className="flex items-center gap-2">
      <CoinChip />
      {/* AVATAR HANYA UNTUK ADMIN (owner 2026-11-21: *"icon M dihilangkan
          karena viewer tidak perlu buat akun"*, lalu dipertegas: *"ini khusus
          untuk viewer bukan akun admin"*).

          ⚠️ Disaring per-PERAN, bukan disembunyikan per-ukuran-layar, dan itu
          disengaja: di layar komputer avatar ini SATU-SATUNYA jalan ke **Admin**
          dan tombol **Keluar** dari /beranda & /discover (tombol garis-tiga
          dilepas 2026-11-14, dan BottomNav cuma muncul di HP). Menyembunyikannya
          dari semua orang akan mengunci owner keluar dari panel admin di kedua
          halaman itu — tanpa satu pun error. Dengan saringan peran, owner tetap
          melihatnya di mana pun, dan penonton tidak.

          ❓ Akibat yang diketahui & diterima: penonton biasa yang TERLANJUR
          punya akun tidak lagi melihat tombol Keluar di /beranda & /discover.
          Jalannya masih ada — /profile memasang `TopNav`
          (lib/navigasi-halaman.ts: AKAR_BERNAVBAR_ATAS) yang membawa `MenuAkun`
          yang sama, dicapai lewat tombol "Profile" di BottomNav pada HP. Di
          layar komputer ia harus mengetik /profile sendiri.

          Menyembunyikan tautan BUKAN kontrol izin: penjagaannya tetap di server
          (password, rate-limit, cookie bertanda tangan), jadi keamanan tidak
          naik maupun turun karena baris ini (skills/auth/SKILL.md). */}
      {user.role === "admin" && <MenuAkun />}
    </div>
  );
}

/**
 * Susunan kepala situs untuk halaman BERKATALOG: logo di kiri, deretan menu
 * dropdown di tengah, tombol akun di kanan.
 *
 * Tombol garis-tiga dulu berdiri di kiri logo; dilepas 2026-11-14 atas
 * permintaan owner — alasan + daftar jalan yang tersisa ada di komentar
 * kepala berkas ini.
 *
 * ⚠️ Kenapa jadi fungsi bersama dan bukan ditulis di tiap pemakainya
 * (owner 2026-09-22): susunan ini dipakai TIGA kali — kepala `/beranda`
 * (`CatalogBrowser`), kepala `/discover` (`DramaBrowser`), dan kerangka
 * pemuatan `/discover` (`KerangkaKepalaKatalog`). Kalau ditulis berulang,
 * salah satu pasti tertinggal saat yang lain diubah, dan akibatnya kepala
 * situs "melompat" tepat di depan mata penonton begitu halaman aktif — atau
 * dua halaman terasa seperti dua situs. Berkas ini sudah tiga kali kena
 * masalah menyimpang seperti itu (logo, lalu tulisan kotak cari dua kali),
 * jadi sumbernya sengaja dikunci satu.
 *
 * KOREKSI: versi pertama komentar ini menulis "dipakai DUA kali" dan
 * mengaku sumbernya sudah dikunci, padahal `CatalogBrowser` masih menyalin
 * susunannya dengan tangan — salinan ketiga yang tak terlihat siapa pun.
 * Ditemukan lewat tinjauan hari yang sama dan sudah disatukan.
 */
export function chromeKatalog(menus: NavMenu[]): SearchBarChrome {
  return {
    brand: <LogoSitus />,
    /* Versi tanpa tautan untuk tombol pembuka menu di HP (owner 2026-11-21:
       *"ketika di klik D keluar genre, series, populer, negara"*). Dipasang di
       sini — bukan di tiap pemakai — supaya keempat pemakai `chromeKatalog`
       (/beranda, /discover, kerangka pemuatannya, dan CatalogBrowser)
       mustahil menyimpang. */
    brandHp: <LogoSitus tanpaTautan />,
    /* `undefined` saat katalog kosong, BUKAN elemen kosong. `NavMenus` memang
       memulangkan null, tapi ELEMEN-nya tetap ada sehingga gerbang
       `{chrome?.menus && …}` di SearchBar tetap terpenuhi — hasilnya wadah
       `w-full` hampa yang menumbuhkan satu baris mati selebar layar di HP,
       tepat dalam keadaan panel pop up juga tidak dipasang. */
    menus: menus.length > 0 ? <NavMenus menus={menus} /> : undefined,
    /* Isi panel pop up menu katalog di HP (owner 2026-11-21). Dikosongkan saat
       katalog kosong supaya mengetuk logo tidak membuka panel HAMPA —
       `NavMenus` memang memulangkan null kalau daftarnya kosong, tapi
       ELEMEN-nya tetap ada sehingga syarat `chrome.menus` selalu terpenuhi.
       Dalam keadaan itu logo kembali jadi tautan biasa ke beranda. */
    menusHp: menus.length > 0 ? <MenuKatalogHp menus={menus} /> : undefined,
    trailing: <TombolAkun />,
  };
}
