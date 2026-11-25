"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { punyaNavigasiBawah } from "@/lib/navigasi-halaman";
import FilterFilmPopup from "./beranda/FilterFilmPopup";
import { SITE_NAME } from "@/lib/site";

type Tab = {
  /** Diisi untuk tab yang berpindah halaman. Kosong = tab AKSI (lihat `aksi`). */
  href?: string;
  label: string;
  match: (path: string) => boolean;
  icon: (active: boolean) => React.ReactElement;
  /**
   * Diisi untuk tab yang MELAKUKAN sesuatu di tempat, bukan berpindah halaman
   * (hari ini cuma "Bagikan"). Dipisah dari `href` supaya tab aksi digambar
   * sebagai `<button>` dan tab navigasi sebagai `<a>` — tautan palsu yang
   * sebenarnya tombol membuat klik-kanan "buka di tab baru" menghasilkan
   * halaman kosong, dan pembaca layar menyebutnya "tautan" padahal bukan.
   */
  aksi?: () => void | Promise<void>;
};

/** Warna ikon seragam — aktif hijau pekat, sisanya sage sedang. */
const kelasIkon = (active: boolean) =>
  `h-6 w-6 ${active ? "fill-emas-400" : "fill-redup"}`;

/**
 * Tab bar bawah HP.
 *
 * ⚠️ Shorts & My List sengaja DILEPAS dari sini (owner 2026-09-25) bersamaan
 * dengan hilangnya ketiga menu dari navbar komputer — kalau hanya navbar yang
 * dirampingkan, pengguna HP masih melihat tombol yang sudah tidak ada di
 * komputer, dan satu situs terasa seperti dua versi. Halaman /shorts &
 * /my-list TETAP hidup; alasan lengkap + jalan yang tersisa ke sana ditulis
 * sekali di app/components/TopNav.tsx di atas `LINKS`.
 *
 * RIWAYAT JUMLAH TAB — ditulis supaya tak ada yang memutarnya balik mengira
 * sedang membereskan sesuatu:
 *   2 (Beranda · Profile) → 5 (Home · Series · Movies · Filter · Profile,
 *   2026-11-21) → 2 lagi di hari yang sama (*"sisanya kembalikan ke dramaku"*)
 *   → 4 tab ini (2026-11-23).
 *
 * ⚠️ "Profile" DIHAPUS 2026-11-23 atas permintaan owner: *"karena ini untuk
 * viewer jadi profile tidak perlu"*. Penonton memang tidak perlu akun untuk
 * menonton di situs ini.
 *
 * ❗ ADMIN TIDAK TERSESAT, dan ini sudah diperiksa — bukan diasumsikan: avatar
 * berinisial di kepala situs hanya tergambar untuk `user.role === "admin"`
 * (KepalaKatalog.tsx), tampil di HP maupun komputer, dan menunya memuat
 * Profile · Riwayat · Favorit · **Admin** · Keluar. Jadi dashboard admin
 * tetap sejauh satu ketukan. Kalau avatar itu suatu saat dilepas juga,
 * jalan ke /admin dari HP IKUT HILANG — pasang penggantinya dulu.
 */
const TABS: Tab[] = [
  {
    href: "/beranda",
    label: "Beranda",
    // Ikut menyala di /drama & /watch: keduanya cabang dari menelusuri
    // katalog, jadi tanpa ini bar bawah terlihat mati begitu penonton membuka
    // satu judul. /discover TIDAK lagi ikut di sini — ia punya tab "Filter"
    // sendiri sekarang, dan dua tab yang menyala bersamaan membuat penanda
    // aktif (yang memakai indeks PERTAMA yang cocok) menunjuk tab yang salah.
    // `"/"` ikut sejak 2026-11-25, bersama dipasangnya bar ini di halaman
    // depan: tanpa itu barnya tergambar dengan NOL tab menyala (penanda
    // geser disembunyikan saat `activeIndex < 0`), dan bar yang tak satu pun
    // tabnya aktif terbaca seperti bar yang mati.
    match: (p) =>
      p === "/" ||
      p === "/beranda" ||
      p.startsWith("/drama") ||
      p.startsWith("/watch"),
    icon: (active) => (
      <svg viewBox="0 0 24 24" className={kelasIkon(active)}>
        <path d="M12 2l9 4.5v11L12 22l-9-4.5v-11L12 2zm0 2.236L5 7.618v8.764l7 3.382 7-3.382V7.618L12 4.236zM12 8l3 5h-2v3h-2v-3H9l3-5z" />
      </svg>
    ),
  },
  {
    // TANPA `href` — tab ini MEMBUKA POP UP, tidak berpindah halaman
    // (owner 2026-11-23: *"ketika klik filter muncul pop up"*). `aksi`-nya
    // dipasang di dalam komponen, sebab ia perlu menyentuh state pop up.
    label: "Filter",
    // Tetap menyala di halaman hasil penyaringan, supaya penonton tahu
    // daftar yang sedang ia lihat berasal dari filter.
    match: (p) => p.startsWith("/discover") || p.startsWith("/katalog"),
    icon: (active) => (
      <svg viewBox="0 0 24 24" className={kelasIkon(active)}>
        <path d="M3 5h18v2.5l-7 7V21l-4-2v-6.5l-7-7V5z" />
      </svg>
    ),
  },
  {
    href: "/film",
    label: "Film Terbaru",
    match: (p) => p.startsWith("/film"),
    icon: (active) => (
      <svg viewBox="0 0 24 24" className={kelasIkon(active)}>
        <path d="M4 3h16a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1zm1 2v2h2V5H5zm12 0v2h2V5h-2zM5 9v6h14V9H5zm0 8v2h2v-2H5zm12 0v2h2v-2h-2z" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  // `?? ""` (bukan `?? "/"`): nilai yang tak bisa dipercaya sengaja dibiarkan
  // apa adanya, sebab penyaring di bawah ini ALLOWLIST — apa pun yang tak
  // dikenali berarti navigasi DIAM. Daftar & alasannya di
  // lib/navigasi-halaman.ts; jangan kembalikan ke bentuk denylist.
  const pathname = usePathname() ?? "";

  /**
   * Pesan singkat sesudah "Bagikan" ditekan.
   *
   * Perlu ada karena DUA dari tiga jalur berbagi tidak memberi tanda apa pun
   * dari sisi sistem: menyalin ke papan klip itu senyap total, dan pembatalan
   * lembar berbagi juga senyap. Tanpa pesan ini penonton menekan tombol lalu
   * tidak tahu apakah sesuatu terjadi.
   */
  const [pesan, setPesan] = useState<string | null>(null);

  /** Pop up "Filter Film" (owner 2026-11-23). Lihat beranda/FilterFilmPopup.tsx. */
  const [filterTerbuka, setFilterTerbuka] = useState(false);

  /**
   * Tampilkan pesan lalu hapus sendiri.
   *
   * ⚠️ Dipisah jadi fungsi, BUKAN ditaruh di `finally`: nilai `pesan` yang
   * terbaca di dalam `bagikan()` adalah nilai dari render SEBELUMNYA (closure
   * React), jadi `if (pesan !== null)` di sana selalu memeriksa keadaan basi —
   * pesan bisa tak pernah terhapus, dan salahnya tidak memunculkan error.
   */
  function pesanSebentar(teks: string) {
    setPesan(teks);
    window.setTimeout(() => setPesan(null), 2200);
  }

  async function bagikan() {
    // `window.location.href`, bukan alamat yang dirakit dari konstanta: yang
    // ingin dibagikan penonton adalah halaman yang SEDANG ia lihat, termasuk
    // kata kunci pencarian atau genre yang sedang aktif.
    const url = typeof window === "undefined" ? "" : window.location.href;
    const data = { title: SITE_NAME, text: `Nonton drama & film di ${SITE_NAME}`, url };

    try {
      // Lembar berbagi bawaan HP. Hanya ada di konteks aman (https/localhost)
      // dan sebagian besar browser HP — karena itu SELALU ada jalur cadangan
      // di bawah, bukan pesan "browser kamu tidak didukung".
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(data);
        return; // Lembar berbagi sudah jadi tandanya sendiri.
      }
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        pesanSebentar("Tautan disalin");
        return;
      }
      pesanSebentar("Browser ini tidak bisa membagikan");
    } catch (e) {
      // Penonton MEMBATALKAN lembar berbagi juga mendarat di sini (Web Share
      // melempar `AbortError`). Itu bukan kegagalan — mengeluh di situ berarti
      // menuduh penonton salah padahal ia sengaja menutupnya. Kegagalan NYATA
      // (mis. papan klip ditolak izinnya) tetap dikabari, sebab kalau didiamkan
      // tombolnya terasa mati total.
      const dibatalkan = e instanceof DOMException && e.name === "AbortError";
      if (!dibatalkan) pesanSebentar("Gagal membagikan");
    }
  }

  /**
   * Aksi disuntikkan DI SINI, bukan ditulis di `TABS` yang module-level.
   *
   * Alasannya bukan gaya: `TABS` dibuat sekali saat modul dimuat, jauh sebelum
   * komponen punya state. Fungsi yang ditulis di sana akan memegang `setState`
   * yang belum ada. Bentuk tabnya tetap satu daftar supaya jumlah kolom &
   * penanda aktif tetap dihitung dari satu sumber.
   */
  const SEMUA_TAB: Tab[] = [
    ...TABS.map((t) =>
      t.label === "Filter" ? { ...t, aksi: () => setFilterTerbuka(true) } : t,
    ),
    {
      label: "Bagikan",
      match: () => false, // Aksi, bukan halaman — tak pernah "sedang dibuka".
      aksi: bagikan,
      icon: (active) => (
        <svg viewBox="0 0 24 24" className={kelasIkon(active)}>
          <path d="M18 16.08a2.9 2.9 0 00-1.96.77L8.91 12.7a3.2 3.2 0 000-1.4l7.05-4.11A3 3 0 1015 5c0 .24.04.47.09.7L8.04 9.81a3 3 0 100 4.38l7.12 4.16c-.05.21-.08.43-.08.65a2.92 2.92 0 102.92-2.92z" />
        </svg>
      ),
    },
  ];

  if (!punyaNavigasiBawah(pathname)) return null;

  const activeIndex = SEMUA_TAB.findIndex((t) => t.match(pathname));
  const tabWidth = 100 / SEMUA_TAB.length;

  return (
    <nav /* Sapuan lengkung yang SAMA dengan bar atas (lihat LATAR_BAR_MEREK di
         beranda/shell.ts) supaya atas & bawah terbaca satu bahasa. Ditulis
         langsung di sini, bukan memakai konstanta itu: bar atas membawa
         `relative isolate overflow-hidden` yang di sini sudah dipegang
         `fixed`, dan menumpuknya menghasilkan posisi yang bertengkar. */
      className="sapuan-gelombang sapuan-gelombang--bawah fixed bottom-0 left-0 right-0 z-30 border-t border-emas-700/40 bg-gelap-900 md:hidden">
      <div className="relative mx-auto max-w-md">
        {/* Garis menyala yang meluncur mengikuti menu aktif */}
        {activeIndex >= 0 && (
          <div
            className="pointer-events-none absolute top-0 transition-transform duration-300 ease-out"
            style={{ width: `${tabWidth}%`, transform: `translateX(${activeIndex * 100}%)` }}
          >
            <div className="mx-auto h-1 w-10 rounded-full bg-emas-500" />
          </div>
        )}

        {/* Jumlah kolom mengikuti `SEMUA_TAB`, BUKAN angka tulis-tangan.
            Penanda aktif di atas memakai `tabWidth = 100 / SEMUA_TAB.length`,
            jadi patokan `grid-cols-N` yang ditulis tangan membuat penanda
            meleset dari tombolnya begitu jumlah tab berubah — persis yang
            terjadi saat Shorts & My List dilepas (4 → 2). Ditulis sebagai
            style inline karena Tailwind memindai nama kelas secara STATIS:
            kelas rakitan seperti `grid-cols-${n}` tidak pernah ikut ter-build. */}
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(${SEMUA_TAB.length}, minmax(0, 1fr))` }}
        >
          {SEMUA_TAB.map((tab) => {
            const active = tab.match(pathname);
            // `min-h-14` = target sentuh di atas ambang 44px yang dipakai sisa
            // situs ini (rak a11y). Empat tab di layar 360px menyisakan ~90px
            // per tab secara mendatar, jadi yang perlu dijaga tingginya.
            const isi = (
              <>
                <span className="relative">{tab.icon(active)}</span>
                <span
                  className={`text-[10px] leading-tight transition-colors duration-300 ${
                    active ? "font-semibold text-emas-400" : "text-redup"
                  }`}
                >
                  {tab.label}
                </span>
              </>
            );
            const kelas =
              "relative flex min-h-14 select-none flex-col items-center justify-center gap-1 px-1 py-2 text-center transition-transform duration-150 active:scale-90";

            return tab.aksi ? (
              <button
                key={tab.label}
                type="button"
                onClick={() => void tab.aksi?.()}
                className={kelas}
              >
                {isi}
              </button>
            ) : (
              <Link key={tab.label} href={tab.href ?? "/"} className={kelas}>
                {isi}
              </Link>
            );
          })}
        </div>

        {/* Pesan hasil berbagi. `aria-live` supaya pembaca layar ikut
            mengumumkannya — tanpa itu pemakai pembaca layar tidak pernah tahu
            tautannya sudah tersalin. */}
        {pesan && (
          <div
            aria-live="polite"
            className="pointer-events-none absolute inset-x-0 -top-10 mx-auto w-fit rounded-full bg-gelap-800 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg"
          >
            {pesan}
          </div>
        )}
      </div>

      {/* Pop up "Filter Film" — dipasang DI DALAM <nav> yang `md:hidden`, jadi
          ia ikut mati di layar komputer tanpa aturan tambahan. Radix tetap
          mem-portal isinya ke <body> saat dibuka, jadi posisinya di sini tidak
          membuatnya terjepit di dalam bar. */}
      <FilterFilmPopup
        terbuka={filterTerbuka}
        onTutup={() => setFilterTerbuka(false)}
      />
    </nav>
  );
}
