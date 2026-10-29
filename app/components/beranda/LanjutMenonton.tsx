"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AKUN_PENONTON_ENABLED } from "@/lib/saklar-fitur";
import PanelLipat from "./PanelLipat";

/**
 * Bar "Lanjutkan Menonton" di bawah hero — PINTU MASUK AKUN yang tertutup
 * sampai diklik (owner 2026-10-09, mencontoh situs katalog pembanding).
 *
 * KENAPA tombol Masuk/Daftar disembunyikan di sini, bukan dipajang terbuka:
 * halaman depan ini adalah KATALOG. Sampai hari ini ajakan daftar muncul tiga
 * kali di satu halaman (strip di bawah poster, blok penutup, tautan footer),
 * sehingga penonton yang cuma mau melihat film terus-menerus ditawari
 * mendaftar. Satu pintu yang dibuka saat DIBUTUHKAN lebih sopan sekaligus
 * lebih jelas.
 *
 * ⚠️ INI BUKAN PENGAMANAN. Menyembunyikan tombol TIDAK menutup apa pun:
 * /login dan /daftar tetap terbuka lewat alamat langsung, dan memang harus
 * begitu (tautan lama & hasil Google tidak boleh mati). Penjagaan yang
 * sesungguhnya tetap di server — aturan ini ditegaskan di
 * .lintasai/skills/auth/SKILL.md §5: "menyembunyikan tombol di layar BUKAN
 * kontrol izin". Jangan pernah pakai komponen ini sebagai pengganti
 * pemeriksaan hak akses.
 */
export default function LanjutMenonton() {
  // DIAM TOTAL saat akun penonton dijeda (2026-10-29). Bar ini BUKAN daftar
  // tontonan — isinya cuma dua tombol Masuk/Daftar, jadi tanpa akun ia jadi
  // tombol yang terbuka ke panel kosong. Early-return, bukan menyembunyikan
  // isinya saja: judul "Lanjutkan Menonton" yang bisa diklik lalu tak
  // menampilkan apa-apa terbaca persis seperti situs rusak.
  if (!AKUN_PENONTON_ENABLED) return null;

  // Bentuk accordion-nya kini milik `PanelLipat` — komponen yang SAMA dipakai
  // baris "Lanjut Menonton" di /beranda (owner 2026-10-29), supaya keduanya
  // tak bisa menyimpang bentuknya.
  return (
    <PanelLipat judul="Lanjutkan Menonton">
      <div className="flex flex-col items-center gap-2.5 text-center">
        <p className="text-xs text-zinc-400 md:text-sm">
          Masuk untuk melanjutkan dari episode terakhir yang kamu tonton, dan
          menyimpan drama favorit.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            asChild
            className="rounded-full bg-amber-400 px-5 text-sm font-bold text-black hover:bg-amber-300"
          >
            <Link href="/login">Masuk</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-full border-zinc-600 bg-transparent px-5 text-sm font-semibold text-white hover:border-amber-400 hover:text-amber-400"
          >
            <Link href="/daftar">Daftar Gratis</Link>
          </Button>
        </div>
      </div>
    </PanelLipat>
  );
}
