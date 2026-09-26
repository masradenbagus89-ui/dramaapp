// -------------------------------------------------------------------------
// Satu daftar video Playly dari DUA sumber yang berbeda asal-usulnya.
//
// Sumber 1 — KATALOG (getPlaylyVideosPublik di lib/playly-publik.ts):
//   kita yang MENJEMPUT ke API Playly tiap 300 detik. Isinya video milik akun
//   mitra kita, dan sudah lolos dua saringan penting: video yang disembunyikan
//   admin dibuang, dan video yang berkasnya belum ada di Playly juga dibuang.
//
// Sumber 2 — WEBHOOK (getPublishedPlaylyWebhookVideos* di lib/store.ts):
//   Playly yang MENDORONG ke kita lewat POST /api/webhooks/playly begitu ada
//   video baru. Datanya sampai seketika (tak menunggu siklus jemput), tapi ia
//   cuma potret saat notifikasi tiba — tidak lewat saringan apa pun.
//
// Berkas ini SENGAJA terpisah dari lib/playly-publik.ts. Berkas itu menjawab
// satu pertanyaan saja ("apa isi katalog mitra yang boleh tampil?") dan tetap
// berdiri sendiri supaya aturan katalog bisa diuji tanpa ikut menyeret sumber
// kedua.
//
// DUA PINTU KELUAR, sengaja (lihat keduanya di dasar berkas):
//   getPlaylyVideosGabungan()       — segar, untuk GERBANG IZIN pemutar
//   getPlaylyVideosGabunganCached() — ber-cache, untuk HALAMAN PENONTON
// Sejak 2026-09-18 /playly, /beranda, dan /discover memakai yang Cached. Halaman
// yang memakai pintu segar akan berubah jadi dinamis tanpa peringatan apa pun —
// itu bukan bug Next.js, melainkan akibat langsung dari `no-store`
// (lib/supabase.ts:204).
//
// SERVER-ONLY. Jangan di-import dari komponen "use client".
// -------------------------------------------------------------------------
import { formatDuration } from "./playly";
import { getPlaylyVideosPublik, type PlaylyVideoPublik } from "./playly-publik";
import {
  getPlaylyCadanganCached,
  getPlaylyGenresCached,
  getPlaylyHiddenIdsCached,
  getPublishedPlaylyWebhookVideos,
  getPublishedPlaylyWebhookVideosCached,
  type PlaylyWebhookVideo,
} from "./store";

export type PlaylyGabunganResult = {
  videos: PlaylyVideoPublik[];
  /**
   * true = daftarnya datang dari SALINAN terakhir, bukan dari pengambilan
   * barusan. Halaman boleh memakainya untuk menyebut kesegarannya; yang
   * penting daftarnya tidak kosong saat Playly sedang menolak.
   */
  dariCadangan?: boolean;
  /**
   * null = kedua sumber terbaca. Terisi = ADA sumber yang bermasalah.
   *
   * Perhatikan: terisi TIDAK berarti daftarnya kosong. Halaman hanya memakai
   * nilai ini untuk memilih kalimat saat `videos` kosong — kalau sumber yang
   * satu lagi masih membawa video, yang tampil tetap videonya, bukan pesannya.
   */
  error: string | null;
};

/**
 * Ubah satu baris webhook jadi bentuk kartu yang SUDAH dikenal PlaylyVideoGrid.
 *
 * Arahnya sengaja begini (webhook menyesuaikan diri ke bentuk kartu, bukan
 * bentuk kartu yang dilebarkan): `PlaylyVideoPublik` dipakai 5 berkas tampilan
 * lain (DramaBrowser, CatalogBrowser, HasilPlayly, PlaylyVideoGrid, dan tesnya).
 * Menambah field di sana berarti kelimanya harus ikut dipikirkan ulang, padahal
 * yang berubah cuma asal datanya.
 *
 * Tiga field sengaja null, bukan dikarang:
 * - dramaTitle/dramaHref/episode — kaitan video->drama dibuat admin dari daftar
 *   katalog mitra, jadi video yang HANYA masuk lewat webhook memang belum punya
 *   kaitan yang bisa dibaca.
 * - rating — Playly tidak pernah mengirimnya, di jalur mana pun.
 * - contentRating/quality — keduanya milik KATALOG KITA (rating usia dari OMDb,
 *   mutu sumber video), bukan kiriman Playly. Sumbernya hanya lewat kaitan
 *   video->drama, dan jalur webhook belum punya kaitan itu. Diisi null supaya
 *   kotak keterangan di bawah pemutar DIAM, bukan memajang tebakan.
 */
export function webhookKeKartu(
  v: PlaylyWebhookVideo,
  /**
   * Kategori pilihan admin (videoId -> nama kategori). Opsional supaya
   * pemanggil & tes lama tetap berlaku; kosong berarti video ini belum
   * dipilihkan kategori dan hanya tampil di baris "Film Terbaru".
   */
  genres: Record<string, string> = {},
): PlaylyVideoPublik {
  return {
    id: v.videoId,
    title: v.title,
    durationSeconds: v.durationSeconds,
    // Dihitung ulang di sini, bukan disimpan saat webhook tiba: "12:34" adalah
    // urusan tampilan, dan menyimpannya di database berarti satu data yang sama
    // tersimpan dalam dua bentuk lalu bisa saling berbeda.
    durationLabel: formatDuration(v.durationSeconds),
    // Kartu memakai string kosong sebagai "tidak ada kreator"; null akan
    // tergambar sebagai tulisan "null" di bawah judul pemutar.
    creator: v.creator ?? "",
    embedUrl: v.embedUrl,
    thumbnail: v.thumbnailUrl,
    dramaTitle: null,
    dramaHref: null,
    episode: null,
    // Webhook mengirim tahun sebagai ANGKA (2026), kartu memakai TEKS ("2026").
    // Dibandingkan dengan null secara eksplisit, bukan dengan !v.year, supaya
    // tahun 0 tidak ikut terbuang — kecil kemungkinannya, tapi salahnya senyap.
    year: v.year === null ? null : String(v.year),
    genre: v.genre,
    // SENGAJA hanya dari pilihan admin, BUKAN dari `v.genre` di atas. Genre
    // kiriman Playly adalah teks bebas ("Action, Sci-Fi" / "horror") yang
    // belum tentu sama dengan nama kategori katalog kita, dan memaksakannya
    // jadi kategori akan membuat baris beranda yang isinya tak pernah cocok —
    // rusak yang senyap, sebab tak ada error, cuma baris yang selalu kosong.
    kategori: genres[v.videoId] ?? null,
    rating: null,
    contentRating: null,
    quality: null,
  };
}

/**
 * Gabungkan kedua sumber jadi satu daftar siap tampil.
 *
 * Fungsi MURNI (tanpa jaringan/database) supaya tiga aturan di bawah bisa diuji
 * langsung — ketiganya menentukan video muncul atau hilang dari situs, dan
 * itulah yang paling mahal kalau salah.
 *
 * 1. KATALOG MENANG saat videoId-nya sama. Bukan karena datanya lebih baru,
 *    tapi karena baris katalog SUDAH lolos dua saringan yang tidak dilewati
 *    baris webhook: (a) video yang disembunyikan admin, (b) video yang
 *    berkasnya tak pernah sampai di Playly (upload putus -> penonton dapat
 *    layar hitam). Kalau baris webhook yang menang, video yang sengaja
 *    disembunyikan admin bisa muncul lagi lewat pintu webhook — persis bug yang
 *    sudah pernah lolos ke produksi dan dijaga tests/playly-publik.test.ts.
 *    Kesegaran datanya sendiri hampir tidak jadi soal: katalog ditarik ulang
 *    tiap 300 detik dari sumber yang hidup, sedangkan baris webhook baru
 *    berubah kalau Playly mengirim notifikasi lagi.
 *
 * 2. DAFTAR SEMBUNYI ADMIN BERLAKU UNTUK KEDUA SUMBER. Tanpa aturan ini, admin
 *    menyembunyikan sebuah video -> hilang dari katalog -> lalu muncul lagi
 *    dari webhook. Ruang id-nya sama (dua-duanya id video Playly), jadi satu
 *    daftar sembunyi cukup untuk keduanya.
 *
 * 3. URUTAN: webhook di ATAS, katalog di bawah. Video webhook diurutkan
 *    terbaru-dulu antar sesamanya memakai receivedAt; video katalog
 *    MEMPERTAHANKAN urutan asli dari Playly.
 *
 *    Kenapa dua blok, bukan satu daftar yang diurutkan bersama: PlaylyVideo
 *    (lib/playly.ts) tidak punya field tanggal sama sekali — tidak dikirim
 *    Playly, tidak dibaca parser. Jadi tidak ada angka waktu di sisi katalog
 *    untuk dibandingkan. Memakai receivedAt sebagai pembanding lintas-sumber
 *    pun keliru: artinya "kapan kita menerima notifikasi", bukan "kapan
 *    videonya dibuat", jadi video katalog yang diunggah kemarin akan kalah dari
 *    video webhook yang notifikasinya baru tiba padahal videonya lebih tua.
 *    Dua blok ini jujur: yang punya data waktu diurutkan, yang tidak punya
 *    tidak dikarang-karang.
 */
export function gabungVideoPlayly(
  katalog: PlaylyVideoPublik[],
  webhook: PlaylyWebhookVideo[],
  hiddenIds: string[] = [],
  /** Kategori pilihan admin; hanya dipakai sisi webhook — sisi katalog sudah membawanya sendiri. */
  genres: Record<string, string> = {},
): PlaylyVideoPublik[] {
  const sudahDiKatalog = new Set(katalog.map((v) => v.id));
  const disembunyikan = new Set(hiddenIds);

  const dariWebhook = webhook
    // Saringan status diulang di sini walau pemanggil sudah memakai
    // getPublishedPlaylyWebhookVideos: fungsi ini publik dan murni, jadi cepat
    // atau lambat ada yang mengopernya daftar mentah. Ulangannya satu baris,
    // sedangkan kelalaiannya berarti video yang sudah ditarik Playly tayang.
    .filter((v) => v.status === "published")
    .filter((v) => !disembunyikan.has(v.videoId))
    .filter((v) => !sudahDiKatalog.has(v.videoId))
    // receivedAt selalu ISO UTC (new Date().toISOString() di route webhook),
    // dan pada bentuk itu urutan abjad SAMA dengan urutan waktu. Sengaja tidak
    // memakai Date.parse: nilai rusak akan jadi NaN dan membuat hasil sort tak
    // menentu, sedangkan perbandingan teks selalu memberi urutan yang tetap.
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
    .map((v) => webhookKeKartu(v, genres));

  return [...dariWebhook, ...katalog];
}

/**
 * Ambil kedua sumber lalu gabungkan. Tidak pernah melempar.
 *
 * Kedua pengambilan berjalan BERBARENGAN dan masing-masing punya jaring
 * sendiri: satu sumber mati tidak boleh mengosongkan halaman, karena sumber
 * yang lain masih punya video yang sah untuk ditonton.
 *
 * Cara mengambil daftar webhook DIOPER dari luar, bukan dipilih di sini: dua
 * pemanggilnya butuh jaminan yang berbeda (gerbang izin butuh keadaan MUTAKHIR,
 * halaman penonton butuh pembacaan ber-cache supaya halamannya tetap static),
 * sedangkan aturan penggabungannya persis sama. Satu perakit, dua pintu di
 * bawah — bukan dua salinan yang bisa berbeda diam-diam.
 */
async function rakitGabungan(
  ambilWebhook: () => Promise<PlaylyWebhookVideo[]>,
): Promise<PlaylyGabunganResult> {
  const [katalog, webhook, hiddenIds, genres] = await Promise.all([
    // Sudah menangkap kegagalannya sendiri: mengembalikan daftar kosong +
    // alasan, bukan melempar.
    getPlaylyVideosPublik(),
    ambilWebhook().then(
      (videos) => ({ videos, error: null as string | null }),
      (err: unknown) => {
        // Rinciannya ke log server saja. Halaman penonton tidak menampilkan isi
        // pesan ini, dan keterangan kondisi dalam server bukan urusan pengunjung.
        console.warn(
          `[playly] daftar video webhook tidak terbaca: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        return {
          videos: [] as PlaylyWebhookVideo[],
          error: "Daftar video dari notifikasi Playly tidak bisa dibaca.",
        };
      },
    ),
    // Diambil lagi di sini walau getPlaylyVideosPublik juga mengambilnya:
    // daftar sembunyi harus ikut berlaku untuk sisi webhook (aturan 2 di atas),
    // dan sumbernya ber-cache sehingga panggilan kedua tidak menambah beban.
    getPlaylyHiddenIdsCached().then(
      (ids) => ({ ids, terbaca: true }),
      () => ({ ids: [] as string[], terbaca: false }),
    ),
    // Kategori pilihan admin untuk sisi WEBHOOK (sisi katalog sudah membawanya
    // dari getPlaylyVideosPublik). Gagal baca = peta kosong, bukan halaman
    // gagal: taruhannya cuma "video ini ikut baris genre atau tidak".
    getPlaylyGenresCached().catch(() => ({}) as Record<string, string>),
  ]);

  // GAGAL-AMAN (skills/owasp/SKILL.md §1 A10 "jangan fail-open"): kalau daftar
  // sembunyi TIDAK terbaca, kita tidak tahu video mana yang sengaja disembunyikan
  // admin — maka jalur webhook ditahan seluruhnya, bukan diloloskan. Yang ditahan
  // hanya SUMBER BARU ini; katalog tetap berperilaku seperti sebelumnya
  // (lib/playly-publik.ts sudah memutuskan sendiri untuk lanjut dengan daftar
  // kosong, dan mengubahnya di sini berarti mengubah /beranda + /discover juga).
  //
  // Biayanya nyaris nol dalam praktik: daftar sembunyi dan daftar webhook sama-
  // sama datang dari Supabase, jadi kalau yang satu tak terbaca, yang lain
  // umumnya juga sudah kosong.
  const webhookAman = hiddenIds.terbaca ? webhook.videos : [];

  const videos = gabungVideoPlayly(
    katalog.videos,
    webhookAman,
    hiddenIds.ids,
    genres,
  );
  // Katalog didahulukan karena ia sumber utama halaman ini; kalau dua-duanya
  // bermasalah, satu kalimat sudah cukup untuk pengunjung.
  const error = katalog.error ?? webhook.error;

  // JARING TERAKHIR (insiden 2026-09-26, Playly membalas HTTP 402): kalau
  // pengambilan BERMASALAH dan hasilnya kosong, sajikan salinan terakhir yang
  // pernah berhasil. Tanpa ini, satu gangguan di pihak Playly menghapus
  // SELURUH video dari /beranda, /film, /discover sekaligus, dan tiap halaman
  // tonton membalas 404 — terukur hari itu.
  //
  // Dua syarat, dan keduanya wajib:
  //   - `error` terisi → jangan pakai salinan saat pengambilannya BERHASIL
  //     tapi memang belum ada video (mis. akun baru). Salinan yang menimpa
  //     keadaan sah "belum ada video" akan menghidupkan kembali video yang
  //     sudah sengaja ditarik.
  //   - daftarnya kosong → kalau satu sumber masih membawa video, itu yang
  //     dipakai; salinan tidak boleh menggeser data yang lebih baru.
  if (error && videos.length === 0) {
    const cadangan = await getPlaylyCadanganCached<PlaylyVideoPublik>().catch(
      () => null,
    );
    if (cadangan && cadangan.videos.length > 0) {
      // Daftar sembunyi admin TETAP berlaku atas salinan — kalau tidak, video
      // yang sengaja disembunyikan bisa muncul lagi lewat pintu ini. Aturan
      // yang sama dengan jalur webhook di `gabungVideoPlayly`.
      const disembunyikan = new Set(hiddenIds.ids);
      const aman = hiddenIds.terbaca
        ? cadangan.videos.filter((v) => !disembunyikan.has(v.id))
        : [];
      if (aman.length > 0) {
        console.warn(
          `[playly] memakai salinan ${aman.length} video (disimpan ${cadangan.disimpanPada}) — pengambilan gagal: ${error}`,
        );
        return { videos: aman, error, dariCadangan: true };
      }
    }
  }

  return { videos, error };
}

/**
 * Untuk jalur yang butuh keadaan MUTAKHIR — gerbang izin pemutar
 * (app/api/playly/video/route.ts). Sengaja TANPA cache: gerbang itu memutuskan
 * sebuah video boleh diputar atau tidak, dan daftar izin yang boleh basi berarti
 * video yang baru disembunyikan admin masih bisa ditonton sampai cache habis.
 */
export async function getPlaylyVideosGabungan(): Promise<PlaylyGabunganResult> {
  return rakitGabungan(getPublishedPlaylyWebhookVideos);
}

/**
 * Untuk HALAMAN PENONTON (/playly, /beranda, /discover).
 *
 * WAJIB versi ini, bukan yang di atas: satu pembacaan tanpa cache membuat
 * SELURUH halaman pemanggilnya jadi dinamis (lib/supabase.ts:204) — dibangun
 * ulang untuk tiap pengunjung, dan ikut mati begitu Supabase tidak menjawab.
 * Itu yang menimpa /playly sampai 2026-09-18; /beranda & /discover selamat di
 * insiden 2026-09-16 justru karena seluruh pembacaannya ber-cache.
 *
 * Ongkosnya, dan ini disetujui owner: video baru dari webhook muncul paling
 * lambat 60 detik sesudah notifikasinya tiba, tidak lagi seketika.
 */
export async function getPlaylyVideosGabunganCached(): Promise<PlaylyGabunganResult> {
  return rakitGabungan(getPublishedPlaylyWebhookVideosCached);
}
