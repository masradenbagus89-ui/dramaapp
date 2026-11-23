"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { availableGenres } from "@/lib/beranda-catalog";
import { getYearOptions, SORT_OPTIONS } from "@/lib/discover";
import { labelGenre } from "@/lib/genre";
import { labelNegara } from "@/lib/negara";
import { opsiNegaraGabungan } from "@/lib/film-jelajah";
import type { Drama } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * POP UP "FILTER FILM" — beberapa pilihan diisi sekaligus, baru diterapkan.
 *
 * Owner 2026-11-23, menunjuk contoh gambar: *"ketika klik filter muncul pop up
 * tampilkan daftar film sesuai dengan kesukaan anda"*.
 *
 * ⚠️ BEDANYA dengan `FilterKatalog` yang sudah ada, dan kenapa keduanya hidup
 * berdampingan: `FilterKatalog` itu dropdown PINTASAN — satu ketukan = satu
 * penyaring, langsung pindah halaman. Yang ini FORMULIR — penonton menyusun
 * beberapa syarat dulu (genre + negara + tahun), baru menekan "Filter Movie"
 * sekali. Dua kebutuhan berbeda; menggabungkannya akan membuat pintasan
 * kehilangan kecepatannya ATAU formulir kehilangan gunanya.
 *
 * ⚠️ PILIHANNYA DIHITUNG DARI KATALOG NYATA, bukan daftar tulis-tangan — ini
 * aturan project sejak 2026-09-21: tombol yang diklik lalu memulangkan seluruh
 * katalog seolah bekerja LEBIH menyesatkan daripada tombol yang tidak ada.
 * Karena pop up ini dipanggil dari `BottomNav` (dipasang di `app/layout.tsx`,
 * yang tidak menerima data apa pun), katalognya diambil SAAT DIBUKA — bukan
 * ikut terkirim di tiap halaman.
 */

/** Nilai yang berarti "tidak menyaring" — sama dengan FILTER_KOSONG di lib/discover.ts. */
const KOSONG = "all";

type Pilihan = {
  sort: string;
  kind: string;
  cat: string;
  genre: string;
  negara: string;
  year: string;
};

const PILIHAN_AWAL: Pilihan = {
  sort: "populer",
  kind: "movie",
  cat: KOSONG,
  genre: KOSONG,
  negara: KOSONG,
  year: KOSONG,
};

/** Satu baris dropdown. Native `<select>`, bukan dropdown rakitan sendiri. */
function Pilih({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      {/* Label tetap ada untuk pembaca layar walau tak tergambar: tanpa ini
          enam dropdown terbaca sebagai enam kotak tanpa nama. */}
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        /* `<select>` BAWAAN BROWSER, bukan dropdown rakitan: di HP ia membuka
           pemilih milik sistem yang sudah dikenal jempol penonton, bisa
           digulir cepat, dan nol JavaScript tambahan. Enam dropdown rakitan
           di satu layar sempit = enam lapisan mengambang yang saling tumpang
           tindih. `min-h-11` menjaga target sentuh di atas ambang 44px. */
        className={cn(
          "min-h-11 w-full appearance-none rounded-lg border border-sage-300 bg-white",
          "px-3 py-2 pr-9 text-sm text-sage-900 outline-none",
          "focus-visible:border-sage-600 focus-visible:ring-2 focus-visible:ring-sage-300",
          // Panah sendiri, sebab `appearance-none` membuang panah bawaan.
          // ⚠️ Kelasnya didefinisikan di app/globals.css, BUKAN ditulis
          // sebagai `bg-[url('data:image/svg+xml…')]`: SVG-nya ber-spasi, dan
          // spasi di dalam className memecah nama kelas sehingga panahnya
          // tidak pernah tergambar — tanpa satu pun error. Itu yang terjadi
          // di versi pertama berkas ini.
          "panah-pilih",
        )}
      >
        {children}
      </select>
    </label>
  );
}

export default function FilterFilmPopup({
  terbuka,
  onTutup,
}: {
  terbuka: boolean;
  onTutup: () => void;
}) {
  const router = useRouter();
  const [pilihan, setPilihan] = useState<Pilihan>(PILIHAN_AWAL);
  const [katalog, setKatalog] = useState<Drama[] | null>(null);
  const [gagal, setGagal] = useState(false);

  /**
   * Katalog diambil SEKALI, saat pop up pertama kali dibuka.
   *
   * Bukan saat halaman dimuat: pop up ini hidup di bar bawah yang ada di SEMUA
   * halaman, jadi mengambilnya lebih awal berarti tiap pengunjung membayar
   * ongkos data untuk alat yang mungkin tak pernah ia buka.
   */
  useEffect(() => {
    if (!terbuka || katalog !== null) return;
    let batal = false;
    (async () => {
      try {
        const r = await fetch("/api/dramas");
        if (!r.ok) throw new Error(String(r.status));
        const data = await r.json();
        if (!batal) setKatalog(Array.isArray(data) ? data : (data?.dramas ?? []));
      } catch {
        // Gagal mengambil katalog BUKAN alasan menampilkan dropdown kosong
        // yang terlihat seperti "tidak ada genre sama sekali". Ditandai, lalu
        // pop up menjelaskannya apa adanya di bawah.
        if (!batal) setGagal(true);
      }
    })();
    return () => {
      batal = true;
    };
  }, [terbuka, katalog]);

  const genre = katalog ? availableGenres(katalog) : [];
  const tahun = katalog ? getYearOptions(katalog) : [];
  const negara = katalog ? opsiNegaraGabungan(katalog) : [];
  const siap = katalog !== null;

  function terapkan() {
    const params = new URLSearchParams();
    // Hanya yang BENAR-BENAR dipilih yang masuk alamat — nilai "all" dibuang,
    // persis aturan `tulisFilter` di lib/discover.ts. Alamat yang membawa
    // "genre=all" akan terbaca sebagai penyaring aktif oleh halaman tujuan.
    for (const [kunci, nilai] of Object.entries(pilihan)) {
      if (nilai && nilai !== KOSONG) params.set(kunci, nilai);
    }
    const q = params.toString();
    router.push(q ? `/discover?${q}` : "/discover");
    onTutup();
  }

  return (
    <Dialog open={terbuka} onOpenChange={(o) => !o && onTutup()}>
      <DialogContent
        /* Lebar mengikuti layar dengan sisa 2rem, bukan lebar tetap: di HP
           360px lebar tetap `max-w-md` (448px) akan terpotong di kedua sisi. */
        /* `text-sage-900` WAJIB di sini: isi dialog mewarisi warna teks tema
           situs yang TERANG (badan `<body>` gelap), jadi tanpa ini teks hitam
           di atas kartu putih ini jadi putih-di-atas-putih. Ketahuan saat
           tombol ✕ bawaan nyaris tak terlihat di potret uji. */
        className="w-[calc(100%-2rem)] max-w-sm gap-0 rounded-2xl border-sage-200 bg-white p-0 text-sage-900 sm:max-w-sm"
        /* ✕ bawaan DIMATIKAN: ukurannya 16px tanpa area ketuk, di bawah ambang
           44px yang dipakai sisa situs ini (rak a11y). "Batal" di dasar pop up
           sudah 44px dan NAMANYA jelas; menutup juga bisa lewat ketuk di luar
           kartu dan tombol Esc. Menambah ✕ kecil cuma menambah target yang
           gampang meleset. */
        showCloseButton={false}
      >
        <div className="p-5">
          <DialogTitle className="text-base font-bold text-sage-900">
            Filter Film
          </DialogTitle>
          <DialogDescription className="mt-1 text-[13px] leading-snug text-sage-700">
            Tampilkan daftar film sesuai dengan kesukaan anda.
          </DialogDescription>

          {gagal && !siap && (
            <p className="mt-4 rounded-lg bg-sage-100 px-3 py-2 text-[13px] text-sage-800">
              Daftar pilihan gagal diambil. Tutup lalu buka lagi, atau telusuri
              lewat menu katalog.
            </p>
          )}

          <div className="mt-4 grid gap-2.5">
            <Pilih
              label="Urutkan"
              value={pilihan.sort}
              onChange={(v) => setPilihan((p) => ({ ...p, sort: v }))}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Pilih>

            <Pilih
              label="Jenis tayangan"
              value={pilihan.kind}
              onChange={(v) => setPilihan((p) => ({ ...p, kind: v }))}
            >
              <option value="movie">Movie</option>
              <option value="series">Series</option>
              <option value={KOSONG}>Movie &amp; Series</option>
            </Pilih>

            {/* DUA kolom genre, dan itu bukan kembar: penyaring project ini
                memang punya dua lajur genre terpisah (`cat` = kategori kurasi
                admin, `genre` = genre sinema dari OMDb). Satu judul bisa
                "Romance" menurut kurasi tapi "Comedy" menurut OMDb. */}
            <Pilih
              label="Genre 1"
              value={pilihan.cat}
              onChange={(v) => setPilihan((p) => ({ ...p, cat: v }))}
            >
              <option value={KOSONG}>- Pilih Genre 1</option>
              {genre.map((g) => (
                <option key={g} value={g}>
                  {labelGenre(g)}
                </option>
              ))}
            </Pilih>

            <Pilih
              label="Genre 2"
              value={pilihan.genre}
              onChange={(v) => setPilihan((p) => ({ ...p, genre: v }))}
            >
              <option value={KOSONG}>- Pilih Genre 2</option>
              {genre.map((g) => (
                <option key={g} value={g}>
                  {labelGenre(g)}
                </option>
              ))}
            </Pilih>

            <Pilih
              label="Negara"
              value={pilihan.negara}
              onChange={(v) => setPilihan((p) => ({ ...p, negara: v }))}
            >
              <option value={KOSONG}>- Negara</option>
              {negara.map((n) => (
                <option key={n} value={n}>
                  {labelNegara(n)}
                </option>
              ))}
            </Pilih>

            <Pilih
              label="Tahun"
              value={pilihan.year}
              onChange={(v) => setPilihan((p) => ({ ...p, year: v }))}
            >
              <option value={KOSONG}>- Tahun</option>
              {tahun.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Pilih>
          </div>

          <div className="mt-5 flex items-center gap-2">
            <button
              type="button"
              onClick={terapkan}
              className="min-h-11 flex-1 rounded-lg bg-sage-600 px-4 text-sm font-bold text-white transition-colors outline-none hover:bg-sage-700 focus-visible:ring-2 focus-visible:ring-sage-800"
            >
              Filter Movie
            </button>
            <button
              type="button"
              onClick={onTutup}
              className="min-h-11 rounded-lg bg-sage-200 px-4 text-sm font-bold text-sage-900 transition-colors outline-none hover:bg-sage-300 focus-visible:ring-2 focus-visible:ring-sage-600"
            >
              Batal
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
