// Halaman pilih & pasang video Playly — /admin/videos/playly
//
// PENJAGA AKSES: cookie sesi admin diperiksa di server. Daftar film TIDAK
// ditunggu di sini. Menunggunya di fungsi halaman membuat seluruh layar
// (termasuk menu) tetap kerangka abu-abu "Memuat…" sampai Playly selesai
// mengirim ratusan video — itulah yang owner lihat saat datang dari beranda.
// Menu digambar dulu; daftar menyusul di dalam <Suspense>.
import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyAdminSessionToken } from "@/lib/session";
import AdminAccessDenied from "@/app/components/admin/AdminAccessDenied";
import AdminSidebar from "@/app/components/admin/AdminSidebar";
import IsiPanelPlayly from "./IsiPanelPlayly";
import KerangkaIsiPlayly from "./KerangkaIsiPlayly";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Video Playly — Admin Layarindo",
  description: "Pilih video dari Playly dan kaitkan ke drama di katalog Layarindo.",
  robots: { index: false, follow: false },
};

export default async function PlaylyVideosPage() {
  const jar = await cookies();
  const email = await verifyAdminSessionToken(jar.get(ADMIN_COOKIE)?.value);
  if (!email) return <AdminAccessDenied />;

  return (
    <div className="mx-auto max-w-7xl gap-6 px-4 pb-10 pt-6 md:grid md:grid-cols-[220px_1fr] md:px-6">
      <AdminSidebar />
      <Suspense fallback={<KerangkaIsiPlayly />}>
        <IsiPanelPlayly />
      </Suspense>
    </div>
  );
}
