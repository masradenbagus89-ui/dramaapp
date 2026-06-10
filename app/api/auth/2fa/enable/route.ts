import { NextRequest, NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/session";
import { getTwoFA, setTwoFA } from "@/lib/store";
import { verifyTotp } from "@/lib/totp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/auth/2fa/enable { token } — verifikasi kode dari authenticator,
// lalu aktifkan 2FA (promosikan secret "pending" jadi aktif).
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
  if (!tf.pending) {
    return NextResponse.json(
      { error: "Belum ada setup. Mulai dari tombol Aktifkan 2FA." },
      { status: 400 },
    );
  }
  if (!verifyTotp(tf.pending, token)) {
    return NextResponse.json(
      { error: "Kode salah atau kedaluwarsa. Coba kode terbaru." },
      { status: 400 },
    );
  }

  await setTwoFA(email, { secret: tf.pending, enabled: true });
  return NextResponse.json({ ok: true, enabled: true });
}
