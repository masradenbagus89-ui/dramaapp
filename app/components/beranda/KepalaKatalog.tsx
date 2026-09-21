"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  clearUser,
  fetchUserRole,
  needsAdminRelogin,
  readUser,
  type User,
} from "@/lib/auth";
import CoinChip from "../CoinChip";
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

/**
 * KEPALA SITUS untuk halaman berkatalog (/beranda & /discover).
 *
 * Kenapa ada: sampai 2026-09-21 kedua halaman itu memakai DUA baris kepala —
 * navbar hitam (TopNav) di atas bar cari merah. Owner meminta bentuk situs
 * katalog pembanding: cukup DUA baris (bar cari + strip kuning). Navbar hitam
 * karena itu disembunyikan di kedua halaman, dan isinya pindah ke sini.
 *
 * ⚠️ Menu aplikasi TIDAK boleh sekadar dibuang. Di layar komputer navbar itu
 * satu-satunya jalan menuju Discover, Playly, Admin, dan tombol Keluar —
 * BottomNav hanya muncul di HP (`md:hidden`) dan cuma memuat empat tujuan.
 * Membuangnya berarti halaman-halaman itu hanya bisa dibuka dengan mengetik
 * alamatnya sendiri, dan tidak ada error apa pun yang memberi tahu.
 */

/** Satu tujuan di menu aplikasi. */
type Tujuan = { href: string; label: string; adminOnly?: boolean };

/**
 * Daftarnya WAJIB sama dengan `LINKS` di app/components/TopNav.tsx — kedua
 * tempat menampilkan navigasi yang sama, hanya bentuknya yang berbeda (baris
 * menu vs daftar di balik tombol), dan tiap halaman memakai salah satunya.
 * Kalau bertambah tujuan baru, tambahkan di KEDUANYA.
 *
 * Diekspor supaya kewajiban itu bisa DIUJI, bukan sekadar dijanjikan komentar:
 * lihat tests/kepala-situs.test.ts. Isi dropdown Radix tidak tergambar di HTML
 * sampai menunya dibuka, jadi memeriksanya dari hasil render mustahil.
 */
export const TUJUAN: Tujuan[] = [
  { href: "/beranda", label: "Beranda" },
  { href: "/discover", label: "Discover" },
  { href: "/shorts", label: "Shorts" },
  { href: "/playly", label: "Playly" },
  { href: "/my-list", label: "My List" },
  { href: "/profile", label: "Profile" },
  { href: "/admin", label: "Admin", adminOnly: true },
];

/**
 * Siapa yang sedang membuka situs. Dipakai bersama oleh kedua komponen di
 * berkas ini supaya aturan "kapan menu Admin muncul" cuma ditulis sekali.
 *
 * `mounted` wajib: `readUser()` membaca localStorage yang tidak ada di server,
 * jadi render pertama HARUS sama dengan hasil server (belum login) — kalau
 * tidak, React membuang seluruh pohon dan tampilannya berkedip.
 */
function usePenonton() {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [perluMasukUlang, setPerluMasukUlang] = useState(false);

  useEffect(() => {
    setMounted(true);
    let batal = false;
    const terapkan = () => {
      const u = readUser();
      setUser(u);
      if (!u || u.role === "admin") {
        setPerluMasukUlang(false);
        return;
      }
      void fetchUserRole(u.email).then((role) => {
        if (batal) return;
        const terbaru = readUser();
        if (!terbaru || terbaru.email !== u.email) return;
        setPerluMasukUlang(needsAdminRelogin(terbaru, role === "admin"));
      });
    };
    terapkan();
    const dengar = () => terapkan();
    window.addEventListener("dramaku:auth-changed", dengar);
    return () => {
      batal = true;
      window.removeEventListener("dramaku:auth-changed", dengar);
    };
  }, []);

  return { user, mounted, perluMasukUlang };
}

const ITEM_CLASS = "cursor-pointer text-sm focus:bg-zinc-800 focus:text-amber-400";

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

          {mounted && user && (
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
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Link href="/beranda" className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-mark.png"
          alt="DramaKu"
          width={28}
          height={28}
          className="size-7 shrink-0 object-contain"
        />
        <span className="hidden text-base font-bold text-white sm:inline">
          DramaKu
        </span>
      </Link>
    </div>
  );
}

/**
 * Ujung KANAN bar cari (`SearchBarChrome.trailing`): saldo koin untuk penonton
 * yang sudah masuk, tombol Masuk/Daftar untuk yang belum.
 *
 * Tombol Keluar sengaja TIDAK di sini melainkan di dalam menu garis-tiga —
 * bar ini harus tetap ringkas, dan Keluar bukan tombol yang ditekan tiap hari.
 */
export function TombolAkun() {
  const { user, mounted } = usePenonton();

  if (!mounted) return null;

  if (user) return <CoinChip />;

  return (
    <>
      <Link
        href="/login"
        className="rounded-full border border-white/40 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:border-amber-400 hover:text-amber-400"
      >
        Masuk
      </Link>
      <Link
        href="/daftar"
        className="rounded-full bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-black transition-colors hover:bg-amber-300"
      >
        Daftar
      </Link>
    </>
  );
}
