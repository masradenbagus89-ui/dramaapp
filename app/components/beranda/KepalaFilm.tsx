import { getAllDramasCachedSafe } from "@/lib/dramas";
import { getPlaylyVideosGabunganCached } from "@/lib/playly-gabungan";
import { buildNavMenus } from "@/lib/nav-katalog";
import KepalaBeranda from "./KepalaBeranda";

/**
 * KEPALA SITUS untuk halaman FILM — `/drama/[id]`, `/tonton/[id]`, `/film`,
 * `/katalog`.
 *
 * KENAPA ADA (arahan Kang Dedi lewat owner, 2026-10-29): *"ketika filmnya
 * diklik maka masuk ke halaman FILM, akan tetapi header + sidebar-nya berbeda
 * dengan yang di Home — HOME warnanya pink + kuning + putih, halaman nonton
 * DARK/gelap."* Keluhannya benar dan terverifikasi: keempat halaman di atas
 * memakai navbar HITAM (`TopNav`), sedangkan `/` dan `/beranda` memakai bar
 * cari merah-pink + strip kuning. Dua kepala situs yang berbeda di satu situs
 * membuat halaman film terasa seperti situs lain.
 *
 * YANG DIPAKAI DI SINI BUKAN SALINAN. Komponennya `KepalaBeranda` — berkas yang
 * SAMA PERSIS dengan yang menggambar kepala `/beranda`. Itu syarat, bukan
 * kebetulan: susunan kepala situs di repo ini sudah TIGA KALI menyimpang
 * diam-diam ketika disalin (logo, lalu tulisan kotak cari dua kali — riwayatnya
 * ada di KepalaKatalog.tsx). Satu sumber = mustahil menyimpang lagi.
 *
 * Tugas berkas ini karena itu cuma SATU: menyediakan isi menu katalog, yang
 * harus dihitung di server dari katalog. Dibungkus di sini supaya keempat
 * halaman cukup menulis `<KepalaFilm />` dan tidak masing-masing mengulang
 * pembacaan + `buildNavMenus`.
 *
 * ⚠️ YANG SENGAJA TIDAK IKUT TERANG: badan halamannya (poster, sinopsis, daftar
 * episode) TETAP gelap, dan layar pemutar `/watch/[id]/[ep]` tidak disentuh
 * sama sekali. Keduanya keputusan owner 2026-10-29 — poster film tampil jauh
 * lebih baik di latar gelap, dan kepala situs di atas layar pemutar akan
 * menutupi video. `/admin` juga tetap bernavbar hitam: itu halaman kerja, bukan
 * halaman penonton.
 */
export default async function KepalaFilm() {
  /**
   * `...CachedSafe` adalah SYARAT di sini, bukan pilihan gaya:
   *
   * • `Cached` — keempat halaman pemakainya ber-`revalidate`. Satu pembacaan
   *   `no-store` saja membuat halamannya dibangun ulang untuk TIAP pengunjung
   *   (pelajaran yang sudah tercatat di app/beranda/page.tsx).
   * • `Safe` — fungsi ini tidak pernah melempar. Kepala situs yang menjatuhkan
   *   seluruh halaman drama hanya karena daftar menunya gagal dibaca adalah
   *   pertukaran yang salah: katalog mati = menunya mengecil sendiri
   *   (`buildNavMenus` membuang menu yang kosong), halamannya tetap tampil.
   */
  const dramas = await getAllDramasCachedSafe();
  // Film ikut dihitung supaya menu Negara di kepala halaman ini sama isinya
  // dengan halaman lain — kalau tidak, penonton melihat daftar negara yang
  // berbeda tergantung halaman mana yang sedang dibuka.
  //
  // `.catch` WAJIB di sini dengan alasan yang sama seperti `...Safe` di atas:
  // daftar film yang gagal dibaca tidak boleh menjatuhkan kepala situs. Gagal =
  // menu Negara mengecil ke isi katalog drama, halamannya tetap tampil.
  const { videos } = await getPlaylyVideosGabunganCached().catch(() => ({
    videos: [],
  }));
  return <KepalaBeranda menus={buildNavMenus(dramas, videos)} />;
}
