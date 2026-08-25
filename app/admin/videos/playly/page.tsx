// Halaman pilih & pasang video Playly — /admin/videos/playly
//
// PENJAGA AKSES: sama seperti halaman setelan Playly, halaman ini dijaga DI
// SERVER lewat cookie sesi admin yang ditandatangani saat login. Daftar drama
// dan kaitan yang sudah ada juga diambil di server, jadi begitu halaman muncul
// isinya sudah siap (tidak ada kedipan "memuat" untuk bagian ini).
import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyAdminSessionToken } from "@/lib/session";
import { getPlaylyKeyStatus } from "@/lib/playly";
import { getAllDramas } from "@/lib/dramas";
import { getPlaylyEmbeds } from "@/lib/store";
import AdminAccessDenied from "@/app/components/admin/AdminAccessDenied";
import AdminSidebar from "@/app/components/admin/AdminSidebar";
import PlaylyVideoPicker from "@/app/components/admin/PlaylyVideoPicker";
import { Button } from "@/components/ui/button";
import { AlertTriangle, KeyRound } from "lucide-react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Video Playly — Admin DramaKu",
  description: "Pilih video dari Playly dan kaitkan ke drama di katalog DramaKu.",
  robots: { index: false, follow: false }, // halaman admin: jangan masuk Google
};

export default async function PlaylyVideosPage() {
  const jar = await cookies();
  const email = await verifyAdminSessionToken(jar.get(ADMIN_COOKIE)?.value);
  if (!email) return <AdminAccessDenied />;

  const [status, dramas, embeds] = await Promise.all([
    getPlaylyKeyStatus(),
    getAllDramas(),
    getPlaylyEmbeds(),
  ]);

  // Dropdown hanya butuh 3 kolom; sisanya tidak perlu ikut ke browser.
  const pilihanDrama = dramas.map((d) => ({
    id: d.id,
    title: d.title,
    episodes: d.episodes,
  }));

  return (
    <div className="mx-auto max-w-7xl gap-6 px-4 pb-10 pt-6 md:grid md:grid-cols-[220px_1fr] md:px-6">
      <AdminSidebar />

      <div className="space-y-6">
        <header>
          <p className="text-xs uppercase tracking-wider text-zinc-500">Konten</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Video dari Playly</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Pilih video milik Playly, lalu kaitkan ke salah satu drama DramaKu.
            Video yang sudah dikaitkan akan tampil di halaman{" "}
            <Link href="/discover" className="text-amber-400 underline">
              Discover
            </Link>{" "}
            memakai pemutar milik Playly (embed), sementara video DramaKu sendiri
            tetap berjalan seperti biasa.
          </p>
        </header>

        {status.configured ? (
          <PlaylyVideoPicker dramas={pilihanDrama} initialEmbeds={embeds} />
        ) : (
          // Tanpa kunci, memuat daftar video pasti gagal. Jadi jangan tampilkan
          // pesan error — arahkan langsung ke langkah yang benar.
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5">
            <p className="flex items-start gap-2 text-sm text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Kunci API Playly belum dipasang, jadi daftar videonya belum bisa
                diambil. Pasang kuncinya dulu, baru kembali ke halaman ini.
              </span>
            </p>
            <Button
              asChild
              className="mt-4 min-h-11 rounded-full px-5 text-sm font-semibold"
            >
              <Link href="/admin/settings/playly">
                <KeyRound className="size-4" aria-hidden="true" />
                Pasang kunci Playly
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
