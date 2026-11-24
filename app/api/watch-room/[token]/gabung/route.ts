import { NextRequest, NextResponse } from "next/server";
import { guardFitur, guardMutation } from "@/lib/request-guard";
import { readCookie, resolveUserEmail, sessionCookieOptions } from "@/lib/session";
import {
  UMUR_COOKIE_NOBAR_DETIK,
  namaCookieNobar,
  nobarAktif,
  panggilNobar,
} from "@/lib/nobar";
import { bentukRahasiaSah } from "@/nobar-server/src/tiket";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/watch-room/[token]/gabung — masuk Room lewat link undangan.
 * Body: { nama }. Sudah pernah masuk (cookie masih ada) = peserta yang SAMA
 * kembali, bukan peserta baru — daftar penonton tidak dobel.
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/watch-room/[token]/gabung">) {
  const mati = guardFitur(nobarAktif(), "Nonton Bareng");
  if (mati) return mati;
  const blok = guardMutation(req, { bucket: "nobar:gabung", limit: 20, windowMs: 10 * 60_000 });
  if (blok) return blok;

  const { token } = await ctx.params;
  if (!bentukRahasiaSah(token)) return NextResponse.json({ error: "Undangan tidak ditemukan." }, { status: 404 });

  const badan = (await req.json().catch(() => null)) as { nama?: unknown } | null;
  const namaCookie = namaCookieNobar(token);
  const akun = await resolveUserEmail(req);
  const { kode, isi } = await panggilNobar("/internal/gabung", {
    token,
    nama: badan?.nama,
    email: akun?.email ?? null,
    kunci: readCookie(req.headers.get("cookie"), namaCookie),
  });
  if ((kode !== 200 && kode !== 201) || typeof isi.kunci !== "string") {
    return NextResponse.json({ error: (isi.error as string) ?? "Gagal masuk Room." }, { status: kode < 400 ? 502 : kode });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(namaCookie, isi.kunci, sessionCookieOptions(UMUR_COOKIE_NOBAR_DETIK));
  return res;
}
