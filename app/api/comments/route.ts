import { NextRequest, NextResponse } from "next/server";
import {
  getCommentsFor,
  addComment,
  setCommentsFor,
  type Comment,
} from "@/lib/store";
import {
  bersihkanEmailTamu,
  bersihkanNamaTamu,
  bersihkanWebsiteTamu,
  identitasInteraksi,
  opsiCookieTamu,
  TAMU_COOKIE,
  terbitkanTamu,
  type IdentitasInteraksi,
} from "@/lib/tamu";
import { guardMutation } from "@/lib/request-guard";
import { balasanGagal } from "@/lib/api-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Bentuk komentar yang BOLEH dikirim ke browser.
 *
 * 🔒 `email` SENGAJA DIBUANG di sini (2026-10-29). Sampai hari ini GET
 * memulangkan baris komentar apa adanya, jadi ALAMAT EMAIL setiap penulis ikut
 * terkirim ke browser SEMUA pengunjung — siapa pun bisa membacanya dari panel
 * jaringan tanpa alat khusus. Itu data pribadi yang tak pernah perlu diketahui
 * pembaca komentar, dan sejak identitas tamu masuk, nilainya bisa pula berupa
 * nomor tamu yang tak berarti apa-apa bagi mereka.
 *
 * Penggantinya `milikku`: server yang memutuskan "komentar ini punya kamu",
 * karena HANYA server yang bisa membaca cookie tamu (`httpOnly`). Tanpa ini
 * penonton tanpa akun tak akan pernah bisa menghapus komentarnya sendiri —
 * browsernya memang tidak tahu nomor tamunya.
 */
function untukPublik(c: Comment, kunciSaya: string | null) {
  // `emailKontak` ikut dibuang bersama `email`. Keduanya alamat email orang
  // sungguhan; yang satu kunci identitas, yang satu lagi kolom kontak yang
  // diketik penonton sendiri. Pembaca komentar tidak perlu tahu keduanya, dan
  // situs pembanding pun menulis "Your email address will not be published".
  // `website` SENGAJA tetap dikirim — itu memang untuk dipajang.
  const { email, emailKontak: _rahasia, ...aman } = c;
  void _rahasia;
  return { ...aman, milikku: kunciSaya !== null && email === kunciSaya };
}

export async function GET(req: NextRequest) {
  const dramaId = req.nextUrl.searchParams.get("dramaId");
  if (dramaId) {
    const id = await identitasInteraksi(req);
    const list = await getCommentsFor(dramaId);
    return NextResponse.json({
      comments: list.map((c) => untukPublik(c, id?.kunci ?? null)),
      // Dipakai UI untuk memutuskan apakah tombol hapus milik admin digambar.
      admin: Boolean(id?.isAdmin),
    });
  }
  // GET tanpa dramaId tidak dipakai UI; kembalikan kosong agar tetap kompatibel.
  return NextResponse.json({ comments: {} });
}

export async function POST(req: NextRequest) {
  // Otorisasinya sudah benar sejak Tahap 6 (identitas dari sesi, bukan body).
  // Yang terlewat — dan ditemukan audit 2026-10-24 — adalah pagar
  // PENYALAHGUNAAN: tanpa ini satu skrip bisa membanjiri satu judul dengan
  // komentar tanpa batas jumlah (batas 500 karakter hanya membatasi PANJANG
  // tiap komentar, bukan berapa banyak). 20/menit jauh di atas kecepatan
  // manusia menulis komentar, jadi tak ada penonton sah yang tersentuh.
  const blocked = guardMutation(req, {
    bucket: "comments:post",
    limit: 20,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  try {
    const body = (await req.json()) as {
      dramaId?: string;
      user?: string;
      email?: string;
      role?: "admin" | "viewer";
      text?: string;
      parentId?: string;
      emailKontak?: string;
      website?: string;
    };
    const dramaId = String(body.dramaId ?? "").trim();
    const text = String(body.text ?? "").trim();

    // 🔒 Identitas diambil dari cookie — TIDAK PERNAH dari body. Sebelum
    // Tahap 6, email diambil dari body dan siapa pun bisa berkomentar atas
    // nama orang lain. Aturan itu TIDAK dilonggarkan di sini: yang berubah
    // hanya SUMBER cookie-nya (sesi akun, atau cookie tamu bertanda tangan),
    // bukan kepercayaan pada kiriman klien.
    //
    // Belum punya keduanya = pengunjung pertama kali. Sejak login dihapus
    // untuk penonton (owner 2026-10-29), itu keadaan NORMAL, bukan kesalahan —
    // jadi permintaannya tidak ditolak: identitas tamu diterbitkan di sini lalu
    // dipasang sebagai cookie pada balasan di bawah.
    let id: IdentitasInteraksi | null = await identitasInteraksi(req);
    let cookieTamuBaru: string | null = null;
    if (!id) {
      const tamu = terbitkanTamu();
      if (!tamu) {
        // AUTH_SECRET belum dipasang → tanda tangan tak bisa dipercaya.
        // Gagal-MENGUNCI, sama dengan jalur sesi: lebih baik komentar ditolak
        // daripada menerima identitas yang tak bisa dibuktikan sama sekali.
        return NextResponse.json(
          { error: "Komentar sedang tidak bisa dikirim. Coba lagi nanti." },
          { status: 503 },
        );
      }
      cookieTamuBaru = tamu.token;
      id = { kunci: tamu.kunci, isAdmin: false, tamu: true };
    }

    const email = id.kunci;
    // Lencana "Admin" HANYA dari sesi admin bertanda tangan. Tamu tak pernah
    // bisa mendapatkannya — `identitasInteraksi` tidak punya jalan ke sana.
    const role: "admin" | "viewer" = id.isAdmin ? "admin" : "viewer";
    // Tamu mengetik namanya sendiri, jadi teks itu wajib dibersihkan dulu
    // (karakter kendali, penanda arah teks, panjang). Pemilik akun tetap
    // memakai bagian depan emailnya sebagai nama cadangan seperti semula.
    const user = id.tamu
      ? bersihkanNamaTamu(body.user)
      : String(body.user ?? "").trim() || email.split("@")[0];

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

    // Dua kolom OPSIONAL (owner 2026-10-29). Keduanya dibersihkan di server —
    // nilai dari klien tidak pernah dipercaya apa adanya. `null` = tidak lolos
    // ATAU memang dikosongkan; dua-duanya berakhir sama: field-nya tidak
    // ditulis sama sekali, bukan disimpan sebagai string kosong.
    //
    // Sengaja TIDAK menolak permintaan saat bentuknya salah: kolomnya opsional,
    // jadi mengembalikan error untuk email yang salah ketik akan membuang
    // komentar yang sudah susah payah ditulis. Diam-diam tidak menyimpan
    // kolom pelengkap jauh lebih baik daripada membuang isi utamanya.
    const emailKontak = bersihkanEmailTamu(body.emailKontak);
    const website = bersihkanWebsiteTamu(body.website);

    const comment: Comment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      user,
      email,
      role,
      text,
      time: new Date().toISOString(),
      ...(parentId ? { parentId } : {}),
      ...(emailKontak ? { emailKontak } : {}),
      ...(website ? { website } : {}),
    };
    await addComment(dramaId, comment);
    const res = NextResponse.json({
      ok: true,
      // Bentuk yang SAMA dengan GET — tanpa email, dengan penanda milik
      // sendiri. Kalau di sini dikirim utuh, UI akan menyimpan satu komentar
      // berbentuk lain daripada sisanya dan tombol hapusnya ikut salah.
      comment: untukPublik(comment, email),
    });
    // Cookie dipasang HANYA saat identitas tamu baru lahir. Memasangnya tiap
    // kali akan menerbitkan nomor baru pada tiap komentar, dan penonton
    // kehilangan hak hapus atas komentarnya sendiri begitu kirim yang kedua.
    if (cookieTamuBaru) {
      res.cookies.set(TAMU_COOKIE, cookieTamuBaru, opsiCookieTamu());
    }
    return res;
  } catch (err) {
    return balasanGagal("api/comments POST", err, "Komentar gagal disimpan. Coba lagi sebentar lagi.");
  }
}

export async function DELETE(req: NextRequest) {
  // Pagar penyalahgunaan juga di jalur HAPUS: pemeriksaan pemilik di bawah
  // sudah benar (:126-132), tapi tanpa batas laju sebuah skrip masih bisa
  // menembak ribuan percobaan hapus untuk MENEBAK commentId milik orang lain.
  const blocked = guardMutation(req, {
    bucket: "comments:delete",
    limit: 20,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  try {
    const { dramaId, commentId } = (await req.json()) as {
      dramaId?: string;
      commentId?: string;
    };

    // 🔒 Siapa yang menghapus ditentukan dari sesi, bukan dari body. Sebelum
    // Tahap 6, requesterEmail dikirim klien — cukup tahu email orang lain
    // untuk menghapus komentarnya.
    // Di jalur HAPUS identitas tamu TIDAK diterbitkan kalau belum ada —
    // sengaja. Pengunjung tanpa cookie mustahil jadi penulis komentar mana pun,
    // jadi menerbitkan nomor baru di sini cuma memberi dia nomor yang langsung
    // gagal di pemeriksaan pemilik di bawah.
    const id = await identitasInteraksi(req);
    if (!id) {
      return NextResponse.json(
        { error: "Hanya penulis komentar yang bisa menghapusnya." },
        { status: 403 },
      );
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
    // `target.email` memuat KUNCI penulis: alamat email untuk pemilik akun,
    // atau "tamu:<nomor>" untuk penonton tanpa akun. Perbandingannya sama
    // persis — yang berubah cuma bentuk nilainya.
    const isAuthor = target.email === id.kunci;
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
    return balasanGagal("api/comments DELETE", err, "Komentar gagal dihapus. Coba lagi sebentar lagi.");
  }
}
