import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDramaCached } from "@/lib/dramas";
import { SITE_URL, absoluteUrl, toMetaDescription } from "@/lib/site";
import { dramaJsonLd, toJsonLdScript } from "@/lib/structured-data";
import { isMovie, subtitleLabel, type Drama } from "@/lib/types";
import Poster from "@/app/components/Poster";
import SaveButton from "@/app/components/SaveButton";
import LikeButton from "@/app/components/LikeButton";
import Comments from "@/app/components/Comments";
import WatchCta from "@/app/components/WatchCta";
import EpisodeList from "@/app/components/EpisodeList";
import AdBanner from "@/app/components/AdBanner";
import RatingStars from "@/app/components/RatingStars";
import ShareButton from "@/app/components/ShareButton";
import DownloadButton from "@/app/components/DownloadButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Captions } from "lucide-react";
import { PAYWALL_ENABLED } from "@/lib/saklar-fitur";
import KepalaFilm from "@/app/components/beranda/KepalaFilm";
import PanelFilm from "@/app/components/film/PanelFilm";
import PanelPopuler from "@/app/components/film/PanelPopuler";
import KakiFilm from "@/app/components/film/KakiFilm";
import { getAllDramasCachedSafe } from "@/lib/dramas";
import { labelGenre, labelGenreGabungan } from "@/lib/genre";
import { labelNegara } from "@/lib/negara";
import { pilihTerkait } from "@/lib/film-terkait";

// Halaman disimpan & dipakai ulang, disegarkan tiap 60 detik. Menggantikan
// force-dynamic yang sebelumnya membangun ulang halaman untuk TIAP pengunjung
// (dan diam-diam membatalkan generateStaticParams di bawah).
export const revalidate = 60;

/**
 * Berapa judul di panel "Film Terkait" di dalam bingkai pemutar.
 *
 * Dinaikkan 6 -> 20 pada 2026-10-29: owner melaporkan panelnya *"stuck tidak
 * bisa di-scroll"*. Dengan 6 judul tingginya nyaris sama dengan pemutar, jadi
 * tak ada yang terlampaui dan gulungannya tak pernah muncul — terasa macet
 * padahal mekanismenya ada.
 *
 * Dua hal harus berpasangan supaya gulungannya benar-benar bekerja:
 *   1. daftar yang MEMANG lebih panjang daripada pemutar (konstanta ini), dan
 *   2. panelnya `lg:absolute lg:inset-0` di tata letak bawah — tanpa itu
 *      daftar panjang justru MEMANJANGKAN bingkainya.
 *
 * Grid 5 poster di bawah komentar sudah DIBUANG lebih dulu (owner: *"film
 * terkait cukup satu di sidebar kanan atas"*), jadi daftar ini tak bisa dobel
 * dengan apa pun.
 */
const TERKAIT_SIDEBAR = 20;

// Daftar kosong DISENGAJA: halaman drama tidak lagi dibuat saat build, melainkan
// saat pengunjung pertama membukanya (lalu disimpan ISR 60 detik oleh
// `revalidate` di atas). `dynamicParams` harus tetap true — dengan daftar kosong,
// mematikannya membuat SEMUA halaman drama balas 404.
//
// KENAPA prerender dilepas (2026-09-19). Sebelumnya fungsi ini memulangkan 42 id
// dan build mem-prerender 42 halaman, masing-masing memanggil `getDramaCached`.
// Pembacaan ber-cache itu tersendat lewat batas 6 detik di dalam proses build
// SEKALIPUN databasenya sehat — dibuktikan: bentuk query yang sama persis diuji
// langsung untuk seluruh 42 judul (42/42 sukses < 1 detik) dan Supabase dipantau
// 3 menit tanpa putus (36/36 sukses), tapi `npm run build` tetap gagal 9× dengan
// "Supabase tidak menjawab". Yang lolos di build yang sama justru pembacaan TANPA
// cache di fungsi ini dulu (`getAllDramas`, 42 judul terambil) — jadi masalahnya
// di jalur cache fetch Next saat prerender, bukan di database. Sudah dicoret lewat
// percobaan: jumlah worker (1 worker pun gagal), serbuan permintaan, berat query,
// baris data tertentu, batas waktu 60 detik (makin buruk), disk/antivirus, versi
// Next. Penyebab persis di dalam Next ❓ belum terverifikasi.
//
// Yang hilang kecil: dengan `revalidate = 60` halaman ini toh dibangun ulang tiap
// 60 detik, jadi prerender hanya menolong pengunjung pertama sesudah deploy.
// Yang didapat: build produksi tak bisa lagi dijatuhkan oleh satu pembacaan
// database yang lambat. Penjaga: tests/drama-prerender-build.test.ts.
export const dynamicParams = true;

export async function generateStaticParams(): Promise<{ id: string }[]> {
  return [];
}

export async function generateMetadata(
  props: PageProps<"/drama/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const drama = await getDramaCached(id);
  if (!drama) return { title: "Drama tidak ditemukan" };

  const film = isMovie(drama);
  const title = `${drama.title} Sub Indo`;
  const description = toMetaDescription(
    drama.synopsis,
    film
      ? `Nonton film ${drama.title} sub Indo gratis di DramaKu — full movie.`
      : `Nonton ${drama.title} sub Indo gratis di DramaKu — ${drama.episodes} episode.`,
  );
  const cover = drama.heroImage || drama.posterImage;
  const path = `/drama/${encodeURIComponent(drama.id)}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: film ? "video.movie" : "video.tv_show",
      title,
      description,
      url: `${SITE_URL}${path}`,
      ...(cover ? { images: [{ url: absoluteUrl(cover), alt: drama.title }] } : {}),
    },
  };
}

export default async function DramaDetailPage(props: PageProps<"/drama/[id]">) {
  const { id } = await props.params;
  const drama = await getDramaCached(id);
  if (!drama) notFound();
  const film = isMovie(drama);

  /**
   * "Film Terkait" — grid di dasar halaman (owner 2026-10-29, mencontoh
   * "RELATED MOVIES" di situs pembanding).
   *
   * `...CachedSafe` wajib, alasan yang sama dengan `KepalaFilm`: halaman ini
   * ber-`revalidate`, dan satu pembacaan `no-store` membuatnya dibangun ulang
   * untuk TIAP pengunjung. `Safe` = tidak pernah melempar, jadi seksi pelengkap
   * ini tak bisa menjatuhkan halaman dramanya.
   *
   * Dipilih & dipotong DI SERVER: tanpa itu seluruh katalog ikut terkirim ke
   * browser tiap pengunjung padahal yang tergambar cuma 5 petak.
   */
  const semuaDrama = await getAllDramasCachedSafe();

  /**
   * Kandidat "terkait" DISARING ke jenis yang SAMA (owner 2026-10-29: *"kalau
   * yang diputar drama, sidebar kanan drama terkait; kalau film, film
   * terkait"*).
   *
   * Sebelumnya seluruh katalog jadi kandidat, sehingga halaman serial 38
   * episode menawarkan daftar berjudul "FILM TERKAIT" berisi film layar lebar.
   * Dua jenis tontonan yang berbeda: orang yang sedang mengikuti serial tidak
   * sedang mencari film sekali tonton.
   *
   * `isMovie()` — SATU-SATUNYA tempat yang memutuskan film atau serial
   * (lib/types.ts). Dipakai ulang, bukan ditebak dari jumlah episode, supaya
   * tak ada aturan kedua yang bisa menyimpang.
   *
   * ⚠️ JATUH-KEMBALI saat katalog sejenis terlalu tipis. Diukur 2026-10-29,
   * katalog berisi 1 film dan 39 serial — jadi halaman FILM tidak punya satu
   * pun film lain untuk ditawarkan, dan penyaringan ketat membuat kolom
   * kanannya hilang sama sekali. Dalam keadaan itu seluruh katalog dipakai,
   * DAN judulnya ikut berubah jadi "Tontonan Lain": daftar campuran di bawah
   * judul "Film Terkait" adalah janji yang tidak ditepati.
   */
  const sejenis = semuaDrama.filter((d) => isMovie(d) === film);
  /** `> 1` karena judul yang sedang dibuka ikut terhitung di `sejenis`. */
  const cukupSejenis = sejenis.length > 1;
  const kandidatTerkait = cukupSejenis ? sejenis : semuaDrama;
  const judulTerkait = cukupSejenis
    ? film
      ? "Film Terkait"
      : "Drama Terkait"
    : "Tontonan Lain";
  const semuaTerkait = pilihTerkait(
    kandidatTerkait,
    // Genre + kategori + negara diadu bersama; makin banyak yang beririsan,
    // makin tinggi skornya. Lihat `pilihTerkait` di lib/film-terkait.ts.
    { id: drama.id, label: [drama.genre, drama.category, drama.country].filter(Boolean).join(", ") },
    (d) => ({
      id: d.id,
      label: [d.genre, d.category, d.country].filter(Boolean).join(", "),
    }),
    TERKAIT_SIDEBAR,
  ).map((d) => ({
    id: d.id,
    judul: d.title,
    href: `/drama/${encodeURIComponent(d.id)}`,
    gambar: d.posterImage || d.heroImage || null,
    keterangan: [labelGenreGabungan(d.genre), labelNegara(d.country ?? "")]
      .filter(Boolean)
      .join(", "),
    // Baris ketiga di kolom sempit. Dulu `lencana` (rating IMDb) untuk grid
    // poster yang kini dibuang; sidebar memakai `jejak`, dan di sana jumlah
    // tontonan lebih berguna daripada angka rating yang sudah tampil di
    // halaman judulnya sendiri.
    jejak: `${d.views} ditonton`,
  }));

  const terkaitSidebar = semuaTerkait;

  return (
    /* LATAR TERANG (owner 2026-10-29: "ketika klik film ternyata gelap tidak
       bagus, ubah seperti SS"). Sampai hari ini halaman ini mewarisi `bg-black`
       dari app/layout.tsx; `bg-zinc-100` di sini yang menimpanya.

       Abu sangat terang, BUKAN putih murni: isi utamanya kartu putih, dan kartu
       putih di atas latar putih kehilangan batasnya — persis bentuk yang dipakai
       situs pembanding di tangkapan layar owner. */
    <div className="min-h-screen bg-zinc-100">
      {/* Kepala situs yang SAMA dengan Home (owner 2026-10-29). Di luar
          pembungkus max-w-7xl di bawah DENGAN SENGAJA: bar merah & strip kuning
          harus membentang selebar layar persis seperti di /beranda — dikurung
          di dalam pembatas isi, keduanya akan berhenti di tengah dan halaman
          ini tetap terlihat berbeda dari Home. */}
      <KepalaFilm />

      {/* ===== BINGKAI ATAS — hero + "Film Terkait" dalam SATU kotak gelap
             (owner 2026-10-29, menyamakan dengan halaman tonton).

             ⚠️ TANPA `overflow-hidden`, dan itu WAJIB: poster judul sengaja
             MENJOROK keluar dari kotak gambar hero (`absolute -bottom-16` di
             bawah). Dengan `overflow-hidden`, poster itu terpotong rapi — dan
             tidak ada error apa pun yang memberi tahu. Gantinya `pb-20` di
             kolom kiri memberi ruang supaya poster mendarat DI DALAM bingkai
             gelap, bukan menggantung di atas latar abu. */}
      <div className="mx-auto max-w-7xl px-0 pt-4 md:px-6">
        <div className="bg-black shadow-lg shadow-black/30 md:rounded-xl">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 pb-20 md:pb-24">
              <HeroDrama drama={drama} />
            </div>
            {/* ⚠️ `lg:absolute lg:inset-0` — INILAH yang membuat daftarnya
                benar-benar bisa digulung. Alasan lengkapnya ditulis sekali di
                app/tonton/[id]/page.tsx: elemen `absolute` dikeluarkan dari
                perhitungan tinggi baris grid, jadi tinggi bingkai ditentukan
                MURNI oleh hero — bukan ikut memanjang mengikuti daftar. */}
            <div className="relative min-h-0 border-zinc-800 lg:border-l">
              <div className="flex flex-col lg:absolute lg:inset-0">
                <PanelFilm
                  /* Judul mengikuti ISI yang benar-benar tergambar, bukan
                     sekadar jenis halaman — lihat `judulTerkait` di atas.
                     "FILM TERKAIT" di atas daftar serial terbaca seperti
                     salah daftar (owner 2026-10-29). */
                  judul={judulTerkait}
                  items={terkaitSidebar}
                  gelap
                  gulung
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DUA KOLOM di layar lebar: isi film + kolom "Terpopuler".
          `minmax(0,1fr)` BUKAN `1fr` — tanpa `minmax(0,…)` kolom grid memakai
          lebar-minimum isinya, sehingga satu judul panjang atau satu baris kode
          tanpa spasi bisa mendorong kolom melebar dan merusak tata letak.
          Di bawah `lg` otomatis satu kolom: kolom kanan turun ke bawah, bukan
          menghimpit isi utama di layar sempit. */}
      <div className="mx-auto max-w-7xl px-0 py-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 overflow-hidden bg-white pb-10 pt-5 shadow-sm md:rounded-xl">
      <div className="px-4 md:px-8">
        <div className="flex flex-col gap-2 sm:flex-row">
          <WatchCta dramaId={drama.id} className="flex-1" />
          <div className="flex flex-1 gap-2">
            <SaveButton id={drama.id} terang />
            <LikeButton dramaId={drama.id} terang />
            <ShareButton title={drama.title} terang />
          </div>
        </div>

        {drama.subtitles && drama.subtitles.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge className="gap-1 rounded-full bg-zinc-200 px-2.5 py-1 text-[11px] font-semibold text-zinc-700">
              <Captions className="h-3.5 w-3.5" />
              Subtitle
            </Badge>
            {drama.subtitles.map((code) => (
              <Badge
                key={code}
                variant="outline"
                className="rounded-full border-zinc-300 px-2.5 py-1 text-[11px] text-zinc-700"
              >
                {subtitleLabel(code)}
              </Badge>
            ))}
          </div>
        )}

        {/* Tombol unduh: DI BAWAH baris badge subtitle, DI ATAS Sinopsis, dan
            MELAYANG di tepi bawah layar selama penonton menggulung halaman.
            Keputusan owner 2026-09-23.

            KENAPA `sticky`, BUKAN `fixed` + JavaScript: sticky menahan tombol
            di tepi bawah layar selama induknya (blok konten sampai <Comments/>)
            masih tergulung, lalu melepasnya sendiri di ujung halaman — tanpa
            IntersectionObserver, tanpa tombol kembar, dan halaman ini tetap
            Server Component. Jalur `fixed` memaksa tombol KEDUA, dan tombol
            kedua berarti state modal kedua yang ikut lenyap saat tombolnya
            di-unmount di tengah pemakaian.

            KENAPA kelas sticky menempel di TOMBOLNYA, bukan di div pembungkus:
            `position: sticky` SELALU membuat stacking context. DownloadModal
            dirender sebagai SAUDARA tombol (DownloadButton.tsx), jadi kalau
            tombolnya dibungkus div sticky, modal `z-50` itu ikut terkurung di
            dalamnya lalu kalah dari BottomNav `z-30` yang berada di luar —
            modalnya tertimbun menu bawah di HP. Sebagai anak langsung, modal
            tetap berada di stacking context halaman.

            `bottom-20` di HP (bukan `bottom-4`) karena BottomNav setinggi
            ~64px menempel di dasar layar (BottomNav.tsx:69, layout.tsx:55
            `pb-16`); tanpa jarak itu tombol tertimbun menu. Di >=md BottomNav
            disembunyikan, jadi turun ke `bottom-4`.

            `flex` + `sm:w-fit` (bukan `sm:w-auto`): `flex` mengubah tombol
            dari inline-flex jadi block-level supaya sticky-nya berperilaku
            konsisten, dan block-level dengan `w-auto` justru melebar penuh —
            `w-fit` yang mengembalikannya ke selebar isi di layar besar.

            Isi modalnya datang dari drama.downloadProviders — kosong =
            tombolnya kembali ke perilaku unduh satu berkas lewat /api/download. */}
        <DownloadButton
          dramaId={drama.id}
          episodes={drama.episodes}
          title={drama.title}
          providers={drama.downloadProviders}
          className="sticky bottom-20 z-30 mt-4 flex w-full shadow-lg shadow-black/50 sm:w-fit md:bottom-4"
        />

        <h2 className="mt-6 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Sinopsis
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-700">{drama.synopsis}</p>

        {(drama.director ||
          drama.writer ||
          drama.stars ||
          drama.genre ||
          drama.country ||
          drama.language) && (
          <dl className="mt-5 space-y-2 border-t border-zinc-200 pt-5 text-sm">
            {(drama.country || drama.language) && (
              <div className="flex flex-wrap gap-x-2">
                <dt className="shrink-0 font-semibold text-zinc-900">Asal</dt>
                <dd className="text-zinc-600">
                  {[drama.country, drama.language].filter(Boolean).join(" · ")}
                </dd>
              </div>
            )}
            {drama.director && (
              <div className="flex flex-wrap gap-x-2">
                <dt className="shrink-0 font-semibold text-zinc-900">Director</dt>
                <dd className="text-indigo-700">{drama.director}</dd>
              </div>
            )}
            {drama.writer && (
              <div className="flex flex-wrap gap-x-2">
                <dt className="shrink-0 font-semibold text-zinc-900">Writers</dt>
                <dd className="text-indigo-700">{drama.writer}</dd>
              </div>
            )}
            {drama.stars && (
              <div className="flex flex-wrap gap-x-2">
                <dt className="shrink-0 font-semibold text-zinc-900">Stars</dt>
                <dd className="text-indigo-700">{drama.stars}</dd>
              </div>
            )}
            {drama.imdbId && (
              <div className="flex flex-wrap gap-x-2">
                <dt className="shrink-0 font-semibold text-zinc-900">IMDb</dt>
                <dd>
                  <a
                    href={`https://www.imdb.com/title/${drama.imdbId}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-rose-700 underline-offset-2 hover:underline"
                  >
                    {drama.imdbId}
                    {drama.imdbVotes ? ` · ${drama.imdbVotes} votes` : ""}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        )}

        {/* Daftar episode hanya untuk serial — film cuma punya 1 video, jadi
            daftar berisi satu baris "Episode 1" tak ada gunanya. */}
        {!film && drama.episodes > 0 && (
          <>
            <h2 className="mt-6 text-sm font-semibold uppercase tracking-wider text-zinc-500">
              Episode
            </h2>
            <EpisodeList
              dramaId={drama.id}
              episodes={drama.episodes}
              posterImage={drama.posterImage || drama.heroImage}
              title={drama.title}
              terang
            />
          </>
        )}

        <AdBanner className="mt-6" />

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-zinc-900">Nilai drama ini</h2>
          <RatingStars dramaId={drama.id} terang />
        </section>

        <Comments dramaId={drama.id} terang />
      </div>

      {/* Data terstruktur untuk Google. Memakai rating IMDb ASLI — bukan rating
          penonton, yang belum tahan pemalsuan (lihat lib/structured-data.ts). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLdScript(
            dramaJsonLd(drama, `${SITE_URL}/drama/${encodeURIComponent(drama.id)}`),
          ),
        }}
      />
          </div>

          <PanelPopuler
            kecualiId={drama.id}
            sudahTampil={terkaitSidebar.map((t) => t.id)}
          />
        </div>
      </div>

      {/* KAKI SITUS — DI LUAR grid dan DI LUAR kartu putih, dan itu intinya
          (owner 2026-10-29: *"biar tidak menyatu dengan yang di atas"*).
          Dikurung di dalam salah satunya, ia akan ikut menyempit mengikuti
          kolom isi dan berlatar sama seperti badan halaman — persis keluhan
          yang membuatnya diubah. Di sini ia membentang selebar layar dengan
          latar gelap, jadi halaman punya penutup yang jelas. */}
      <KakiFilm
        tentang={{
          judul: `Nonton ${drama.title}`,
          // Sinopsis judul yang sedang dibuka, dipotong supaya kolomnya tidak
          // menenggelamkan tiga kolom lain. Tiap halaman karena itu menutup
          // dengan teks yang berbeda — bukan paragraf sama yang diulang.
          teks: toMetaDescription(
            drama.synopsis,
            `Nonton ${drama.title} sub Indo gratis di DramaKu.`,
          ),
        }}
      />
    </div>
  );
}


/**
 * Hero halaman drama: gambar lebar + poster & judul yang MENJOROK ke bawahnya.
 *
 * Diangkat jadi fungsi sendiri 2026-10-29 saat hero dimasukkan ke dalam bingkai
 * gelap bersama "Film Terkait" — tanpa itu, markup-nya bersarang begitu dalam
 * di tengah halaman sehingga batas hero sulit dilihat sekali pandang.
 *
 * ⚠️ Poster sengaja `absolute -bottom-16` (menjorok KELUAR kotak gambar). Itu
 * berarti pembungkus mana pun di atasnya TIDAK boleh memakai `overflow-hidden`,
 * dan harus menyediakan ruang bawah (`pb-20`) supaya posternya tidak terpotong
 * maupun menggantung di luar bingkai. Pemotongan seperti itu tidak menimbulkan
 * error apa pun — yang hilang cuma separuh poster.
 */
function HeroDrama({ drama }: { drama: Drama }) {
  const film = isMovie(drama);
  return (
    /* `relative` WAJIB: poster & judul di dalamnya dipasang `absolute`, dan
       tanpa induk ber-`relative` keduanya akan mengacu ke elemen ber-posisi
       terdekat BERIKUTNYA — melompat ke tempat yang sama sekali salah. */
    <div className="relative">
    <div className={`relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br md:rounded-2xl ${drama.gradient}`}>
              {(drama.heroImage || drama.posterImage) && (
                <>
                  {/* Latar kabur dekoratif: karena di-blur berat, versi kecil sudah
                      cukup — sizes sengaja dibatasi supaya unduhannya ringan. */}
                  <Image
                    src={drama.heroImage || drama.posterImage!}
                    alt=""
                    aria-hidden
                    fill
                    sizes="256px"
                    className="scale-110 object-cover opacity-50 blur-2xl"
                  />
                  {/* Gambar utama halaman ini (LCP) → priority supaya dimuat lebih dulu. */}
                  <Image
                    src={drama.heroImage || drama.posterImage!}
                    alt={drama.title}
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 1280px"
                    className={`object-cover ${drama.heroDim ? "brightness-90" : "brightness-100"}`}
                  />
                </>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/10" />
            </div>
            <Button
              asChild
              size="icon"
              className="absolute left-3 top-3 rounded-full bg-black/60 text-white hover:bg-black/60 md:hidden"
              aria-label="Kembali"
            >
              <Link href="/beranda">
                <ChevronLeft className="h-5 w-5" />
              </Link>
            </Button>

            <div className="absolute -bottom-16 left-4 right-4 flex gap-3 md:left-8 md:right-8 md:-bottom-20 md:gap-6">
              <div className="w-28 shrink-0 md:w-44">
                <Poster drama={drama} showBadge={false} />
              </div>
              <div className="flex flex-col justify-end pb-2 md:pb-4">
                <div className="flex items-center gap-2">
                  <h1 className="title-gold text-2xl leading-tight md:text-4xl">{drama.title}</h1>
                  {/* Penanda berbayar — satu-satunya tempat kata "PREMIUM" masih
                      dipajang ke penonton (chip di poster dicabut owner
                      2026-09-23). Ikut mati bersama saklar koin: tanpa koin tak ada
                      yang berbayar, jadi memajangnya cuma membingungkan. */}
                  {PAYWALL_ENABLED && drama.premium && (
                    <Badge className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold">
                      🪙 PREMIUM
                    </Badge>
                  )}
                </div>
                {drama.genre && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {drama.genre.split(",").map((g) => (
                      <span
                        key={g.trim()}
                        className="rounded-full border border-white/40 px-2.5 py-0.5 text-[11px] text-white"
                      >
                        {labelGenre(g.trim())}
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-1.5 text-xs text-zinc-300 md:text-sm">
                  {[
                    drama.year,
                    drama.runtime,
                    film ? "Film" : drama.episodes > 1 ? `${drama.episodes} episode` : "",
                    drama.imdbRating ? `IMDb ${drama.imdbRating}/10` : "",
                    drama.country,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  {drama.year || drama.runtime || drama.imdbRating || drama.country
                    ? " · "
                    : ""}
                  {drama.views} ditonton
                </p>
              </div>
            </div>
    </div>
  );
}
