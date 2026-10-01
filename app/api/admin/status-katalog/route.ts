import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/session";
import { getAllDramasCachedSafe, periksaKatalogHidup } from "@/lib/dramas";
import { ringkasStatusKatalog } from "@/lib/katalog-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Status katalog drama untuk kartu di Dashboard admin: apakah judul yang
 * dilihat penonton datang dari database, atau dari berkas cadangan.
 *
 * KENAPA ADA (2026-10-01): pengaman di `getAllDramasCachedSafe` membuat halaman
 * publik beralih ke `data/dramas.json` tanpa jejak saat database tak
 * terjangkau. Hari itu database Supabase mati berjam-jam, /katalog tetap
 * terlihat sehat dengan 42 judul dari cadangan berumur 20 hari, dan tak ada
 * satu pun cara untuk mengetahuinya. Endpoint ini pintu tanya-nya.
 *
 * KONTRAK (rak backend §1):
 *   Input  : tidak ada — tak satu pun nilai dari pemanggil dibaca, jadi tak ada
 *            yang perlu divalidasi dan tak ada permukaan injeksi.
 *   Output : 200 `{ ok: true, status, jumlahTampil, pesan }` — amplop `ok`
 *            yang sama dengan route admin lain.
 *   Error  : 401 `{ error: "Unauthorized" }` untuk yang bukan admin. TIDAK ADA
 *            jalur 500: kedua pembacaan di bawah sudah gagal-AMAN, jadi
 *            database mati bukan "endpoint error" melainkan JAWABAN yang sah.
 *   Rahasia: pesan asli dari Supabase TIDAK pernah ikut keluar — ia bisa memuat
 *            alamat & detail dalam server. Sebabnya hanya masuk log server
 *            (lib/dramas.ts `periksaKatalogHidup`).
 *
 * 401 dipakai juga untuk "login tapi bukan admin" — rak backend §1 memisahkan
 * 401 dari 403, tapi 11 route admin lain di project ini sudah memakai 401 untuk
 * keduanya (mis. app/api/admin/playly/key/route.ts:25). Kenyataan kode menang
 * (§4.3): memperkenalkan 403 di satu route saja membuat klien admin harus
 * menangani dua pola untuk hal yang sama.
 *
 * ⚠️ WAJIB `force-dynamic`. Status yang disimpan-dan-dipakai-ulang akan
 * menjawab memakai keadaan lama — persis jenis kebohongan yang endpoint ini
 * dibuat untuk memberantasnya.
 *
 * ⚠️ WAJIB sesi admin. Isinya keterangan kondisi dalam server (database hidup
 * atau mati), dan itu urusan pengelola — bukan sesuatu yang perlu, atau boleh,
 * diketahui pengunjung.
 */
export async function GET(req: NextRequest) {
  // ⚠️ `isAdminRequest` BISA MELEMPAR, bukan sekadar memulangkan false: ia
  // memeriksa "email masih terdaftar sebagai admin" lewat `getAdmins()`, dan
  // pembacaan itu menyentuh database tanpa penangkap (lib/store.ts:116).
  // Jadi tepat ketika database mati — satu-satunya saat endpoint ini berguna —
  // ia melempar dan Next.js membalas 500 tanpa penjelasan.
  //
  // Ditangkap di sini supaya kegagalannya jadi jawaban yang terkendali.
  // Arahnya MENOLAK (rak owasp A10: default-deny): tidak bisa memastikan
  // seseorang admin = diperlakukan bukan admin. Tak ada jalur yang membuat
  // gagal-periksa berubah jadi izin masuk.
  let bolehLihat = false;
  try {
    bolehLihat = await isAdminRequest(req);
  } catch (err) {
    console.warn(
      `[status-katalog] daftar admin tidak terbaca, akses ditolak: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
  if (!bolehLihat) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Dijalankan BERSAMAAN, bukan berurutan: masing-masing bisa memakan ~12 detik
  // saat database bermasalah (2 percobaan × batas 6 detik, lib/supabase.ts:109-112),
  // dan admin tidak perlu menunggu dua kali selama itu untuk satu jawaban.
  //
  // Keduanya menjawab pertanyaan BERBEDA dan sengaja tidak digabung:
  //   - periksaKatalogHidup   : apakah database menjawab DETIK INI (tanpa cache)
  //   - getAllDramasCachedSafe: berapa judul yang BENAR-BENAR dilihat penonton
  //     sekarang — fungsi yang sama persis dengan yang dipakai 5 halaman publik,
  //     jadi angkanya bukan perkiraan melainkan isi layar mereka.
  //
  // Catatan jujur soal tepinya: pembacaan kedua ber-cache 60 detik, jadi tepat
  // sesudah database mati ia masih bisa memulangkan isi database yang tersimpan.
  // Di jendela sempit itu kartu memperingatkan sedikit lebih awal daripada
  // keadaan sebenarnya. Arah kesalahannya disengaja — memperingatkan terlalu
  // cepat tidak merugikan siapa pun, terlambat memperingatkan merugikan.
  const [databaseHidup, dramas] = await Promise.all([
    periksaKatalogHidup(),
    getAllDramasCachedSafe(),
  ]);

  return NextResponse.json({
    ok: true,
    ...ringkasStatusKatalog({ databaseHidup, jumlahTampil: dramas.length }),
  });
}
