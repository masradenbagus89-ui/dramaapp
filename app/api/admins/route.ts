import { NextRequest, NextResponse } from "next/server";
import {
  getAdmins,
  isAdminEmail,
  setAdmins,
  setAdminPassword,
  type AdminsFile,
} from "@/lib/store";
import { getAdminEmail, resolveUserEmail } from "@/lib/session";
import { hashPassword, MIN_ADMIN_PASSWORD_LEN } from "@/lib/admin-password";
import { clientIp } from "@/lib/origin";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admins
 *
 * KENAPA DIPAGARI (audit keamanan 2026-10-24): sebelum ini GET terbuka untuk
 * siapa pun dan menyerahkan NAMA + EMAIL seluruh admin. Terbukti di produksi:
 * satu permintaan tanpa cookie membalas 200 dengan 5 entri admin. Akibatnya
 * brute-force login berubah dari "tebak email DAN password" menjadi "tebak
 * password saja" — dan jalur login admin masih punya cadangan satu
 * `ADMIN_PASSWORD` bersama (app/api/auth/login/route.ts:79), jadi bocornya
 * daftar email langsung menaikkan nilai tiap percobaan. POST (:22) dan DELETE
 * (:81) memang sudah dipagari sejak awal; hanya GET yang terlewat.
 *
 * Dua bentuk jawaban, sengaja berbeda menurut siapa yang bertanya:
 *
 *  1. Sesi ADMIN → daftar lengkap, bentuk `{ admins: [...] }` TIDAK diubah
 *     supaya app/components/admin/AdminManager.tsx:34 tetap jalan apa adanya.
 *
 *  2. `?email=` + sesi penonton → hanya `{ isAdmin: boolean }`, dan HANYA untuk
 *     email milik sesi itu sendiri. Ini yang dibutuhkan spanduk "kamu admin,
 *     masuk ulang" (lib/auth.ts fetchUserRole → needsAdminRelogin, tampil di
 *     TopNav.tsx:242 & KepalaKatalog.tsx:163).
 *
 *     KENAPA dibatasi ke email sendiri, bukan sekadar dibatasi laju: kalau
 *     siapa pun boleh menanyakan email siapa pun, endpoint ini menjadi alat
 *     pemeriksa tebakan ("apakah budi@x.com admin?") — bocornya lebih lambat,
 *     tapi tetap bocor. Dengan dipaku ke email sesi, tak ada yang bisa
 *     ditanyakan selain tentang diri sendiri, jadi celah tebak-menebak hilang
 *     sama sekali. Bonus: identitas diambil dari cookie bertanda tangan, bukan
 *     dari email kiriman klien yang memang tak bisa dipercaya.
 */
export async function GET(req: NextRequest) {
  // Sesi admin: daftar penuh, seperti sebelumnya.
  const admin = await getAdminEmail(req);
  if (admin) {
    const file = await getAdmins();
    return NextResponse.json({ admins: file.admins });
  }

  const diminta = new URL(req.url).searchParams.get("email")?.trim();
  if (!diminta) {
    return NextResponse.json(
      { error: "Hanya admin yang bisa melihat daftar admin." },
      { status: 403 },
    );
  }

  // Pagar tambahan, bukan pagar utama. Pagar utamanya adalah "cuma boleh
  // bertanya soal diri sendiri" di bawah. Ini sekadar meredam skrip yang
  // membanjiri endpoint. Catatan jujur: pembatas ini di MEMORI tiap instance
  // (lib/rate-limit.ts:7-12), jadi best-effort — bukan jaminan lintas-instance.
  const laju = rateLimit(`admins:cek:${clientIp(req.headers)}`, 30, 60_000);
  if (!laju.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi sebentar." },
      { status: 429, headers: { "Retry-After": String(laju.retryAfterSec) } },
    );
  }

  const sesi = await resolveUserEmail(req);
  if (!sesi) {
    return NextResponse.json(
      { error: "Masuk dulu untuk memeriksa status akun." },
      { status: 401 },
    );
  }
  if (sesi.email.trim().toLowerCase() !== diminta.toLowerCase()) {
    // 403, bukan 404 atau jawaban palsu: pemanggil memang sudah login, tapi
    // menanyakan akun orang lain. Dibalas tegas supaya bug di klien kelihatan,
    // dan tak ada informasi apa pun tentang email yang ditanyakan yang ikut
    // keluar dari sini.
    return NextResponse.json(
      { error: "Hanya bisa memeriksa akun sendiri." },
      { status: 403 },
    );
  }

  return NextResponse.json({ isAdmin: await isAdminEmail(sesi.email) });
}

export async function POST(req: NextRequest) {
  try {
    const requester = await getAdminEmail(req);
    if (!requester) {
      return NextResponse.json(
        { error: "Hanya admin yang sudah ada yang bisa menambah admin baru." },
        { status: 403 },
      );
    }

    const body = (await req.json()) as {
      email?: string;
      name?: string;
      password?: string;
    };
    const email = String(body.email ?? "").trim().toLowerCase();
    const name = String(body.name ?? "").trim() || email.split("@")[0];
    const password = String(body.password ?? "");

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });
    }
    if (password && password.length < MIN_ADMIN_PASSWORD_LEN) {
      return NextResponse.json(
        { error: `Password awal minimal ${MIN_ADMIN_PASSWORD_LEN} karakter.` },
        { status: 400 },
      );
    }

    const file: AdminsFile = await getAdmins();

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
    if (password) {
      await setAdminPassword(email, hashPassword(password));
    }

    return NextResponse.json({
      ok: true,
      admin: { email, name, addedAt: today },
      hasPassword: Boolean(password),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tambah admin gagal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const requester = await getAdminEmail(req);
    if (!requester) {
      return NextResponse.json(
        { error: "Hanya admin yang bisa menghapus admin." },
        { status: 403 },
      );
    }

    const body = (await req.json()) as { email?: string };
    const email = String(body.email ?? "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email wajib diisi." }, { status: 400 });
    }

    const file: AdminsFile = await getAdmins();
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
