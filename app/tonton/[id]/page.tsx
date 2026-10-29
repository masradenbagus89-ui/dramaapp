import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { getPlaylyVideosGabunganCached } from "@/lib/playly-gabungan";
import { alamatGambarVideo, cariVideoDariSegmen } from "@/lib/tonton";
import { SITE_URL, absoluteUrl } from "@/lib/site";
import { toJsonLdScript, videoJsonLd } from "@/lib/structured-data";
import PlaylyPlayer from "@/app/components/player/PlaylyPlayer";
import InfoVideoPlayly from "@/app/components/player/InfoVideoPlayly";
import DetailFilmPlayly from "@/app/components/player/DetailFilmPlayly";
import { getPlaylyImdbCached } from "@/lib/store";
import KepalaFilm from "@/app/components/beranda/KepalaFilm";
import PanelFilm from "@/app/components/film/PanelFilm";
import PanelPopuler from "@/app/components/film/PanelPopuler";
import KakiFilm from "@/app/components/film/KakiFilm";
import Comments from "@/app/components/Comments";
import { pilihTerkait } from "@/lib/film-terkait";

// HALAMAN TONTON SATU VIDEO (owner 2026-09-26).
//
// KENAPA ADA: sampai hari ini video hanya bisa diputar sebagai pemutar yang
// muncul DI DALAM halaman daftar. Akibatnya tak satu pun video punya alamat
// sendiri — tidak bisa dikirim ke WhatsApp, tidak bisa di-bookmark, dan tidak
// bisa ditemukan Google. Owner meminta video terasa seperti film biasa, dan
// "film biasa" di situs ini berarti punya halamannya sendiri.
//
// BEDANYA dengan /watch/[id]/[ep] dan /feed/[id]: keduanya pemutar EPISODE
// drama — ada daftar episode, koin, paywall, komentar. Halaman ini sengaja
// tidak punya satu pun dari itu; video di sini berdiri sendiri tanpa episode.

// Disimpan & dipakai ulang, disegarkan tiap 300 detik — angka yang sama dengan
// /playly dan PLAYLY_PUBLIK_TTL_SECONDS di lib/playly.ts. Ditulis sebagai angka
// literal karena Next mensyaratkannya bisa dibaca saat build.
export const revalidate = 300;

/** Berapa judul di panel "Film Terkait". Dinaikkan 6 -> 20 karena panelnya
 *  terasa "stuck" saat isinya tak melebihi tinggi pemutar — alasan lengkapnya
 *  di app/drama/[id]/page.tsx. */
const TERKAIT_SIDEBAR = 20;

// Daftar prerender sengaja KOSONG — pola yang sama persis dengan
// app/drama/[id]/page.tsx, dan alasannya sama: membuat halaman di muka saat
// build adalah jalur yang membekukan rilis EMPAT HARI pada 2026-09-19 (tiap
// halaman memanggil pembacaan ber-cache, dan pembacaan itu tersendat di dalam
// proses build walau sumbernya sehat). Dengan daftar kosong, tiap halaman
// dibuat saat pengunjung pertama membukanya lalu disimpan ISR 300 detik.
//
// ⚠️ Fungsinya TETAP ADA walau memulangkan daftar kosong, dan itu bukan sisa
// yang lupa dihapus: tanpa `generateStaticParams`, Next menandai route ini
// `ƒ (Dynamic)` — dirender ulang untuk TIAP permintaan, sehingga tiap
// pembukaan halaman menembak API video dan halamannya ikut mati saat API itu
// lambat. Terukur di build 2026-09-26: tanpa fungsi ini `ƒ`, dengan fungsi ini
// `● (SSG)` ber-ISR. Penjaganya tests/tonton-halaman.test.ts.
//
// `dynamicParams` WAJIB true. Dengan daftar kosong, nilai `false` membuat
// SETIAP halaman tonton membalas 404 tanpa satu pun error di build —
// kerusakan senyap yang sudah pernah nyaris terjadi di halaman drama.
export const dynamicParams = true;

export async function generateStaticParams(): Promise<{ id: string }[]> {
  return [];
}

/**
 * Cari video yang alamatnya menunjuk ke sini.
 *
 * Dipakai bersama `generateMetadata` dan komponen halaman — keduanya butuh
 * video yang SAMA, dan Next memang memanggil keduanya. Pembacaannya ber-cache,
 * jadi panggilan kedua tidak menambah beban.
 *
 * ⚠️ GERBANG (rak owasp — IDOR): daftarnya sengaja daftar yang SAMA dengan
 * halaman penonton, bukan pencarian bebas ke Playly. Video yang disembunyikan
 * admin atau milik kreator lain tidak ada di daftar ini, jadi alamat yang
 * ditebak-tebak berakhir 404 — bukan membuka video yang tak boleh dilihat.
 * Aturan yang sama sudah menjaga app/api/playly/video/route.ts:51.
 */
async function cariVideo(segmen: string) {
  const { videos } = await getPlaylyVideosGabunganCached();
  return cariVideoDariSegmen(videos, decodeURIComponent(segmen));
}

/**
 * Kalimat keterangan halaman — SATU sumber untuk dua pemakai: meta description
 * yang dibaca Google, dan penanda video (JSON-LD) di badan halaman. Ditulis
 * sekali supaya keduanya tidak pernah berbeda; Google membandingkan keduanya.
 */
const keteranganVideo = (judul: string) =>
  `Nonton ${judul} gratis di DramaKu — langsung diputar tanpa unduh.`;

export async function generateMetadata(
  props: PageProps<"/tonton/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const video = await cariVideo(id);
  if (!video) return { title: "Video tidak ditemukan" };

  const title = `Nonton ${video.title}`;
  const description = keteranganVideo(video.title);
  const path = `/tonton/${id}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "video.other",
      title,
      description,
      url: `${SITE_URL}${path}`,
      // Gambar pratinjau share memakai ALAMAT TETAP milik kita, bukan alamat
      // sampul apa adanya: alamat dari penyedia bertanda tangan dan mati
      // setelah 6 jam, sehingga tautan yang dikirim pagi lalu dibuka malam
      // kehilangan gambarnya (lib/tonton.ts `alamatGambarVideo`).
      //
      // Kosong = field-nya TIDAK ditulis, bukan diisi gambar cadangan yang
      // tidak ada hubungannya — pratinjau yang salah lebih menyesatkan
      // daripada tanpa pratinjau.
      ...(video.thumbnail
        ? {
            images: [
              {
                url: absoluteUrl(alamatGambarVideo(video.id)),
                alt: video.title,
              },
            ],
          }
        : {}),
    },
  };
}

export default async function TontonPage(props: PageProps<"/tonton/[id]">) {
  const { id } = await props.params;
  const video = await cariVideo(id);
  if (!video) notFound();

  // Metadata IMDb dibaca LANGSUNG di sini, bukan lewat `PlaylyVideoPublik`.
  // Alasannya: bentuk kartu itu dipakai 5 berkas tampilan lain, dan melebarkannya
  // demi sinopsis + kredit berarti kelimanya harus ikut dipikirkan ulang padahal
  // tak satu pun membutuhkannya (alasan yang sama sudah ditulis di
  // lib/playly-gabungan.ts:63-65). Halaman detail yang butuh data detail, jadi
  // halaman ini yang mengambilnya. Pembacaannya ber-cache, jadi tidak menambah
  // beban — dan gagal baca TIDAK boleh mematikan halaman: pemutarnya yang utama.
  const meta = await getPlaylyImdbCached()
    .then((peta) => peta[video.id])
    .catch(() => undefined);

  /**
   * "Film Terkait" (owner 2026-10-29). Sumbernya daftar VIDEO, bukan katalog
   * drama — di halaman ini penonton sedang menonton film Playly, jadi
   * menawarkan judul drama sebagai "terkait" akan membawanya ke jenis halaman
   * yang berbeda tanpa aba-aba.
   *
   * Daftarnya ber-cache dan SUDAH dibaca `cariVideo()` di atas, jadi
   * pemanggilan ini tidak menambah pembacaan ke sumber luar.
   */
  const { videos: semuaVideo } = await getPlaylyVideosGabunganCached();
  const semuaTerkait = pilihTerkait(
    semuaVideo,
    { id: video.id, label: [video.kategori, video.genre].filter(Boolean).join(", ") },
    (v) => ({
      id: v.id,
      label: [v.kategori, v.genre].filter(Boolean).join(", "),
    }),
    TERKAIT_SIDEBAR,
  ).map((v) => ({
    id: v.id,
    judul: v.title,
    href: `/tonton/${encodeURIComponent(v.id)}`,
    gambar: v.thumbnail ?? null,
    keterangan: [v.kategori ?? v.genre].filter(Boolean).join(", "),
    // Baris ketiga di kolom sempit. Durasi dipilih karena katalog video tidak
    // punya angka "ditonton" seperti katalog drama.
    jejak: v.durationLabel !== "-" ? v.durationLabel : undefined,
  }));

  const terkaitSidebar = semuaTerkait;

  return (
    /* LATAR TERANG (owner 2026-10-29) — sama dengan /drama/[id]. `bg-zinc-100`
       menimpa `bg-black` yang diwarisi dari app/layout.tsx. */
    /* `pb-16` DILEPAS 2026-10-29: sejak kaki situs gelap jadi anak terakhir,
       padding di pembungkus menyisakan pita abu-abu di BAWAH footer — halaman
       terlihat seperti belum selesai dimuat. Jarak isi ke footer sudah
       ditangani `pb-8` di kartu putihnya. */
    <main className="min-h-screen bg-zinc-100">
      {/* Kepala situs yang SAMA dengan Home (owner 2026-10-29) — bar cari
          merah-pink + strip kuning, bukan navbar hitam. Dipasang sebagai anak
          PERTAMA <main> dan DI LUAR pembatas isi di bawahnya, supaya barnya
          membentang selebar layar persis seperti di /beranda. */}
      <KepalaFilm />
      {/* Dua kolom di layar lebar; sidebar turun ke bawah di layar sempit.
          `minmax(0,1fr)` — bukan `1fr` — supaya judul panjang tak mendorong
          kolom melebar. Alasan lengkapnya ditulis di app/drama/[id]/page.tsx. */}
      {/* ===== BINGKAI PEMUTAR — pemutar + "Film Terkait" dalam SATU kotak
             gelap, tinggi sama (owner 2026-10-29: *"aku mau film yang diputar
             jadi satu bingkai dengan film terkait"*, mencontoh situs
             pembanding).

             Kuncinya ada di dua hal yang harus berpasangan:
               • grid dua kolom dengan tinggi baris ditentukan PEMUTAR
                 (`aspect-video`), dan
               • panel kanan `lg:h-full` + `lg:overflow-y-auto` di daftarnya,
                 sehingga daftar sepanjang apa pun mengunci diri pada tinggi
                 pemutar dan digulung SENDIRI — persis scrollbar yang owner
                 tandai di tangkapan layarnya.

             Melepas salah satunya membuat bingkai ikut memanjang mengikuti
             daftar, dan pemutar terlihat mengambang di kotak yang kebesaran. */}
      <div className="mx-auto max-w-7xl px-0 pt-4 md:px-6">
        <div className="overflow-hidden bg-black shadow-lg shadow-black/30 md:rounded-xl">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0">
              <PlaylyPlayer
                videoId={video.id}
                title={video.title}
                poster={video.thumbnail}
              />
            </div>

            {/* ⚠️ `lg:absolute lg:inset-0` — INILAH yang membuat daftarnya
                benar-benar bisa digulung, dan tanpa itu panel ini "stuck"
                (owner 2026-10-29).

                Sebabnya: grid menyetel tinggi baris mengikuti item TERTINGGI.
                Selama panel adalah item biasa, daftar yang panjang justru
                MEMANJANGKAN barisnya — tingginya tak pernah terlampaui,
                sehingga `overflow-y-auto` tak punya apa pun untuk digulung dan
                pemutar ikut terseret jadi kotak kebesaran.

                Elemen `absolute` dikeluarkan dari perhitungan tinggi baris.
                Jadi baris ditentukan MURNI oleh pemutar (`aspect-video`), dan
                panel mengisi tinggi itu persis — daftar sepanjang apa pun
                digulung di dalamnya.

                `lg:` saja: di layar sempit panel turun ke bawah pemutar dan
                harus mengalir normal. `absolute` di sana akan menumpuknya di
                atas pemutar.

                `lg:border-l` saja, bukan border penuh: di layar sempit garis di
                kiri tak berarti apa-apa. */}
            <div className="relative min-h-0 border-zinc-800 lg:border-l">
              <div className="flex flex-col lg:absolute lg:inset-0">
                <PanelFilm
                  judul="Film Terkait"
                  items={terkaitSidebar}
                  gelap
                  gulung
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dua kolom di layar lebar; kolom kanan turun ke bawah di layar sempit.
          `minmax(0,1fr)` — bukan `1fr` — supaya judul panjang tak mendorong
          kolom melebar. Alasan lengkapnya ditulis di app/drama/[id]/page.tsx. */}
      <div className="mx-auto max-w-7xl px-0 py-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 bg-white px-4 pb-8 pt-5 shadow-sm md:rounded-xl md:px-6">
        <Link
          href="/beranda"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-rose-600"
        >
          <ChevronLeft className="size-4" />
          Kembali ke beranda
        </Link>

        {/* BLOK JUDUL — judul, keterangan, genre, lalu tombol, menyatu
            sebagai SATU tumpukan (owner 2026-10-29: tampilan lama *"terkesan
            kaku"*).

            Yang berubah HANYA susunannya, tidak ada isi yang dibuang:
              • kotak putih berbingkai `max-w-sm` dilepas — ia kotak sempit
                yang terjepit di tengah kolom lebar, terbaca seperti potongan
                dari halaman lain;
              • judul di DALAM kotak berhenti digambar, sebab <h1> di bawah ini
                sudah memuat judul yang sama persis. Itu membuang DUPLIKAT;
              • keterangan & genre naik merapat ke judul, tombol turun sedikit
                — jadi mata membaca "judul → keterangan → aksi" sekali jalan. */}
        <h1 className="mt-4 text-2xl font-bold text-zinc-900 md:text-3xl">
          {video.title}
        </h1>

        <div className="mt-2">
          <InfoVideoPlayly
            tataLetak="halaman"
            title={video.title}
            contentRating={video.contentRating}
            quality={video.quality}
            durationLabel={video.durationLabel}
            genre={video.kategori ?? video.genre}
            // Sampai 2026-10-05 baris ini TIDAK ada, sehingga tombol DOWNLOAD
            // di halaman detail tak pernah bisa membuka link apa pun walau
            // linknya sudah diisi — dijaga tests/tonton-halaman.test.ts.
            linkUnduhan={video.linkUnduhan}
          />
          {video.dramaHref && video.dramaTitle && (
            <p className="mt-3 text-xs text-zinc-500">
              <Link href={video.dramaHref} className="text-rose-700 underline">
                {video.dramaTitle}
                {video.episode ? ` · Episode ${video.episode}` : ""}
              </Link>
            </p>
          )}
        </div>

        {/* Sinopsis + kredit. SENGAJA di luar pembungkus `max-w-sm` di atas:
            kotak sempit itu bentuk pilihan owner untuk keterangan ringkas +
            tombol, sedangkan paragraf sinopsis butuh lebar baca yang wajar.
            Tidak digambar sama sekali kalau videonya belum dicocokkan ke IMDb. */}
        {meta && <DetailFilmPlayly meta={meta} />}

        {/* KOLOM KOMENTAR (owner 2026-10-29). Sampai hari ini halaman ini
            satu-satunya halaman tonton yang TIDAK punya komentar, padahal
            /drama/[id] punya sejak lama.

            `dramaId={video.id}`: komentar disimpan per-kunci, dan kunci video
            ini adalah id-nya sendiri. Jadi komentar di sini berdiri sendiri,
            tidak tercampur dengan komentar halaman drama mana pun — termasuk
            drama yang videonya kebetulan dikaitkan lewat `video.dramaHref`.

            `terang` wajib: halaman ini berlatar putih sejak hari yang sama,
            dan nilai bawaan komponen ini GELAP (ia juga dipakai dua layar
            pemutar yang harus tetap gelap). */}
        <Comments dramaId={video.id} terang />

          </div>

          <PanelPopuler sudahTampil={terkaitSidebar.map((t) => t.id)} />
        </div>
      </div>

      {/* Lihat alasan penempatannya di app/drama/[id]/page.tsx — kaki situs
          sengaja berada DI LUAR grid & kartu supaya membentang penuh. */}
      <KakiFilm
        tentang={{
          judul: `Nonton ${video.title}`,
          teks:
            meta?.synopsis ||
            `Nonton ${video.title} gratis di DramaKu — langsung diputar tanpa unduh, di HP maupun komputer.`,
        }}
      />

      {/* Penanda VIDEO untuk Google — keterangan tersembunyi yang memberi tahu
          mesin pencari bahwa isi halaman ini video, lengkap dengan judul,
          gambar, dan panjangnya. Tanpa ini Google cuma melihat tulisan biasa.

          Ditanam lewat `toJsonLdScript`, BUKAN JSON.stringify polos: judul
          video datang dari pihak luar dan bisa memuat "</script>" yang menutup
          tag lebih awal lalu menyuntikkan HTML (XSS). Fungsi itu meng-escape
          kurung-buka jadi bentuk yang tetap JSON sah.

          Dua field yang Google minta sengaja TIDAK ada (uploadDate &
          contentUrl) — alasannya, dan akibat jujurnya, ditulis lengkap di
          lib/structured-data.ts di atas `videoJsonLd`. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLdScript(
            videoJsonLd(
              {
                ...video,
                // Alamat TETAP, bukan sampul apa adanya: Google menyimpan
                // alamat ini saat memeriksa halaman lalu memakainya
                // berhari-hari kemudian, sedangkan alamat dari penyedia mati
                // dalam 6 jam. Dibuat absolut karena penanda dibaca mesin dari
                // luar situs, yang tak punya acuan alamat relatif.
                thumbnail: video.thumbnail
                  ? absoluteUrl(alamatGambarVideo(video.id))
                  : null,
              },
              `${SITE_URL}/tonton/${id}`,
              keteranganVideo(video.title),
            ),
          ),
        }}
      />
    </main>
  );
}
