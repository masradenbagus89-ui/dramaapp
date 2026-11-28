// Isi tiga baris FILM di halaman depan, dari SATU kolam bersama.
//
// Owner 2026-11-24: *"nonton bareng, rekomendasi kamu isi dengan film saja
// jangan drama lagi"*. Sejak itu beranda punya TIGA seksi film berturut-turut
// (Film Terbaru, Top Bulan Ini, Rekomendasi) — dan tiga seksi yang menarik dari
// satu daftar yang sama adalah cara paling mudah membuat beranda terbaca rusak
// tanpa satu pun error muncul.
//
// Dua kerusakan senyap yang sudah TERUKUR terjadi saat ketiga seksi menarik
// langsung dari daftar film mentah (diukur di server lokal 2026-11-24, build
// sebelum berkas ini ada):
//   • 11 dari 20 kartu seksi itu TANPA sampul — kotak hitam berjejer,
//     karena daftar mentah ikut memuat film yang belum punya thumbnail.
//   • 9 dari 20 judulnya SAMA dengan baris poster paling atas — persis keluhan
//     owner 2026-11-17 yang dulu melahirkan `filmDiLuarBarisAtas`.
//
// Makanya aturan pemilihannya ditaruh di berkas sendiri, bukan di dalam JSX:
// di sini ia bisa diuji tanpa browser, dan satu tempat memegang jawaban "baris
// mana dapat film mana".
//
// Yang MENYIAPKAN kolamnya = `siapkanTampilanDepan` di lib/baris-atas.ts
// (`filmSeksi`): film bersampul saja, judul baris atas sudah dibuang, urutan
// tahun rilis terbaru di depan. Berkas ini TIDAK menyaring ulang — ia cuma
// memilih potongan.

import { parseRating } from "./format";

/** Pembulatan permintaan jumlah kartu; nilai aneh (NaN, negatif) jadi 0. */
function batasWajar(jumlah: number): number {
  return Number.isFinite(jumlah) ? Math.max(0, Math.floor(jumlah)) : 0;
}

/**
 * Film untuk seksi "Top Bulan Ini" — JENDELA KEDUA kolam, bukan yang pertama.
 *
 * Kenapa bukan dari depan: seksi "Film Terbaru" di bawahnya mengambil jendela
 * PERTAMA. Kalau keduanya mengambil dari depan, satu layar beranda menampilkan
 * dua puluh judul yang sama dua kali.
 *
 * Kenapa yang mengalah "Top Bulan Ini", bukan "Film Terbaru": nama + keterangan
 * di layar seksi Film Terbaru BERJANJI tahun rilis terbaru lebih dulu. Menggeser
 * seksi itu ke jendela kedua membuat janji di layarnya jadi bohong. "Nonton
 * Bulan Ini" tidak menjanjikan apa pun soal tahun, jadi ia yang pindah.
 *
 * Kolam lebih pendek dari satu jendela (penyedia luar sepi atau sedang mati) →
 * jatuh ke jendela pertama. Judul terulang satu baris masih jauh lebih baik
 * daripada lubang kosong di seksi paling atas beranda. Jendela kedua yang ADA
 * tapi pendek dibiarkan pendek apa adanya — barisnya tetap jujur berisi "film
 * selain yang terbaru", dan memaksanya penuh hanya bisa dengan mengambil ulang
 * judul yang sudah tampil di bawahnya.
 */
export function filmSeksiTopBulanIni<F>(kolam: F[], jumlah: number): F[] {
  const batas = batasWajar(jumlah);
  if (batas === 0) return [];
  const jendelaKedua = kolam.slice(batas, batas * 2);
  return jendelaKedua.length > 0 ? jendelaKedua : kolam.slice(0, batas);
}

/**
 * Film untuk seksi "Rekomendasi" — rating tertinggi lebih dulu.
 *
 * Mengurut, bukan menggeser jendela: "rekomendasi" sejak awal berarti yang
 * dinilai paling bagus (tab dengan nama sama di /katalog juga begitu). Film
 * bagus yang kebetulan juga baru BOLEH muncul di dua seksi — itu benar, bukan
 * pengulangan yang keliru. Terukur 2026-11-24: nol judul yang sama dengan seksi
 * Film Terbaru, sebab film ber-rating tinggi di katalog ini kebanyakan lama.
 *
 * Rating kosong = 0 (lihat `parseRating`), jadi film yang belum dikaitkan admin
 * ke drama jatuh ke ekor — bukan hilang. Urutan aslinya (tahun) tetap jadi
 * pemutus untuk rating yang sama, karena `Array.sort` di V8 stabil.
 *
 * Salinan dulu (`[...kolam]`): `sort` mengubah array di tempat, dan kolamnya
 * dipakai bersama dua seksi lain yang bergantung pada urutan tahun.
 */
export function filmSeksiRekomendasi<F extends { rating?: string | null }>(
  kolam: F[],
  jumlah: number,
): F[] {
  const batas = batasWajar(jumlah);
  if (batas === 0) return [];
  return [...kolam]
    .sort((a, b) => parseRating(b.rating ?? undefined) - parseRating(a.rating ?? undefined))
    .slice(0, batas);
}
