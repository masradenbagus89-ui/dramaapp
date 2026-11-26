// POST /api/laporan-video — member melaporkan video yang bermasalah.
//
// Kontrak:
//   body  { jenisKonten: "drama"|"playly", kontenId, episode?, server?, masalah, keterangan? }
//   201   { ok: true, laporan: { id } }   (tanpa header Location: member tak punya
//         alamat untuk membaca laporan satu per satu — hanya admin yang melihatnya)
//   400   body bukan JSON · 401 belum login · 403 asal permintaan asing
//   404   video tak ditemukan · 422 isian tak lolos · 429 terlalu sering · 500 gagal simpan
//
// 🔒 Identitas (email + nama) dari cookie sesi; judul dicari dari ID di sini.
// Browser hanya menyebut VIDEO MANA — siapa pelapornya & apa judulnya diputuskan server.
import { NextRequest, NextResponse } from "next/server";
import { resolveUserEmail } from "@/lib/session";
import { guardMutation } from "@/lib/request-guard";
import { rateLimit } from "@/lib/rate-limit";
import { getDrama } from "@/lib/dramas";
import { getPlaylyVideosGabunganCached } from "@/lib/playly-gabungan";
import { namaAkun } from "@/lib/nama-akun";
import { validasiLaporanMasuk, type LaporanMasuk } from "@/lib/laporan-video";
import { buatLaporan } from "@/lib/laporan-video-simpan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Per akun: cukup untuk melaporkan beberapa episode, terlalu sedikit untuk banjir. */
const BATAS_PER_AKUN = 5;
/** Per IP: lebih longgar dari per akun (satu Wi-Fi bisa dipakai beberapa member). */
const BATAS_PER_IP = 10;
const JENDELA_MS = 10 * 60_000;

/** Judul resmi video yang dilaporkan, atau null kalau ID/episode tak ada. */
async function cariJudulKonten(isian: LaporanMasuk): Promise<string | null> {
  if (isian.jenisKonten === "drama") {
    const drama = await getDrama(isian.kontenId);
    if (!drama) return null;
    if (isian.episode !== null && isian.episode > Math.max(1, drama.episodes)) return null;
    return drama.title;
  }
  const { videos } = await getPlaylyVideosGabunganCached();
  return videos.find((v) => v.id === isian.kontenId)?.title ?? null;
}

export async function POST(req: NextRequest) {
  const blocked = guardMutation(req, { bucket: "laporan-video", limit: BATAS_PER_IP, windowMs: JENDELA_MS });
  if (blocked) return blocked;

  const sesi = await resolveUserEmail(req);
  if (!sesi) {
    return NextResponse.json({ error: "Masuk dulu untuk mengirim laporan." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Isian laporan tidak terbaca." }, { status: 400 });
  }
  const hasil = validasiLaporanMasuk(body);
  if (!hasil.ok) return NextResponse.json({ error: hasil.pesan }, { status: 422 });

  const laju = rateLimit(`laporan-video:akun:${sesi.email}`, BATAS_PER_AKUN, JENDELA_MS);
  if (!laju.allowed) {
    return NextResponse.json(
      { error: "Laporanmu sudah banyak. Coba lagi beberapa menit lagi." },
      { status: 429, headers: { "Retry-After": String(laju.retryAfterSec) } },
    );
  }

  try {
    const judul = await cariJudulKonten(hasil.data);
    if (!judul) {
      return NextResponse.json({ error: "Video yang dilaporkan tidak ditemukan." }, { status: 404 });
    }
    const laporan = await buatLaporan({
      ...hasil.data,
      judul,
      email: sesi.email,
      namaMember: await namaAkun(sesi.email, sesi.isAdmin),
    });
    return NextResponse.json({ ok: true, laporan: { id: laporan.id } }, { status: 201 });
  } catch (err) {
    console.error("[laporan-video] gagal menyimpan", err);
    return NextResponse.json({ error: "Laporan gagal disimpan. Coba lagi." }, { status: 500 });
  }
}
