// -------------------------------------------------------------------------
// ISI MASSAL data video Playly — aturan main "banyak video sekali kirim".
//
// KENAPA ADA (owner 2026-11-11): "sebagian film kan tidak ada di imdb dan saya
// harus isi manual contohnya kualitas, rating dll, kalau diisi satu persatu
// akan makan waktu". Enam kolom isian sudah ada, tapi masing-masing punya
// endpointnya sendiri dan menyimpan SATU video per permintaan. Mengisi 40 film
// berarti ±160 permintaan.
//
// Dua hal yang MEMBUAT jalur massal tidak bisa sekadar "panggil endpoint lama
// berkali-kali" — keduanya kerusakan senyap, bukan error:
//   1. `guardMutation` membatasi 60 permintaan/menit per endpoint per IP
//      (lib/request-guard.ts). Mengisi 100 film = tertolak 429 di tengah jalan,
//      sebagian tersimpan sebagian tidak.
//   2. tiap `setPlaylyVideo*` di lib/store.ts membaca SELURUH dokumen lalu
//      menulisnya kembali. Dipanggil berbarengan, yang belakangan menimpa yang
//      duluan (lost update) — nol error, nilai yang hilang baru ketahuan
//      berhari-hari kemudian.
// Jadi perubahannya dikumpulkan jadi SATU permintaan, dan dokumennya ditulis
// satu kali saja per dokumen.
//
// ⚠️ SATU PERBEDAAN SENGAJA DARI ENDPOINT SATUAN. Di endpoint lama, nilai yang
// tidak terbaca penyaring berarti "kosongkan, kembali ke otomatis" — aman
// untuk satu kotak yang sedang dipandangi orangnya. Di jalur massal itu
// berbahaya: satu salah ketik di antara 40 baris akan MENGHAPUS nilai yang
// sudah benar, dan tak ada yang memandangi baris itu saat terjadi. Di sini
// kotak KOSONG (= "kembali ke otomatis") dibedakan dari kotak BERISI TAPI TAK
// TERBACA (= ditolak + dilaporkan ke layar).
//
// Semua fungsi MURNI (tanpa jaringan/DOM) supaya aturannya bisa diuji di
// tests/isian-massal-video.test.ts.
// -------------------------------------------------------------------------
import { parseJenisVideo, type JenisVideo } from "./jenis-video";
import { parseRatingManual } from "./rating-video";
import { parseTahunManual, parseDurasiManual } from "./meta-video-manual";
import { parseDramaQuality, parseKategoriVideo } from "./types";

/**
 * Batas jumlah video dalam satu permintaan.
 *
 * Katalognya 489 video per 2026-11-11, dan owner bisa saja mencentang semuanya
 * lalu menerapkan satu kualitas. Angkanya diberi ruang di atas itu, tapi tetap
 * BERBATAS: body tanpa batas berarti siapa pun yang punya sesi admin bisa
 * mengirim daftar sejuta baris dan menggantung server.
 */
export const MAKS_VIDEO_PER_KIRIM = 1000;

/** Enam kolom yang bisa diisi massal. Nama ini ikut tampil ke admin. */
export const KOLOM_MASSAL = {
  jenis: "Jenis",
  kategori: "Kategori",
  kualitas: "Kualitas",
  rating: "Rating",
  tahun: "Tahun",
  durasi: "Durasi",
} as const;

export type KolomMassal = keyof typeof KOLOM_MASSAL;

/**
 * Satu baris perubahan sebagaimana DIKIRIM browser.
 *
 * Field yang TIDAK ADA = tidak disentuh. Field bernilai `null`/`""` =
 * dikosongkan (kembali ikut sumber otomatis). Pembedaan ini sama persis dengan
 * endpoint /api/admin/playly/meta, dan alasannya sama: tanpa itu, menyimpan
 * perubahan durasi saja akan ikut menghapus tahun yang sudah benar.
 */
export type KirimanIsian = {
  videoId?: unknown;
} & Partial<Record<KolomMassal, unknown>>;

/** Satu baris perubahan yang SUDAH lolos saring — bentuk yang masuk database. */
export type IsianBersih = {
  videoId: string;
  jenis?: JenisVideo | null;
  kategori?: string | null;
  kualitas?: string | null;
  rating?: string | null;
  tahun?: string | null;
  durasiDetik?: number | null;
};

/** Satu nilai yang DITOLAK penyaring — dilaporkan balik ke layar, tidak dibuang diam-diam. */
export type IsianDitolak = {
  videoId: string;
  kolom: KolomMassal;
  /** Apa yang diketik admin, supaya pesannya bisa menyebutnya. */
  diketik: string;
  alasan: string;
};

export type HasilBaca = {
  bersih: IsianBersih[];
  ditolak: IsianDitolak[];
};

/** Nilai dianggap "kotak dikosongkan" — aksi sah, bukan kesalahan ketik. */
function kosong(nilai: unknown): boolean {
  if (nilai === null || nilai === undefined) return true;
  return typeof nilai === "string" && nilai.trim() === "";
}

/**
 * Saring satu kolom.
 *
 * Memulangkan `undefined` kalau kolomnya tidak dikirim sama sekali (jangan
 * disentuh), `{ nilai: null }` kalau dikosongkan, `{ nilai }` kalau lolos, atau
 * `{ tolak }` kalau ada isinya tapi tidak terbaca.
 */
function saringKolom<T>(
  nilai: unknown,
  parse: (v: unknown) => T | null | undefined,
  alasan: string,
): { nilai: T | null } | { tolak: string } | undefined {
  if (nilai === undefined) return undefined;
  if (kosong(nilai)) return { nilai: null };
  const hasil = parse(nilai);
  // `undefined` dipakai parseDramaQuality, `null` oleh penyaring lain — dua
  // ejaan "tidak sah" yang sama artinya, disamakan di sini sekali saja.
  if (hasil === null || hasil === undefined) return { tolak: alasan };
  return { nilai: hasil };
}

/**
 * Potongan maksimum ketikan yang ikut dilaporkan balik ke layar.
 *
 * Dipotong karena teks itu DIGAMBAR di panel admin: tanpa batas, satu kiriman
 * berisi teks 1 MB akan membuat layar admin menggambar 1 MB teks di dalam satu
 * pesan kesalahan.
 */
const BATAS_TEKS_LAPORAN = 60;

/**
 * Penyaring tiap kolom + alasan yang dibacakan ke admin kalau ditolak.
 *
 * SATU TABEL, bukan rentetan "if" bertingkat: menambah kolom isian berikutnya cukup
 * menambah satu baris di sini, dan tidak ada cabang yang bisa lupa diperbarui.
 * Penyaringnya DIPAKAI ULANG dari jalur satuan yang sudah teruji — menulis
 * aturan kedua di sini berarti dua aturan yang pasti menyimpang, dan yang
 * menyimpang meloloskan nilai ngawur ke halaman penonton tanpa satu pun error.
 */
const PENYARING: Record<
  KolomMassal,
  { parse: (v: unknown) => unknown; alasan: string }
> = {
  jenis: { parse: parseJenisVideo, alasan: 'harus "film" atau "series"' },
  kategori: { parse: parseKategoriVideo, alasan: "bukan kategori yang dikenal" },
  kualitas: {
    parse: parseDramaQuality,
    alasan: "bukan pilihan kualitas yang dikenal",
  },
  rating: { parse: parseRatingManual, alasan: "harus angka 0-10, mis. 7.4" },
  tahun: { parse: parseTahunManual, alasan: "harus 4 angka, mis. 2024" },
  durasi: {
    parse: parseDurasiManual,
    alasan: 'tidak terbaca — contoh: "1:47:00" atau "95 min"',
  },
};

/** Urutan pemeriksaan kolom. Diambil dari KOLOM_MASSAL supaya mustahil ada
 *  kolom yang punya penyaring tapi tak pernah diperiksa. */
const URUTAN_KOLOM = Object.keys(KOLOM_MASSAL) as KolomMassal[];

/**
 * Terjemahkan body permintaan jadi daftar perubahan yang sah + daftar yang
 * ditolak.
 *
 * Yang ditolak TIDAK menggugurkan baris lain di permintaan yang sama: admin
 * mengisi enam kolom sekaligus, dan membuang lima isian yang benar gara-gara
 * satu salah ketik berarti membuang kerja yang sudah betul. Yang ditolak
 * dilaporkan balik supaya layar bisa menandai baris itu — bukan hilang diam-diam.
 */
export function bacaKirimanMassal(daftar: unknown): HasilBaca {
  const bersih: IsianBersih[] = [];
  const ditolak: IsianDitolak[] = [];
  if (!Array.isArray(daftar)) return { bersih, ditolak };

  // Video yang sama muncul dua kali = kiriman yang rusak; yang terakhir menang,
  // sama seperti perilaku menulis ke peta. Dicatat supaya tidak ada baris ganda
  // di hasil, yang akan membuat hitungan "berapa tersimpan" berbohong.
  const urutan = new Map<string, IsianBersih>();

  for (const baris of daftar.slice(0, MAKS_VIDEO_PER_KIRIM)) {
    if (!baris || typeof baris !== "object") continue;
    const k = baris as KirimanIsian;
    const videoId = String(k.videoId ?? "").trim();
    if (!videoId) continue;

    const entri: IsianBersih = urutan.get(videoId) ?? { videoId };

    for (const nama of URUTAN_KOLOM) {
      const mentah = (k as Record<string, unknown>)[nama];
      const aturan = PENYARING[nama];
      const hasil = saringKolom(mentah, aturan.parse, aturan.alasan);

      if (hasil === undefined) continue;
      if ("tolak" in hasil) {
        ditolak.push({
          videoId,
          kolom: nama,
          diketik: String(mentah ?? "").slice(0, BATAS_TEKS_LAPORAN),
          alasan: hasil.tolak,
        });
        continue;
      }

      // Durasi & jenis ditulis ke field bernama lain, jadi disebut terpisah;
      // empat sisanya sama nama antara kiriman dan simpanan.
      if (nama === "durasi") entri.durasiDetik = hasil.nilai as number | null;
      else if (nama === "jenis") entri.jenis = hasil.nilai as JenisVideo | null;
      else entri[nama] = hasil.nilai as string | null;
    }

    // Baris yang SELURUH kolomnya ditolak tidak punya apa pun untuk disimpan —
    // memasukkannya membuat hitungan "38 video tersimpan" menghitung video yang
    // sebenarnya tidak berubah apa-apa.
    const adaIsi = Object.keys(entri).some((k) => k !== "videoId");
    if (adaIsi) urutan.set(videoId, entri);
  }

  bersih.push(...urutan.values());
  return { bersih, ditolak };
}

/** Kelima dokumen yang disentuh jalur massal, dalam satu bentuk. */
export type PetaIsian = {
  jenis: Record<string, string>;
  kategori: Record<string, string>;
  kualitas: Record<string, string>;
  rating: Record<string, string>;
  meta: Record<string, { tahun?: string; durasiDetik?: number }>;
};

export type HasilTerap = {
  baru: PetaIsian;
  /** Dokumen yang ISINYA benar-benar berubah — hanya ini yang perlu ditulis. */
  berubah: (keyof PetaIsian)[];
};

/**
 * Terapkan daftar perubahan ke kelima peta sekaligus.
 *
 * MURNI: peta masukan tidak disentuh, yang dipulangkan salinan baru. Jadi
 * pemanggil yang gagal menyimpan tidak terlanjur punya peta setengah berubah
 * di memori.
 *
 * `berubah` dihitung dengan membandingkan isi, bukan dengan "ada baris yang
 * menyebut kolom ini": menyimpan nilai yang sama persis dengan yang sudah ada
 * bukan perubahan, dan menulis ulang dokumen tanpa perubahan cuma menambah
 * peluang bentrok dengan admin lain.
 */
export function terapkanIsianMassal(
  lama: PetaIsian,
  perubahan: readonly IsianBersih[],
): HasilTerap {
  const baru: PetaIsian = {
    jenis: { ...lama.jenis },
    kategori: { ...lama.kategori },
    kualitas: { ...lama.kualitas },
    rating: { ...lama.rating },
    meta: { ...lama.meta },
  };

  const pasang = (
    peta: Record<string, string>,
    videoId: string,
    nilai: string | null | undefined,
  ) => {
    if (nilai === undefined) return;
    // Mengosongkan berarti MENGHAPUS kuncinya, bukan menyimpan string kosong —
    // aturan yang sama persis dengan setPlaylyVideoKualitas di lib/store.ts.
    // Entri kosong terbaca pembaca berikutnya sebagai "sudah dikoreksi jadi
    // tanpa label", sehingga turunan otomatis tidak pernah jalan lagi.
    if (nilai) peta[videoId] = nilai;
    else delete peta[videoId];
  };

  for (const p of perubahan) {
    pasang(baru.jenis, p.videoId, p.jenis);
    pasang(baru.kategori, p.videoId, p.kategori);
    pasang(baru.kualitas, p.videoId, p.kualitas);
    pasang(baru.rating, p.videoId, p.rating);

    if (p.tahun !== undefined || p.durasiDetik !== undefined) {
      const entri = { ...(baru.meta[p.videoId] ?? {}) };
      if (p.tahun !== undefined) {
        if (p.tahun) entri.tahun = p.tahun;
        else delete entri.tahun;
      }
      if (p.durasiDetik !== undefined) {
        if (p.durasiDetik) entri.durasiDetik = p.durasiDetik;
        else delete entri.durasiDetik;
      }
      // Entri yang kedua fieldnya habis dibuang seluruhnya, bukan ditinggal
      // sebagai `{}` — alasan sama dengan setPlaylyVideoMetaManual: objek
      // kosong membuat peta ini menumpuk sampah selamanya.
      if (entri.tahun || entri.durasiDetik) baru.meta[p.videoId] = entri;
      else delete baru.meta[p.videoId];
    }
  }

  const berubah = (Object.keys(baru) as (keyof PetaIsian)[]).filter(
    (k) => JSON.stringify(baru[k]) !== JSON.stringify(lama[k]),
  );

  return { baru, berubah };
}

/**
 * Berapa VIDEO yang benar-benar berubah nilainya — angka yang dilaporkan ke
 * admin ("38 video tersimpan").
 *
 * Dihitung dengan membandingkan sebelum & sesudah, BUKAN dari panjang daftar
 * kiriman. Layar mengirim seluruh baris yang disentuh, termasuk yang
 * dikembalikan lagi ke nilai semula; melaporkan panjang daftar berarti
 * mengaku menyimpan sesuatu yang tidak berubah.
 */
export function hitungVideoBerubah(
  lama: PetaIsian,
  baru: PetaIsian,
  perubahan: readonly IsianBersih[],
): number {
  let n = 0;
  for (const p of perubahan) {
    const id = p.videoId;
    const beda =
      lama.jenis[id] !== baru.jenis[id] ||
      lama.kategori[id] !== baru.kategori[id] ||
      lama.kualitas[id] !== baru.kualitas[id] ||
      lama.rating[id] !== baru.rating[id] ||
      JSON.stringify(lama.meta[id] ?? null) !==
        JSON.stringify(baru.meta[id] ?? null);
    if (beda) n++;
  }
  return n;
}

// =====================  KELENGKAPAN ISIAN PER VIDEO  ======================
//
// KENAPA ADA: panel isi cepat hanya berguna kalau ia bisa menunjukkan video
// MANA yang masih kurang. Tanpa itu, owner tetap harus menyisir 489 baris satu
// per satu — persis pekerjaan yang sedang dihapus.
//
// "Kosong" dinilai dari SUDUT PANDANG PENONTON, bukan dari ada-tidaknya entri
// di peta isian manual. Video yang tahunnya datang dari IMDb sudah lengkap
// bagi penonton walau peta manualnya kosong; menghitungnya sebagai "belum
// diisi" membuat daftar pekerjaan berisi ratusan baris yang sebenarnya beres.
//
// Jenis SENGAJA tidak ikut dinilai: bawaannya "film" dan itu nilai yang sah,
// jadi tidak ada keadaan "jenis kosong" yang bisa dikerjakan.

/** Bentuk minimum video yang dibutuhkan penilaian ini — sengaja bukan
 *  PlaylyVideo utuh, supaya fungsi ini bisa diuji tanpa merakit objek besar. */
export type VideoUntukNilai = {
  id: string;
  /** Label durasi dari Playly, "-" kalau Playly tidak mengirimnya. */
  durationLabel?: string;
};

/** Kolom yang dinilai kelengkapannya — jenis tidak termasuk, lihat catatan di atas. */
export type KolomDinilai = "kategori" | "kualitas" | "rating" | "tahun" | "durasi";

export type SumberTampil = {
  kategori: Readonly<Record<string, string | undefined>>;
  /** Kualitas EFEKTIF: isian manual, atau turunan dari link unduhan. */
  kualitasEfektif: (videoId: string) => string | null;
  /** Rating EFEKTIF: isian manual, lalu angka IMDb. */
  ratingEfektif: (videoId: string) => string | null;
  meta: Readonly<Record<string, { tahun?: string; durasiDetik?: number } | undefined>>;
  /** Tahun dari IMDb, dipakai kalau tidak ada tahun ketikan. */
  tahunImdb: Readonly<Record<string, string | undefined>>;
};

/**
 * Kolom mana saja yang masih kosong untuk satu video.
 *
 * Dipulangkan sebagai DAFTAR, bukan boolean "lengkap/tidak": layar memakai
 * daftarnya untuk menandai kotak mana yang perlu disentuh, dan boolean saja
 * memaksa admin menebak yang mana.
 */
export function kolomKosongVideo(
  video: VideoUntukNilai,
  sumber: SumberTampil,
): KolomDinilai[] {
  const kosong: KolomDinilai[] = [];

  if (!(sumber.kategori[video.id] ?? "").trim()) kosong.push("kategori");
  if (!sumber.kualitasEfektif(video.id)) kosong.push("kualitas");
  if (!sumber.ratingEfektif(video.id)) kosong.push("rating");

  const metaVideo = sumber.meta[video.id];
  if (!(metaVideo?.tahun ?? sumber.tahunImdb[video.id] ?? "").trim()) {
    kosong.push("tahun");
  }
  // Playly menulis "-" saat ia tidak punya durasi — bukan string kosong, jadi
  // memeriksa "kosong" saja meloloskan seluruh video yang durasinya tak ada.
  const durasiPlayly = (video.durationLabel ?? "").trim();
  if (!metaVideo?.durasiDetik && (!durasiPlayly || durasiPlayly === "-")) {
    kosong.push("durasi");
  }

  return kosong;
}
