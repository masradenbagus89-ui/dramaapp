// -------------------------------------------------------------------------
// Daftar video Playly SIAP TAMPIL untuk halaman penonton (/playly, /discover).
//
// Berkas ini menjawab satu pertanyaan saja: "video Playly apa yang boleh dilihat
// pengunjung sekarang, dan apa label tiap videonya?" Perakitannya dipisah dari
// lib/playly.ts (yang mengurus kunci + bicara ke API Playly) supaya halaman
// tidak perlu tahu soal kunci, cache, atau bentuk JSON Playly sama sekali.
//
// Aturan tampil (keputusan owner 2026-08-26):
//   - Hanya video milik AKUN MITRA kita. Katalog publik Playly berisi video
//     kreator lain dan sengaja TIDAK dipakai di halaman penonton.
//   - Semua video mitra tampil OTOMATIS; yang disembunyikan admin dibuang.
//   - Video yang BERKASNYA belum ada di Playly (upload putus di tengah, atau
//     filenya dihapus) ikut dibuang. Catatannya tetap terdaftar di Playly, tapi
//     pemutarnya cuma membalas "Video belum tersedia" -- lebih baik tidak
//     ditampilkan sama sekali daripada mengantar penonton ke layar rusak.
//   - Video TIDAK wajib dikaitkan ke drama. Kaitan lama (playly:embeds) tetap
//     dipakai, tapi hanya sebagai LABEL tambahan ("bagian dari drama X").
//
// SERVER-ONLY. Jangan di-import dari komponen "use client".
// -------------------------------------------------------------------------
import {
  fetchPlaylyDetailPublik,
  fetchPlaylyVideosKita,
  type PlaylyDetailPublik,
  type PlaylyVideo,
} from "./playly";
import { getAllDramasCached } from "./dramas";
import { getPlaylyEmbedsCached, getPlaylyHiddenIdsCached } from "./store";

/** Satu video Playly + label drama, kalau admin memang mengaitkannya. */
export type PlaylyVideoPublik = PlaylyVideo & {
  /** Judul drama yang dikaitkan; null kalau video ini berdiri sendiri. */
  dramaTitle: string | null;
  /** Alamat halaman drama terkait; null kalau tidak dikaitkan. */
  dramaHref: string | null;
  episode: number | null;
  /**
   * Tahun rilis, genre, dan rating untuk kartu video.
   *
   * Ketiganya TIDAK dikirim Playly (lihat `PlaylyVideo` di lib/playly.ts —
   * isinya cuma judul, durasi, kreator, embed, sampul). Satu-satunya sumbernya
   * adalah katalog drama kita sendiri, lewat kaitan video->drama yang dibuat
   * admin. Jadi nilainya null untuk video yang belum dikaitkan, dan kartu
   * menyembunyikan barisnya — bukan menampilkan kotak kosong.
   */
  year: string | null;
  genre: string | null;
  rating: string | null;
};

export type PlaylyPublikResult = {
  videos: PlaylyVideoPublik[];
  /** Jumlah video yang disembunyikan admin — dipakai halaman admin, bukan penonton. */
  hiddenCount: number;
  /**
   * null = pengambilan berhasil (daftar kosong berarti memang belum ada video).
   * Terisi = Playly bermasalah. Membedakan keduanya penting: "belum ada video"
   * dan "gagal menghubungi Playly" butuh kalimat yang berbeda di layar.
   */
  error: string | null;
};

/** Kaitan video->drama, sebatas yang dibutuhkan perakit di bawah. */
type KaitanRingkas = { videoId: string; dramaId: string; episode: number | null };

/**
 * Drama sebatas kolom yang dipakai label kartu. Sengaja BUKAN `Drama` utuh:
 * perakit di bawah tak perlu tahu soal poster, sinopsis, atau harga koin, dan
 * bentuk sempit begini membuat tesnya bisa memakai data contoh seadanya.
 */
type DramaRingkas = {
  id: string;
  title: string;
  year?: string;
  genre?: string;
  imdbRating?: string;
  category?: string;
};

/**
 * Saring + beri label. Fungsi MURNI (tanpa jaringan/database) supaya aturan
 * "video mana yang boleh tampil" bisa diuji langsung — inilah aturan yang paling
 * mahal kalau salah: video yang sudah disembunyikan admin bocor ke penonton.
 */
export function rakitVideoPublik(
  videosMitra: PlaylyVideo[],
  hiddenIds: string[],
  embeds: KaitanRingkas[],
  dramas: DramaRingkas[],
): { tampil: PlaylyVideo[]; labelUntuk: (videoId: string) => Omit<PlaylyVideoPublik, keyof PlaylyVideo> } {
  const disembunyikan = new Set(hiddenIds);
  const dramaById = new Map(dramas.map((d) => [d.id, d] as const));
  // Kaitan yang dramanya sudah dihapus diabaikan, supaya tidak ada label yang
  // menunjuk halaman drama yang tidak ada lagi.
  const kaitan = new Map(
    embeds.filter((e) => dramaById.has(e.dramaId)).map((e) => [e.videoId, e] as const),
  );

  return {
    tampil: videosMitra.filter((v) => !disembunyikan.has(v.id)),
    labelUntuk: (videoId: string) => {
      const e = kaitan.get(videoId);
      const drama = e ? dramaById.get(e.dramaId) : undefined;
      return {
        dramaTitle: drama?.title ?? null,
        dramaHref: e ? `/drama/${e.dramaId}` : null,
        episode: e?.episode ?? null,
        year: drama?.year ?? null,
        // `genre` berasal dari OMDb dan sering kosong; `category` katalog kita
        // selalu terisi, jadi dipakai sebagai cadangan supaya baris tahun-genre
        // tidak sering separuh hampa.
        genre: drama?.genre ?? drama?.category ?? null,
        rating: drama?.imdbRating ?? null,
      };
    },
  };
}

/**
 * Video ini boleh ditampilkan ke penonton?
 *
 * Perhatikan tandanya: HANYA `false` (Playly menjawab, dan jawabannya "tidak ada
 * berkas") yang membuat video disembunyikan. `null` berarti pertanyaannya TIDAK
 * TERJAWAB -- Playly mati, timeout, atau bentuk balasannya berubah. Di keadaan
 * itu video tetap ditampilkan: satu gangguan jaringan sesaat tidak boleh
 * mengosongkan seluruh halaman video.
 *
 * Sengaja dipisah jadi fungsi bernama walau isinya satu baris: inilah aturan
 * yang menentukan sebuah video hilang atau tidak dari situs, jadi ia butuh
 * tempat yang bisa diuji langsung.
 */
export function bolehTampilKePenonton(detail: PlaylyDetailPublik | undefined): boolean {
  return detail?.punyaFile !== false;
}

/**
 * Rakit daftar video Playly untuk halaman penonton.
 *
 * Tidak pernah melempar: kegagalan apa pun berubah jadi daftar kosong + alasan,
 * supaya satu gangguan di Playly tidak merusak halaman DramaKu.
 */
export async function getPlaylyVideosPublik(): Promise<PlaylyPublikResult> {
  const [mitra, hiddenIds, embeds, dramas] = await Promise.all([
    fetchPlaylyVideosKita(),
    getPlaylyHiddenIdsCached().catch(() => [] as string[]),
    getPlaylyEmbedsCached().catch(() => []),
    getAllDramasCached().catch(() => []),
  ]);

  if (mitra.error) {
    return { videos: [], hiddenCount: 0, error: mitra.error };
  }

  const { tampil, labelUntuk } = rakitVideoPublik(
    mitra.videos,
    hiddenIds,
    embeds,
    dramas,
  );

  // Detail diambil satu panggilan per video karena jalur mitra tidak mengirim
  // sampul MAUPUN status berkasnya. Dijalankan berbarengan (bukan antre) supaya
  // total tunggunya tetap sepanjang SATU panggilan, dan hasilnya ikut tersimpan
  // 5 menit seperti daftar videonya -- jadi ini tidak berubah jadi panggilan
  // per pengunjung. Yang menyeberang cuma JSON teks, bukan berkas videonya.
  //
  // Sengaja dipanggil untuk SEMUA video, termasuk yang sampulnya sudah ada:
  // status berkas cuma bisa diketahui dari balasan ini.
  const detail = new Map(
    await Promise.all(
      tampil.map(async (v) => [v.id, await fetchPlaylyDetailPublik(v.id)] as const),
    ),
  );

  const siap = tampil.filter((v) => bolehTampilKePenonton(detail.get(v.id)));
  const belumSiap = tampil.length - siap.length;
  if (belumSiap > 0) {
    // Dicatat supaya kalau ada yang bertanya "kok videonya tidak muncul",
    // jawabannya bisa dilacak tanpa menebak.
    console.warn(
      `[playly] ${belumSiap} video tidak ditampilkan: berkasnya belum ada di Playly.`,
    );
  }

  const videos = siap.map<PlaylyVideoPublik>((v) => ({
    ...v,
    thumbnail: v.thumbnail ?? detail.get(v.id)?.thumbnail ?? null,
    ...labelUntuk(v.id),
  }));

  return {
    videos,
    hiddenCount: mitra.videos.length - tampil.length,
    error: null,
  };
}
