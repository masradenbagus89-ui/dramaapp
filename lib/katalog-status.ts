// Penerjemah kondisi katalog drama menjadi ringkasan siap tampil untuk admin.
//
// KENAPA ADA (2026-10-01): situs punya pengaman yang membuat halaman publik
// diam-diam beralih ke berkas cadangan `data/dramas.json` saat database tak
// terjangkau (lib/dramas.ts `getAllDramasCachedSafe`). Pengaman itu benar — ia
// menahan situs supaya tidak mati total. Tapi peralihannya TIDAK MENINGGALKAN
// JEJAK yang bisa dilihat siapa pun: pada 1 Oktober 2026 database Supabase mati
// berjam-jam, /katalog tetap tampil "sehat" dengan 42 judul dari cadangan
// berumur 20 hari, dan tak ada satu pun tanda di layar.
//
// Berkas ini yang mengubah keadaan itu jadi kalimat yang bisa dibaca manusia.
//
// KENAPA dipisah dari komponen: percabangan di sinilah yang menentukan admin
// paham harus berbuat apa (membangunkan database vs tidak ada masalah). Sebagai
// fungsi murni ia bisa diuji tanpa merender React maupun menyalakan server —
// pola yang sama dengan lib/playly-status.ts.

export type StatusKatalog =
  /** Judul yang dilihat penonton datang dari database. Keadaan normal. */
  | "database"
  /** Database tak menjawab; penonton melihat berkas cadangan yang bisa basi. */
  | "cadangan"
  /** Database tak menjawab DAN cadangan kosong — halaman publik melompong. */
  | "kosong"
  /** Server kita sendiri tak terjangkau, jadi keadaannya belum bisa dipastikan. */
  | "tak-diketahui";

export type RingkasanKatalog = {
  status: StatusKatalog;
  /** Berapa judul yang BENAR-BENAR tampil di halaman publik saat ini. */
  jumlahTampil: number;
  pesan: string;
};

/** Angka dari luar tak dipercaya buta: bukan-angka/negatif dianggap 0. */
function angkaAman(nilai: unknown): number {
  return typeof nilai === "number" && Number.isFinite(nilai) && nilai > 0
    ? Math.floor(nilai)
    : 0;
}

/**
 * Ubah kondisi katalog jadi ringkasan siap tampil.
 *
 * `databaseHidup` bernilai `null` berarti "belum bisa dipastikan" — dipakai
 * saat kartu gagal menghubungi server kita sendiri. Dibedakan dari `false`
 * dengan sengaja: melaporkan "database mati" padahal yang putus adalah jalur
 * ke server kita akan mengirim admin memperbaiki hal yang tidak rusak.
 *
 * Aturan gagal-AMAN: apa pun yang tidak jelas-jelas sehat TIDAK dilaporkan
 * sehat. Lebih baik admin memeriksa katalog yang ternyata baik-baik saja
 * daripada mengira baik-baik saja padahal menyajikan data basi.
 */
export function ringkasStatusKatalog(input: {
  databaseHidup: boolean | null;
  jumlahTampil: unknown;
  /**
   * Apakah `jumlahTampil` benar-benar TERUKUR. Bawaan: ya.
   *
   * Bernilai `false` saat keadaan disimpulkan dari endpoint publik /api/dramas
   * — di situ kita tahu database hidup atau mati, tapi TIDAK tahu berapa judul
   * yang sedang dilihat penonton. Dipisahkan dengan sengaja: tanpa ini
   * "belum diukur" akan masuk sebagai angka 0 dan dilaporkan sebagai katalog
   * KOSONG — tuduhan yang jauh lebih menakutkan daripada keadaan sebenarnya.
   */
  jumlahTerukur?: boolean;
}): RingkasanKatalog {
  const terukur = input.jumlahTerukur !== false;
  const jumlahTampil = terukur ? angkaAman(input.jumlahTampil) : 0;

  if (input.databaseHidup === null) {
    return {
      status: "tak-diketahui",
      jumlahTampil: 0,
      pesan:
        "Keadaan katalog belum bisa dipastikan — server situs tidak menjawab. " +
        "Coba muat ulang halaman ini.",
    };
  }

  if (input.databaseHidup) {
    return {
      status: "database",
      jumlahTampil,
      pesan:
        jumlahTampil === 0
          ? "Database menjawab, tapi belum ada satu pun judul di dalamnya."
          : "",
    };
  }

  // Mulai dari sini database tidak menjawab. Yang membedakan ketiga keadaan di
  // bawah adalah apa yang SEBENARNYA dilihat penonton sekarang.

  // Belum diukur (disimpulkan dari endpoint publik). Yang PASTI: halaman publik
  // tidak lagi memakai database. Berapa judul yang tersisa tidak diklaim —
  // mengarang angka di sini persis yang membuat kartu status kehilangan
  // kepercayaan.
  if (!terukur) {
    return {
      status: "cadangan",
      jumlahTampil: 0,
      pesan:
        "Database tidak menjawab, jadi judul yang dilihat penonton sekarang " +
        "diambil dari berkas cadangan di dalam aplikasi — BUKAN data terbaru. " +
        "Situs tetap jalan, tapi isinya bisa tertinggal. Periksa dashboard Supabase.",
    };
  }

  if (jumlahTampil === 0) {
    return {
      status: "kosong",
      jumlahTampil: 0,
      pesan:
        "Database tidak menjawab dan berkas cadangan juga kosong, jadi halaman " +
        "katalog tampil tanpa judul sama sekali. Periksa dashboard Supabase.",
    };
  }

  return {
    status: "cadangan",
    jumlahTampil,
    pesan:
      `Database tidak menjawab. ${jumlahTampil} judul yang sekarang dilihat ` +
      "penonton diambil dari berkas cadangan di dalam aplikasi, BUKAN data " +
      "terbaru — judul yang baru ditambah atau dihapus belum tentu ikut. " +
      "Situs tetap jalan, tapi isinya bisa tertinggal. Periksa dashboard Supabase.",
  };
}
