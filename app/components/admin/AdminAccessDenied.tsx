// Layar "akses ditolak" untuk halaman admin.
//
// Dipisah supaya halaman-halaman admin yang dijaga di SERVER (setelan Playly,
// pilih video Playly) memakai tampilan yang sama persis, tanpa menyalin markup.
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

export default function AdminAccessDenied({
  alasan,
}: {
  /** Kalimat tambahan yang menjelaskan kenapa ditolak (opsional). */
  alasan?: string;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 text-red-400">
        <Lock className="h-7 w-7" aria-hidden="true" />
      </div>
      <h1 className="text-xl font-bold text-white">Akses ditolak</h1>
      <p className="text-sm text-zinc-400">
        {alasan ??
          "Halaman ini hanya untuk admin. Login dengan email yang sudah terdaftar di daftar admin DramaKu untuk mengakses."}
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Button
          asChild
          className="rounded-full bg-amber-400 px-5 text-sm font-bold text-black hover:bg-amber-300"
        >
          <Link href="/login">Masuk sebagai admin</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full px-5 text-sm font-semibold">
          <Link href="/beranda">← Kembali ke Beranda</Link>
        </Button>
      </div>
    </div>
  );
}
