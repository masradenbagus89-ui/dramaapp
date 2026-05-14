import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AdminEntry = { email: string; name: string; addedAt: string };
type AdminsFile = { admins: AdminEntry[] };

const DATA_FILE = join(process.cwd(), "data", "admins.json");

function readAdmins(): AdminsFile {
  if (!existsSync(DATA_FILE)) {
    return { admins: [{ email: "admin@dramaku.com", name: "Admin Utama", addedAt: "2026-05-06" }] };
  }
  try {
    const raw = readFileSync(DATA_FILE, "utf-8");
    const data = JSON.parse(raw);
    if (Array.isArray(data?.admins)) return data as AdminsFile;
    return { admins: [] };
  } catch {
    return { admins: [] };
  }
}

function writeAdmins(data: AdminsFile): void {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function isAdminEmail(email: string, file: AdminsFile): boolean {
  const e = email.trim().toLowerCase();
  return file.admins.some((a) => a.email.trim().toLowerCase() === e);
}

export async function GET() {
  const file = readAdmins();
  // Only return emails (no internal data)
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

    const file = readAdmins();
    if (!isAdminEmail(requester, file)) {
      return NextResponse.json(
        { error: "Hanya admin yang sudah ada yang bisa menambah admin baru." },
        { status: 403 },
      );
    }

    if (isAdminEmail(email, file)) {
      return NextResponse.json(
        { error: "Email ini sudah terdaftar sebagai admin." },
        { status: 409 },
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    file.admins.push({ email, name, addedAt: today });
    writeAdmins(file);

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

    const file = readAdmins();
    if (!isAdminEmail(requester, file)) {
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
    file.admins = file.admins.filter((a) => a.email.trim().toLowerCase() !== email);
    if (file.admins.length === before) {
      return NextResponse.json({ error: "Email tidak ditemukan." }, { status: 404 });
    }
    writeAdmins(file);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Hapus admin gagal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
