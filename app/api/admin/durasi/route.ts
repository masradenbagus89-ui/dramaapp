import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/session";
import { getVideoBaseUrl } from "@/lib/video-base";
import { videoSrc } from "@/lib/video";
import { tandaTanganiUrlVideo } from "@/lib/video-signature";
import { getDrama, upsertDrama } from "@/lib/dramas";
import { isMovie } from "@/lib/types";
import { durasiTayangan } from "@/lib/format";
import {
  BYTE_HEADER_DIBACA,
  detikDariHeaderMp4,
  detikKeDurasiEpisode,
} from "@/lib/durasi-video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PENGUKUR DURASI dari berkas video — MEMBACA, tidak menyimpan.
//
// KENAPA ADA (owner 2026-11-09: "bisa tidak kamu buat otomatis durasinya jadi
// saya cukup edit sedikit"): kolom Durasi diisi tangan, dan isian massal
// 2026-09-22 ("119 min" untuk 25 serial) tidak punya sumber — berkas SQL-nya
// (supabase_migrations/isi_lencana_awal_dramas.sql) menyatakan sendiri angkanya
// bukan hasil pembacaan video mana pun. Begitu poster serial ikut memajang
// durasi, angka tanpa sumber itu terlihat penonton. Satu-satunya sumber jujur
// adalah berkas videonya sendiri.
//
// ⚠️ KENAPA DI SERVER, bukan skrip di komputer owner: berkas video dijaga tanda
// tangan (lib/video-signature.ts) yang butuh `VIDEO_SIGNING_SECRET`. Kunci itu
// hidup di panel hosting dan TIDAK boleh disalin ke mesin lain (§5.2) — apalagi
// komputer kerja owner yang dipakai bersama puluhan penyewa. Di sini kunci itu
// memang sudah ada. Dibuktikan 2026-11-09: tanpa tanda tangan, tunnel membalas
// 403 untuk tiap berkas.
//
// ⚠️ MEMBACA SAJA — sengaja tidak menyentuh database (§3.7: pisahkan perintah
// dari pertanyaan). Hasilnya dikirim ke panel admin, owner melihat angkanya,
// lalu menyimpan lewat jalur simpan drama yang sudah ada. Endpoint yang
// mengukur SEKALIGUS menimpa puluhan baris sendiri akan mengubah katalog tanpa
// satu pun mata manusia melihat angkanya dulu — persis cara isian massal lama
// jadi masalah.
//
// KEAMANAN (rak backend + owasp, dibuka sebelum berkas ini ditulis):
//   * admin-only — `isAdminRequest`, sama dengan /api/admin/scan
//   * `id` & `ep` divalidasi BENTUKNYA sebelum menyentuh apa pun (path traversal)
//   * tujuan TIDAK berasal dari klien: `baseUrl` dari getVideoBaseUrl() yang
//     sudah lolos allowlist host — klien hanya memilih id, bukan alamat (SSRF)
//   * `redirect: "manual"` — allowlist cuma memeriksa alamat AWAL, jadi 302 dari
//     upstream bisa menyeret permintaan ke host lain
//   * `Range` membatasi unduhan ke 256KB, bukan satu episode penuh
//   * timeout — tunnel PC backup bisa menggantung; tanpa batas, permintaan admin
//     ikut menggantung selamanya
//   * A10 gagal-AMAN: tiap jalur gagal MENOLAK dengan status yang benar. Tidak
//     ada `catch` yang memulangkan angka tebakan — durasi yang tak terbaca
//     dilaporkan apa adanya supaya diisi manusia.
//
// Status yang dipakai (rak backend §1): 400 = bentuk parameter salah ·
// 401 = bukan admin · 404 = berkasnya tidak ada · 422 = berkas terbaca tapi
// durasinya tidak · 502 = PC backup gagal menjawab · 500 = tak terduga.

/** Sama dengan /api/admin/scan & /api/admin/hardlink. */
const ID_RE = /^[a-z0-9-]{1,100}$/i;

/**
 * Batas tunggu satu berkas. 20 detik dipilih karena permintaannya cuma 256KB
 * lewat tunnel rumahan — kalau belum menjawab selama itu, menunggu lebih lama
 * tidak menolong, dan panel admin keburu terlihat menggantung.
 */
const TIMEOUT_MS = 20_000;

export async function GET(req: NextRequest) {
  try {
    if (!(await isAdminRequest(req))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dramaId = searchParams.get("id")?.trim();
    if (!dramaId || !ID_RE.test(dramaId)) {
      return NextResponse.json(
        { error: "Parameter 'id' wajib & hanya boleh huruf, angka, dan tanda hubung." },
        { status: 400 },
      );
    }

    // Episode mana yang diukur. Default 1 — pada drama pendek seluruh episode
    // panjangnya seragam, jadi satu pembacaan sudah mewakili. Bisa ditimpa
    // kalau episode 1 kebetulan rusak atau terpotong.
    const epMentah = searchParams.get("ep")?.trim();
    const ep = epMentah ? Number(epMentah) : 1;
    if (!Number.isInteger(ep) || ep < 1 || ep > 9999) {
      return NextResponse.json(
        { error: "Parameter 'ep' harus bilangan bulat 1-9999." },
        { status: 400 },
      );
    }

    const baseUrl = await getVideoBaseUrl();
    if (!baseUrl) {
      return NextResponse.json(
        {
          error:
            "Alamat sumber video belum ada. PC backup belum pernah melapor, dan NEXT_PUBLIC_VIDEO_BASE_URL juga kosong di Environment Variables panel hosting (Railway).",
        },
        { status: 500 },
      );
    }

    const url = tandaTanganiUrlVideo(
      videoSrc(baseUrl, dramaId, ep, ""),
      Date.now() / 1000,
    );

    let res: Response;
    try {
      res = await fetch(url, {
        cache: "no-store",
        redirect: "manual",
        headers: { Range: `bytes=0-${BYTE_HEADER_DIBACA - 1}` },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      return NextResponse.json(
        {
          error: `Tidak bisa membaca video episode ${ep}: ${m}. Pastikan Caddy + cloudflared masih jalan di PC backup.`,
        },
        { status: 502 },
      );
    }

    // 206 = server menghormati Range (yang diharapkan); 200 = dia mengirim
    // seluruh berkas. Keduanya bisa dipakai — headernya tetap di awal.
    if (res.status !== 206 && res.status !== 200) {
      const ditolak = res.status === 403;
      return NextResponse.json(
        {
          error: ditolak
            ? "Video menolak permintaan (403). Tanda tangan tidak diterima PC backup — periksa VIDEO_SIGNING_SECRET di panel hosting cocok dengan yang dipasang Caddy."
            : `Video episode ${ep} tidak terbaca (HTTP ${res.status}). Pastikan berkas "${ep}.mp4" ada di folder "${dramaId}".`,
        },
        { status: ditolak ? 502 : 404 },
      );
    }

    const detik = detikDariHeaderMp4(new Uint8Array(await res.arrayBuffer()));
    if (detik === null) {
      return NextResponse.json(
        {
          error: `Durasi tidak tertulis di ${BYTE_HEADER_DIBACA / 1024}KB pertama berkas. Video ini kemungkinan belum disiapkan untuk streaming (atom "moov" di akhir berkas) — durasinya perlu diisi manual.`,
        },
        { status: 422 },
      );
    }

    const teks = detikKeDurasiEpisode(detik);
    if (teks === null) {
      return NextResponse.json(
        {
          error: `Durasi terbaca (${Math.round(detik)} detik) tapi di luar batas wajar, jadi tidak dipakai.`,
        },
        { status: 422 },
      );
    }

    return NextResponse.json({ ok: true, ep, detik, teks });
  } catch (err) {
    // Pesan aslinya IKUT dikirim — menyimpang dari anjuran rak "500 = pesan
    // generik" dengan alasan: endpoint ini admin-only (gerbang di baris
    // pertama), dan satu-satunya pembacanya adalah owner yang sedang
    // mendiagnosa PC backup miliknya sendiri. Pola yang sama sudah dipakai
    // app/api/admin/scan/route.ts:92.
    const message = err instanceof Error ? err.message : "Pengukuran gagal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Simpan HANYA kolom durasi satu drama. Dipakai pengisian massal.
 *
 * ⚠️ KENAPA endpoint sendiri, bukan POST /api/admin/drama yang sudah ada:
 * endpoint itu menerima SELURUH data drama (route.ts:138 — judul, kategori,
 * sinopsis, gambar, subtitle, …). Dipakai untuk mengubah satu kolom pada 40
 * drama sekaligus, ia memaksa klien mengirim ulang seluruh isi tiap drama —
 * dan satu field yang terlewat di perjalanan akan MENGHAPUS data yang benar,
 * diam-diam, 40 kali.
 *
 * Di sini klien cuma boleh mengirim `id` + `runtime`. Isi drama selebihnya
 * dibaca ULANG dari database lalu ditulis balik apa adanya, jadi tidak ada
 * jalan bagi kiriman klien untuk menyentuh field lain — bahkan kalau body-nya
 * sengaja diisi macam-macam.
 */
export async function POST(req: NextRequest) {
  try {
    if (!(await isAdminRequest(req))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { id?: unknown; runtime?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Body bukan JSON yang sah." }, { status: 400 });
    }

    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id || !ID_RE.test(id)) {
      return NextResponse.json(
        { error: "Field 'id' wajib & hanya boleh huruf, angka, dan tanda hubung." },
        { status: 400 },
      );
    }

    const runtime = typeof body.runtime === "string" ? body.runtime.trim() : "";
    if (!runtime) {
      return NextResponse.json(
        { error: "Field 'runtime' wajib diisi. Endpoint ini tidak untuk mengosongkan durasi." },
        { status: 400 },
      );
    }

    const drama = await getDrama(id);
    if (!drama) {
      return NextResponse.json({ error: `Drama "${id}" tidak ada.` }, { status: 404 });
    }

    // Pagar isi (422): nilainya harus benar-benar bisa DIGAMBAR dengan aturan
    // jenis drama ini. UI bukan pagar — siapa pun yang memegang sesi admin bisa
    // mengirim body apa saja, dan durasi yang tersimpan tapi tak pernah
    // tergambar adalah kerusakan senyap: tidak ada error, cuma poster yang
    // diam padahal datanya "sudah diisi".
    const film = isMovie(drama);
    const tergambar = durasiTayangan(runtime, film);
    if (tergambar === null) {
      return NextResponse.json(
        {
          error: film
            ? `"${runtime}" tidak terbaca sebagai durasi film. Contoh yang terbaca: "165 min", "2 jam 45 menit".`
            : `"${runtime}" tidak terbaca sebagai durasi episode. Tulis MENIT.DETIK, contoh "1.47".`,
        },
        { status: 422 },
      );
    }

    await upsertDrama({ ...drama, runtime });

    return NextResponse.json({ ok: true, id, runtime, tergambar });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan durasi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
