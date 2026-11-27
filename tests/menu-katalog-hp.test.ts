// Penjaga PANEL POP UP MENU KATALOG di HP — owner 2026-11-21:
// "jangan di jadikan dropdown tapi seperti pop up aja biar terlihat keren".
//
// ⚠️ KENAPA PENJAGA INI WAJIB ADA. Tiga dari empat hal yang dijaga di bawah
// rusak SENYAP: build tetap hijau, `tsc` tetap exit 0, halaman tetap 200.
// Yang berubah cuma layar komputer jadi gelap total, atau tes di berkas LAIN
// yang mendadak merah tanpa ada yang mengerti sebabnya.
//
// Isi panel Radix tidak tergambar di HTML server (itu memang yang menolong
// kita di sini), jadi sebagian patokan membaca SUMBERNYA — sama seperti
// tests/menu-akun.test.ts, dengan alasan yang sama: yang mau dijaga memang
// tak pernah muncul di hasil render.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import MenuKatalogHp, {
  IKON_GRUP,
  kelasKolomPanel,
} from "../app/components/beranda/MenuKatalogHp";
import { buildNavMenus } from "../lib/nav-katalog";
import type { Drama } from "../lib/types";

const SEARCHBAR = readFileSync(
  "app/components/beranda/SearchBar.tsx",
  "utf-8",
);

/**
 * Buang komentar sebelum memeriksa isi berkas.
 *
 * 🪤 WAJIB untuk patokan yang menuntut sebuah string TIDAK ADA, dan ini bukan
 * kehati-hatian teoretis: dua penjaga di berkas ini sempat LULUS PALSU karena
 * menemukan `72dvh`, `h-dvh`, dan `inset-0` di dalam komentar yang justru
 * menerangkan perubahannya. Ketahuan hanya saat diuji-balik — mutasi sengaja
 * yang seharusnya merah ternyata tetap hijau. Jebakan yang sama sudah tercatat
 * di docs/lintasai/INDEX.md sejak audit 2026-11-14.
 *
 * ❓ Batas jujur: pembuangnya regex sederhana, jadi "//" di dalam string
 * literal ikut terpotong. Cukup untuk dua berkas ini (nol URL di dalamnya),
 * dan kalaupun memotong kelebihan, akibatnya tes jadi lebih LONGGAR — bukan
 * merah palsu yang menyesatkan.
 */
function tanpaKomentar(sumber: string): string {
  return sumber.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

const SEARCHBAR_KODE = tanpaKomentar(SEARCHBAR);

function drama(partial: Partial<Drama> & Pick<Drama, "id" | "title">): Drama {
  return {
    synopsis: "",
    poster: "",
    category: "Action",
    episodes: [],
    ...partial,
  } as Drama;
}

const KATALOG: Drama[] = [
  drama({ id: "a", title: "A", category: "Action", year: "2026", country: "China" }),
  drama({ id: "b", title: "B", category: "Romance", year: "2025", country: "Korea" }),
];

describe("panel hanya dipasang saat dibuka — tiga penjaga lain bergantung padanya", () => {
  it("TIDAK ada forceMount di SearchBar", () => {
    // Radix melepas isi panel saat tertutup. Itu satu-satunya hal yang menjaga
    // tiga penjaga di berkas LAIN tetap hijau:
    //   1. tests/strip-katalog.test.ts:116 — tiap href="/discover…" yang
    //      tergambar wajib mengubah penyaring. Tiap grup menu punya baris ekor
    //      { label: "Lainnya", href: "/discover" } yang POLOS (lib/nav-katalog.ts:258).
    //   2. tests/strip-katalog.test.ts:303 — HTML tak boleh memuat ">Amerika<",
    //      ">Kanada<", ">Thriller<" dan enam teks lain (keluhan owner 2026-09-21).
    //   3. tests/beranda-bentuk-halaman.test.ts — menghitung bentuk HTML awal.
    // `forceMount` memasang isinya sejak awal → ketiganya merah sekaligus,
    // dan sebabnya ada di berkas yang sama sekali tidak disebut pesan errornya.
    expect(
      SEARCHBAR,
      "forceMount memasang isi panel sejak HTML pertama — ini mengembalikan " +
        "tiga kerusakan di tests/strip-katalog.test.ts & beranda-bentuk-halaman",
    ).not.toContain("forceMount");
  });
});

/**
 * Potong satu blok JSX dari sumber, dengan penanda AWAL & AKHIR.
 *
 * Dipakai alih-alih regex `<Tag[\s\S]*?>`, dan itu bukan selera: (a) berkasnya
 * ber-akhir-baris CRLF sehingga pola yang memuat `\n` meleset, (b) di dalam
 * atribut ada panah fungsi `(e) => {` yang membuat `*?>` berhenti terlalu
 * cepat, dan (c) nama tag yang sama juga disebut di dalam KOMENTAR sehingga
 * `indexOf` polos menemukan yang salah lebih dulu.
 */
function potong(sumber: string, awal: string, akhir: string, dari = 0): string {
  const i = sumber.indexOf(awal, dari);
  expect(i, `penanda "${awal}" tidak ditemukan`).toBeGreaterThan(-1);
  const j = sumber.indexOf(akhir, i);
  expect(j, `penanda "${akhir}" tidak ada sesudah "${awal}"`).toBeGreaterThan(i);
  return sumber.slice(i, j);
}

describe("layar komputer dijaga oleh PEMICU, bukan oleh panelnya", () => {
  it("pemicu memakai md:hidden", () => {
    // ⚠️ PEMICUNYA BUKAN LAGI `<SheetTrigger>` yang membungkus logo
    // (owner 2026-11-27: *"ketika diklik logo layarindo bukan menu genre yang
    // muncul, tapi menu awal/home"*). Kini ia tombol ikon tersendiri yang
    // membuka panel lewat `setMenuHpTerbuka`. Yang DIJAGA tidak berubah
    // sedikit pun: pemicu itu wajib `md:hidden`, sebab di layar komputer
    // deretan menu aslinya sudah tergambar dan tombol kedua cuma
    // membingungkan.
    const pemicu = potong(SEARCHBAR, 'aria-label="Menu kategori"', "</button>");
    expect(
      pemicu,
      "pemicu panel tanpa md:hidden — tombolnya ikut tergambar di layar " +
        "komputer, padahal di sana deretan menu aslinya sudah ada",
    ).toContain("md:hidden");
  });

  it("SheetContent TIDAK memakai md:hidden", () => {
    // 🪤 Jebakan yang sudah terbukti saat merancang: `SheetContent` menggambar
    // `<SheetOverlay />` sebagai elemen TERPISAH yang className-nya tidak
    // diteruskan (components/ui/sheet.tsx:59), dan SheetOverlay tidak diekspor.
    // Jadi `md:hidden` di Content menyembunyikan panelnya tapi MENINGGALKAN
    // tirai `fixed inset-0 z-50 bg-black/50`: layar komputer gelap total,
    // tanpa satu pun yang bisa diklik, tanpa satu pun error.
    // Dicari dari `side="bottom"` ke belakang: nama `<SheetContent>` juga
    // disebut di dalam komentar peringatan di berkas yang sama, dan pencarian
    // dari depan akan menemukan komentar itu lebih dulu lalu "lulus" tanpa
    // memeriksa apa pun.
    const iSide = SEARCHBAR.indexOf('side="bottom"');
    expect(iSide, 'atribut side="bottom" hilang dari SheetContent').toBeGreaterThan(-1);
    const isiSheetContent = potong(
      SEARCHBAR,
      "<SheetContent",
      "{chrome.menusHp}",
      SEARCHBAR.lastIndexOf("<SheetContent", iSide),
    );
    expect(
      isiSheetContent,
      "md:hidden di SheetContent meninggalkan tirai hitam menutupi layar komputer",
    ).not.toContain("md:hidden");
    // Pagar supaya tes di atas tidak lulus hanya karena potongannya meleset.
    expect(isiSheetContent).toContain('side="bottom"');
  });
});

describe("tombol tutup yang bisa dijangkau jempol", () => {
  it("X bawaan sheet dimatikan, diganti bilah Tutup di dasar panel", () => {
    // X bawaan `sheet.tsx:78` berukuran ~16px di `top-4 right-4`. Pada panel
    // 72dvh ia mendarat di sekitar sepertiga atas layar — titik paling sulit
    // dijangkau jempol satu tangan.
    expect(SEARCHBAR).toContain("showCloseButton={false}");
    const panel = readFileSync(
      "app/components/beranda/MenuKatalogHp.tsx",
      "utf-8",
    );
    // Toleran terhadap ganti-baris & lekukan (berkas repo ini campur CRLF/LF).
    expect(panel, "bilah Tutup di dasar panel hilang").toMatch(
      />\s*Tutup\s*<\/SheetClose>/,
    );
  });
});

describe("tinggi panel MENGIKUTI ISI — tidak dipaksa setinggi layar", () => {
  // Riwayat bentuknya (owner 2026-11-23, tiga putaran dalam satu hari):
  //   72dvh meluncur dari bawah → *"tidak maksimal"*
  //   → penuh satu layar        → *"jangan bikin full layar"* + *"sakit mata"*
  //   → kotak di tengah yang tingginya mengikuti isi (ini).
  // Keduanya ditolak karena alasan yang SAMA: tinggi TETAP menyisakan bidang
  // warna kosong saat semua grup tertutup. Diukur sesudah perubahan (Chrome
  // 393x852): 486px saat tertutup, 631px saat Genre dibuka — panel tumbuh
  // mengikuti isinya, bukan mematok layar.
  const PANEL = readFileSync(
    "app/components/beranda/MenuKatalogHp.tsx",
    "utf-8",
  );

  it("panel dipusatkan dan tingginya mengikuti isi", () => {
    // Diperiksa atas KODE saja — lihat `tanpaKomentar` di atas; versi pertama
    // tes ini lulus palsu karena string-nya ada di komentarnya sendiri.
    expect(SEARCHBAR_KODE, "panel tidak lagi dipusatkan").toContain(
      "inset-0 m-auto",
    );
    expect(SEARCHBAR_KODE, "tinggi panel harus mengikuti isi").toContain(
      "h-fit",
    );
    expect(
      SEARCHBAR_KODE,
      "panel dipatok setinggi layar lagi",
    ).not.toContain("h-dvh");
  });

  it("batas tinggi ada di SATU tempat: wadah bergulir, bukan panelnya", () => {
    // 🪤 Versi pertama tes ini MERAH padahal kodenya benar: ia menemukan
    // "72dvh" di dalam KOMENTAR yang justru menerangkan bahwa batas itu sudah
    // dibuang. Lihat `tanpaKomentar` di atas.
    const kodeSaja = tanpaKomentar(PANEL);
    expect(kodeSaja, "batas tinggi lama kembali").not.toContain("72dvh");
    // `dvh`, BUKAN `vh`: di HP bilah alamat browser menyusut saat digulir dan
    // `vh` tidak ikut menyesuaikan, menyisakan panel yang terpotong.
    expect(kodeSaja, "pagar gulir grup panjang hilang").toContain(
      "max-h-[58dvh]",
    );
    // Dua tempat yang sama-sama memasang batas tinggi = dua angka yang bisa
    // menyimpang tanpa memunculkan error.
    expect(
      tanpaKomentar(SEARCHBAR),
      "batas tinggi kembali kembar di pemanggil",
    ).not.toContain("max-h-[");
  });

  it("luncuran dimatikan lewat variabelnya, bukan lewat kelas lawan", () => {
    // twMerge TIDAK mengenali kelas tw-animate-css sebagai grup yang saling
    // meniadakan, jadi menambah kelas "lawan" tidak membatalkan
    // `slide-in-from-bottom` bawaan sheet.tsx — kelas bawaannya tetap menang.
    // Menyetel translate-nya ke 0 membuat keyframe berjalan tanpa perpindahan;
    // yang tersisa fade bawaannya. Itulah "memudar" yang diminta owner.
    expect(SEARCHBAR_KODE).toContain("--tw-enter-translate-y:0");
    expect(SEARCHBAR_KODE).toContain("--tw-exit-translate-y:0");
  });
});

describe("warna panel RATA, tidak bergradasi", () => {
  // Owner 2026-11-23: *"warnanya kurang singkron"*. Bar cari & panel memakai
  // gradasi yang SAMA, tapi terbaca sebagai dua warna karena porsi yang
  // TERLIHAT berbeda — bar pendek & tertutup kotak cari (tampak ujung kiri
  // rose-700), panel selebar layar (ujung pink-600 ikut tampil & mendominasi).
  const PANEL = readFileSync(
    "app/components/beranda/MenuKatalogHp.tsx",
    "utf-8",
  );

  it("panel & isinya memakai LATAR_PANEL_KATALOG_HP, bukan LATAR_BAR_MEREK", () => {
    const panelKode = tanpaKomentar(PANEL);
    expect(SEARCHBAR_KODE).toContain("LATAR_PANEL_KATALOG_HP");
    expect(panelKode).toContain("LATAR_PANEL_KATALOG_HP");
    expect(panelKode, "gradasi masuk lagi ke panel").not.toContain(
      "LATAR_BAR_MEREK",
    );
  });

  it("bar cari di kepala situs TETAP bergradasi — yang berubah cuma panelnya", () => {
    // Penjaga arah sebaliknya: "menyamakan warna" tidak boleh diselesaikan
    // dengan ikut mematikan gradasi bar, karena gradasi itulah identitas
    // situsnya dan dua tes lain memakunya (strip-katalog.test.ts:144 & :387).
    expect(SEARCHBAR_KODE).toContain("LATAR_BAR_MEREK");
  });
});

describe("tiap grup menu punya ikonnya sendiri", () => {
  it("nol grup yang jatuh ke ikon cadangan", () => {
    // Kerusakan senyap yang dicegah: menambah grup baru di lib/nav-katalog.ts
    // membuat grup itu tergambar dengan ikon Compass yang sama dengan grup
    // tak-dikenal lain. Tidak ada error — cuma dua grup berbeda yang terlihat
    // kembar. Cadangannya tetap ada supaya tak pernah kosong; tes inilah yang
    // memastikan cadangan itu tidak diam-diam jadi keadaan normal.
    const kunci = buildNavMenus(KATALOG, []).map((m) => m.key);
    expect(kunci.length).toBeGreaterThan(0);
    for (const k of kunci) {
      expect(IKON_GRUP[k], `grup "${k}" belum punya ikon sendiri`).toBeTruthy();
    }
  });
});

describe("jumlah kolom isi grup dihitung dari DATA, bukan daftar tulis-tangan", () => {
  it("nama panjang 2 kolom, angka 3 kolom, grup pendek 1 kolom", () => {
    // Kalau dibalik, "Uni Emirat Arab" terpotong di layar 393px — dan nama
    // terpotong lebih buruk daripada daftar yang sedikit lebih panjang.
    expect(
      kelasKolomPanel({ key: "negara", label: "Negara", items: [], kolom: 4, lebarNama: true }),
    ).toBe("grid-cols-2");
    expect(
      kelasKolomPanel({ key: "tahun", label: "Tahun", items: [], kolom: 4 }),
    ).toBe("grid-cols-3");
    expect(
      kelasKolomPanel({ key: "populer", label: "Populer", items: [] }),
    ).toBe("grid-cols-1");
  });
});

describe("katalog kosong tidak menghasilkan panel hampa", () => {
  it("MenuKatalogHp memulangkan null saat menus kosong", () => {
    // Dipanggil langsung sebagai fungsi — komponen ini sengaja tanpa hook,
    // jadi tidak butuh browser maupun pembungkus Sheet untuk diuji.
    expect(MenuKatalogHp({ menus: [] })).toBeNull();
  });

  it("perakit kepala situs tidak memasang panel saat katalog kosong", () => {
    // Tanpa gerbang ini, mengetuk logo saat katalog kosong membuka panel
    // HAMPA: `NavMenus` memang memulangkan null, tapi ELEMEN-nya tetap ada
    // sehingga syarat `chrome.menus` selalu terpenuhi.
    for (const berkas of [
      "app/components/beranda/KepalaKatalog.tsx",
      "app/components/beranda/PublicTopBars.tsx",
    ]) {
      const sumber = readFileSync(berkas, "utf-8");
      expect(sumber, `${berkas} tidak memasang MenuKatalogHp`).toContain(
        "MenuKatalogHp",
      );
      expect(
        sumber,
        `${berkas} memasang panel tanpa memeriksa katalog kosong`,
      ).toMatch(/menus\.length > 0 \? <MenuKatalogHp/);
    }
  });
});
