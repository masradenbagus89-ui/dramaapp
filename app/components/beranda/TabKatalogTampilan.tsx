import Link from "next/link";
import type { Drama } from "@/lib/types";
import {
  daftarTab,
  isiTabLengkap,
  TAB_BAWAAN,
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
/**
 * Penanda tujuan lompat tiap tab. Dipakai DUA kali di berkas ini — di `href`
 * tab dan di elemen tujuannya — jadi ditulis sekali supaya keduanya mustahil
 * menyimpang (salah ketik di salah satunya = klik tab yang tidak mendarat di
 * mana-mana, tanpa error apa pun).
 */
export const ID_DAFTAR = "daftar-katalog";

export default function TabKatalogTampilan({
  dramas,
  tab,
  semua,
  basePath = "/",
  hanyaMenu = false,
}: {
  dramas: Drama[];
  /** Tab yang sedang dibuka. Pemanggil yang menentukan dari mana asalnya. */
  tab: TabKey;
  /** true = tampilkan SELURUH isi tab sebagai grid, bukan baris geser. */
  semua: boolean;
  /**
   * Halaman tempat deret tab ini dipasang — tiap tab jadi tautan ke sini.
   *
   * ⚠️ WAJIB diisi `/beranda` saat dipakai di halaman itu, dan ini bukan
   * kerapian belaka: `RedirectIfAuthed` (app/components/RedirectIfAuthed.tsx:9)
   * melempar siapa pun yang SUDAH LOGIN dari `/` ke `/beranda`. Tab yang
   * menunjuk `/` akan memantul balik untuk penonton yang login — tabnya
   * terlihat tidak berfungsi, tanpa satu pun error.
   */
  basePath?: string;
  /**
   * true = gambar BARIS TABNYA SAJA, tanpa judul & daftar poster di bawahnya.
   *
   * Dipakai /beranda (owner 2026-09-26): di sana baris tab berfungsi sebagai
   * MENU — tiap tab membuka halaman katalognya sendiri. Menggambar isinya di
   * beranda juga berarti daftar yang sama muncul dua kali di satu halaman,
   * persis keluhan "ada 2 rekomendasi" yang owner sampaikan.
   */
  hanyaMenu?: boolean;
}) {
  const tabs = daftarTab(dramas);
  const aktif = tab;
  // Tab tahun bisa hilang dari daftar kalau katalog belum punya tahun sama
  // sekali; jatuh ke tab pertama supaya halaman tak pernah kosong.
  const tabAktif = tabs.find((t) => t.key === aktif) ?? tabs[0];

  if (!tabAktif) return null;

  const isi = isiTabLengkap(dramas, tabAktif.key);
  const tampil = semua ? isi : isi.slice(0, TAB_ROW_ITEMS);

  /**
   * Alamat sebuah tab, dengan atau tanpa mode "Semua".
   *
   * Dirakit lewat `URLSearchParams`, BUKAN dengan menyambung "?" dan "&"
   * sendiri. Versi sebelumnya menebak tanda sambungnya dari `key === "terbaru"`
   * — begitu `basePath` bisa berbeda atau tabnya bertambah, tebakan itu
   * menghasilkan alamat rusak seperti `/beranda?tab=x?semua=1`, dan akibatnya
   * cuma terlihat sebagai tombol yang diklik lalu tidak terjadi apa-apa.
   */
  const alamatTab = (key: TabKey, semuanya = false) => {
    const q = new URLSearchParams();
    if (key !== TAB_BAWAAN) q.set("tab", key);
    if (semuanya) q.set("semua", "1");
    const teks = q.toString();
    return teks ? `${basePath}?${teks}` : basePath;
  };

  return (
    <section className="bg-black py-3">
      {/* ===== Deret tab + tombol FILTER ===== */}
      {/* ===== Deret tab + tombol FILTER, dalam SATU kotak berpembatas =====
             Owner 2026-09-26: "aku mau jadi satu shadow ... seperti LK21 (jadi
             ada seperti pembatas)". Sebelumnya tiap tab punya bayangannya
             sendiri dan barisnya terbaca sebagai tombol-tombol yang berserakan;
             sekarang satu panel bergaris + satu bayangan, jadi seluruh baris
             terbaca sebagai SATU alat kendali. */}
      <div className={cn(SHELL)}>
        <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/80 p-2 shadow-[0_6px_20px_-6px_rgba(0,0,0,0.9)]">
        <div className="no-scrollbar flex flex-1 items-center gap-2 overflow-x-auto">
          {tabs.map((t) => {
            const sedangDipakai = t.key === tabAktif.key;
            return (
              <Link
                key={t.key}
                href={alamatTab(t.key)}
                aria-current={sedangDipakai ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-sm border px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide transition-all duration-200 md:text-xs",
                  sedangDipakai
                    // Bayangan kuning pada tab aktif: memberi kesan tombolnya
                    // TERANGKAT dari halaman, bukan sekadar berganti warna
                    // (owner 2026-09-26: "kasih shadow biar nampak pro").
                    ? "border-amber-400 bg-amber-400 text-black shadow-md shadow-amber-400/40"
                    : "border-zinc-700 text-zinc-300 hover:border-amber-400 hover:bg-zinc-900 hover:text-amber-400",
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </div>

        <FilterKatalog dramas={dramas} />
        </div>
      </div>

      {/* Mode MENU (dipakai /beranda): berhenti di sini — judul & daftarnya
          tinggal di halaman katalognya sendiri, supaya daftar yang sama tidak
          muncul dua kali dalam satu halaman. */}
      {hanyaMenu ? null : (
        <>
      {/* ===== Judul bagian + tombol SEMUA =====
             "SEMUA" sengaja TAUTAN ke halaman yang sama (`?semua=1`), bukan
             tombol yang membuka halaman lain: isinya memang sudah ada di layar,
             jadi memindahkan penonton ke halaman lain cuma menambah langkah.
             Bentuk tautan juga membuat keadaan "sedang dibuka semua" ikut di
             alamat — bisa dibagikan, dan tombol Kembali mengembalikannya. */}
      <div
        id={ID_DAFTAR}
        /* scroll-mt menahan judul dari balik bar cari yang menempel di atas.
           Tanpa ini, lompatan mendarat tepat di bawah bar dan baris judulnya
           tertutup — terlihat seperti mendarat di tempat yang salah. */
        className={cn(SHELL, "mt-3 flex scroll-mt-28 items-end justify-between gap-3")}
      >
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
            <Link href={alamatTab(tabAktif.key, !semua)}>
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
        </>
      )}
    </section>
  );
}
