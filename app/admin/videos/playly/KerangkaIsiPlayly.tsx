// Isi yang tampil SELAGI daftar film masih diambil.
//
// Bukan loading.tsx: berkas itu terkirim sebelum cookie admin diperiksa, jadi
// tidak boleh menyebut IMDb. Komponen ini hanya dipasang sesudah
// PlaylyVideosPage memastikan sesinya sah, jadi judul bagian boleh tertulis.
import KerangkaBagianAdmin from "@/app/components/admin/KerangkaBagianAdmin";
import {
  KETERANGAN_BAGIAN_PLAYLY,
  JUDUL_BAGIAN_PLAYLY,
} from "@/lib/bagian-playly";

export default function KerangkaIsiPlayly() {
  return (
    <KerangkaBagianAdmin
      kategori="Konten"
      judul={JUDUL_BAGIAN_PLAYLY.imdb}
      keterangan={KETERANGAN_BAGIAN_PLAYLY.imdb}
      status="Daftar film sedang diambil."
    />
  );
}
