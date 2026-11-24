import type { ReactNode } from "react";
import Link from "next/link";
import type { Drama } from "@/lib/types";
import {
  daftarTab,
  isiTabLengkap,
  TAB_BAWAAN,
  TAB_GRID_ITEMS,
  TAB_ROW_ITEMS,
  type TabKey,
} from "@/lib/tab-katalog";
import CatalogCard from "./CatalogCard";
import FeaturedRow from "./FeaturedRow";
import FilterKatalog from "./FilterKatalog";
import SeksiKatalog from "./SeksiKatalog";
import {
  bungkusDrama,
  bungkusVideo,
  JUDUL_BARIS_VIDEO,
  KUNCI_BARIS_VIDEO,
} from "@/lib/beranda-video";
import type { PlaylyVideoPublik } from "@/lib/playly-publik";
import { GRID_CLASS, ROW_KATEGORI_CARD_CLASS, SHELL, TOMBOL_UTAMA } from "./shell";
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
  seksiLengkap = false,
  tabDisembunyikan = [],
  slotBarisTab,
  videos = [],
  videoSeries = [],
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
  /**
   * true = gambar SEMUA tab sebagai seksi grid bertumpuk (bentuk LK21 yang
   * diminta owner 2026-10-09), bukan satu tab sebagai baris geser.
   *
   * Dikunci di balik prop supaya /katalog (paksaSemua) dan /beranda (hanyaMenu)
   * NOL perubahan — keduanya tidak mengirimnya. Halaman depan satu-satunya
   * pemakai, dan memang cuma di sanalah bentuk ini diminta.
   */
  seksiLengkap?: boolean;
  /**
   * Film untuk seksi putih "Film Terbaru". Halaman pemanggil mengisi ini
   * dari daftar film yang BELUM tampil di baris hitam. Sudah terurut tahun.
   *
   * Kosong = seksinya tidak digambar sama sekali. Itu keadaan NORMAL saat
   * sumber video luar sedang mati, bukan error.
   */
  videos?: PlaylyVideoPublik[];
  /**
   * Tab yang TOMBOLNYA tidak digambar di baris atas — isinya TETAP ada.
   *
   * Owner 2026-11-23: *"series terbaru, unggulan, update kamu hapus saja
   * karena sudah ada, biar bisa sejajar"*. Ketiganya memang sudah punya dua
   * jalan lain: judul seksinya sendiri tepat di bawah baris ini, dan menu
   * "Series" di bar atas (lib/nav-katalog.ts:502 → /katalog?tab=…). Dengan
   * tiga tombol terpanjang dilepas, sisanya muat satu baris di layar HP —
   * sebelumnya tombol kedua selalu terpotong di tepi layar.
   *
   * ⚠️ YANG DISEMBUNYIKAN CUMA TOMBOLNYA, bukan tabnya. `daftarTab` tetap utuh
   * dan `parseTab` tetap mengenali ketiga kuncinya. Kalau tabnya sendiri yang
   * dibuang, EMPAT tautan menu "Series" akan mendarat di daftar yang salah
   * tanpa satu pun error — `tabAktif` jatuh diam-diam ke tab pertama. Itu
   * persis kerusakan senyap yang dilarang aturan project.
   *
   * Dibiarkan KOSONG di /katalog dengan sengaja: halaman itu tujuan tautan
   * menu "Series", jadi tombol tab yang sedang dipakai harus tetap terlihat
   * menyala di sana.
   */
  tabDisembunyikan?: TabKey[];
  /**
   * Isi tambahan yang DITITIPKAN di depan tombol tab, DI DALAM kotak yang sama.
   *
   * Owner 2026-11-23 menyederetkan judul "Layarindo Menawarkan" + tiga chip
   * pintasan dengan tombol tab, lewat sketsa di tangkapan layar. Sebelumnya
   * keduanya dua baris bertumpuk.
   *
   * KENAPA SLOT, bukan `LayarindoMenawarkan` diimpor langsung di sini: /katalog
   * memakai baris tab yang sama, dan di halaman itu judul "Layarindo
   * Menawarkan" tidak pada tempatnya. Dengan slot, halaman yang tidak
   * mengisinya tidak mendapatkannya — nol aturan "kecuali di halaman X" yang
   * harus diingat.
   */
  slotBarisTab?: ReactNode;
  /**
   * SERIAL dari penyedia video luar, untuk seksi "Series Terbaru" (owner
   * 2026-11-05: "rekan saya upload drama dari playly tapi masuknya ke film
   * terbaru, harusnya masuk ke series terbaru").
   *
   * Jumlahnya SUDAH dibatasi oleh halaman pemanggil
   * (`MAKS_SERIES_PLAYLY_DI_SEKSI`) — jangan dipotong lagi di sini, dan jangan
   * dilepas batasnya: satu drama pendek bisa berisi puluhan episode, dan tiap
   * episode hari ini = satu kartu sendiri.
   *
   * Kosong = seksi "Series Terbaru" berisi drama katalog saja, persis seperti
   * sebelum fitur ini ada. Itu keadaan NORMAL selama belum ada video yang
   * ditandai admin.
   */
  videoSeries?: PlaylyVideoPublik[];
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
    <section className="bg-gelap-950 py-3 terang:bg-zinc-100">
      {/* ===== Deret tab + tombol FILTER ===== */}
      {/* ===== Deret tab + tombol FILTER, dalam SATU kotak berpembatas =====
             Owner 2026-09-26: "aku mau jadi satu shadow ... seperti LK21 (jadi
             ada seperti pembatas)". Sebelumnya tiap tab punya bayangannya
             sendiri dan barisnya terbaca sebagai tombol-tombol yang berserakan;
             sekarang satu panel bergaris + satu bayangan, jadi seluruh baris
             terbaca sebagai SATU alat kendali. */}
      {/* ⚠️ Deret tab ini sempat disembunyikan di HP pada 2026-11-21 lewat prop
          `tabHanyaDesktop`; dikembalikan pada hari yang sama atas permintaan
          owner (*"cuma bagian atas yang diubah, sisanya kembalikan ke
          dramaku"*). Ia tergambar di SEMUA ukuran layar lagi. */}
      <div className={cn(SHELL)}>
        <div className="flex items-center gap-2 rounded-lg border border-gelap-700 bg-gelap-900/80 p-2 shadow-[0_6px_20px_-6px_rgba(0,0,0,0.9)] terang:border-zinc-200 terang:bg-white terang:shadow-[0_6px_20px_-10px_rgba(0,0,0,0.25)]">
        {/* `max-md:flex-wrap` = DI HP barisnya MEMBUNGKUS ke bawah, bukan
            digeser menyamping. Ditambahkan 2026-11-23 bersama `slotBarisTab`:
            begitu judul + tiga chip ikut masuk, barisnya jadi jauh lebih
            panjang dari layar HP — dan versi tergeser hanya menampilkan judul
            + satu chip, tanpa tanda bahwa masih ada isi di sebelah kanan.
            Terbukti saat mock-nya dipotret sebelum dipasang.
            `overflow-x-auto` dibiarkan: dengan isi yang membungkus, tak ada
            yang meluap, jadi ia hanya berlaku lagi di layar komputer. */}
        <div className="no-scrollbar flex flex-1 items-center gap-2 overflow-x-auto max-md:flex-wrap">
          {slotBarisTab}
          {/* Disaring, BUKAN diambil dari daftar yang lebih pendek: `tabs`
              tetap utuh supaya `tabAktif`, judul seksi, dan /katalog?tab=…
              semuanya masih mengenali ketiga kunci yang tombolnya dilepas.
              Lihat alasan lengkapnya di prop `tabDisembunyikan` di atas. */}
          {tabs
            .filter((t) => !tabDisembunyikan.includes(t.key))
            .map((t) => {
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
                    ? // Tab aktif: sage-700 + teks putih = 7,58:1. Sampai
                      // 2026-11-23 ia `bg-amber-400` kuning terang.
                      "border-emas-500 bg-emas-500 text-gelap-950 shadow-md shadow-emas-500/30"
                    : "border-emas-700/40 text-redup hover:border-emas-500 hover:bg-emas-500/10 hover:text-emas-300",
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </div>

        {/* TOMBOL FILTER: LAYAR KOMPUTER SAJA (owner 2026-11-23: *"untuk
            versi HP filter disitu kamu hapus saja karena sudah ada di
            bawah"*). Di HP, bar bawah sudah punya tombol "Filter" yang
            membuka pop up yang SAMA PERSIS — dua pemicu untuk satu alat, dan
            yang di sini memakan ruang baris tab yang sudah sempit.

            Disembunyikan DI SINI, bukan di dalam `FilterKatalog`: alasannya
            soal TATA LETAK baris ini (ada pemicu kembar di bar bawah), bukan
            sifat tombolnya. Komponennya tetap bisa dipakai di tempat lain
            tanpa membawa aturan "jangan muncul di HP" diam-diam. */}
        <div className="hidden md:flex">
          <FilterKatalog />
        </div>
        </div>
      </div>

      {/* Mode MENU (dipakai /beranda): berhenti di sini — judul & daftarnya
          tinggal di halaman katalognya sendiri, supaya daftar yang sama tidak
          muncul dua kali dalam satu halaman. */}
      {hanyaMenu ? null : seksiLengkap ? (
        /* ===== Bentuk HALAMAN DEPAN (owner 2026-10-09, meniru LK21): tiap tab
               jadi SATU seksi grid, bertumpuk ke bawah. Tab yang sedang dipilih
               naik ke urutan pertama supaya klik tab tetap terasa akibatnya —
               tanpa itu deret tab di atas jadi tombol yang tak mengubah apa pun,
               dan tombol mati lebih menyesatkan daripada tombol yang tidak ada.

               Judul & keterangan diambil dari daftar tab yang SAMA dengan yang
               menggambar tombolnya, jadi nama di tab dan nama di seksi mustahil
               menyimpang (aturan yang sudah ada di lib/tab-katalog.ts). ===== */
        <>
          {/* Urutan owner 2026-11-17: Series Terbaru dulu, Film Terbaru
              persis di bawahnya, baru seksi tab yang lain. Film tidak boleh
              di atas series — dua judul "terbaru" yang berurutan dengan isi
              film dulu membuat penonton mengira series-nya tidak ada.
              Tab yang diklik tetap naik ke urutan pertama supaya kliknya
              terasa; film tetap menempel tepat di bawah seksi pertama itu. */}
          {(() => {
            const urutan = [tabAktif, ...tabs.filter((t) => t.key !== tabAktif.key)];
            const gambarSeksi = (t: (typeof urutan)[number]) => (
              <SeksiKatalog
                key={t.key}
                idSeksi={`seksi-${t.key}`}
                judul={t.judul}
                keterangan={t.keterangan}
                /* SERIAL dari penyedia luar ikut HANYA ke seksi "Series Terbaru"
                   (tab bawaan), dan sengaja tidak ke tab lain: "Series Unggulan"
                   butuh penanda `exclusive`, "Series Update" butuh status Ongoing,
                   "Terpopuler" butuh jumlah penonton, "Rekomendasi" butuh rating —
                   video Playly tidak punya satu pun dari data itu. Menaruhnya di
                   sana berarti mengaku judul ini unggulan/populer tanpa seorang
                   pun pernah menilainya.

                   Ditaruh di DEPAN drama katalog, bukan di ekor: seksi memuat 20
                   kartu dan yang di ekor praktis tak pernah terlihat tanpa
                   menggeser jauh — owner yang baru saja menandai sebuah video akan
                   menyimpulkan fiturnya tidak jalan. Aturan yang sama sudah
                   dipakai baris genre di lib/beranda-video.ts. */
                kartu={[
                  ...(t.key === TAB_BAWAAN ? videoSeries.map(bungkusVideo) : []),
                  ...isiTabLengkap(dramas, t.key)
                    .slice(0, TAB_GRID_ITEMS)
                    .map(bungkusDrama),
                ].slice(0, TAB_GRID_ITEMS)}
                hrefSemua={t.key === TAB_BAWAAN ? "/katalog" : `/katalog?tab=${t.key}`}
              />
            );
            const [pertama, ...lanjutan] = urutan;
            return (
              <>
                {pertama ? gambarSeksi(pertama) : null}
                <SeksiKatalog
                  idSeksi={`seksi-${KUNCI_BARIS_VIDEO}`}
                  judul={JUDUL_BARIS_VIDEO}
                  keterangan="Film layar lebar — tahun rilis terbaru lebih dulu."
                  kartu={videos.map(bungkusVideo)}
                  hrefSemua="/film"
                />
                {lanjutan.map(gambarSeksi)}
              </>
            );
          })()}
        </>
      ) : (
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
          <h2 className="truncate text-base font-bold text-white terang:text-zinc-900 md:text-lg">
            {tabAktif.judul}
          </h2>
          <p className="mt-0.5 truncate text-[11px] text-zinc-500 terang:text-zinc-600">
            {tabAktif.keterangan} · {isi.length} judul
          </p>
        </div>
        {isi.length > TAB_ROW_ITEMS && (
          <Button
            asChild
            size="sm"
            className={cn(
              TOMBOL_UTAMA,
              "h-8 shrink-0 rounded-sm px-4 text-[11px] font-bold uppercase tracking-wide",
            )}
          >
            <Link href={alamatTab(tabAktif.key, !semua)}>
              {semua ? "Ringkas" : "Semua"}
            </Link>
          </Button>
        )}
      </div>

      {/* ===== Isi: baris geser, atau grid penuh kalau "Semua" ditekan ===== */}
      {tampil.length === 0 ? (
        <div className={cn(SHELL, "py-10 text-center text-sm text-zinc-500 terang:text-zinc-600")}>
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
