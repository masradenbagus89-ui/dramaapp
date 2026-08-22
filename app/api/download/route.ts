import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getVideoBaseUrl } from "@/lib/video-base";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Proxy unduh episode. Tambah header Content-Disposition: attachment sehingga
// browser (termasuk HP) MEMAKSA unduh — beda dengan link langsung ke tunnel yang
// lintas-origin (atribut download diabaikan → cuma kebuka, tidak terunduh).
const ID_RE = /^[a-z0-9-]+$/i;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")?.trim() ?? "";
  const ep = Number(searchParams.get("ep"));
  if (!ID_RE.test(id) || !Number.isInteger(ep) || ep < 1) {
    return new NextResponse("Parameter tidak valid", { status: 400 });
  }

  const fileName = `${ep}.mp4`;
  const disposition = `attachment; filename="${id}-ep${ep}.mp4"`;
  const baseUrl = await getVideoBaseUrl();

  try {
    if (baseUrl) {
      const url = `${baseUrl}/${encodeURIComponent(id)}/${encodeURIComponent(fileName)}`;
      // redirect manual: cegah upstream mengarahkan server kita ke host lain (SSRF).
      const upstream = await fetch(url, {
        cache: "no-store",
        redirect: "manual",
      });
      if (!upstream.ok || !upstream.body) {
        return new NextResponse(
          "Video tidak ditemukan atau sumber (PC backup) sedang mati.",
          { status: 502 },
        );
      }
      const headers = new Headers();
      // Dipaksa video/mp4 (tidak disalin dari upstream): jalur ini same-origin,
      // jadi tipe pilihan upstream bisa dirender browser di domain kita.
      headers.set("Content-Type", "video/mp4");
      headers.set("X-Content-Type-Options", "nosniff");
      const len = upstream.headers.get("Content-Length");
      if (len) headers.set("Content-Length", len);
      headers.set("Content-Disposition", disposition);
      headers.set("Cache-Control", "no-store");
      return new NextResponse(upstream.body, { status: 200, headers });
    }

    // Dev lokal tanpa tunnel: baca dari public/videos.
    const p = join(process.cwd(), "public", "videos", id, fileName);
    const buf = await readFile(p);
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": disposition,
      },
    });
  } catch {
    return new NextResponse("Gagal mengunduh episode.", { status: 502 });
  }
}
