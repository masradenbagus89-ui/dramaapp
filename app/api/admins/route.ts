import { NextRequest, NextResponse } from "next/server";
import {
  getAdmins,
  setAdmins,
  isAdminEmail,
  type AdminsFile,
} from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const file = await getAdmins();
  // Hanya kembalikan daftar admin (tanpa data internal lain).
  return NextResponse.json({ admins: file.admins });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      email?: string;
      name?: string;
      requesterEmail?: string;
    };
    const email = String(body.email ?? "").trim().toLowerCase();
    const name = String(body.name ?? "").trim() || email.split("@")[0];
    const requester = String(body.requesterEmail ?? "").trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });
    }

    const file: AdminsFile = await getAdmins();
    if (!(await isAdminEmail(requester))) {
      return NextResponse.json(
        { error: "Hanya admin yang sudah ada yang bisa menambah admin baru." },
        { status: 403 },
      );
    }

    const exists = file.admins.some(
      (a) => a.email.trim().toLowerCase() === email,
    );
    if (exists) {
      return NextResponse.json(
        { error: "Email ini sudah terdaftar sebagai admin." },
        { status: 409 },
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    file.admins.push({ email, name, addedAt: today });
    await setAdmins(file);

    return NextResponse.json({ ok: true, admin: { email, name, addedAt: today } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tambah admin gagal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = (await req.json()) as { email?: string; requesterEmail?: string };
    const email = String(body.email ?? "").trim().toLowerCase();
    const requester = String(body.requesterEmail ?? "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email wajib diisi." }, { status: 400 });
    }

    const file: AdminsFile = await getAdmins();
    if (!(await isAdminEmail(requester))) {
      return NextResponse.json(
        { error: "Hanya admin yang bisa menghapus admin." },
        { status: 403 },
      );
    }
    if (email === requester) {
      return NextResponse.json(
        { error: "Tidak bisa menghapus akun admin Anda sendiri." },
        { status: 400 },
      );
    }
    if (file.admins.length <= 1) {
      return NextResponse.json(
        { error: "Minimal harus ada 1 admin di sistem." },
        { status: 400 },
      );
    }

    const before = file.admins.length;
    file.admins = file.admins.filter(
      (a) => a.email.trim().toLowerCase() !== email,
    );
    if (file.admins.length === before) {
      return NextResponse.json({ error: "Email tidak ditemukan." }, { status: 404 });
    }
    await setAdmins(file);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Hapus admin gagal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
