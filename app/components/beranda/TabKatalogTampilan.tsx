import type { ReactNode } from "react";
import Link from "next/link";
import type { Drama } from "@/lib/types";
import {
  daftarTab,
  isiTabLengkap,
  TAB_BAWAAN,
  TAB_GRID_ITEMS,
  TAB_ROW_ITEMS,
  KUNCI_SEKSI_DRAMA,
  SEKSI_BERISI_FILM,
  SEKSI_FILM,
  URUTAN_SEKSI_BERANDA,
  type TabKatalog,
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
import {
  CHIP_BARIS_AKTIF,
  CHIP_BARIS_DIAM,
  GRID_CLASS,
  KELAS_CHIP_BARIS,
  ROW_KATEGORI_CARD_CLASS,
  SHELL,
  TOMBOL_UTAMA,
} from "./shell";
import { ID_JUDUL_TAWARAN } from "./LayarindoMenawarkan";
import PanahGeserBaris from "./PanahGeserBaris";
import { Button } from "@/components/ui/button";
import { filmSeksiNontonBareng, filmSeksiRekomendasi } from "@/lib/film-seksi";
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

/**
 * Id baris chip — dipakai panah geser untuk menemukan elemen yang digeser.
 * Ditulis sekali supaya tombol & barisnya mustahil menyimpang: salah ketik di
 * salah satunya = panah yang diklik lalu tidak terjadi apa-apa, tanpa error.
 */
export const ID_BARIS_CHIP = "baris-chip-pintasan";

export default function TabKatalogTampilan({
  dramas,
  tab,
  semua,
  basePath = "/",
  hanyaMenu = false,
  seksiLengkap = false,
  tabDisembunyikan = [],
  slotBarisTab,
  slotJudulBaris,
  videos = [],
  videoSeries = [],
  filmSeksi = [],
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
   * Judul baris, digambar DI ATAS deret chip dan di tengah (owner
   * 2026-11-24). Terpisah dari `slotBarisTab` supaya kelima chip bisa jadi
   * anak LANGSUNG satu kisi — itu syarat lebarnya bisa seragam.
   * Kosong di /katalog: di sana barisnya memang tanpa judul.
   */
  slotJudulBaris?: ReactNode;
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
  /**
   * KOLAM film untuk seksi "Nonton Bareng" & "Rekomendasi" (owner 2026-11-24).
   *
   * WAJIB sudah disiapkan `siapkanTampilanDepan` (lib/baris-atas.ts →
   * `filmSeksi`): film BERSAMPUL saja, judul yang duduk di baris poster atas
   * sudah dibuang, urutan tahun rilis terbaru di depan, belum dipotong.
   * Mengoper daftar film MENTAH ke sini tetap lolos typecheck dan tetap
   * menggambar 20 kartu — cuma 11 di antaranya kotak hitam tanpa sampul dan 9
   * mengulang baris atas (terukur 2026-11-24, sebelum lib/film-seksi.ts ada).
   *
   * ⚠️ BEDA dari `videos` di atas: `videos` adalah kolam yang sama tapi SUDAH
   * dipotong 20 untuk seksi "Film Terbaru". Potongan untuk dua seksi lain
   * dihitung lib/film-seksi.ts, yang butuh melihat kolam utuhnya.
   *
   * Kosong = kedua seksi itu tidak digambar. Itu keadaan NORMAL saat penyedia
   * luar sedang mati, bukan error.
   */
  filmSeksi?: PlaylyVideoPublik[];
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
    <section className="py-3 terang:bg-zinc-100">
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
        <div className="rounded-lg border border-gelap-700 bg-gelap-900/80 p-2 shadow-[0_6px_20px_-6px_rgba(0,0,0,0.9)] terang:border-zinc-200 terang:bg-white terang:shadow-[0_6px_20px_-10px_rgba(0,0,0,0.25)]">
        {/* JUDUL di baris SENDIRI, di tengah (owner 2026-11-24). Hanya terisi
            di `/` & `/beranda`; di /katalog slot ini kosong dan barisnya
            langsung mulai dari tab, persis seperti sebelumnya. */}
        {slotJudulBaris}
        <div className="flex items-center gap-2">
        {/* DI HP: SATU BARIS yang DIGESER menyamping, bukan bertumpuk ke bawah
            (owner 2026-11-24, menunjuk gambar acuan: *"yang dibawahnya kamu
            kasih tanda panah aja (khusus HP) jadi tidak bertumpuk"*).

            ⚠️ INI MENGGANTI kisi dua kolom yang dipasang beberapa jam
            sebelumnya pada hari yang sama. Kisi itu memang membuat lebar
            kelima chip sama persis, TAPI ia menumpuk jadi TIGA baris dan
            kotaknya tumbuh tinggi — owner menunjuknya sebagai "bertumpuk".
            Jangan dikembalikan ke kisi: yang dijaga sekarang tingginya tetap
            SATU baris, dan keseragamannya pindah ke BENTUK (tinggi 44px,
            sudut, garis, huruf — semuanya dari `KELAS_CHIP_BARIS`), bukan ke
            lebar. Gambar acuan owner pun lebarnya mengikuti panjang tulisan.

            `[&>*]:shrink-0` wajib: tanpa itu chip dipepetkan agar muat dan
            tulisannya terpotong, bukan digeser. */}
        <div
          id={ID_BARIS_CHIP}
          role={slotJudulBaris ? "group" : undefined}
          aria-labelledby={slotJudulBaris ? ID_JUDUL_TAWARAN : undefined}
          className={cn(
            "no-scrollbar flex flex-1 items-center gap-2 overflow-x-auto",
            slotBarisTab
              ? "[&>*]:shrink-0 md:flex-wrap"
              : "max-md:flex-wrap",
          )}
        >
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
                /* ⚠️ BENTUKNYA DARI `KELAS_CHIP_BARIS`, bukan ditulis di sini
                   (owner 2026-11-24: semua chip di baris ini WAJIB seragam).
                   Sampai hari itu tab memakai `rounded-sm px-3 py-2` sementara
                   tiga chip tetangganya `rounded-full min-h-11` — dua bentuk
                   berbeda bersebelahan dalam satu kotak. Kalau kelasnya
                   ditulis ulang di sini lagi, ketidakseragaman itu kembali
                   tanpa satu pun error.
                   Bayangan pada chip aktif memberi kesan TERANGKAT dari
                   halaman, bukan sekadar berganti warna (owner 2026-09-26:
                   "kasih shadow biar nampak pro"). */
                className={cn(
                  KELAS_CHIP_BARIS,
                  sedangDipakai ? CHIP_BARIS_AKTIF : CHIP_BARIS_DIAM,
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
        {/* PANAH GESER — HP saja, dan HANYA di baris yang berisi chip
            pintasan. Di /katalog (`slotBarisTab` kosong) barisnya memang
            membungkus ke bawah, jadi tak ada yang perlu digeser; panah yang
            diklik lalu diam membuat penonton mengira bagian itu rusak. */}
        {slotBarisTab ? (
          <PanahGeserBaris
            targetId={ID_BARIS_CHIP}
            label="Geser pintasan ke kanan"
          />
        ) : null}

        <div className="hidden md:flex">
          <FilterKatalog />
        </div>
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
            // ⚠️ URUTANNYA DARI `URUTAN_SEKSI_BERANDA` (lib/tab-katalog.ts),
            // bukan dari urutan `tabs` (owner 2026-11-24 menentukan lima
            // seksi beserta urutannya). Daftar itu sekaligus menentukan apa
            // yang TIDAK digambar — "Series Unggulan" & tab tahun tidak ada
            // di sana, jadi seksinya hilang dari beranda. Tabnya TETAP hidup;
            // lihat alasannya di daftar itu.
            const diizinkan = new Set(URUTAN_SEKSI_BERANDA);
            const terpakai = URUTAN_SEKSI_BERANDA.map((k) =>
              k === SEKSI_FILM ? SEKSI_FILM : tabs.find((t) => t.key === k),
            ).filter((t): t is TabKatalog | typeof SEKSI_FILM => Boolean(t));

            // Tab yang sedang dibuka tetap naik ke urutan pertama supaya
            // kliknya terasa (perilaku yang diminta owner 2026-10-09) — tapi
            // HANYA kalau ia memang salah satu dari lima seksi di atas.
            // Tanpa syarat itu, mengklik tab yang seksinya sengaja
            // disembunyikan akan memunculkannya kembali di beranda.
            const urutan =
              diizinkan.has(tabAktif.key)
                ? [
                    tabs.find((t) => t.key === tabAktif.key) ?? tabAktif,
                    ...terpakai.filter(
                      (t) => t === SEKSI_FILM || t.key !== tabAktif.key,
                    ),
                  ]
                : terpakai;
            const gambarFilm = () => (
              <SeksiKatalog
                key={KUNCI_BARIS_VIDEO}
                idSeksi={`seksi-${KUNCI_BARIS_VIDEO}`}
                judul={JUDUL_BARIS_VIDEO}
                keterangan="Film layar lebar — tahun rilis terbaru lebih dulu."
                kartu={videos.map(bungkusVideo)}
                hrefSemua="/film"
              />
            );
            /**
             * Kartu satu seksi.
             *
             * ⚠️ DUA SEKSI BERISI FILM, SISANYA DRAMA (owner 2026-11-24:
             * *"nonton bareng, rekomendasi kamu isi dengan film saja jangan
             * drama lagi, sedangkan drama kamu masukan ke drama asia"*).
             *
             * Filmnya WAJIB dari penyedia luar (`filmSeksi`), bukan dari
             * katalog: terukur di katalog produksi, dari 41 judul hanya SATU
             * ber-`kind: "movie"` ("Meg 2 The Trench"). Menyaring katalog
             * akan menghasilkan dua seksi berisi satu kartu — tampak seperti
             * halaman rusak, bukan seperti yang diminta.
             *
             * SIAPA DAPAT POTONGAN MANA diputuskan lib/film-seksi.ts, bukan di
             * sini — supaya aturannya bisa diuji tanpa browser dan satu tempat
             * saja yang menjawabnya. Ringkasnya: ketiga seksi film menarik dari
             * SATU kolam, jadi masing-masing wajib mengambil jendela/urutan
             * yang berbeda; kalau tidak, satu layar beranda menampilkan dua
             * puluh judul yang sama tiga kali.
             */
            const kartuSeksi = (t: TabKatalog) => {
              if (SEKSI_BERISI_FILM.has(t.key)) {
                const pilihan =
                  t.key === "rekomendasi"
                    ? filmSeksiRekomendasi(filmSeksi, TAB_GRID_ITEMS)
                    : filmSeksiNontonBareng(filmSeksi, TAB_GRID_ITEMS);
                return pilihan.map(bungkusVideo);
              }
              /* SERIAL dari penyedia luar ikut ke seksi "Drama Asia", dan
                 sengaja tidak ke tab lain: "Series Unggulan" butuh penanda
                 `exclusive`, "Terpopuler" butuh jumlah penonton — video
                 Playly tidak punya satu pun dari data itu. Menaruhnya di sana
                 berarti mengaku judul ini unggulan/populer tanpa seorang pun
                 pernah menilainya.
                 ⚠️ PINDAH dari tab bawaan ke sini 2026-11-24: tab bawaan kini
                 berisi FILM, jadi serial yang dititipkan ke sana akan jadi
                 satu-satunya drama di seksi film.

                 Ditaruh di DEPAN drama katalog, bukan di ekor: seksi memuat 20
                 kartu dan yang di ekor praktis tak pernah terlihat tanpa
                 menggeser jauh — owner yang baru saja menandai sebuah video akan
                 menyimpulkan fiturnya tidak jalan. Aturan yang sama sudah
                 dipakai baris genre di lib/beranda-video.ts. */
              return [
                ...(t.key === KUNCI_SEKSI_DRAMA ? videoSeries.map(bungkusVideo) : []),
                ...isiTabLengkap(dramas, t.key)
                  .slice(0, TAB_GRID_ITEMS)
                  .map(bungkusDrama),
              ].slice(0, TAB_GRID_ITEMS);
            };
            const gambarSeksi = (t: TabKatalog) => (
              <SeksiKatalog
                key={t.key}
                idSeksi={`seksi-${t.key}`}
                judul={t.judul}
                keterangan={t.keterangan}
                kartu={kartuSeksi(t)}
                /* Seksi berisi film menunjuk /film, bukan /katalog?tab=… —
                   halaman katalog menampilkan DRAMA, jadi "Semua" dari seksi
                   film akan mendarat di daftar yang isinya lain sama sekali. */
                hrefSemua={
                  SEKSI_BERISI_FILM.has(t.key)
                    ? "/film"
                    : t.key === TAB_BAWAAN
                      ? "/katalog"
                      : `/katalog?tab=${t.key}`
                }
              />
            );
            return (
              <>
                {urutan.map((t) =>
                  t === SEKSI_FILM ? gambarFilm() : gambarSeksi(t),
                )}
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
              "h-8 shrink-0 rounded-full px-4 text-[11px] font-bold uppercase tracking-wide",
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
