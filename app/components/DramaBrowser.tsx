"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { type Category, type Drama } from "@/lib/types";
import { labelNegara } from "@/lib/negara";
import { labelGenre } from "@/lib/genre";
import {
  FILTER_KOSONG,
  bacaFilter,
  filterAndSortDramas,
  filterOptions,
  tulisFilter,
  type CatalogFilter,
} from "@/lib/discover";
import { STRIP_KATALOG, buildNavMenus } from "@/lib/nav-katalog";
import type { PlaylyVideoPublik } from "@/lib/playly-publik";
import CatalogCard from "./beranda/CatalogCard";
import StripKatalog from "./beranda/StripKatalog";
import { chromeKatalog } from "./beranda/KepalaKatalog";
import HasilPlayly, { cariVideoPlayly } from "./beranda/HasilPlayly";
import { saringFilm } from "@/lib/film-jelajah";
import SearchBar, { KELAS_MENEMPEL_KEPALA } from "./beranda/SearchBar";
import { GRID_CLASS, SHELL } from "./beranda/shell";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

/**
 * Bentuk penyaring, pembacaan & penulisan alamat semuanya ada di
 * lib/discover.ts — SATU tempat yang dipakai bersama penyusun menu
 * (lib/nav-katalog.ts). Kalau nama parameternya ditulis ulang di sini, menu
 * bisa mengirim "?negara=" sementara halaman ini membaca nama lain, dan
 * tautannya mati tanpa pesan error.
 */

/** Alamat halaman ini beserta penyaringnya, siap diberikan ke router. */
function alamatDenganFilter(f: CatalogFilter): string {
  const query = tulisFilter(f);
  const path = window.location.pathname;
  return query ? `${path}?${query}` : path;
}

/**
 * Label pendek untuk judul halaman, mis. " — serial, sudah tamat".
 * Tanpa ini penonton yang datang dari menu melihat jumlah judul menyusut tanpa
 * tahu penyaring mana yang sedang bekerja.
 */
function keteranganFilter(f: CatalogFilter): string {
  const bagian: string[] = [];
  if (f.cat !== "Semua") bagian.push(`genre ${labelGenre(f.cat)}`);
  if (f.kind !== "all") bagian.push(f.kind === "movie" ? "film" : "serial");
  if (f.status !== "all")
    bagian.push(f.status === "completed" ? "sudah tamat" : "masih tayang");
  if (f.akses !== "all") bagian.push(f.akses === "koin" ? "pakai koin" : "gratis");
  if (f.sub !== "all") bagian.push("sub Indo");
  // labelNegara: alamatnya menyimpan nama asli OMDb ("China"), tapi yang
  // dibaca penonton harus bahasa Indonesia ("Cina").
  if (f.negara !== "all") bagian.push(labelNegara(f.negara));
  if (f.genre !== "all") bagian.push(`genre ${labelGenre(f.genre)}`);
  if (f.year !== "all") bagian.push(`tahun ${f.year}`);
  return bagian.length ? ` — ${bagian.join(", ")}` : "";
}

export default function DramaBrowser({
  dramas,
  /**
   * Video Playly untuk bagian hasil di bawah grid. Sebelum 2026-09-12 bagian
   * ini digambar app/discover/page.tsx SENDIRI, di luar komponen ini —
   * dipindah ke dalam supaya ia bisa ikut tersaring oleh kotak cari, yang
   * ketikannya cuma ada di sini. Kalau dibiarkan di luar, /discover punya DUA
   * bagian Playly begitu penonton mengetik.
   */
  playlyVideos = [],
}: {
  dramas: Drama[];
  playlyVideos?: PlaylyVideoPublik[];
}) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [filter, setFilter] = useState<CatalogFilter>(() => bacaFilter(searchParams));
  const hasilRef = useRef<HTMLDivElement>(null);

  /**
   * Tombol cari / Enter. Halaman ini menyaring langsung saat diketik, jadi
   * tombolnya tidak mengambil data apa pun — tugasnya MENGANTAR penonton ke
   * hasilnya, yang sering sudah di luar layar saat kursor masih di bar atas.
   *
   * Sampai 2026-10-16 `onSubmit` tidak dioper sama sekali di sini maupun di
   * /beranda, jadi menekan tombolnya benar-benar tidak melakukan apa pun.
   * Owner melaporkannya untuk /beranda; halaman ini punya cacat yang SAMA dan
   * ikut dibetulkan — menambal satu pemanggil saja akan meninggalkan yang
   * lain rusak dengan bentuk persis sama.
   */
  const lompatKeHasil = () => {
    hasilRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /**
   * Sinkronkan penyaring tiap alamat berubah dari LUAR komponen ini: tombol
   * Back browser, dan tautan menu/pintasan yang menunjuk halaman ini juga.
   * Next.js tidak memasang ulang komponen untuk perpindahan di rute yang sama,
   * jadi tanpa ini menu akan mengubah alamat tapi grid-nya diam — persis
   * kegagalan senyap yang paling mungkin terjadi di fitur ini.
   */
  useEffect(() => {
    setFilter(bacaFilter(searchParams));
  }, [searchParams]);

  const menus = useMemo(
    () => buildNavMenus(dramas, playlyVideos),
    [dramas, playlyVideos],
  );

  /**
   * Ketikan pencarian & urutan sengaja TIDAK dihitung sebagai "filter aktif":
   * kotak cari punya tombol hapus sendiri, dan tombol "Hapus filter" yang ikut
   * mengosongkan ketikan terasa seperti kehilangan yang baru saja diketik.
   */
  const adaFilterAktif = useMemo(
    () =>
      (Object.keys(FILTER_KOSONG) as (keyof CatalogFilter)[]).some(
        (k) => k !== "q" && k !== "sort" && filter[k] !== FILTER_KOSONG[k],
      ),
    [filter],
  );

  const terapkan = useCallback(
    (ubahan: Partial<CatalogFilter>) => {
      const berikutnya = { ...filter, ...ubahan };
      setFilter(berikutnya);
      router.replace(alamatDenganFilter(berikutnya), { scroll: false });
    },
    [filter, router],
  );

  // Ketikan ditulis ke alamat setelah jeda singkat — kalau tiap huruf langsung
  // menulis alamat, riwayat browser penuh dan halaman tersendat.
  useEffect(() => {
    const t = setTimeout(() => {
      const dariUrl = bacaFilter(searchParams);
      if (dariUrl.q === filter.q) return;
      router.replace(alamatDenganFilter({ ...dariUrl, q: filter.q }), {
        scroll: false,
      });
    }, 250);
    return () => clearTimeout(t);
  }, [filter.q, searchParams, router]);

  const filtered = useMemo(
    () => filterAndSortDramas(dramas, filterOptions(filter)),
    [dramas, filter],
  );

  /**
   * Film yang cocok dengan penyaring yang SEDANG AKTIF — bukan cuma ketikan.
   *
   * KENAPA BERUBAH (owner 2026-10-31: "ketika klik genre misal komedi harus
   * muncul hasilnya jadi tidak monoton drama saja karena kita ada film"):
   * sampai hari ini baris ini hanya memakai `filter.q`, sehingga genre/negara/
   * tahun TIDAK pernah berlaku untuk film. Akibatnya dua-duanya salah
   * sekaligus — penonton yang mengklik "Anime" melihat halaman "0 judul"
   * padahal ada film beranimasi, DAN pesan di bawah menyebut "443 video cocok"
   * untuk genre apa pun, karena 443 itu jumlah SELURUH film.
   *
   * Urutannya: saring dulu dengan penyaring (lib/film-jelajah.ts), baru dengan
   * ketikan. `filterOptions(filter)` yang SAMA dipakai katalog drama di atas —
   * satu sumber kebenaran, jadi drama dan film mustahil menyaring dengan
   * aturan yang berbeda.
   */
  const videoPlayly = useMemo(
    () => cariVideoPlayly(saringFilm(playlyVideos, filterOptions(filter)), filter.q),
    [playlyVideos, filter],
  );

  // Ketikan pencarian DIPERTAHANKAN — alasannya sama dengan `adaFilterAktif`.
  const resetFilters = () => terapkan({ ...FILTER_KOSONG, q: filter.q });

  /**
   * Alamat yang mewakili penyaring saat ini, dipakai strip untuk menyorot chip
   * yang sedang bekerja. Dirakit dari `tulisFilter` — BUKAN dari
   * `alamatDenganFilter`, yang membaca `window.location` dan karena itu tidak
   * bisa dipakai saat komponen ini dirender di server (mis. di tes).
   */
  const alamatAktif = useMemo(() => {
    const query = tulisFilter(filter);
    return query ? `/discover?${query}` : "/discover";
  }, [filter]);

  return (
    <>
      {/* Bar cari + strip genre: komponen yang SAMA dengan halaman depan &
          /beranda, supaya penonton tak merasa pindah situs. Yang beda cuma
          artinya — di sini genre menyaring grid di halaman ini juga, DAN
          ikut ditulis ke alamat URL (?cat=) supaya hasilnya bisa dibagikan. */}
      <SearchBar
        value={filter.q}
        onValueChange={(v) => setFilter((f) => ({ ...f, q: v }))}
        onSubmit={lompatKeHasil}
        /* Susunannya dipakai BERSAMA dengan kerangka pemuatan halaman ini
           (KerangkaKepalaKatalog) — lihat alasannya di chromeKatalog(). */
        chrome={chromeKatalog(menus)}
        className={KELAS_MENEMPEL_KEPALA}
        /* Tombol, seragam dengan seluruh situs (owner 2026-10-29: *"di bagian
           discover pun berlaku hal yang sama untuk search"*).

           ⚠️ `bukaAwal` WAJIB ikut. Ini halaman HASIL pencarian: kalau
           penonton tiba lewat `?q=naruto`, kata kunci itu harus TERLIHAT —
           tersembunyi di balik tombol, ia tak tahu apa yang sedang dicari dan
           tak bisa menyuntingnya. Jadi kotaknya terbuka sendiri HANYA saat
           memang ada kata kunci; tanpa itu tampilannya seragam dengan halaman
           lain. */
        modeTombol
        bukaAwal={Boolean(filter.q)}
      />
      {/* activeHref: chip yang alamatnya PERSIS sama dengan penyaring yang
          sedang berlaku akan disorot. Cocok karena tiap chip memasang satu
          penyaring saja — begitu penonton menambah penyaring lain lewat
          dropdown, sorotannya lepas dengan sendirinya, dan itu memang jujur. */}
      <StripKatalog items={STRIP_KATALOG} activeHref={alamatAktif} />

      <div ref={hasilRef} className={cn(SHELL, "scroll-mt-32")}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 py-3">
          {/* Hitungannya menyebut DUA jenis sejak 2026-10-31 (owner: "tidak
              monoton drama saja karena kita ada film"). Sebelumnya judul ini
              hanya menghitung drama, sehingga halaman berbunyi "0 judul"
              padahal ada belasan film cocok tepat di bawahnya — terbaca
              seperti pencarian yang gagal. Bagian film hilang sendiri saat
              nol, supaya tidak ada "0 film" yang cuma menambah bacaan. */}
          <h1 className="text-sm text-zinc-400">
            {/* "Jelajah Drama & Film", bukan "Jelajah" polos: teks `>Jelajah<`
                dipakai penjaga tests/strip-katalog.test.ts untuk memastikan
                chip pintasan lama yang dibuang owner tidak kembali. Judul ini
                bukan chip itu, tapi menamainya persis sama membuat penjaga
                tersebut menyala tanpa ada yang salah — dan penjaga yang
                berbunyi palsu cepat dimatikan orang. */}
            <span className="font-bold text-white">Jelajah Drama &amp; Film</span>{" "}
            &mdash;{" "}
            {filtered.length} drama
            {videoPlayly.length > 0 ? ` · ${videoPlayly.length} film` : ""}
            {keteranganFilter(filter)}
            {filter.q ? ` untuk "${filter.q}"` : ""}
          </h1>
          {(adaFilterAktif || filter.q) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 gap-1 rounded-sm text-xs text-zinc-400 hover:text-white"
            >
              <X className="size-3.5" />
              Hapus filter
            </Button>
          )}
        </div>

        {filtered.length === 0 ? (
          /* Ruang kosongnya MENGECIL kalau ada film yang cocok di bawah
             (owner 2026-10-31). Blok setinggi `py-16` berisi ikon besar
             membuat penonton mengira halamannya habis sampai di situ, lalu
             berhenti menggulir — padahal hasilnya ada persis di bawahnya. */
          <div
            className={cn(
              "flex flex-col items-center gap-3 text-center",
              videoPlayly.length > 0 ? "py-6" : "py-16",
            )}
          >
            {videoPlayly.length === 0 && <Search className="size-8 text-zinc-700" />}
            <p className="text-sm text-zinc-500">Tidak ada drama yang cocok.</p>
            {videoPlayly.length > 0 && (
              <p className="text-sm font-medium text-amber-400">
                Tapi ada {videoPlayly.length} film yang cocok &mdash; ada di
                bawah halaman ini.
              </p>
            )}
            {adaFilterAktif && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="rounded-sm border-zinc-700 bg-transparent text-xs text-zinc-300 hover:border-amber-400 hover:text-amber-400"
              >
                Hapus filter
              </Button>
            )}
          </div>
        ) : (
          <div className={GRID_CLASS}>
            {filtered.map((drama) => (
              <CatalogCard key={drama.id} drama={drama} />
            ))}
          </div>
        )}

        <HasilPlayly videos={videoPlayly} ketikan={filter.q} />
      </div>
    </>
  );
}
