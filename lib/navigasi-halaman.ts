/**
 * SATU sumber kebenaran: halaman mana yang mendapat navigasi bawaan situs.
 *
 * Kenapa dipisah ke modul sendiri: aturan ini tadinya hidup terpisah di
 * `TopNav` dan `BottomNav` dengan daftar yang disalin. Kalau salah satu
 * bergeser sendiri, sebuah halaman bisa kehilangan SELURUH navigasinya di layar
 * komputer tanpa satu pun error (`BottomNav` cuma muncul di HP, `md:hidden`).
 *
 * ⚠️ BENTUKNYA ALLOWLIST — SENGAJA, JANGAN DIBALIK JADI DENYLIST LAGI.
 * Sampai 2026-09-22 aturannya berbunyi "sembunyikan di daftar ini, selain itu
 * TAMPILKAN". Itu gagal-terbuka: nilai `pathname` apa pun yang tak dikenali
 * membuat navigasi MUNCUL. Terbukti merugikan — HTML produksi halaman depan
 * menggambar navbar hitam DI ATAS bar cari merah, jadi penonton melihat dua
 * baris kepala lalu salah satunya hilang sendiri begitu JavaScript aktif.
 * Reproduksi: `usePathname()` bernilai `""` atau `"/index"` lolos SEMUA
 * penyaring lama, dan `?? "/"` tidak menolongnya karena `??` hanya menangkap
 * `null`/`undefined` — bukan string kosong.
 * Arah gagal allowlist jauh lebih aman: nilai aneh = navigasi diam, lalu muncul
 * normal begitu halaman aktif. Diam jauh lebih baik daripada berkedip.
 */

/**
 * Halaman yang navbar hitam atasnya (`TopNav`) WAJIB tergambar — di sana ia
 * satu-satunya navigasi di layar komputer.
 *
 * Ditulis sebagai akar segmen: `/admin` mencakup seluruh halaman admin,
 * `/profile` mencakup halaman di bawahnya. Pencocokannya per-segmen (lihat
 * `cocok`), jadi sebuah akar TIDAK ikut mencocoki alamat lain yang cuma
 * berawalan sama (`/shorts` bukan `/shortsan`).
 *
 * `/lupa-password` & `/video-eksternal` ada di sini karena memang begitu
 * perilakunya di produksi saat daftar ini dibuat (diukur satu per satu
 * 2026-09-22) — dipertahankan apa adanya, bukan keputusan baru.
 */
export const AKAR_BERNAVBAR_ATAS = [
  "/shorts",
  "/my-list",
  "/profile",
  "/history",
  // Halaman KERJA admin — sengaja TETAP bernavbar hitam. Ia bukan halaman
  // penonton, jadi tidak ikut diseragamkan dengan Home 2026-10-29; bar cari
  // katalog di atas panel admin cuma menawarkan hal yang tak ada hubungannya
  // dengan pekerjaan di situ.
  "/admin",
  "/video-eksternal",
  "/lupa-password",
] as const;

/**
 * Halaman FILM: kepala situsnya bar cari merah-pink + strip kuning yang SAMA
 * dengan Home, dipasang masing-masing lewat `<KepalaFilm />`
 * (app/components/beranda/KepalaFilm.tsx).
 *
 * Dipindahkan ke sini dari `AKAR_BERNAVBAR_ATAS` pada 2026-10-29 atas arahan
 * Kang Dedi lewat owner: *"halaman header + sidebar-nya berbeda dengan yang di
 * Home."* Keempatnya memang halaman yang dibuka penonton begitu sebuah film
 * diklik, jadi di situlah perbedaan kepala situs paling terasa.
 *
 * ⚠️ Kenapa dipisah dari `AKAR_BERBAR_CARI` dan bukan digabung: kedua kelompok
 * memang sama-sama tidak ber-navbar hitam, TAPI sumber kepalanya berbeda —
 * /beranda & /discover merakitnya sendiri di dalam komponen katalognya,
 * sedangkan keempat halaman ini memanggil `<KepalaFilm />`. Menggabungkannya
 * akan menghapus perbedaan yang justru perlu terlihat saat ada yang menelusuri
 * "kenapa halaman ini tidak punya kepala".
 */
export const AKAR_BERKEPALA_FILM = [
  // Halaman detail drama — yang ditunjuk Kang Dedi di tangkapan layarnya.
  "/drama",
  // Daftar lengkap film & video. Alamatnya pindah dari "/playly" 2026-09-26
  // (owner: nama penyedia tak boleh terlihat penonton, termasuk di kotak
  // alamat browser). Alamat lama tetap hidup lewat redirect permanen di
  // next.config.ts, jadi ia TIDAK perlu didaftarkan lagi di sini — permintaan
  // ke /playly tidak pernah sampai ke komponen navigasi.
  "/film",
  // Halaman katalog per-tab (owner 2026-09-26): tiap tab di beranda membuka
  // halaman ini.
  "/katalog",
  // Halaman tonton satu video (owner 2026-09-26). Ia berbentuk halaman biasa —
  // pemutar di tengah, keterangan di bawahnya — BUKAN layar pemutar penuh
  // seperti /watch & /feed, jadi kepala situs di atasnya tidak menutupi video.
  "/tonton",
] as const;

/**
 * Halaman berkatalog: kepala situsnya dipegang bar cari merah
 * (`app/components/beranda/KepalaKatalog.tsx`) — logo, menu garis-tiga, dan
 * tombol akun semuanya ada di sana, jadi navbar hitam sengaja TIDAK dipasang.
 * Navigasi bawah di HP tetap dapat, sebab bar merah itu tak menggantikannya.
 */
export const AKAR_BERBAR_CARI = ["/beranda", "/discover"] as const;

/**
 * Halaman yang SENGAJA tanpa navigasi bawaan, beserta alasannya. Didaftar
 * eksplisit supaya halaman BARU yang belum diklasifikasi bisa ditangkap tes
 * (`tests/kepala-situs.test.ts` menyusuri `app/**​/page.tsx` di disk) — bukan
 * lolos diam-diam tanpa navigasi.
 *
 * Kuncinya ditulis sebagai pola route Next (`[id]`), sama dengan nama foldernya.
 */
export const TANPA_NAVIGASI_SENGAJA: Record<string, string> = {
  "/": "kepalanya bar cari merah + strip katalog (PublicTopBars)",
  "/login": "header & logo milik halamannya sendiri (app/login/page.tsx:85)",
  "/daftar": "header & logo milik halamannya sendiri (app/daftar/page.tsx:89)",
  "/watch/[id]/[ep]": "layar pemutar — navigasi menutupi video",
  "/feed/[id]": "layar pemutar geser — navigasi menutupi video",
};

/**
 * Cocok kalau `pathname` PERSIS sama dengan salah satu akar, atau berada di
 * bawahnya sebagai segmen utuh. Dipakai `===` + `"/"` alih-alih `startsWith`
 * mentah supaya `/drama` tidak ikut mencocoki `/dramaku`.
 */
function cocok(pathname: string, daftarAkar: readonly string[]): boolean {
  return daftarAkar.some(
    (akar) => pathname === akar || pathname.startsWith(`${akar}/`),
  );
}

/** Navbar hitam atas (`TopNav`) tergambar di alamat ini? */
export function punyaNavbarAtas(pathname: string): boolean {
  return cocok(pathname, AKAR_BERNAVBAR_ATAS);
}

/**
 * Navigasi bawah (`BottomNav`, hanya tampil di HP) tergambar di alamat ini?
 * Halaman berbar-cari ikut dapat — bar merah menggantikan navbar ATAS saja.
 */
export function punyaNavigasiBawah(pathname: string): boolean {
  return (
    cocok(pathname, AKAR_BERNAVBAR_ATAS) ||
    cocok(pathname, AKAR_BERBAR_CARI) ||
    // WAJIB ikut: keempat halaman film pindah keluar dari AKAR_BERNAVBAR_ATAS
    // pada 2026-10-29. Tanpa baris ini mereka kehilangan menu bawah di HP —
    // kerusakan SENYAP, sebab di layar komputer semuanya terlihat normal.
    cocok(pathname, AKAR_BERKEPALA_FILM)
  );
}

/** Halaman ini memakai kepala situs ala Home (`<KepalaFilm />`)? */
export function punyaKepalaFilm(pathname: string): boolean {
  return cocok(pathname, AKAR_BERKEPALA_FILM);
}
