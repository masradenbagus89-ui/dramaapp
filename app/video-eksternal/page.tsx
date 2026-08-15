import type { Metadata } from "next";
import ExternalVideoBrowser from "@/app/components/ExternalVideoBrowser";

// Halaman uji jalur video eksternal. Sengaja TIDAK diindeks mesin pencari
// (noindex): ini halaman pembuktian internal, bukan halaman tonton publik.
export const metadata: Metadata = {
  title: "Video dari API luar — DramaKu",
  description: "Halaman uji jalur penerima data video dari API pihak lain.",
  robots: { index: false, follow: false },
};

export default function VideoEksternalPage() {
  return (
    <main className="min-h-screen bg-zinc-950">
      <ExternalVideoBrowser />
    </main>
  );
}
