"use client";

// Bagian atas halaman admin: kartu ringkasan (Dashboard) + grafik Distribusi
// Kategori. Dipisah dari app/admin/page.tsx. Komponen ini menghitung
// ringkasannya sendiri dari daftar drama (computeAdminStats), jadi halaman
// induk cukup menyuplai daftar drama. Tampilan & angka sama persis.
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { KATEGORI_ISI, type Drama } from "@/lib/types";
import {
  computeAdminStats,
  hitungKategoriFilm,
  lengkapiDistribusiKategori,
  persenDariJumlah,
} from "@/lib/admin-stats";
import { formatViews } from "@/lib/format";
import { warnaKategori } from "@/app/admin/constants";
import StatCard from "@/app/components/admin/StatCard";
import PlaylyStatusCard from "@/app/components/admin/PlaylyStatusCard";
import KatalogStatusCard from "@/app/components/admin/KatalogStatusCard";
import SegarkanCacheCard from "@/app/components/admin/SegarkanCacheCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Kategori yang punya film tapi bagiannya di bawah 1% jangan tertulis 0%. */
function teksPersen(persen: number, jumlah: number): string {
  return jumlah > 0 && persen === 0 ? "<1%" : `${persen}%`;
}

export default function AdminDashboard({ dramas }: { dramas: Drama[] }) {
  const stats = useMemo(() => computeAdminStats(dramas), [dramas]);
  // Grafik ini menghitung kategori FILM di panel IMDb, bukan kategori drama
  // lama. Drama lama cuma puluhan judul, sedangkan film yang sudah diberi
  // kategori jauh lebih banyak — kalau sumbernya drama, grafik tetap bilang
  // "belum dipakai" untuk kategori yang di film sudah terpasang.
  const [hitungFilm, setHitungFilm] = useState<[string, number][] | null>(null);
  const [galatKategori, setGalatKategori] = useState<string | null>(null);
  const [memuatKategori, setMemuatKategori] = useState(false);

  const muatKategoriFilm = useCallback(async () => {
    setMemuatKategori(true);
    setGalatKategori(null);
    try {
      const res = await fetch("/api/admin/playly/genre");
      const data = (await res.json()) as {
        genres?: Record<string, string>;
        error?: string;
      };
      if (!res.ok) {
        setGalatKategori(data.error ?? "Kategori film tidak terbaca.");
        return;
      }
      setHitungFilm(hitungKategoriFilm(data.genres ?? {}));
    } catch {
      setGalatKategori("Tidak bisa menghubungi server. Coba lagi.");
    } finally {
      setMemuatKategori(false);
    }
  }, []);

  useEffect(() => {
    void muatKategoriFilm();
  }, [muatKategoriFilm]);

  const distribusi = useMemo(
    () => lengkapiDistribusiKategori(hitungFilm ?? [], KATEGORI_ISI),
    [hitungFilm],
  );
  const { kosong, persen } = useMemo(() => {
    const terisi = distribusi.filter(([, jumlah]) => jumlah > 0);
    const bagian = persenDariJumlah(terisi.map(([, jumlah]) => jumlah));
    return {
      kosong: distribusi.filter(([, jumlah]) => jumlah === 0),
      // Satu batang untuk semua kategori terpakai. Tinggi kartu tidak bertambah
      // kalau kategori yang terisi makin banyak — yang bertambah hanya teks persen.
      persen: terisi.map(([kategori, jumlah], i) => ({
        kategori,
        jumlah,
        persen: bagian[i] ?? 0,
      })),
    };
  }, [distribusi]);

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

        {/* Status sambungan Playly: dipisah dari 4 kartu angka di atas
            karena ini kondisi sambungan (hidup/mati), bukan statistik
            katalog drama. */}
        <PlaylyStatusCard />

        {/* Sumber data katalog. Dipasang TEPAT di bawah kartu Playly karena
            keduanya sejenis — kondisi hidup/mati, bukan statistik. Kartu ini
            menjawab satu hal yang sebelumnya MUSTAHIL diketahui: apakah judul
            yang dilihat penonton datang dari database, atau dari berkas
            cadangan di dalam aplikasi yang bisa tertinggal jauh. Angka
            "Total Drama" di atas sengaja TIDAK dipakai untuk itu — ia
            menghitung daftar yang sudah terlanjur dipilihkan, jadi ia tetap
            terlihat wajar justru saat sumbernya salah. */}
        <KatalogStatusCard />

        {/* Tombol buang cache manual — lihat lib/cache-publik.ts. */}
        <SegarkanCacheCard />
      </section>

      <Card className="rounded-2xl border-zinc-800 bg-zinc-900/40">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold text-white">
            Distribusi Kategori
          </CardTitle>
          <button
            type="button"
            onClick={() => void muatKategoriFilm()}
            disabled={memuatKategori}
            title="Muat ulang dari kategori yang terpasang di film IMDb"
            className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-normal text-zinc-400 hover:text-zinc-200 disabled:opacity-60"
          >
            {memuatKategori
              ? "Memuat…"
              : `${hitungFilm?.length ?? 0} kategori aktif`}
          </button>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {galatKategori ? (
            <p className="text-sm text-rose-400">{galatKategori}</p>
          ) : hitungFilm === null ? (
            <p className="text-sm text-zinc-500">Membaca kategori film…</p>
          ) : hitungFilm.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Belum ada film yang diberi kategori.
            </p>
          ) : (
            <>
              <div
                className="flex h-3 overflow-hidden rounded-full bg-zinc-800"
                role="img"
                aria-label={persen
                  .map((b) => `${b.kategori} ${teksPersen(b.persen, b.jumlah)}`)
                  .join(", ")}
              >
                {persen.map((b) => (
                  <div
                    key={b.kategori}
                    className={warnaKategori(b.kategori)}
                    style={{ width: `${b.persen}%` }}
                    title={`${b.kategori} ${teksPersen(b.persen, b.jumlah)} (${b.jumlah})`}
                  />
                ))}
              </div>
              <p className="text-xs leading-5 text-zinc-300">
                {persen
                  .map((b) => `${b.kategori} ${teksPersen(b.persen, b.jumlah)}`)
                  .join(" · ")}
              </p>
              {kosong.length > 0 ? (
                <div className="border-t border-zinc-800 pt-3">
                  <p className="text-xs text-zinc-500">Belum dipakai</p>
                  <p className="mt-1.5 text-xs leading-5 text-zinc-400">
                    {kosong.map(([cat]) => cat).join(" · ")}
                  </p>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
