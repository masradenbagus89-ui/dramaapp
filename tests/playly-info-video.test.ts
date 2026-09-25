// @vitest-environment jsdom
//
// Penjaga kotak keterangan + aksi di bawah pemutar video Playly.
//
// KENAPA diuji: dua hal di komponen ini rusak SECARA SENYAP — tidak ada error,
// tidak ada layar merah, cuma tampilan yang salah dan tidak ada yang melapor.
//
// 1) LENCANA YANG DIKARANG. Kalau suatu saat ada yang "merapikan" komponen ini
//    lalu menulis "HD" sebagai teks tetap, situs akan menjanjikan ketajaman yang
//    belum tentu ada ke seluruh video — persis larangan di lib/types.ts:214-221.
//    Tes di bawah mengunci: data kosong = lencananya TIDAK digambar.
//
// 2) TOMBOL SIMPAN. Seluruh nilainya ada di INTERAKSI. Tombol yang tergambar
//    rapi tapi tidak berubah saat diklik terlihat sempurna di tangkapan layar
//    dan tetap tidak berguna.
//
// Warna DOWNLOAD juga dikunci utuh (`bg-pink-600`, bukan rakitan `bg-` + warna):
// Tailwind memindai kode sumber untuk memutuskan kelas mana yang ikut dibundel,
// jadi kelas rakitan tidak akan ada di CSS hasil build dan tombolnya tergambar
// pucat tanpa peringatan apa pun. Alasan yang sama dipakai di
// tests/download-modal-render.test.ts.
//
// JSX sengaja tidak dipakai (createElement langsung) supaya berkas ini tetap
// .ts dan cocok dengan `include` di vitest.config.ts.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createElement as h, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import InfoVideoPlayly, {
  pecahGenre,
  type InfoVideoPlaylyProps,
} from "../app/components/player/InfoVideoPlayly";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const LENGKAP: InfoVideoPlaylyProps = {
  title: "MOVIE_TITAN WAR THE LAST KING",
  contentRating: "PG-13",
  quality: "WEB-DL",
  durationLabel: "18:08",
  genre: "Action, Sci-Fi",
};

const markup = (props: Partial<InfoVideoPlaylyProps> = {}) =>
  renderToStaticMarkup(h(InfoVideoPlayly, { ...LENGKAP, ...props }));

function pasang(props: Partial<InfoVideoPlaylyProps> = {}) {
  act(() => root.render(h(InfoVideoPlayly, { ...LENGKAP, ...props })));
}

describe("InfoVideoPlayly — isi kotak", () => {
  it("menampilkan judul, lencana, genre, dan ketiga tombol", () => {
    const html = markup();
    expect(html).toContain("MOVIE_TITAN WAR THE LAST KING");
    expect(html).toContain("PG-13");
    expect(html).toContain("WEB-DL");
    expect(html).toContain("18:08");
    expect(html).toContain("Action");
    expect(html).toContain("Sci-Fi");
    expect(html).toContain("DOWNLOAD");
    expect(html).toContain("Bagikan");
    expect(html).toContain("Simpan");
  });

  it("kotaknya SEMPIT, bukan selebar player", () => {
    // Permintaan owner 2026-09-25. Gampang hilang diam-diam kalau nanti ada
    // yang menyamakan lebarnya dengan player supaya "terlihat rapi".
    expect(markup()).toContain("max-w-sm");
  });

  it("tombol DOWNLOAD memakai kelas warna yang utuh di kode", () => {
    expect(markup()).toContain("bg-pink-600");
  });
});

describe("InfoVideoPlayly — data kosong TIDAK dikarang", () => {
  it("tanpa rating usia & kualitas, tidak ada lencana yang muncul", () => {
    const html = markup({ contentRating: null, quality: null, durationLabel: "12:00" });
    expect(html).not.toContain("PG-13");
    expect(html).not.toContain("WEB-DL");
    // Inti larangannya: JANGAN pernah menebak "HD" sendiri.
    expect(html).not.toContain(">HD<");
    // Durasi yang memang ada tetap tampil.
    expect(html).toContain("12:00");
  });

  it('durasi "-" dari Playly diperlakukan sama dengan kosong', () => {
    // "-" adalah nilai yang dikirim Playly saat panjang videonya tak diketahui.
    // Digambar apa adanya, penonton melihat lencana berisi satu tanda hubung.
    const html = markup({ contentRating: null, quality: null, durationLabel: "-" });
    expect(html).not.toContain(">-<");
  });

  it("tanpa genre, tidak ada chip yang digambar", () => {
    const html = markup({ genre: null });
    expect(html).not.toContain("Action");
    expect(html).not.toContain("Sci-Fi");
  });

  it("video tanpa keterangan apa pun tetap menampilkan judul + tombol", () => {
    // Keadaan NORMAL untuk video Playly yang belum dikaitkan admin ke drama.
    const html = markup({
      contentRating: null,
      quality: null,
      durationLabel: null,
      genre: null,
    });
    expect(html).toContain("MOVIE_TITAN WAR THE LAST KING");
    expect(html).toContain("DOWNLOAD");
  });
});

describe("pecahGenre — teks bebas dari OMDb", () => {
  it("memecah daftar berkoma jadi chip terpisah", () => {
    expect(pecahGenre("Action, Sci-Fi")).toEqual(["Action", "Sci-Fi"]);
  });

  it("membuang spasi berlebih dan koma menggantung", () => {
    expect(pecahGenre("  Romance ,, Comedy,  ")).toEqual(["Romance", "Comedy"]);
  });

  it("dibatasi 4 supaya tidak mendorong tombol keluar dari kotak", () => {
    // Angka 4 mengikuti contoh yang dikirim owner 2026-09-25 (France, Mexico,
    // Drama, Thriller). Lebih dari itu chip-nya turun baris dan kotak memanjang.
    expect(pecahGenre("A, B, C, D, E")).toEqual(["A", "B", "C", "D"]);
  });

  it("kosong/null -> daftar kosong, bukan chip hampa", () => {
    expect(pecahGenre(null)).toEqual([]);
    expect(pecahGenre("")).toEqual([]);
    expect(pecahGenre(" , , ")).toEqual([]);
  });
});

describe("InfoVideoPlayly — tombol Simpan benar-benar berubah saat diklik", () => {
  const tombolSimpan = () =>
    Array.from(container.querySelectorAll("button")).find((b) =>
      b.hasAttribute("aria-pressed"),
    ) as HTMLButtonElement;

  it("mulai dari belum tersimpan", () => {
    pasang();
    expect(tombolSimpan().getAttribute("aria-pressed")).toBe("false");
    expect(tombolSimpan().textContent).toContain("Simpan");
  });

  it("sekali klik -> tersimpan, klik lagi -> kembali", () => {
    pasang();
    act(() => tombolSimpan().click());
    expect(tombolSimpan().getAttribute("aria-pressed")).toBe("true");
    expect(tombolSimpan().textContent).toContain("Tersimpan");

    act(() => tombolSimpan().click());
    expect(tombolSimpan().getAttribute("aria-pressed")).toBe("false");
    expect(tombolSimpan().textContent).toContain("Simpan");
  });
});

describe("InfoVideoPlayly — tombol DOWNLOAD", () => {
  it("memanggil handler yang dikirim pemanggil", () => {
    let dipanggil = 0;
    act(() =>
      root.render(
        h(InfoVideoPlayly, { ...LENGKAP, onDownload: () => { dipanggil++; } }),
      ),
    );
    const tombol = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("DOWNLOAD"),
    ) as HTMLButtonElement;
    act(() => tombol.click());
    expect(dipanggil).toBe(1);
  });
});

describe("InfoVideoPlayly - warna kotak (latar TERANG, permintaan owner)", () => {
  // Kelas warna WAJIB utuh di kode, bukan dirakit saat berjalan: Tailwind
  // memindai berkas sumber untuk memutuskan kelas mana yang ikut dibundel, jadi
  // kelas rakitan tidak akan ada di CSS hasil build dan kotaknya tergambar
  // transparan/pucat tanpa ada yang melapor. Alasan yang sama dipakai di
  // tests/download-modal-render.test.ts.
  it("kotaknya berlatar putih dengan teks gelap", () => {
    const html = markup();
    expect(html).toContain("bg-white");
    expect(html).toContain("text-zinc-900");
  });

  it("chip genre memakai merah muda yang utuh di kode", () => {
    const html = markup();
    expect(html).toContain("bg-pink-50");
    expect(html).toContain("text-pink-600");
  });

  it("keterangan dipisah garis tegak, bukan ditumpuk jadi kotak-kotak", () => {
    // Bentuk yang dipilih owner 2026-09-25 ("17+ | BluRay | 1h 39m").
    const html = markup();
    expect(html).toContain("|");
  });

  it("tidak ada garis tegak menggantung saat keterangannya cuma satu", () => {
    // Pemisah hanya sah DI ANTARA dua isi. Kalau ikut tergambar di depan item
    // pertama, penonton melihat "| 12:00" yang terbaca seperti salah cetak.
    const html = markup({ contentRating: null, quality: null, durationLabel: "12:00" });
    expect(html).not.toContain("|");
    expect(html).toContain("12:00");
  });
});
