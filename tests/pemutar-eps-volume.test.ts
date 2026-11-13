// @vitest-environment jsdom
//
// Penjaga TATA LETAK BARIS BAWAH PEMUTAR — owner 2026-11-12, dua permintaan
// dari satu tangkapan layar:
//   1. "episode pindahkan ke bawah"  -> tombol "Eps n / N" turun ke bawah
//      garis geser (sebelumnya menempel di bawah judul);
//   2. "volume pindahkan ke samping durasi dan ketika di klik volumenya ke
//      atas" -> tombol volume pindah dari rail ikon kanan ke sebelah angka
//      durasi, dan pengaturnya membuka TEGAK KE ATAS.
// Putaran ketiga (2026-11-13): bentuk pengaturnya jadi GARIS GESER berbentuk
// kapsul (contoh gambar dari owner), bukan lagi dua tombol + / −.
//
// Yang dijaga di sini semuanya rusak SENYAP — tak satu pun memunculkan error:
//   A. tombol di panel bawah yang lupa `pointer-events-auto` TERLIHAT NORMAL
//      tapi tidak bisa diklik (panel induknya `pointer-events-none` permanen);
//   B. tombol Eps yang `pointer-events-auto` PERMANEN bisa ditekan walau sudah
//      memudar hilang — ketukan untuk memunculkan kontrol malah membuka daftar
//      episode;
//   C. urutan yang diam-diam kembali seperti semula (Eps naik lagi ke bawah
//      judul) tetap menggambar layar yang "kelihatan benar" sekilas;
//   D. garis volume yang diputar `-rotate-90` berdiri DI LUAR layar HP;
//   E. garis volume tanpa `touch-none` membuat jari yang menggesernya malah
//      melompat ke episode berikutnya (feed berpindah lewat gulir asli).
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import PlayerControls from "../app/components/player/PlayerControls";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let terakhir: { volume: number; muted: boolean } | null = null;

const dasar = {
  title: "Napi Baru, Jurus Master Menggemparkan Dunia",
  currentEp: 3,
  episodes: 52,
  cueText: "",
  lockedActive: false,
  controlsVisible: true,
  curTime: 19,
  dur: 122,
  seekBarRef: { current: null },
  onSeekDown: () => {},
  onSeekMove: () => {},
  onSeekUp: () => {},
  onOpenEpisodes: () => {},
};

function pasang(ubah: Partial<Parameters<typeof PlayerControls>[0]> = {}) {
  act(() => {
    root.render(
      createElement(PlayerControls, {
        ...dasar,
        sound: {
          volume: 1,
          muted: false,
          onChange: (n: { volume: number; muted: boolean }) => {
            terakhir = n;
          },
        },
        ...ubah,
      } as Parameters<typeof PlayerControls>[0]),
    );
  });
}

/** Pasang pemutar dengan keadaan suara tertentu lalu pastikan panel volumenya
 *  TERBUKA. Dipanggil dua kali berturut-turut, render keduanya memakai
 *  komponen yang SAMA — panelnya masih terbuka, jadi mengetuk tombolnya lagi
 *  justru MENUTUP. Karena itu ketukannya bersyarat. */
function pasangSuara(volume: number, muted: boolean) {
  pasang({
    sound: {
      volume,
      muted,
      onChange: (n: { volume: number; muted: boolean }) => (terakhir = n),
    },
  } as never);
  if (!container.querySelector('[aria-label="Atur volume"]')) {
    klik(cari('[aria-label="Volume"]'));
  }
  return cari('[aria-label="Atur volume"]');
}

function cari(sel: string): HTMLElement {
  const el = container.querySelector(sel);
  if (!el) throw new Error(`tidak ada di layar: ${sel}`);
  return el as HTMLElement;
}

function klik(el: Element) {
  act(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function tekanTombol(el: Element, key: string) {
  act(() => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
}

/** jsdom TIDAK menghitung tata letak — `getBoundingClientRect()` selalu nol.
 *  Jalur geser dipalsukan tingginya supaya rumus "posisi jari → volume" bisa
 *  diuji; yang diuji di sini rumusnya, BUKAN tata letaknya (itu cuma bisa
 *  dibuktikan browser sungguhan). Jalur: y 100 (atas/keras) .. 196 (bawah/bisu). */
function palsukanTinggiJalur(el: HTMLElement) {
  el.getBoundingClientRect = () =>
    ({
      top: 100,
      bottom: 196,
      height: 96,
      left: 0,
      right: 28,
      width: 28,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    }) as DOMRect;
}

function sentuh(el: Element, tipe: string, clientY: number) {
  act(() => {
    el.dispatchEvent(new MouseEvent(tipe, { bubbles: true, clientY }));
  });
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  terakhir = null;
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("tombol Eps pindah ke BAWAH garis geser", () => {
  it("digambar SESUDAH baris garis geser + durasi, bukan di bawah judul", () => {
    pasang();
    const html = container.innerHTML;

    const judul = html.indexOf("Napi Baru");
    const barisGeser = html.indexOf("Posisi video");
    const eps = html.indexOf("Eps ");

    expect(judul, "judul tidak tergambar").toBeGreaterThan(-1);
    expect(barisGeser, "garis geser tidak tergambar").toBeGreaterThan(-1);
    expect(eps, "tombol Eps tidak tergambar").toBeGreaterThan(-1);
    expect(
      eps,
      "tombol Eps naik lagi ke atas garis geser — permintaan owner " +
        "2026-11-12 adalah memindahkannya ke BAWAH",
    ).toBeGreaterThan(barisGeser);
  });

  it("isinya tetap 'Eps <sekarang> / <total>' dan membuka daftar episode", () => {
    let dibuka = 0;
    pasang({ onOpenEpisodes: () => dibuka++ });
    const tombol = [...container.querySelectorAll("button")].find((b) =>
      (b.textContent ?? "").includes("Eps "),
    );
    expect(tombol, "tombol Eps tidak ketemu").toBeTruthy();
    expect(tombol!.textContent).toContain("Eps 3 / 52");
    klik(tombol!);
    expect(dibuka, "tombol Eps tidak membuka daftar episode").toBe(1);
  });

  it("🪤 bisa diklik saat kontrol terlihat, MATI saat kontrol memudar", () => {
    // Dua arah sekaligus. Panel induk `pointer-events-none` permanen, jadi
    // tanpa `pointer-events-auto` tombolnya mati total walau terlihat (A);
    // dengan `pointer-events-auto` PERMANEN, ia tetap bisa ditekan walau sudah
    // tak terlihat sehingga ketukan untuk memunculkan kontrol malah membuka
    // daftar episode (B).
    pasang({ controlsVisible: true });
    let tombol = [...container.querySelectorAll("button")].find((b) =>
      (b.textContent ?? "").includes("Eps "),
    )!;
    expect(tombol.className).toContain("pointer-events-auto");

    pasang({ controlsVisible: false });
    tombol = [...container.querySelectorAll("button")].find((b) =>
      (b.textContent ?? "").includes("Eps "),
    )!;
    expect(tombol.className).toContain("pointer-events-none");
    expect(tombol.className).not.toContain("pointer-events-auto");
  });

  it("target sentuhnya tetap 44px sesudah pindah", () => {
    pasang();
    const tombol = [...container.querySelectorAll("button")].find((b) =>
      (b.textContent ?? "").includes("Eps "),
    )!;
    expect(tombol.className, "tombol Eps kehilangan min-h-11").toContain(
      "min-h-11",
    );
  });

  it("film (1 video utuh) tidak punya tombol Eps sama sekali", () => {
    pasang({ isMovie: true });
    expect(container.textContent).not.toContain("Eps ");
    expect(container.textContent).toContain("Film");
  });
});

describe("volume pindah ke SAMPING angka durasi", () => {
  it("duduk di baris yang SAMA dengan angka durasi", () => {
    pasang();
    const baris = cari(".mb-2.flex.items-center");
    expect(
      baris.textContent,
      "angka durasi tidak di baris ini — barisnya salah",
    ).toContain("0:19");
    expect(
      baris.querySelector('[aria-label="Volume"]'),
      "tombol volume tidak sebaris dengan angka durasi",
    ).toBeTruthy();
  });

  it("🪤 bisa diklik — panel bawah pemutar pointer-events-none permanen", () => {
    // Tanpa `pointer-events-auto`, tombolnya terlihat normal tapi ketukan
    // menembus ke video di belakangnya. Nol error; gejalanya cuma "kok tidak
    // ngapa-ngapain".
    pasang();
    expect(cari('[aria-label="Volume"]').className).toContain(
      "pointer-events-auto",
    );
  });

  it("diklik → garis geser muncul KE ATAS, diklik lagi tertutup", () => {
    pasang();
    expect(container.querySelector('[aria-label="Atur volume"]')).toBeNull();

    const jalur = pasangSuara(1, false);

    // `bottom-full` = berdiri di atas ikonnya. Kalau hilang, panelnya jatuh
    // menimpa angka durasi & garis geser — dua kontrol yang paling sering
    // dipakai justru tertutup.
    const panel = jalur.closest("div.absolute");
    expect(panel, "panel volume bukan elemen absolute").toBeTruthy();
    expect(
      panel!.className,
      "panel volume tidak membuka ke atas (bottom-full hilang)",
    ).toContain("bottom-full");

    klik(cari('[aria-label="Volume"]'));
    expect(container.querySelector('[aria-label="Atur volume"]')).toBeNull();
  });

  it("bentuknya GARIS GESER tegak, bukan tombol + / − (owner 2026-11-13)", () => {
    // Putaran ketiga: owner menolak bentuk dua tombol dan mengirim contoh
    // kapsul berisi garis geser. Kalau tombol + / − kembali, itu kemunduran ke
    // bentuk yang sudah ditolak — bukan sekadar beda selera.
    const jalur = pasangSuara(1, false);
    expect(jalur.getAttribute("role")).toBe("slider");
    expect(jalur.getAttribute("aria-orientation")).toBe("vertical");
    expect(container.querySelector('[aria-label="Naikkan volume"]')).toBeNull();
    expect(container.querySelector('[aria-label="Turunkan volume"]')).toBeNull();
  });

  it("🪤 NOL elemen diputar — itu yang dulu melempar garis volume keluar layar", () => {
    // Diukur di Chrome headless pada layar 393px (situs produksi, 2026-11-12):
    // garis volume berdiri di x=391 selebar 16px, jadi praktis SELURUHNYA di
    // luar layar. Sebabnya `transform` tidak mengubah ruang yang DIPESAN
    // elemen: kotak asli 96px meluber ~48px dari wadah 24px, LALU diputar,
    // sehingga pusat hasil putarannya ikut terlempar sejauh itu.
    //
    // Gejalanya SENYAP — nol error, garisnya cuma tidak ada di tempatnya. Di
    // layar lebar ia masih terlihat (cuma "agak misah"), jadi memeriksanya di
    // desktop saja TIDAK menangkap ini.
    //
    // `-translate-x-1/2`/`translate-y-1/2` pada bulatan penggeser BUKAN rotasi
    // — itu cuma memusatkan bulatan di titiknya, dan ia memang disengaja.
    const jalur = pasangSuara(1, false);
    const panel = jalur.closest("div.absolute")!;
    expect(
      panel.innerHTML,
      "ada elemen diputar lagi di panel volume — kelas kesalahan yang sama kembali terbuka",
    ).not.toMatch(/rotate-/);

    // Dirapatkan ke tepi KANAN tombolnya, bukan dipusatkan: tombol ini elemen
    // paling kanan di barisnya, jadi panel yang dipusatkan punya separuh badan
    // yang menggantung keluar layar.
    expect(panel.className, "panel tidak dirapatkan ke kanan").toContain("right-0");
  });

  it("🪤 jalur gesernya touch-none — kalau tidak, geseran jadi pindah episode", () => {
    // Feed berpindah episode lewat gulir-sentuh ASLI browser (`snap-y
    // snap-mandatory overflow-y-scroll`). Tanpa `touch-action: none`, jari yang
    // menarik volume ke atas ikut menggulir feed: penonton melompat ke episode
    // berikutnya padahal cuma mau mengeraskan suara. Nol error.
    const jalur = pasangSuara(1, false);
    expect(jalur.className, "jalur volume kehilangan touch-none").toContain(
      "touch-none",
    );
  });

  it("digeser ke TENGAH jalur → volume ±50%", () => {
    const jalur = pasangSuara(1, false);
    palsukanTinggiJalur(jalur);
    sentuh(jalur, "pointerdown", 148); // 100 + 96/2
    expect(terakhir).toEqual({ volume: 0.5, muted: false });
  });

  it("digeser ke UJUNG ATAS = penuh, ke UJUNG BAWAH = bisu", () => {
    // Arah ini gampang terbalik (koordinat layar tumbuh ke bawah, volume tumbuh
    // ke atas) dan kalau terbalik tidak ada satu pun error — suaranya saja yang
    // mengecil ketika penonton menariknya ke atas.
    const jalur = pasangSuara(0.5, false);
    palsukanTinggiJalur(jalur);

    sentuh(jalur, "pointerdown", 100);
    expect(terakhir, "ujung ATAS bukan volume penuh").toEqual({
      volume: 1,
      muted: false,
    });

    sentuh(jalur, "pointerdown", 196);
    expect(terakhir, "ujung BAWAH bukan bisu").toEqual({
      volume: 0,
      muted: true,
    });
  });

  it("🪤 jari yang MENTOK di tepi = penuh / bisu bulat, bukan 98% / 2%", () => {
    // Diukur di Chrome headless (layar 393px): jempol yang mentok di tepi
    // kapsul mendarat ~2px dari ujung jalur. Tanpa zona jepit hasilnya 2% —
    // praktis diam TAPI ikon speaker tetap menyala, dan penonton yang mau
    // membisukan mengira kontrolnya rusak. Mengejar piksel terakhir dengan
    // jempol itu mustahil.
    const jalur = pasangSuara(0.5, false);
    palsukanTinggiJalur(jalur);

    sentuh(jalur, "pointerdown", 102); // 2px dari ujung ATAS
    expect(terakhir, "mentok atas belum dibulatkan jadi penuh").toEqual({
      volume: 1,
      muted: false,
    });

    sentuh(jalur, "pointerdown", 194); // 2px dari ujung BAWAH
    expect(terakhir, "mentok bawah belum dibulatkan jadi bisu").toEqual({
      volume: 0,
      muted: true,
    });

    // Tapi zona jepitnya TIPIS — bagian tengah jalur tetap bebas, bukan ikut
    // melompat ke ujung.
    sentuh(jalur, "pointerdown", 110);
    expect(terakhir!.volume, "zona jepit kelebaran — tengah ikut melompat").toBeLessThan(1);
  });

  it("jari yang meleset KELUAR jalur tetap dijepit di 0..1", () => {
    const jalur = pasangSuara(0.5, false);
    palsukanTinggiJalur(jalur);
    sentuh(jalur, "pointerdown", 20); // jauh di atas kapsul
    expect(terakhir).toEqual({ volume: 1, muted: false });
    sentuh(jalur, "pointerdown", 400); // jauh di bawah kapsul
    expect(terakhir).toEqual({ volume: 0, muted: true });
  });

  it("digeser TERUS (pointermove) mengubah volume, sesudah dilepas tidak lagi", () => {
    // Tanpa pemeriksaan `menggeser`, kursor yang cuma LEWAT di atas kapsul
    // (tanpa ditekan) ikut mengubah volume — di tetikus itu terasa seperti
    // volume yang berubah sendiri.
    const jalur = pasangSuara(0.5, false);
    palsukanTinggiJalur(jalur);

    sentuh(jalur, "pointermove", 124);
    expect(terakhir, "bergerak padahal belum ditekan").toBeNull();

    sentuh(jalur, "pointerdown", 148);
    sentuh(jalur, "pointermove", 124); // 3/4 tinggi dari bawah
    expect(terakhir).toEqual({ volume: 0.75, muted: false });

    sentuh(jalur, "pointerup", 124);
    terakhir = null;
    sentuh(jalur, "pointermove", 196);
    expect(terakhir, "masih mengikuti kursor sesudah dilepas").toBeNull();
  });

  it("panah papan ketik menaikkan & menurunkan 10%", () => {
    const jalur = pasangSuara(0.5, false);
    tekanTombol(jalur, "ArrowUp");
    expect(terakhir).toEqual({ volume: 0.6, muted: false });
    tekanTombol(jalur, "ArrowDown");
    expect(terakhir).toEqual({ volume: 0.4, muted: false });
  });

  it("turun sampai 0 = BISU, bukan sekadar pelan", () => {
    // Safari iPhone mengabaikan `video.volume`; di sana yang efektif cuma
    // bisu/tidak. Tanpa `muted: true`, menurunkan ke 0 di iPhone tidak
    // membisukan apa pun — suara tetap keras, nol error.
    const jalur = pasangSuara(0.1, false);
    tekanTombol(jalur, "ArrowDown");
    expect(terakhir).toEqual({ volume: 0, muted: true });
  });

  it("dinaikkan dari keadaan BISU ikut menyalakan suaranya lagi", () => {
    // 🪤 Tanpa `muted: false` di sini, bulatan naik di layar tapi suaranya
    // tetap diam — dan tak ada satu pun yang memberi tahu kenapa.
    const jalur = pasangSuara(0, true);
    tekanTombol(jalur, "ArrowUp");
    expect(terakhir).toEqual({ volume: 0.1, muted: false });
  });

  it("posisi bulatan & nilainya ikut volume — bukti geseran berhasil", () => {
    // Di HP besar-kecil suara diatur tombol fisik, jadi tanpa bulatan yang
    // benar-benar berpindah, geseran yang berhasil dan yang mati terasa sama.
    let jalur = pasangSuara(0.4, false);
    expect(jalur.getAttribute("aria-valuenow")).toBe("40");
    expect(jalur.getAttribute("aria-valuetext")).toBe("40%");
    expect(jalur.innerHTML, "bagian terisi tidak ikut 40%").toContain("40%");

    jalur = pasangSuara(0, true);
    expect(jalur.getAttribute("aria-valuenow")).toBe("0");
    expect(
      jalur.getAttribute("aria-valuetext"),
      "pembaca layar mengucapkan '0%', bukan 'Bisu'",
    ).toBe("Bisu");
  });

  it("SATU ikon speaker saja di layar — bukan dua yang terbaca terpisah", () => {
    // Owner 2026-11-12: "kenapa itu jadi terpisah". Versi sebelumnya punya
    // ikon speaker kedua DI DALAM panel, dan dua ikon speaker di satu layar
    // terbaca sebagai dua kontrol yang berbeda.
    pasangSuara(1, false);
    const ikon = container.querySelectorAll(
      '[aria-label="Volume"], [aria-label="Bisukan"], [aria-label="Nyalakan suara"]',
    );
    expect(ikon.length, "ikon speaker lebih dari satu").toBe(1);
  });

  it("panel tertutup sendiri saat kontrol memudar", () => {
    // Kalau tidak, kapsul hitamnya tertinggal menggantung di atas film yang
    // sedang berjalan.
    pasang({ controlsVisible: true });
    klik(cari('[aria-label="Volume"]'));
    expect(container.querySelector('[aria-label="Atur volume"]')).toBeTruthy();

    pasang({ controlsVisible: false });
    expect(container.querySelector('[aria-label="Atur volume"]')).toBeNull();
  });

  it("tanpa prop sound → tanpa tombol volume (pemanggil lama aman)", () => {
    act(() => {
      root.render(
        createElement(
          PlayerControls,
          dasar as Parameters<typeof PlayerControls>[0],
        ),
      );
    });
    expect(container.querySelector('[aria-label="Volume"]')).toBeNull();
  });
});
