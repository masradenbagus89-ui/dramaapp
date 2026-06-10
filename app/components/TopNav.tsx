"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { clearUser, getAvatarClass, readUser, type User } from "@/lib/auth";
import CoinChip from "./CoinChip";

const LINKS = [
  { href: "/beranda", label: "Beranda", adminOnly: false },
  { href: "/discover", label: "Discover", adminOnly: false },
  { href: "/shorts", label: "Shorts", adminOnly: false },
  { href: "/my-list", label: "My List", adminOnly: false },
  { href: "/profile", label: "Profile", adminOnly: false },
  { href: "/admin", label: "Admin", adminOnly: true },
];

const PUBLIC_PATHS = ["/", "/login", "/daftar"];

export default function TopNav() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    setMounted(true);
    setUser(readUser());
    const handler = () => setUser(readUser());
    window.addEventListener("dramaku:auth-changed", handler);
    return () => window.removeEventListener("dramaku:auth-changed", handler);
  }, []);

  const isActive = useCallback(
    (href: string) => {
      if (href === "/beranda")
        return pathname === "/beranda" || pathname.startsWith("/drama");
      if (href === "/discover") return pathname.startsWith("/discover");
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

  if (pathname.startsWith("/watch") || pathname.startsWith("/feed")) return null;
  if (PUBLIC_PATHS.includes(pathname)) return null;

  const onLogout = () => {
    if (!confirm("Yakin mau keluar dari akun?")) return;
    clearUser();
    router.push("/");
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    router.push(q ? `/discover?q=${encodeURIComponent(q)}` : "/discover");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-black/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 md:px-6">
        <Link href="/beranda" className="flex items-center gap-2 transition-transform duration-200 hover:scale-105">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="DramaKu" width={36} height={36} className="h-9 w-9 object-contain" />
          <span className="hidden text-lg font-bold text-white sm:inline">DramaKu</span>
        </Link>

        <nav className="relative hidden items-center gap-1 md:flex">
          {/* Kotak kuning yang meluncur ke menu aktif */}
          {pill && (
            <span
              className="absolute top-0 bottom-0 z-0 rounded-md bg-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.45)] transition-all duration-300 ease-out"
              style={{ left: pill.left, width: pill.width }}
            />
          )}
          {LINKS.filter((l) => !l.adminOnly || user?.role === "admin").map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                ref={(el) => {
                  linkRefs.current[link.href] = el;
                }}
                className={`relative z-10 rounded-md px-3 py-1.5 text-sm transition-all duration-200 ${
                  active
                    ? "font-semibold text-black"
                    : "text-zinc-300 hover:-translate-y-0.5 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <form onSubmit={onSearch} className="ml-auto hidden flex-1 max-w-xs md:flex">
          <div className="relative w-full">
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-zinc-500"
            >
              <path d="M10 2a8 8 0 105.29 14.04l4.33 4.34 1.42-1.42-4.34-4.33A8 8 0 0010 2zm0 2a6 6 0 110 12 6 6 0 010-12z" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari drama, kategori..."
              className="w-full rounded-full border border-zinc-800 bg-zinc-900 py-1.5 pl-9 pr-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-amber-400"
            />
          </div>
        </form>

        <div className="flex items-center gap-2">
          {mounted && user ? (
            <div className="flex items-center gap-2">
              <CoinChip />
              <div className="hidden items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 sm:flex">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-black ${getAvatarClass(user)}`}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs text-zinc-300">{user.name}</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                    user.role === "admin"
                      ? "bg-amber-400/20 text-amber-300"
                      : "bg-zinc-700 text-zinc-300"
                  }`}
                >
                  {user.role}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-red-500 hover:text-red-400"
              >
                Keluar
              </button>
            </div>
          ) : mounted ? (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:border-amber-400 hover:text-amber-400"
              >
                Masuk
              </Link>
              <Link
                href="/daftar"
                className="rounded-full bg-amber-400 px-3 py-1.5 text-xs font-bold text-black transition-transform hover:scale-105 hover:bg-amber-300"
              >
                Daftar
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
