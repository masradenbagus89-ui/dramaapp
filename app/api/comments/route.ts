import { NextRequest, NextResponse } from "next/server";
import {
  getCommentsFor,
  addComment,
  setCommentsFor,
  type Comment,
} from "@/lib/store";
import { isAdminRequest } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const dramaId = req.nextUrl.searchParams.get("dramaId");
  if (dramaId) {
    return NextResponse.json({ comments: await getCommentsFor(dramaId) });
  }
  // GET tanpa dramaId tidak dipakai UI; kembalikan kosong agar tetap kompatibel.
  return NextResponse.json({ comments: {} });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      dramaId?: string;
      user?: string;
      email?: string;
      role?: "admin" | "viewer";
      text?: string;
    };
    const dramaId = String(body.dramaId ?? "").trim();
    const user = String(body.user ?? "").trim();
    const email = String(body.email ?? "").trim();
    // Badge "admin" hanya diberikan kalau request benar-benar membawa sesi admin
    // yang valid — bukan sekadar klaim dari body (anti-spoof).
    const role: "admin" | "viewer" =
      body.role === "admin" && (await isAdminRequest(req)) ? "admin" : "viewer";
    const text = String(body.text ?? "").trim();

    if (!dramaId || !user || !text) {
      return NextResponse.json(
        { error: "dramaId, user, dan text wajib diisi." },
        { status: 400 },
      );
    }
    if (text.length > 500) {
      return NextResponse.json(
        { error: "Komentar maksimal 500 karakter." },
        { status: 400 },
      );
    }

    const comment: Comment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      user,
      email,
      role,
      text,
      time: new Date().toISOString(),
    };
    await addComment(dramaId, comment);
    return NextResponse.json({ ok: true, comment });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tambah komentar gagal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { dramaId, commentId, requesterEmail } = (await req.json()) as {
      dramaId?: string;
      commentId?: string;
      requesterEmail?: string;
    };
    if (!dramaId || !commentId) {
      return NextResponse.json(
        { error: "dramaId & commentId wajib." },
        { status: 400 },
      );
    }
    const list = await getCommentsFor(dramaId);
    const target = list.find((c) => c.id === commentId);
    if (!target) {
      return NextResponse.json({ error: "Komentar tidak ditemukan." }, { status: 404 });
    }
    const isAuthor = target.email === requesterEmail;
    const isAdmin = await isAdminRequest(req); // diverifikasi dari sesi, bukan body
    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { error: "Hanya penulis komentar atau admin yang bisa menghapus." },
        { status: 403 },
      );
    }
    await setCommentsFor(
      dramaId,
      list.filter((c) => c.id !== commentId),
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Hapus komentar gagal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
