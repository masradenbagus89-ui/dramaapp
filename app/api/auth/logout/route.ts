import { NextResponse } from "next/server";
import { ADMIN_COOKIE, VIEWER_COOKIE, sessionCookieOptions } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Keluar: hapus KEDUA cookie sesi (admin & penonton) sekaligus. */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", sessionCookieOptions(0));
  res.cookies.set(VIEWER_COOKIE, "", sessionCookieOptions(0));
  return res;
}
