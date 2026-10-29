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

/** Tombol cari. Labelnya berubah jadi "Tutup pencarian" saat kotak terbuka,
 *  jadi keduanya dicari — satu tombol, dua keadaan. */
const tombolCari = () =>
  container.querySelector<HTMLButtonElement>(
    '[aria-label="Cari film"], [aria-label="Tutup pencarian"]',
  );
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

  it("🔑 kotak muncul DI DALAM bar — NOL bagian halaman tertutup", () => {
    // Inti perjalanan empat putaran koreksi owner. Yang DILARANG di sini
    // adalah segala bentuk elemen yang menimpa halaman:
    //   • `fixed`    -> lapisan menutupi seluruh layar (putaran 2);
    //   • `absolute` -> panel menggantung menimpa baris poster (putaran 3).
    // Bentuk yang benar: kotak cuma mengisi ruang kosong di bar, sejajar
    // tombolnya, jadi tak ada satu pun poster yang tertutup.
    pasang(true);
    act(() => tombolCari()!.click());
    const kotak = kotakCari();
    expect(kotak, "kotak cari tidak muncul").toBeTruthy();

    // Telusuri induk kotak sampai akar: tak boleh ada yang melayang.
    let n: HTMLElement | null = kotak!.parentElement;
    const melayang: string[] = [];
    while (n && n !== container) {
      const k = n.className || "";
      if (/fixed/.test(k)) melayang.push("fixed: " + k);
      if (/absolute/.test(k)) melayang.push("absolute: " + k);
      n = n.parentElement;
    }
    expect(
      melayang,
      "kotak cari dibungkus elemen melayang — ia akan menimpa poster film, " +
        "persis keluhan yang membuat bentuknya diubah empat kali",
    ).toEqual([]);

    // Tak boleh ada penangkap klik yang menutupi layar.
    expect(
      container.querySelector('[role="presentation"]'),
      "masih ada lapisan penangkap klik yang menutupi halaman",
    ).toBeNull();
  });

  it("kotak & tombol SEJAJAR di ujung kanan bar", () => {
    pasang(true);
    act(() => tombolCari()!.click());
    const kotak = kotakCari()!;
    const tombol = tombolCari()!;
    // Keduanya anak dari pembungkus yang sama = berdiri sejajar satu baris.
    const indukBersama = tombol.parentElement!;
    expect(indukBersama.contains(kotak)).toBe(true);
    // `ml-auto` yang mendorong kelompok ini ke ujung kanan bar.
    expect(indukBersama.className).toContain("ml-auto");
    // Kotak SEBELUM tombol dalam urutan DOM = kotak melebar ke KIRI.
    expect(
      indukBersama.innerHTML.indexOf("input"),
      "tombol mendahului kotak — kotaknya akan melebar ke kanan, keluar bar",
    ).toBeLessThan(indukBersama.innerHTML.indexOf("<button"));
  });

  it("tombol berubah jadi ✕ saat kotak terbuka", () => {
    // Satu tombol, dua keadaan — penonton tak perlu mencari cara menutupnya.
    pasang(true);
    expect(tombolCari()).toBeTruthy();
    act(() => tombolCari()!.click());
    expect(
      container.querySelector('[aria-label="Tutup pencarian"]'),
      "tombol tidak berubah jadi tutup — penonton kehilangan jalan menutup " +
        "selain menekan Esc",
    ).toBeTruthy();
  });

  it("tinggi kotak SAMA dengan tombol — satu baris rapi", () => {
    // Kotak `h-12` (ukuran panel lama) di samping tombol `size-9` akan
    // meninggikan seluruh bar dan mendorong strip genre turun.
    pasang(true);
    act(() => tombolCari()!.click());
    expect(kotakCari()!.className).toContain("h-9");
  });

  it("`bukaAwal` membuka kotak — walau menyala BELAKANGAN", () => {
    // 🪤 Bug yang sudah terbukti: `/discover` halaman STATIS, jadi saat HTML
    // dibuat kata kunci `?q=…` belum terbaca dan `bukaAwal` masih false. Ia
    // baru menyala di browser. `useState(bukaAwal)` saja tak pernah menyusul —
    // penonton yang tiba lewat tautan pencarian melihat kotak tertutup tanpa
    // tahu apa yang sedang dicari.
    act(() =>
      root.render(
        h(SearchBar, {
          value: "",
          onValueChange: () => {},
          modeTombol: true,
          bukaAwal: false,
        }),
      ),
    );
    expect(kotakCari(), "kotak terbuka padahal bukaAwal false").toBeNull();

    // Kata kunci terbaca BELAKANGAN (hydration di browser).
    act(() =>
      root.render(
        h(SearchBar, {
          value: "naruto",
          onValueChange: () => {},
          modeTombol: true,
          bukaAwal: true,
        }),
      ),
    );
    expect(
      kotakCari(),
      "kotak tidak ikut terbuka saat kata kunci menyala belakangan — " +
        "penonton tak tahu apa yang sedang dicari",
    ).toBeTruthy();
    expect(kotakCari()!.getAttribute("value")).toBe("naruto");
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

// ===========================================================================
// PEMISAH "Lanjut Menonton" + panah geser cerdas (owner 2026-10-29)
// ===========================================================================
describe("baris Lanjut Menonton DISEMBUNYIKAN sampai diklik", () => {
  const BERANDA = readFileSync("app/beranda/page.tsx", "utf-8");
  const BADAN = readFileSync(
    "app/components/beranda/BadanKatalog.tsx",
    "utf-8",
  );
  const PANEL = readFileSync(
    "app/components/beranda/PanelLipat.tsx",
    "utf-8",
  );
  const ROW = readFileSync("app/components/ContentRow.tsx", "utf-8");

  it("dibungkus panel lipat, bukan sekadar dipisah garis", () => {
    // Owner 2026-10-29 menolak versi "dipisah tapi tetap terbuka":
    // *"kalau dipisah masih terlihat sama"*. Yang diminta: tersembunyi sampai
    // tombolnya diklik.
    expect(BERANDA).toContain('<PanelLipat judul="Lanjutkan Menonton">');
  });

  it("TERTUTUP saat halaman dibuka", () => {
    // Inti permintaannya. Kalau bawaannya terbuka, kita kembali ke versi yang
    // sudah ditolak.
    expect(PANEL).toContain("bawaanTerbuka = false");
  });

  it("judul tidak kembar — barisnya dioper `tanpaJudul`", () => {
    // Tombol panel sudah bertuliskan "Lanjutkan Menonton"; judul di dalam
    // barisnya akan jadi kembar berturut-turut.
    expect(BERANDA).toContain("tanpaJudul");
    expect(ROW).toContain("{(title || href) && (");
  });

  it("isinya TIDAK dirender selama tertutup", () => {
    // Disembunyikan dengan CSS saja tidak cukup: isi yang tetap hidup masih
    // bisa dijangkau Tab dan masih dibacakan pembaca layar — penonton
    // "menabrak" isi yang tak terlihat di layar.
    expect(PANEL).toContain("{terbuka && (");
  });

  it("satu komponen accordion untuk KEDUA halaman", () => {
    // `/` (pintu akun) dan `/beranda` (riwayat) memakai bentuk yang sama.
    // Dua accordion mirip pasti menyimpang begitu salah satunya diubah —
    // sudah tiga kali terjadi di repo ini pada kepala situs.
    const landing = readFileSync(
      "app/components/beranda/LanjutMenonton.tsx",
      "utf-8",
    );
    expect(landing).toContain("<PanelLipat");
    expect(landing, "LanjutMenonton merakit accordion-nya sendiri").not.toContain(
      "aria-expanded={terbuka}",
    );
  });

  it("pembungkus pemisah GANDA dilepas dari badan bersama", () => {
    // `PanelLipat` sudah membawa `border-y` sendiri. Pembungkus tambahan di
    // BadanKatalog akan menumpuk dua garis sekaligus.
    expect(BADAN).not.toContain("border-y border-zinc-800 bg-zinc-950");
  });

  it("panah geser hilang saat isinya muat satu layar", () => {
    // Owner menunjuk baris berisi SATU kartu yang panahnya tetap tergambar —
    // ditekan, tak terjadi apa pun. Tombol mati tanpa tanda.
    expect(ROW).toContain("const perluGeser = dramas.length >");
    expect(ROW).toContain("{perluGeser && (");
  });

  it("gradien tepi ikut hilang bersama panahnya", () => {
    // Gradien itu PETUNJUK "masih ada isi di luar layar". Di baris yang sudah
    // utuh terlihat, ia berbohong.
    const blok = ROW.slice(ROW.indexOf("{perluGeser && ("));
    expect(blok).toContain("bg-gradient-to-r from-black");
    expect(blok).toContain("bg-gradient-to-l from-black");
  });
});
