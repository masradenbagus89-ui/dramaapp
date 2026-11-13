"use client";

// -------------------------------------------------------------------------
// Logika daftar saran-saat-mengetik — SATU tempat untuk SEMUA kotak cari.
//
// KENAPA DIEKSTRAK (owner 2026-11-13): "telusuri detail lagi semua search
// harus seragam". Logika ini tadinya hidup HANYA di SearchBar.tsx (kotak cari
// lebar di beranda), sementara kotak cari di navbar hitam (TopNav.tsx) — satu-
// satunya kotak cari di /film, /katalog, /profile dan seluruh panel admin —
// tidak punya saran sama sekali. Owner mengetik di sana, tak terjadi apa-apa,
// dan wajar menyimpulkan kotaknya rusak.
//
// Menyalin logikanya ke TopNav akan melahirkan kembaran ketiga yang pasti
// menyimpang cepat atau lambat — persis jenis masalah yang baru saja dibereskan
// untuk daftar kategori (app/admin/constants.ts). Jadi ia dipindah ke sini dan
// dipakai BERDUA: dua kotak cari tak mungkin lagi berperilaku beda, karena
// perilakunya cuma ditulis sekali.
//
// Yang TIDAK diurus hook ini: dari mana indeksnya datang. Halaman publik
// merakitnya di server; TopNav mengambilnya lewat /api/saran saat penonton
// mulai mengetik. Keduanya berakhir di sini dalam bentuk yang sama.
// -------------------------------------------------------------------------
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { pilihSaran, type SaranCari } from "@/lib/saran-cari";
import { alamatCari } from "@/lib/nav-katalog";

export function useDaftarSaran(
  /** Ketikan yang sedang ada di kotak. */
  nilai: string,
  /** Indeks judul. `undefined` = fitur saran mati (perilaku lama SearchBar). */
  indeksSaran: SaranCari[] | undefined,
) {
  const router = useRouter();

  /** Baris yang sedang disorot panah; -1 = belum ada yang disorot. */
  const [sorot, setSorot] = useState(-1);
  /**
   * Penonton menutup daftar dengan sengaja (Esc / klik di luar / sudah
   * memilih). Dipisah dari "ada saran atau tidak" supaya daftar yang baru
   * ditutup tidak langsung terbuka lagi oleh render berikutnya.
   */
  const [tutup, setTutup] = useState(false);

  /** Pasang ke elemen pembungkus kotak cari — dipakai deteksi klik di luar. */
  const pembungkusRef = useRef<HTMLElement | null>(null);

  const saran = useMemo(
    () => (indeksSaran ? pilihSaran(nilai, indeksSaran) : []),
    [indeksSaran, nilai],
  );
  const tampil = saran.length > 0 && !tutup;

  // Tiap ketikan berubah, daftar dianggap relevan lagi dan sorotan direset.
  // Tanpa reset sorot, panah bawah sekali lalu mengetik lagi membuat Enter
  // membuka judul yang SUDAH TIDAK ADA di daftar — mendarat di halaman yang
  // tak ada hubungannya dengan ketikan terakhir, tanpa satu pun error.
  useEffect(() => {
    setSorot(-1);
    setTutup(false);
  }, [nilai]);

  // Klik di LUAR menutup daftar. Pemeriksaannya memakai pembungkus yang
  // MEMUAT daftarnya — jadi mengklik sebuah saran tidak ikut terhitung
  // "di luar", dan tautannya tetap sempat jalan.
  useEffect(() => {
    if (!tampil) return;
    const diLuar = (e: PointerEvent) => {
      if (!pembungkusRef.current?.contains(e.target as Node)) setTutup(true);
    };
    document.addEventListener("pointerdown", diLuar);
    return () => document.removeEventListener("pointerdown", diLuar);
  }, [tampil]);

  /**
   * Penanganan papan ketik. Dipasang ke `onKeyDown` kotak ketiknya.
   *
   * Baris terakhir ("Lihat semua hasil") ikut bisa disorot, jadi batas
   * atasnya `saran.length` — BUKAN `saran.length - 1`.
   */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!tampil) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSorot((i) => (i >= saran.length ? 0 : i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSorot((i) => (i <= -1 ? saran.length : i - 1));
      } else if (e.key === "Escape") {
        setTutup(true);
      } else if (e.key === "Enter" && sorot >= 0) {
        // Enter TANPA sorotan sengaja dibiarkan lewat: itu pengiriman form
        // biasa yang membuka halaman hasil lengkap. Yang dicegat hanya Enter
        // saat sebuah baris memang sedang disorot.
        e.preventDefault();
        setTutup(true);
        router.push(sorot < saran.length ? saran[sorot].href : alamatCari(nilai));
      }
    },
    [nilai, router, saran, sorot, tampil],
  );

  return {
    saran,
    tampil,
    sorot,
    setSorot,
    /** Dipanggil saat sebuah baris diklik. */
    tutupSaran: useCallback(() => setTutup(true), []),
    pembungkusRef,
    onKeyDown,
  };
}
