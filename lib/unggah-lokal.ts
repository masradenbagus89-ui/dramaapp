// Aturan: kapan menulis berkas unggahan ke DISK SERVER boleh dilakukan.
//
// ═══════════════════════════════════════════════════════════════════════════
// KENAPA BERKAS INI ADA — sebuah pengaman yang kedaluwarsa tanpa ada yang tahu
//
// `app/api/admin/upload/route.ts` menulis video & poster ke `public/videos`.
// Selama situs ini di Vercel, keselamatannya bersandar pada satu fakta
// platform: filesystem Vercel READ-ONLY, jadi di produksi route itu GAGAL
// KERAS dan tak seorang pun bisa memakainya tanpa sadar.
//
// Pindah ke Railway MENCABUT fakta itu — disk container BISA ditulis. Tanpa
// pagar, perilakunya berubah diam-diam ke arah yang lebih buruk:
//
//   dulu (Vercel) : unggah GAGAL -> admin langsung tahu, cari jalan lain
//   kini (Railway): unggah BERHASIL -> berkasnya HILANG saat deploy berikutnya,
//                   sementara entri dramanya tetap tertinggal di database
//
// Hasil akhirnya katalog yang menunjuk video yang sudah tidak ada — dan tak ada
// pesan error di mana pun, karena tidak ada yang gagal. Itu bentuk kerusakan
// yang baru ketahuan dari penonton.
//
// Ada efek ikutan yang memperburuk: `app/api/download/route.ts` punya jalur
// cadangan yang menyajikan berkas dari `public/videos` kalau tunnel PC backup
// sedang mati. Hari ini folder itu KOSONG di container (nol berkas ter-track di
// git), jadi jalur itu tak pernah aktif. Unggahan yang berhasil akan MENGISINYA
// — menghidupkan jalur yang selama ini mati, dengan isi yang akan lenyap.
//
// KENAPA memagari, bukan menghapus route-nya: route itu masih berguna di
// komputer sendiri (nol pemanggil di UI, tapi `presentasi/` masih menyebutnya
// sebagai kemampuan). Memagari memulihkan pengaman yang hilang tanpa
// menghilangkan kemampuan apa pun. Kalau nanti diputuskan memang mati, hapus
// route + berkas ini sekalian.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Boleh menulis unggahan ke disk server?
 *
 * @param opsi.produksi `process.env.NODE_ENV === "production"`.
 *   Di Railway nilainya BENAR walau `NODE_ENV` tak pernah diisi di panel —
 *   Next.js menyetelnya sendiri saat runtime produksi, dan itu sudah terbukti
 *   di project ini (docs/migrasi-railway-daftar-env.md, "Keputusan teknis saat
 *   eksekusi": pagar produksi memicu padahal variabelnya belum diset).
 *   Dioper sebagai argumen, bukan dibaca di dalam, supaya bisa diuji.
 * @returns pesan penolakan untuk ditampilkan ke admin, atau `null` kalau boleh.
 */
export function alasanTolakUnggahKeDisk(opsi: { produksi: boolean }): string | null {
  if (!opsi.produksi) return null;

  return (
    "Unggah video lewat jalur ini hanya tersedia di komputer sendiri, bukan di server. " +
    "Disk server bersifat sementara: berkasnya akan hilang pada deploy berikutnya, " +
    "sementara data dramanya tetap tertinggal di database — jadi katalog akan menunjuk " +
    "video yang sudah tidak ada, tanpa pesan error. Pakai panel admin yang biasa " +
    "(/admin) untuk menambah drama, dan tautkan videonya lewat PC backup."
  );
}
