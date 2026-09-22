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
 * Ditulis sebagai akar segmen: `/drama` mencakup `/drama/<judul>`, `/admin`
 * mencakup seluruh halaman admin. Pencocokannya per-segmen (lihat `cocok`),
 * jadi `/drama` TIDAK ikut mencocoki alamat lain yang cuma berawalan sama.
 *
 * `/lupa-password` & `/video-eksternal` ada di sini karena memang begitu
 * perilakunya di produksi saat daftar ini dibuat (diukur satu per satu
 * 2026-09-22) — dipertahankan apa adanya, bukan keputusan baru.
 */
export const AKAR_BERNAVBAR_ATAS = [
  "/shorts",
  "/playly",
  "/my-list",
  "/profile",
  "/history",
  "/admin",
  "/drama",
  "/video-eksternal",
  "/lupa-password",
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
    cocok(pathname, AKAR_BERNAVBAR_ATAS) || cocok(pathname, AKAR_BERBAR_CARI)
  );
}
