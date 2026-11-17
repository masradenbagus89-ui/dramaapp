// Dua keterangan sumber daftar (kunci API + katalog publik) jadi SATU blok.
//
// Owner 2026-11-17: keduanya masuk ke dalam ikon "?" di judul
// "Video dari Playly", jadi tidak mendorong tabel tiap halaman dibuka.
export default function KeteranganSumberPlayly({
  galat,
  dariKatalogPublik,
  akun,
  adaDaftar,
}: {
  /** Alasan daftar gagal diambil. null = pengambilan berhasil. */
  galat: string | null;
  /** true = daftar datang dari katalog publik, bukan kunci mitra. */
  dariKatalogPublik: boolean;
  akun: string[];
  /** false = tidak ada video yang bisa ditampilkan, jadi catatan "salinan
   *  terakhir" tidak berlaku — panel di bawah yang menampilkan alasannya. */
  adaDaftar: boolean;
}) {
  const tampilKunci = Boolean(galat) && adaDaftar;
  const tampilAkun = dariKatalogPublik && adaDaftar;
  if (!tampilKunci && !tampilAkun) return null;

  return (
    <section
      aria-label="Dari mana daftar video ini"
      className="space-y-3 border-b border-zinc-800 pb-3 text-sm leading-relaxed text-zinc-300"
    >
      {tampilKunci && (
        <p>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-amber-300">
            Kunci API
          </span>
          {galat} Daftar di bawah memakai salinan terakhir, jadi video yang
          baru di-upload mungkin belum muncul. Pengaturan yang kamu simpan di
          sini tetap aman.
        </p>
      )}
      {tampilAkun && (
        <p>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-sky-300">
            Akun
          </span>
          Disaring ke{" "}
          <strong className="text-zinc-100">{akun.join(", ")}</strong> dari
          katalog publik, karena kunci mitra belum diterima. Videonya tetap
          milik akun kita. Akun baru ditambah lewat{" "}
          <code className="text-zinc-200">PLAYLY_CREATOR</code> (dipisah koma)
          — menambah daftar, bukan menggantinya.
        </p>
      )}
    </section>
  );
}
