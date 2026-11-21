// -------------------------------------------------------------------------
// "HARI INI SIAPA SAJA YANG UPLOAD, DAN BERAPA BANYAK" — aturan hitungnya.
//
// KENAPA ADA (owner 2026-11-21): panel IMDb memajang ratusan judul beserta
// nama pengunggahnya, tapi tidak ada satu pun cara melihat siapa yang bekerja
// hari ini. Satu-satunya jalan adalah menggulung seluruh daftar sambil
// mengingat nama — pekerjaan yang mustahil dilakukan dengan benar.
//
// SEMUA FUNGSI DI SINI MURNI: nol impor Node, nol DOM, nol jaringan. Dua
// sebabnya: (a) dipakai komponen "use client", dan satu impor modul server
// saja membuat `npm run build` gagal (peringatan yang sama ada di
// lib/format.ts); (b) kalau aturannya salah, angka yang salah itu TIDAK
// memunculkan error apa pun — owner cuma melihat "tbchairulm 3" padahal 14.
// Fungsi murni bisa diuji langsung di tests/upload-harian.test.ts.
//
// 🪤 SATU-SATUNYA zona waktu yang dipakai adalah WIB, DIPAKU, bukan zona mesin
// yang kebetulan merender. Komponen pemakainya dirender di server (Railway =
// UTC) DAN di browser owner (WIB). Dengan zona mesin, video yang diunggah
// pukul 06.00 WIB tanggal 21 akan terbaca "20 November" di sisi server —
// jadi angka yang sama tampil berbeda sebelum dan sesudah halaman hidup, dan
// React mengeluh soal hydration. Dipaku = kedua sisi selalu sepakat.
// -------------------------------------------------------------------------

/** Zona waktu yang dipakai seluruh perhitungan di berkas ini. */
export const ZONA_WIB = "Asia/Jakarta";

/** Sebanyak apa "7 hari terakhir" itu — hari ini ikut dihitung sebagai satu hari. */
export const HARI_DALAM_RENTANG_MINGGUAN = 7;

/** Nama yang dipakai saat Playly tidak mengirim nama pengunggahnya. */
export const TANPA_NAMA = "(tanpa nama pengunggah)";

/**
 * Bentuk minimum yang dibutuhkan fungsi-fungsi di sini.
 *
 * Sengaja BUKAN `PlaylyVideo` utuh: aturannya cuma butuh dua field, dan
 * mengikat diri ke tipe besar membuat tesnya harus merakit objek video
 * lengkap (id, embed, thumbnail, durasi) yang tak ada hubungannya dengan apa
 * pun yang dihitung di sini.
 */
export type VideoBertanggal = {
  creator: string;
  /** ISO UTC dari Playly; null/undefined = tanggalnya tidak diketahui. */
  uploadedAt?: string | null;
};

/** Pilihan rentang waktu di panel. */
export type RentangUpload = "hari-ini" | "kemarin" | "7-hari" | "semua";

/** Pilihan yang berlaku saat panel baru dibuka — daftar utuh, persis seperti sebelum fitur ini ada. */
export const RENTANG_BAWAAN: RentangUpload = "semua";

/**
 * Label PENDEK untuk dropdown. Satu tempat supaya kontrol dan kalimat
 * penjelas di layar mustahil menyebut rentang yang sama dengan nama berbeda.
 *
 * 🪤 Sengaja sependek ini (owner 2026-11-21: "bisa kamu jadikan satu agar
 * searchnya bisa sejajar"). Lebar sebuah <select> ditentukan oleh opsi
 * TERPANJANG di dalamnya, bukan oleh yang sedang terpilih — jadi satu kata
 * tambahan di sini melebarkan kontrolnya secara permanen dan mendorong kotak
 * cari turun ke baris berikutnya. "Upload hari ini" sendirian memakan ±45px
 * lebih lebar daripada "Hari ini", dan ikon kalender di sebelahnya sudah
 * mengatakan ini soal waktu.
 */
export const LABEL_RENTANG: Record<RentangUpload, string> = {
  "hari-ini": "Hari ini",
  kemarin: "Kemarin",
  "7-hari": "7 hari",
  semua: "Semua tanggal",
};

/**
 * Bentuk PANJANG untuk dirangkai di dalam kalimat ("belum ada upload di
 * 7 hari terakhir").
 *
 * Dipisah dari LABEL_RENTANG karena keduanya punya tuntutan yang berlawanan:
 * dropdown menuntut sependek mungkin (lihat di atas), kalimat menuntut
 * selengkap mungkin — "belum ada upload di 7 hari" terbaca seperti kalimat
 * yang terpotong. Memaksa satu teks melayani keduanya berarti salah satunya
 * pasti dikorbankan.
 */
export const FRASA_RENTANG: Record<RentangUpload, string> = {
  "hari-ini": "hari ini",
  kemarin: "kemarin",
  "7-hari": "7 hari terakhir",
  semua: "semua tanggal",
};

/** Urutan tombol di layar — dari yang paling sering ditanyakan. */
export const URUTAN_RENTANG: RentangUpload[] = ["hari-ini", "kemarin", "7-hari", "semua"];

const PEMBENTUK_TANGGAL = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_WIB,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Ubah waktu jadi tanggal WIB berbentuk "2026-11-21". Tak terbaca -> null.
 *
 * Bentuk "YYYY-MM-DD" dipilih karena urutan ABJAD-nya sama dengan urutan
 * waktu, jadi perbandingan "lebih baru / lebih lama" cukup `<` dan `>` biasa —
 * tanpa mengubah teks jadi Date lagi, yang justru membuka pintu salah zona.
 * Locale "en-CA" dipakai karena bentuk bakunya memang YYYY-MM-DD; ia TIDAK
 * mengubah bahasa apa pun yang dilihat owner (tampilan dirapikan
 * formatTanggalWIB di bawah).
 */
export function tanggalWIB(nilai: string | number | Date | null | undefined): string | null {
  if (nilai === null || nilai === undefined || nilai === "") return null;
  const t = nilai instanceof Date ? nilai : new Date(nilai);
  if (Number.isNaN(t.getTime())) return null;
  return PEMBENTUK_TANGGAL.format(t);
}

/** Tanggal hari ini menurut WIB. Jam mesin dioper dari luar supaya bisa diuji. */
export function hariIniWIB(sekarang: Date = new Date()): string {
  return PEMBENTUK_TANGGAL.format(sekarang);
}

/**
 * Geser tanggal "YYYY-MM-DD" sekian hari (negatif = mundur).
 *
 * Dihitung di tengah hari UTC, bukan tengah malam: tengah malam persis berada
 * di tepi, dan pembulatan apa pun di sana bisa melompati satu hari. Tengah
 * hari memberi jarak 12 jam ke kedua tepi — cukup untuk zona mana pun.
 */
export function geserHari(tanggal: string, hari: number): string {
  const [y, m, d] = tanggal.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, 12));
  t.setUTCDate(t.getUTCDate() + hari);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(
    t.getUTCDate(),
  ).padStart(2, "0")}`;
}

/**
 * Batas tanggal sebuah rentang: dari `awal` sampai `akhir`, keduanya IKUT.
 * null = tanpa batas (rentang "semua").
 */
export function batasRentang(
  rentang: RentangUpload,
  hariIni: string,
): { awal: string; akhir: string } | null {
  if (rentang === "semua") return null;
  if (rentang === "hari-ini") return { awal: hariIni, akhir: hariIni };
  if (rentang === "kemarin") {
    const kemarin = geserHari(hariIni, -1);
    return { awal: kemarin, akhir: kemarin };
  }
  // "7 hari terakhir" TERMASUK hari ini, jadi mundurnya 6 hari — bukan 7.
  // Mundur 7 akan memberi delapan hari dan angkanya tak pernah cocok dengan
  // penjumlahan manual owner.
  return { awal: geserHari(hariIni, -(HARI_DALAM_RENTANG_MINGGUAN - 1)), akhir: hariIni };
}

/**
 * Saring video menurut rentang. SELALU memulangkan array baru.
 *
 * Video yang tanggalnya TIDAK diketahui ikut di rentang "semua" saja, dan
 * tidak pernah dimasukkan ke rentang bertanggal. Itu keputusan sadar: salinan
 * cadangan lama di database tidak menyimpan tanggal (lib/playly.ts, catatan di
 * field `uploadedAt`), dan menebak-nebak tanggalnya berarti melaporkan orang
 * mengunggah di hari yang tak pernah terjadi. Jumlahnya ditampilkan terpisah
 * lewat hitungTanpaTanggal() supaya kekurangannya kelihatan, bukan disembunyikan.
 */
export function saringRentangUpload<T extends VideoBertanggal>(
  videos: T[],
  rentang: RentangUpload,
  hariIni: string,
): T[] {
  const batas = batasRentang(rentang, hariIni);
  if (!batas) return [...videos];
  return videos.filter((v) => {
    const t = tanggalWIB(v.uploadedAt);
    return t !== null && t >= batas.awal && t <= batas.akhir;
  });
}

/** Jumlah video per rentang — dipakai sebagai angka di tiap tombol. */
export function hitungRentangUpload<T extends VideoBertanggal>(
  videos: T[],
  hariIni: string,
): Record<RentangUpload, number> {
  return {
    "hari-ini": saringRentangUpload(videos, "hari-ini", hariIni).length,
    kemarin: saringRentangUpload(videos, "kemarin", hariIni).length,
    "7-hari": saringRentangUpload(videos, "7-hari", hariIni).length,
    semua: videos.length,
  };
}

/** Kunci yang berarti "semua pengunggah" di peta hitungan di bawah. */
export const KUNCI_SEMUA_ORANG = "";

/**
 * Angka untuk SETIAP kombinasi orang × rentang, dihitung dalam SATU lintasan.
 *
 * KENAPA sekaligus, bukan memanggil hitungRentangUpload per orang (owner
 * 2026-11-21: "1 dan 2 bisa kamu gabung jadi satu kolom"): dropdown gabungan
 * memajang semua kombinasi sekaligus, jadi angkanya memang semua dibutuhkan
 * pada saat yang sama. Cara naif — saring per orang lalu hitung empat rentang
 * — mengulang seluruh daftar 4×(jumlah orang) kali SETIAP render; pada 668
 * video dan 4 pengunggah itu belasan ribu perbandingan tiap kali satu dropdown
 * di tabel disentuh. Panel ini sudah pernah tersendat karena pola persis itu
 * (lihat catatan `petaUnduhan` di PlaylyVisibilityManager).
 *
 * Kuncinya nama pengunggah huruf kecil; KUNCI_SEMUA_ORANG ("") memuat
 * totalnya. Setiap kunci DIJAMIN punya keempat rentang, jadi pembacanya tidak
 * perlu berjaga-jaga terhadap undefined.
 */
export function hitungRentangPerPengunggah<T extends VideoBertanggal>(
  videos: T[],
  hariIni: string,
): Map<string, Record<RentangUpload, number>> {
  const batas = {
    "hari-ini": batasRentang("hari-ini", hariIni),
    kemarin: batasRentang("kemarin", hariIni),
    "7-hari": batasRentang("7-hari", hariIni),
  };
  const peta = new Map<string, Record<RentangUpload, number>>();
  const ember = (kunci: string) => {
    let ada = peta.get(kunci);
    if (!ada) {
      ada = { "hari-ini": 0, kemarin: 0, "7-hari": 0, semua: 0 };
      peta.set(kunci, ada);
    }
    return ada;
  };
  // Total selalu ada walau daftarnya kosong — dropdown tetap perlu menggambar
  // barisnya, dan "(0)" lebih jujur daripada baris yang hilang.
  ember(KUNCI_SEMUA_ORANG);

  for (const v of videos) {
    const kunci = (v.creator?.trim() || TANPA_NAMA).toLowerCase();
    const milikOrang = ember(kunci);
    const milikSemua = ember(KUNCI_SEMUA_ORANG);
    milikOrang.semua += 1;
    milikSemua.semua += 1;
    const t = tanggalWIB(v.uploadedAt);
    if (t === null) continue; // tanpa tanggal: hanya masuk "semua" — lihat saringRentangUpload
    for (const r of ["hari-ini", "kemarin", "7-hari"] as const) {
      const b = batas[r];
      if (b && t >= b.awal && t <= b.akhir) {
        milikOrang[r] += 1;
        milikSemua[r] += 1;
      }
    }
  }
  return peta;
}

/** Berapa video yang tanggalnya tidak diketahui sama sekali. */
export function hitungTanpaTanggal<T extends VideoBertanggal>(videos: T[]): number {
  return videos.filter((v) => tanggalWIB(v.uploadedAt) === null).length;
}

/** Satu baris ringkasan: siapa, berapa banyak. */
export type RingkasPengunggah = {
  /** Ejaan yang ditampilkan — apa adanya dari Playly. */
  nama: string;
  /** Huruf kecil semua; inilah yang dipakai membandingkan saat menyaring. */
  kunci: string;
  jumlah: number;
};

/**
 * Siapa saja yang mengunggah di daftar ini, beserta jumlahnya. Terbanyak dulu.
 *
 * Dikelompokkan TANPA membedakan huruf besar/kecil ("Coklat" dan "coklat" =
 * satu orang), karena kalau tidak, satu orang bisa muncul dua kali dengan
 * angka terbelah dan tak ada yang menyadarinya. Ejaan yang DITAMPILKAN tetap
 * ejaan pertama yang muncul — bukan hasil paksa-huruf-kecil, supaya nama yang
 * memang ditulis berkapital tidak berubah di layar.
 *
 * Seri (jumlah sama) diurutkan menurut abjad supaya urutannya tidak berubah-ubah
 * tiap render — daftar yang melompat-lompat sendiri terbaca seperti angkanya
 * ikut berubah.
 */
export function ringkasPengunggah<T extends VideoBertanggal>(videos: T[]): RingkasPengunggah[] {
  const peta = new Map<string, RingkasPengunggah>();
  for (const v of videos) {
    const nama = v.creator?.trim() || TANPA_NAMA;
    const kunci = nama.toLowerCase();
    const ada = peta.get(kunci);
    if (ada) ada.jumlah += 1;
    else peta.set(kunci, { nama, kunci, jumlah: 1 });
  }
  return [...peta.values()].sort(
    (a, b) => b.jumlah - a.jumlah || a.nama.localeCompare(b.nama),
  );
}

/**
 * Daftar pengunggah dari SELURUH katalog, tapi jumlahnya dihitung dari rentang
 * yang sedang dipilih — jadi nama yang hari ini menganggur tetap ada di daftar
 * dengan angka 0.
 *
 * KENAPA DIPISAH dari ringkasPengunggah (owner 2026-11-21, sesudah melihatnya
 * di localhost): versi pertama menyusun daftar namanya DARI rentang aktif, jadi
 * pada hari tanpa upload daftarnya ikut kosong — dan pertanyaan owner yang
 * sebenarnya ("hari ini coklat upload berapa film") justru tidak bisa
 * ditanyakan, karena "coklat" tidak ada di layar untuk dipilih. Jawaban NOL
 * adalah jawaban yang sah; yang tidak sah adalah pertanyaannya hilang.
 */
export function ringkasPengunggahSemua<T extends VideoBertanggal>(
  semua: T[],
  dalamRentang: T[],
): RingkasPengunggah[] {
  // Mulai dari nol untuk SETIAP nama yang dikenal katalog...
  const peta = new Map<string, RingkasPengunggah>();
  for (const v of semua) {
    const nama = v.creator?.trim() || TANPA_NAMA;
    const kunci = nama.toLowerCase();
    if (!peta.has(kunci)) peta.set(kunci, { nama, kunci, jumlah: 0 });
  }
  // ...baru dihitung dari rentangnya.
  for (const v of dalamRentang) {
    const kunci = (v.creator?.trim() || TANPA_NAMA).toLowerCase();
    const ada = peta.get(kunci);
    if (ada) ada.jumlah += 1;
  }
  return [...peta.values()].sort(
    (a, b) => b.jumlah - a.jumlah || a.nama.localeCompare(b.nama),
  );
}

/**
 * Saring menurut satu pengunggah. `kunci` null = tidak menyaring.
 *
 * Perbandingannya ditaruh di sini, bukan diketik di tiap pemakai: ia harus
 * PERSIS sama dengan cara ringkasPengunggah mengelompokkan (trim + huruf
 * kecil). Kalau keduanya berbeda sedikit saja, tombol bertuliskan "coklat 6"
 * akan membuka daftar berisi 0 baris — angka dan isinya saling membantah
 * tanpa satu pun error.
 */
export function saringPengunggah<T extends VideoBertanggal>(
  videos: T[],
  kunci: string | null,
): T[] {
  if (!kunci) return [...videos];
  return videos.filter((v) => (v.creator?.trim() || TANPA_NAMA).toLowerCase() === kunci);
}

/**
 * Tanggal upload TERBARU di daftar, atau null kalau tak satu pun bertanggal.
 *
 * Dipakai saat rentang "hari ini" kosong: tanpa ini, panel cuma menampilkan
 * angka nol dan owner tidak bisa membedakan "hari ini memang libur" dari
 * "fiturnya rusak". Dengan ini kalimatnya jadi "belum ada hari ini; terakhir
 * 18 Nov 2026".
 */
export function tanggalUploadTerakhir<T extends VideoBertanggal>(videos: T[]): string | null {
  let paling: string | null = null;
  for (const v of videos) {
    const t = tanggalWIB(v.uploadedAt);
    if (t !== null && (paling === null || t > paling)) paling = t;
  }
  return paling;
}

const PEMBENTUK_TAMPIL = new Intl.DateTimeFormat("id-ID", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/**
 * "2026-11-18" -> "18 Nov 2026". Tanggal rusak -> null, bukan "Invalid Date".
 *
 * Dibaca sebagai tengah hari UTC dan diformat dalam UTC juga: nilainya SUDAH
 * tanggal WIB (hasil tanggalWIB di atas), jadi mengubahnya lagi ke zona WIB
 * berarti menggeser dua kali dan tanggal 1 Januari bisa tampil 31 Desember.
 */
export function formatTanggalWIB(tanggal: string | null | undefined): string | null {
  if (!tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return null;
  const t = new Date(`${tanggal}T12:00:00Z`);
  if (Number.isNaN(t.getTime())) return null;
  return PEMBENTUK_TAMPIL.format(t);
}
