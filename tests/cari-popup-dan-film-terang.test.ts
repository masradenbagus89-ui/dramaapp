// @vitest-environment jsdom
//
// Penjaga putaran kedua arahan Kang Dedi (owner 2026-10-29, sesudah melihat
// hasil putaran pertama):
//
//   1. *"tombol search masih terlalu besar"* → kotak cari diganti TOMBOL yang
//      membuka lapisan. Ini keputusan ketiga atas lebar yang sama: 448px
//      dilepas 2026-09-21 ("terlalu sempit"), 576px ditolak 2026-10-29
//      ("kelebaran"). Selama kotaknya duduk di bar, lebar berapa pun salah
//      bagi sebagian layar — sebagai tombol, ia tidak memakan ruang sama sekali.
//
//   2. *"ketika klik film ternyata gelap tidak bagus"* → halaman film berlatar
//      TERANG + kolom kanan "Paling Banyak Ditonton".
//
// Kenapa perilaku popup WAJIB dites mesin: ia hidup di state React. `next build`
// dan screenshot sama-sama tetap hijau walau tombolnya mati total — yang satu
// cuma mengecek kode bisa dikompilasi, yang lain cuma memotret keadaan diam.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createElement as h, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";

vi.mock("next/navigation", () => ({
  usePathname: () => "/beranda",
  useSearchParams: () => new URLSearchParams(""),
  useRouter: () => ({ replace: () => {}, push: () => {} }),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const { default: SearchBar, TEKS_KOTAK_CARI } = await import(
  "../app/components/beranda/SearchBar"
);

let container: HTMLDivElement;
let root: Root;

/** Gambar SearchBar dalam mode tombol, dengan kotak yang nilainya terkendali. */
function pasang(modeTombol: boolean) {
  act(() =>
    root.render(
      h(SearchBar, { value: "", onValueChange: () => {}, modeTombol }),
    ),
  );
}

const tombolCari = () =>
  container.querySelector<HTMLButtonElement>('[aria-label="Cari film"]');
const kotakCari = () =>
  container.querySelector<HTMLInputElement>('input[type="search"]');

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("kotak cari jadi TOMBOL yang membuka lapisan", () => {
  it("bar hanya memuat tombol — kotaknya belum ada", () => {
    pasang(true);
    expect(
      tombolCari(),
      "tombol cari tidak tergambar — kepala situs kehilangan pencariannya",
    ).toBeTruthy();
    expect(
      kotakCari(),
      "kotak cari masih duduk di bar — keluhan 'searchnya kelebaran' kembali",
    ).toBeNull();
  });

  it("kotaknya muncul sesudah tombol diklik", () => {
    pasang(true);
    act(() => tombolCari()!.click());
    const kotak = kotakCari();
    expect(
      kotak,
      "tombol diklik tapi kotak cari tidak muncul — tombolnya mati, dan tak " +
        "ada error apa pun yang memberi tahu",
    ).toBeTruthy();
    // Tulisannya WAJIB sumber yang sama dengan seluruh situs. Lapisan ini
    // bentuk kedua dari kotak yang sama; kalau teksnya ditulis ulang di sana,
    // ia akan menyimpang persis seperti yang sudah dua kali terjadi.
    expect(kotak!.getAttribute("placeholder")).toBe(TEKS_KOTAK_CARI);
  });

  it("menutup dengan tombol Esc", () => {
    pasang(true);
    act(() => tombolCari()!.click());
    expect(kotakCari()).toBeTruthy();
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(
      kotakCari(),
      "Esc tidak menutup lapisan — lapisan yang menutupi seluruh layar tanpa " +
        "jalan keluar terbaca seperti situs menggantung",
    ).toBeNull();
  });

  it("menutup lewat tombol X", () => {
    pasang(true);
    act(() => tombolCari()!.click());
    const x = container.querySelector<HTMLButtonElement>(
      '[aria-label="Tutup pencarian"]',
    );
    expect(x).toBeTruthy();
    act(() => x!.click());
    expect(kotakCari()).toBeNull();
  });

  it("latar lapisan TIDAK diburamkan", () => {
    // Owner 2026-10-29: "backgroundnya jangan blur kali, soalnya bikin sakit
    // mata." Dijaga mesin karena `backdrop-blur` gampang sekali masuk lagi
    // saat ada yang merapikan tampilan — dan tak ada error apa pun yang
    // memberi tahu; yang merasakannya cuma mata penonton.
    pasang(true);
    act(() => tombolCari()!.click());
    const lapisan = container.querySelector('[role="presentation"]');
    expect(lapisan, "lapisan pencarian tidak tergambar").toBeTruthy();
    const kelas = lapisan!.className;
    expect(kelas, "latar lapisan diburamkan lagi").not.toMatch(/backdrop-blur/);
    // Gelapnya juga dijaga: `bg-black/80` yang lama terlalu pekat.
    expect(kelas).toContain("bg-black/55");
  });

  it("kotak di lapisan LEBIH BESAR daripada kotak di bar", () => {
    // Owner: "kecil kali, bisa besar sedikit". Yang dijaga PERBANDINGANNYA,
    // bukan angka mutlak — supaya mengubah ukuran nanti tidak otomatis merah,
    // tapi menyamakannya lagi (yang mengembalikan keluhan) tetap merah.
    pasang(true);
    act(() => tombolCari()!.click());
    expect(kotakCari()!.className).toContain("h-12");

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    pasang(false);
    // Bar BIASA (/discover) wajib tetap ramping — menaikkannya di sana akan
    // meninggikan seluruh kepala situs.
    expect(
      kotakCari()!.className,
      "kotak cari di bar ikut membesar — kepala situs /discover jadi tinggi",
    ).toContain("h-9");
  });

  it("mode BIASA tidak berubah — kotak langsung tergambar, tanpa tombol", () => {
    // Pagar arah sebaliknya. /discover adalah halaman HASIL pencarian: di sana
    // kotaknya wajib terlihat terus supaya penonton bisa melihat & menyunting
    // kata kunci yang sedang berlaku. Kalau mode tombol bocor ke sana, halaman
    // itu terasa kehilangan pencariannya.
    pasang(false);
    expect(kotakCari()).toBeTruthy();
    expect(tombolCari()).toBeNull();
  });
});

describe("halaman film berlatar TERANG + sidebar", () => {
  const HALAMAN = [
    "app/drama/[id]/page.tsx",
    "app/tonton/[id]/page.tsx",
  ];

  for (const berkas of HALAMAN) {
    const sumber = readFileSync(berkas, "utf-8");

    it(`${berkas} memakai latar terang, bukan hitam`, () => {
      expect(
        sumber,
        `${berkas} masih berlatar gelap — ini persis yang owner tolak: ` +
          `"ketika klik film ternyata gelap tidak bagus"`,
      ).toContain("bg-zinc-100");
      // `app/layout.tsx` memasang `bg-black` di <body>, jadi halaman ini HARUS
      // menimpanya sendiri. Kalau penimpanya dilepas, halamannya diam-diam
      // kembali gelap tanpa satu pun berkas lain berubah.
      expect(sumber).not.toMatch(/<main className="min-h-screen bg-zinc-950/);
    });

    it(`${berkas} memasang kolom kanan`, () => {
      // Sejak 2026-10-29 kolom kanan dipecah DUA: "Film Terkait" naik ke
      // dalam bingkai pemutar, "Terpopuler" tinggal di kolom kanan bawah.
      expect(sumber, `${berkas} tanpa panel Film Terkait`).toContain(
        "<PanelFilm",
      );
      expect(sumber, `${berkas} tanpa panel Terpopuler`).toContain(
        "<PanelPopuler",
      );
    });

    it(`${berkas} menyusun dua kolom yang aman di layar sempit`, () => {
      // `lg:` = sidebar hanya berdampingan di layar lebar; di HP ia turun ke
      // bawah. Tanpa itu, isi utama terhimpit jadi sangat sempit di ponsel.
      expect(sumber).toMatch(/lg:grid-cols-\[minmax\(0,1fr\)_300px\]/);
    });
  }

  it("sidebar mengeluarkan judul yang sedang dibuka", () => {
    // Menawarkan halaman yang sedang dilihat penonton terbaca seperti tautan
    // rusak — dan di halaman drama kita tahu id-nya, jadi tak ada alasan.
    const sumber = readFileSync("app/drama/[id]/page.tsx", "utf-8");
    expect(sumber).toContain("kecualiId={drama.id}");
  });

  it("komponen bersama tetap DEFAULT GELAP", () => {
    // Pagar paling penting di berkas ini. `Comments` dan `RatingStars` juga
    // dipakai layar pemutar (FeedPlayer, CommentsDrawer) yang harus tetap
    // gelap. Mengubah nilai bawaan `terang` jadi `true` akan menerangi keduanya
    // tanpa ada yang meminta — dan tak ada error apa pun yang memberi tahu.
    for (const berkas of [
      "app/components/Comments.tsx",
      "app/components/RatingStars.tsx",
      "app/components/EpisodeList.tsx",
      "app/components/SaveButton.tsx",
      "app/components/LikeButton.tsx",
      "app/components/ShareButton.tsx",
    ]) {
      const sumber = readFileSync(berkas, "utf-8");
      expect(
        sumber,
        `${berkas}: prop 'terang' tidak lagi default false — pemakai lain ` +
          `(termasuk layar pemutar) ikut berubah tanpa diminta`,
      ).toContain("terang = false");
    }
  });
});
