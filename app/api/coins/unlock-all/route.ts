import { NextRequest, NextResponse } from "next/server";
import { getBalance, addCoins, addUnlocks, getUnlocks } from "@/lib/store";
import { resolveUserEmail } from "@/lib/session";
import { getDrama } from "@/lib/dramas";
import {
  FREE_EPISODES,
  isFreeEpisode,
  unlockToken,
  calculateUnlockAllPrice,
} from "@/lib/coins";
import { guardMutation } from "@/lib/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/coins/unlock-all  { email?, dramaId }
// Buka SEMUA episode premium yang masih terkunci dalam satu drama dengan
// harga diskon. Untuk drama non-premium / admin / user tanpa sisa episode,
// langsung sukses tanpa menarik koin.
export async function POST(req: NextRequest) {
  const blocked = guardMutation(req, {
    bucket: "coins:unlock-all",
    limit: 10,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  let body: { email?: string; dramaId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const id = await resolveUserEmail(req, body.email);
  if (!id) {
    return NextResponse.json(
      { error: "Login dulu untuk membuka episode." },
      { status: 401 },
    );
  }

  const dramaId = body.dramaId?.trim();
  if (!dramaId) {
    return NextResponse.json({ error: "dramaId wajib valid." }, { status: 400 });
  }

  const drama = await getDrama(dramaId);
  if (!drama) {
    return NextResponse.json({ error: "Drama tidak ditemukan." }, { status: 404 });
  }

  // Admin / drama gratis → tidak perlu bayar.
  if (id.isAdmin || !drama.premium) {
    return NextResponse.json({
      ok: true,
      unlocked: true,
      free: true,
      balance: await getBalance(id.email),
    });
  }

  const existing = new Set(await getUnlocks(id.email));
  const locked: number[] = [];
  for (let ep = FREE_EPISODES + 1; ep <= drama.episodes; ep++) {
    const token = unlockToken(dramaId, ep);
    if (!existing.has(token)) locked.push(ep);
  }

  if (locked.length === 0) {
    return NextResponse.json({
      ok: true,
      unlocked: true,
      already: true,
      balance: await getBalance(id.email),
    });
  }

  const price = calculateUnlockAllPrice(drama.episodes, existing.size);
  const balance = await getBalance(id.email);
  if (balance < price) {
    return NextResponse.json(
      {
        error: "Koin tidak cukup untuk membuka semua episode.",
        balance,
        needed: price,
      },
      { status: 402 },
    );
  }

  // Tarik koin dulu, lalu catat semua unlock. Mode lokal (file JSON) atomik
  // dalam 1 proses; di Supabase ada jeda kecil antar dua langkah — kalau
  // langkah kedua gagal, user bisa retry (addUnlocks idempoten).
  const newBalance = await addCoins(id.email, -price);
  try {
    await addUnlocks(
      id.email,
      locked.map((ep) => unlockToken(dramaId, ep)),
    );
  } catch {
    // Kalau gagal catat, kembalikan koin supaya user tidak rugi.
    await addCoins(id.email, price);
    return NextResponse.json(
      { error: "Gagal membuka episode. Coba lagi." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    unlocked: true,
    balance: newBalance,
    unlockedCount: locked.length,
    price,
  });
}
