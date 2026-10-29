// -------------------------------------------------------------------------
// PEMILIH FILM TERKAIT — "RELATED MOVIES" di halaman film (owner 2026-10-29).
//
// Fungsi MURNI (tanpa DOM, tanpa jaringan) supaya bisa diuji di
// tests/film-terkait.test.ts. Tampilannya ada di
// app/components/film/FilmTerkait.tsx — berkas ini hanya memutuskan JUDUL MANA
// yang layak muncul, bukan bagaimana bentuknya.
//
// Dibuat generik DENGAN SENGAJA: halaman `/drama/[id]` memakai katalog Drama,
// sedangkan `/tonton/[id]` memakai daftar video Playly. Keduanya bentuk data
// yang berbeda, tapi aturan "mana yang terkait" PERSIS sama — menulisnya dua
// kali berarti dua aturan yang bisa menyimpang diam-diam.
// -------------------------------------------------------------------------

/** Ciri satu judul, secukupnya untuk menilai kemiripan. */
export type CiriTerkait = {
  /** Pembeda. Judul dengan id yang sama dengan acuan selalu dibuang. */
  id: string;
  /**
   * Kata-kata penciri: genre, kategori, negara — dipisah koma. Boleh kosong.
   * Pemanggil yang menentukan isinya, sebab tiap sumber data menamai
   * kolomnya sendiri-sendiri.
   */
  label: string;
};

/** Pecah "Action, Thriller" jadi himpunan kata yang bisa diadu. */
function kataKunci(label: string): Set<string> {
  return new Set(
    label
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Urutkan `semua` dari yang PALING mirip `acuan`, lalu ambil `jumlah` teratas.
 *
 * ATURAN JUJUR — kenapa daftarnya tetap diisi walau tak ada yang cocok genre:
 * seksi "Film Terkait" yang kosong, atau yang isinya cuma 1 dari 5 petak,
 * terbaca seperti halaman gagal muat. Jadi sisanya diisi judul lain, TAPI yang
 * benar-benar mirip selalu didahulukan. Artinya label "terkait" dibaca sebagai
 * "paling mirip yang kita punya", bukan janji bahwa semuanya segenre.
 *
 * Kalau suatu saat kejujurannya mau diperketat (mis. hanya tampilkan yang
 * skornya > 0), ubah di SATU tempat ini — dan sadari akibatnya: halaman dengan
 * genre langka akan kehilangan seksinya sama sekali.
 *
 * Pengurutannya STABIL: judul berskor sama mempertahankan urutan aslinya
 * (katalog sudah diurut terbaru-dulu), sehingga hasilnya bisa ditebak dan
 * tidak berubah-ubah tiap halaman dibangun ulang.
 */
export function pilihTerkait<T>(
  semua: T[],
  acuan: CiriTerkait,
  ciri: (item: T) => CiriTerkait,
  jumlah: number,
): T[] {
  if (jumlah <= 0) return [];
  const kunciAcuan = kataKunci(acuan.label);

  const berskor = semua
    .map((item, urutan) => ({ item, urutan, c: ciri(item) }))
    // Dirinya sendiri dibuang: menawarkan halaman yang sedang dibuka penonton
    // terbaca seperti tautan rusak.
    .filter((x) => x.c.id !== acuan.id)
    .map((x) => {
      let skor = 0;
      for (const k of kataKunci(x.c.label)) if (kunciAcuan.has(k)) skor++;
      return { ...x, skor };
    });

  berskor.sort((a, b) => b.skor - a.skor || a.urutan - b.urutan);
  return berskor.slice(0, jumlah).map((x) => x.item);
}
