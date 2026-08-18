"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Drama } from "@/lib/types";
import {
  AVATAR_COLORS,
  clearUser,
  getAvatarClass,
  readUser,
  writeUser,
  type User,
} from "@/lib/auth";
import CoinWallet from "@/app/components/CoinWallet";
import RecoverySection from "@/app/components/RecoverySection";
import AdBanner from "@/app/components/AdBanner";
import ContinueWatchingRow from "@/app/components/profile/ContinueWatchingRow";
import FavoritesRow from "@/app/components/profile/FavoritesRow";
import RecentHistoryRow from "@/app/components/profile/RecentHistoryRow";
import DashboardMenu from "@/app/components/profile/DashboardMenu";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Check, LogOut, Settings } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [dramasReady, setDramasReady] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string>("");
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    setMounted(true);
    setUser(readUser());

    const ac = new AbortController();
    fetch("/api/dramas", { signal: ac.signal })
      .then((r) => r.json())
      .then((data: Drama[]) => {
        setDramas(Array.isArray(data) ? data : []);
        setDramasReady(true);
      })
      .catch(() => setDramasReady(true));

    return () => ac.abort();
  }, []);

  const onLogout = () => {
    if (!confirm("Yakin mau keluar dari akun?")) return;
    clearUser();
    router.push("/");
  };

  const onStartEdit = () => {
    if (!user) return;
    setEditName(user.name);
    setEditColor(user.avatarColor || AVATAR_COLORS[0].className);
    setEditing(true);
    setSaveMsg(null);
  };

  const onCancelEdit = () => {
    setEditing(false);
    setSaveMsg(null);
  };

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      setSaveMsg({ type: "error", text: "Nama tidak boleh kosong." });
      return;
    }
    if (trimmed.length > 40) {
      setSaveMsg({ type: "error", text: "Nama maksimal 40 karakter." });
      return;
    }
    const updated: User = {
      ...user,
      name: trimmed,
      avatarColor: editColor || undefined,
    };
    writeUser(updated);
    setUser(updated);
    setEditing(false);
    setSaveMsg({ type: "ok", text: "Profil tersimpan." });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 md:px-6">
      {/* Header profil */}
      <Card className="mx-auto max-w-2xl border-zinc-800 bg-zinc-900/50 py-4">
        <CardContent className="px-4">
          <div className="flex items-center gap-4">
            <Avatar size="lg" className="h-16 w-16">
              <AvatarFallback
                className={cn(
                  "bg-gradient-to-br text-2xl font-bold text-black",
                  getAvatarClass(user),
                )}
              >
                {mounted && user ? user.name.charAt(0).toUpperCase() : "T"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              {mounted && user ? (
                <>
                  <div className="flex items-center gap-2">
                    <h1 className="truncate text-lg font-semibold text-white">{user.name}</h1>
                    <Badge
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                        user.role === "admin"
                          ? "bg-amber-400/20 text-amber-300"
                          : "bg-zinc-700 text-zinc-300",
                      )}
                    >
                      {user.role}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-zinc-400">{user.email}</p>
                </>
              ) : (
                <>
                  <h1 className="text-lg font-semibold text-white">Tamu</h1>
                  <p className="text-xs text-zinc-400">Belum login · Mode tamu</p>
                </>
              )}
            </div>
            {mounted && user && !editing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onStartEdit}
                className="rounded-full border-zinc-700 bg-transparent text-xs font-semibold text-zinc-300 hover:border-amber-400 hover:text-amber-400"
              >
                <Settings className="mr-1.5 size-3.5" />
                Edit
              </Button>
            )}
          </div>

          {/* Edit form */}
          {editing && user && (
            <form onSubmit={onSave} className="mt-4 border-t border-zinc-800 pt-4">
              <Label htmlFor="profile-name" className="text-zinc-300">
                Nama
              </Label>
              <Input
                id="profile-name"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={40}
                className="mt-1 rounded-lg border-zinc-700 bg-zinc-900 text-white focus-visible:border-amber-400 focus-visible:ring-0"
              />

              <div className="mt-4">
                <p className="text-sm font-medium text-zinc-300">Warna avatar</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {AVATAR_COLORS.map((c) => {
                    const active = editColor === c.className;
                    return (
                      <Button
                        key={c.id}
                        type="button"
                        size="icon"
                        onClick={() => setEditColor(c.className)}
                        title={c.label}
                        className={cn(
                          "relative h-10 w-10 rounded-full bg-gradient-to-br transition-transform",
                          c.className,
                          active
                            ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110"
                            : "hover:scale-105",
                        )}
                      >
                        {active && (
                          <Check className="absolute inset-0 m-auto h-5 w-5 text-white" strokeWidth={3} />
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {saveMsg && (
                <div
                  className={cn(
                    "mt-3 rounded-lg border px-3 py-2 text-sm",
                    saveMsg.type === "ok"
                      ? "border-emerald-700 bg-emerald-900/30 text-emerald-300"
                      : "border-red-700 bg-red-900/30 text-red-300",
                  )}
                >
                  {saveMsg.text}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <Button
                  type="submit"
                  className="flex-1 rounded-full bg-amber-400 py-2.5 font-bold text-black hover:bg-amber-300"
                >
                  Simpan
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancelEdit}
                  className="flex-1 rounded-full border-zinc-700 bg-transparent py-2.5 font-semibold text-zinc-300 hover:border-zinc-500"
                >
                  Batal
                </Button>
              </div>
            </form>
          )}

          {!editing && saveMsg && (
            <div className="mt-3 rounded-lg border border-emerald-700 bg-emerald-900/30 px-3 py-2 text-sm text-emerald-300">
              {saveMsg.text}
            </div>
          )}
        </CardContent>
      </Card>

      {mounted && !user && (
        <div className="mx-auto mt-3 flex max-w-2xl gap-2">
          <Button
            asChild
            variant="outline"
            className="flex-1 rounded-full border-zinc-700 bg-transparent py-3 font-semibold text-white hover:border-amber-400 hover:text-amber-400"
          >
            <Link href="/login">Masuk</Link>
          </Button>
          <Button
            asChild
            className="flex-1 rounded-full bg-amber-400 py-3 font-bold text-black hover:bg-amber-300"
          >
            <Link href="/daftar">Daftar</Link>
          </Button>
        </div>
      )}

      {/* Dashboard konten */}
      <div className="mx-auto mt-6 max-w-7xl space-y-8">
        {dramasReady && (
          <>
            <ContinueWatchingRow dramas={dramas} />
            <FavoritesRow dramas={dramas} />
            <RecentHistoryRow dramas={dramas} />
          </>
        )}

        <DashboardMenu onOpenSettings={onStartEdit} />

        <div id="premium">
          <CoinWallet />
        </div>

        {/* Kode pemulihan hanya relevan untuk akun penonton; admin punya
            jalur password sendiri di panel admin. */}
        {mounted && user && user.role !== "admin" && <RecoverySection />}

        {/* Slot iklan otomatis — passive income; fallback iklan manual/promo. */}
        <AdBanner className="mx-auto max-w-2xl" />
      </div>

      {mounted && user && (
        <Button
          type="button"
          variant="outline"
          onClick={onLogout}
          className="mx-auto mt-6 flex h-auto w-full max-w-2xl items-center justify-center gap-2 rounded-2xl border-zinc-800 bg-zinc-900/50 py-3 font-semibold text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Keluar dari akun
        </Button>
      )}

      <p className="mt-6 text-center text-[11px] text-zinc-600">
        DramaKu v0.1 · Prototype
      </p>
    </div>
  );
}
