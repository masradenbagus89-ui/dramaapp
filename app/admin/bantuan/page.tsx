// Pusat bantuan admin — /admin/bantuan: Laporan Video + Live Chat member.
//
// PENJAGA AKSES: sama seperti halaman admin Playly — dijaga DI SERVER lewat
// cookie sesi admin bertanda tangan. Yang belum login tak menerima isinya.
// Endpoint datanya (/api/admin/laporan-video, /api/admin/chat) memeriksa sesi
// admin lagi sendiri-sendiri; halaman ini bukan satu-satunya pagar.
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyAdminSessionToken } from "@/lib/session";
import AdminAccessDenied from "@/app/components/admin/AdminAccessDenied";
import AdminSidebar from "@/app/components/admin/AdminSidebar";
import PusatBantuanAdmin from "@/app/components/admin/PusatBantuanAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Laporan & Chat — Admin Layarindo",
  description: "Tangani laporan video dan balas Live Chat member.",
  robots: { index: false, follow: false },
};

export default async function BantuanAdminPage() {
  const jar = await cookies();
  const email = await verifyAdminSessionToken(jar.get(ADMIN_COOKIE)?.value);
  if (!email) return <AdminAccessDenied />;

  return (
    <div className="mx-auto max-w-7xl gap-6 px-4 pb-10 pt-6 md:grid md:grid-cols-[220px_1fr] md:px-6">
      <AdminSidebar />

      <div className="min-w-0 space-y-6">
        <header>
          <p className="text-xs uppercase tracking-wider text-zinc-500">Layanan member</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Laporan & Chat</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Laporan video rusak dan pesan Live Chat dari member masuk ke sini. Daftar
            disegarkan otomatis tiap beberapa detik — tak perlu memuat ulang halaman.
            Tandai laporan <strong className="text-zinc-200">Selesai</strong> setelah
            ditangani supaya tak menumpuk di tab Pending.
          </p>
        </header>

        <PusatBantuanAdmin />
      </div>
    </div>
  );
}
