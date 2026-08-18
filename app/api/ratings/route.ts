import { NextRequest, NextResponse } from "next/server";
import {
  getRatingsFor,
  setRating,
  summarizeRatings,
  RATING_MIN,
  RATING_MAX,
} from "@/lib/store";
import { resolveUserEmail } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ringkasan rating satu drama + suara milik pemanggil (kalau ada). */
export async function GET(req: NextRequest) {
  const dramaId = req.nextUrl.searchParams.get("dramaId");
  if (!dramaId) {
    return NextResponse.json({ error: "dramaId wajib." }, { status: 400 });
  }
  const map = await getRatingsFor(dramaId);
  const id = await resolveUserEmail(req);
  return NextResponse.json({
    ...summarizeRatings(map),
    mine: id ? (map[id.email] ?? null) : null,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      dramaId?: string;
      email?: string;
      stars?: number;
    };
    const dramaId = String(body.dramaId ?? "").trim();
    if (!dramaId) {
      return NextResponse.json({ error: "dramaId wajib." }, { status: 400 });
    }

    // Identitas: admin diambil dari cookie tertanda-tangan, viewer masih
    // di-assert klien (lihat catatan BATAS JUJUR di lib/store.ts).
    const id = await resolveUserEmail(req);
    if (!id) {
      return NextResponse.json(
        { error: "Masuk dulu untuk memberi rating." },
        { status: 401 },
      );
    }

    // Tolak nilai di luar rentang, bukan diam-diam dipotong — supaya klien
    // yang salah kirim tahu penyebabnya.
    const stars = Number(body.stars);
    if (!Number.isInteger(stars) || stars < RATING_MIN || stars > RATING_MAX) {
      return NextResponse.json(
        { error: `Rating harus bilangan bulat ${RATING_MIN}-${RATING_MAX}.` },
        { status: 400 },
      );
    }

    const map = await setRating(dramaId, id.email, stars);
    return NextResponse.json({ ok: true, ...summarizeRatings(map), mine: stars });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Simpan rating gagal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
