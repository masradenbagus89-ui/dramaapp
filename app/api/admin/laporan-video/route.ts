// /api/admin/laporan-video — admin membaca & menangani Laporan Video.
//
// GET   ?status=pending|diproses|selesai&q=<kata>
//       200 { laporan: LaporanVideo[], jumlah: { pending, diproses, selesai } }
//       `jumlah` dihitung dari SEMUA laporan (bukan hasil saringan) supaya
//       angka di tab status tak ikut berubah saat admin mengetik pencarian.
// PATCH { id, status }  -> 200 { ok, laporan } · 404 tak ada · 422 isian salah
// 401 = bukan sesi admin (pola sama dengan route admin lain).
import { NextRequest, NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/session";
import { guardMutation } from "@/lib/request-guard";
import { hitungPerStatus, idLaporanSah, saringLaporan, statusSah } from "@/lib/laporan-video";
import { daftarLaporan, ubahStatusLaporan } from "@/lib/laporan-video-simpan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAKS_PANJANG_CARI = 100;

export async function GET(req: NextRequest) {
  if (!(await getAdminEmail(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const q = (sp.get("q") ?? "").slice(0, MAKS_PANJANG_CARI);

  try {
    const semua = await daftarLaporan();
    return NextResponse.json({
      laporan: saringLaporan(semua, { status: statusSah(status) ? status : undefined, q }),
      jumlah: hitungPerStatus(semua),
    });
  } catch (err) {
    console.error("[admin/laporan-video] gagal membaca", err);
    return NextResponse.json({ error: "Daftar laporan gagal dimuat." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const blocked = guardMutation(req, { bucket: "admin:laporan-video", limit: 120, windowMs: 60_000 });
  if (blocked) return blocked;

  const adminEmail = await getAdminEmail(req);
  if (!adminEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { id?: unknown; status?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Isian tidak terbaca." }, { status: 400 });
  }
  if (!idLaporanSah(body.id) || !statusSah(body.status)) {
    return NextResponse.json({ error: "ID atau status laporan tidak sah." }, { status: 422 });
  }

  try {
    const laporan = await ubahStatusLaporan(body.id, body.status, adminEmail);
    if (!laporan) return NextResponse.json({ error: "Laporan tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true, laporan });
  } catch (err) {
    console.error("[admin/laporan-video] gagal mengubah status", err);
    return NextResponse.json({ error: "Status gagal disimpan." }, { status: 500 });
  }
}
