import { NextRequest, NextResponse } from "next/server";
import {
  getCommentsFor,
  addComment,
  setCommentsFor,
  type Comment,
} from "@/lib/store";
import { resolveUserEmail } from "@/lib/session";

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
      parentId?: string;
    };
    const dramaId = String(body.dramaId ?? "").trim();
    const text = String(body.text ?? "").trim();

    // 🔒 Identitas (email + role) diambil dari cookie sesi terverifikasi.
    // Sebelum Tahap 6, email diambil dari body — siapa pun bisa berkomentar
    // atas nama orang lain. Nama tampilan boleh tetap dari body: itu label
    // kosmetik, sedangkan identitas sebenarnya adalah emailnya.
    const id = await resolveUserEmail(req);
    if (!id) {
      return NextResponse.json(
        { error: "Masuk dulu untuk berkomentar." },
        { status: 401 },
      );
    }
    const email = id.email;
    const role: "admin" | "viewer" = id.isAdmin ? "admin" : "viewer";
    const user = String(body.user ?? "").trim() || email.split("@")[0];

    if (!dramaId || !text) {
      return NextResponse.json(
        { error: "dramaId dan text wajib diisi." },
        { status: 400 },
      );
    }
    if (text.length > 500) {
      return NextResponse.json(
        { error: "Komentar maksimal 500 karakter." },
        { status: 400 },
      );
    }

    // Balasan dibatasi 1 tingkat: induk harus ada DAN bukan balasan juga.
    // Tanpa cek ini, klien bisa mengirim parentId ngawur -> komentar yatim
    // yang tersimpan tapi tak pernah tampil.
    const parentId = String(body.parentId ?? "").trim();
    if (parentId) {
      const existing = await getCommentsFor(dramaId);
      const parent = existing.find((c) => c.id === parentId);
      if (!parent) {
        return NextResponse.json(
          { error: "Komentar yang dibalas tidak ditemukan." },
          { status: 400 },
        );
      }
      if (parent.parentId) {
        return NextResponse.json(
          { error: "Balasan hanya boleh satu tingkat." },
          { status: 400 },
        );
      }
    }

    const comment: Comment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      user,
      email,
      role,
      text,
      time: new Date().toISOString(),
      ...(parentId ? { parentId } : {}),
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
    const { dramaId, commentId } = (await req.json()) as {
      dramaId?: string;
      commentId?: string;
    };

    // 🔒 Siapa yang menghapus ditentukan dari sesi, bukan dari body. Sebelum
    // Tahap 6, requesterEmail dikirim klien — cukup tahu email orang lain
    // untuk menghapus komentarnya.
    const id = await resolveUserEmail(req);
    if (!id) {
      return NextResponse.json({ error: "Masuk dulu." }, { status: 401 });
    }
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
    const isAuthor = target.email === id.email;
    if (!isAuthor && !id.isAdmin) {
      return NextResponse.json(
        { error: "Hanya penulis komentar atau admin yang bisa menghapus." },
        { status: 403 },
      );
    }
    // Hapus komentar itu SEKALIGUS balasannya. Kalau hanya induknya yang
    // dihapus, balasannya tetap tersimpan tapi tak punya induk -> tak pernah
    // tampil di UI (sampah yang menumpuk diam-diam).
    await setCommentsFor(
      dramaId,
      list.filter((c) => c.id !== commentId && c.parentId !== commentId),
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Hapus komentar gagal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
