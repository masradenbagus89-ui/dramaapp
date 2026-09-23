// Penjaga TAMPILAN lencana kartu (permintaan owner 2026-09-22: "badge muncul di
// semua halaman").
//
// Bedanya dengan tests/lencana-kartu.test.ts: di sana yang diuji fungsi penyusun
// labelnya; DI SINI komponen `Poster` benar-benar DIRENDER lalu isi HTML-nya
// diperiksa. Lapisan ini perlu karena label yang benar masih bisa gagal sampai
// ke layar — misalnya lencananya dibungkus kondisi yang salah, atau komponen
// kartu lupa memanggilnya — dan kegagalan seperti itu SENYAP: tidak ada error,
// cuma poster yang polos.
//
// `Poster` dipakai SEMUA kartu situs (halaman depan, hasil cari, kategori,
// halaman detail, rekomendasi, riwayat, my-list), jadi menguji satu komponen ini
// menutup semua halaman itu sekaligus.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Drama } from "../lib/types";

const { default: Poster } = await import("../app/components/Poster");

function stub(partial: Partial<Drama> = {}): Drama {
  return {
    id: "d",
    title: "Drama",
    category: "Action",
    episodes: 10,
    views: "1.0K",
    synopsis: "",
    gradient: "from-zinc-800 to-black",
    posterImage: "https://contoh.test/poster.jpg",
    ...partial,
  };
}

function render(drama: Drama, props: Record<string, unknown> = {}): string {
  return renderToStaticMarkup(createElement(Poster, { drama, ...props }));
}

/** Teks di antara tag, tanpa atribut — supaya nama kelas tidak ikut terhitung. */
function isiTeks(html: string): string[] {
  return [...html.matchAll(/>([^<>]+)</g)].map((m) => m[1].trim()).filter(Boolean);
}

describe("Poster — keempat pojok benar-benar tergambar", () => {
  it("film lengkap memajang rating, kualitas, tahun, dan durasi", () => {
    const html = render(
      stub({
        kind: "movie",
        episodes: 1,
        imdbRating: "7.8",
        quality: "CAM",
        year: "2026",
        runtime: "86 min",
      }),
    );
    const teks = isiTeks(html);
    expect(teks).toContain("7.8");
    expect(teks).toContain("CAM");
    expect(teks).toContain("2026");
    expect(teks).toContain("01:26"); // 86 menit -> jam:menit
  });

  it("serial memajang jumlah episode, bukan durasi", () => {
    const teks = isiTeks(
      render(stub({ episodes: 62, quality: "HD", year: "2025", imdbRating: "8.2" })),
    );
    expect(teks).toContain("62 EPS");
    expect(teks).toContain("HD");
    expect(teks).toContain("8.2");
    expect(teks).toContain("2025");
  });

  it("field kosong TIDAK menghasilkan lencana kosong/placeholder", () => {
    // Kondisi katalog DramaKu yang sebenarnya hari ini: 34 dari 41 judul begini.
    const html = render(stub({ episodes: 62, subtitles: ["id"] }));
    const teks = isiTeks(html);
    expect(teks).toContain("62 EPS");
    // Punya subtitle Indonesia TIDAK lagi memunculkan tulisan apa pun di pojok
    // tahun (permintaan owner 2026-09-22 sore).
    expect(teks).not.toContain("SUB INDO");
    // Tidak boleh ada tanda "kosong" yang terbaca seperti nilai sungguhan.
    expect(teks).not.toContain("—");
    expect(teks).not.toContain("N/A");
    expect(teks).not.toContain("null");
    expect(teks).not.toContain("undefined");
    expect(html).not.toContain("NaN");
    // Ikon bintang ikut hilang saat ratingnya belum ada — bintang tanpa angka
    // terbaca seperti rating nol.
    expect(html).not.toContain("lucide-star");
  });

  it("kualitas CAM MERAH, kualitas bersih HIJAU", () => {
    // Warnanya bukan hiasan: CAM = rekaman bioskop, dan penonton memakai
    // penanda itu untuk memutuskan jadi menonton atau tidak. Dua warna ini
    // ditentukan owner lewat dua poster pembanding (2026-09-22 sore).
    for (const buram of ["CAM", "HDCAM"] as const) {
      const html = render(stub({ quality: buram }));
      expect(html).toContain("bg-red-600");
      expect(html).not.toContain("bg-green-600");
    }
    for (const bersih of ["HD", "WEB-DL", "BluRay", "4K"] as const) {
      const html = render(stub({ quality: bersih }));
      expect(html).toContain("bg-green-600");
      expect(html).not.toContain("bg-red-600");
    }
  });

  it("kartu drama berbayar TIDAK memajang tulisan Premium di poster", () => {
    // Chip "🪙 Premium" dihapus dari poster atas permintaan owner 2026-09-23:
    // puluhan kartu berjajar di beranda membuat posternya terlalu penuh.
    //
    // Penjaga ini sengaja dipasang karena kambuhnya SENYAP — chip itu cuma
    // muncul pada drama yang ditandai `premium`, jadi kalau seseorang
    // memasangnya kembali, poster contoh yang dibuka saat memeriksa belum tentu
    // yang berbayar. Tidak ada error, cuma tulisan yang balik lagi.
    const html = render(
      stub({ premium: true, quality: "WEB-DL", year: "2026", imdbRating: "9.0" }),
    );
    const teks = isiTeks(html);
    expect(teks.join(" ")).not.toMatch(/Premium/i);
    expect(html).not.toContain("🪙");
    // Lencana lain TIDAK ikut hilang — yang dibuang hanya penanda berbayarnya.
    expect(teks).toContain("WEB-DL");
    expect(teks).toContain("2026");
    expect(teks).toContain("9.0");
  });

  it("halaman detail tetap bisa mematikan lencana kanan-atas tanpa lencana lain ikut mati", () => {
    // `showBadge={false}` dipakai app/drama/[id]/page.tsx karena halaman itu
    // sudah memajang lencananya sendiri di sebelah judul.
    const html = render(
      stub({ premium: true, quality: "WEB-DL", year: "2026", imdbRating: "9.0" }),
      { showBadge: false },
    );
    const teks = isiTeks(html);
    expect(teks.join(" ")).not.toMatch(/Premium|Exclusive/i);
    expect(teks).toContain("WEB-DL");
    expect(teks).toContain("2026");
    expect(teks).toContain("9.0");
  });

  it("lencana tidak menghalangi klik menuju halaman drama", () => {
    // Seluruh kartu adalah satu tautan; lapisan yang menangkap klik akan
    // membuat poster terasa mati padahal tak ada error di mana pun.
    const html = render(stub({ year: "2026", quality: "HD" }));
    const lapisan = html.match(/class="[^"]*absolute inset-0 z-10[^"]*"/);
    expect(lapisan).not.toBeNull();
    expect(lapisan![0]).toContain("pointer-events-none");
  });
});
