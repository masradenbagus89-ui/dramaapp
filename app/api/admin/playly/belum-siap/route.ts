import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/session";
import { guardMutation } from "@/lib/request-guard";
import { idVideoBelumSiap } from "@/lib/playly-berkas-siap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Video mana yang catatannya ada di Playly tapi BERKASNYA tidak.
 *
 * KENAPA JADI ENDPOINT SENDIRI (owner 2026-11-11). Pemeriksaan ini = satu
 * permintaan ke Playly PER VIDEO: 489 video, 4 sekaligus, ~123 giliran
 * berurutan, lantai >=47 detik. Dulu ia dikerjakan SAAT halaman admin dirakit,
 * jadi ongkosnya dibayar ulang tiap halaman dibuka dan jawabannya tidak pernah
 * bisa disimpan. Dipindah ke sini supaya: (a) halaman tidak menanggungnya sama
 * sekali, (b) hasilnya bisa diingat 5 menit (lib/playly-berkas-siap.ts).
 *
 * Kontrak:
 *   POST { ids: string[] } -> 200 { ok: true, ids: string[], diperiksa: number }
 *                             400 { error } isi permintaan tak terbaca / tak sah
 *                             401 { error } bukan admin
 *                             403/429 dari guardMutation (asal tak dikenal / terlalu sering)
 *                             500 { error } gagal tak terduga
 *
 * `diperiksa` = berapa video yang benar-benar ditanyakan ke Playly kali ini.
 * 0 artinya semua dijawab dari ingatan. Ikut dikirim supaya penghematannya bisa
 * DIBUKTIKAN dari luar, bukan dipercaya begitu saja.
 *
 * KENAPA POST untuk pekerjaan yang sifatnya membaca: daftar id-nya panjang —
 * 489 id x ~13 huruf ~ 6,4 KB, jauh melewati panjang alamat yang aman dipakai
 * di query string. Bukan karena ia mengubah sesuatu; endpoint ini NOL menulis.
 *
 * CATATAN PENYIMPANGAN dari skills/backend/SKILL.md §1 (kegagalan validasi isi
 * seharusnya 422, bukan 400): project ini konsisten memakai 400 — terhitung 93
 * pemakaian `status: 400` berbanding 7 `status: 422` di app/api. Mengikuti rak
 * di SATU endpoint justru membuat klien menghadapi dua konvensi berbeda.
 * Kenyataan kode menang (AGENTS.md §4.3).
 */

/** Batas id per permintaan. Sejajar PLAYLY_MAKS_HALAMAN x 100 di lib/playly.ts. */
const MAKS_ID = 1000;

/**
 * Bentuk id video Playly yang diterima. Sempit dengan sengaja: id ini ikut
 * dirangkai jadi alamat saat ditanyakan ke Playly, dan input dari luar adalah
 * data tak-tepercaya sampai divalidasi (rak backend §1).
 */
const POLA_ID = /^[A-Za-z0-9_-]{1,64}$/;

export async function POST(req: NextRequest) {
  // Anti-CSRF (asal harus domain sendiri) + pembatas laju per-IP; 429-nya sudah
  // membawa `Retry-After` (lib/request-guard.ts:79). Dipakai walau endpoint ini
  // tidak menulis apa pun: SATU permintaan di sini bisa memicu ratusan panggilan
  // ke server Playly, jadi ongkosnya setara operasi berat, bukan sekadar baca.
  const blocked = guardMutation(req, {
    bucket: "playly:belum-siap",
    limit: 30,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  // Default-deny: identitas dari cookie sesi yang ditandatangani server, bukan
  // dari isi permintaan — pemanggil tidak bisa mengaku jadi admin.
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { ids?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Isi permintaan tidak bisa dibaca." },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.ids)) {
    return NextResponse.json(
      { error: "Kolom `ids` wajib berupa daftar." },
      { status: 400 },
    );
  }
  if (body.ids.length > MAKS_ID) {
    return NextResponse.json(
      { error: `Terlalu banyak id (maksimal ${MAKS_ID}).` },
      { status: 400 },
    );
  }

  // Id yang bentuknya tak dikenal DIBUANG, bukan membuat seluruh permintaan
  // gagal: satu id aneh tidak boleh mematikan penanda untuk 488 video lainnya.
  const ids = body.ids.filter(
    (id): id is string => typeof id === "string" && POLA_ID.test(id),
  );

  try {
    const hasil = await idVideoBelumSiap(ids);
    return NextResponse.json({ ok: true, ...hasil });
  } catch (err) {
    // Pesan generik ke klien; detail dalam dicatat di log server saja, tidak
    // ikut keluar lewat body respons (rak backend §1 butir "Rahasia").
    console.error("[playly:belum-siap] gagal memeriksa:", err);
    return NextResponse.json(
      { error: "Gagal memeriksa berkas video." },
      { status: 500 },
    );
  }
}
