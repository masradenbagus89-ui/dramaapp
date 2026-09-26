"use client";

// Avatar penonton + seluruh urusan AKUN di baliknya.
//
// KENAPA ADA (owner 2026-09-26): sampai hari ini "Profile" berdiri sebagai
// tombol di baris menu, berdampingan dengan tujuan-tujuan KATALOG. Owner
// meminta bentuk situs katalog pembanding — baris menu hanya berisi jalan
// menuju film, sedangkan urusan akun bersembunyi di balik avatar. Hasilnya
// penonton yang membuka halaman film cuma melihat hal yang bisa ditonton.
//
// DIPAKAI DI DUA TEMPAT, dan itu WAJIB: `TopNav` (halaman film) dan
// `KepalaKatalog.TombolAkun` (bar merah /beranda & /discover). Tes
// `tests/kepala-situs.test.ts` memaksa daftar menu kedua kepala situs identik,
// jadi begitu "Profile" dilepas dari navbar ia ikut hilang dari beranda —
// tanpa avatar di SANA juga, penonton di layar komputer kehilangan
// satu-satunya jalan ke halaman Profil, tanpa satu pun error.
//
// BELUM LOGIN = komponen ini DIAM (null), bukan menggambar tombol
// Masuk/Daftar. Sengaja: kedua kepala situs sudah punya jalan masuknya
// sendiri yang berbeda — `TopNav` memakai sepasang tombol, sedangkan di bar
// merah tombol itu justru DILEPAS owner 2026-09-21 ("dobel" dengan ajakan di
// badan halaman) dan pindah ke menu garis-tiga. Menggambarnya di sini akan
// mengembalikan yang sudah sengaja dibuang.
//
// Peringatan "akunmu sudah diangkat jadi admin" SENGAJA tidak ikut ke sini:
// keduanya sudah punya tempat yang LEBIH terlihat (pita di bawah navbar, dan
// item di menu garis-tiga). Memindahkannya ke balik satu klik berarti admin
// baru tak pernah tahu kenapa menu Admin belum muncul untuknya.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import { clearUser, getAvatarClass, type User } from "@/lib/auth";
import { usePenonton } from "./usePenonton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronDown, LogOut } from "lucide-react";

/** Satu tujuan di balik avatar. */
type TujuanAkun = { href: string; label: string; adminOnly?: boolean };

/**
 * Isi menu akun.
 *
 * Diekspor supaya bisa DIUJI: isi dropdown Radix tidak tergambar di HTML sampai
 * menunya dibuka, jadi salah alamat di sini TIDAK akan tertangkap tes yang
 * memeriksa hasil render (terbukti lolos saat diuji-rusak 2026-09-21 pada
 * daftar sejenis di KepalaKatalog).
 *
 * "Riwayat" ikut ke sini karena tempatnya memang di kelompok akun; jalannya
 * yang lama (dari /profile dan baris personal beranda) TIDAK dicabut — ini
 * tambahan, bukan pemindahan.
 */
export const TUJUAN_AKUN: TujuanAkun[] = [
  { href: "/profile", label: "Profile" },
  { href: "/history", label: "Riwayat" },
  { href: "/admin", label: "Admin", adminOnly: true },
];

/**
 * Tujuan apa yang boleh dilihat peran ini.
 *
 * Sengaja fungsi murni terpisah walau isinya satu baris: inilah aturan yang
 * menentukan menu Admin BOCOR atau tidak ke penonton biasa, dan isi dropdown
 * Radix tidak pernah tergambar di HTML sampai menunya dibuka — jadi tanpa
 * fungsi ini aturannya mustahil diuji tanpa browser.
 */
export function tujuanAkunUntuk(role: User["role"] | undefined): TujuanAkun[] {
  return TUJUAN_AKUN.filter((t) => !t.adminOnly || role === "admin");
}

const ITEM_CLASS =
  "cursor-pointer text-sm focus:bg-zinc-800 focus:text-amber-400";

export default function MenuAkun() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { user, mounted } = usePenonton();

  const keluar = useCallback(() => {
    if (!confirm("Yakin mau keluar dari akun?")) return;
    clearUser();
    router.push("/");
  }, [router]);

  // Render pertama di server selalu "belum login" (localStorage tak ada di
  // sana), jadi `mounted` wajib ikut dijaga supaya HTML server dan browser
  // sama — kalau tidak, kepala situs berkedip begitu halaman aktif.
  if (!mounted || !user) return null;

  const tujuan = tujuanAkunUntuk(user.role);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menu akun"
        className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/60 py-1 pl-1 pr-2 text-white transition-colors outline-none hover:border-zinc-500 focus-visible:border-amber-400 data-[state=open]:border-amber-400"
      >
        <Avatar size="sm">
          <AvatarFallback
            className={cn(
              "bg-gradient-to-br text-xs font-bold text-black",
              getAvatarClass(user),
            )}
          >
            {user.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {/* Nama disembunyikan di layar sempit: di bawah ±640px ia memakan ruang
            yang dibutuhkan kotak cari, sedangkan avatarnya sendiri sudah cukup
            menandai "ini akun kamu". */}
        <span className="hidden max-w-28 truncate text-xs text-zinc-300 sm:inline">
          {user.name}
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-zinc-400" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="min-w-52 border-zinc-700 bg-zinc-900 text-zinc-200"
      >
        <DropdownMenuLabel className="flex items-center gap-2 text-xs font-normal text-zinc-500">
          <span className="truncate">Masuk sebagai {user.name}</span>
          <Badge
            className={cn(
              "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
              user.role === "admin"
                ? "bg-amber-400/20 text-amber-300"
                : "bg-zinc-700 text-zinc-300",
            )}
          >
            {user.role}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-700" />

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

        <DropdownMenuSeparator className="bg-zinc-700" />
        <DropdownMenuItem
          onClick={keluar}
          className={cn(ITEM_CLASS, "text-red-400 focus:text-red-300")}
        >
          <LogOut className="size-4" />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
