"use client";

// Bagian atas halaman admin: kartu ringkasan (Dashboard) + grafik Distribusi
// Kategori. Dipisah dari app/admin/page.tsx. Komponen ini menghitung
// ringkasannya sendiri dari daftar drama (computeAdminStats), jadi halaman
// induk cukup menyuplai daftar drama. Tampilan & angka sama persis.
import { useMemo } from "react";
import Link from "next/link";
import type { Drama } from "@/lib/types";
import { computeAdminStats } from "@/lib/admin-stats";
import { formatViews } from "@/lib/format";
import { CATEGORY_COLORS } from "@/app/admin/constants";
import StatCard from "@/app/components/admin/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminDashboard({ dramas }: { dramas: Drama[] }) {
  const stats = useMemo(() => computeAdminStats(dramas), [dramas]);
  const maxCategoryCount = stats.byCategory[0]?.[1] ?? 1;

  return (
    <>
      <section id="dashboard">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white md:text-3xl">Dashboard</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Selamat datang kembali, Admin 👋
            </p>
          </div>
          <Link
            href="/"
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-amber-400 hover:text-amber-400 md:hidden"
          >
            ← Web
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Total Drama"
            value={String(dramas.length)}
            accent="bg-amber-500/15 text-amber-400"
            icon="M4 6h16M4 12h16M4 18h16"
          />
          <StatCard
            label="Total Episode"
            value={String(stats.totalEpisode)}
            accent="bg-rose-500/15 text-rose-400"
            icon="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
          <StatCard
            label="Total View"
            value={formatViews(stats.totalViews)}
            accent="bg-emerald-500/15 text-emerald-400"
            icon="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
          <StatCard
            label="Drama Berposter"
            value={`${stats.withPoster}/${dramas.length}`}
            accent="bg-blue-500/15 text-blue-400"
            icon="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </div>
      </section>

      <Card className="rounded-2xl border-zinc-800 bg-zinc-900/40">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold text-white">
            Distribusi Kategori
          </CardTitle>
          <Badge
            variant="secondary"
            className="bg-zinc-800 text-xs font-normal text-zinc-400"
          >
            {stats.byCategory.length} kategori aktif
          </Badge>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {stats.byCategory.length === 0 ? (
            <p className="text-sm text-zinc-500">Belum ada drama.</p>
          ) : (
            stats.byCategory.map(([cat, count]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-xs text-zinc-300">{cat}</span>
                <div className="flex-1 h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className={`h-full ${CATEGORY_COLORS[cat] ?? "bg-zinc-500"}`}
                    style={{ width: `${(count / maxCategoryCount) * 100}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-xs text-zinc-400">{count}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </>
  );
}
