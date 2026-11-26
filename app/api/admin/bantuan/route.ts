// GET /api/admin/bantuan — angka untuk lencana notifikasi admin.
//   200 { laporanPending, chatBelumDibaca } · 401 bukan sesi admin
//
// Dipisah dari route laporan & chat supaya lencana di menu samping (ditanya
// berkala dari SEMUA halaman admin) tak ikut mengunduh isi laporan & pesan.
import { NextRequest, NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/session";
import { hitungPerStatus } from "@/lib/laporan-video";
import { daftarLaporan } from "@/lib/laporan-video-simpan";
import { daftarUtasAdmin } from "@/lib/live-chat-simpan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await getAdminEmail(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const [laporan, utas] = await Promise.all([daftarLaporan(), daftarUtasAdmin()]);
    return NextResponse.json({
      laporanPending: hitungPerStatus(laporan).pending,
      chatBelumDibaca: utas.filter((u) => u.belumDibaca).length,
    });
  } catch (err) {
    console.error("[admin/bantuan] gagal menghitung", err);
    return NextResponse.json({ error: "Ringkasan gagal dimuat." }, { status: 500 });
  }
}
