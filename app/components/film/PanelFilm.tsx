import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

/** Satu baris daftar film di kolom sempit. */
export type BarisFilm = {
  id: string;
  judul: string;
  href: string;
  gambar: string | null;
  /** Genre/negara, atau keterangan singkat lain. */
  keterangan?: string;
  /** Baris kecil paling bawah, mis. "1.2K ditonton" atau "1:30:18". */
  jejak?: string;
};

/**
 * Daftar film berjudul untuk kolom sempit — dipakai DUA kali di halaman film
 * dengan tampilan berbeda:
 *
 *   • "FILM TERKAIT" di dalam bingkai pemutar — `gelap` + `gulung`
 *     (owner 2026-10-29: *"film yang diputar jadi satu bingkai dengan film
 *     terkait"*, mencontoh situs pembanding).
 *   • "TERPOPULER" di bawah bingkai — terang, mengalir apa adanya.
 *
 * SATU komponen untuk keduanya, bukan dua yang mirip: daftar film di repo ini
 * sudah tiga kali menyimpang saat disalin (riwayatnya di KepalaKatalog.tsx).
 * Yang membedakan cuma dua saklar tampilan di bawah.
 */
export default function PanelFilm({
  judul,
  items,
  gelap = false,
  gulung = false,
}: {
  judul: string;
  items: BarisFilm[];
  /** Untuk dipasang di atas latar gelap (di dalam bingkai pemutar). */
  gelap?: boolean;
  /**
   * Daftarnya digulung SENDIRI di dalam kotaknya, mengikuti tinggi bingkai.
   *
   * Hanya berlaku di layar lebar (`lg`). Di layar sempit panel ini turun ke
   * BAWAH pemutar, dan di sana menguncinya pada tinggi tetap justru memasang
   * area gulung di dalam halaman yang juga digulung — dua gulungan bersarang
   * adalah salah satu hal yang paling membingungkan di HP.
   */
  gulung?: boolean;
}) {
  // Daftar kosong = panel tidak digambar sama sekali. Judul seksi di atas
  // ruang hampa terbaca seperti halaman gagal muat.
  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby={`panel-${judul.toLowerCase().replace(/\s+/g, "-")}`}
      className={cn("flex min-h-0 w-full flex-col", gelap && "lg:h-full")}
    >
      <h2
        id={`panel-${judul.toLowerCase().replace(/\s+/g, "-")}`}
        className={cn(
          "shrink-0 border-b-2 pb-2 text-sm font-extrabold uppercase tracking-wide",
          gelap
            ? "border-rose-600 px-3 pt-3 text-white"
            : "border-rose-600 text-zinc-900",
        )}
      >
        {judul}
      </h2>

      {/* Pembungkus gulung TERPISAH dari judul, dan itu disengaja: judulnya
          harus tetap terlihat saat daftarnya digulung — kalau ikut tergulung,
          penonton kehilangan konteks begitu menggulir satu baris. */}
      <ul
        className={cn(
          "min-h-0 space-y-3",
          gelap ? "px-3 py-3" : "mt-3",
          gulung &&
            // `overflow-y-auto` + `flex-1` di layar lebar: tingginya diisi oleh
            // sisa ruang bingkai, jadi daftar mengunci diri pada tinggi pemutar
            // berapa pun panjang isinya. Di bawah `lg` ia mengalir normal.
            "lg:flex-1 lg:overflow-y-auto",
        )}
      >
        {items.map((f) => (
          <li key={f.id}>
            <Link
              href={f.href}
              className={cn(
                "group flex gap-3 rounded-md p-1 transition-colors",
                gelap ? "hover:bg-white/10" : "hover:bg-zinc-100",
              )}
            >
              <div
                className={cn(
                  "relative h-16 w-12 shrink-0 overflow-hidden rounded",
                  gelap ? "bg-zinc-800" : "bg-zinc-200",
                )}
              >
                {f.gambar ? (
                  <Image
                    src={f.gambar}
                    alt={f.judul}
                    fill
                    /* Petak tetap & kecil — `sizes` dibatasi supaya browser
                       tidak mengunduh poster ukuran penuh untuk kotak 48px. */
                    sizes="48px"
                    className="object-cover"
                  />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "line-clamp-2 text-sm font-semibold group-hover:underline",
                    gelap ? "text-white" : "text-rose-700",
                  )}
                >
                  {f.judul}
                </p>
                {f.keterangan && (
                  <p
                    className={cn(
                      "mt-0.5 line-clamp-2 text-[11px] leading-snug",
                      gelap ? "text-zinc-400" : "text-zinc-500",
                    )}
                  >
                    {f.keterangan}
                  </p>
                )}
                {f.jejak && (
                  <p
                    className={cn(
                      "mt-0.5 text-[11px]",
                      gelap ? "text-zinc-500" : "text-zinc-400",
                    )}
                  >
                    {f.jejak}
                  </p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
