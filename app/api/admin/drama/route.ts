import { NextRequest, NextResponse } from "next/server";
import type { Drama } from "@/lib/types";
import { isAdminRequest } from "@/lib/session";
import {
  getDrama,
  upsertDrama,
  removeDrama,
  slugify,
  pickRandomGradient,
} from "@/lib/dramas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Simpan/ubah/hapus drama langsung ke database (Supabase). Update instan —
// tidak perlu commit GitHub / redeploy seperti versi lama.

export async function POST(req: NextRequest) {
  try {
    if (!(await isAdminRequest(req))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Partial<{
      id: string;
      title: string;
      category: string;
      synopsis: string;
      views: string;
      episodes: number;
      posterImage: string;
      heroImage: string;
      gradient: string;
      exclusive: boolean;
      subtitles: string[];
      premium: boolean;
    }>;

    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Judul wajib diisi." }, { status: 400 });
    }
    if (!body.category?.trim()) {
      return NextResponse.json({ error: "Kategori wajib diisi." }, { status: 400 });
    }
    const epNum = Number(body.episodes);
    if (!Number.isFinite(epNum) || epNum < 1) {
      return NextResponse.json({ error: "Jumlah episode minimal 1." }, { status: 400 });
    }

    const id = body.id?.trim() || slugify(body.title);
    if (!id) {
      return NextResponse.json({ error: "ID drama tidak valid." }, { status: 400 });
    }

    const existing = await getDrama(id);
    const isNew = !existing;

    // Subtitle: terima array kode bahasa, buang yang tidak valid/duplikat.
    // Kalau field dikirim (array) → dianggap sumber kebenaran (boleh dikosongkan).
    const subtitlesProvided = Array.isArray(body.subtitles);
    const subtitles = subtitlesProvided
      ? Array.from(
          new Set(
            body
              .subtitles!.map((c) => String(c).trim().toLowerCase())
              .filter((c) => /^[a-z]{2,5}$/.test(c)),
          ),
        )
      : [];

    let drama: Drama;
    if (isNew) {
      drama = {
        id,
        title: body.title.trim(),
        category: body.category as Drama["category"],
        episodes: Math.floor(epNum),
        views: body.views?.trim() || "1.0K",
        synopsis: body.synopsis?.trim() || "",
        gradient: body.gradient?.trim() || pickRandomGradient(),
        ...(body.posterImage?.trim() ? { posterImage: body.posterImage.trim() } : {}),
        ...(body.heroImage?.trim() ? { heroImage: body.heroImage.trim() } : {}),
        ...(body.exclusive ? { exclusive: true } : {}),
        ...(subtitles.length ? { subtitles } : {}),
        ...(body.premium ? { premium: true } : {}),
      };
    } else {
      drama = {
        ...existing!,
        title: body.title.trim(),
        category: body.category as Drama["category"],
        episodes: Math.floor(epNum),
        ...(body.views?.trim() ? { views: body.views.trim() } : {}),
        ...(body.synopsis?.trim() ? { synopsis: body.synopsis.trim() } : {}),
        ...(body.gradient?.trim() ? { gradient: body.gradient.trim() } : {}),
        ...(body.posterImage?.trim() ? { posterImage: body.posterImage.trim() } : {}),
        ...(body.heroImage?.trim() ? { heroImage: body.heroImage.trim() } : {}),
        ...(typeof body.exclusive === "boolean" ? { exclusive: body.exclusive } : {}),
      };
      // Field dikirim → timpa (termasuk pengosongan: hapus key kalau jadi kosong).
      if (subtitlesProvided) {
        if (subtitles.length) drama.subtitles = subtitles;
        else delete drama.subtitles;
      }
      if (typeof body.premium === "boolean") {
        if (body.premium) drama.premium = true;
        else delete drama.premium;
      }
    }

    await upsertDrama(drama, isNew);

    const action = isNew ? "added" : "updated";
    return NextResponse.json({ ok: true, id: drama.id, action, drama });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal simpan drama";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!(await isAdminRequest(req))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = (await req.json()) as { id?: string };
    if (!id?.trim()) {
      return NextResponse.json({ error: "ID wajib diisi." }, { status: 400 });
    }

    const drama = await getDrama(id.trim());
    if (!drama) {
      return NextResponse.json({ error: "Drama tidak ditemukan." }, { status: 404 });
    }
    await removeDrama(id.trim());

    return NextResponse.json({ ok: true, removed: { id: drama.id, title: drama.title } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal hapus drama";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
