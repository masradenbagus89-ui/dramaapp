"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const [terbuka, setTerbuka] = useState(false);

  return (
    <section className="border-b border-zinc-800 bg-zinc-900">
      <div className="shell-wide mx-auto px-4 md:px-6">
        <button
          type="button"
          onClick={() => setTerbuka((b) => !b)}
          aria-expanded={terbuka}
          aria-controls="panel-lanjut-menonton"
          /* min-h-11 = ~44px: batas target sentuh yang masih nyaman ditekan
             jari di HP (standar aksesibilitas, skills/a11y). */
          className="flex min-h-11 w-full items-center justify-center gap-1.5 text-sm font-bold text-amber-400 transition-colors hover:text-amber-300"
        >
          Lanjutkan Menonton
          <ChevronDown
            className={cn(
              "size-4 transition-transform duration-200",
              terbuka && "rotate-180",
            )}
          />
        </button>

        {/* Dirender hanya saat terbuka, bukan disembunyikan dengan CSS:
            isinya cuma dua tautan, jadi tak ada yang perlu dipertahankan
            hidup di balik layar. */}
        {terbuka && (
          <div
            id="panel-lanjut-menonton"
            className="flex flex-col items-center gap-2.5 pb-5 text-center"
          >
            <p className="text-xs text-zinc-400 md:text-sm">
              Masuk untuk melanjutkan dari episode terakhir yang kamu tonton,
              dan menyimpan drama favorit.
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
        )}
      </div>
    </section>
  );
}
