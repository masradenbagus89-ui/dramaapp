// Penjaga NAVIGASI HALAMAN VIDEO PLAYLY — owner 2026-11-06: "sidebar kiri
// video playly terlalu panjang kamu jadikan divider — IMDB / Link download /
// Daftar video Playly".
//
// Akarnya: `/admin/videos/playly` adalah SATU halaman berisi tiga panel besar
// bertumpuk, dan sidebar cuma punya satu baris untuk ketiganya. Sejak
// perbaikan ini, satu menu = satu panel.
//
// ⚠️ Yang dijaga di sini adalah hal-hal yang kalau putus TIDAK memunculkan
// error apa pun — cuma menu yang diklik lalu tidak menampilkan apa-apa, atau
// isian yang hilang diam-diam.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PlaylyVisibilityManager from "../app/components/admin/PlaylyVisibilityManager";
import {
  BAGIAN_PLAYLY_BAWAAN,
  BAGIAN_PLAYLY_SAH,
  JUDUL_BAGIAN_PLAYLY,
  KETERANGAN_BAGIAN_PLAYLY,
  RUTE_PLAYLY,
  alamatBagianPlayly,
  menuBagianPlayly,
  parseBagianPlayly,
  type BagianPlayly,
} from "../lib/bagian-playly";

const SIDEBAR = readFileSync("app/components/admin/AdminSidebar.tsx", "utf8");
const PENAMPIL = readFileSync(
  "app/components/admin/PlaylyBagianAktif.tsx",
  "utf8",
);
const HALAMAN = readFileSync("app/admin/videos/playly/page.tsx", "utf8");
// Panel IMDb ikut dibaca sejak 2026-11-11: pintu masuk "Isi manual" pindah ke
// baris saringan di dalamnya, jadi memeriksa sidebar saja tidak lagi cukup
// untuk membuktikan setiap bagian punya pintu.
const PANEL_IMDB = readFileSync(
  "app/components/admin/PlaylyVisibilityManager.tsx",
  "utf8",
);

describe("aturan bagian Video Playly (fungsi murni)", () => {
  it("menerima bentuk alamat apa pun — '#x', 'x', alamat penuh", () => {
    expect(parseBagianPlayly("#unduhan")).toBe("unduhan");
    expect(parseBagianPlayly("unduhan")).toBe("unduhan");
    expect(parseBagianPlayly(`${RUTE_PLAYLY}#unduhan`)).toBe("unduhan");
    expect(parseBagianPlayly("#IMDB")).toBe("imdb");
    expect(parseBagianPlayly(" #daftar ")).toBe("daftar");
  });

  it("alamat ngawur jatuh ke bagian bawaan, bukan layar kosong", () => {
    // Layar kosong terbaca seperti halaman rusak. Lebih baik membuka panel
    // yang berisi.
    for (const ngawur of ["#ngawur", "", null, undefined, "#", RUTE_PLAYLY]) {
      expect(parseBagianPlayly(ngawur)).toBe(BAGIAN_PLAYLY_BAWAAN);
    }
    expect(BAGIAN_PLAYLY_BAWAAN).toBe("imdb");
  });

  it("tiap bagian punya judul & keterangannya", () => {
    // Kepala bagian inilah yang membuat admin tahu sedang di panel mana.
    // Bagian baru yang lupa diberi judul menggambar kepala halaman kosong.
    for (const b of BAGIAN_PLAYLY_SAH) {
      expect(JUDUL_BAGIAN_PLAYLY[b], `judul untuk ${b}`).toBeTruthy();
      expect(KETERANGAN_BAGIAN_PLAYLY[b], `keterangan untuk ${b}`).toBeTruthy();
    }
  });
});

describe("menu sidebar dan isi halaman tidak boleh menyimpang", () => {
  it("tiap bagian yang sah punya TEPAT SATU pintu masuk", () => {
    // Sampai 2026-11-10 semua pintu ada di sidebar, jadi tes ini cukup membaca
    // satu berkas. Sejak owner memindahkan "Isi manual" ke baris saringan panel
    // IMDb ("pindahkan isi cepat ke filter yang ada di imdb biar lebih rapi"),
    // pintu bisa berada di DUA bentuk — dan keduanya dihitung di sini:
    //   1. menu sidebar          → `${RUTE_PLAYLY}#<bagian>`
    //   2. tombol di isi halaman → alamatBagianPlayly("<bagian>")
    // Yang dijaga TETAP SAMA, cuma tempat yang sah yang melebar: tak ada bagian
    // tanpa pintu, dan tak ada pintu yang menunjuk bagian asing.
    const pintuSidebar = [
      ...SIDEBAR.matchAll(/\$\{RUTE_PLAYLY\}#([a-z-]+)/g),
    ].map((m) => m[1]);
    const pintuPanel = [
      ...PANEL_IMDB.matchAll(/alamatBagianPlayly\("([a-z-]+)"\)/g),
    ].map((m) => m[1]);
    const pintu = [...pintuSidebar, ...pintuPanel];

    // 🪤 Pintu yang menunjuk bagian tak dikenal diam-diam membuka bagian
    // bawaan terus-menerus — terbaca seperti menu mati, tanpa satu pun error.
    for (const h of pintu) {
      expect(
        BAGIAN_PLAYLY_SAH,
        `pintu ke #${h} bukan bagian yang sah`,
      ).toContain(h as BagianPlayly);
    }

    // Setiap bagian yang sah WAJIB punya pintunya — bagian yang ada di kode
    // tapi tak punya pintu masuk hanya bisa dibuka lewat ketik alamat manual.
    for (const b of BAGIAN_PLAYLY_SAH) {
      expect(pintu, `bagian "${b}" tidak punya pintu masuk`).toContain(b);
    }

    // 🪤 Dan TEPAT satu. Dua pintu ke panel yang sama (mis. "Isi manual"
    // ditambahkan kembali ke sidebar tanpa membuang tombol di panel IMDb)
    // membuat admin mengira keduanya layar yang berbeda. Perbandingan jumlah
    // ini yang menangkapnya — nol error, cuma menu yang membingungkan.
    expect(
      pintu.length,
      `pintu masuk ganda/kurang: ${JSON.stringify(pintu)}`,
    ).toBe(BAGIAN_PLAYLY_SAH.length);
  });

  it("pintu 'Isi manual' BENAR-BENAR tergambar di baris saringan panel IMDb", () => {
    // Tes di atas membaca KODE SUMBER — ia lulus walau tombolnya terkubur di
    // cabang yang tidak pernah dirender. Yang ini merender panelnya sungguhan.
    const html = renderToStaticMarkup(
      createElement(PlaylyVisibilityManager, {
        videos: [
          {
            id: "v1",
            title: "Pemuda Miskin Mata Tembus Pandang",
            durationSeconds: 120,
            durationLabel: "2:00",
            creator: "cokiel",
            embedUrl: "https://contoh.invalid/embed",
            thumbnail: null,
          },
        ],
        initialHidden: [],
        belumSiapIds: [],
        fetchError: null,
        source: "mitra" as const,
        creators: ["dramaku"],
      }),
    );

    expect(html, "tombol Isi manual tidak tergambar").toContain(
      `href="${alamatBagianPlayly("isi-cepat")}"`,
    );
    expect(html).toContain(JUDUL_BAGIAN_PLAYLY["isi-cepat"]);

    // 🪤 Posisinya ikut dijaga: owner memintanya SEBARIS dengan saringan IMDb
    // ("pindahkan isi cepat ke filter yang ada di imdb"), yaitu sesudah tombol
    // "Belum ada IMDb" dan sebelum kotak cari. Tanpa pemeriksaan urutan ini,
    // tombolnya bisa terlempar ke ujung halaman dan tes tetap hijau.
    const saringanTerakhir = html.indexOf("Belum ada IMDb");
    const pintu = html.indexOf(alamatBagianPlayly("isi-cepat"));
    const kotakCari = html.indexOf("Cari judul video");
    expect(saringanTerakhir, "saringan IMDb tidak ketemu").toBeGreaterThan(-1);
    expect(kotakCari, "kotak cari tidak ketemu").toBeGreaterThan(-1);
    expect(pintu, "pintu tidak berada SESUDAH tombol saringan").toBeGreaterThan(
      saringanTerakhir,
    );
    expect(pintu, "pintu tidak berada SEBELUM kotak cari").toBeLessThan(
      kotakCari,
    );
  });

  it("bagian tanpa baris menu sendiri menyalakan menu induknya", () => {
    // 🪤 Kerusakan SENYAP: sejak "Isi manual" tak punya baris menu sendiri,
    // membukanya membuat seluruh sidebar padam — nol menu menyala, nol error,
    // dan admin kehilangan penanda "saya sedang di mana".
    expect(menuBagianPlayly("isi-cepat"), "Isi manual harus menyalakan IMDb").toBe(
      "imdb",
    );

    // Bagian yang PUNYA menunya sendiri wajib mewakili dirinya sendiri —
    // kalau tidak, menu yang diklik menyalakan baris yang lain.
    for (const b of BAGIAN_PLAYLY_SAH) {
      if (b === "isi-cepat") continue;
      expect(menuBagianPlayly(b), `bagian "${b}" harus mewakili dirinya`).toBe(b);
    }

    // Nilai asing dipulangkan apa adanya: tak ada menu yang menyala, persis
    // seperti perilaku sebelum peta induk ini ada.
    expect(menuBagianPlayly("ngawur")).toBe("ngawur");

    // Dan sidebar WAJIB benar-benar memakainya. Tanpa baris ini, peta di atas
    // bisa benar sendirian sementara sidebarnya tetap padam.
    expect(
      SIDEBAR,
      "sidebar tidak memakai menuBagianPlayly — sorot menu induk tidak jalan",
    ).toContain("menuBagianPlayly");
  });

  it("setiap bagian BENAR-BENAR dirender oleh penampilnya", () => {
    // Bagian yang tidak punya propnya akan menggambar kekosongan saat menunya
    // diklik — nol error, panel kosong yang terbaca seperti menu rusak.
    //
    // Nama prop MENGIKUTI nama bagian, KECUALI yang bertanda hubung: atribut
    // JSX seperti `isi-cepat={...}` sah secara sintaks tapi melewati sebagian
    // pemeriksaan tipe, sehingga prop salah ketik lolos diam-diam. Yang
    // bertanda hubung ditulis gaya camelCase, dan peta di bawah ini menjaga
    // penerjemahannya tetap satu arah yang pasti.
    const propUntuk = (b: BagianPlayly) =>
      b.replace(/-([a-z])/g, (_, h: string) => h.toUpperCase());

    for (const b of BAGIAN_PLAYLY_SAH) {
      expect(
        HALAMAN,
        `halaman tidak mengirim panel untuk bagian "${b}" ke PlaylyBagianAktif`,
      ).toMatch(new RegExp(`${propUntuk(b)}=\\{`));
      // Penampilnya juga wajib memetakan prop itu kembali ke nama bagiannya;
      // tanpa baris ini, prop bisa diterima halaman lalu dibuang penampil.
      expect(
        PENAMPIL,
        `penampil tidak memetakan prop "${propUntuk(b)}" ke bagian "${b}"`,
      ).toMatch(
        b === propUntuk(b)
          ? new RegExp(`\\b${b}\\b`)
          : new RegExp(`"${b}":\\s*${propUntuk(b)}`),
      );
    }
    expect(HALAMAN).toContain("<PlaylyBagianAktif");
  });

  it("alamatBagianPlayly sepakat dengan ejaan menu di sidebar", () => {
    // Satu salah ketik di salah satu sisi = menu yang membuka bagian bawaan
    // terus-menerus, dan itu terbaca seperti menu mati.
    for (const b of BAGIAN_PLAYLY_SAH) {
      expect(alamatBagianPlayly(b)).toBe(`${RUTE_PLAYLY}#${b}`);
    }
    expect(SIDEBAR, "sidebar tidak memakai RUTE_PLAYLY").toContain(
      "RUTE_PLAYLY",
    );
  });
});

describe("jebakan yang sudah terbukti di panel admin lain", () => {
  it("panel yang tidak dibuka DISEMBUNYIKAN, bukan dilepas dari halaman", () => {
    // 🪤 Isian link download yang belum ditekan Simpan hidup di memori
    // komponennya sendiri (PlaylyUnduhanManager, state `draft`). Melepas
    // panel dari DOM membuat isian itu hilang DIAM-DIAM tiap admin menengok
    // menu lain — tanpa error, tanpa peringatan. Jebakan yang persis sama
    // sudah pernah kena di form Tambah Drama (tests/bagian-admin.test.ts).
    expect(PENAMPIL).toMatch(/bagian === nama \? undefined : "hidden"/);
    expect(
      PENAMPIL,
      "panel tidak boleh dirender dengan `bagian === nama && ...`",
    ).not.toMatch(/bagian === nama &&/);
  });

  it("penampil mendengarkan 'click', bukan cuma 'hashchange'", () => {
    // Mengklik menu yang hash-nya SAMA dengan yang sedang dibuka tidak memicu
    // `hashchange`. Tanpa penangkap `click`, menu itu terasa tidak merespons.
    expect(PENAMPIL).toContain('addEventListener("hashchange"');
    expect(PENAMPIL).toContain('addEventListener("click"');
  });
});
