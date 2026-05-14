import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Comment = {
  id: string;
  user: string;
  email: string;
  role: "admin" | "viewer";
  text: string;
  time: string;
};

type CommentsFile = { comments: Record<string, Comment[]> };

const DATA_FILE = join(process.cwd(), "data", "comments.json");

function readComments(): CommentsFile {
  if (!existsSync(DATA_FILE)) return { comments: {} };
  try {
    const raw = readFileSync(DATA_FILE, "utf-8");
    const data = JSON.parse(raw);
    return { comments: data?.comments ?? {} };
  } catch {
    return { comments: {} };
  }
}

function writeComments(data: CommentsFile): void {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET(req: NextRequest) {
  const dramaId = req.nextUrl.searchParams.get("dramaId");
  const data = readComments();
  if (dramaId) {
    return NextResponse.json({ comments: data.comments[dramaId] ?? [] });
  }
  return NextResponse.json(data);
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
    const role: "admin" | "viewer" = body.role === "admin" ? "admin" : "viewer";
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

    const data = readComments();
    if (!data.comments[dramaId]) data.comments[dramaId] = [];
    const comment: Comment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      user,
      email,
      role,
      text,
      time: new Date().toISOString(),
    };
    data.comments[dramaId].unshift(comment);
    writeComments(data);
    return NextResponse.json({ ok: true, comment });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tambah komentar gagal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { dramaId, commentId, requesterEmail, requesterRole } =
      (await req.json()) as {
        dramaId?: string;
        commentId?: string;
        requesterEmail?: string;
        requesterRole?: "admin" | "viewer";
      };
    if (!dramaId || !commentId) {
      return NextResponse.json(
        { error: "dramaId & commentId wajib." },
        { status: 400 },
      );
    }
    const data = readComments();
    const list = data.comments[dramaId] ?? [];
    const target = list.find((c) => c.id === commentId);
    if (!target) {
      return NextResponse.json({ error: "Komentar tidak ditemukan." }, { status: 404 });
    }
    const isAuthor = target.email === requesterEmail;
    const isAdmin = requesterRole === "admin";
    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { error: "Hanya penulis komentar atau admin yang bisa menghapus." },
        { status: 403 },
      );
    }
    data.comments[dramaId] = list.filter((c) => c.id !== commentId);
    writeComments(data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Hapus komentar gagal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
