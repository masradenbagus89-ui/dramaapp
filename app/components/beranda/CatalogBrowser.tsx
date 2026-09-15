"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Category, Drama } from "@/lib/types";
import {
  filterAndSortDramas,
  getYearOptions,
  RATING_OPTIONS,
  type RatingKey,
} from "@/lib/discover";
import {
  CATALOG_PER_PAGE,
  CATALOG_SORTS,
  // Dipakai sebagai `SEMUA` di bawah. Di-alias supaya nilainya punya SATU
  // sumber (lib) tanpa mengganti nama yang sudah dipakai di sepanjang berkas.
  GENRE_SEMUA as SEMUA,
  PAGE_GAP,
  URUTAN_BAWAAN,
  availableGenres,
  countWithRating,
  countWithYear,
  homeCatalogRows,
  pageNumbers,
  pageOfCatalog,
  sedangMenyaring,
  sortCatalog,
  type CatalogSort,
} from "@/lib/beranda-catalog";
import { buildNavMenus, catalogShortcuts } from "@/lib/nav-katalog";
import type { PlaylyVideoPublik } from "@/lib/playly-publik";
import CatalogCard from "./CatalogCard";
import FeaturedRow from "./FeaturedRow";
import GenreStrip from "./GenreStrip";
import HasilPlayly, { cariVideoPlayly } from "./HasilPlayly";
import NavMenus from "./NavMenus";
import SearchBar from "./SearchBar";
import {
  GRID_CLASS,
  ROW_KATEGORI_CARD_CLASS,
  SHELL,
  TRIGGER_CLASS,
} from "./shell";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Home, Search, X } from "lucide-react";

type Props = {
  dramas: Drama[];
  /**
   * Banner unggulan, digambar tepat di bawah strip genre. Isinya ditentukan
   * halaman supaya komponen ini tidak ikut mengurus teaser video.
   */
  heroSlot?: React.ReactNode;
  /** Blok bebas di antara banner dan hitungan halaman (iklan + baris personal). */
  beforeGridSlot?: React.ReactNode;
  /**
   * Video Playly untuk bagian hasil di bawah grid. Datang dari gudang data
   * TERPISAH (lib/playly-publik.ts, server-only) sehingga harus dioper dari
   * halaman — komponen ini "use client" dan tak boleh mengambilnya sendiri.
   * Default daftar kosong: bagiannya hilang sendiri, bukan error.
   */
  playlyVideos?: PlaylyVideoPublik[];
};

/**
 * Katalog beranda gaya situs streaming: bar cari mencolok di paling atas, strip
 * genre, lalu GRID POSTER PADAT ber-paginasi.
 *
 * Bar cari & strip genre sengaja selebar penuh layar (bukan dibatasi shell)
 * supaya terbaca sebagai "kepala situs", sama seperti contoh yang diminta owner.
 * Isi lainnya tetap dibatasi `shell-wide` agar sejajar dengan navbar.
 *
 * Penyaringnya dipakai ulang dari `lib/discover.ts` (yang sama dengan
 * /discover) supaya "cari Romance" berarti hal yang sama di dua halaman —
 * kalau ditulis ulang di sini, dua halaman akan pelan-pelan menyimpang.
 * Pengurutan & paginasinya khas beranda, ada di `lib/beranda-catalog.ts`.
 */
export default function CatalogBrowser({
  dramas,
  heroSlot,
  beforeGridSlot,
  playlyVideos = [],
}: Props) {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState<string>(SEMUA);
  const [year, setYear] = useState("all");
  const [minRating, setMinRating] = useState<RatingKey>("all");
  const [sort, setSort] = useState<CatalogSort>(URUTAN_BAWAAN);
  const [page, setPage] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);

  const genres = useMemo(() => availableGenres(dramas), [dramas]);
  // Menu & pintasan katalog. Keduanya menuju /discover — satu-satunya halaman
  // yang membaca penyaring dari alamat URL. Halaman INI menyimpan penyaringnya
  // di state lokal, jadi tautan `?sort=…` ke sini akan diabaikan diam-diam.
  const menus = useMemo(() => buildNavMenus(dramas), [dramas]);
  const shortcuts = useMemo(() => catalogShortcuts(dramas), [dramas]);
  const years = useMemo(() => getYearOptions(dramas), [dramas]);
  const adaTahun = useMemo(() => countWithYear(dramas) > 0, [dramas]);
  const adaRating = useMemo(() => countWithRating(dramas) > 0, [dramas]);

  const hasil = useMemo(() => {
    const tersaring = filterAndSortDramas(dramas, {
      query,
      category: genre as Category,
      year,
      minRating,
      // Pengurutan diserahkan ke sortCatalog di bawah — di sini murni menyaring.
      sortBy: "relevance",
    });
    return sortCatalog(tersaring, sort);
  }, [dramas, query, genre, year, minRating, sort]);

  const halaman = useMemo(
    () => pageOfCatalog(hasil, page, CATALOG_PER_PAGE),
    [hasil, page],
  );

  // Video Playly disaring dengan ketikan YANG SAMA. Dihitung di sini (bukan di
  // dalam HasilPlayly) karena jumlahnya ikut dipakai pesan "tidak ada judul
  // yang cocok" di bawah — supaya penonton tahu harus menggulir, bukan mengira
  // pencariannya gagal.
  const videoPlayly = useMemo(
    () => cariVideoPlayly(playlyVideos, query),
    [playlyVideos, query],
  );

  /**
   * Baris kategori gaya Layarkaca21 (Drama Terbaru, Drama Action, …) — bentuk
   * halaman saat penonton TIDAK sedang mencari. Dihitung dari katalog PENUH,
   * bukan `hasil`: barisnya punya urutan & pengelompokannya sendiri.
   *
   * Fungsinya yang SAMA dipakai halaman depan `/`, jadi kedua halaman
   * menampilkan kategori yang sama persis tanpa aturan kembar yang bisa
   * menyimpang diam-diam.
   */
  const baris = useMemo(() => homeCatalogRows(dramas), [dramas]);

  const menyaring = sedangMenyaring({ query, genre, year, minRating, sort });

  /**
   * Tampilkan grid + nomor halaman, atau baris kategori?
   *
   * `baris.length === 0` ikut memaksa grid sebagai JARING PENGAMAN: katalog yang
   * isinya di bawah `ROW_MIN_ITEMS` tidak menghasilkan satu baris pun, dan tanpa
   * cadangan ini tengah halaman jadi kosong melompong tanpa error — penonton
   * melihat situs yang seperti rusak, padahal katalognya saja yang masih sepi.
   */
  const tampilGrid = menyaring || baris.length === 0;

  /**
   * Tiap penyaring berubah, balik ke halaman 1 — kalau tidak, hasil 2 drama
   * yang dilihat dari "halaman 5" akan tampil kosong tanpa penjelasan.
   */
  const ubahFilter = (aksi: () => void) => {
    aksi();
    setPage(1);
  };

  const gantiHalaman = (n: number) => {
    setPage(n);
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const resetFilter = () => {
    setQuery("");
    setGenre(SEMUA);
    setYear("all");
    setMinRating("all");
    // Urutan ikut dipulangkan ke bawaan supaya "Hapus filter" benar-benar
    // mengembalikan penonton ke baris kategori. Tanpa ini, urutan yang masih
    // tersangkut menahan halaman di bentuk grid dan tombolnya terasa tidak
    // bekerja.
    setSort(URUTAN_BAWAAN);
    setPage(1);
  };

  /** Dipakai dua kali: berjajar di bar magenta (desktop) & menumpuk (HP). */
  const dropdownPenyaring = (
    <>
      <Select
        value={genre}
        onValueChange={(v) => ubahFilter(() => setGenre(v))}
      >
        <SelectTrigger className={TRIGGER_CLASS} aria-label="Genre">
          <SelectValue placeholder="Genre" />
        </SelectTrigger>
        <SelectContent className="border-zinc-700 bg-zinc-900 text-zinc-200">
          <SelectItem value={SEMUA}>Semua genre</SelectItem>
          {genres.map((g) => (
            <SelectItem key={g} value={g}>
              {g}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={sort}
        onValueChange={(v) => ubahFilter(() => setSort(v as CatalogSort))}
      >
        <SelectTrigger className={TRIGGER_CLASS} aria-label="Urutkan">
          <SelectValue placeholder="Urutkan" />
        </SelectTrigger>
        <SelectContent className="border-zinc-700 bg-zinc-900 text-zinc-200">
          {CATALOG_SORTS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Dropdown Tahun & Rating SENGAJA disembunyikan kalau tak ada satu pun
          drama yang punya datanya — penyaring yang selalu memulangkan nol hasil
          membuat situs terasa rusak. */}
      {adaTahun && (
        <Select value={year} onValueChange={(v) => ubahFilter(() => setYear(v))}>
          <SelectTrigger className={TRIGGER_CLASS} aria-label="Tahun">
            <SelectValue placeholder="Tahun" />
          </SelectTrigger>
          <SelectContent className="border-zinc-700 bg-zinc-900 text-zinc-200">
            <SelectItem value="all">Semua tahun</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {adaRating && (
        <Select
          value={minRating}
          onValueChange={(v) => ubahFilter(() => setMinRating(v as RatingKey))}
        >
          <SelectTrigger className={TRIGGER_CLASS} aria-label="Rating IMDb">
            <SelectValue placeholder="Rating" />
          </SelectTrigger>
          <SelectContent className="border-zinc-700 bg-zinc-900 text-zinc-200">
            {RATING_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </>
  );

  return (
    <section aria-label="Katalog drama">
      {/* ============ 1. BAR CARI — kepala situs, menempel saat digulir ======
          top-14 = tepat di bawah navbar (tingginya h-14). Komponennya SAMA
          dengan yang dipakai halaman depan; bedanya cuma arti pencariannya —
          di sini menyaring grid di bawah, di sana melempar ke /discover. */}
      <SearchBar
        value={query}
        onValueChange={(v) => ubahFilter(() => setQuery(v))}
        filters={dropdownPenyaring}
        chrome={{ menus: <NavMenus menus={menus} /> }}
        className="sticky top-14"
      />

      {/* ============ 2. STRIP GENRE ========================================
          Hanya genre yang benar-benar berisi (availableGenres) — genre kosong
          yang diklik memulangkan halaman hampa. */}
      <GenreStrip
        genres={[SEMUA, ...genres]}
        active={genre}
        onSelect={(g) => ubahFilter(() => setGenre(g))}
        shortcuts={shortcuts}
        moreHref="/discover"
      />

      {/* ============ 3. BANNER UNGGULAN (ramping) ========================== */}
      {heroSlot}

      {/* ============ 4. ISI HALAMAN ======================================= */}
      <div className={SHELL}>
        {beforeGridSlot}

        {/* Remah jejak: penonton tahu sedang berada di mana. */}
        <nav
          aria-label="Remah jejak"
          className="flex items-center gap-1.5 pt-5 text-[11px] text-zinc-500"
        >
          <Home className="size-3" />
          <Link href="/beranda" className="hover:text-amber-400">
            Beranda
          </Link>
          <span>/</span>
          <span className="text-zinc-300">Drama</span>
          {genre !== SEMUA && (
            <>
              <span>/</span>
              <span className="font-semibold text-amber-400">{genre}</span>
            </>
          )}
        </nav>
      </div>

      {/* ============ 5. ISI TENGAH — dua bentuk, satu penentu ==============
             Tidak mencari  -> BARIS KATEGORI gaya Layarkaca21 (permintaan owner
             2026-09-15): tiap kategori satu baris poster kecil yang digeser ke
             samping, berjudul di kiri dan "Lihat semua" di kanan.
             Sedang mencari -> grid hasil + nomor halaman, persis seperti dulu.

             KENAPA bercabang, bukan menampilkan keduanya: itulah cara situs
             katalog yang dicontohkan owner bekerja — daftar panjang baru muncul
             ketika penonton benar-benar mencari sesuatu. Nol fitur dibuang;
             pencarian, penyaring, dan paginasi semuanya tetap ada. ===== */}
      {!tampilGrid ? (
        /* Baris kategori sengaja di LUAR pembungkus SHELL: FeaturedRow sudah
           membawa `shell-wide … px-4 md:px-6` sendiri, jadi membungkusnya lagi
           akan menggandakan jarak tepi kiri-kanan. */
        <div className="pt-4">
          {baris.map((row) => (
            <FeaturedRow
              key={row.key}
              title={row.title}
              dramas={row.items}
              href={row.href}
              cardClass={ROW_KATEGORI_CARD_CLASS}
            />
          ))}
        </div>
      ) : (
      <div className={SHELL}>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <h2 className="text-sm text-zinc-400">
            <span className="font-bold text-white">
              Halaman {halaman.page} dari {halaman.totalPages}
            </span>{" "}
            &mdash; {halaman.total} judul
            {genre !== SEMUA ? ` genre ${genre}` : ""}
            {query ? ` untuk "${query}"` : ""}
          </h2>

          {menyaring && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetFilter}
              className="h-8 gap-1 rounded-sm text-xs text-zinc-400 hover:text-white"
            >
              <X className="size-3.5" />
              Hapus filter
            </Button>
          )}
        </div>

        {/* Grid poster padat. scroll-mt-32 = saat pindah halaman, judul grid
            tidak tersembunyi di balik navbar + bar cari yang menempel. */}
        <div ref={gridRef} className="scroll-mt-32">
          {halaman.items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Search className="size-8 text-zinc-700" />
              <p className="text-sm text-zinc-500">
                Tidak ada judul yang cocok dengan pencarian ini.
              </p>
              {videoPlayly.length > 0 && (
                <p className="text-sm font-medium text-amber-400">
                  Tapi ada {videoPlayly.length} video Playly yang cocok &mdash;
                  ada di bawah halaman ini.
                </p>
              )}
              {menyaring && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetFilter}
                  className="rounded-sm border-zinc-700 bg-transparent text-xs text-zinc-300 hover:border-amber-400 hover:text-amber-400"
                >
                  Hapus semua filter
                </Button>
              )}
            </div>
          ) : (
            <div className={GRID_CLASS}>
              {halaman.items.map((d) => (
                <CatalogCard key={d.id} drama={d} />
              ))}
            </div>
          )}
        </div>

        {halaman.totalPages > 1 && (
          <nav
            aria-label="Halaman katalog"
            className="mt-6 flex flex-wrap items-center justify-center gap-1"
          >
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={halaman.page <= 1}
              onClick={() => gantiHalaman(halaman.page - 1)}
              aria-label="Halaman sebelumnya"
              className="size-8 rounded-sm border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-amber-400 hover:text-amber-400 disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </Button>

            {pageNumbers(halaman.page, halaman.totalPages).map((n, i) =>
              n === PAGE_GAP ? (
                <span key={`gap-${i}`} className="px-1.5 text-xs text-zinc-600">
                  {PAGE_GAP}
                </span>
              ) : (
                <Button
                  key={n}
                  type="button"
                  size="sm"
                  variant={n === halaman.page ? "default" : "outline"}
                  onClick={() => gantiHalaman(n)}
                  aria-current={n === halaman.page ? "page" : undefined}
                  className={cn(
                    "size-8 rounded-sm p-0 text-xs",
                    n === halaman.page
                      ? "font-bold"
                      : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-amber-400 hover:text-amber-400",
                  )}
                >
                  {n}
                </Button>
              ),
            )}

            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={halaman.page >= halaman.totalPages}
              onClick={() => gantiHalaman(halaman.page + 1)}
              aria-label="Halaman berikutnya"
              className="size-8 rounded-sm border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-amber-400 hover:text-amber-400 disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </Button>
          </nav>
        )}
      </div>
      )}

      {/* Video Playly digambar di LUAR percabangan: kedua bentuk halaman
          sama-sama menampilkannya. Judul seperti "Beyond The Last Signal" hanya
          ada di gudang Playly dan tidak pernah muncul di katalog drama, jadi
          menyembunyikannya di salah satu bentuk = video yang jelas tayang di
          situs jadi tak bisa ditemukan. */}
      <div className={SHELL}>
        <HasilPlayly videos={videoPlayly} ketikan={query} />
      </div>
    </section>
  );
}
