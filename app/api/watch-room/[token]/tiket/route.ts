import { NextRequest, NextResponse } from "next/server";
import { guardFitur, guardMutation } from "@/lib/request-guard";
import { readCookie } from "@/lib/session";
import { namaCookieNobar, nobarAktif, rahasiaNobar, urlPublikNobar } from "@/lib/nobar";
import { bentukRahasiaSah, buatTiket, hashRahasia } from "@/nobar-server/src/tiket";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/watch-room/[token]/tiket — tiket socket berumur 60 detik.
 *
 * KENAPA ADA: kunci peserta hidup di cookie HttpOnly domain Dramaku, sedangkan
 * server socket berada di domain lain — cookie itu tak terkirim ke sana, dan
 * memang tak boleh terbaca JavaScript. Jadi Next menukarnya dengan tiket
 * bertanda tangan yang cepat basi. Tiap reconnect meminta tiket baru.
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/watch-room/[token]/tiket">) {
  const mati = guardFitur(nobarAktif(), "Nonton Bareng");
  if (mati) return mati;
  // 60 / 10 menit: reconnect beruntun saat sinyal HP naik-turun tetap terlayani.
  const blok = guardMutation(req, { bucket: "nobar:tiket", limit: 60, windowMs: 10 * 60_000 });
  if (blok) return blok;

  const { token } = await ctx.params;
  if (!bentukRahasiaSah(token)) return NextResponse.json({ error: "Undangan tidak ditemukan." }, { status: 404 });

  const kunci = readCookie(req.headers.get("cookie"), namaCookieNobar(token));
  if (!bentukRahasiaSah(kunci)) {
    return NextResponse.json({ error: "Kamu belum masuk Room ini." }, { status: 401 });
  }
  return NextResponse.json(
    { tiket: buatTiket(rahasiaNobar(), hashRahasia(kunci)), url: urlPublikNobar() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
