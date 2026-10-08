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
  fetchPlaylyVideosKita,
  type PlaylyDetailPublik,
  type PlaylyVideo,
} from "./playly";
import { getAllDramasCached } from "./dramas";
import type { LinkUnduhanPublik } from "./playly-unduhan";
import {
  getPlaylyEmbedsCached,
  getPlaylyGenresCached,
  getPlaylyHiddenIdsCached,
  getPlaylyImdbCached,
} from "./store";
import type { PlaylyImdbMap } from "./playly-imdb";

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
  /**
   * Kategori katalog DramaKu (Action, Romance, …) yang DIPILIH ADMIN untuk
   * video ini — dipakai beranda untuk menaruhnya di baris genre yang tepat.
   *
   * SENGAJA terpisah dari `genre` di atas walau namanya bersaudara, dan
   * perbedaannya penting: `genre` adalah teks bebas dari OMDb yang bisa
   * berisi DAFTAR ("Action, Sci-Fi") dan datang lewat kaitan video->drama,
   * sedangkan yang dibutuhkan baris beranda adalah SATU nilai yang cocok
   * persis dengan `Drama.category`. Menumpuk keduanya di satu field berarti
   * kotak keterangan di bawah pemutar ikut berubah arti tiap kali admin
   * memilih kategori.
   *
   * null = admin belum memilih, dan itu keadaan NORMAL (per 2026-09-26 seluruh
   * 46 video begitu). Videonya tetap tampil di beranda — di baris "Film
   * Terbaru" — cuma belum ikut ke baris genre mana pun.
   */
  kategori: string | null;
  rating: string | null;
  /**
   * Rating usia ("PG-13", "TV-MA", ...) dari OMDb, lewat drama yang dikaitkan.
   * Boleh null dan itu wajar — video yang belum dikaitkan admin ke drama tidak
   * punya sumbernya. Tampilan WAJIB diam saat null: menebak "13+" sendiri sama
   * dengan menjanjikan kelayakan tonton yang tidak pernah dinilai siapa pun.
   */
  contentRating: string | null;
  /**
   * Mutu sumber video ("HD", "WEB-DL", "CAM", ...) dari katalog kita.
   * Aturannya sama dengan lencana poster (lib/types.ts:214-221): null = jangan
   * digambar, JANGAN diisi tebakan "HD".
   */
  quality: string | null;
  /**
   * Link unduhan video INI per provider × kualitas (lib/playly-unduhan.ts).
   * Diisi belakangan di titik gabung kedua sumber video (lib/playly-gabungan.ts),
   * BUKAN di sini: video dari webhook juga berhak punya link, dan menempelkannya
   * di dua tempat = dua aturan yang bisa berbeda diam-diam.
   *
   * OPSIONAL dengan sengaja: tidak ada field = belum ada link, dan popup
   * DOWNLOAD menampilkan "Link unduhan belum tersedia".
   */
  linkUnduhan?: LinkUnduhanPublik[];
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
  contentRating?: string;
  quality?: string;
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
  /**
   * Kategori pilihan admin (videoId -> nama kategori). OPSIONAL dan bawaannya
   * kosong: fitur ini baru ada 2026-09-26, dan bentuk opsional membuat seluruh
   * pemanggil serta tes lama tetap berlaku apa adanya.
   */
  genres: Record<string, string> = {},
  /**
   * Metadata IMDb per video (videoId -> data). OPSIONAL dengan alasan yang
   * sama seperti `genres`: fitur ini baru ada 2026-10-08, dan seluruh pemanggil
   * serta tes lama harus tetap berlaku tanpa diubah.
   */
  imdb: PlaylyImdbMap = {},
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
      // Metadata IMDb video ini MENANG atas data drama yang dikaitkan: ia
      // dipilih admin untuk video INI, sedangkan data drama cuma warisan dari
      // kaitan yang dibuat untuk keperluan lain. Kaitan tetap jadi cadangan,
      // jadi video yang sudah dikaitkan sebelum fitur ini ada tidak kehilangan
      // label apa pun. `|| undefined` dipakai, bukan `??`: field OMDb yang
      // kosong bernilai string kosong (bukan null), dan string kosong harus
      // ikut jatuh ke cadangan — kalau tidak, barisnya tergambar hampa.
      const m = imdb[videoId];
      return {
        dramaTitle: drama?.title ?? null,
        dramaHref: e ? `/drama/${e.dramaId}` : null,
        episode: e?.episode ?? null,
        year: m?.year || drama?.year || null,
        // `genre` berasal dari OMDb dan sering kosong; `category` katalog kita
        // selalu terisi, jadi dipakai sebagai cadangan supaya baris tahun-genre
        // tidak sering separuh hampa.
        genre: m?.genre || drama?.genre || drama?.category || null,
        // Pilihan admin MENANG atas kategori drama yang dikaitkan: admin
        // memilihnya dengan sadar untuk video ini, sedangkan kategori drama
        // cuma warisan dari kaitan yang dibuat untuk keperluan lain. Kalau
        // admin belum memilih, kategori drama dipakai sebagai cadangan supaya
        // video yang sudah dikaitkan tidak perlu diisi ulang dengan tangan.
        kategori: genres[videoId] ?? drama?.category ?? null,
        rating: m?.rating || drama?.imdbRating || null,
        contentRating: m?.contentRating || drama?.contentRating || null,
        // SENGAJA tidak diambil dari IMDb: `quality` adalah mutu SUMBER VIDEO
        // (HD/WEB-DL/CAM) milik katalog kita, bukan sifat filmnya. OMDb tidak
        // tahu berkas mana yang kita simpan, jadi mengisinya dari sana sama
        // dengan menjanjikan mutu yang tak pernah diperiksa siapa pun.
        quality: drama?.quality ?? null,
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
  const [mitra, hiddenIds, embeds, dramas, genres, imdb] = await Promise.all([
    fetchPlaylyVideosKita(),
    getPlaylyHiddenIdsCached().catch(() => [] as string[]),
    getPlaylyEmbedsCached().catch(() => []),
    getAllDramasCached().catch(() => []),
    // Gagal baca = peta kosong, BUKAN halaman gagal: kategori cuma menentukan
    // video ini ikut baris genre atau tidak. Videonya sendiri tetap tampil.
    getPlaylyGenresCached().catch(() => ({}) as Record<string, string>),
    // Alasan sama: metadata IMDb hanya MENAMBAH label pada kartu. Kalau tak
    // terbaca, kartunya tampil seperti sebelum fitur ini ada — bukan gagal.
    getPlaylyImdbCached().catch(() => ({}) as PlaylyImdbMap),
  ]);

  if (mitra.error) {
    return { videos: [], hiddenCount: 0, error: mitra.error };
  }

  const { tampil, labelUntuk } = rakitVideoPublik(
    mitra.videos,
    hiddenIds,
    embeds,
    dramas,
    genres,
    imdb,
  );

  // Sampul sudah IKUT di balasan /api/videos (`seo.thumbnailUrl`, dibaca di
  // normalizePlaylyVideos), jadi halaman ini tidak lagi menanyakannya satu per
  // satu ke /api/public-video. Dulu di sini ada 172 panggilan SERENTAK tiap
  // halaman dibangun ulang; itu membanjiri Playly sampai balasannya lewat batas
  // tunggu 8 detik, dan hasilnya SEMUA poster kosong — persis kebalikan dari
  // tujuan panggilan itu sendiri.
  //
  // KONSEKUENSI YANG DISENGAJA (keputusan owner 2026-10-06): penyaring "berkas
  // videonya belum ada di Playly" ikut hilang dari daftar penonton. Status itu
  // HANYA ada di /api/public-video — /api/videos tidak membawanya (diperiksa 15
  // kemungkinan nama field 2026-10-06; yang terisi penuh cuma `duration`, dan
  // video yang upload-nya putus pun tetap punya durasi, jadi itu bukan penanda).
  //
  // Yang menahan penonton dari layar diam sekarang gerbang pemutar: route
  // app/api/playly/video menanyakan alamat video ke Playly SAAT DIKLIK dan
  // membalas pesan kalau tak ada. Jadi yang hilang perlindungan di DAFTAR, bukan
  // di pemutarnya. Kalau kelak video rusak jadi sering, pasang lagi
  // pemeriksaannya lewat petaBerbatasPlayly + simpan hasilnya di database —
  // JANGAN kembali ke Promise.all atas seluruh daftar.
  const videos = tampil.map<PlaylyVideoPublik>((v) => ({
    ...v,
    // Sampul Playly didahulukan; poster IMDb hanya MENGISI yang kosong, tidak
    // menggantikan yang sudah ada. Alasannya: sampul Playly diambil dari isi
    // videonya sendiri, jadi ia selalu benar untuk video itu — sedangkan poster
    // IMDb bergantung pada kecocokan judul yang bisa meleset. Dalam praktik
    // cabang ini hampir selalu terpakai: diukur 2026-10-08, thumbnail null pada
    // video katalog, sehingga kartunya cuma menampilkan ikon film abu-abu.
    // `|| null` di dalam, bukan `??`: poster yang host-nya tak lolos pagar
    // tersimpan sebagai string KOSONG, dan string kosong harus jadi null —
    // bukan diteruskan sebagai alamat gambar yang pasti gagal dimuat.
    thumbnail: v.thumbnail ?? (imdb[v.id]?.poster || null),
    ...labelUntuk(v.id),
  }));

  return {
    videos,
    hiddenCount: mitra.videos.length - tampil.length,
    error: null,
  };
}
