"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  CalendarRange,
  ChevronDown,
  Clapperboard,
  Compass,
  Flame,
  Globe2,
  Sparkles,
  Tv,
  X,
} from "lucide-react";
import type { NavMenu } from "@/lib/nav-katalog";
import { SheetClose, SheetTitle } from "@/components/ui/sheet";
import { LATAR_PANEL_KATALOG_HP } from "./shell";
import { cn } from "@/lib/utils";

/**
 * ISI panel menu katalog untuk HP — panel yang naik dari bawah layar saat logo
 * "D" diketuk (owner 2026-11-21: *"jangan di jadikan dropdown tapi seperti pop
 * up aja biar terlihat keren"*).
 *
 * Komponen ini HANYA isinya. Pembungkus `<Sheet>`-nya dipasang di
 * `SearchBar.tsx`, tempat tombol pemicunya sudah hidup.
 *
 * ⚠️ KENAPA PANEL YANG DIPASANG SAAT DIBUKA, bukan panel yang selalu ada di
 * HTML lalu disembunyikan CSS (dan ini bukan soal kerapian — tiga penjaga
 * ikut jatuh kalau salah):
 *   1. Tiap grup menu diberi baris ekor `{ label: "Lainnya", href: "/discover" }`
 *      — alamat POLOS tanpa penyaring (lib/nav-katalog.ts:258 + :275).
 *      `tests/strip-katalog.test.ts:116` mewajibkan TIAP `href="/discover…"`
 *      yang tergambar di HTML mengubah minimal satu penyaring.
 *   2. `tests/strip-katalog.test.ts:303` melarang HTML memuat ">Amerika<",
 *      ">Kanada<", ">Thriller<" dan enam teks lain — penjaga keluhan owner
 *      2026-09-21 *"terlalu banyak tulisan dan negara lainnya"*. Label itu ada
 *      di dalam menu Negara & Genre.
 *   3. `tests/beranda-bentuk-halaman.test.ts` menghitung bentuk HTML awal.
 * Hari ini ketiganya hijau HANYA karena isi dropdown Radix tidak ikut digambar
 * di server. Radix Dialog melepas isinya saat tertutup, jadi sifat itu
 * dipertahankan. **JANGAN pasang `forceMount`** — itu mengembalikan ketiga
 * kerusakan sekaligus, tanpa satu pun error.
 *
 * Keuntungan ikutan yang nyata: panel ini di-portal ke `<body>`, jadi ia
 * BERADA DI LUAR pembungkus `tema-terang-md`. Varian `terang:` hanya menyala di
 * dalam pembungkus itu (app/globals.css), sehingga panel ini mustahil ikut
 * memutih saat badan halaman depan berubah terang dari 768px ke atas.
 *
 * ❓ BATAS JUJUR yang DITERIMA, bukan terlewat:
 *   - HP diputar MENDATAR (>768px) selagi panel terbuka: deretan menu versi
 *     layar komputer ikut muncul bersama panel, dan karena pemicunya kena
 *     `md:hidden`, menutup panel akan melempar fokus papan ketik ke `<body>`
 *     (Radix mengembalikan fokus ke pemicu yang sudah tak tergambar). Tidak ada
 *     yang rusak dan panel tetap bisa ditutup. Tidak ditambal karena tambalannya
 *     menuntut pengukuran lebar layar di JavaScript — ambang yang bisa menyimpang
 *     dari ambang Tailwind tanpa memunculkan error (lihat SearchBar.tsx).
 *   - Geser-ke-bawah untuk menutup TIDAK ada. Radix tidak menyediakannya;
 *     pegangan di atas dibuat bisa DIKETUK supaya tangan yang mencoba menyeret
 *     tetap menghasilkan sesuatu.
 *   - Tanpa JavaScript pemicunya diam. Itu bukan kemunduran — mekanisme
 *     sebelumnya sama saja, dan jalan ke katalog tanpa JS tetap ada lewat
 *     tombol "Filter" di BottomNav yang `<a href="/discover">` sungguhan.
 */

/**
 * Ikon per grup menu, dipetakan dari `NavMenu.key`.
 *
 * Tanpa ikon, daftar grup yang semuanya tertutup cuma terbaca sebagai enam kata
 * polos. `Compass` jadi cadangan supaya grup BARU yang ditambahkan di
 * lib/nav-katalog.ts tetap tergambar wajar — bukan kosong melompong.
 */
export const IKON_GRUP: Record<string, LucideIcon> = {
  genre: Clapperboard,
  jenis: Tv,
  populer: Flame,
  negara: Globe2,
  tahun: CalendarRange,
  lainnya: Sparkles,
};

/**
 * Jumlah kolom isi grup DI DALAM PANEL — dihitung dari data (`kolom` +
 * `lebarNama` di lib/nav-katalog.ts), bukan dari daftar key tulis-tangan.
 *
 * ⚠️ SENGAJA TIDAK memakai ulang `KELAS_KOLOM`/`KELAS_EMPAT_NAMA` milik
 * NavMenus.tsx: keduanya membawa lebar TETAP (`w-[13rem]`, `sm:w-[36rem]`) yang
 * dirancang untuk dropdown mengambang di layar lebar, bukan panel selebar
 * layar HP. Isinya juga dipatok tes tersendiri, jadi menyentuhnya = risiko
 * merah tanpa imbalan apa pun di sini.
 *
 * Angkanya: nama panjang ("Fiksi Ilmiah", "Uni Emirat Arab") butuh 2 kolom
 * supaya tidak terpotong; angka tahun yang cuma 4 huruf muat 3 kolom; grup
 * pendek (Series, Populer, Lainnya) tidak diberi `kolom` sama sekali → 1 kolom.
 */
export function kelasKolomPanel(menu: NavMenu): string {
  if (!menu.kolom) return "grid-cols-1";
  return menu.lebarNama ? "grid-cols-2" : "grid-cols-3";
}

export default function MenuKatalogHp({ menus }: { menus: NavMenu[] }) {
  // Katalog kosong = panel hampa. Pemanggil sudah tidak memasang tombolnya
  // dalam keadaan itu; penjaga kedua di sini supaya tak ada jalan lain.
  if (menus.length === 0) return null;

  return (
    /* TANPA tinggi yang dipaksakan: panel MENGIKUTI isinya (owner 2026-11-23,
       dua koreksi: *"tidak maksimal"* lalu *"jangan bikin full layar"*).
       Pemanggil memberi `h-fit`, jadi di sini cukup kolom biasa. Satu-satunya
       batas tinggi ada di wadah bergulir di bawah — SATU tempat saja. */
    <div className="flex flex-col">
      {/* ===== KEPALA PANEL ===== */}
      {/* Pegangan geser (grabber) DIBUANG 2026-11-23. Bentuk itu bahasa visual
          khusus bottom sheet — ia menjanjikan "tarik ke bawah untuk menutup"
          pada panel yang kini tidak berlabuh di bawah sama sekali, jadi ia
          berbohong soal bentuknya sendiri (gestur seretnya memang tidak pernah
          dibangun). Gantinya tombol ✕ nyata di pojok kanan atas. */}
      <div className="flex shrink-0 items-center gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <span className="h-4 w-1 rounded-full bg-emas-400" aria-hidden="true" />
        {/* SheetTitle WAJIB ada: Radix memakainya sebagai nama panel untuk
            pembaca layar. Dipasang demi aksesibilitas, bukan demi meredam
            peringatan — versi Radix yang terpasang di sini tidak memperingati. */}
        <SheetTitle className="min-w-0 flex-1 text-sm font-bold text-stone-50">
          Menu Katalog
        </SheetTitle>

        {/* ✕ DI POJOK KANAN ATAS — bentuk yang dipilih owner 2026-11-23.
            Ini BUKAN tombol X bawaan `sheet.tsx` (itu tetap dimatikan lewat
            `showCloseButton={false}`): bawaannya ~16px tanpa area ketuk, di
            bawah ambang 44px yang dipakai sisa situs ini. Yang ini `size-11`
            (44px) sehingga tetap bisa diketuk tanpa meleset.
            ⚠️ Ia TIDAK menggantikan bilah "Tutup" di dasar panel. Pada panel
            setinggi layar penuh, pojok kanan ATAS justru titik yang paling
            jauh dari jempol — bilah di bawah itulah jalan tutup utama;
            yang di sini jalan kedua untuk tangan yang mencarinya di tempat
            yang lazim. */}
        <SheetClose
          aria-label="Tutup menu katalog"
          className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-stone-400 transition-colors outline-none hover:bg-stone-800 hover:text-stone-50 focus-visible:bg-stone-800 focus-visible:ring-2 focus-visible:ring-emas-400"
        >
          <X className="size-5" aria-hidden="true" />
        </SheetClose>
      </div>

      {/* ===== DAFTAR GRUP — akordeon ===== */}
      {/* SATU-SATUNYA batas tinggi panel ini. Saat semua grup tertutup, isinya
          jauh lebih pendek dari batas ini sehingga panel ikut memendek — itu
          yang membuat bidang warnanya kecil. `max-h` baru bekerja ketika satu
          grup panjang dibuka (Negara 25 nama), dan efeknya daftar yang
          menggulir DI DALAM panel, bukan panel yang tumbuh keluar layar.
          `dvh`, bukan `vh`: di HP bilah alamat browser menyusut saat digulir
          dan `vh` tidak ikut menyesuaikan. */}
      <div className="max-h-[58dvh] overflow-y-auto px-4 pb-2">
        {menus.map((m) => {
          const Ikon = IKON_GRUP[m.key] ?? Compass;
          return (
            /* `<details>` bawaan browser, BUKAN state React.
               Atribut `name` yang sama membuat hanya SATU grup terbuka pada
               satu waktu — tinggi panel jadi bisa ditebak.

               ❓ BATAS JUJUR: atribut `name` baru didukung Chrome 120+ /
               Safari 17.2+ / Firefox 130+. Di browser lebih tua ia DIABAIKAN —
               beberapa grup bisa terbuka sekaligus dan panelnya tinggal
               digulir. Tidak ada yang rusak, tidak ada error.

               Untung ikutan: isi `<details>` yang tertutup memang tidak
               dijangkau Tab maupun dibacakan pembaca layar — gratis, tanpa
               satu baris kode pun. */
            <details
              key={m.key}
              name="menu-katalog-hp"
              /* Grup yang baru dibuka ditarik ke puncak wadah bergulir.
                 WAJIB, bukan hiasan: akordeon eksklusif (`name`) MENUTUP grup
                 yang ada di atas titik gulir saat ini, dan tinggi yang hilang
                 itu tidak dikoreksi sendiri — akibatnya grup yang baru diketuk
                 tampil dari TENGAH daftarnya. Terukur: Genre 24 baris ≈ 606px
                 isi, sedangkan wadahnya cuma ±513px di layar 852px. */
              onToggle={(e) => {
                if (e.currentTarget.open) {
                  e.currentTarget.scrollIntoView({ block: "start" });
                }
              }}
              className="group border-b border-stone-700 last:border-b-0"
            >
              <summary
                className={cn(
                  // `sticky` supaya judul grup yang sedang dibuka tetap
                  // terlihat saat isinya digulir — grup Negara (25 nama)
                  // memang lebih panjang dari panelnya. Aman karena hanya
                  // satu grup terbuka pada satu waktu.
                  "sticky top-0 z-10 flex min-h-14 cursor-pointer list-none items-center gap-3",
                  // Warna yang SAMA dengan panelnya, dan itu syarat: kepala
                  // grup ini `sticky`, jadi ia melayang di atas latar panel
                  // saat daftarnya digulir. Sejak latarnya RATA
                  // (`LATAR_PANEL_KATALOG_HP`, 2026-11-23) kecocokan itu
                  // otomatis — dulu ia bergantung pada arah gradasi yang
                  // harus mendatar, dan salah arah = belang tanpa satu pun
                  // error. Yang tersisa cuma satu aturan: pakai konstanta
                  // yang sama, jangan menulis warnanya lagi di sini.
                  LATAR_PANEL_KATALOG_HP,
                  "outline-none select-none",
                  "focus-visible:bg-stone-800",
                  // Segitiga bawaan Safari/iOS dimatikan; penandanya panah
                  // di kanan supaya seragam dengan sisa situs.
                  "[&::-webkit-details-marker]:hidden",
                )}
              >
                <span
                  /* Putih transparan, BUKAN gradasi amber→rose seperti versi
                     pertama: di atas latar merah-pink, kotak oranye-merah itu
                     nyaris lenyap ke dalam latarnya. Putih 20% tetap terbaca
                     sebagai kotak tanpa melawan warna panelnya. */
                  /* Kotak ikon ikut palet sage (2026-11-23). Sempat
                     `bg-rose-950 text-rose-400` selama beberapa jam — aksen
                     dari tema merah yang lama, dan begitu tema situs jadi
                     sage ia terbaca sebagai warna nyasar, bukan aksen.
                     `sage-300` di atas `sage-800` = 7,3:1. */
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emas-500/15 text-emas-400"
                  aria-hidden="true"
                >
                  <Ikon className="size-[18px]" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-stone-50">
                    {m.label}
                  </span>
                  {/* Angka ini termasuk baris ekor "Lainnya" yang ditambahkan
                      lib/nav-katalog.ts:275, jadi pilihan kategorinya satu
                      lebih sedikit. Disebut apa adanya daripada mengarang
                      pengurangan yang bisa salah kalau aturannya berubah. */}
                  <span className="block text-[11px] text-stone-400">
                    {m.items.length} pilihan
                  </span>
                </span>

                <ChevronDown
                  className="size-4 shrink-0 text-stone-400 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </summary>

              <div
                className={cn(
                  "grid gap-1.5 pb-3",
                  kelasKolomPanel(m),
                  "animate-in fade-in-0 slide-in-from-top-1 duration-200 motion-reduce:animate-none",
                )}
              >
                {m.items.map((item) => (
                  /* `SheetClose asChild` = panel menutup sendiri begitu satu
                     pilihan diketuk. Tanpa ini penonton pindah halaman
                     sementara panelnya masih menggantung di layar. */
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      /* Hitam transparan di atas merah, bukan `bg-zinc-900`
                         pekat: yang pekat memutus gradasi panel jadi
                         kotak-kotak gelap. Transparan membuat chip terbaca
                         sebagai lapisan DI ATAS panel yang sama. */
                      className="flex min-h-11 items-center rounded-lg bg-stone-800 px-3 text-[13px] font-medium text-stone-50 transition-colors hover:bg-stone-700 hover:text-emas-200 active:bg-stone-700"
                    >
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </SheetClose>
                ))}
              </div>
            </details>
          );
        })}
      </div>

      {/* ===== BILAH TUTUP ===== */}
      {/* Lebar penuh di DASAR panel — JALAN TUTUP UTAMA, dan sejak panelnya
          setinggi layar penuh (2026-11-23) alasannya justru makin kuat: pojok
          kanan atas kini sejauh mungkin dari jempol. X bawaan `sheet.tsx`
          berukuran ~16px tanpa area ketuk, jadi ia tetap dimatikan lewat
          `showCloseButton={false}` di pemanggil; ✕ 44px di kepala panel adalah
          jalan KEDUA (tempat yang lazim dicari mata), bukan pengganti bilah
          ini. Keduanya `SheetClose` yang sama, jadi tak ada perilaku kembar.

          ⚠️ JANGAN percaya `env(safe-area-inset-bottom)` di project ini: ia
          memulangkan 0 selama `<meta viewport>` belum memuat `viewport-fit=cover`,
          dan repo ini belum pernah mendeklarasikan `export const viewport` sama
          sekali — jadi yang benar-benar bekerja adalah `max(0.75rem, …)`, yaitu
          12px tetap. Ditulis begini, bukan `pb-3` polos, supaya safe-area
          sungguhan ikut menyala sendiri kalau `viewport-fit=cover` suatu saat
          dipasang; tapi JANGAN dicatat sebagai pengaman bilah-rumah iPhone yang
          sudah aktif — hari ini ia belum. */}
      <div
        className={cn(
          LATAR_PANEL_KATALOG_HP,
          "shrink-0 border-t border-stone-700 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        )}
      >
        <SheetClose className="flex min-h-11 w-full items-center justify-center rounded-lg bg-stone-800 text-sm font-bold text-stone-50 transition-colors outline-none hover:bg-stone-700 focus-visible:bg-stone-700">
          Tutup
        </SheetClose>
      </div>
    </div>
  );
}
