import Link from "next/link";
import type { Drama } from "@/lib/types";
import {
  daftarTab,
  isiTabLengkap,
  TAB_ROW_ITEMS,
  type TabKey,
} from "@/lib/tab-katalog";
import CatalogCard from "./CatalogCard";
import FeaturedRow from "./FeaturedRow";
import FilterKatalog from "./FilterKatalog";
import { GRID_CLASS, ROW_KATEGORI_CARD_CLASS, SHELL } from "./shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Deret tab katalog di halaman depan — pola situs streaming katalog yang diminta
 * owner 2026-09-22: TERBARU · SERIES UNGGULAN · SERIES UPDATE · TERPOPULER ·
 * REKOMENDASI · <tahun>, dengan tombol FILTER di ujung kanan.
 *
 * BERKAS INI MURNI TAMPILAN — tanpa hook, tanpa "use client". Itu disengaja:
 * bentuk yang sama dipakai DUA kali — sekali dirender di SERVER sebagai isi
 * <Suspense fallback> (supaya halaman depan sudah berisi sejak HTML pertama,
 * bukan kosong lalu melompat), sekali lagi di browser oleh TabKatalog.tsx yang
 * membaca alamat. Menyalin markup-nya dua kali pasti menyimpang sebelah.
 *
 * KENAPA tabnya TAUTAN (bukan tombol ber-state): halaman depan sengaja
 * ber-state): halaman depan sengaja dipertahankan STATIS (`revalidate = 60` di
 * app/page.tsx). Kalau tab dibaca lewat `searchParams` milik halaman, Next
 * membangun ulang SELURUH halaman untuk tiap pengunjung dan angka itu jadi
 * percuma. Membacanya di sini lewat `useSearchParams()` membuat halamannya tetap
 * statis — dan karena tabnya tautan sungguhan, alamatnya bisa di-bookmark,
 * dibagikan, serta tombol Kembali browser tetap bekerja.
 *
 * Komponen ini WAJIB dibungkus <Suspense> oleh pemanggilnya — syarat Next untuk
 * `useSearchParams()`. Tanpa itu build gagal (pelajaran yang sudah tercatat di
 * /discover).
 */
export default function TabKatalogTampilan({
  dramas,
  tab,
  semua,
}: {
  dramas: Drama[];
  /** Tab yang sedang dibuka. Pemanggil yang menentukan dari mana asalnya. */
  tab: TabKey;
  /** true = tampilkan SELURUH isi tab sebagai grid, bukan baris geser. */
  semua: boolean;
}) {
  const tabs = daftarTab(dramas);
  const aktif = tab;
  // Tab tahun bisa hilang dari daftar kalau katalog belum punya tahun sama
  // sekali; jatuh ke tab pertama supaya halaman tak pernah kosong.
  const tabAktif = tabs.find((t) => t.key === aktif) ?? tabs[0];

  if (!tabAktif) return null;

  const isi = isiTabLengkap(dramas, tabAktif.key);
  const tampil = semua ? isi : isi.slice(0, TAB_ROW_ITEMS);

  const alamatTab = (key: TabKey) => (key === "terbaru" ? "/" : `/?tab=${key}`);

  return (
    <section className="border-b border-zinc-900 bg-black pb-2 pt-3">
      {/* ===== Deret tab + tombol FILTER ===== */}
      <div className={cn(SHELL, "flex items-center gap-2")}>
        <div className="no-scrollbar flex flex-1 items-center gap-2 overflow-x-auto">
          {tabs.map((t) => {
            const sedangDipakai = t.key === tabAktif.key;
            return (
              <Link
                key={t.key}
                href={alamatTab(t.key)}
                aria-current={sedangDipakai ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-sm border px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide transition-colors md:text-xs",
                  sedangDipakai
                    ? "border-amber-400 bg-amber-400 text-black"
                    : "border-zinc-700 text-zinc-300 hover:border-amber-400 hover:text-amber-400",
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </div>

        <FilterKatalog dramas={dramas} />
      </div>

      {/* ===== Judul bagian + tombol SEMUA =====
             "SEMUA" sengaja TAUTAN ke halaman yang sama (`?semua=1`), bukan
             tombol yang membuka halaman lain: isinya memang sudah ada di layar,
             jadi memindahkan penonton ke halaman lain cuma menambah langkah.
             Bentuk tautan juga membuat keadaan "sedang dibuka semua" ikut di
             alamat — bisa dibagikan, dan tombol Kembali mengembalikannya. */}
      <div className={cn(SHELL, "mt-3 flex items-end justify-between gap-3")}>
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold text-white md:text-lg">
            {tabAktif.judul}
          </h2>
          <p className="mt-0.5 truncate text-[11px] text-zinc-500">
            {tabAktif.keterangan} · {isi.length} judul
          </p>
        </div>
        {isi.length > TAB_ROW_ITEMS && (
          <Button
            asChild
            size="sm"
            className="h-8 shrink-0 rounded-sm bg-gradient-to-r from-fuchsia-600 to-rose-600 px-4 text-[11px] font-bold uppercase tracking-wide text-white hover:from-fuchsia-500 hover:to-rose-500"
          >
            <Link
              href={
                semua
                  ? alamatTab(tabAktif.key)
                  : `${alamatTab(tabAktif.key)}${tabAktif.key === "terbaru" ? "?" : "&"}semua=1`
              }
            >
              {semua ? "Ringkas" : "Semua"}
            </Link>
          </Button>
        )}
      </div>

      {/* ===== Isi: baris geser, atau grid penuh kalau "Semua" ditekan ===== */}
      {tampil.length === 0 ? (
        <div className={cn(SHELL, "py-10 text-center text-sm text-zinc-500")}>
          Belum ada judul di bagian ini.
        </div>
      ) : semua ? (
        <div className={cn(SHELL, "pb-4")}>
          <div className={GRID_CLASS}>
            {tampil.map((d) => (
              <CatalogCard key={d.id} drama={d} />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-2">
          <FeaturedRow
            dramas={tampil}
            cardClass={ROW_KATEGORI_CARD_CLASS}
            tombolBawah={false}
          />
        </div>
      )}
    </section>
  );
}
