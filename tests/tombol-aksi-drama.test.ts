// Penjaga BARIS TOMBOL AKSI di halaman drama — owner 2026-10-30
// ("bisa kamu cek bagian itu karena ada yang ketutup").
//
// KERUSAKAN YANG DIJAGA, diukur dari potret layar produksi sebelum perbaikan:
// di lebar 1280px baris itu cuma menampilkan "Mulai Nonton" + "Tambah Favorit";
// "Suka" tampak sepotong di tepi kanan dan "Bagikan" HILANG TOTAL.
//
// Sebabnya rantai tiga hal yang masing-masing terlihat wajar sendiri-sendiri:
//   1. Tombol dasar project membawa `shrink-0` (components/ui/button.tsx) —
//      artinya "jangan pernah menyusut".
//   2. SaveButton/LikeButton/ShareButton masing-masing membawa `w-full` —
//      artinya "ambil 100% lebar induk".
//   3. Ketiganya ditaruh dalam SATU induk ber-`flex-1`, dan induk di atasnya
//      ber-`overflow-hidden`.
// Hasilnya: tiga tombol sama-sama menuntut 100% ruang yang sama, menolak
// menyusut, lalu kelebihannya DIPOTONG diam-diam. Nol error, nol scrollbar,
// nol tes merah — satu-satunya gejalanya adalah layar yang dilihat manusia.
//
// ⚠️ KENAPA SEBAGIAN TES INI MEMBACA SUMBER, BUKAN MERENDER:
// kerusakannya murni soal LEBAR, dan tak ada mesin tata letak di sini — jsdom
// (satu-satunya yang terpasang) tidak menghitung lebar sama sekali, jadi tes
// render apa pun akan HIJAU baik tombolnya terpotong maupun tidak. Jadi yang
// dikunci di sini adalah BENTUK yang membuat pemotongan mustahil. Bukti
// visualnya terpisah: potret Edge headless di 1440/1280/1024/820/500 px,
// dicatat di docs/lintasai/rencana/2026-10-30-tombol-aksi-terpotong.md.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import SaveButton from "../app/components/SaveButton";
import LikeButton from "../app/components/LikeButton";
import ShareButton from "../app/components/ShareButton";

const sumberHalaman = readFileSync(
  join(process.cwd(), "app/drama/[id]/page.tsx"),
  "utf8",
);

/** Baris tombol aksi saja — supaya asersi di bawah tak tertipu `flex-wrap`
 *  milik bagian lain halaman (chip subtitle, daftar episode, dll). */
function barisAksi(): string {
  const mulai = sumberHalaman.indexOf("<WatchCta");
  const selesai = sumberHalaman.indexOf("</div>", sumberHalaman.indexOf("<ShareButton"));
  expect(mulai, "baris tombol aksi tidak ditemukan di halaman drama").toBeGreaterThan(0);
  // Mundur sedikit untuk ikut menangkap div pembungkusnya.
  return sumberHalaman.slice(sumberHalaman.lastIndexOf("<div", mulai), selesai);
}

describe("baris tombol aksi halaman drama — tak boleh terpotong lagi", () => {
  it("barisnya BOLEH membungkus, supaya kelebihan turun ke bawah bukan dipotong", () => {
    // Ini pagar utamanya. Tanpa `flex-wrap`, tombol yang tak muat akan
    // terdorong keluar lalu dipotong `overflow-hidden` kartu putih —
    // persis kerusakan yang owner laporkan.
    expect(
      barisAksi(),
      "`sm:flex-wrap` hilang — tombol yang tak muat akan terpotong diam-diam lagi",
    ).toContain("sm:flex-wrap");
  });

  it("keempat tombol punya lebar minimum, jadi teksnya tak pernah terjepit", () => {
    const baris = barisAksi();
    // `flex-1` membuat lebar dasar 0 sehingga tombol hanya TUMBUH membagi
    // ruang; `min-w-*` yang menjaga teksnya tetap utuh DAN yang menentukan
    // kapan barisnya membungkus. Hilang salah satu = bentuknya kembali rapuh.
    expect(baris.match(/sm:min-w-\[\d+px\]/g) ?? []).toHaveLength(4);
    expect(baris.match(/sm:flex-1/g) ?? []).toHaveLength(4);
  });

  it("keempat tombol memang ada di baris itu", () => {
    const baris = barisAksi();
    for (const tombol of ["WatchCta", "SaveButton", "LikeButton", "ShareButton"]) {
      expect(baris, `${tombol} hilang dari baris tombol aksi`).toContain(
        `<${tombol}`,
      );
    }
  });

  it("tiga tombol kanan TIDAK lagi dikurung satu pembungkus ber-flex-1", () => {
    // Bentuk lama: <div className="flex flex-1 gap-2"> membungkus ketiganya.
    // Itu yang memaksa tiga `w-full` berebut satu ruang. Kalau pola itu
    // kembali, kerusakannya kembali juga.
    expect(barisAksi()).not.toContain('className="flex flex-1 gap-2"');
  });
});

describe("prop className ketiga tombol BENAR-BENAR dipakai", () => {
  // Cacat nyata yang ikut ketahuan: SaveButton MENGUMUMKAN prop `className`
  // tapi cabang yang dipakai halaman drama tidak pernah memasangnya — prop
  // yang berbohong. Pemanggil mengatur lebar, lalu diabaikan tanpa satu pun
  // peringatan. LikeButton malah belum punya propnya sama sekali.
  const penanda = "uji-kelas-khusus";

  it("SaveButton memasang className di varian yang dipakai halaman drama", () => {
    const html = renderToStaticMarkup(
      createElement(SaveButton, { id: "x", terang: true, className: penanda }),
    );
    expect(html).toContain(penanda);
  });

  it("LikeButton memasang className", () => {
    const html = renderToStaticMarkup(
      createElement(LikeButton, { dramaId: "x", terang: true, className: penanda }),
    );
    expect(html).toContain(penanda);
  });

  it("ShareButton memasang className", () => {
    const html = renderToStaticMarkup(
      createElement(ShareButton, { title: "X", terang: true, className: penanda }),
    );
    expect(html).toContain(penanda);
  });
});
