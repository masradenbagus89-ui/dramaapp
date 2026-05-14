import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import {
  generateUniqueId,
  getAllDramas,
  pickRandomGradient,
  writeAllDramas,
  type Drama,
} from "@/lib/dramas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VIDEO_EXT_RE = /\.(mp4|mov|webm|m4v)$/i;
const IMAGE_EXT_RE = /\.(png|jpe?g|webp)$/i;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const title = String(form.get("title") ?? "").trim();
    const category = String(form.get("category") ?? "Romance").trim();
    const synopsis = String(form.get("synopsis") ?? "").trim();
    const views = String(form.get("views") ?? "").trim();
    const video = form.get("video") as File | null;
    const poster = form.get("poster") as File | null;
    const episodeRaw = Number(form.get("episode") ?? 1);
    const episode = Number.isFinite(episodeRaw) && episodeRaw >= 1 ? Math.floor(episodeRaw) : 1;

    if (!title) {
      return NextResponse.json({ error: "Judul wajib diisi." }, { status: 400 });
    }
    if (!video || video.size === 0) {
      return NextResponse.json(
        { error: "File video wajib dipilih." },
        { status: 400 },
      );
    }
    if (!VIDEO_EXT_RE.test(video.name)) {
      return NextResponse.json(
        { error: "Format video harus .mp4 / .mov / .webm / .m4v" },
        { status: 400 },
      );
    }

    const all = getAllDramas();
    const cwd = process.cwd();

    const titleLower = title.toLowerCase();
    const existingIdx = all.findIndex(
      (d) => d.title.toLowerCase().trim() === titleLower,
    );
    const isNew = existingIdx === -1;
    const id = isNew ? generateUniqueId(title, all) : all[existingIdx].id;

    const videoDir = join(cwd, "public", "videos", id);
    await mkdir(videoDir, { recursive: true });
    const videoBuf = Buffer.from(await video.arrayBuffer());
    await writeFile(join(videoDir, `${episode}.mp4`), videoBuf);

    let posterPath: string | undefined;
    if (poster && poster.size > 0) {
      if (!IMAGE_EXT_RE.test(poster.name)) {
        return NextResponse.json(
          { error: "Format poster harus .png / .jpg / .jpeg / .webp" },
          { status: 400 },
        );
      }
      const ext = (poster.name.match(IMAGE_EXT_RE)?.[0] ?? ".png").toLowerCase();
      const posterDir = join(cwd, "public", "posters");
      await mkdir(posterDir, { recursive: true });
      const posterBuf = Buffer.from(await poster.arrayBuffer());
      await writeFile(join(posterDir, `${id}${ext}`), posterBuf);
      posterPath = `/posters/${id}${ext}`;
    }

    let drama: Drama;
    let action: "added" | "updated";
    if (isNew) {
      drama = {
        id,
        title,
        category: category as Drama["category"],
        episodes: episode,
        views: views || "1.0K",
        synopsis,
        gradient: pickRandomGradient(),
        ...(posterPath ? { posterImage: posterPath } : {}),
      };
      all.unshift(drama);
      action = "added";
    } else {
      const existing = all[existingIdx];
      drama = {
        ...existing,
        episodes: Math.max(existing.episodes, episode),
        ...(synopsis ? { synopsis } : {}),
        ...(views ? { views } : {}),
        ...(posterPath ? { posterImage: posterPath } : {}),
      };
      all[existingIdx] = drama;
      action = "updated";
    }
    writeAllDramas(all);

    return NextResponse.json({ ok: true, id, action, episode, drama });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload gagal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = (await req.json()) as { id?: string };
    if (!id) {
      return NextResponse.json({ error: "ID wajib diisi." }, { status: 400 });
    }
    const all = getAllDramas();
    const idx = all.findIndex((d) => d.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Drama tidak ditemukan." }, { status: 404 });
    }
    const cwd = process.cwd();
    await rm(join(cwd, "public", "videos", id), { recursive: true, force: true });
    for (const ext of [".png", ".jpg", ".jpeg", ".webp"]) {
      await rm(join(cwd, "public", "posters", `${id}${ext}`), { force: true });
    }
    all.splice(idx, 1);
    writeAllDramas(all);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Hapus gagal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
