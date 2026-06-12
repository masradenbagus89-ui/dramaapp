import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/session";
import { addAd, removeAd } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isUrl = (s: string) => /^https?:\/\/.+/i.test(s.trim());

// POST /api/admin/ads { title?, imageUrl, linkUrl } — tambah iklan sponsor.
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { title?: string; imageUrl?: string; linkUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }
  const imageUrl = (body.imageUrl ?? "").trim();
  const linkUrl = (body.linkUrl ?? "").trim();
  if (!isUrl(imageUrl) || !isUrl(linkUrl)) {
    return NextResponse.json(
      { error: "URL gambar & link harus diawali http(s)://" },
      { status: 400 },
    );
  }
  const ad = await addAd({ title: body.title, imageUrl, linkUrl });
  return NextResponse.json({ ok: true, ad });
}

// DELETE /api/admin/ads { id } — hapus iklan.
export async function DELETE(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }
  if (!body.id) {
    return NextResponse.json({ error: "id wajib." }, { status: 400 });
  }
  await removeAd(body.id);
  return NextResponse.json({ ok: true });
}
