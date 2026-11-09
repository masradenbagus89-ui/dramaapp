import EpisodeList from "@/app/components/EpisodeList";

/**
 * Daftar episode untuk KOLOM SEMPIT di dalam bingkai hero halaman drama.
 *
 * Dibuat 2026-11-02 atas permintaan owner: *"tukar tempat drama terkait
 * menjadi drama episode ... agar ketika di hp penonton tidak scroll ke bawah
 * bisa langsung ditonton."* Sebelumnya slot ini diisi "Drama Terkait", dan di
 * HP kolom kanan turun ke BAWAH hero — artinya 20 judul lain plus sinopsis
 * harus dilewati dulu sebelum penonton menemukan episode yang mau ditonton.
 *
 * Kerangkanya SENGAJA meniru PanelFilm (judul tetap di atas + daftar yang
 * digulung sendiri di layar lebar), bukan gaya baru: keduanya duduk di slot
 * yang sama persis, jadi beda gaya akan terbaca seperti halaman yang tidak
 * selesai dirapikan. Yang tidak ditiru hanya ISI barisnya — episode punya
 * penanda "sudah/sedang ditonton" yang judul lain tidak punya.
 *
 * ⚠️ `lg:h-full` + `lg:flex-1 lg:overflow-y-auto` pada daftarnya WAJIB
 * berpasangan dengan `lg:absolute lg:inset-0` di induknya (halaman drama).
 * Tanpa induk itu, serial 40+ episode MEMANJANGKAN bingkai hitam sampai hero
 * terlihat mengambang di kotak kebesaran — alasan lengkapnya sudah ditulis
 * sekali di app/tonton/[id]/page.tsx.
 *
 * Gulungan HANYA di `lg`: di HP panel ini mengalir apa adanya. Mengunci tinggi
 * di layar sentuh memasang area gulung DI DALAM halaman yang juga digulung,
 * dan gulungan bersarang adalah hal yang paling sering membuat jari penonton
 * "nyangkut" (pagar yang sama dipakai PanelFilm).
 */
export default function PanelEpisode({
  dramaId,
  episodes,
  posterImage,
  title,
  durasiBaku = null,
}: {
  dramaId: string;
  episodes: number;
  posterImage?: string;
  title: string;
  /** Durasi per episode dari kolom Durasi drama — diteruskan apa adanya. */
  durasiBaku?: string | null;
}) {
  // Nol episode = panel tidak digambar sama sekali. Judul "EPISODE" di atas
  // ruang hampa terbaca seperti halaman gagal muat.
  if (episodes <= 0) return null;

  return (
    <section
      aria-labelledby="panel-episode"
      className="flex min-h-0 w-full flex-col lg:h-full"
    >
      {/* Judul DI LUAR area gulung: kalau ikut tergulung, penonton kehilangan
          konteks begitu menggulir satu baris. */}
      <h2
        id="panel-episode"
        className="shrink-0 border-b-2 border-rose-600 px-3 pb-2 pt-3 text-sm font-extrabold uppercase tracking-wide text-white"
      >
        Episode
      </h2>

      <EpisodeList
        dramaId={dramaId}
        episodes={episodes}
        posterImage={posterImage}
        title={title}
        durasiBaku={durasiBaku}
        ringkas
        className="min-h-0 px-3 py-3 lg:flex-1 lg:overflow-y-auto"
      />
    </section>
  );
}
