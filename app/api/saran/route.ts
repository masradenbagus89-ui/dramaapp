import { NextResponse } from "next/server";
import { getAllDramasCachedSafe } from "@/lib/dramas";
import { getPlaylyVideosGabunganCached } from "@/lib/playly-gabungan";
import { rakitIndeksSaran } from "@/lib/saran-cari";

export const runtime = "nodejs";
// Disimpan & dipakai ulang 60 detik — sama dengan halaman depan. Indeks ini
// cuma judul + poster, jadi basi semenit tidak merugikan siapa pun.
export const revalidate = 60;

/**
 * GET /api/saran — indeks judul untuk saran-saat-mengetik, siap pakai.
 *
 * KENAPA ADA (owner 2026-11-13): kotak cari di navbar hitam (`TopNav`) adalah
 * SATU-SATUNYA kotak cari di halaman /film, /katalog, /profile, dan seluruh
 * panel admin — tapi ia tidak punya daftar saran, sementara kotak cari di
 * beranda punya. Owner menemukannya saat mengaudit keseragaman pencarian:
 * "search yang ini belum berfungsi kamu seragamkan".
 *
 * Halaman publik merakit indeksnya di SERVER dari katalog yang memang sudah
 * mereka ambil. `TopNav` tidak bisa begitu — ia dirender dari `app/layout.tsx`
 * yang berlaku untuk SEMUA halaman, jadi mengambil katalog di sana berarti
 * tiap halaman (termasuk panel admin dan halaman error) ikut menunggu katalog
 * yang tak pernah dipakainya. Endpoint ini jalan keluarnya: `TopNav`
 * memanggilnya HANYA saat penonton benar-benar mulai mengetik, jadi biayanya
 * nol sampai fiturnya dipakai.
 *
 * Memulangkan indeks JADI, bukan katalog mentah: bentuk yang sama dengan yang
 * dipakai halaman publik (`rakitIndeksSaran`), supaya saran di navbar dan di
 * beranda mustahil menyimpang. Sekaligus jauh lebih kecil — indeksnya hanya
 * lima field per judul, sementara katalog penuh membawa sinopsis dan belasan
 * kolom lain yang tak satu pun digambar di baris saran.
 */
export async function GET() {
  try {
    const [dramas, playly] = await Promise.all([
      getAllDramasCachedSafe(),
      getPlaylyVideosGabunganCached(),
    ]);
    // `...Gabungan` memulangkan OBJEK (videos + penanda cadangan/galat),
    // bukan daftar — sama seperti yang dipakai app/page.tsx.
    const videos = playly.videos;
    return NextResponse.json({ ok: true, saran: rakitIndeksSaran(dramas, videos) });
  } catch (err) {
    // Gagal-DIAM, dan itu disengaja: saran adalah kenyamanan, bukan fitur
    // utama. Kotak carinya tetap bekerja penuh lewat Enter walau daftar ini
    // kosong, jadi menampilkan pesan error di bawah kotak cari cuma akan
    // mengkhawatirkan penonton tentang sesuatu yang tidak menghalanginya.
    console.error("[api/saran] gagal menyusun indeks:", err);
    return NextResponse.json({ ok: false, saran: [] });
  }
}
