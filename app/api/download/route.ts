import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getVideoBaseUrl } from "@/lib/video-base";
import { FREE_EPISODES } from "@/lib/coins";
import {
  balasanAksesDitolak,
  periksaAksesEpisode,
} from "@/lib/paywall-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Unduh episode: PENUNJUK ARAH ke tunnel (produksi) atau baca berkas lokal (dev).
//
// KENAPA diubah dari proxy jadi redirect (2026-08-26): versi lama menyalurkan
// isi episode lewat server (`new NextResponse(upstream.body)`) — satu unduhan
// 300 MB = 3% jatah bulanan Vercel terbakar sekaligus.
//
// ⚠️ Alasan itu TETAP BERLAKU sesudah pindah ke Railway (2026-10) — jangan
// dikira gugur cuma karena platformnya ganti. Yang berubah hanya nama tagihannya:
// bandwidth & jam CPU container juga dihitung, dan menyalurkan ratusan MB lewat
// server tetap membayar untuk sesuatu yang bisa dilayani langsung oleh tunnel.
// Route ini memang jarang
// terpakai (lib/video.ts:21 sudah mengarahkan tombol Unduh LANGSUNG ke tunnel
// selama alamatnya ada), tapi justru itu bahayanya: ia jalur cadangan yang
// menyala persis saat keadaan sedang kacau — dan waktu itu tak ada yang
// mengawasi kuota. Dibereskan sekarang selagi murah.
//
// KENAPA paksa-unduh tetap jalan sesudah redirect: `?dl=1` ditangani Caddy di
// PC backup dengan `header Content-Disposition "attachment"`
// (pc-backup-agent/Caddyfile:22-26), jadi HP tetap MENGUNDUH sampai tuntas —
// bukan sekadar membuka video di tab. Itu juga alasan batas 60 detik fungsi
// Vercel tak lagi relevan untuk jalur produksi: berkasnya tak lewat sini.
//
// KEAMANAN (rak owasp — open redirect): tujuan redirect tidak berasal dari
// klien. `baseUrl` sudah lolos allowlist host di lib/video-base.ts, `id`/`ep`
// divalidasi di bawah.
const ID_RE = /^[a-z0-9-]+$/i;

// Sama pendeknya dengan /api/teaser dan untuk alasan yang sama: alamat tunnel
// berganti tiap PC backup restart, jadi redirect JANGAN disimpan lama.
const REDIRECT_CACHE = "public, max-age=0, s-maxage=60";

// Balasan yang bergantung pada SIAPA yang bertanya tak boleh masuk cache
// bersama — alasan lengkapnya di app/api/teaser/route.ts (CACHE_PER_ORANG).
const CACHE_PER_ORANG = "private, no-store";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")?.trim() ?? "";
  const ep = Number(searchParams.get("ep"));
  if (!ID_RE.test(id) || !Number.isInteger(ep) || ep < 1 || ep > 999) {
    return new NextResponse("Parameter tidak valid", { status: 400 });
  }

  // GERBANG PAYWALL — mendahului pencarian alamat tunnel, supaya pemanggil yang
  // tak berhak tidak ikut diberi tahu alamat sumber videonya. Tombol unduh di
  // halaman detail dipaku ep 1 (lib/video.ts:64) sehingga lewat tanpa menyentuh
  // database; yang tertahan hanyalah pemanggilan langsung ke episode berbayar.
  const akses = await periksaAksesEpisode(req, id, ep);
  if (akses !== "boleh") {
    const { pesan, status } = balasanAksesDitolak(akses);
    return new NextResponse(pesan, {
      status,
      headers: { "Cache-Control": CACHE_PER_ORANG },
    });
  }

  const fileName = `${ep}.mp4`;
  const baseUrl = await getVideoBaseUrl();

  if (baseUrl) {
    const target = `${baseUrl}/${encodeURIComponent(id)}/${encodeURIComponent(fileName)}?dl=1`;
    return new NextResponse(null, {
      status: 307,
      headers: {
        Location: target,
        // Hanya jatah gratis yang jawabannya sama untuk semua orang.
        "Cache-Control": ep <= FREE_EPISODES ? REDIRECT_CACHE : CACHE_PER_ORANG,
      },
    });
  }

  // Tanpa tunnel = mode lokal/dev: baca dari public/videos.
  //
  // Jalur ini tidak aktif di server, tapi SEBABNYA berubah 2026-10-16 dan itu
  // perlu dicatat: dulu karena filesystem Vercel read-only (jaminan platform),
  // sekarang karena `public/videos` memang KOSONG di container — nol berkas
  // ter-track di git, dan sejak endpoint unggah-ke-disk dihapus tak ada lagi
  // jalur yang bisa mengisinya. Kalau suatu saat ada kode baru yang menulis ke
  // folder itu, jalur ini ikut hidup dengan isi yang lenyap tiap deploy —
  // pertimbangkan itu sebelum menambahkannya.
  try {
    const p = join(process.cwd(), "public", "videos", id, fileName);
    const buf = await readFile(p);
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `attachment; filename="${id}-ep${ep}.mp4"`,
        // Dinyatakan eksplisit, jangan diserahkan ke dugaan cache: tanpa
        // header ini, perantara boleh menyimpan isi episode berbayar dengan
        // kebijakannya sendiri. Jalur ini memang dev-only (lihat catatan di
        // bawah), tapi pagar yang bergantung pada "jalurnya kan tidak aktif"
        // akan jebol diam-diam begitu jalurnya hidup lagi.
        "Cache-Control": ep <= FREE_EPISODES ? REDIRECT_CACHE : CACHE_PER_ORANG,
      },
    });
  } catch {
    // Gagal-AMAN (rak owasp A10): sumber tak terjangkau = 502 apa adanya,
    // jangan menebak alamat lain.
    return new NextResponse(
      "Video tidak ditemukan atau sumber (PC backup) sedang mati.",
      { status: 502 },
    );
  }
}
