import { NextRequest, NextResponse } from "next/server";
import { addCoins } from "@/lib/store";
import { resolveUserEmail } from "@/lib/session";
import { getPack } from "@/lib/coins";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/coins/topup  { email?, packId }
//
// ⚠️ INTEGRASI PEMBAYARAN NYATA (langkah berikutnya untuk "generate money"):
// Untuk audiens Indonesia, pakai Midtrans atau Xendit (QRIS/GoPay/OVO/DANA/VA).
// Alur produksi yang benar:
//   1. Endpoint ini BUAT order (Snap token / invoice) ke gateway, simpan
//      orderId -> { email, packId, status: "pending" } di KV. Kembalikan
//      URL/Snap token ke klien untuk bayar.
//   2. Gateway memanggil WEBHOOK kita (mis. /api/coins/webhook) saat lunas.
//      Di webhook itulah — SETELAH verifikasi signature — koin dikreditkan
//      via addCoins(). JANGAN pernah kredit hanya dari klik klien.
//
// Sementara gateway belum dipasang, endpoint ini berfungsi sebagai DEMO
// (kredit instan) HANYA jika env ENABLE_DEMO_TOPUP=1 — supaya alur koin bisa
// dites tanpa uang sungguhan. Default: nonaktif (aman untuk produksi).
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

  if (process.env.ENABLE_DEMO_TOPUP !== "1") {
    return NextResponse.json(
      {
        error:
          "Pembayaran belum aktif. Hubungkan Midtrans/Xendit dulu (lihat catatan di kode). Untuk uji coba lokal, set ENABLE_DEMO_TOPUP=1.",
      },
      { status: 501 },
    );
  }

  const balance = await addCoins(id.email, pack.coins);
  return NextResponse.json({
    ok: true,
    demo: true,
    coins: pack.coins,
    balance,
  });
}
