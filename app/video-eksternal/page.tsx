import type { Metadata } from "next";
import ExternalVideoBrowser from "@/app/components/ExternalVideoBrowser";
import { BADAN_TERANG_PENUH } from "@/app/components/beranda/shell";
import { cn } from "@/lib/utils";

// Halaman uji jalur video eksternal. Sengaja TIDAK diindeks mesin pencari
// (noindex): ini halaman pembuktian internal, bukan halaman tonton publik.
export const metadata: Metadata = {
  title: "Video dari API luar — DramaKu",
  description: "Halaman uji jalur penerima data video dari API pihak lain.",
  robots: { index: false, follow: false },
};

export default function VideoEksternalPage() {
  return (
    <main className={cn("min-h-screen", BADAN_TERANG_PENUH)}>
      <ExternalVideoBrowser />
    </main>
  );
}
