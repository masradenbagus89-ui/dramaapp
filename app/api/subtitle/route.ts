import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getVideoBaseUrl } from "@/lib/video-base";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Proxy file subtitle .vtt supaya SAME-ORIGIN dengan web (hindari CORS pada <track>).
// Sumber: <VIDEO_BASE_URL>/<id>/<ep>.<lang>.vtt di PC backup (lewat cloudflared),
// atau public/videos/<id>/<ep>.<lang>.vtt saat dev lokal tanpa tunnel.

// Hanya izinkan kode bahasa yang masuk akal (huruf, mis. "id", "en", "zh").
const LANG_RE = /^[a-z]{2,5}$/i;
// id slug aman: huruf/angka/dash.
const ID_RE = /^[a-z0-9-]+$/i;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")?.trim() ?? "";
  const epRaw = searchParams.get("ep")?.trim() ?? "";
  const lang = searchParams.get("lang")?.trim() ?? "";
  const ep = Number(epRaw);

  if (!ID_RE.test(id) || !LANG_RE.test(lang) || !Number.isInteger(ep) || ep < 1) {
    return new NextResponse("Parameter tidak valid", { status: 400 });
  }

  const fileName = `${ep}.${lang}.vtt`;
  const baseUrl = await getVideoBaseUrl();

  let body: string;
  try {
    if (baseUrl) {
      const url = `${baseUrl}/${encodeURIComponent(id)}/${encodeURIComponent(fileName)}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        return new NextResponse("Subtitle tidak ada", { status: 404 });
      }
      body = await res.text();
    } else {
      const p = join(process.cwd(), "public", "videos", id, fileName);
      body = await readFile(p, "utf-8");
    }
  } catch {
    return new NextResponse("Subtitle tidak ada", { status: 404 });
  }

  // Pastikan diawali header WEBVTT walau file sumber lupa menaruhnya.
  if (!body.trimStart().toUpperCase().startsWith("WEBVTT")) {
    body = `WEBVTT\n\n${body}`;
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/vtt; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
