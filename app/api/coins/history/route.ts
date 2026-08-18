import { NextRequest, NextResponse } from "next/server";
import { getBalance, getCoinMeta, getUnlocks } from "@/lib/store";
import { resolveUserEmail } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HistoryItem = {
  type: "unlock" | "checkin" | "ad";
  label: string;
  at: string;
  coins?: number;
};

// GET /api/coins/history?email=...
// Riwayat aktivitas koin yang diturunkan dari data yang sudah ada
// (tanpa tabel transaksi baru): episode yang dibuka, check-in, kuota iklan.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = await resolveUserEmail(req);

  if (!id) {
    return NextResponse.json({ ok: true, loggedIn: false, history: [] });
  }

  const [balance, unlocks, meta] = await Promise.all([
    getBalance(id.email),
    getUnlocks(id.email),
    getCoinMeta(id.email),
  ]);

  const history: HistoryItem[] = [];

  // Unlock episode → uraikan token menjadi "dramaId:episode".
  for (const token of unlocks.slice(-10).reverse()) {
    const [dramaId, epRaw] = token.split(":");
    const ep = Number(epRaw);
    if (!dramaId || !Number.isFinite(ep)) continue;
    history.push({
      type: "unlock",
      label: `Buka episode ${ep}`,
      at: new Date().toISOString(), // unlocks tidak menyimpan tanggal; tampilkan sebagai "baru saja" di UI
      coins: -8, // asumsi harga standar; hanya untuk label
    });
  }

  if (meta.lastCheckin) {
    history.push({
      type: "checkin",
      label: "Check-in harian",
      at: `${meta.lastCheckin}T00:00:00.000Z`,
      coins: 15,
    });
  }

  if (meta.adDate && typeof meta.adCount === "number" && meta.adCount > 0) {
    history.push({
      type: "ad",
      label: `Nonton iklan ×${meta.adCount}`,
      at: `${meta.adDate}T00:00:00.000Z`,
      coins: 4 * meta.adCount,
    });
  }

  // Urutkan terbaru dulu berdasarkan tanggal string.
  history.sort((a, b) => b.at.localeCompare(a.at));

  return NextResponse.json({
    ok: true,
    loggedIn: true,
    balance,
    history: history.slice(0, 10),
  });
}
