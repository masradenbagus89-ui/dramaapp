"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { SHELL } from "./shell";

/**
 * Slot "kepala situs" — hanya diisi halaman yang memakai bar ini sebagai
 * navigasi utama, bukan sekadar kotak cari.
 *
 * Dibungkus jadi SATU objek (bukan 3 prop terpisah) karena ketiganya selalu
 * datang bersama sebagai satu keputusan tata letak: "bar ini jadi navbar".
 */
export type SearchBarChrome = {
  /** Logo/identitas di ujung kiri. Halaman yang sudah punya TopNav mengosongkannya. */
  brand?: ReactNode;
  /** Deretan menu dropdown katalog (lihat NavMenus.tsx). */
  menus?: ReactNode;
  /** Tombol di ujung kanan, mis. Masuk/Daftar. */
  trailing?: ReactNode;
};

/**
 * Teks abu-abu di dalam kotak cari — SATU sumber untuk SELURUH situs.
 *
 * Dipendekkan atas permintaan owner 2026-09-21 supaya sejajar dengan situs
 * katalog pembanding ("Cari judul film di Lk21"). Ini MURNI tulisan — yang
 * dicari tetap judul, kategori, dan sinopsis (lihat `cocokSemuaKata` di
 * lib/discover.ts), jadi memendekkan kalimatnya TIDAK mempersempit hasil.
 *
 * ⚠️ Kenapa dijadikan konstanta dan bukan ditulis dua kali (owner 2026-09-22):
 * situs punya DUA kotak cari — yang lebar di bar merah ini, dan yang kecil di
 * navbar hitam (app/components/TopNav.tsx). Keduanya mengirim ke /discover
 * dengan cara yang sama, tapi tulisannya sudah DUA KALI menyimpang karena
 * ditulis terpisah: navbar tertinggal di "Cari drama, kategori..." sementara
 * yang ini sudah diperbarui. Dua kotak berperilaku sama dengan tulisan beda
 * terbaca seperti dua situs berbeda. JANGAN tulis ulang teksnya di tempat
 * lain — impor konstanta ini. Penjaganya: tests/strip-katalog.test.ts.
 */
export const TEKS_KOTAK_CARI = "Cari film di DramaKu";

/**
 * Posisi menempel bar cari — SATU nilai untuk keempat pemakainya
 * (`PublicTopBars`, `CatalogBrowser`, `DramaBrowser`, `KerangkaKepalaKatalog`).
 *
 * ⚠️ Kenapa dikunci satu (owner 2026-09-22): nilai ini tadinya ditulis tangan
 * di keempat berkas. Kalau salah satu berbeda, bar cari BERGESER tepat saat
 * kerangka pemuatan ditukar isi sungguhan — poster yang mau diklik penonton
 * ikut melompat. Beda 56px (`top-14` vs `top-0`) sudah cukup terasa.
 */
export const KELAS_MENEMPEL_KEPALA = "sticky top-0";

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  /** Dipanggil saat tombol cari ditekan / Enter. Halaman yang menyaring
   *  langsung di tempat (beranda) boleh mengabaikannya. */
  onSubmit?: () => void;
  placeholder?: string;
  /** Dropdown penyaring di kanan bar. Kosong = tombol "Filter" ikut disembunyikan. */
  filters?: ReactNode;
  /** Logo + menu + tombol kanan; lihat SearchBarChrome. */
  chrome?: SearchBarChrome;
  /** Untuk posisi menempel; pakai `KELAS_MENEMPEL_KEPALA`. */
  className?: string;
  /**
   * Alamat tujuan form saat JavaScript BELUM aktif. Diisi hanya oleh pemakai
   * yang pencariannya memang MELEMPAR ke halaman lain (bukan menyaring di
   * tempat). Kosong = form tanpa `action`, sama seperti sebelumnya.
   *
   * Kenapa perlu: sesudah JavaScript aktif, `onSubmit` di bawah memanggil
   * `preventDefault()` sehingga atribut ini tak berpengaruh sama sekali. Tapi
   * SEBELUM itu — dan itulah satu-satunya jendela kerangka pemuatan terlihat —
   * React belum memasang satu pun penangan, jadi menekan Enter menjalankan
   * pengiriman form BAWAAN browser. Tanpa `action` + `namaKolom`, pengiriman
   * itu cuma memuat ulang halaman dan KETIKAN PENONTON HILANG tanpa jejak.
   */
  action?: string;
  /** Nama kolom kotak cari, wajib diisi bila `action` dipakai (lihat di atas). */
  namaKolom?: string;
  /**
   * Ganti kotak cari di bar dengan TOMBOL ikon; kotaknya baru muncul sebagai
   * lapisan di atas halaman saat tombol diklik (owner 2026-10-29:
   * *"tombol search seperti pop up gitu"*).
   *
   * Kenapa jadi prop dan bukan diubah untuk semua pemakai: halaman `/discover`
   * adalah halaman HASIL PENCARIAN — di sana kotaknya wajib terlihat terus,
   * sebab penonton perlu melihat & menyunting kata kunci yang sedang berlaku.
   * Menyembunyikannya di balik satu klik justru membuat halaman itu terasa
   * kehilangan pencariannya.
   */
  modeTombol?: boolean;
  /**
   * Buka kotaknya SEJAK AWAL walau `modeTombol` menyala.
   *
   * Dipakai `/discover` saat halaman dibuka dengan kata kunci (`?q=…`): di
   * halaman HASIL pencarian, kata kunci yang sedang berlaku wajib terlihat —
   * kalau tersembunyi di balik tombol, penonton tidak tahu apa yang sedang
   * dicari dan tidak bisa menyuntingnya. Tanpa kata kunci, tombolnya tetap
   * tertutup seperti halaman lain, jadi tampilannya tetap seragam.
   */
  bukaAwal?: boolean;
};

/**
 * Bar pencarian utama — kepala situs gaya katalog streaming.
 *
 * Dipakai TIGA halaman dengan perilaku berbeda: di /beranda ia menyaring grid
 * langsung di tempat, di halaman depan & /discover ia melempar/menyaring lewat
 * alamat URL. Karena itu komponen ini sengaja tidak tahu apa-apa soal katalog —
 * pemanggil yang menentukan artinya lewat `onValueChange`/`onSubmit`.
 *
 * TATA LETAK: satu baris di layar lebar (logo · cari · menu · penyaring ·
 * tombol), menumpuk sendiri di layar sempit lewat `flex-wrap`. Urutan di layar
 * sempit diatur `order-*` supaya tombol Masuk/Daftar naik menemani logo di
 * baris pertama, bukan terdampar di bawah.
 */
export default function SearchBar({
  value,
  onValueChange,
  onSubmit,
  placeholder = TEKS_KOTAK_CARI,
  filters,
  chrome,
  className,
  action,
  namaKolom,
  modeTombol = false,
  bukaAwal = false,
}: Props) {
  const [filterTerbuka, setFilterTerbuka] = useState(false);
  const [cariTerbuka, setCariTerbuka] = useState(bukaAwal);
  const kotakRef = useRef<HTMLInputElement>(null);

  /**
   * Buka kotaknya begitu `bukaAwal` menyala.
   *
   * ⚠️ `useState(bukaAwal)` saja TIDAK CUKUP, dan ini bug yang sudah terbukti:
   * `/discover` adalah halaman STATIS, jadi saat HTML-nya dibuat kata kunci
   * `?q=…` belum terbaca — `bukaAwal` masih false. Kata kuncinya baru muncul di
   * browser lewat `useSearchParams`, dan nilai AWAL `useState` tak pernah
   * diperbarui sesudah itu. Akibatnya penonton yang tiba lewat tautan
   * pencarian melihat kotak tertutup, tanpa tahu apa yang sedang dicari.
   *
   * Hanya MEMBUKA, tidak pernah menutup: kalau penonton sengaja menutup kotak
   * sementara kata kuncinya masih berlaku, ia harus tetap tertutup.
   */
  useEffect(() => {
    if (bukaAwal) setCariTerbuka(true);
  }, [bukaAwal]);

  // Fokus langsung ke kotak begitu lapisan terbuka, dan tutup dengan Esc.
  // Tanpa fokus otomatis, penonton harus mengklik dua kali untuk mulai
  // mengetik — tombol yang membuka kotak lalu membiarkannya pasif terasa rusak.
  useEffect(() => {
    if (!cariTerbuka) return;
    kotakRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCariTerbuka(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cariTerbuka]);

  /**
   * Kotak cari + tombolnya. Dipakai DI BAR (mode biasa) maupun DI DALAM LAPISAN
   * popup (mode tombol) — `kelas` yang membedakan penempatannya.
   *
   * `action`/`method` hanya berarti sebelum JavaScript aktif; `preventDefault()`
   * mematikannya sesudah itu. Lihat penjelasan prop `action` di atas.
   *
   * ⚠️ BATAS JUJUR mode tombol: lapisannya dibuka oleh JavaScript, jadi sebelum
   * JS aktif tombol itu diam dan pencarian TIDAK bisa dibuka dari bar. Form di
   * dalamnya tetap ber-`action` sehingga begitu terbuka ia jalan apa adanya.
   * Diterima karena situs ini sudah mensyaratkan JS untuk memutar video — tapi
   * kalau suatu saat pencarian harus hidup tanpa JS, mode tombol yang pertama
   * harus dilepas.
   */
  const formCari = (kelas: string, besar = false) => (
    <form
      action={action}
      method={action ? "get" : undefined}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
        setCariTerbuka(false);
      }}
      className={kelas}
      role="search"
    >
      <Input
        ref={modeTombol ? kotakRef : undefined}
        type="search"
        name={namaKolom}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Cari drama"
        className={cn(
          "rounded-l-sm rounded-r-none border-transparent bg-white text-zinc-900 placeholder:text-zinc-500 focus-visible:border-amber-400 focus-visible:ring-0",
          // `besar` HANYA untuk lapisan popup (owner 2026-10-29: "kecil kali,
          // bisa besar sedikit"). Bar tetap `h-9` — menaikkannya di sana akan
          // meninggikan SELURUH kepala situs, termasuk /discover yang masih
          // memakai kotak biasa.
          besar ? "h-12 text-base" : "h-9 text-sm",
        )}
      />
      <button
        type="submit"
        aria-label="Cari"
        className={cn(
          "flex shrink-0 items-center justify-center rounded-r-sm bg-rose-700 text-white transition-colors hover:bg-rose-600",
          besar ? "h-12 w-14" : "h-9 w-11",
        )}
      >
        <Search className={besar ? "size-5" : "size-4"} />
      </button>
    </form>
  );

  return (
    <div
      className={cn(
        // Merah terang bergradasi, TANPA ungu — owner 2026-09-21: ujung kiri
        // yang tadinya `fuchsia-700` (ungu) terlalu mencolok dan tidak sejajar
        // dengan situs katalog pembanding, yang memakai merah tua di kiri
        // melembut jadi merah-pink di kanan.
        "z-30 bg-gradient-to-r from-rose-700 via-rose-600 to-pink-600 shadow-lg shadow-black/50",
        className,
      )}
    >
      <div
        className={cn(SHELL, "flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5")}
      >
        {chrome?.brand && (
          <div className="order-1 shrink-0 md:order-none">{chrome.brand}</div>
        )}

        {/* KOTAK CARI mode BIASA (halaman hasil pencarian). Mode TOMBOL tidak
            di sini — ia dipindah ke UJUNG KANAN bar, lihat di bawah.
            Isinya dirakit SEKALI di `formCari` (di atas `return`) lalu dipakai
            apa adanya di bar maupun di dalam panel. Ditulis dua kali, keduanya
            pasti menyimpang — tulisan placeholder di repo ini sudah dua kali
            menyimpang karena persis sebab itu (lihat TEKS_KOTAK_CARI). */}
        {!modeTombol &&
          formCari(
            "order-3 flex w-full min-w-0 items-stretch md:order-none md:w-auto md:max-w-xl md:flex-1",
          )}

        {chrome?.menus && (
          <div className="order-4 w-full min-w-0 md:order-none md:w-auto">
            {chrome.menus}
          </div>
        )}

        {filters && (
          <>
            {/* Penyaring berjajar di kanan bar — layar lebar. */}
            <div className="order-5 ml-auto hidden items-center gap-1.5 md:order-none md:flex">
              {filters}
            </div>
            {/* Di HP disembunyikan di balik tombol supaya bar tetap ringkas. */}
            <Button
              type="button"
              size="sm"
              onClick={() => setFilterTerbuka((v) => !v)}
              aria-expanded={filterTerbuka}
              className="order-2 ml-auto h-9 shrink-0 gap-1.5 rounded-sm bg-black/30 text-xs font-bold uppercase tracking-wide text-white hover:bg-black/50 md:hidden"
            >
              <SlidersHorizontal className="size-3.5" />
              Filter
            </Button>
          </>
        )}

        {/* ===== CARI — TOMBOL + KOTAK yang melebar SEJAJAR di dalam bar
               (owner 2026-10-29: *"bukan di bawahnya, tapi sejajar search"*).

               Perjalanan bentuk ini sudah tiga kali, dan tiap langkah menutup
               keluhan yang nyata:
                 1. kotak permanen di bar      -> "searchnya kelebaran";
                 2. lapisan menutupi layar     -> "backgroundnya bikin sakit
                    mata" + menutupi poster film;
                 3. panel menggantung di bawah -> masih menimpa baris poster;
                 4. SEKARANG: kotak muncul di DALAM bar, sejajar tombolnya.

               Bentuk terakhir ini satu-satunya yang menutupi NOL bagian
               halaman: barnya memang sudah ada di situ, kotak cuma mengisi
               ruang kosong di sebelah kiri tombol. Tak ada lapisan, tak ada
               bayangan, tak ada yang perlu ditutup.

               `ml-auto` mendorong seluruh kelompok ini ke ujung kanan. Di layar
               sempit `flex-wrap` milik bar yang menurunkan kotaknya ke baris
               berikutnya — masih DI DALAM bar, bukan menimpa poster. */}
        {modeTombol && (
          <div className="order-2 ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 md:order-none">
            {cariTerbuka && (
              <div className="min-w-0 flex-1 md:max-w-md">
                {formCari("flex w-full items-stretch")}
              </div>
            )}

            <button
              type="button"
              onClick={() => setCariTerbuka((t) => !t)}
              aria-label={cariTerbuka ? "Tutup pencarian" : "Cari film"}
              aria-expanded={cariTerbuka}
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-sm text-white transition-colors outline-none hover:bg-black/25 focus-visible:bg-black/25",
                cariTerbuka && "bg-black/30",
              )}
            >
              {cariTerbuka ? (
                <X className="size-5" />
              ) : (
                <Search className="size-5" />
              )}
            </button>
          </div>
        )}

        {chrome?.trailing && (
          <div className="order-2 flex shrink-0 items-center gap-2 md:order-none">
            {chrome.trailing}
          </div>
        )}
      </div>

      {filters && filterTerbuka && (
        <div className={cn(SHELL, "grid grid-cols-2 gap-1.5 pb-2.5 md:hidden")}>
          {filters}
        </div>
      )}
    </div>
  );
}
