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
import { guardFitur, guardMutation } from "@/lib/request-guard";
import { PAYWALL_ENABLED } from "@/lib/saklar-fitur";

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
  // Fitur ini sedang DIJEDA lewat saklar di lib/saklar-fitur.ts. Digerbang di
  // route juga — bukan cuma disembunyikan di layar — karena alamat API tetap
  // bisa dipanggil langsung oleh siapa pun yang tahu namanya.
  const mati = guardFitur(PAYWALL_ENABLED, "koin");
  if (mati) return mati;
  const blocked = guardMutation(req, {
    bucket: "coins:topup",
    limit: 10,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  let body: { email?: string; packId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const id = await resolveUserEmail(req);
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
      // Pesan mentah TIDAK diteruskan: balasan error Midtrans bisa memuat
      // detail konfigurasi merchant, dan jalur ini dilihat PENONTON (bukan
      // admin) persis saat ia hendak membayar — kalimat teknis di situ bikin
      // orang ragu membayar, bukan membantu.
      //
      // Status 502 DIPERTAHANKAN, sengaja tidak dipukul rata jadi 500:
      // artinya "layanan pembayaran di luar sana yang bermasalah", bukan kode
      // kita. Beda itu dipakai untuk memilah alarm — karena itu di sini tidak
      // memakai balasanGagal() yang selalu 500/503.
      console.error("[api/coins/topup] Midtrans gagal:", err);
      return NextResponse.json(
        {
          error:
            "Pembayaran belum bisa diproses sekarang. Saldo koinmu tidak berkurang — coba lagi beberapa saat lagi.",
        },
        { status: 502 },
      );
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
        "Pembayaran belum aktif. Set MIDTRANS_SERVER_KEY + MIDTRANS_CLIENT_KEY di panel hosting (Railway). ENABLE_DEMO_TOPUP=1 hanya untuk uji coba di komputer sendiri — JANGAN dipasang di server, itu membuat koin bisa dicetak tanpa pembayaran.",
    },
    { status: 501 },
  );
}
