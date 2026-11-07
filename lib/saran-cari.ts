// Saran judul yang muncul SAAT MENGETIK di kotak cari (owner 2026-11-07:
// "aku juga mau ketika kita sedang mengetik akan muncul pilihan").
//
// Berkas ini MURNI aturan — tidak menyentuh DOM, tidak mengambil apa pun dari
// jaringan. Itu disengaja: seluruh keputusan "judul mana yang pantas muncul"
// bisa diuji tanpa browser, dan pemakainya (server maupun browser) memanggil
// fungsi yang SAMA sehingga hasilnya tak bisa menyimpang.
import type { Drama } from "./types";
import { normalisasiTeks, saringDenganKetikan } from "./pencarian";
import { alamatTonton } from "./tonton";

/** Satu baris saran, sudah siap digambar — tanpa sisa data katalog. */
export type SaranCari = {
  id: string;
  judul: string;
  /** Boleh kosong: katalog lama banyak yang tak punya tahun. */
  tahun?: string;
  /** Boleh kosong: barisnya tetap digambar, hanya kotak posternya polos. */
  poster?: string;
  /** Alamat halaman judul ini. Drama dan video Playly BERBEDA — lihat di bawah. */
  href: string;
};

/**
 * Berapa baris saran yang ditampilkan.
 *
 * Enam, bukan "semua yang cocok": daftar saran yang panjang menutupi poster di
 * belakangnya dan memaksa orang membaca alih-alih memilih. Yang butuh daftar
 * lengkap menekan Enter dan mendapat halaman hasil.
 */
export const MAKS_SARAN = 6;

/**
 * Jumlah huruf minimum sebelum saran muncul.
 *
 * Satu huruf mencocokkan ratusan judul, jadi enam baris pertamanya praktis
 * acak — daftar yang isinya terasa acak mengajarkan orang mengabaikannya.
 */
export const MIN_HURUF_SARAN = 2;

/** Bentuk minimum video Playly yang dibutuhkan — sengaja bukan tipe penuhnya. */
export type VideoUntukSaran = {
  id: string;
  title: string;
  year?: string | null;
  thumbnail?: string | null;
};

/**
 * Ubah katalog jadi indeks ringan: hanya lima field yang benar-benar digambar.
 *
 * ⚠️ Kenapa indeks terpisah dan bukan mengoper `Drama[]` apa adanya: objek
 * drama penuh membawa `synopsis`, `gradient`, `heroImage` dan belasan field
 * lain yang TIDAK dipakai satu pun baris saran. Diukur 2026-11-07: indeks ini
 * ±158 byte per judul (±77 KB mentah untuk 500 judul), sementara katalog
 * penuhnya berlipat-lipat dari itu. Halaman yang katalognya SUDAH terkirim ke
 * browser (mis. /discover) sebaiknya memanggil fungsi ini di browser saja —
 * hasilnya sama persis, dan nol byte tambahan dikirim.
 */
export function rakitIndeksSaran(
  dramas: Drama[],
  videos: VideoUntukSaran[] = [],
): SaranCari[] {
  const dariDrama: SaranCari[] = dramas.map((d) => ({
    id: d.id,
    judul: d.title,
    tahun: d.year || undefined,
    poster: d.posterImage || undefined,
    // Drama berepisode punya halaman detailnya sendiri.
    href: `/drama/${d.id}`,
  }));

  const dariVideo: SaranCari[] = videos.map((v) => ({
    id: v.id,
    judul: v.title,
    tahun: v.year || undefined,
    poster: v.thumbnail || undefined,
    // 🪤 Video Playly TIDAK memakai /drama/<id>. Alamatnya dirakit
    // `alamatTonton` (slug + id) — memakai pola drama di sini akan menghasilkan
    // saran yang diklik lalu mendarat di halaman 404, dan itu lebih buruk
    // daripada tidak ada saran sama sekali.
    href: alamatTonton(v),
  }));

  return [...dariDrama, ...dariVideo];
}

/**
 * Pilih baris saran untuk sebuah ketikan.
 *
 * ⚠️ Yang dicocokkan HANYA judul — sengaja, walau `/discover` juga mencari di
 * sinopsis dan kategori. Alasannya: baris saran cuma memperlihatkan JUDUL.
 * Judul yang cocok karena kata itu ada di sinopsisnya akan terbaca seperti
 * hasil yang salah ("kenapa film ini muncul?"), dan daftar yang terasa salah
 * membuat orang berhenti memakainya. Pencarian penuh tetap jalan lewat Enter.
 */
export function pilihSaran(
  ketikan: string,
  indeks: SaranCari[],
  maks = MAKS_SARAN,
): SaranCari[] {
  if (ketikan.trim().length < MIN_HURUF_SARAN) return [];

  const cocok = saringDenganKetikan(indeks, ketikan, (s) => [s.judul]);

  // Buang judul kembar: satu film bisa hadir sebagai drama DAN video Playly.
  // Tanpa ini baris yang sama muncul dua kali dengan alamat berbeda, dan
  // penonton tidak punya cara menebak mana yang benar.
  const terlihat = new Set<string>();
  const unik: SaranCari[] = [];
  for (const s of cocok) {
    const kunci = normalisasiTeks(s.judul);
    if (terlihat.has(kunci)) continue;
    terlihat.add(kunci);
    unik.push(s);
    if (unik.length >= maks) break;
  }
  return unik;
}
