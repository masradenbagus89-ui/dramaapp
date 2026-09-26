"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import CoinChip from "./CoinChip";
import MenuAkun from "./MenuAkun";
import { usePenonton } from "./usePenonton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { punyaNavbarAtas } from "@/lib/navigasi-halaman";
import { alamatCari } from "@/lib/nav-katalog";
import { TEKS_KOTAK_CARI } from "./beranda/SearchBar";

/**
 * Satu menu di navigasi atas. `warnaAktif`/`warnaDiam` OPSIONAL — kosong berarti
 * ikut warna default (hitam di atas kotak kuning saat aktif, abu-abu saat diam).
 * Diisi hanya untuk menu yang sengaja dibedakan warnanya.
 */
type NavLink = {
  href: string;
  label: string;
  adminOnly: boolean;
  warnaAktif?: string;
  warnaDiam?: string;
};

/**
 * Diekspor supaya bisa diadu dengan `TUJUAN` di
 * app/components/beranda/KepalaKatalog.tsx — keduanya navigasi yang sama dan
 * tidak boleh menyimpang. Penjaganya: tests/kepala-situs.test.ts.
 *
 * ⚠️ Discover · Shorts · My List · Playly · Profile SENGAJA TIDAK ADA DI SINI.
 * Tiga yang pertama dilepas owner 2026-09-25, dua terakhir owner 2026-09-26
 * ("viewer hanya melihat film/video saja"): baris menu ini hanya boleh berisi
 * jalan menuju FILM, meniru situs katalog pembanding. Yang dilepas HANYA
 * tombolnya — kelima halamannya TETAP HIDUP dan tetap mendapat navbar saat
 * dibuka; `AKAR_BERNAVBAR_ATAS` di lib/navigasi-halaman.ts sengaja TIDAK ikut
 * dipangkas.
 *
 * JANGAN hapus route-nya untuk "merapikan": /discover adalah mesin di balik
 * SELURUH penyaring katalog — kotak cari (lib/nav-katalog.ts:75), tiap menu
 * genre/negara, dan tiap baris "Lihat semua" bermuara ke sana, jadi
 * membuangnya mematikan pencarian seluruh situs.
 *
 * Jalan yang TERSISA sesudah tombolnya dilepas:
 *   /discover — kotak cari, menu genre/negara, "Lihat semua" di beranda
 *   /my-list  — /profile (profile/DashboardMenu.tsx:41, FavoritesRow.tsx:58)
 *               dan baris "Favorit Saya" di beranda (PersonalRows.tsx:155)
 *   /shorts   — TIDAK ADA lagi dari dalam situs; hanya lewat alamat langsung
 *               atau hasil Google (masih terdaftar di app/sitemap.ts:13).
 *   /profile  — menu akun di balik avatar (app/components/MenuAkun.tsx) dan
 *               tab Profile di bar bawah HP (app/components/BottomNav.tsx:38).
 *   /playly   — TIDAK ADA lagi dari dalam situs, dan itu memang MAKSUDNYA:
 *               videonya kini tampil sebagai film biasa di /beranda, sedangkan
 *               "Playly" adalah nama penyedia yang tak perlu diketahui
 *               penonton. Halamannya dibiarkan hidup supaya tautan lama dan
 *               hasil Google tidak mati.
 * Penjaganya: tests/kepala-situs.test.ts → "menu dilepas, halamannya tetap hidup".
 */
export const LINKS: NavLink[] = [
  { href: "/beranda", label: "Beranda", adminOnly: false },
  { href: "/admin", label: "Admin", adminOnly: true },
];


export default function TopNav() {
  // `?? ""` (bukan `?? "/"`): nilai yang tak bisa dipercaya sengaja dibiarkan
  // apa adanya, sebab penyaring tampil/tidak di bawah ini ALLOWLIST.
  const pathname = usePathname() ?? "";
  const router = useRouter();
  // Dibaca dari hook bersama (app/components/usePenonton.ts) — aturan yang SAMA
  // dipakai bar merah beranda dan menu akun. Dulu disalin di sini dan di
  // KepalaKatalog, dan dua salinan yang bisa menyimpang berarti satu kepala
  // situs menganggap penonton sudah login sementara yang lain belum.
  const { user, mounted, perluMasukUlang } = usePenonton();
  const [searchQuery, setSearchQuery] = useState("");
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  const isActive = useCallback(
    (href: string) => {
      if (href === "/beranda")
        return pathname === "/beranda" || pathname.startsWith("/drama");
      return pathname.startsWith(href);
    },
    [pathname],
  );

  // Geser kotak penanda ke menu yang sedang aktif.
  const measurePill = useCallback(() => {
    const active = LINKS.find(
      (l) => (!l.adminOnly || user?.role === "admin") && isActive(l.href),
    );
    const el = active ? linkRefs.current[active.href] : null;
    setPill(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
  }, [user, isActive]);

  useEffect(() => {
    measurePill();
    window.addEventListener("resize", measurePill);
    return () => window.removeEventListener("resize", measurePill);
  }, [measurePill, mounted]);

  // Navbar SELALU menempel (sticky), tidak pernah melayang di atas konten.
  //
  // Dulu ada mode "melayang" khusus halaman yang membuka dengan hero setinggi
  // layar. Sejak /, /beranda, dan /discover semuanya membuka dengan BAR CARI
  // (2026-09-08/09), mode itu tak punya pemakai lagi — dan kalau dibiarkan
  // justru menutupi bar cari itu.
  //
  // Siapa yang dapat navbar ini ditentukan ALLOWLIST di lib/navigasi-halaman.ts
  // — "gambar HANYA di alamat yang dikenali". Bentuk sebelumnya denylist
  // ("sembunyikan di daftar ini, selain itu tampilkan") dan itu gagal-terbuka:
  // `pathname` bernilai `""`/`"/index"` lolos semua penyaring, sehingga HTML
  // produksi halaman depan menggambar navbar hitam DI ATAS bar cari merah dan
  // penonton melihat dua baris kepala lalu berkedip. JANGAN dibalik lagi;
  // penjaganya tests/kepala-situs.test.ts.
  if (!punyaNavbarAtas(pathname)) return null;

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Alamatnya dari `alamatCari()` — sama dengan kotak cari lebar di bar
    // merah. Dulu dirakit sendiri di sini, jadi dua kotak cari yang tulisannya
    // sudah diseragamkan masih bisa mendarat di alamat berbeda.
    router.push(alamatCari(searchQuery));
  };

  return (
    <>
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-black/95 backdrop-blur">
      {/* shell-wide (1440) — WAJIB sama dengan pembatas isi beranda di
          app/beranda/page.tsx, kalau tidak logo meleset dari tepi konten.
          Definisi + alasannya ada di app/globals.css. */}
      <div className="shell-wide mx-auto flex h-14 items-center gap-4 px-4 md:px-6">
        <Link
          href="/beranda"
          className="flex items-center gap-2 transition-transform duration-200 hover:scale-105"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-mark.png"
            alt="DramaKu"
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
          />
          <span className="hidden text-lg font-bold text-white sm:inline">
            DramaKu
          </span>
        </Link>

        <nav className="relative hidden items-center gap-1 md:flex">
          {/* Kotak kuning yang meluncur ke menu aktif */}
          {pill && (
            <span
              className="absolute top-0 bottom-0 z-0 rounded-md bg-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.45)] transition-all duration-300 ease-out"
              style={{ left: pill.left, width: pill.width }}
            />
          )}
          {LINKS.filter((l) => !l.adminOnly || user?.role === "admin").map(
            (link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  ref={(el) => {
                    linkRefs.current[link.href] = el;
                  }}
                  className={cn(
                    "relative z-10 rounded-md px-3 py-1.5 text-sm transition-all duration-200",
                    active
                      ? cn("font-semibold", link.warnaAktif ?? "text-black")
                      : cn(
                          "hover:-translate-y-0.5",
                          link.warnaDiam ?? "text-zinc-300 hover:text-white",
                        ),
                  )}
                >
                  {link.label}
                </Link>
              );
            },
          )}
        </nav>

        <form
          onSubmit={onSearch}
          className="ml-auto hidden max-w-xs flex-1 md:flex"
        >
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              // Tulisan yang SAMA dengan kotak cari lebar di bar merah — dulu
              // ditulis terpisah di sini dan tertinggal saat yang lebar
              // diperbarui (owner 2026-09-22).
              placeholder={TEKS_KOTAK_CARI}
              className="rounded-full border-zinc-800 bg-zinc-900 pl-9 text-sm text-white placeholder:text-zinc-500 focus-visible:border-amber-400 focus-visible:ring-0"
            />
          </div>
        </form>

        <div className="flex items-center gap-2">
          {mounted && user ? (
            // Saldo koin sengaja TETAP di luar menu — ia ANGKA yang perlu
            // dilihat sekilas; menyembunyikannya di balik satu klik membuat
            // penonton tidak tahu sisa koinnya sebelum membuka episode
            // berbayar. Sisanya (nama, peran, Profile, Riwayat, Keluar) pindah
            // ke dalam `MenuAkun` atas permintaan owner 2026-09-26.
            <div className="flex items-center gap-2">
              <CoinChip />
              <MenuAkun />
            </div>
          ) : mounted ? (
            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-full border-zinc-700 bg-transparent text-xs font-semibold text-white hover:border-amber-400 hover:text-amber-400"
              >
                <Link href="/login">Masuk</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="rounded-full text-xs font-bold transition-transform hover:scale-105"
              >
                <Link href="/daftar">Daftar</Link>
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
    {perluMasukUlang && (
      <div className="border-b border-amber-900/50 bg-amber-950/40 px-4 py-2 text-center text-xs text-amber-200">
        Akun ini sudah diangkat jadi admin, tapi sesinya masih penonton.{" "}
        <Link href="/login" className="font-semibold text-amber-400 underline">
          Masuk ulang dengan password admin
        </Link>
      </div>
    )}
    </>
  );
}
