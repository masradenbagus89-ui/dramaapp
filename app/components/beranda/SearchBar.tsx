"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import DaftarSaran from "./DaftarSaran";
import { useDaftarSaran } from "./useDaftarSaran";
import type { SaranCari } from "@/lib/saran-cari";
import { alamatCari } from "@/lib/nav-katalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LATAR_BAR_MEREK,
  LATAR_PANEL_KATALOG_HP,
  SHELL,
  SOROT_BAR_MEREK,
  TEKS_BAR_MEREK,
} from "./shell";

/**
 * Slot "kepala situs" — hanya diisi halaman yang memakai bar ini sebagai
 * navigasi utama, bukan sekadar kotak cari.
 *
 * Dibungkus jadi SATU objek (bukan 3 prop terpisah) karena ketiganya selalu
 * datang bersama sebagai satu keputusan tata letak: "bar ini jadi navbar".
 */
export type SearchBarChrome = {
  /** Logo/identitas di ujung kiri. Halaman yang sudah punya TopNav mengosongkannya. */
  brand?: ReactNode;
  /**
   * Logo yang sama TAPI tanpa `<Link>` di dalamnya — dipakai sebagai isi tombol
   * pembuka menu katalog di HP (owner 2026-11-21).
   *
   * Diisi = perilaku HP berubah: deretan menu (`menus`) disembunyikan sampai
   * logo diklik. Dikosongkan = perilaku lama, menu selalu kelihatan. Jadi
   * pemakai yang belum mengisinya TIDAK ikut berubah.
   *
   * Dipisah dari `brand` karena `<a>` di dalam `<button>` adalah HTML tidak
   * sah — lihat `tanpaTautan` di KepalaKatalog.tsx.
   */
  brandHp?: ReactNode;
  /**
   * ISI panel pop up menu katalog di HP (owner 2026-11-21: *"jangan di jadikan
   * dropdown tapi seperti pop up aja biar terlihat keren"*). Lihat
   * `MenuKatalogHp.tsx`.
   *
   * Diisi = deretan menu `menus` disembunyikan di HP dan digantikan panel yang
   * naik dari bawah saat logo diketuk. Dikosongkan = perilaku lama, deretan
   * menu tetap tergambar. Jadi pemakai yang belum mengisinya TIDAK ikut
   * berubah — dan pemanggil boleh mengosongkannya saat katalog kosong supaya
   * tombolnya tidak membuka panel hampa.
   *
   * Wajib berpasangan dengan `brandHp`: tanpa logo versi tanpa-tautan, tidak
   * ada yang bisa jadi pemicunya.
   */
  menusHp?: ReactNode;
  /** Deretan menu dropdown katalog (lihat NavMenus.tsx). */
  menus?: ReactNode;
  /** Tombol di ujung kanan, mis. Masuk/Daftar. */
  trailing?: ReactNode;
};

/**
 * Teks abu-abu di dalam kotak cari — SATU sumber untuk SELURUH situs.
 *
 * Dipendekkan atas permintaan owner 2026-09-21 supaya sejajar dengan situs
 * katalog pembanding ("Cari judul film di Lk21"). Ini MURNI tulisan — yang
 * dicari tetap judul, kategori, dan sinopsis (lihat `cocokSemuaKata` di
 * lib/discover.ts), jadi memendekkan kalimatnya TIDAK mempersempit hasil.
 *
 * ⚠️ Kenapa dijadikan konstanta dan bukan ditulis dua kali (owner 2026-09-22):
 * situs punya DUA kotak cari — yang lebar di bar merah ini, dan yang kecil di
 * navbar hitam (app/components/TopNav.tsx). Keduanya mengirim ke /discover
 * dengan cara yang sama, tapi tulisannya sudah DUA KALI menyimpang karena
 * ditulis terpisah: navbar tertinggal di "Cari drama, kategori..." sementara
 * yang ini sudah diperbarui. Dua kotak berperilaku sama dengan tulisan beda
 * terbaca seperti dua situs berbeda. JANGAN tulis ulang teksnya di tempat
 * lain — impor konstanta ini. Penjaganya: tests/strip-katalog.test.ts.
 */
export const TEKS_KOTAK_CARI = "Cari film di DramaKu";

/**
 * Posisi menempel bar cari — SATU nilai untuk keempat pemakainya
 * (`PublicTopBars`, `CatalogBrowser`, `DramaBrowser`, `KerangkaKepalaKatalog`).
 *
 * ⚠️ Kenapa dikunci satu (owner 2026-09-22): nilai ini tadinya ditulis tangan
 * di keempat berkas. Kalau salah satu berbeda, bar cari BERGESER tepat saat
 * kerangka pemuatan ditukar isi sungguhan — poster yang mau diklik penonton
 * ikut melompat. Beda 56px (`top-14` vs `top-0`) sudah cukup terasa.
 */
export const KELAS_MENEMPEL_KEPALA = "sticky top-0";


type Props = {
  value: string;
  onValueChange: (value: string) => void;
  /** Dipanggil saat tombol cari ditekan / Enter. Halaman yang menyaring
   *  langsung di tempat (beranda) boleh mengabaikannya. */
  onSubmit?: () => void;
  placeholder?: string;
  /** Dropdown penyaring di kanan bar. Kosong = tombol "Filter" ikut disembunyikan. */
  filters?: ReactNode;
  /** Logo + menu + tombol kanan; lihat SearchBarChrome. */
  chrome?: SearchBarChrome;
  /** Untuk posisi menempel; pakai `KELAS_MENEMPEL_KEPALA`. */
  className?: string;
  /**
   * Alamat tujuan form saat JavaScript BELUM aktif. Diisi hanya oleh pemakai
   * yang pencariannya memang MELEMPAR ke halaman lain (bukan menyaring di
   * tempat). Kosong = form tanpa `action`, sama seperti sebelumnya.
   *
   * Kenapa perlu: sesudah JavaScript aktif, `onSubmit` di bawah memanggil
   * `preventDefault()` sehingga atribut ini tak berpengaruh sama sekali. Tapi
   * SEBELUM itu — dan itulah satu-satunya jendela kerangka pemuatan terlihat —
   * React belum memasang satu pun penangan, jadi menekan Enter menjalankan
   * pengiriman form BAWAAN browser. Tanpa `action` + `namaKolom`, pengiriman
   * itu cuma memuat ulang halaman dan KETIKAN PENONTON HILANG tanpa jejak.
   */
  action?: string;
  /** Nama kolom kotak cari, wajib diisi bila `action` dipakai (lihat di atas). */
  namaKolom?: string;
  /**
   * Ganti kotak cari di bar dengan TOMBOL ikon; kotaknya baru muncul sebagai
   * lapisan di atas halaman saat tombol diklik (owner 2026-10-29:
   * *"tombol search seperti pop up gitu"*).
   *
   * Kenapa jadi prop dan bukan diubah untuk semua pemakai: halaman `/discover`
   * adalah halaman HASIL PENCARIAN — di sana kotaknya wajib terlihat terus,
   * sebab penonton perlu melihat & menyunting kata kunci yang sedang berlaku.
   * Menyembunyikannya di balik satu klik justru membuat halaman itu terasa
   * kehilangan pencariannya.
   */
  modeTombol?: boolean;
  /**
   * Buka kotaknya SEJAK AWAL walau `modeTombol` menyala.
   *
   * Dipakai `/discover` saat halaman dibuka dengan kata kunci (`?q=…`): di
   * halaman HASIL pencarian, kata kunci yang sedang berlaku wajib terlihat —
   * kalau tersembunyi di balik tombol, penonton tidak tahu apa yang sedang
   * dicari dan tidak bisa menyuntingnya. Tanpa kata kunci, tombolnya tetap
   * tertutup seperti halaman lain, jadi tampilannya tetap seragam.
   */
  bukaAwal?: boolean;
  /**
   * Indeks judul untuk saran-saat-mengetik (owner 2026-11-07). Kosong = fitur
   * ini MATI di pemakai itu, tanpa efek samping apa pun.
   *
   * Sengaja indeks jadi, bukan katalog mentah: pemanggil yang katalognya sudah
   * ada di browser (mis. /discover) merakitnya sendiri tanpa menambah satu byte
   * pun kiriman, sementara halaman lain merakitnya di server.
   */
  indeksSaran?: SaranCari[];
};

/**
 * Bar pencarian utama — kepala situs gaya katalog streaming.
 *
 * Dipakai TIGA halaman dengan perilaku berbeda: di /beranda ia menyaring grid
 * langsung di tempat, di halaman depan & /discover ia melempar/menyaring lewat
 * alamat URL. Karena itu komponen ini sengaja tidak tahu apa-apa soal katalog —
 * pemanggil yang menentukan artinya lewat `onValueChange`/`onSubmit`.
 *
 * TATA LETAK: satu baris di layar lebar (logo · cari · menu · penyaring ·
 * tombol), menumpuk sendiri di layar sempit lewat `flex-wrap`. Urutan di layar
 * sempit diatur `order-*` supaya tombol Masuk/Daftar naik menemani logo di
 * baris pertama, bukan terdampar di bawah.
 */
export default function SearchBar({
  value,
  onValueChange,
  onSubmit,
  placeholder = TEKS_KOTAK_CARI,
  filters,
  chrome,
  className,
  action,
  namaKolom,
  modeTombol = false,
  bukaAwal = false,
  indeksSaran,
}: Props) {
  const router = useRouter();
  /**
   * Panel pop up menu katalog di HP menyala hanya kalau pemanggil mengirim
   * KEDUA bahannya: logo versi tanpa-tautan (pemicunya) DAN isi panelnya.
   *
   * ⚠️ Ditulis SEKALI sebagai satu nilai karena aturannya dipakai DUA kali —
   * memutuskan bentuk logo, dan memutuskan deretan menu disembunyikan atau
   * tidak di HP. Saat kedua tempat itu menulis syaratnya sendiri-sendiri,
   * keduanya sempat berbeda: pemicu digerbangi `brandHp && menusHp` sementara
   * penyembunyi cuma `menusHp` — cukup untuk melahirkan keadaan "menu
   * disembunyikan tapi tak ada tombol yang bisa membukanya lagi", tanpa satu
   * pun error.
   */
  const panelHpAktif = Boolean(chrome?.brandHp && chrome?.menusHp);
  const [cariTerbuka, setCariTerbuka] = useState(bukaAwal);
  const kotakRef = useRef<HTMLInputElement>(null);

  // Seluruh logika daftar saran (sorotan, buka-tutup, papan ketik, klik di
  // luar) pindah ke `useDaftarSaran` 2026-11-13 — dipakai BERDUA dengan kotak
  // cari di navbar hitam (TopNav.tsx). Alasannya ada di berkas hook itu:
  // menyalinnya ke sana akan melahirkan dua kotak cari yang pasti menyimpang.
  const {
    saran,
    tampil: saranTampil,
    sorot,
    setSorot,
    tutupSaran,
    pembungkusRef,
    onKeyDown: onKeyDownSaran,
  } = useDaftarSaran(value, indeksSaran);

  /**
   * Buka kotaknya begitu `bukaAwal` menyala.
   *
   * ⚠️ `useState(bukaAwal)` saja TIDAK CUKUP, dan ini bug yang sudah terbukti:
   * `/discover` adalah halaman STATIS, jadi saat HTML-nya dibuat kata kunci
   * `?q=…` belum terbaca — `bukaAwal` masih false. Kata kuncinya baru muncul di
   * browser lewat `useSearchParams`, dan nilai AWAL `useState` tak pernah
   * diperbarui sesudah itu. Akibatnya penonton yang tiba lewat tautan
   * pencarian melihat kotak tertutup, tanpa tahu apa yang sedang dicari.
   *
   * Hanya MEMBUKA, tidak pernah menutup: kalau penonton sengaja menutup kotak
   * sementara kata kuncinya masih berlaku, ia harus tetap tertutup.
   */
  useEffect(() => {
    if (bukaAwal) setCariTerbuka(true);
  }, [bukaAwal]);

  // Fokus langsung ke kotak begitu lapisan terbuka, dan tutup dengan Esc.
  // Tanpa fokus otomatis, penonton harus mengklik dua kali untuk mulai
  // mengetik — tombol yang membuka kotak lalu membiarkannya pasif terasa rusak.
  useEffect(() => {
    if (!cariTerbuka) return;
    kotakRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCariTerbuka(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cariTerbuka]);

  /**
   * Kotak cari + tombolnya. Dipakai DI BAR (mode biasa) maupun DI DALAM LAPISAN
   * popup (mode tombol) — `kelas` yang membedakan penempatannya.
   *
   * `action`/`method` hanya berarti sebelum JavaScript aktif; `preventDefault()`
   * mematikannya sesudah itu. Lihat penjelasan prop `action` di atas.
   *
   * ⚠️ BATAS JUJUR mode tombol: lapisannya dibuka oleh JavaScript, jadi sebelum
   * JS aktif tombol itu diam dan pencarian TIDAK bisa dibuka dari bar. Form di
   * dalamnya tetap ber-`action` sehingga begitu terbuka ia jalan apa adanya.
   * Diterima karena situs ini sudah mensyaratkan JS untuk memutar video — tapi
   * kalau suatu saat pencarian harus hidup tanpa JS, mode tombol yang pertama
   * harus dilepas.
   */
  const formCari = (kelas: string, besar = false) => (
    <form
      ref={pembungkusRef as React.RefObject<HTMLFormElement>}
      action={action}
      method={action ? "get" : undefined}
      onSubmit={(e) => {
        e.preventDefault();
        tutupSaran();
        onSubmit?.();
        setCariTerbuka(false);
      }}
      // `relative`: daftar saran di bawah diposisikan terhadap form ini.
      className={cn("relative", kelas)}
      role="search"
    >
      <Input
        ref={modeTombol ? kotakRef : undefined}
        type="search"
        name={namaKolom}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={onKeyDownSaran}
        placeholder={placeholder}
        aria-label="Cari drama"
        role="combobox"
        aria-expanded={saranTampil}
        aria-autocomplete="list"
        className={cn(
          "rounded-l-sm rounded-r-none border-transparent bg-white text-zinc-900 placeholder:text-zinc-500 focus-visible:border-amber-400 focus-visible:ring-0",
          // `besar` HANYA untuk lapisan popup (owner 2026-10-29: "kecil kali,
          // bisa besar sedikit"). Bar tetap `h-9` — menaikkannya di sana akan
          // meninggikan SELURUH kepala situs, termasuk /discover yang masih
          // memakai kotak biasa.
          besar ? "h-12 text-base" : "h-9 text-sm",
        )}
      />
      <button
        type="submit"
        aria-label="Cari"
        className={cn(
          /* Tombol kirim = satu-satunya bidang BERWARNA PENUH di bar yang kini
             pucat, jadi ia yang menandai "di sinilah pencarian dikirim".
             `sage-600` + putih = 5,67:1. ⚠️ Sampai 2026-11-23 ia `bg-rose-700`
             — sisa tema merah yang TERLEWAT saat tema diganti jadi sage, dan
             owner yang menangkapnya ("di search masih ada warna merah"). */
          "flex shrink-0 items-center justify-center rounded-r-sm bg-sage-600 text-white transition-colors hover:bg-sage-700",
          besar ? "h-12 w-14" : "h-9 w-11",
        )}
      >
        <Search className={besar ? "size-5" : "size-4"} />
      </button>

      {saranTampil && (
        <DaftarSaran
          saran={saran}
          aktif={sorot}
          hrefSemua={alamatCari(value)}
          onPilih={() => {
            tutupSaran();
            setCariTerbuka(false);
          }}
          onSorot={setSorot}
        />
      )}
    </form>
  );

  return (
    <div
      className={cn(
        // Merah terang bergradasi, TANPA ungu — owner 2026-09-21: ujung kiri
        // yang tadinya `fuchsia-700` (ungu) terlalu mencolok dan tidak sejajar
        // dengan situs katalog pembanding, yang memakai merah tua di kiri
        // melembut jadi merah-pink di kanan.
        "z-30 shadow-lg shadow-black/50",
        LATAR_BAR_MEREK,
        className,
      )}
    >
      <div
        className={cn(SHELL, "flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5")}
      >
        {chrome?.brand && (
          <div
            className={cn(
              "order-1 shrink-0 md:order-none",
              /* Nama situs "DramaKu" menyingkir SELAMA kotak cari dibuka di
                 HP — lambang D-nya TETAP terlihat (owner 2026-11-21: *"ketika
                 klik search jadi ketutup D-nya"*).

                 Terukur di layar 360px: logo 36 + jarak 12 + tombol tutup 44
                 menyisakan ±236px untuk kotak cari, sedangkan tulisan "Cari
                 film di DramaKu" butuh ±150px. Nama situs memakan ±90px —
                 tanpa aturan ini sisanya ±146px dan tulisannya terpotong
                 lagi, keluhan yang sudah TIGA kali diperbaiki. */
              cariTerbuka &&
                "max-md:[&_[data-nama-situs]]:hidden max-md:[&_[data-lambang-saja]]:block",
            )}
          >
            {panelHpAktif ? (
              <>
                {/* DI HP: logo = pemicu PANEL POP UP menu katalog (owner
                    2026-11-21: *"ketika di klik D keluar genre, series,
                    populer, negara"* lalu *"jangan di jadikan dropdown tapi
                    seperti pop up aja biar terlihat keren"*).

                    ⚠️ `md:hidden` DIPASANG DI PEMICUNYA, dan HANYA di situ —
                    jangan dipindah ke `<SheetContent>`. `SheetContent`
                    menggambar `<SheetOverlay>` sebagai elemen TERPISAH yang
                    className-nya tidak diteruskan (components/ui/sheet.tsx:59),
                    jadi menyembunyikan Content akan MENINGGALKAN tirai
                    `fixed inset-0 bg-black/50`: layar komputer gelap total
                    tanpa satu pun yang bisa diklik, tanpa satu pun error.
                    Pemicu yang mati = panel yang tak pernah bisa DIBUKA pada
                    lebar ≥48rem. ❓ Batas jujurnya: panel yang SUDAH terbuka
                    di layar sempit tidak ikut tertutup sendiri kalau layarnya
                    kemudian melebar (HP diputar mendatar) — ia tetap bisa
                    ditutup, cuma deretan menu versi komputer ikut terlihat di
                    belakangnya. Tidak ditambal karena tambalannya menuntut
                    pengukuran lebar layar lewat JavaScript (lihat larangannya
                    di bawah).

                    ⚠️ TANPA PANAH ⌄ — DIHAPUS owner 2026-11-21 (*"berbentuk
                    dropdown, kan saya bilang pop up"*), dan jangan
                    dikembalikan tanpa permintaan baru. Panah ke bawah adalah
                    penanda DROPDOWN yang universal, jadi memasangnya di
                    pemicu pop up justru menyampaikan bentuk yang salah. Ini
                    permintaan ketiga owner melepas penanda semacam itu
                    (garis-tiga 2026-11-14, panah avatar & panah ini hari ini).

                    ❓ Harga yang diterima sadar: tanpa penanda apa pun, tak
                    ada isyarat visual bahwa logo bisa diketuk — penonton baru
                    bisa saja tak pernah menemukan Genre/Series/Populer/Negara.
                    Jalan lain ke penyaring TETAP ada dan bukan hiasan: tombol
                    "Filter" di BottomNav menuju /discover, dan strip genre
                    kuning di layar komputer.

                    DUA elemen (pemicu untuk HP, tautan untuk komputer), bukan
                    satu yang diubah lewat JavaScript: mengukur lebar layar
                    sendiri di JS membuat ambangnya bisa menyimpang dari ambang
                    Tailwind, dan menyimpangnya tak memunculkan error. */}
                <Sheet>
                  <SheetTrigger
                    aria-label="Menu katalog"
                    /* ⚠️ `focus-visible:ring-…`, JANGAN `focus-visible:bg-black/25`
                       seperti tombol lain di bar ini. Sejak kepala situs di HP
                       jadi gelap (`KELAS_KEPALA_GELAP_HP` = `bg-zinc-950`),
                       sorotan hitam-transparan di atas latar hitam = TIDAK
                       TERLIHAT, sementara `outline-none` sudah membuang cincin
                       bawaan browser. Hasilnya pemakai papan ketik kehilangan
                       jejak fokusnya tepat di satu-satunya ukuran layar tempat
                       tombol ini hidup. */
                    className="flex items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-400 md:hidden"
                  >
                    {chrome.brandHp}
                  </SheetTrigger>
                  <SheetContent
                    side="bottom"
                    /* Tombol X bawaan dimatikan: ukurannya ~16px di pojok
                       kanan ATAS panel — titik paling sulit dijangkau jempol
                       satu tangan. Gantinya bilah "Tutup" selebar panel di
                       dasarnya (MenuKatalogHp.tsx). */
                    showCloseButton={false}
                    /* Radix mengisi `aria-describedby` TANPA SYARAT. Tanpa
                       `SheetDescription`, id itu menggantung ke elemen yang
                       tidak ada — pembaca layar menyebut keterangan kosong. */
                    aria-describedby={undefined}
                    /* Fokus pertama diarahkan ke PANELNYA, bukan ke elemen
                       fokusable pertama di dalamnya. Tanpa ini Radix memanggil
                       `focusFirst(removeLinks(...))` — seluruh `<a>` dibuang
                       dari kandidat, sehingga chip genre tak pernah terpilih
                       dan yang kebagian fokus justru pegangan yang tugasnya
                       MENUTUP panel. Jadi hal pertama yang ditawarkan menu ini
                       kepada pemakai pembaca layar adalah perintah
                       membatalkannya. */
                    onOpenAutoFocus={(e) => {
                      e.preventDefault();
                      (e.currentTarget as HTMLElement).focus();
                    }}
                    /* `data-[state=open]:duration-300`, BUKAN `duration-300`
                       polos: bawaannya `data-[state=open]:duration-500`
                       (sheet.tsx:63), dan twMerge menghitung varian berbeda
                       sebagai grup berbeda — kelas polos tidak akan
                       menimpanya, panel terasa lambat tanpa ada yang salah. */
                    /* `motion-reduce:*` WAJIB di sini, bukan cuma di isi
                       panelnya: yang berubah paling luas justru panel ini —
                       seluruh layar. Animasi bawaan `sheet.tsx`
                       (`animate-in`/`slide-in-from-bottom`) tidak menghormati
                       setelan "Kurangi Gerak" sama sekali (tw-animate-css tak
                       memuat satu pun aturan `prefers-reduced-motion`). Dengan
                       `animation: none`, Radix tidak punya animasi yang perlu
                       ditunggu sehingga panel tetap bisa ditutup. */
                    /* KOTAK DI TENGAH YANG TINGGINYA MENGIKUTI ISI + MEMUDAR.
                       Owner 2026-11-23, dua koreksi berturut-turut:
                       *"dropdown jangan dari bawah, tidak maksimal"* lalu
                       *"jangan bikin full layar"*. Riwayat bentuknya: 72dvh
                       meluncur dari bawah → penuh satu layar → bentuk ini.

                       KENAPA "mengikuti isi" menyelesaikan KEDUA keluhan
                       sekaligus, bukan kompromi di tengah: panel 72dvh maupun
                       penuh-layar sama-sama memaksakan tinggi TETAP, jadi saat
                       semua grup tertutup sisanya jadi bidang warna kosong —
                       itulah yang terbaca "tidak maksimal" (banyak ruang, tak
                       ada isi) DAN "sakit mata" (bidang warna pekat seluas
                       layar). Tinggi yang mengikuti isi membuat bidang
                       warnanya sekecil isinya. Pagar untuk grup panjang
                       (Negara 25 nama) TIDAK dipasang di sini melainkan di
                       wadah bergulir dalam `MenuKatalogHp.tsx` — satu tempat
                       saja yang mengatur batas tinggi. Dua tempat = dua angka
                       yang bisa menyimpang tanpa memunculkan error.

                       ⚠️ `side="bottom"` SENGAJA DIPERTAHANKAN walau panelnya
                       tidak lagi berlabuh di bawah. Alasannya: prop itu cuma
                       memilih satu set kelas di sheet.tsx:70, dan menggantinya
                       ke "top"/"left" hanya menukar satu set kelas yang harus
                       ditimpa dengan set lain yang juga harus ditimpa — nol
                       untungnya. Yang ditimpa di sini: `inset-x-0 bottom-0`
                       → `inset-0` + `m-auto` + `h-fit`, yaitu cara memusatkan
                       elemen `fixed` tanpa transform (transform akan bentrok
                       dengan animasi Radix yang juga memakainya).

                       ⚠️ LUNCURAN DIMATIKAN LEWAT VARIABELNYA, bukan dengan
                       membuang kelas `slide-in-from-bottom`. twMerge TIDAK
                       mengenali kelas tw-animate-css sebagai grup yang saling
                       meniadakan, jadi menambah kelas "lawan" tidak akan
                       membatalkannya — kelas bawaan dari sheet.tsx tetap
                       menang. Menyetel `--tw-enter-translate-y`/`exit` ke 0
                       membuat keyframe yang sama berjalan tanpa perpindahan:
                       yang tersisa `fade-in`/`fade-out` bawaannya. Itulah
                       "memudar" yang diminta. */
                    /* Latar panel = MERAH TUA RATA (`LATAR_PANEL_KATALOG_HP`),
                       bukan gradasi. Alasan lengkapnya di shell.ts — ringkasnya
                       gradasi yang sama terbaca sebagai dua warna berbeda
                       karena porsi yang terlihat di bar dan di panel tidak
                       sama. Kelas `bg-*` ini menimpa `bg-background` bawaan
                       sheet.tsx (sama-sama background-color, twMerge
                       menyelesaikannya). */
                    className={cn(
                      LATAR_PANEL_KATALOG_HP,
                      "inset-0 m-auto h-fit w-[calc(100%-2rem)] max-w-sm",
                      "gap-0 overflow-hidden rounded-2xl border-0 p-0 shadow-2xl",
                      "data-[state=open]:[--tw-enter-translate-y:0] data-[state=closed]:[--tw-exit-translate-y:0]",
                      "data-[state=closed]:duration-200 data-[state=open]:duration-300 motion-reduce:animate-none motion-reduce:transition-none",
                    )}
                  >
                    {chrome.menusHp}
                  </SheetContent>
                </Sheet>
                {/* Di layar komputer logo tetap TAUTAN ke beranda, persis
                    seperti sebelumnya — nol perubahan di sana. */}
                <div className="hidden md:block">{chrome.brand}</div>
              </>
            ) : (
              chrome.brand
            )}
          </div>
        )}

        {/* KOTAK CARI mode BIASA (halaman hasil pencarian). Mode TOMBOL tidak
            di sini — ia dipindah ke UJUNG KANAN bar, lihat di bawah.
            Isinya dirakit SEKALI di `formCari` (di atas `return`) lalu dipakai
            apa adanya di bar maupun di dalam panel. Ditulis dua kali, keduanya
            pasti menyimpang — tulisan placeholder di repo ini sudah dua kali
            menyimpang karena persis sebab itu (lihat TEKS_KOTAK_CARI). */}
        {!modeTombol &&
          formCari(
            "order-3 flex w-full min-w-0 items-stretch md:order-none md:w-auto md:max-w-xl md:flex-1",
          )}

        {chrome?.menus && (
          <div
            className={cn(
              "order-4 w-full min-w-0 md:order-none md:w-auto",
              /* Deretan menu ini jadi bentuk khusus LAYAR KOMPUTER begitu
                 pemakainya menyediakan panel pop up penggantinya — HANYA
                 kalau `menusHp` diisi. Tanpa syarat itu, pemakai yang belum
                 menyediakan panelnya akan kehilangan SELURUH menu katalog di
                 HP, tanpa satu pun error.

                 Disembunyikan lewat CSS, bukan dicabut: chip-chipnya tetap di
                 HTML untuk mesin pencari, dan markup-nya tetap satu — tak ada
                 versi kedua yang bisa menyimpang.

                 Syaratnya WAJIB `panelHpAktif` yang sama persis dengan yang
                 menggambar pemicunya di atas — bukan `chrome.menusHp` saja.
                 Dua syarat yang berbeda sedikit cukup untuk melahirkan
                 keadaan "menu hilang di HP tapi tak ada tombol pembukanya". */
              panelHpAktif && "max-md:hidden",
            )}
          >
            {chrome.menus}
          </div>
        )}

        {filters && (
          <>
            {/* Penyaring tampil LANGSUNG di bar, di HP maupun layar komputer.

                ⚠️ Sampai 2026-11-23 di HP ia disembunyikan di balik tombol
                "FILTER" yang membuka baris kedua. Itu masuk akal ketika slot
                ini diisi SEDERET kontrol — tapi satu-satunya pengisinya hari
                ini `FilterKatalog`, yang bentuknya sendiri sudah satu tombol
                bernama "Filter". Hasilnya DUA tombol bertumpuk yang sama-sama
                bertuliskan FILTER: yang atas membuka yang bawah. Owner
                menangkapnya saat mencoba menyaring.
                Kalau kelak slot ini diisi beberapa kontrol sekaligus dan
                barnya jadi sesak di HP, kembalikan pola toggle-nya — tapi
                JANGAN sampai pemicunya bernama sama dengan isinya. */}
            <div className="order-2 ml-auto flex shrink-0 items-center gap-1.5 md:order-none">
              {filters}
            </div>
          </>
        )}

        {/* ===== CARI — TOMBOL + KOTAK yang melebar SEJAJAR di dalam bar
               (owner 2026-10-29: *"bukan di bawahnya, tapi sejajar search"*).

               Perjalanan bentuk ini sudah tiga kali, dan tiap langkah menutup
               keluhan yang nyata:
                 1. kotak permanen di bar      -> "searchnya kelebaran";
                 2. lapisan menutupi layar     -> "backgroundnya bikin sakit
                    mata" + menutupi poster film;
                 3. panel menggantung di bawah -> masih menimpa baris poster;
                 4. SEKARANG: kotak muncul di DALAM bar, sejajar tombolnya.

               Bentuk terakhir ini satu-satunya yang menutupi NOL bagian
               halaman: barnya memang sudah ada di situ, kotak cuma mengisi
               ruang kosong di sebelah kiri tombol. Tak ada lapisan, tak ada
               bayangan, tak ada yang perlu ditutup.

               `ml-auto` mendorong seluruh kelompok ini ke ujung kanan. Di layar
               sempit `flex-wrap` milik bar yang menurunkan kotaknya ke baris
               berikutnya — masih DI DALAM bar, bukan menimpa poster. */}
        {modeTombol && (
          <div
            className={cn(
              "order-2 ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 md:order-none",
              /* Kotak cari TETAP di baris yang sama (owner 2026-11-21, putaran
                 kedua): yang menyingkir justru logo & avatar di kiri-kanannya,
                 lihat komentar di keduanya. Jadi kotaknya dapat selebar bar —
                 tulisan "Cari film di DramaKu" muat utuh — TANPA menambah
                 baris kosong.

                 ⚠️ JANGAN kembalikan versi `max-md:w-full` yang menurunkan
                 kelompok ini ke baris sendiri: itu sudah dicoba dan ditolak
                 owner karena meninggalkan ruang kosong di baris atas. */
            )}
          >
            {cariTerbuka && (
              <div className="min-w-0 flex-1 md:max-w-md">
                {formCari("flex w-full items-stretch")}
              </div>
            )}

            <button
              type="button"
              onClick={() => setCariTerbuka((t) => !t)}
              aria-label={cariTerbuka ? "Tutup pencarian" : "Cari film"}
              aria-expanded={cariTerbuka}
              className={cn(
                TEKS_BAR_MEREK,
                SOROT_BAR_MEREK,
                "flex size-9 shrink-0 items-center justify-center rounded-sm transition-colors outline-none",
                cariTerbuka && "bg-sage-200",
              )}
            >
              {cariTerbuka ? (
                <X className="size-5" />
              ) : (
                <Search className="size-5" />
              )}
            </button>
          </div>
        )}

        {chrome?.trailing && (
          <div
            className={cn(
              "order-2 flex shrink-0 items-center gap-2 md:order-none",
              /* HANYA koin & avatar yang menyingkir selagi kotak cari terbuka
                 di HP — LOGO TETAP TERLIHAT (owner 2026-11-21: *"ketika klik
                 search jadi ketutup D-nya"*).

                 Tiga percobaan sebelumnya dan kenapa semuanya gagal, supaya
                 tidak ada yang mengulanginya:
                   1. kotak sebaris dengan SEMUA isi bar → tinggal ±80px,
                      tulisan "Cari film di DramaKu" terpotong;
                   2. kotak turun ke BARIS SENDIRI → tulisannya muat, tapi
                      baris atas menyisakan ruang kosong selebar layar;
                   3. logo + avatar sama-sama disembunyikan → ruang kosong
                      hilang, tapi logo ikut lenyap.
                 Yang sekarang: logo (36px) tetap, avatar yang pergi. Terukur
                 di layar 360px — logo 36 + jarak 12 + tombol X 44 menyisakan
                 ±236px untuk kotaknya, sedangkan tulisannya butuh ±150px.
                 Muat, tanpa baris tambahan, tanpa logo hilang. */
              cariTerbuka && "max-md:hidden",
            )}
          >
            {chrome.trailing}
          </div>
        )}
      </div>

    </div>
  );
}
