import Link from "next/link";
import { getPlaylyKeyStatus, DEFAULT_PLAYLY_API_URL } from "@/lib/playly";
import PlaylyKeyForm from "@/app/components/admin/PlaylyKeyForm";
import { Button } from "@/components/ui/button";
import { Film } from "lucide-react";

/** Form kunci. Dipanggil di dalam Suspense supaya judul halaman tidak menunggu database. */
export default async function IsiKunciPlayly({ email }: { email: string }) {
  let status;
  try {
    status = await getPlaylyKeyStatus();
  } catch (err) {
    console.warn(
      "[admin] status kunci Playly gagal dibaca:",
      err instanceof Error ? err.name : "unknown",
    );
    return (
      <p role="alert" className="text-sm text-rose-300">
        Status kunci belum terbaca. Muat ulang halaman ini.
      </p>
    );
  }

  const apiUrl = process.env.PLAYLY_API_URL?.trim() || DEFAULT_PLAYLY_API_URL;

  return (
    <>
      <PlaylyKeyForm initialStatus={status} apiUrl={apiUrl} adminEmail={email} />

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-sm font-bold text-white">Langkah berikutnya</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Setelah kunci tersimpan dan uji sambungan berhasil, pilih video mana
          yang mau ditampilkan di Layarindo.
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
    </>
  );
}
