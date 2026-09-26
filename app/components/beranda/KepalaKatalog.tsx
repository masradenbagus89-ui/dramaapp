"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import { clearUser } from "@/lib/auth";
import CoinChip from "../CoinChip";
import MenuAkun from "../MenuAkun";
import { usePenonton } from "../usePenonton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { LogOut, Menu } from "lucide-react";
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
 * ⚠️ Menu aplikasi TIDAK boleh sekadar dibuang. Di layar komputer inilah
 * satu-satunya jalan menuju Playly, Admin, dan tombol Keluar — `BottomNav`
 * hanya muncul di HP (`md:hidden`) dan cuma memuat dua tujuan. Membuangnya
 * berarti halaman-halaman itu hanya bisa dibuka dengan mengetik alamatnya
 * sendiri, dan tidak ada error apa pun yang memberi tahu.
 */

/** Satu tujuan di menu aplikasi. */
type Tujuan = { href: string; label: string; adminOnly?: boolean };

/**
 * Jalan MASUK ke akun, untuk penonton yang belum login.
 *
 * Sejak 2026-09-21 keduanya cuma ada di dalam menu garis-tiga ini — tombolnya
 * di bar cari dilepas atas permintaan owner ("dobel"). Artinya di /beranda &
 * /discover inilah SATU-SATUNYA jalan masuk, jadi alamatnya diekspor supaya
 * bisa diuji: isi dropdown Radix tidak tergambar di HTML sampai menunya dibuka,
 * sehingga salah alamat di sini TIDAK akan tertangkap tes yang memeriksa hasil
 * render (terbukti lolos saat diuji-rusak 2026-09-21).
 */
export const TAUTAN_AKUN = [
  { href: "/login", label: "Masuk" },
  { href: "/daftar", label: "Daftar" },
] as const;

/**
 * Daftarnya WAJIB sama dengan `LINKS` di app/components/TopNav.tsx — kedua
 * tempat menampilkan navigasi yang sama, hanya bentuknya yang berbeda (baris
 * menu vs daftar di balik tombol), dan tiap halaman memakai salah satunya.
 * Kalau bertambah tujuan baru, tambahkan di KEDUANYA.
 *
 * Diekspor supaya kewajiban itu bisa DIUJI, bukan sekadar dijanjikan komentar:
 * lihat tests/kepala-situs.test.ts. Isi dropdown Radix tidak tergambar di HTML
 * sampai menunya dibuka, jadi memeriksanya dari hasil render mustahil.
 *
 * ⚠️ Discover · Shorts · My List · Playly · Profile sengaja DILEPAS dari daftar
 * ini bersamaan dengan `LINKS` (tiga yang pertama owner 2026-09-25, dua
 * terakhir owner 2026-09-26). Alasan lengkap + daftar jalan yang tersisa menuju
 * kelima halaman itu ditulis SEKALI di app/components/TopNav.tsx, di atas
 * `LINKS` — jangan disalin ke sini supaya tak ada dua versi yang bisa
 * menyimpang. Route kelimanya TETAP hidup; yang hilang hanya tombolnya.
 *
 * Khusus Profile: jalannya TIDAK putus, ia pindah ke menu di balik avatar
 * (`MenuAkun`) yang dipasang `TombolAkun` di dasar berkas ini.
 */
export const TUJUAN: Tujuan[] = [
  { href: "/beranda", label: "Beranda" },
  { href: "/admin", label: "Admin", adminOnly: true },
];

const ITEM_CLASS = "cursor-pointer text-sm focus:bg-zinc-800 focus:text-amber-400";

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
export function LogoDramaKu({ href = "/beranda" }: { href?: string }) {
  return (
    <Link href={href} className="flex shrink-0 items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-mark.png"
        alt="DramaKu"
        width={36}
        height={36}
        className="size-9 shrink-0 object-contain"
      />
      <span className="hidden text-xl font-bold tracking-tight text-white sm:inline">
        DramaKu
      </span>
    </Link>
  );
}

/**
 * Tombol garis-tiga + logo, dipasang di ujung KIRI bar cari lewat
 * `SearchBarChrome.brand`. Isinya seluruh navigasi aplikasi.
 */
export function MenuAplikasi() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { user, mounted, perluMasukUlang } = usePenonton();

  const keluar = useCallback(() => {
    if (!confirm("Yakin mau keluar dari akun?")) return;
    clearUser();
    router.push("/");
  }, [router]);

  const tujuan = TUJUAN.filter((t) => !t.adminOnly || user?.role === "admin");

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Menu halaman"
          className="flex size-9 shrink-0 items-center justify-center rounded-sm text-white transition-colors outline-none hover:bg-black/25 focus-visible:bg-black/25 data-[state=open]:bg-black/30"
        >
          <Menu className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="min-w-52 border-zinc-700 bg-zinc-900 text-zinc-200"
        >
          {tujuan.map((t) => (
            <DropdownMenuItem key={t.href} asChild className={ITEM_CLASS}>
              <Link
                href={t.href}
                className={cn(
                  pathname.startsWith(t.href) && "font-semibold text-amber-400",
                )}
              >
                {t.label}
              </Link>
            </DropdownMenuItem>
          ))}

          {/* Peringatan yang dulu jadi pita kuning di bawah navbar. Tanpa ini,
              akun yang baru diangkat jadi admin tak punya petunjuk kenapa menu
              Admin belum muncul untuknya. */}
          {mounted && perluMasukUlang && (
            <>
              <DropdownMenuSeparator className="bg-zinc-700" />
              <DropdownMenuItem asChild className={ITEM_CLASS}>
                <Link href="/login" className="text-amber-400">
                  Masuk ulang dengan password admin
                </Link>
              </DropdownMenuItem>
            </>
          )}

          {mounted && user ? (
            <>
              <DropdownMenuSeparator className="bg-zinc-700" />
              <DropdownMenuLabel className="text-xs font-normal text-zinc-500">
                Masuk sebagai {user.name}
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={keluar}
                className={cn(ITEM_CLASS, "text-red-400 focus:text-red-300")}
              >
                <LogOut className="size-4" />
                Keluar
              </DropdownMenuItem>
            </>
          ) : (
            /* Masuk & Daftar ada DI SINI, bukan sebagai tombol di bar cari —
               owner 2026-09-21: tombolnya dobel dengan ajakan di badan halaman.
               Tapi menghapusnya begitu saja akan membuat halaman ini tak punya
               jalan masuk sama sekali (badan /beranda & /discover cuma berisi
               poster), jadi keduanya dipindah, bukan dibuang. */
            <>
              <DropdownMenuSeparator className="bg-zinc-700" />
              {TAUTAN_AKUN.map((t) => (
                <DropdownMenuItem key={t.href} asChild className={ITEM_CLASS}>
                  <Link
                    href={t.href}
                    className={cn(
                      t.href === "/daftar" && "font-semibold text-amber-400",
                    )}
                  >
                    {t.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <LogoDramaKu />
    </div>
  );
}

/**
 * Ujung KANAN bar cari (`SearchBarChrome.trailing`): saldo koin + avatar akun.
 *
 * Tombol Masuk · Daftar tetap TIDAK di sini, melainkan di menu garis-tiga.
 * Owner 2026-09-21: keduanya dobel dengan ajakan yang sudah ada di badan
 * halaman, dan bar ini harus seringkas situs katalog pembanding. Saldo koin
 * tetap di luar menu karena ia ANGKA yang perlu dilihat sekilas —
 * menyembunyikannya di balik satu klik membuat penonton tidak tahu sisa
 * koinnya sebelum membuka episode berbayar.
 *
 * Avatar ditambahkan 2026-09-26 dan itu WAJIB, bukan hiasan: "Profile" dilepas
 * dari `TUJUAN` pada hari yang sama, jadi tanpa avatar di sini halaman
 * berkatalog kehilangan satu-satunya jalan ke halaman Profil di layar komputer
 * (`BottomNav` cuma muncul di HP). `MenuAkun` diam sendiri saat belum login,
 * jadi bar tetap seringkas sebelumnya untuk pengunjung baru.
 */
export function TombolAkun() {
  const { user, mounted } = usePenonton();

  if (!mounted || !user) return null;
  return (
    <div className="flex items-center gap-2">
      <CoinChip />
      <MenuAkun />
    </div>
  );
}

/**
 * Susunan kepala situs untuk halaman BERKATALOG: logo + menu garis-tiga di
 * kiri, deretan menu dropdown di tengah, tombol akun di kanan.
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
    brand: <MenuAplikasi />,
    menus: <NavMenus menus={menus} />,
    trailing: <TombolAkun />,
  };
}
