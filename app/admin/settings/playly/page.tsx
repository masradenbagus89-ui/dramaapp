// Halaman setelan kunci API Playly — /admin/settings/playly
//
// PENJAGA AKSES: halaman ini dijaga DI SERVER. Cookie sesi admin (ditandatangani
// HMAC saat login) diperiksa sebelum apa pun dirender, jadi orang yang belum
// login tidak pernah menerima isi halamannya — bukan sekadar "disembunyikan"
// setelah halaman terkirim.
//
// ✅ TODO LAMA SUDAH DIKERJAKAN (2026-10-24). Dulu tertulis di sini: "satukan
// penjagaan semua halaman /admin lewat satu middleware, supaya tidak ada
// halaman baru yang lupa dijaga". Sekarang gerbang satu-pintu itu ada di
// `app/admin/layout.tsx` dan menjaga SELURUH /admin/* — termasuk halaman admin
// yang dibuat di kemudian hari. Bukan `middleware.ts`, karena project ini
// sengaja menghindari middleware sebagai penjaga otorisasi (CVE-2025-29927,
// lihat app/api/admin/playly/unduhan/route.ts:25).
//
// Pemeriksaan di halaman ini SENGAJA DIBIARKAN sebagai lapis kedua: kalau
// layout itu suatu hari dihapus atau salah di-refactor, halaman ini masih
// berdiri sendiri.
import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyAdminSessionToken } from "@/lib/session";
import AdminAccessDenied from "@/app/components/admin/AdminAccessDenied";
import AdminSidebar from "@/app/components/admin/AdminSidebar";
import IsiKunciPlayly from "./IsiKunciPlayly";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kunci API Playly — Admin DramaKu",
  description: "Pasang dan ganti kunci API Playly untuk menampilkan video mereka di DramaKu.",
  robots: { index: false, follow: false }, // halaman admin: jangan masuk Google
};

export default async function PlaylySettingsPage() {
  const jar = await cookies();
  const email = await verifyAdminSessionToken(jar.get(ADMIN_COOKIE)?.value);
  if (!email) return <AdminAccessDenied />;

  return (
    <div className="mx-auto max-w-7xl gap-6 px-4 pb-10 pt-6 md:grid md:grid-cols-[220px_1fr] md:px-6">
      <AdminSidebar />

      <div className="space-y-6">
        <header>
          <p className="text-xs uppercase tracking-wider text-zinc-500">Setelan</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Kunci API Playly</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Playly adalah partner yang menyediakan video. Mereka memberi kita{" "}
            <strong className="text-zinc-200">API key</strong> — kunci akses berupa
            teks rahasia yang membuktikan bahwa yang meminta datanya memang DramaKu.
            Kunci disimpan dalam keadaan terenkripsi (diacak) di database dan hanya
            dipakai dari server, tidak pernah dikirim ke browser pengunjung.
          </p>
        </header>

        {/* Status kunci dibaca di server, tapi TIDAK menahan judul di atas.
            Yang menyeberang ke browser tetap hanya bentuk tersamar. */}
        <Suspense
          fallback={
            <p role="status" className="text-sm text-zinc-300">
              Status kunci sedang diambil.
            </p>
          }
        >
          <IsiKunciPlayly email={email} />
        </Suspense>
      </div>
    </div>
  );
}
