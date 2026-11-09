"use client";

// -------------------------------------------------------------------------
// SATU aturan "cari + halaman" untuk semua daftar panjang di panel admin.
//
// KENAPA ADA (owner 2026-11-09): "telusuri tab mana saja yang perlu search dan
// pagination kamu seragamkan". Sebelum ini hanya Daftar video Playly (panel
// visibilitas) yang punya keduanya, dan aturannya ditulis langsung di dalam
// komponen itu — 1.084 baris. Menyalin pola itu ke tiga tempat lain berarti
// empat salinan yang pasti menyimpang: satu memakai ukuran bawaan 25, satu
// lupa menjepit nomor halaman, satu mencari judul saja tanpa kategori.
//
// Hook ini TIDAK menggambar apa pun. Ia cuma menyatukan tiga keputusan yang
// selalu muncul bersama di daftar admin:
//   1. menyaring dengan ketikan   -> lib/pencarian.ts (dipakai bersama
//      pencarian penonton, jadi "CEO" = "ceo" = "Ceo" di mana-mana)
//   2. menjepit nomor halaman     -> lib/paginasi.ts
//   3. memotong baris yang tampil
//
// Aturan aslinya tetap tinggal di lib/ supaya bisa diuji tanpa React —
// tests/paginasi.test.ts & tests/pencarian.test.ts. Yang ditambahkan di sini
// cuma penyimpanan state-nya.
// -------------------------------------------------------------------------
import { useState } from "react";
import { saringDenganKetikan } from "@/lib/pencarian";
import {
  HALAMAN_PERTAMA,
  UKURAN_BAWAAN,
  jepitHalaman,
  type UkuranHalaman,
} from "@/lib/paginasi";

export type DaftarAdmin<T> = {
  /** Isi kotak cari apa adanya — dioper ke KotakCariDaftar. */
  ketikan: string;
  setKetikan: (teks: string) => void;
  /** Seluruh baris yang lolos saringan (SEBELUM dipotong per halaman). */
  tersaring: T[];
  /** Baris yang benar-benar digambar di layar. */
  tampil: T[];
  /** Nomor halaman yang SUDAH dijepit ke rentang yang ada. */
  halaman: number;
  setHalaman: (halaman: number) => void;
  ukuran: UkuranHalaman;
  setUkuran: (ukuran: UkuranHalaman) => void;
  /** true = ada ketikan tapi nol hasil (beda dari "datanya memang kosong"). */
  kosongKarenaCari: boolean;
};

/**
 * @param semua daftar lengkap dari induk
 * @param teksDari bagian mana dari tiap item yang boleh dicari. Daftar, bukan
 *   satu string: judul saja membuat pencarian "action" atau "romance" nihil
 *   padahal kategorinya tertulis di layar.
 */
export function useDaftarAdmin<T>(
  semua: T[],
  teksDari: (item: T) => (string | null | undefined)[],
): DaftarAdmin<T> {
  const [ketikan, setKetikan] = useState("");
  const [halamanMentah, setHalaman] = useState(HALAMAN_PERTAMA);
  const [ukuran, setUkuran] = useState<UkuranHalaman>(UKURAN_BAWAAN);

  const tersaring = saringDenganKetikan(semua, ketikan, teksDari);

  // Dijepit SAAT RENDER, bukan lewat efek yang membetulkan state sesudahnya.
  // Alasannya ada di lib/paginasi.ts: mengetik di kotak cari memendekkan
  // daftar, dan nomor halaman lama jadi di luar rentang. Lewat efek, ada satu
  // render di mana daftarnya KOSONG — layar kosong terbaca seperti panel rusak.
  const halaman = jepitHalaman(halamanMentah, tersaring.length, ukuran);
  const mulai = (halaman - 1) * ukuran;

  return {
    ketikan,
    setKetikan,
    tersaring,
    tampil: tersaring.slice(mulai, mulai + ukuran),
    halaman,
    setHalaman,
    ukuran,
    setUkuran,
    kosongKarenaCari: tersaring.length === 0 && semua.length > 0,
  };
}
