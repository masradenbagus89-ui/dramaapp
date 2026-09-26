// Penjaga DERET TAB DI /beranda — owner 2026-09-26.
//
// Owner meminta bentuk situs katalog pembanding: baris TERBARU · SERIES
// UNGGULAN · SERIES UPDATE · TERPOPULER · REKOMENDASI · <tahun> dengan tombol
// FILTER hijau di ujung kanan. Barisnya SUDAH ada sejak 2026-09-22 — tapi cuma
// di halaman depan `/`, dan `RedirectIfAuthed` memantulkan siapa pun yang sudah
// login dari sana ke `/beranda`. Jadi owner tidak pernah melihatnya.
//
// ⚠️ JEBAKAN UTAMA yang dijaga berkas ini: kalau tab di /beranda menunjuk `/`,
// mengkliknya melempar penonton yang login ke `/` lalu DIPANTULKAN balik ke
// /beranda — tabnya terlihat MATI, tanpa satu pun error. Itu bentuk lain dari
// bug yang sedang diperbaiki.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import TabKatalogTampilan from "../app/components/beranda/TabKatalogTampilan";
import { TAB_BAWAAN, daftarTab } from "../lib/tab-katalog";
import type { Drama } from "../lib/types";

function drama(partial: Partial<Drama> & Pick<Drama, "id" | "title">): Drama {
  return {
    category: "Action",
    episodes: 10,
    views: "1.2K",
    synopsis: "",
    gradient: "from-zinc-800 to-black",
    ...partial,
  };
}

/** Katalog yang cukup berisi supaya tiap tab punya isi & tombol SEMUA muncul. */
const KATALOG: Drama[] = Array.from({ length: 30 }, (_, i) =>
  drama({
    id: `d${i}`,
    title: `Drama ${i}`,
    year: i % 2 ? "2026" : "2025",
    imdbRating: "8.0",
    views: `${i}K`,
  }),
);

const render = (opsi: { basePath?: string; semua?: boolean } = {}) =>
  renderToStaticMarkup(
    createElement(TabKatalogTampilan, {
      dramas: KATALOG,
      tab: TAB_BAWAAN,
      semua: opsi.semua ?? false,
      ...(opsi.basePath ? { basePath: opsi.basePath } : {}),
    }),
  );

describe("bentuk baris tab sesuai contoh owner", () => {
  const html = render();

  it("membawa SEMUA label tab yang diminta", () => {
    for (const t of daftarTab(KATALOG)) {
      expect(html, `tab ${t.label} hilang`).toContain(t.label);
    }
  });

  it("tombol FILTER hijau ada di baris yang sama", () => {
    expect(html).toContain("Filter");
    expect(html).toContain("bg-emerald-600");
  });
});

describe("tab adalah MENU yang PINDAH HALAMAN (owner, putaran ketiga)", () => {
  // Owner: "aku maunya pindah halaman (jadi halaman baru hanya berisi,
  // contohnya klik film terbaru satu halaman film terbaru semua)".
  // Sebelumnya tab mengganti isi DI TEMPAT lalu menggulir turun.
  it("di /beranda, tiap tab menuju halaman katalognya sendiri", () => {
    const html = render({ basePath: "/katalog" });
    expect(html).toContain('href="/katalog?tab=unggulan"');
    expect(html).toContain('href="/katalog?tab=terpopuler"');
    // Tab bawaan: halaman katalog tanpa parameter.
    expect(html).toContain('href="/katalog"');
  });

  it("alamatnya POLOS — tidak lagi menggulir di halaman yang sama", () => {
    const html = render({ basePath: "/katalog" });
    expect(
      html,
      "tab masih memakai penanda lompat — itu perilaku LAMA yang owner minta " +
        "diganti jadi pindah halaman",
    ).not.toContain("#daftar-katalog");
  });

  it("TIDAK menunjuk `/` — itu memantul untuk penonton yang sudah login", () => {
    expect(render({ basePath: "/katalog" })).not.toMatch(/href="\/\?tab=/);
  });

  it("tanpa basePath, perilaku halaman depan TIDAK berubah", () => {
    const html = render();
    expect(html).toContain('href="/?tab=unggulan"');
    expect(html).toContain('href="/"');
  });
});

describe("mode MENU: baris tab saja, isinya tinggal di halaman katalog", () => {
  // Kalau isinya ikut digambar di beranda, daftar yang sama muncul DUA KALI
  // dalam satu halaman — persis keluhan "ada 2 rekomendasi".
  const menu = renderToStaticMarkup(
    createElement(TabKatalogTampilan, {
      dramas: KATALOG,
      tab: TAB_BAWAAN,
      semua: false,
      basePath: "/katalog",
      hanyaMenu: true,
    }),
  );

  it("barisnya tetap tergambar lengkap", () => {
    for (const t of daftarTab(KATALOG)) {
      expect(menu, `tab ${t.label} hilang`).toContain(t.label);
    }
    expect(menu).toContain("Filter");
  });

  it("judul & daftar poster TIDAK ikut", () => {
    expect(menu).not.toContain("<h2");
    expect(menu).not.toContain("Judul yang paling baru masuk katalog");
  });

  it("pembanding: tanpa mode menu, judul & daftarnya MEMANG digambar", () => {
    // Tanpa baris ini, "tidak muncul" tak bisa dibedakan dari "tak pernah ada".
    const penuh = render({ basePath: "/katalog" });
    expect(penuh).toContain("<h2");
    expect(penuh).toContain(">Terbaru<");
  });
});

describe("3. baris tab jadi SATU kotak berpembatas", () => {
  // Owner: "aku mau jadi satu shadow ... seperti LK21 (jadi ada seperti
  // pembatas)". Sebelumnya tiap tab punya bayangan sendiri dan barisnya
  // terbaca sebagai tombol berserakan.
  const html = render({ basePath: "/katalog" });

  it("seluruh baris dibungkus kotak bergaris + satu bayangan", () => {
    expect(html).toMatch(/rounded-lg border border-zinc-800[^"]*shadow-/);
  });

  it("tab yang sedang dibuka tetap menonjol di dalam kotak", () => {
    expect(html).toMatch(/bg-amber-400[^"]*shadow-md/);
  });

  it("tab yang diam TIDAK lagi punya bayangan sendiri", () => {
    // Itu yang dulu membuat barisnya terlihat berserakan.
    expect(html).not.toMatch(/border-zinc-700 text-zinc-300 shadow-md/);
  });
});

// ===========================================================================
// PEMASANGAN — barisnya benar-benar tergambar di /beranda.
//
// Pelajaran 2026-09-23 & 2026-09-26: komponen bisa sempurna dan teruji
// sementara orangnya tidak pernah melihatnya. Untuk baris tab ini hal itu
// SUDAH TERJADI — ia ada empat hari di halaman depan tanpa pernah terbuka
// untuk owner.
// ===========================================================================
describe("deret tab benar-benar DIPASANG di /beranda", () => {
  const halaman = readFileSync("app/beranda/page.tsx", "utf-8");

  it("halaman beranda merender TabKatalog", () => {
    const impor = halaman.match(/^import[\s\S]*?;$/gm)?.join(" ") ?? "";
    expect(impor).toContain("TabKatalog");
    expect(halaman).toMatch(/<TabKatalog\s+dramas=/);
  });

  it("mengoper basePath=/beranda pada ELEMEN TabKatalog itu sendiri", () => {
    // ⚠️ Diperiksa dari elemennya, BUKAN dari "apakah teks basePath ada di
    // berkas". Versi pertama tes ini cuma mencari teks, dan itu LOLOS saat
    // diuji-rusak: isi `<Suspense fallback>` juga memuat basePath yang sama,
    // jadi melepasnya dari `<TabKatalog>` tetap hijau. Penjaga palsu —
    // bentuk kelemahan yang sudah berulang di repo ini.
    const elemen = halaman.match(/<TabKatalog\s[\s\S]*?\/>/);
    expect(elemen, "<TabKatalog … /> tidak ditemukan").toBeTruthy();
    expect(
      elemen![0],
      'tab di /beranda menunjuk "/" — penonton yang sudah login akan ' +
        "dipantulkan RedirectIfAuthed dan tabnya terlihat mati",
    ).toMatch(/basePath="\/katalog"/);
    expect(
      elemen![0],
      "baris tab di beranda menggambar isinya juga — daftar yang sama akan " +
        "muncul dua kali dalam satu halaman",
    ).toContain("hanyaMenu");
  });

  it("fallback-nya JUGA memakai basePath yang sama", () => {
    // Kalau fallback memakai alamat berbeda, tab sempat menunjuk `/` selama
    // sepersekian detik sebelum bagian browsernya menyusul — cukup untuk
    // diklik dan memantul.
    const fb = halaman.match(/<TabKatalogTampilan[\s\S]*?\/>/);
    expect(fb, "<TabKatalogTampilan … /> di fallback tidak ditemukan").toBeTruthy();
    expect(fb![0]).toMatch(/basePath="\/katalog"/);
    expect(fb![0]).toContain("hanyaMenu");
  });

  it("dibungkus <Suspense> — syarat Next untuk useSearchParams", () => {
    // Tanpa ini `next build` GAGAL, bukan sekadar peringatan.
    expect(halaman).toContain("<Suspense");
    expect(halaman).toContain("fallback=");
  });

  it("isi fallback-nya bentuk yang SAMA, supaya halaman tidak melompat", () => {
    expect(halaman).toContain("TabKatalogTampilan");
    expect(halaman).toContain("TAB_BAWAAN");
  });

  it("CatalogBrowser menggambar slotnya, bukan menelannya diam-diam", () => {
    const browser = readFileSync(
      "app/components/beranda/CatalogBrowser.tsx",
      "utf-8",
    );
    expect(browser).toContain("tabSlot");
    expect(browser).toMatch(/\{tabSlot\}/);
  });
});

describe("halaman depan TIDAK ikut berubah", () => {
  it("app/page.tsx tetap memakai bawaannya (tanpa basePath)", () => {
    // Di sana `/` memang alamat yang benar, dan RedirectIfAuthed baru bekerja
    // SESUDAH halaman terbuka — jadi pengunjung yang belum login tetap wajar.
    const depan = readFileSync("app/page.tsx", "utf-8");
    expect(depan).toContain("<TabKatalog dramas={dramas} />");
    expect(depan).not.toContain('basePath="/beranda"');
  });
});

// ===========================================================================
// TIGA MASUKAN OWNER sesudah melihat hasilnya di localhost (2026-09-26).
// ===========================================================================
const { judulDariLabel } = await import("../lib/tab-katalog");

describe("2. nama tab SAMA dengan judul bagiannya", () => {
  // Owner: "untuk nama seperti series unggulan harus sama dengan yang dibawah
  // juga (sekarang nama tidak sama)". Dulu menyimpang di 4 dari 6 tab.
  it("judul diturunkan dari label, bukan diketik terpisah", () => {
    expect(judulDariLabel("SERIES UNGGULAN")).toBe("Series Unggulan");
    expect(judulDariLabel("TERBARU")).toBe("Terbaru");
    expect(judulDariLabel("TERPOPULER")).toBe("Terpopuler");
    // Angka tidak punya huruf untuk dikapitalkan — lewat apa adanya.
    expect(judulDariLabel("2026")).toBe("2026");
  });

  it("TIAP tab: judulnya sama dengan namanya, hanya beda huruf besar-kecil", () => {
    for (const t of daftarTab(KATALOG)) {
      expect(
        t.judul.toLowerCase(),
        `tab "${t.label}" berjudul "${t.judul}" — penonton mengklik satu nama ` +
          `lalu mendarat di nama lain`,
      ).toBe(t.label.toLowerCase());
    }
  });

  it("judul yang tergambar memang nama tab yang sedang dibuka", () => {
    // Pembanding lewat render sungguhan, bukan cuma daftarnya.
    expect(render({ basePath: "/beranda" })).toContain(">Terbaru<");
  });
});



// ===========================================================================
// HALAMAN KATALOG (owner 2026-09-26, putaran ketiga) — tujuan tiap tab.
// ===========================================================================
describe("halaman /katalog: satu tab, satu halaman penuh", () => {
  const halaman = readFileSync("app/katalog/page.tsx", "utf-8");

  it("halamannya ada dan memasang baris tabnya", () => {
    expect(halaman).toMatch(/<TabKatalog\s+dramas=/);
    expect(halaman).toMatch(/basePath="\/katalog"/);
  });

  it("SELALU grid penuh — bukan sebaris poster", () => {
    // Inti permintaan owner: "satu halaman film terbaru SEMUA". Tanpa paksaan
    // ini, membuka /katalog tanpa ?semua=1 cuma memberi sebaris poster.
    //
    // ⚠️ Diperiksa dari ELEMEN-nya, bukan dari "apakah kata itu ada di
    // berkas". Versi pertama tes ini cuma mencari teks dan LOLOS saat propnya
    // dilepas — sebab komentar di halaman itu sendiri menyebut "paksaSemua".
    // Kekambuhan kelemahan yang sama persis dengan penjaga `basePath` di atas,
    // dan dengan jebakan komentar 2026-09-22 di halaman 404.
    const elemen = halaman.match(/<TabKatalog\s[\s\S]*?\/>/);
    expect(elemen, "<TabKatalog … /> tidak ditemukan").toBeTruthy();
    expect(
      elemen![0],
      "halaman katalog tidak memaksa grid penuh — membukanya cuma memberi " +
        "sebaris poster, bukan seluruh judul",
    ).toContain("paksaSemua");
  });

  it("dibungkus <Suspense> — tanpa itu build GAGAL", () => {
    expect(halaman).toContain("<Suspense");
    expect(halaman).toContain("fallback=");
  });

  it("fallback-nya juga grid penuh & basePath yang sama", () => {
    const fb = halaman.match(/<TabKatalogTampilan[\s\S]*?\/>/);
    expect(fb).toBeTruthy();
    expect(fb![0]).toMatch(/basePath="\/katalog"/);
    expect(fb![0]).toMatch(/\bsemua\b/);
  });

  it("TIDAK menyeret isi beranda ke sini", () => {
    // Halaman ini ada supaya satu tab terbuka BERSIH. Menambahkan banner,
    // baris personal, atau baris kategori mengingkari alasan ia dibuat.
    for (const jangan of ["PersonalRows", "FeaturedRow", "CatalogBrowser"]) {
      expect(halaman, `${jangan} tidak boleh ada di halaman katalog`).not.toContain(
        jangan,
      );
    }
  });

  it("punya navigasi — penonton yang mendarat bisa pulang", async () => {
    const { punyaNavbarAtas } = await import("../lib/navigasi-halaman");
    expect(punyaNavbarAtas("/katalog")).toBe(true);
  });
});

describe("2b. baris 'Rekomendasi Untuk Kamu' dilepas dari beranda", () => {
  // Owner 2026-09-26: "ada 2 rekomendasi (jadikan satu saja pilih salah satu)".
  // Yang dipertahankan tabnya; baris personal dilepas.
  const personal = readFileSync(
    "app/components/beranda/PersonalRows.tsx",
    "utf-8",
  );
  const kode = personal
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("jaring pengaman penyaring komentarnya sendiri", () => {
    expect(kode).toContain("ContentRow");
  });

  it("tidak ada lagi baris bernama 'Rekomendasi Untuk Kamu'", () => {
    expect(
      kode,
      "baris rekomendasi personal dipasang lagi — isinya kembar dengan tab " +
        "REKOMENDASI selama katalog masih kecil",
    ).not.toContain("Rekomendasi Untuk Kamu");
  });

  it("baris personal LAIN tetap hidup — yang dilepas hanya satu", () => {
    // Pembanding wajib: tanpa ini, menghapus seluruh PersonalRows juga lulus.
    expect(kode).toContain("Lanjut Menonton");
    expect(kode).toContain("Favorit Saya");
  });
});
