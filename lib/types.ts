// -------------------------------------------------------------------------
// KATEGORI KATALOG.
//
// Diperluas 2026-11-13 (owner: "tambahkan isi kategori karena pilihan genrenya
// sedikit, kamu buat yang lengkap"). Sebelumnya cuma 7 — semuanya lahir untuk
// drama pendek Asia — padahal katalog Playly sekarang mayoritas film Barat
// (Prey, Morbius, Moonfall …), jadi hampir semuanya terpaksa "Tanpa kategori".
//
// Nama tambahannya SENGAJA memakai ejaan genre IMDb persis ("Sci-Fi", bukan
// "SciFi"). Alasannya bukan selera: lib/kategori-otomatis.ts mencocokkan
// kategori dengan genre IMDb yang sudah tersimpan, jadi ejaan yang menyimpang
// membuat pencocokannya meleset DIAM-DIAM — tanpa error, cuma kategori yang
// tak pernah terisi.
//
// Yang sengaja TIDAK dimasukkan: "Adult" (keputusan isi situs, milik owner,
// bukan AI) serta News/Short/Game-Show/Talk-Show/Reality-TV/Film-Noir (bukan
// yang dicari penonton situs film; cuma memanjangkan dropdown).
//
// 🪤 Daftar ini dan `CATEGORIES` di bawah WAJIB sama. Itu bukan sekadar
// kerapian — tapi TypeScript sudah menjaganya: isi array yang bukan anggota
// union ini langsung merah saat typecheck, jadi keduanya mustahil menyimpang.
// -------------------------------------------------------------------------
export type Category =
  | "Semua"
  // --- Kurasi DramaKu (drama pendek Asia; tak punya padanan genre IMDb) ---
  | "Romance"
  | "Tycoon"
  | "Harem"
  | "Time Travel"
  // --- Genre film & serial (ejaan mengikuti IMDb) ---
  | "Action"
  | "Adventure"
  | "Comedy"
  | "Drama"
  | "Fantasy"
  | "Sci-Fi"
  | "Horror"
  | "Thriller"
  | "Mystery"
  | "Crime"
  | "War"
  | "Western"
  | "Animation"
  | "Anime"
  | "Family"
  | "History"
  | "Biography"
  | "Documentary"
  | "Musical"
  | "Sport"
  // --- Enam genre IMDb terakhir (owner 2026-11-13: "buat 30 genre") ---
  // Dipilih owner dari dua tawaran; yang ini menang karena SEMUANYA genre
  // IMDb resmi, jadi tombol "Isi otomatis kategori" bisa mengisinya sendiri.
  // Tawaran yang kalah (Silat/Sekolah/Medis/dll) lebih cocok untuk drama Asia
  // tapi harus diisi tangan selamanya — IMDb tak punya genre itu.
  | "Music"
  | "Film-Noir"
  | "Short"
  | "Reality-TV"
  | "Game-Show"
  | "Talk-Show"
  // ── 37 genre dari daftar owner (2026-11-13, putaran 3) ────────────────
  // Owner mengirim daftar 60 genre bergambar. Yang di bawah ini bagian yang
  // belum ada; sisanya sudah terdaftar di atas.
  //
  // 🪤 Daftar owner TIDAK memuat "Tycoon" dan "Time Travel", tapi keduanya
  // TETAP dipertahankan — bukan kelalaian. Diukur di katalog produksi
  // 2026-11-13: Tycoon dipakai 4 judul, Time Travel 1 judul. Menghapusnya
  // membuat `parseKategoriVideo` menolak nilai tersimpan mereka, dan kelima
  // judul itu kehilangan kategori tanpa satu pun pesan error.
  //
  // "Historical" dari daftar owner sengaja TIDAK ditambahkan sebagai nama
  // baru: ia sudah ada sebagai "History" (ejaan IMDb, dipakai pencocokan
  // otomatis) dengan label Indonesia "Sejarah". Dua kategori yang artinya
  // sama persis cuma membuat owner ragu harus memilih yang mana.
  //
  // Mayoritas nama di bawah TIDAK ada di IMDb (Wuxia, Isekai, Cultivation,
  // Workplace …), jadi tombol "Isi otomatis kategori" tak akan pernah
  // mengisinya — harus dipilih tangan. Itu konsekuensi yang melekat pada
  // daftar ini, bukan sesuatu yang bisa diperbaiki di kode.
  | "Martial Arts"
  | "Melodrama"
  | "Romantic Comedy"
  | "Slice of Life"
  | "Superhero"
  | "Detective"
  | "Gangster"
  | "Revenge"
  | "Cultivation"
  | "Wuxia"
  | "Xianxia"
  | "Xuanhuan"
  | "Isekai"
  | "Historical Romance"
  | "Urban"
  | "Apocalyptic"
  | "Dystopian"
  | "Survival"
  | "Psychological"
  | "Psychological Thriller"
  | "Supernatural"
  | "Mythology"
  | "Military"
  | "Political"
  | "Kids"
  | "School"
  | "Medical"
  | "Legal"
  | "Business"
  | "Workplace"
  | "Teen"
  | "Coming of Age"
  | "Tragedy"
  | "Disaster"
  | "Road Trip"
  | "Espionage"
  | "Dark Fantasy";

/** Jenis tayangan: serial berepisode, atau film 1 video utuh. */
export type DramaKind = "series" | "movie";

/** Status penayangan drama. Nilainya sengaja sama dengan isi kolom DB `status`. */
export type DramaStatus = "Ongoing" | "Completed";

/** Pilihan status untuk form admin — label yang dibaca owner, bukan istilah DB. */
export const DRAMA_STATUS_OPTIONS: { value: DramaStatus; label: string }[] = [
  { value: "Ongoing", label: "Masih tayang (episode masih nambah)" },
  { value: "Completed", label: "Tamat (semua episode sudah lengkap)" },
];

/**
 * SATU tempat yang memutuskan status kiriman sah atau tidak.
 *
 * Dipakai di SERVER: form admin memang cuma menyediakan dua pilihan, tapi UI
 * bukan pagar — siapa pun bisa mengirim body apa saja ke endpoint admin. Nilai
 * di luar dua itu dipulangkan `undefined` (dianggap kosong), bukan disimpan
 * apa adanya — kolom status yang berisi teks ngawur membuat kartu drama
 * memasang label yang tak berarti.
 */
export function parseDramaStatus(value: unknown): DramaStatus | undefined {
  return value === "Ongoing" || value === "Completed" ? value : undefined;
}

/**
 * Kualitas video yang boleh dipajang di lencana kanan-atas poster.
 *
 * Urut dari paling buruk ke paling bagus — itu urutan yang dilihat owner di
 * dropdown panel admin, dan urutan yang dipahami penonton situs streaming
 * (CAM = rekaman bioskop, buram; BluRay/4K = sumber cakram, paling tajam).
 *
 * Daftar ini SUMBER TUNGGAL. Salinannya ada sebagai CHECK constraint di
 * `supabase_migrations/add_quality_to_dramas.sql` — dua tempat ini WAJIB sama;
 * penjaganya `tests/lencana-kartu.test.ts` yang benar-benar membaca berkas SQL
 * itu lalu membandingkannya (bukan sekadar percaya komentar).
 */
export const DRAMA_QUALITY_OPTIONS = [
  "CAM",
  "HDCAM",
  "HD",
  "HDTV",
  "WEB-DL",
  "WEBRip",
  "BluRay",
  "4K",
] as const;

export type DramaQuality = (typeof DRAMA_QUALITY_OPTIONS)[number];

/**
 * SATU tempat yang memutuskan kiriman kualitas sah atau tidak — kembaran
 * `parseDramaStatus` di atas, dan alasannya sama: dropdown admin memang cuma
 * menyediakan 8 pilihan, TAPI UI bukan pagar (siapa pun bisa mengirim body apa
 * saja ke endpoint admin). Nilai di luar daftar dipulangkan `undefined`
 * (dianggap kosong), bukan disimpan apa adanya — poster yang memajang label
 * ngawur lebih merugikan penonton daripada poster tanpa label.
 *
 * Sengaja PERSIS huruf-besarnya: "hd" ditolak, bukan diam-diam dibetulkan jadi
 * "HD". Alasannya CHECK constraint di database juga persis — memperbaiki di
 * sini berarti kode & database punya dua aturan yang menyimpang.
 */
export function parseDramaQuality(value: unknown): DramaQuality | undefined {
  return DRAMA_QUALITY_OPTIONS.find((q) => q === value);
}

// --- Provider unduhan (Google Share / Telegram / Mega / ...) ---------------

/**
 * Warna tombol unduh tiap provider.
 *
 * Sengaja daftar TERTUTUP, bukan teks bebas: nilainya dipakai memilih kelas
 * Tailwind, dan Tailwind memindai KODE (bukan isi database) untuk memutuskan
 * kelas mana yang ikut dibundel. Kelas yang dirakit dari teks sembarang —
 * `bg-${warna}-600` — tidak akan ada di CSS hasil build, jadi tombolnya
 * tergambar tanpa warna sama sekali. Karena itu pemetaan warna -> kelas ditulis
 * utuh di komponennya (app/components/DownloadModal.tsx).
 */
export const DOWNLOAD_BUTTON_COLORS = ["blue", "orange"] as const;

export type DownloadButtonColor = (typeof DOWNLOAD_BUTTON_COLORS)[number];

/**
 * Satu baris pilihan unduhan di modal tombol DOWNLOAD halaman detail.
 *
 * `quality` di sini BEDA arti dari `Drama.quality` di bawah, dan keduanya
 * sengaja tidak disatukan: `Drama.quality` = mutu SUMBER video (CAM/WEB-DL/
 * BluRay — daftar tertutup, dipajang di lencana poster), sedangkan `quality`
 * ini = resolusi berkas yang ditawarkan provider ("1080p", "480p") dan memang
 * teks bebas, karena tiap provider menamainya sendiri-sendiri.
 */
export type DownloadProvider = {
  /** Nama yang dibaca penonton di kolom PROVIDER, mis. "Google Share". */
  name: string;
  /**
   * Tulisan tambahan di tombol, mis. "1080p". Bebas — lihat catatan di atas.
   *
   * `parseDownloadProviders` MEWAJIBKANNYA (baris tanpa kualitas dibuang).
   * Tipenya tetap opsional karena tampilan (`labelTombolProvider`) juga
   * menerima objek yang belum lewat penyaring; yang kosong tergambar
   * "DOWNLOAD" polos, BUKAN tebakan "1080p".
   *
   * Video Playly TIDAK memakai tipe ini sejak 2026-10-05 — lihat
   * lib/playly-unduhan.ts (provider & kualitas daftar tertutup).
   */
  quality?: string;
  /** Alamat EKSTERNAL milik provider. Wajib http/https (lihat `isHttpUrl`). */
  url: string;
  /** Warna tombol. Kosong = biru. */
  buttonColor?: DownloadButtonColor;
  /** Kalimat penjelasan; tergambar jadi banner biru muda di atas tabel. */
  note?: string;
  /** Alamat video tutorial; dipasang sebagai link di dalam banner `note`. */
  tutorialUrl?: string;
};

/**
 * Batas panjang teks yang disimpan. Nama & kualitas pendek karena keduanya
 * duduk di dalam satu baris tabel yang sempit di layar HP; catatan lebih
 * panjang karena memang satu kalimat utuh.
 */
const PROVIDER_NAMA_MAX = 60;
const PROVIDER_CATATAN_MAX = 300;

/**
 * Hanya http/https yang boleh masuk atribut `href`.
 *
 * INI PAGAR KEAMANAN, bukan kerapian. Daftar provider disimpan di dokumen
 * `app_data` yang TIDAK dijaga CHECK constraint database (alasannya di
 * lib/unduhan.ts), jadi isinya diperlakukan sebagai data tak-tepercaya.
 * Alamat berawalan `javascript:` yang lolos ke href berarti kode asing
 * berjalan di halaman penonton (XSS) — kerusakan yang tidak memunculkan error
 * apa pun.
 */
function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function teksSah(value: unknown, maks: number): string {
  return typeof value === "string" ? value.trim().slice(0, maks) : "";
}

/**
 * SATU tempat yang memutuskan daftar provider sah atau tidak — saudara
 * `parseDramaQuality` di atas, dengan alasan yang sama (UI bukan pagar)
 * ditambah alasan keamanan di `isHttpUrl`.
 *
 * Entri yang tidak lengkap DIBUANG, bukan ditambal nilai default: baris
 * provider tanpa alamat sah adalah tombol yang tidak mengunduh apa pun — lebih
 * buruk daripada baris yang tidak ada.
 */
export function parseDownloadProviders(value: unknown): DownloadProvider[] {
  if (!Array.isArray(value)) return [];
  const out: DownloadProvider[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const name = teksSah(r.name, PROVIDER_NAMA_MAX);
    const quality = teksSah(r.quality, PROVIDER_NAMA_MAX);
    if (!name || !quality || !isHttpUrl(r.url)) continue;

    // Kualitas kosong TIDAK disimpan sebagai string kosong: field yang ada tapi
    // hampa memaksa tiap pembaca menulis dua pemeriksaan (`?.` lalu `!== ""`).
    const p: DownloadProvider = { name, url: r.url.trim() };
    if (quality) p.quality = quality;
    const warna = DOWNLOAD_BUTTON_COLORS.find((c) => c === r.buttonColor);
    if (warna) p.buttonColor = warna;
    const note = teksSah(r.note, PROVIDER_CATATAN_MAX);
    if (note) p.note = note;
    if (isHttpUrl(r.tutorialUrl)) p.tutorialUrl = r.tutorialUrl.trim();
    out.push(p);
  }
  return out;
}

export type Drama = {
  id: string;
  title: string;
  category: Exclude<Category, "Semua">;
  episodes: number;
  views: string;
  synopsis: string;
  gradient: string;
  posterImage?: string;
  heroImage?: string;
  heroDim?: boolean;
  exclusive?: boolean;
  /** Kode bahasa subtitle yang tersedia untuk drama ini, mis. ["id", "en"]. */
  subtitles?: string[];
  /**
   * true = drama berbayar (pakai koin untuk buka episode di atas gratis).
   * Drama lama tanpa field ini = GRATIS. Biasanya hanya drama BARU yang di-set
   * premium, supaya koleksi lama tetap bisa ditonton gratis.
   */
  premium?: boolean;
  /**
   * Status penayangan: masih tayang atau sudah tamat. Boleh KOSONG — drama
   * lama belum punya nilai ini, dan tampilan wajib DIAM kalau kosong (jangan
   * menebak "Ongoing"; itu memberi tahu penonton bahwa drama tamat masih
   * berjalan). Lihat parseDramaStatus di bawah.
   */
  status?: DramaStatus;
  /**
   * Jenis tayangan: serial berepisode (default) atau film 1 video utuh.
   * Judul lama tanpa field ini = "series" — itulah sebabnya tandanya "movie"
   * yang eksplisit, bukan tebakan dari `episodes === 1` (serial yang baru
   * punya 1 episode juga bernilai 1, jadi tebakan itu akan salah).
   * Nilainya sengaja sama dengan `OmdbTitleKind` di lib/imdb-tool.ts.
   */
  kind?: DramaKind;
  /**
   * Kualitas sumber video ("CAM", "HD", "WEB-DL", …) — dipajang di lencana
   * kanan-atas poster. Boleh KOSONG, dan itu keadaan normal: kolomnya baru
   * ditambahkan 2026-09-22 dan 41 judul yang sudah ada sengaja dibiarkan kosong
   * (keputusan owner). Kosong = lencananya TIDAK digambar — jangan menebak "HD",
   * sebab itu menjanjikan ketajaman yang belum tentu ada ke penonton.
   * Lihat parseDramaQuality di atas.
   */
  quality?: DramaQuality;
  /**
   * Pilihan unduhan lewat provider LUAR (Google Share, Telegram, Mega, ...)
   * yang dipajang modal tombol DOWNLOAD di halaman detail. Boleh KOSONG, dan
   * itu keadaan normal: drama tanpa daftar ini jatuh ke perilaku lama (unduh
   * langsung satu berkas lewat /api/download), bukan menampilkan modal kosong.
   * Disimpan TERPISAH dari tabel `dramas` — alasannya di lib/unduhan.ts.
   */
  downloadProviders?: DownloadProvider[];
  /** Metadata IMDb (opsional; dari OMDb). Drama lama tanpa field ini = valid. */
  imdbId?: string;
  year?: string;
  contentRating?: string;
  runtime?: string;
  imdbRating?: string;
  imdbVotes?: string;
  /** Genre teks dari OMDb (boleh beda dari `category` katalog DramaKu). */
  genre?: string;
  director?: string;
  writer?: string;
  stars?: string;
  country?: string;
  language?: string;
};

// --- Subtitle / multi-bahasa ---------------------------------------------
// File .vtt disajikan dari folder video yang sama di PC backup, dengan pola
// nama: <drama-id>/<ep>.<kode>.vtt  (mis. "1.id.vtt", "1.en.vtt").
export type SubtitleLang = {
  code: string; // BCP-47, dipakai juga sebagai srcLang & suffix nama file
  label: string; // teks yang tampil di menu pemilih subtitle
};

export const SUBTITLE_LANGS: SubtitleLang[] = [
  { code: "id", label: "Indonesia" },
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "ms", label: "Melayu" },
  { code: "ar", label: "العربية" },
  { code: "es", label: "Español" },
];

export function subtitleLabel(code: string): string {
  return SUBTITLE_LANGS.find((l) => l.code === code)?.label ?? code.toUpperCase();
}

// --- Film vs serial ---------------------------------------------------------

/** Film = 1 berkas video (`1.mp4`), jadi jumlah episodenya selalu ini. */
export const MOVIE_EPISODE_COUNT = 1;

/**
 * Satu-satunya tempat yang memutuskan "ini film atau serial". Semua tampilan
 * (kartu, halaman detail, pemutar, data Google) memanggil ini supaya tidak ada
 * dua aturan yang menyimpang.
 */
export function isMovie(drama: Pick<Drama, "kind">): boolean {
  return drama.kind === "movie";
}

/** Hasil pembacaan aturan jenis tayangan dari data form (lihat `resolveKindRules`). */
export type KindRules = {
  kind: DramaKind;
  /** Jumlah episode final. `null` = angka dari form tidak sah (serial < 1). */
  episodes: number | null;
  /** `undefined` = tidak dikirim → jangan diubah. Film selalu `false` (gratis). */
  premium: boolean | undefined;
};

/**
 * SATU tempat yang menerjemahkan pilihan "Serial / Film" jadi angka & tanda
 * yang disimpan. Murni (tanpa database/jaringan) supaya bisa dites, dan dipakai
 * di SERVER — form admin memang menyembunyikan kolom yang tak berlaku, tapi UI
 * bukan pagar: siapa pun bisa mengirim body apa saja ke endpoint admin.
 *
 * Dua aturan film: (1) selalu 1 video (`1.mp4`), berapa pun isi kolom episode;
 * (2) selalu gratis — aturan koin menggratiskan episode 1..FREE_EPISODES
 * (lib/coins.ts), jadi tanda berbayar pada film cuma akan berbohong.
 */
export function resolveKindRules(body: {
  kind?: unknown;
  episodes?: unknown;
  premium?: unknown;
}): KindRules {
  const kind: DramaKind = body.kind === "movie" ? "movie" : "series";
  if (kind === "movie") {
    return { kind, episodes: MOVIE_EPISODE_COUNT, premium: false };
  }
  const n = Number(body.episodes);
  return {
    kind,
    episodes: Number.isFinite(n) && n >= 1 ? Math.floor(n) : null,
    premium: typeof body.premium === "boolean" ? body.premium : undefined,
  };
}

/**
 * Urutannya = urutan yang dilihat admin di dropdown, dan itu disengaja:
 * kurasi DramaKu dulu (paling sering dipakai owner), baru genre film urut
 * dari yang paling banyak isinya di katalog. Mengurutkannya A-Z akan membuat
 * "Animation" dan "Biography" menempati dua baris teratas padahal nyaris tak
 * pernah dipilih.
 */
export const CATEGORIES: Category[] = [
  "Semua",
  // Kurasi DramaKu
  "Romance",
  "Tycoon",
  "Harem",
  "Time Travel",
  // Genre film & serial
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Sci-Fi",
  "Horror",
  "Thriller",
  "Mystery",
  "Crime",
  "War",
  "Western",
  "Animation",
  "Anime",
  "Family",
  "History",
  "Biography",
  "Documentary",
  "Musical",
  "Music",
  "Sport",
  // Enam terakhir sengaja di DASAR daftar: keenamnya paling jarang dipilih
  // untuk katalog film, jadi menaruhnya di atas cuma memaksa owner menggulung
  // melewatinya tiap kali. Kolom cari di panel admin membuat posisi ini tidak
  // lagi jadi beban — ketik "kui" langsung dapat Kuis.
  // ── Daftar 60 genre kiriman owner (urutannya mengikuti gambarnya) ──
  // Ditaruh setelah kategori lama supaya posisi yang sudah dihafal owner
  // tidak bergeser. Kolom cari membuat urutan tak lagi jadi beban: ketik
  // "wu" langsung dapat Wuxia tanpa menggulung 67 baris.
  "Martial Arts",
  "Melodrama",
  "Romantic Comedy",
  "Slice of Life",
  "Superhero",
  "Detective",
  "Gangster",
  "Revenge",
  "Cultivation",
  "Wuxia",
  "Xianxia",
  "Xuanhuan",
  "Isekai",
  "Historical Romance",
  "Urban",
  "Apocalyptic",
  "Dystopian",
  "Survival",
  "Psychological",
  "Psychological Thriller",
  "Supernatural",
  "Mythology",
  "Military",
  "Political",
  "Kids",
  "School",
  "Medical",
  "Legal",
  "Business",
  "Workplace",
  "Teen",
  "Coming of Age",
  "Tragedy",
  "Disaster",
  "Road Trip",
  "Espionage",
  "Dark Fantasy",
  // Lima di bawah TIDAK ada di daftar owner. Dipertahankan karena baru
  // dipasang beberapa jam sebelumnya di sesi yang sama dan bisa saja sudah
  // dipakai; membuangnya berisiko membuat video yatim tanpa gejala.
  "Film-Noir",
  "Short",
  "Reality-TV",
  "Game-Show",
  "Talk-Show",
];

/**
 * Kategori NYATA — `CATEGORIES` tanpa "Semua".
 *
 * "Semua" bukan kategori melainkan pilihan penyaring yang berarti "jangan
 * saring apa pun". Menyimpannya sebagai kategori sebuah judul akan membuat
 * baris beranda bernama "Drama Semua" yang tak berarti apa-apa.
 *
 * Diturunkan dari `CATEGORIES`, bukan diketik ulang: dua daftar yang harus
 * sama persis pasti menyimpang cepat atau lambat.
 */
export const KATEGORI_ISI = CATEGORIES.filter(
  (c): c is Exclude<Category, "Semua"> => c !== "Semua",
);

/**
 * SATU tempat yang memutuskan kategori kiriman sah atau tidak.
 *
 * Dipakai di SERVER. Panel admin memang cuma menyediakan pilihan yang benar,
 * tapi UI bukan pagar — siapa pun bisa mengirim body apa saja ke endpoint
 * admin. Nilai di luar daftar dipulangkan `null` (dianggap "kosongkan"), bukan
 * disimpan apa adanya: kategori berisi teks ngawur tidak cocok dengan baris
 * genre mana pun, jadi videonya diam-diam berhenti muncul di sana tanpa satu
 * pun error yang memberi tahu.
 *
 * Bentuknya sengaja sama dengan `parseDramaStatus` di atas.
 */
export function parseKategoriVideo(
  value: unknown,
): Exclude<Category, "Semua"> | null {
  const teks = typeof value === "string" ? value.trim() : "";
  return KATEGORI_ISI.find((c) => c === teks) ?? null;
}
