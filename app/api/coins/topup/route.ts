import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { addCoins, setOrder } from "@/lib/store";
import { resolveUserEmail } from "@/lib/session";
import { getPack } from "@/lib/coins";
import {
  createSnapTransaction,
  midtransConfig,
  midtransConfigured,
  snapJsUrl,
} from "@/lib/midtrans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/coins/topup  { email?, packId }
//
// Alur produksi (Midtrans terpasang):
//   1. Buat order "pending" di store.
//   2. Minta Snap token ke Midtrans, kembalikan ke klien.
//   3. Klien buka popup snap.pay(token) → user bayar (QRIS/GoPay/dst).
//   4. Midtrans kirim notifikasi ke /api/coins/webhook → DI SITU koin dikredit
//      (setelah verifikasi signature). Koin TIDAK pernah dikredit dari klik klien.
//
// Kalau Midtrans belum di-set tapi ENABLE_DEMO_TOPUP=1 → kredit instan (uji coba).
export async function POST(req: NextRequest) {
  let body: { email?: string; packId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const id = await resolveUserEmail(req, body.email);
  if (!id) {
    return NextResponse.json({ error: "Login dulu." }, { status: 401 });
  }

  const pack = getPack((body.packId ?? "").trim());
  if (!pack) {
    return NextResponse.json({ error: "Paket tidak dikenal." }, { status: 400 });
  }

  // --- Jalur Midtrans (pembayaran nyata) ---
  if (midtransConfigured()) {
    const orderId = `dk-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    await setOrder(orderId, {
      email: id.email,
      coins: pack.coins,
      packId: pack.id,
      amount: pack.priceIDR,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    try {
      const { token } = await createSnapTransaction({
        orderId,
        grossAmount: pack.priceIDR,
        email: id.email,
        itemName: `${pack.coins} koin DramaKu`,
      });
      const { clientKey, isProduction } = midtransConfig();
      return NextResponse.json({
        ok: true,
        mode: "midtrans",
        token,
        clientKey,
        snapUrl: snapJsUrl(isProduction),
        orderId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal buat transaksi.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  // --- Fallback demo (tanpa uang nyata) ---
  if (process.env.ENABLE_DEMO_TOPUP === "1") {
    const balance = await addCoins(id.email, pack.coins);
    return NextResponse.json({ ok: true, mode: "demo", coins: pack.coins, balance });
  }

  return NextResponse.json(
    {
      error:
        "Pembayaran belum aktif. Set MIDTRANS_SERVER_KEY + MIDTRANS_CLIENT_KEY di Vercel (atau ENABLE_DEMO_TOPUP=1 untuk uji coba).",
    },
    { status: 501 },
  );
}
