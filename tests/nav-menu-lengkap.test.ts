// Penjaga EMPAT PERBAIKAN MENU NAVBAR — owner 2026-11-14.
//
// 🪤 KENAPA TES INI ADA. Keempatnya punya mode-gagal yang SAMA dan SENYAP:
// menunya tetap tergambar rapi, tetap bisa diklik, cuma isinya berkurang atau
// urutannya salah. Tidak ada error, tidak ada halaman putih — satu-satunya
// cara tahu adalah membandingkan dengan isi katalog, dan itu mustahil
// dilakukan dengan mata saat katalognya 400+ judul.
//
// Yang dijaga:
//   1. Menu Genre ikut menghitung katalog VIDEO, bukan drama saja.
//   2. Menu Series memuat lebih dari sekadar "Serial" + "Film".
//   3. Menu Populer memakai label baru DAN tidak kehilangan pilihan lama.
//   4. Tahun terbaru berdiri paling depan — di dropdown MAUPUN strip kuning.
import { describe, it, expect } from "vitest";
import { buildNavMenus, STRIP_KATALOG } from "../lib/nav-katalog";
import type { Drama } from "../lib/types";
import type { PlaylyVideoPublik } from "../lib/playly-publik";

/** Satu drama secukupnya — field yang tidak dipakai menu sengaja minimal. */
function drama(lebih: Partial<Drama> = {}): Drama {
  return {
    id: "d1",
    title: "Drama Satu",
    category: "Action",
    episodes: 10,
    views: "1000",
    year: "2024",
    status: "Ongoing",
    synopsis: "",
    poster: "",
    ...lebih,
  } as Drama;
}

/** Satu video Playly secukupnya. */
function video(lebih: Partial<PlaylyVideoPublik> = {}): PlaylyVideoPublik {
  return {
    id: "v1",
    title: "Film Satu",
    kategori: null,
    genre: null,
    year: null,
    country: null,
    rating: null,
    ...lebih,
  } as unknown as PlaylyVideoPublik;
}

const labelMenu = (menus: ReturnType<typeof buildNavMenus>, key: string) =>
  menus.find((m) => m.key === key)?.items.map((i) => i.label) ?? [];
const hrefMenu = (menus: ReturnType<typeof buildNavMenus>, key: string) =>
  menus.find((m) => m.key === key)?.items.map((i) => i.href) ?? [];

describe("1. Menu Genre ikut menghitung katalog VIDEO", () => {
  it("kategori yang HANYA dipunyai video tetap muncul", () => {
    // Inilah keluhan aslinya. Diukur di produksi 2026-11-14: katalog drama 41
    // judul / 6 kategori, katalog video 397 judul / 24 kategori — menu lama
    // cuma melihat yang pertama.
    const menus = buildNavMenus(
      [drama({ category: "Action" })],
      [
        video({ id: "v1", kategori: "Fantasy" }),
        video({ id: "v2", kategori: "Horror" }),
      ],
    );
    const href = hrefMenu(menus, "genre");
    expect(href).toContain("/discover?cat=Fantasy");
    expect(href).toContain("/discover?cat=Horror");
    expect(href).toContain("/discover?cat=Action");
  });

  it("genre OMDb milik video ikut, dan TIDAK kembar dengan kategori", () => {
    // Katalog memakai dua sistem genre sekaligus. Kalau "Horror" muncul
    // sebagai ?cat= DAN ?genre=, penonton melihat satu nama dua kali di menu
    // yang sama dan mengira menunya rusak.
    const menus = buildNavMenus(
      [drama()],
      [video({ kategori: "Horror", genre: "Horror, Mystery" })],
    );
    const href = hrefMenu(menus, "genre");
    expect(href).toContain("/discover?cat=Horror");
    expect(href).not.toContain("/discover?genre=Horror");
    expect(href).toContain("/discover?genre=Mystery");
  });

  it("tiap pilihan memakai NILAI katalog, bukan labelnya", () => {
    // Pagar lama yang tidak boleh ikut longgar: label boleh "Horor", alamatnya
    // WAJIB "Horror". Label yang bocor ke alamat = halaman hampa tanpa error.
    const menus = buildNavMenus([drama()], [video({ kategori: "Horror" })]);
    expect(hrefMenu(menus, "genre")).not.toContain("/discover?cat=Horor");
    expect(labelMenu(menus, "genre")).toContain("Horor");
  });

  it("video tanpa kategori tidak menambah pilihan hampa", () => {
    // `kategori` null adalah keadaan NORMAL (admin belum memilih). Kalau ikut
    // terhitung, menu dapat satu baris kosong yang memulangkan katalog utuh.
    const menus = buildNavMenus([drama()], [video({ kategori: null })]);
    expect(hrefMenu(menus, "genre").filter((h) => h.endsWith("cat="))).toEqual([]);
  });
});

describe("2. Menu Series lebih dari dua baris", () => {
  const menus = buildNavMenus(
    [
      drama({ id: "a", kind: "series", status: "Ongoing", year: "2026" }),
      drama({ id: "b", kind: "series", status: "Completed", year: "2025" }),
      drama({ id: "c", kind: "movie", status: "Completed", year: "2024" }),
    ] as Drama[],
    [],
  );

  it("memuat daftar serial, serial terbaru, dan kedua statusnya", () => {
    const href = hrefMenu(menus, "jenis");
    expect(href).toContain("/discover?kind=series");
    expect(href).toContain("/discover?kind=series&sort=year");
    expect(href).toContain("/discover?kind=series&status=ongoing");
    expect(href).toContain("/discover?kind=series&status=completed");
  });

  it("film tidak hilang dari menu itu", () => {
    expect(hrefMenu(menus, "jenis")).toContain("/discover?kind=movie");
  });

  it("baris yang katalognya KOSONG tidak digambar", () => {
    // Aturan paling tua berkas ini: menu tak boleh menjanjikan yang tak ada.
    // Katalog tanpa serial sama sekali -> nol baris serial.
    const tanpaSerial = buildNavMenus(
      [drama({ kind: "movie", status: "Completed" })] as Drama[],
      [],
    );
    expect(
      hrefMenu(tanpaSerial, "jenis").filter((h) => h.includes("kind=series")),
    ).toEqual([]);
  });
});

describe("3. Menu Populer", () => {
  const menus = buildNavMenus(
    [drama({ year: "2026", imdbRating: "8.1" })] as Drama[],
    [],
  );

  it("memakai label baru 'Terpopuler'", () => {
    expect(labelMenu(menus, "populer")).toContain("Terpopuler");
  });

  it("TIDAK kehilangan satu pun pilihan lama", () => {
    // Mengganti label gampang menyeret pilihan lain ikut terhapus. Keempatnya
    // harus tetap ada — hilangnya satu = fitur yang lenyap tanpa diminta.
    const href = hrefMenu(menus, "populer");
    for (const s of ["populer", "rating", "year", "episodes", "title"]) {
      expect(href, `urutan ${s} hilang dari menu Populer`).toContain(
        `/discover?sort=${s}`,
      );
    }
  });

  it("'Judul A-Z' tidak muncul DUA KALI di bar yang sama", () => {
    // Ia dipindah dari menu "Lainnya" ke "Populer". Kalau yang lama lupa
    // dicabut, satu pilihan sama tergambar di dua tombol bersebelahan.
    expect(hrefMenu(menus, "lainnya")).not.toContain("/discover?sort=title");
  });
});

describe("4. Tahun terbaru paling depan", () => {
  it("dropdown Tahun urut MENURUN", () => {
    const menus = buildNavMenus(
      [
        drama({ id: "a", year: "2021" }),
        drama({ id: "b", year: "2026" }),
        drama({ id: "c", year: "2024" }),
      ] as Drama[],
      [],
    );
    expect(labelMenu(menus, "tahun")).toEqual(["2026", "2024", "2021"]);
  });

  it("tahun yang hanya dipunyai VIDEO ikut masuk", () => {
    // 70 dari 481 video tayang menyimpan tahunnya hanya di dalam judul.
    const menus = buildNavMenus(
      [drama({ year: "2024" })],
      [video({ title: "Film Baru (2026)", year: null })],
    );
    expect(labelMenu(menus, "tahun")).toEqual(["2026", "2024"]);
  });

  it("strip kuning juga menaruh tahun terbaru lebih dulu", () => {
    // Inilah yang benar-benar terlihat owner di layar — dropdown sudah benar
    // sejak dulu, stripnya yang menaik.
    const tahun = STRIP_KATALOG.map((i) => i.label).filter((l) =>
      /^(19|20)\d{2}$/.test(l),
    );
    expect(tahun).toEqual([...tahun].sort((a, b) => Number(b) - Number(a)));
    expect(tahun.length, "strip kehilangan chip tahunnya").toBeGreaterThan(1);
  });
});
