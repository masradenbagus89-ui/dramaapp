import { NextRequest, NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/session";
import { getTwoFA } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/auth/2fa — status 2FA admin yang sedang login.
export async function GET(req: NextRequest) {
  const email = await getAdminEmail(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tf = await getTwoFA(email);
  return NextResponse.json({
    ok: true,
    email,
    enabled: Boolean(tf.enabled),
    hasPending: Boolean(tf.pending),
  });
}
