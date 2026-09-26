import { isMovie, type Drama } from "./types";

/**
 * Data terstruktur (JSON-LD) untuk halaman detail drama.
 *
 * PENTING — hanya memakai `imdbRating`/`imdbVotes` dari OMDb, yaitu angka NYATA
 * dari pihak ketiga. Rating penonton DramaKu sengaja TIDAK dipakai di sini:
 * identitas viewer belum aman (lihat BATAS JUJUR di lib/store.ts), dan mengirim
 * rating yang bisa dipalsukan ke Google berisiko penalti.
 *
 * Blok aggregateRating dihilangkan sama sekali kalau datanya tak ada — lebih
 * baik tanpa bintang daripada mengirim angka karangan.
 */
export function dramaJsonLd(drama: Drama, url: string): Record<string, unknown> {
  // Film dan serial punya tipe schema.org yang berbeda. Mengirim "TVSeries"
  // untuk film (apalagi dengan numberOfEpisodes) = memberi Google keterangan
  // yang salah tentang halaman ini.
  const film = isMovie(drama);
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": film ? "Movie" : "TVSeries",
    name: drama.title,
    url,
    description: drama.synopsis,
    ...(film ? {} : { numberOfEpisodes: drama.episodes }),
    inLanguage: "id",
  };

  const image = drama.heroImage || drama.posterImage;
  if (image) data.image = image;
  if (drama.genre) data.genre = drama.genre.split(",").map((g) => g.trim());
  if (drama.year) data.datePublished = drama.year;
  if (drama.director) data.director = { "@type": "Person", name: drama.director };
  if (drama.stars) {
    data.actor = drama.stars.split(",").map((n) => ({
      "@type": "Person",
      name: n.trim(),
    }));
  }

  const rating = Number(drama.imdbRating);
  const votes = Number(String(drama.imdbVotes ?? "").replace(/[^0-9]/g, ""));
  if (Number.isFinite(rating) && rating > 0 && votes > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: rating,
      ratingCount: votes,
      bestRating: 10, // skala IMDb, bukan skala 5 bintang milik DramaKu
      worstRating: 1,
    };
  }

  return data;
}

/**
 * Ubah durasi detik jadi format durasi ISO 8601 ("PT1H31M46S") — satu-satunya
 * bentuk yang dipahami Google untuk field `duration`.
 *
 * Bagian yang nilainya nol DIBUANG (90 detik jadi "PT1M30S", bukan
 * "PT0H1M30S"): keduanya sah, tapi yang pendek itulah yang dicontohkan
 * dokumentasi Google, dan menuliskan nol di mana-mana membuat nilainya sulit
 * dibaca manusia saat menelusuri masalah.
 *
 * Memulangkan null untuk masukan yang tak masuk akal (null, negatif, nol,
 * pecahan tak terhingga) — bukan "PT0S". Durasi nol adalah pernyataan yang
 * SALAH tentang videonya, dan field yang salah lebih merugikan di mata Google
 * daripada field yang tidak ada.
 */
export function durasiIso8601(detikMentah: number | null | undefined): string | null {
  if (typeof detikMentah !== "number" || !Number.isFinite(detikMentah)) return null;
  const total = Math.floor(detikMentah);
  if (total <= 0) return null;

  const jam = Math.floor(total / 3600);
  const menit = Math.floor((total % 3600) / 60);
  const detik = total % 60;

  return `PT${jam ? `${jam}H` : ""}${menit ? `${menit}M` : ""}${detik ? `${detik}S` : ""}`;
}

/** Bentuk video sebatas yang dibutuhkan penanda di bawah. */
export type VideoUntukJsonLd = {
  title: string;
  thumbnail: string | null;
  durationSeconds: number | null;
};

/**
 * Data terstruktur (JSON-LD) untuk halaman tonton satu video.
 *
 * APA ITU: keterangan tersembunyi di dalam halaman yang memberi tahu Google
 * "isi halaman ini VIDEO, judulnya X, gambarnya Y, panjangnya Z". Tanpa itu
 * Google hanya melihat tulisan biasa dan tidak tahu ada video di sana.
 *
 * ⚠️ BATAS JUJUR — dua field yang Google minta SENGAJA TIDAK dikirim, dan itu
 * keputusan sadar, bukan kelalaian:
 *
 *   `uploadDate` — kita TIDAK punya datanya. `PlaylyVideo` (lib/playly.ts:398)
 *   tidak membawa tanggal apa pun, dan satu-satunya angka waktu yang ada
 *   (`receivedAt` di jalur webhook) berarti "kapan notifikasinya tiba pada
 *   kita", bukan kapan videonya diunggah. Mengarang tanggal ke Google adalah
 *   pernyataan palsu yang berisiko penalti — jauh lebih mahal daripada
 *   kehilangan satu field.
 *
 *   `contentUrl`/`embedUrl` — alamat berkas videonya BERTANDA TANGAN dan
 *   berumur ~6 jam (app/api/playly/video/route.ts:64), jadi alamat yang
 *   dikirim hari ini sudah mati besok saat Google mengunjunginya. Alamat
 *   `embedUrl` milik penyedia pun tidak dipakai pemutar kita lagi sejak
 *   2026-09-09, jadi kesahihannya tidak terverifikasi — dan markup yang
 *   menunjuk alamat mati dinilai Google sebagai markup rusak.
 *
 * AKIBATNYA, dan ini harus dikatakan apa adanya ke owner: Google akan
 * mengenali halaman ini sebagai video (masuk tab Video, judul & gambar
 * dikenali), TAPI kartu video besar berikut durasinya di hasil pencarian
 * belum tentu muncul selama kedua field di atas kosong. Cara menutupnya nanti
 * tanpa mengarang: catat tanggal saat sebuah video PERTAMA KALI terlihat oleh
 * situs kita — itu memang arti `uploadDate` menurut schema.org ("diunggah ke
 * situs INI"), dan nilainya jujur karena benar-benar kita amati sendiri.
 */
export function videoJsonLd(
  video: VideoUntukJsonLd,
  url: string,
  description: string,
): Record<string, unknown> {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description,
    url,
    inLanguage: "id",
  };

  // Field yang datanya kosong DIBUANG, bukan diisi nilai kosong — aturan yang
  // sama dengan lencana poster (lib/types.ts:214-221) dan kotak keterangan
  // pemutar: lebih baik diam daripada memajang keterangan yang tak dinilai
  // siapa pun.
  if (video.thumbnail) data.thumbnailUrl = video.thumbnail;
  const durasi = durasiIso8601(video.durationSeconds);
  if (durasi) data.duration = durasi;

  return data;
}

/**
 * Serialisasi aman untuk ditanam di dalam <script>. Tanpa ini, judul drama
 * yang mengandung "</script>" bisa menutup tag lebih awal dan menyuntikkan
 * HTML (XSS). Karakter kurung-buka diganti escape unicode yang tetap valid JSON.
 */
export function toJsonLdScript(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
