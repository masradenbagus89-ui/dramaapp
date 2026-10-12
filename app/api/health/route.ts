import { NextResponse } from "next/server";
import { useSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Pintu tanya kesehatan aplikasi — dipakai healthcheck hosting DAN owner.
 *
 * KENAPA ADA: sampai sekarang tidak ada satu pun cara dari luar untuk menanyakan
 * `useSupabase`. Akibatnya keadaan paling berbahaya justru yang paling tak
 * terlihat: kalau env Supabase kosong di hosting berbasis container, aplikasi
 * menulis data penonton ke berkas di dalam container dan kehilangannya tiap
 * redeploy — sementara kartu status katalog melaporkan "database", robot
 * keep-db-awake melaporkan "OK 42 drama", dan /api/dramas memang membalas 42
 * judul (dari cadangan). Tiga alat, nol kebenaran.
 *
 * Endpoint ini juga yang membuat pagar di lib/supabase.ts punya gigi: karena ia
 * mengimpor modul itu, healthcheck ikut menjalankan pagarnya. Deploy dengan env
 * kurang akan gagal lolos healthcheck, jadi versi lama tetap melayani alih-alih
 * digantikan versi yang rusak.
 *
 * KONTRAK (rak backend §1):
 *   Input  : tidak ada — nol nilai dari pemanggil dibaca, jadi nol permukaan
 *            injeksi dan tak ada yang perlu divalidasi di boundary.
 *   Output : 200 `{ ok: true, sumberData: "database" }` saat sehat.
 *   Error  : 503 `{ ok: false, sumberData: "berkas", pesan }` + `Retry-After`
 *            saat aplikasi berjalan tanpa database. 503 (bukan 200 ber-flag)
 *            supaya healthcheck hosting menolaknya tanpa perlu membaca isi.
 *            Tidak ada jalur 500: nol pemanggilan yang bisa melempar.
 *   Rahasia: TIDAK ada alamat, versi, nama host, atau pesan asli Supabase yang
 *            ikut keluar.
 *
 * ⚠️ SENGAJA tidak menyentuh database, dan sengaja TIDAK melaporkan database
 * sedang hidup atau mati. Dua alasan, keduanya penting:
 *   1. Keamanan (rak owasp) — kondisi real-time server adalah urusan pengelola;
 *      itu sebabnya app/api/admin/status-katalog/route.ts:41-43 mewajibkan sesi
 *      admin. Yang dilaporkan di sini cuma KONFIGURASI (tetap sepanjang umur
 *      proses), bukan KONDISI. Untuk kondisi, buka kartu status di Dashboard.
 *   2. Ketahanan — kalau endpoint ini ikut menanyai Supabase, gangguan Supabase
 *      membuat healthcheck gagal dan hosting me-restart aplikasi yang sebenarnya
 *      sehat, berulang-ulang. Satu permintaan Supabase bisa makan 12,3 detik
 *      saat bermasalah (lib/supabase.ts BATAS_WAKTU_MS x 2 percobaan + jeda).
 *
 * ⚠️ WAJIB `force-dynamic`. Jawaban yang disimpan-dan-dipakai-ulang akan
 * melaporkan keadaan lama — persis kebohongan yang endpoint ini lawan.
 */
export async function GET() {
  if (!useSupabase) {
    return NextResponse.json(
      {
        ok: false,
        sumberData: "berkas",
        pesan:
          "Aplikasi berjalan TANPA database. Tulisan apa pun (koin, komentar, akun) " +
          "hilang saat aplikasi dimuat ulang. Isi env Supabase di panel hosting.",
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store", "Retry-After": "60" },
      },
    );
  }

  return NextResponse.json(
    { ok: true, sumberData: "database" },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
