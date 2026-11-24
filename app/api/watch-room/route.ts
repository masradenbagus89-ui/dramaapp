import { NextRequest, NextResponse } from "next/server";
import { guardFitur, guardMutation } from "@/lib/request-guard";
import { getPlaylyVideosGabunganCached } from "@/lib/playly-gabungan";
import { resolveUserEmail, sessionCookieOptions } from "@/lib/session";
import {
  UMUR_COOKIE_NOBAR_DETIK,
  namaCookieNobar,
  nobarAktif,
  panggilNobar,
} from "@/lib/nobar";
import { rapikanNama } from "@/nobar-server/src/kontrak";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * POST /api/watch-room — buat Room Nonton Bareng; pembuatnya jadi Host.
 * Body: { videoId, nama }. Balasan: { token } + cookie HttpOnly kunci Host.
 */
export async function POST(req: NextRequest) {
  const mati = guardFitur(nobarAktif(), "Nonton Bareng");
  if (mati) return mati;
  // 5 Room / 10 menit / IP: cukup untuk orang yang salah klik beberapa kali,
  // terlalu sedikit untuk membanjiri database dengan Room kosong.
  const blok = guardMutation(req, { bucket: "nobar:buat", limit: 5, windowMs: 10 * 60_000 });
  if (blok) return blok;

  const badan = (await req.json().catch(() => null)) as { videoId?: unknown; nama?: unknown } | null;
  const videoId = typeof badan?.videoId === "string" ? badan.videoId : "";
  const nama = rapikanNama(badan?.nama);
  if (!ID_RE.test(videoId)) return NextResponse.json({ error: "Video tidak valid." }, { status: 400 });
  if (!nama) return NextResponse.json({ error: "Nama wajib diisi (1-24 huruf)." }, { status: 400 });

  // GERBANG (rak owasp — IDOR): Room hanya boleh dibuat untuk video yang ADA di
  // daftar kurasi yang sama dengan halaman /tonton. Tanpa ini, Room menjadi
  // pintu belakang untuk memutar video tersembunyi lewat id tebakan.
  const { videos } = await getPlaylyVideosGabunganCached();
  const video = videos.find((v) => v.id === videoId);
  if (!video) return NextResponse.json({ error: "Video tidak tersedia." }, { status: 404 });

  const akun = await resolveUserEmail(req);
  const { kode, isi } = await panggilNobar("/internal/ruang", {
    videoId: video.id,
    // Judul kosong pernah terjadi di salinan cadangan daftar (hanya id) — Room tetap boleh jalan.
    judul: video.title?.trim() || "Film DramaKu",
    nama,
    email: akun?.email ?? null,
    // Poster sengaja TIDAK dikirim: alamat sampul dari penyedia basi dalam 6 jam;
    // halaman Room merakit alamat tetap milik kita sendiri dari videoId.
    poster: null,
  });
  if (kode !== 201 || typeof isi.token !== "string" || typeof isi.kunci !== "string") {
    return NextResponse.json(
      { error: (isi.error as string) ?? "Room gagal dibuat." },
      { status: kode < 400 ? 502 : kode },
    );
  }

  const res = NextResponse.json({ token: isi.token }, { status: 201 });
  res.cookies.set(namaCookieNobar(isi.token), isi.kunci, sessionCookieOptions(UMUR_COOKIE_NOBAR_DETIK));
  return res;
}
