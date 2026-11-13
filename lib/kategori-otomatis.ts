// -------------------------------------------------------------------------
// TEBAK KATEGORI DramaKu dari genre IMDb.
//
// KENAPA ADA (owner 2026-11-09): "di video playly sebagian belum ada
// kategorinya bisa kamu buat otomatis agar tidak perlu cek film satu persatu".
// Diukur saat itu: 489 video, hanya 3 yang kategorinya terisi — sedangkan 466
// sudah punya data IMDb lengkap dengan genre. Datanya sudah ada; yang belum
// ada cuma terjemahannya.
//
// NOL permintaan jaringan: genre dibaca dari `playly:imdb` yang SUDAH
// tersimpan. Jadi mengisi 353 kategori tidak memakai satu pun jatah OMDb.
//
// Fungsi MURNI supaya bisa diuji tanpa jaringan — tests/kategori-otomatis.test.ts.
// -------------------------------------------------------------------------
import { KATEGORI_ISI, type Category } from "./types";

export type KategoriIsi = Exclude<Category, "Semua">;

/**
 * Genre IMDb mana yang menjadi kategori DramaKu mana.
 *
 * ⚠️ URUTAN = PRIORITAS, dan ini keputusan rancangan, bukan kerapian. Film
 * sering punya beberapa genre sekaligus ("Action, Romance"), jadi harus ada
 * yang menang. Yang lebih SPESIFIK diperiksa lebih dulu: diukur pada katalog
 * nyata, 279 dari 466 film bergenre Action — kategori yang menampung lebih
 * dari separuh katalog tidak membantu penonton menjelajah, sedangkan Romance
 * (21 film) benar-benar memisahkan.
 *
 * 🪤 TIGA kategori DramaKu sengaja TIDAK ada di sini: **Tycoon**, **Harem**,
 * dan **Time Travel**. Ketiganya lahir untuk drama pendek Cina dan tidak punya
 * padanan genre IMDb mana pun; menebaknya dari "Drama" atau "Sci-Fi" berarti
 * mengarang. Video yang seharusnya masuk situ tetap perlu diisi tangan — dan
 * itu jauh lebih baik daripada 50 judul yang salah kamar.
 *
 * ── DIPERLUAS 2026-11-13, bersama 17 kategori baru di lib/types.ts ──
 *
 * Sampai kemarin peta ini cuma punya 4 baris, dan itu memaksa dua kompromi
 * yang sekarang tidak perlu lagi:
 *
 *   1. "Action" terpaksa menampung Adventure + War + Crime + Thriller
 *      sekaligus — 279 dari 466 film. Kategori yang memuat lebih dari separuh
 *      katalog tidak membantu penonton menjelajah apa pun.
 *   2. Genre terbesar justru dibiarkan kosong karena belum ada kamarnya:
 *      Drama (153 film) dan Horror (82) pulang tanpa kategori.
 *
 * Sekarang tiap genre punya kamarnya sendiri, jadi aturan "yang lebih
 * SPESIFIK menang" di atas kembali jadi urusan sebenarnya: memilih di antara
 * genre ganda ("Action, Romance"), bukan menambal kamar yang tak ada.
 *
 * URUTAN tetap = PRIORITAS. Yang khas & memisahkan ditaruh di atas; "Drama"
 * sengaja hampir PALING BAWAH karena hampir semua film serius ikut menyandang
 * genre itu — menaruhnya di atas akan menyedot hampir seluruh katalog ke satu
 * kamar, persis kesalahan yang baru saja diperbaiki.
 *
 * Genre IMDb yang TETAP tak terpetakan (Short · News · Game-Show · Talk-Show
 * · Reality-TV · Film-Noir · Adult) memang tidak punya kategori di sini, dan
 * itu disengaja — lihat alasannya di lib/types.ts.
 */
export const PETA_GENRE: readonly (readonly [KategoriIsi, readonly string[]])[] = [
  // --- Paling khas: sekali genre ini muncul, hampir pasti itu identitasnya ---
  ["Anime", ["Anime"]],
  ["Documentary", ["Documentary"]],
  // "Music" DIPISAH dari "Musical" 2026-11-13, saat ia jadi kategori sendiri.
  // Keduanya genre IMDb yang berbeda: "Musical" = film yang tokohnya bernyanyi
  // (La La Land), "Music" = film TENTANG musik tanpa harus bernyanyi
  // (Bohemian Rhapsody). Selama menumpang, semua film Music salah kamar.
  ["Musical", ["Musical"]],
  ["Music", ["Music"]],
  ["Game-Show", ["Game-Show"]],
  ["Talk-Show", ["Talk-Show"]],
  ["Reality-TV", ["Reality-TV"]],
  ["Film-Noir", ["Film-Noir"]],
  ["Western", ["Western"]],
  ["Sport", ["Sport"]],
  ["Biography", ["Biography"]],
  ["History", ["History"]],
  ["War", ["War"]],
  ["Animation", ["Animation"]],
  ["Family", ["Family"]],
  // --- Genre inti penonton film ---
  ["Horror", ["Horror"]],
  ["Romance", ["Romance"]],
  ["Comedy", ["Comedy"]],
  ["Fantasy", ["Fantasy"]],
  ["Sci-Fi", ["Sci-Fi"]],
  ["Mystery", ["Mystery"]],
  ["Crime", ["Crime"]],
  ["Thriller", ["Thriller"]],
  ["Adventure", ["Adventure"]],
  ["Action", ["Action"]],
  // --- Jaring terakhir: dipakai hanya kalau tak ada satu pun di atas cocok ---
  ["Drama", ["Drama"]],
  // "Short" SENGAJA paling bawah, di bawah Drama sekalipun. Di IMDb ia bukan
  // genre isi melainkan penanda DURASI, dan hampir selalu datang berpasangan
  // ("Short, Comedy"). Kalau diprioritaskan, seluruh film pendek berakhir di
  // satu rak dan penonton kehilangan genre aslinya. Di posisi ini ia hanya
  // dipakai saat "Short" benar-benar satu-satunya keterangan yang ada.
  ["Short", ["Short"]],
] as const;

/**
 * Pecah teks genre IMDb ("Action, Drama, Western") jadi daftar bersih.
 *
 * Dipisah jadi fungsi sendiri karena bentuk teksnya datang dari layanan luar:
 * spasi ganda, koma menggantung, dan huruf besar-kecil yang tidak konsisten
 * semuanya pernah muncul di data nyata.
 */
export function pecahGenre(teks: string | null | undefined): string[] {
  return (teks ?? "")
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);
}

/**
 * Kategori DramaKu untuk satu video, atau `null` kalau tidak bisa ditentukan.
 *
 * `null` adalah jawaban yang SAH dan sering — 53 dari 489 video nyata berakhir
 * di sini. Mengembalikan kategori "aman" seperti Action untuk semua yang tidak
 * cocok akan menyembunyikan kegagalan itu: tidak ada error, tapi baris
 * "Drama Action" di beranda jadi berisi film dokumenter.
 */
export function tebakKategori(genreTeks: string | null | undefined): KategoriIsi | null {
  const punya = new Set(pecahGenre(genreTeks).map((g) => g.toLowerCase()));
  if (punya.size === 0) return null;

  for (const [kategori, genres] of PETA_GENRE) {
    if (genres.some((g) => punya.has(g.toLowerCase()))) return kategori;
  }
  return null;
}

/** Alasan sebuah video tidak bisa diisi otomatis — dipakai untuk melapor. */
export type AlasanLewat = "sudah-punya" | "tanpa-imdb" | "genre-tak-cocok";

export type UsulKategori = {
  videoId: string;
  judul: string;
  /** Genre IMDb apa adanya, supaya admin bisa menilai tebakannya. */
  genre: string;
  kategori: KategoriIsi;
};

export type HasilTebakan = {
  usul: UsulKategori[];
  lewat: Record<AlasanLewat, number>;
};

/**
 * Susun usulan kategori untuk SEMUA video sekaligus.
 *
 * Video yang kategorinya SUDAH diisi tidak pernah diusulkan ulang — pagar
 * "jangan timpa isian tangan" yang sama dengan pengisian durasi massal. Yang
 * dilewati tetap DIHITUNG dan dilaporkan: "353 dari 489" tanpa keterangan sisa
 * 136-nya ke mana akan terbaca seperti ada yang hilang diam-diam.
 */
export function susunUsulKategori(
  videos: readonly { id: string; title: string }[],
  imdb: Readonly<Record<string, { genre?: string } | undefined>>,
  kategoriSekarang: Readonly<Record<string, string | undefined>>,
): HasilTebakan {
  const usul: UsulKategori[] = [];
  const lewat: Record<AlasanLewat, number> = {
    "sudah-punya": 0,
    "tanpa-imdb": 0,
    "genre-tak-cocok": 0,
  };

  for (const v of videos) {
    const id = String(v.id);
    if (kategoriSekarang[id]) {
      lewat["sudah-punya"]++;
      continue;
    }
    const meta = imdb[id];
    if (!meta) {
      lewat["tanpa-imdb"]++;
      continue;
    }
    const kategori = tebakKategori(meta.genre);
    if (!kategori) {
      lewat["genre-tak-cocok"]++;
      continue;
    }
    usul.push({ videoId: id, judul: v.title, genre: meta.genre ?? "", kategori });
  }

  return { usul, lewat };
}

/**
 * Penjaga: tiap kategori di peta WAJIB ada di daftar kategori resmi.
 *
 * Dipanggil tes, bukan saat jalan. Kalau `CATEGORIES` di lib/types.ts diubah
 * (mis. "Comedy" diganti "Komedi") sementara peta ini tidak, hasil tebakan
 * tersimpan sebagai kategori yang tidak dikenal mana pun — videonya lenyap
 * dari semua baris beranda tanpa satu pun error.
 */
export function kategoriPetaSah(): boolean {
  return PETA_GENRE.every(([kategori]) =>
    (KATEGORI_ISI as readonly string[]).includes(kategori),
  );
}
