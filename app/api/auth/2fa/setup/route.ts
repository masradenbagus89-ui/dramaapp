import { NextRequest, NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/session";
import { getTwoFA, setTwoFA } from "@/lib/store";
import { generateSecret, otpauthURL } from "@/lib/totp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/auth/2fa/setup — buat secret "pending". Belum aktif sampai
// diverifikasi via /enable dengan kode dari aplikasi authenticator.
export async function POST(req: NextRequest) {
  const email = await getAdminEmail(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const secret = generateSecret();
  const tf = await getTwoFA(email);
  await setTwoFA(email, { ...tf, pending: secret });
  return NextResponse.json({
    ok: true,
    secret,
    otpauth: otpauthURL(email, secret),
  });
}
