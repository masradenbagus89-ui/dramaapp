// Penjaga BARIS TAB YANG SEJAJAR — owner 2026-11-23, dua permintaan sekaligus:
//
//   1. *"untuk versi HP filter disitu kamu hapus saja karena sudah ada di
//      bawah"* → tombol FILTER di baris tab hanya tergambar di layar komputer.
//   2. *"series terbaru, unggulan, update kamu hapus saja karena sudah ada,
//      biar bisa sejajar"* → tiga tombol tab terpanjang dilepas dari baris atas
//      di halaman depan & /beranda, supaya sisanya muat satu baris di HP.
//
// ⚠️ KENAPA PENJAGA INI WAJIB ADA, dan ini bukan jaga-jaga: kedua perubahan di
// atas MENIMPA keputusan owner yang lebih tua, dan alasan keputusan lama masih
// tertulis rapi di komentar kode ("ia tergambar di SEMUA ukuran layar lagi",
// "membawa SEMUA label tab yang diminta"). Sesi berikutnya yang membaca
// komentar itu akan menyimpulkan keadaan sekarang sebagai REGRESI lalu
// "memperbaikinya" — tepat seperti yang sudah berkali-kali terjadi di repo ini.
//
// ⚠️ JEBAKAN YANG DIJAGA TES TERAKHIR: tab yang tombolnya dilepas TIDAK boleh
// ikut dibuang dari `daftarTab`/`parseTab`. Empat tautan menu "Series" di bar
// atas menunjuk `/katalog?tab=…` (lib/nav-katalog.ts:502). Kalau kuncinya
// hilang, `tabAktif` jatuh DIAM-DIAM ke tab pertama — tautan menunya mendarat
// di daftar yang salah tanpa satu pun error.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import TabKatalogTampilan from "../app/components/beranda/TabKatalogTampilan";
import { TAB_TANPA_TOMBOL } from "../app/components/beranda/BadanKatalog";
import { TAB_BAWAAN, daftarTab, parseTab } from "../lib/tab-katalog";
import { tanpaKomentar } from "./bantu/tanpa-komentar";
import type { Drama } from "../lib/types";

function drama(p: Partial<Drama> & Pick<Drama, "id" | "title">): Drama {
  return {
    category: "Action",
    episodes: 10,
    views: "1.2K",
    synopsis: "",
    gradient: "from-zinc-800 to-black",
    ...p,
  };
}

const KATALOG: Drama[] = Array.from({ length: 12 }, (_, i) =>
  drama({ id: `d${i}`, title: `Drama ${i}`, year: "2026", imdbRating: "8.0" }),
);

/**
 * Tab yang tombolnya dilepas — DIIMPOR dari keputusannya sendiri, bukan disalin.
 *
 * ⚠️ Daftar salinan sudah sempat basi dalam hitungan jam: putaran kedua owner
 * (sketsa di tangkapan layar) menambahkan "terpopuler" ke daftar aslinya,
 * sedangkan salinan di berkas ini tetap berisi tiga — tesnya tetap HIJAU
 * sambil tak lagi memeriksa tab keempat. Tes yang basi memberi rasa aman palsu,
 * dan itu lebih berbahaya daripada tes yang merah.
 */
const DISEMBUNYIKAN = TAB_TANPA_TOMBOL;

const render = (sembunyikan: readonly string[] = []) =>
  renderToStaticMarkup(
    createElement(TabKatalogTampilan, {
      dramas: KATALOG,
      tab: TAB_BAWAAN,
      semua: false,
      tabDisembunyikan: [...sembunyikan] as never,
    }),
  );

describe("1. tombol FILTER: layar komputer saja", () => {
  const sumber = tanpaKomentar(
    readFileSync("app/components/beranda/TabKatalogTampilan.tsx", "utf-8"),
  );

  it("dibungkus pemisah ukuran layar, bukan tergambar di semua layar", () => {
    // `hidden md:flex` = sembunyi di HP, muncul dari 768px ke atas. Dicari
    // sebagai PASANGAN: `hidden` sendirian akan menyembunyikannya di SEMUA
    // layar — tombolnya lenyap total, dan itu tak memunculkan error apa pun.
    expect(sumber).toMatch(/hidden md:flex[\s\S]{0,200}<FilterKatalog/);
  });

  it("bar bawah HP tetap punya tombol Filter penggantinya", () => {
    // Inti alasan owner: di HP tombolnya DIPINDAH, bukan dihapus. Kalau bar
    // bawah suatu saat kehilangan tombol itu, penonton HP tidak punya satu pun
    // jalan ke penyaring — dan tes nomor 1 di atas tetap hijau.
    const bottom = tanpaKomentar(
      readFileSync("app/components/BottomNav.tsx", "utf-8"),
    );
    expect(bottom, "tombol Filter hilang dari bar bawah HP").toContain(
      '"Filter"',
    );
  });
});

describe("2. tiga tab terpanjang dilepas dari baris atas", () => {
  it("tombolnya tidak tergambar saat disembunyikan", () => {
    const html = render(DISEMBUNYIKAN);
    for (const key of DISEMBUNYIKAN) {
      const label = daftarTab(KATALOG).find((t) => t.key === key)!.label;
      expect(html, `tombol tab "${label}" masih tergambar`).not.toContain(
        `>${label}<`,
      );
    }
  });

  it("tab yang TIDAK disembunyikan tetap tergambar", () => {
    // Penjaga arah sebaliknya: penyaringnya tidak boleh kebablasan membuang
    // semua tombol — baris tab yang kosong melompong juga kerusakan senyap.
    const html = render(DISEMBUNYIKAN);
    const tersisa = daftarTab(KATALOG).filter(
      (t) => !DISEMBUNYIKAN.includes(t.key),
    );
    expect(tersisa.length, "tak ada tab tersisa untuk diperiksa").toBeGreaterThan(0);
    for (const t of tersisa) {
      expect(html, `tab ${t.label} ikut hilang padahal tidak diminta`).toContain(
        t.label,
      );
    }
  });

  it("tanpa daftar sembunyi, SELURUH tombol kembali tergambar", () => {
    // Inilah yang menjaga /katalog: halaman itu tujuan tautan menu "Series",
    // jadi tombol tab yang sedang dipakai harus tetap terlihat menyala di sana.
    const html = render();
    for (const t of daftarTab(KATALOG)) {
      expect(html, `tab ${t.label} hilang di halaman tanpa daftar sembunyi`).toContain(
        t.label,
      );
    }
  });

  it("/katalog memang TIDAK menyembunyikan tab apa pun", () => {
    const halaman = tanpaKomentar(readFileSync("app/katalog/page.tsx", "utf-8"));
    expect(
      halaman,
      "/katalog ikut menyembunyikan tab — tautan menu Series kehilangan sorotannya",
    ).not.toContain("tabDisembunyikan");
  });
});

describe("3. judul + chip SEDERET dengan tombol tab", () => {
  // Owner 2026-11-23 putaran kedua, lewat sketsa di tangkapan layar: judul
  // "Layarindo Menawarkan" + tiga chip + REKOMENDASI + 2026 jadi SATU baris.
  // Sebelumnya dua baris bertumpuk.
  const tampilan = tanpaKomentar(
    readFileSync("app/components/beranda/TabKatalogTampilan.tsx", "utf-8"),
  );

  it("isi titipan digambar DI DALAM kotak baris tab", () => {
    // Harus berada di dalam wadah bergulir yang sama dengan tombol tab —
    // kalau digambar di luar kotak, ia kembali jadi baris sendiri dan
    // permintaan owner batal tanpa satu pun error.
    expect(tampilan).toMatch(/overflow-x-auto[\s\S]{0,120}\{slotBarisTab\}/);
  });

  it("barisnya MEMBUNGKUS di HP, bukan digeser menyamping", () => {
    // ⚠️ Ini bukan kerapian. Dengan judul + tiga chip ikut masuk, barisnya
    // jauh lebih panjang dari layar HP. Versi tergeser hanya menampilkan judul
    // + SATU chip, tanpa tanda apa pun bahwa masih ada isi di sebelah kanan —
    // terbukti saat mock-nya dipotret sebelum dipasang.
    expect(tampilan).toContain("max-md:flex-wrap");
  });

  it("kelompok chip boleh menyusut & membungkus juga", () => {
    // Membungkus baris LUARNYA saja tidak cukup: kalau <ul> chip tetap
    // `shrink-0`, ia jadi satu benda panjang yang tak bisa dipecah dan chip
    // ketiga tetap terpotong di tepi layar. Kena persis begitu di mock pertama.
    const strip = tanpaKomentar(
      readFileSync("app/components/beranda/LayarindoMenawarkan.tsx", "utf-8"),
    );
    expect(strip).toContain("flex-wrap");
    expect(strip).toContain("min-w-0");
    expect(
      strip,
      "pembungkus bergaris dipasang lagi — hasilnya kotak di dalam kotak",
    ).not.toContain("border-y");
  });
});

describe("4. yang disembunyikan cuma TOMBOLNYA, bukan tabnya", () => {
  it("ketiga kunci masih dikenali parseTab", () => {
    // Kalau ini merah, empat tautan menu "Series" (/katalog?tab=…) mendarat di
    // daftar yang SALAH — `tabAktif` jatuh diam-diam ke tab pertama.
    for (const key of DISEMBUNYIKAN) {
      expect(parseTab(key), `/katalog?tab=${key} tak lagi dikenali`).toBe(key);
    }
  });

  it("ketiga kunci masih ada di daftarTab", () => {
    const kunci = daftarTab(KATALOG).map((t) => t.key);
    for (const key of DISEMBUNYIKAN) {
      expect(kunci, `tab ${key} dibuang dari daftar, bukan disembunyikan`).toContain(
        key,
      );
    }
  });

  it("menu Series di bar atas masih menunjuk ketiganya", () => {
    // Sumber "sudah ada" yang owner maksud. Diperiksa dari lib/nav-katalog.ts
    // supaya kalau menunya dirombak, keputusan menyembunyikan tombol tab ikut
    // ditinjau ulang — bukan meninggalkan tiga tab tanpa jalan sama sekali.
    const nav = tanpaKomentar(readFileSync("lib/nav-katalog.ts", "utf-8"));
    expect(nav).toContain("/katalog?tab=unggulan");
    expect(nav).toContain("/katalog?tab=update");
    // "Terbaru" memakai alamat polos /katalog — itu memang tab bawaannya.
    expect(nav).toContain('{ label: "Terbaru", href: "/katalog" }');
  });

  it("isi seksinya tetap digambar di halaman depan", () => {
    // "karena sudah ada" yang kedua: judul seksinya sendiri ada tepat di bawah
    // baris tab. Kalau seksinya ikut hilang, yang terjadi bukan "merapikan
    // baris" melainkan MEMBUANG tiga daftar film dari halaman depan.
    const badan = tanpaKomentar(
      readFileSync("app/components/beranda/BadanKatalog.tsx", "utf-8"),
    );
    expect(badan).toContain("seksiLengkap");
    expect(
      badan,
      "daftar tab yang disembunyikan tidak lagi dipasang — periksa ulang",
    ).toContain("TAB_TANPA_TOMBOL");
  });
});
