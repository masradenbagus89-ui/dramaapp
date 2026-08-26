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
//   - Video TIDAK wajib dikaitkan ke drama. Kaitan lama (playly:embeds) tetap
//     dipakai, tapi hanya sebagai LABEL tambahan ("bagian dari drama X").
//
// SERVER-ONLY. Jangan di-import dari komponen "use client".
// -------------------------------------------------------------------------
import {
  fetchPlaylyThumbnail,
  fetchPlaylyVideosKita,
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
 * Saring + beri label. Fungsi MURNI (tanpa jaringan/database) supaya aturan
 * "video mana yang boleh tampil" bisa diuji langsung — inilah aturan yang paling
 * mahal kalau salah: video yang sudah disembunyikan admin bocor ke penonton.
 */
export function rakitVideoPublik(
  videosMitra: PlaylyVideo[],
  hiddenIds: string[],
  embeds: KaitanRingkas[],
  dramas: { id: string; title: string }[],
): { tampil: PlaylyVideo[]; labelUntuk: (videoId: string) => Omit<PlaylyVideoPublik, keyof PlaylyVideo> } {
  const disembunyikan = new Set(hiddenIds);
  const judulDrama = new Map(dramas.map((d) => [d.id, d.title]));
  // Kaitan yang dramanya sudah dihapus diabaikan, supaya tidak ada label yang
  // menunjuk halaman drama yang tidak ada lagi.
  const kaitan = new Map(
    embeds.filter((e) => judulDrama.has(e.dramaId)).map((e) => [e.videoId, e] as const),
  );

  return {
    tampil: videosMitra.filter((v) => !disembunyikan.has(v.id)),
    labelUntuk: (videoId: string) => {
      const e = kaitan.get(videoId);
      return {
        dramaTitle: e ? (judulDrama.get(e.dramaId) ?? null) : null,
        dramaHref: e ? `/drama/${e.dramaId}` : null,
        episode: e?.episode ?? null,
      };
    },
  };
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

  // Sampul diambil satu panggilan per video karena jalur mitra tidak
  // mengirimkannya. Dijalankan berbarengan (bukan antre) supaya total tunggunya
  // tetap sepanjang SATU panggilan, dan hasilnya ikut tersimpan 5 menit seperti
  // daftar videonya -- jadi ini tidak berubah jadi panggilan per pengunjung.
  const sampul = await Promise.all(
    tampil.map((v) => (v.thumbnail ? Promise.resolve(v.thumbnail) : fetchPlaylyThumbnail(v.id))),
  );

  const videos = tampil.map<PlaylyVideoPublik>((v, i) => ({
    ...v,
    thumbnail: v.thumbnail ?? sampul[i],
    ...labelUntuk(v.id),
  }));

  return {
    videos,
    hiddenCount: mitra.videos.length - tampil.length,
    error: null,
  };
}
