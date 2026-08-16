import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * API TIRUAN — berlagak jadi server penyedia video milik orang lain.
 *
 * Gunanya cuma untuk MENCOBA jalur /api/external-videos tanpa menunggu API
 * asli. Bentuk JSON-nya sengaja dibuat "berantakan" seperti API dunia nyata:
 * nama field beda-beda, ada yang mengirim kode <iframe> mentah, ada yang
 * alamatnya kurang "https:", dan ada 2 item yang MEMANG HARUS DITOLAK pagar
 * keamanan kita.
 *
 * Cara pakai (lokal): set EXTERNAL_VIDEO_API_URL ke alamat route ini.
 * Berkas ini AMAN dihapus begitu API asli dari penyedia sudah ada.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    // Daftarnya dibungkus "data" — penerjemah kita harus bisa menemukannya.
    data: [
      {
        // Kasus 1: paling rapi — nama field lazim, alamat lengkap.
        id: "demo-1",
        title: "Big Buck Bunny",
        episode: 1,
        poster: "https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg",
        embed_url: "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ",
      },
      {
        // Kasus 2: penyedia mengirim KODE TEMPEL, bukan alamat.
        // Penerjemah harus mengambil src-nya saja, bukan menempel HTML mentah.
        id: "demo-2",
        name: "Contoh dari kode tempel",
        ep: "2",
        iframe:
          '<iframe src="https://player.vimeo.com/video/76979871" width="640" height="360" allowfullscreen></iframe>',
      },
      {
        // Kasus 3: alamat tanpa "https:" di depan (protocol-relative) +
        // "&amp;" yang terbawa dari HTML. Dua-duanya harus dirapikan otomatis.
        video_id: "demo-3",
        judul: "Alamat kurang https + &amp; nyangkut",
        nomor: 3,
        url: "//archive.org/embed/BigBuckBunny_124?start=0&amp;autoplay=0",
      },
      {
        // Kasus 4: HARUS DITOLAK — domain tidak ada di daftar izin.
        id: "demo-4-ditolak",
        title: "Video dari domain asing",
        embed_url: "https://situs-jahat.example/player/1",
      },
      {
        // Kasus 5: HARUS DITOLAK — bukan https (situs kita https).
        id: "demo-5-ditolak",
        title: "Video lewat http biasa",
        embed_url: "http://www.youtube-nocookie.com/embed/aqz-KE-bpKQ",
      },
    ],
  });
}
