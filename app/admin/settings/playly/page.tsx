// Halaman setelan kunci API Playly — /admin/settings/playly
//
// PENJAGA AKSES: halaman ini dijaga DI SERVER. Cookie sesi admin (ditandatangani
// HMAC saat login) diperiksa sebelum apa pun dirender, jadi orang yang belum
// login tidak pernah menerima isi halamannya — bukan sekadar "disembunyikan"
// setelah halaman terkirim.
//
// Catatan untuk pengembang berikutnya: halaman /admin yang lama masih memakai
// pemeriksaan di sisi browser (localStorage). Route API-nya sendiri sudah
// dijaga cookie, jadi datanya aman; yang belum seragam cuma penjaga tampilan.
// TODO: satukan penjagaan semua halaman /admin lewat satu middleware, supaya
// tidak ada halaman baru yang lupa dijaga.
import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyAdminSessionToken } from "@/lib/session";
import { getPlaylyKeyStatus, DEFAULT_PLAYLY_API_URL } from "@/lib/playly";
import AdminAccessDenied from "@/app/components/admin/AdminAccessDenied";
import AdminSidebar from "@/app/components/admin/AdminSidebar";
import PlaylyKeyForm from "@/app/components/admin/PlaylyKeyForm";
import { Button } from "@/components/ui/button";
import { Film } from "lucide-react";

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

  // Status diambil di SERVER: yang menyeberang ke browser hanya bentuk
  // tersamar ("plyk_••••••••json"), tidak pernah kunci aslinya.
  const status = await getPlaylyKeyStatus();
  const apiUrl = process.env.PLAYLY_API_URL?.trim() || DEFAULT_PLAYLY_API_URL;

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

        <PlaylyKeyForm initialStatus={status} apiUrl={apiUrl} adminEmail={email} />

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="text-sm font-bold text-white">Langkah berikutnya</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Setelah kunci tersimpan dan uji sambungan berhasil, pilih video mana
            yang mau ditampilkan di DramaKu.
          </p>
          <Button
            asChild
            className="mt-4 min-h-11 rounded-full px-5 text-sm font-semibold"
          >
            <Link href="/admin/videos/playly">
              <Film className="size-4" aria-hidden="true" />
              Pilih video Playly
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
