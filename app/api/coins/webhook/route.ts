import { NextRequest, NextResponse } from "next/server";
import { addCoins, getOrder, setOrder } from "@/lib/store";
import { verifyNotificationSignature } from "@/lib/midtrans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/coins/webhook — dipanggil OLEH Midtrans (Payment Notification URL).
// Daftarkan URL ini di dashboard Midtrans: Settings > Configuration >
// Payment Notification URL = https://<domain>/api/coins/webhook
//
// Kredit koin HANYA dilakukan di sini, setelah verifikasi signature, dan
// idempoten (order yang sudah "paid" tidak dikredit lagi).
export async function POST(req: NextRequest) {
  let n: {
    order_id?: string;
    status_code?: string;
    gross_amount?: string;
    signature_key?: string;
    transaction_status?: string;
    fraud_status?: string;
  };
  try {
    n = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  if (!verifyNotificationSignature(n)) {
    return NextResponse.json({ error: "Signature tidak valid." }, { status: 403 });
  }

  const order = n.order_id ? await getOrder(n.order_id) : null;
  if (!order) {
    // Order tak dikenal — tetap balas 200 supaya Midtrans tidak retry selamanya.
    return NextResponse.json({ ok: true, ignored: "unknown order" });
  }

  const status = n.transaction_status;
  const success =
    status === "settlement" ||
    (status === "capture" && n.fraud_status === "accept");

  if (success && order.status !== "paid") {
    await addCoins(order.email, order.coins);
    await setOrder(n.order_id!, { ...order, status: "paid" });
    return NextResponse.json({ ok: true, credited: order.coins });
  }

  // Status lain (pending/expire/cancel/deny) — akui saja.
  return NextResponse.json({ ok: true, status });
}
