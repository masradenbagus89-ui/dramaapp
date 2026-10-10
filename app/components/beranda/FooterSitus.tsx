import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

/**
 * Kaki situs halaman depan — empat kolom: tentang, jelajahi, genre populer,
 * dan disclaimer (owner 2026-10-10, mencontoh situs katalog pembanding).
 *
 * Menggantikan kaki lama yang isinya cuma satu baris "© 2026 DramaKu ·
 * Prototype". Fungsinya bukan hiasan: penonton yang sudah menggulir sampai
 * dasar halaman kehabisan jalan, dan daftar tautan di sini mengembalikannya ke
 * katalog alih-alih menutup tab.
 *
 * Latarnya SENGAJA tetap gelap. Ia berada DI LUAR pembungkus `tema-terang`
 * milik badan halaman (app/page.tsx), jadi halaman ditutup dengan warna yang
 * sama seperti hero di puncaknya.
 *
 * Komponen SERVER tanpa state: isinya tautan statis + daftar genre yang
 * dihitung halaman. Tak ada alasan mengirimkan JavaScript apa pun untuk ini.
 */

/**
 * Berapa genre yang dipajang. Lebih dari ini kolomnya jadi daftar panjang yang
 * justru menenggelamkan tiga kolom lain; sisanya tetap terjangkau lewat tombol
 * FILTER dan /discover.
 */
const MAKS_GENRE = 6;

/**
 * Tahun di baris hak cipta. Ditulis TETAP, bukan `new Date().getFullYear()`:
 * halaman ini disimpan hasil render-nya (`revalidate = 60`), jadi angka yang
 * dihitung saat build akan membeku di tahun itu juga — tapi dengan tampilan
 * seolah-olah selalu benar. Lebih jujur satu angka yang jelas terlihat kalau
 * basi daripada angka yang salah diam-diam tiap pergantian tahun.
 */
const TAHUN_RILIS = 2026;

/**
 * Isi kolom "Jelajahi". Ditulis sebagai data, bukan deretan <li> di markup,
 * supaya menambah/menghapus satu tautan tidak menyentuh tata letaknya sama
 * sekali — dan supaya alamatnya bisa dibaca sekali pandang saat ada halaman
 * yang pindah alamat.
 */
const TAUTAN_JELAJAHI: { label: string; href: string }[] = [
  { label: "Beranda", href: "/" },
  { label: "Film & Video", href: "/film" },
  { label: "Series Update", href: "/katalog?tab=update" },
  { label: "Terpopuler", href: "/katalog?tab=terpopuler" },
  { label: "Rekomendasi", href: "/katalog?tab=rekomendasi" },
  { label: "Cari & Saring", href: "/discover" },
];

/**
 * Kelas satu tautan di kolom kaki situs.
 *
 * `min-h-11` (±44px) hanya berlaku di HP: itu batas target sentuh yang masih
 * nyaman ditekan jari (skills/a11y). Di layar lebar penunjuknya mouse yang
 * jauh lebih presisi, jadi daftarnya dirapatkan — kalau tidak, empat kolom
 * kaki situs saja sudah setinggi satu layar penuh.
 */
const KELAS_TAUTAN =
  "flex min-h-11 items-center text-zinc-400 transition-colors hover:text-amber-400 md:min-h-0 md:py-1";

export default function FooterSitus({ genres }: { genres: string[] }) {
  const genrePopuler = genres.slice(0, MAKS_GENRE);

  return (
    <footer className="border-t border-zinc-800 bg-zinc-950">
      <div className="shell-wide mx-auto px-4 py-10 md:px-6">
        <div className="grid gap-8 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {/* ---- 1. Tentang ---- */}
          <section>
            <JudulKolom>{`Tentang ${SITE_NAME}`}</JudulKolom>
            <p className="mt-3 leading-relaxed text-zinc-400">
              {SITE_NAME} adalah katalog nonton drama China dan film sub Indo
              yang bisa langsung diputar, gratis, di HP maupun komputer. Koleksi
              drama pendek, serial yang masih berjalan, sampai film layar lebar
              — dengan pencarian dan penyaring genre di satu tempat.
            </p>
          </section>

          {/* ---- 2. Jelajahi ---- */}
          <nav aria-label="Jelajahi">
            <JudulKolom>Jelajahi</JudulKolom>
            <ul className="mt-2">
              {TAUTAN_JELAJAHI.map((t) => (
                <li key={t.href}>
                  <Link href={t.href} className={KELAS_TAUTAN}>
                    {t.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* ---- 3. Genre populer ----
                 Dihitung dari katalog NYATA, bukan daftar genre tetap: genre
                 kosong yang diklik memulangkan halaman hampa, dan itu terbaca
                 seperti situs rusak. Katalog belum berisi apa pun -> kolomnya
                 tidak digambar sama sekali, bukan dipajang kosong. */}
          {genrePopuler.length > 0 && (
            <nav aria-label="Genre populer">
              <JudulKolom>Genre Populer</JudulKolom>
              <ul className="mt-2">
                {genrePopuler.map((g) => (
                  <li key={g}>
                    <Link
                      href={`/discover?cat=${encodeURIComponent(g)}`}
                      className={KELAS_TAUTAN}
                    >
                      {g}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {/* ---- 4. Disclaimer ----
                 Sengaja TIDAK memuat klaim hukum yang belum diperiksa owner
                 (mis. "kami tidak menyimpan berkas video"). Yang ditulis di
                 sini hanya yang terbukti dari cara situs ini bekerja: video
                 ditayangkan lewat penyedia pihak ketiga. Owner tinggal
                 menyunting paragraf ini kalau perlu kalimat resmi. */}
          <section>
            <JudulKolom>Disclaimer</JudulKolom>
            <p className="mt-3 leading-relaxed text-zinc-400">
              {SITE_NAME} menayangkan video dari penyedia pihak ketiga. Hak
              cipta tiap judul, sampul, dan cuplikan tetap milik pemiliknya
              masing-masing. Situs ini dipakai untuk keperluan hiburan dan
              katalog.
            </p>
          </section>
        </div>

        <div className="mt-8 border-t border-zinc-800 pt-5 text-center text-xs text-zinc-500">
          <p>
            © {TAHUN_RILIS} {SITE_NAME}. Seluruh hak cipta judul ada pada
            pemiliknya.
          </p>
        </div>
      </div>
    </footer>
  );
}

/** Judul kolom — bergaris bawah pendek, pola yang sama di keempat kolom. */
function JudulKolom({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="relative pb-2 text-sm font-bold uppercase tracking-wide text-white">
      {children}
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-0.5 w-10 bg-amber-400"
      />
    </h2>
  );
}
