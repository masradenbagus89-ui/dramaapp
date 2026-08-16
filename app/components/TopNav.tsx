"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearUser,
  fetchUserRole,
  getAvatarClass,
  needsAdminRelogin,
  readUser,
  type User,
} from "@/lib/auth";
import CoinChip from "./CoinChip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { LogOut, Search } from "lucide-react";

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
  const [promptAdminRelogin, setPromptAdminRelogin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    setMounted(true);
    let cancelled = false;
    const apply = () => {
      const u = readUser();
      setUser(u);
      if (!u || u.role === "admin") {
        setPromptAdminRelogin(false);
        return;
      }
      void fetchUserRole(u.email).then((role) => {
        if (cancelled) return;
        const latest = readUser();
        if (!latest || latest.email !== u.email) return;
        setPromptAdminRelogin(needsAdminRelogin(latest, role === "admin"));
      });
    };
    apply();
    const handler = () => apply();
    window.addEventListener("dramaku:auth-changed", handler);
    return () => {
      cancelled = true;
      window.removeEventListener("dramaku:auth-changed", handler);
    };
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

  const overlayHero =
    pathname === "/beranda" || pathname.startsWith("/discover");

  useEffect(() => {
    if (!overlayHero) {
      setScrolled(false);
      return;
    }
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlayHero]);

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
    <>
    <header
      className={cn(
        overlayHero
          ? cn(
              "fixed inset-x-0 top-0 z-40 border-b transition-colors duration-300",
              scrolled
                ? "border-zinc-800 bg-black/90 backdrop-blur"
                : "border-transparent bg-gradient-to-b from-black/85 via-black/40 to-transparent",
            )
          : "sticky top-0 z-30 border-b border-zinc-800 bg-black/95 backdrop-blur",
      )}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 md:px-6">
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
                      ? "font-semibold text-black"
                      : "text-zinc-300 hover:-translate-y-0.5 hover:text-white",
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
              placeholder="Cari drama, kategori..."
              className="rounded-full border-zinc-800 bg-zinc-900 pl-9 text-sm text-white placeholder:text-zinc-500 focus-visible:border-amber-400 focus-visible:ring-0"
            />
          </div>
        </form>

        <div className="flex items-center gap-2">
          {mounted && user ? (
            <div className="flex items-center gap-2">
              <CoinChip />
              <div className="hidden items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 sm:flex">
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
                <span className="text-xs text-zinc-300">{user.name}</span>
                <Badge
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                    user.role === "admin"
                      ? "bg-amber-400/20 text-amber-300"
                      : "bg-zinc-700 text-zinc-300",
                  )}
                >
                  {user.role}
                </Badge>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onLogout}
                className="rounded-full border-zinc-700 bg-transparent text-xs text-zinc-300 hover:border-red-500 hover:text-red-400"
              >
                <LogOut className="size-3.5" />
                Keluar
              </Button>
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
    {promptAdminRelogin && (
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
