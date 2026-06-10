import { NextRequest, NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/session";
import { getTwoFA, setTwoFA } from "@/lib/store";
import { verifyTotp } from "@/lib/totp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/auth/2fa/disable { token } — matikan 2FA. Wajib kode valid dulu
// supaya cookie yang bocor saja tidak cukup untuk menonaktifkannya.
export async function POST(req: NextRequest) {
  const email = await getAdminEmail(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let token = "";
  try {
    token = String(((await req.json()) as { token?: string }).token ?? "");
  } catch {
    /* token kosong */
  }

  const tf = await getTwoFA(email);
  if (!tf.enabled || !tf.secret) {
    await setTwoFA(email, {}); // sudah mati / bersihkan pending
    return NextResponse.json({ ok: true, enabled: false });
  }
  if (!verifyTotp(tf.secret, token)) {
    return NextResponse.json(
      { error: "Kode salah. Masukkan kode authenticator untuk menonaktifkan." },
      { status: 400 },
    );
  }

  await setTwoFA(email, {});
  return NextResponse.json({ ok: true, enabled: false });
}
