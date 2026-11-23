import type { Metadata } from "next";
import { getAllDramasCachedSafe } from "@/lib/dramas";
import { TAB_GRID_ITEMS } from "@/lib/tab-katalog";
import { MAKS_SERIES_PLAYLY_DI_SEKSI, pisahFilmSeries } from "@/lib/jenis-video";
import { getPlaylyVideosGabunganCached } from "@/lib/playly-gabungan";
import { bungkusVideo } from "@/lib/beranda-video";
import { siapkanTampilanDepan } from "@/lib/baris-atas";
import { availableGenres, FEATURED_ROW_COUNT } from "@/lib/beranda-catalog";
import { buildNavMenus } from "@/lib/nav-katalog";
import { rakitIndeksSaran } from "@/lib/saran-cari";
import BadanKatalog from "../components/beranda/BadanKatalog";
import KepalaBeranda from "../components/beranda/KepalaBeranda";
import PersonalRows from "../components/beranda/PersonalRows";
import PanelLipat from "../components/beranda/PanelLipat";
import { BADAN_SITUS } from "../components/beranda/shell";
import { cn } from "@/lib/utils";

// Disimpan & dipakai ulang, disegarkan tiap 60 detik (menggantikan force-dynamic
// yang membangun ulang halaman untuk tiap pengunjung).
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Beranda — Nonton Drama China Terbaru",
  description:
    "Katalog lengkap drama China DramaKu: cari judul, saring per genre, dan telusuri halaman demi halaman. Lanjutkan tontonan terakhir kamu — semuanya gratis.",
  alternates: { canonical: "/beranda" },
};

export default async function BerandaPage() {
  const dramas = await getAllDramasCachedSafe();

  // Video Playly untuk bagian hasil pencarian di bawah grid (owner 2026-09-12).
  // Judul seperti "Beyond The Last Signal" ada di sini, BUKAN di katalog
  // Supabase — tanpa ini kotak cari membalas "tidak ada yang cocok" untuk video
  // yang jelas-jelas tayang di situs.
  //
  // Sejak 2026-09-18 sumbernya GABUNGAN katalog + webhook, bukan katalog saja —
  // tanpa itu video yang masuk lewat webhook tampil di /playly tapi tidak di
  // sini, dan penonton mengira videonya hilang.
  //
  // WAJIB varian Cached. Aman terhadap revalidate=60 di atas hanya selama
  // SELURUH pembacaannya ber-cache: satu saja pembacaan `no-store` membuat
  // halaman ini dibangun ulang untuk tiap pengunjung dan ikut mati saat Supabase
  // tak menjawab (lib/supabase.ts:204). Buktinya bukan baris ini, melainkan
  // kolom Static/Dynamic di keluaran `npm run build`.
  const { videos } = await getPlaylyVideosGabunganCached();
  // Dipisah DULU, baru dipotong — urutannya tidak boleh dibalik; alasannya
  // ditulis lengkap di app/page.tsx (seksi Film menyusut sendiri kalau ada
  // serial di deretan teratas).
  const { film, series } = pisahFilmSeries(videos);
  // Sudah terurut TAHUN RILIS sejak dirakit di lib/playly-gabungan.ts; halaman
  // ini sengaja tidak mengurut lagi — alasannya di app/page.tsx.
  // Sama dengan halaman depan. Jangan diurut ulang di halaman ini.
  const { barisAtas, filmDiDepan, seriesSisa, dramaSisa } = siapkanTampilanDepan({
    film,
    series,
    drama: dramas,
    jumlahBaris: FEATURED_ROW_COUNT,
    jumlahFilm: TAB_GRID_ITEMS,
  });
  const heroItems = barisAtas.map((b) => bungkusVideo(b.item));
  const seriesTerbaru = seriesSisa.slice(0, MAKS_SERIES_PLAYLY_DI_SEKSI);
  const genres = availableGenres(dramas);
  // Film ikut dioper — alasan sama dengan halaman depan.
  const menus = buildNavMenus(dramas, videos);

  if (dramas.length === 0 && film.length === 0 && series.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center text-sm text-zinc-500">
        Belum ada tontonan. Tambahkan dari panel admin.
      </div>
    );
  }

  return (
    /* BADAN SITUS TERANG (owner 2026-11-23: *"badan situs ubah jadi putih"*).
       Sampai hari itu pembungkus ini `bg-black` dan hanya BAGIAN BAWAH halaman
       yang terang — lewat `BADAN_SITUS` di dalam `BadanKatalog`.

       Dinaikkan ke tingkat halaman, BUKAN ditambal per-seksi: `tema-terang`
       adalah saklar yang menyalakan varian `terang:` yang SUDAH ditulis di
       tiap komponen katalog (app/globals.css). Jadi baris poster atas ikut
       terang karena `FeaturedRow.tsx:86` memang sudah membawa
       `terang:bg-zinc-100` — nol kelas baru, nol seksi yang bisa tertinggal
       gelap. Kalau ditambal satu per satu, seksi yang terlewat baru ketahuan
       sebagai belang di layar, tanpa satu pun error.

       ⚠️ Kepala situs TIDAK ikut berubah, dan itu disengaja: `SearchBar`,
       `KepalaBeranda`, `PublicTopBars`, dan `NavMenus` nol varian `terang:`
       (diperiksa 2026-11-23), jadi bar merah + strip kuning tetap seperti
       semula. Begitu pula panel menu katalog HP — Radix mem-portal-nya ke
       `<body>`, di LUAR pembungkus ini.

       `BADAN_SITUS` di dalam `BadanKatalog` sengaja DIBIARKAN: ia masih
       dipakai halaman lain yang pembungkusnya belum terang, dan `tema-terang`
       bersarang tidak menimbulkan efek apa pun. */
    <div className={cn("min-h-screen", BADAN_SITUS)}>
      {/* Kepala situs: bar cari + strip genre. Sampai 2026-10-28 ia lahir di
          dalam CatalogBrowser, jadi ikut hilang begitu grid itu dilepas —
          halaman tetap 200 dan build tetap hijau, tapi logo, kotak cari, dan
          SELURUH menu lenyap. Sekarang dipasang terang-terangan di sini. */}
      <KepalaBeranda menus={menus} indeksSaran={rakitIndeksSaran(dramas, videos)} />

      {/* Susunannya SAMA PERSIS dengan landing page `/` (owner 2026-10-28:
          "tampilan beranda sama dengan tampilan di landing page") — dan sama
          karena memakai komponen yang SAMA, bukan susunan yang disalin.

          Yang DIBUANG dari halaman ini saat itu: `CatalogBrowser` (baris kategori
          "Drama Terbaru/Action/Romance/Tycoon" + penomoran halaman) dan deret tab
          yang dulu hanya berfungsi sebagai MENU ke /katalog. Kenapa harus dibuang,
          bukan ditumpuk: begitu isi tab digambar, baris kategori menampilkan
          daftar yang itu-itu juga — persis keluhan owner "ada 2 rekomendasi"
          (2026-09-26). Genre tetap dicapai dari strip kuning, menu atas, dan
          tombol FILTER.

          ⚠️ SLOT IKLAN DI HALAMAN INI TETAP TIDAK ADA (owner 2026-09-08) —
          jangan dikembalikan tanpa perintah baru. */}
      <BadanKatalog
        dramas={dramaSisa}
        heroItems={heroItems}
        filmDiDepan={filmDiDepan}
        seriesTerbaru={seriesTerbaru}
        genres={genres}
        /* WAJIB "/beranda", jangan "/": RedirectIfAuthed memantulkan penonton
           yang sudah login dari "/", sehingga tabnya akan terlihat MATI. */
        basePath="/beranda"
        /* Tanpa kaki situs (owner 2026-10-28: "bagian bawah kamu hapus").
           Kaki itu tetap ada di landing page `/`, tempat pengunjung baru
           mendarat — owner tidak meminta ia dilepas dari sana. */
        denganKaki={false}
        /* Hanya baris "Lanjut Menonton" (keputusan owner 2026-10-28). Dua baris
           personal lain sengaja tidak ikut supaya halaman ini benar-benar sama
           dengan landing page; yang ini tetap karena ia satu-satunya cara
           penonton meneruskan episode yang tertinggal di tengah. */
        /* TERSEMBUNYI sampai diklik (owner 2026-10-29: *"lanjut menonton buat
           seperti itu, disembunyikan — kalau dipisah masih terlihat sama"*).
           Bentuk accordion-nya komponen yang SAMA dengan pintu akun di landing
           page, jadi keduanya tak bisa menyimpang.

           `tanpaJudul`: tombol panelnya sudah bertuliskan "Lanjutkan
           Menonton", jadi judul di dalam barisnya akan jadi kembar. */
        slotAtas={
          <PanelLipat judul="Lanjutkan Menonton">
            <PersonalRows dramas={dramas} hanyaLanjut tanpaJudul />
          </PanelLipat>
        }
      />
    </div>
  );
}
