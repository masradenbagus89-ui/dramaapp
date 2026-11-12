// @vitest-environment jsdom
//
// Penjaga TATA LETAK BARIS BAWAH PEMUTAR — owner 2026-11-12, dua permintaan
// dari satu tangkapan layar:
//   1. "episode pindahkan ke bawah"  -> tombol "Eps n / N" turun ke bawah
//      garis geser (sebelumnya menempel di bawah judul);
//   2. "volume pindahkan ke samping durasi dan ketika di klik volumenya ke
//      atas" -> tombol volume pindah dari rail ikon kanan ke sebelah angka
//      durasi, dan garis pengaturnya membuka TEGAK KE ATAS.
//
// Yang dijaga di sini semuanya rusak SENYAP — tak satu pun memunculkan error:
//   A. tombol di panel bawah yang lupa `pointer-events-auto` TERLIHAT NORMAL
//      tapi tidak bisa diklik (panel induknya `pointer-events-none` permanen);
//   B. tombol Eps yang `pointer-events-auto` PERMANEN bisa ditekan walau sudah
//      memudar hilang — ketukan untuk memunculkan kontrol malah membuka daftar
//      episode;
//   C. urutan yang diam-diam kembali seperti semula (Eps naik lagi ke bawah
//      judul) tetap menggambar layar yang "kelihatan benar" sekilas.
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

  it("diklik → tombol + / − muncul KE ATAS, diklik lagi tertutup", () => {
    pasang();
    expect(container.querySelector('[aria-label="Naikkan volume"]')).toBeNull();

    klik(cari('[aria-label="Volume"]'));
    const naik = cari('[aria-label="Naikkan volume"]');
    expect(container.querySelector('[aria-label="Turunkan volume"]')).toBeTruthy();

    // `bottom-full` = berdiri di atas ikonnya. Kalau hilang, panelnya jatuh
    // menimpa angka durasi & garis geser — dua kontrol yang paling sering
    // dipakai justru tertutup.
    const panel = naik.closest("div.absolute");
    expect(panel, "panel volume bukan elemen absolute").toBeTruthy();
    expect(
      panel!.className,
      "panel volume tidak membuka ke atas (bottom-full hilang)",
    ).toContain("bottom-full");

    klik(cari('[aria-label="Volume"]'));
    expect(container.querySelector('[aria-label="Naikkan volume"]')).toBeNull();
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
    pasang();
    klik(cari('[aria-label="Volume"]'));
    const panel = cari('[aria-label="Naikkan volume"]').closest("div.absolute")!;
    expect(
      panel.innerHTML,
      "ada elemen diputar lagi di panel volume — kelas kesalahan yang sama kembali terbuka",
    ).not.toMatch(/rotate-/);

    // Dirapatkan ke tepi KANAN tombolnya, bukan dipusatkan: tombol ini elemen
    // paling kanan di barisnya, jadi panel yang dipusatkan punya separuh badan
    // yang menggantung keluar layar.
    expect(panel.className, "panel tidak dirapatkan ke kanan").toContain("right-0");
  });

  it("tombol + menaikkan volume dan melaporkannya ke pemutar", () => {
    pasang({
      sound: { volume: 0.5, muted: false, onChange: (n: { volume: number; muted: boolean }) => (terakhir = n) },
    } as never);
    klik(cari('[aria-label="Volume"]'));
    klik(cari('[aria-label="Naikkan volume"]'));
    expect(terakhir).toEqual({ volume: 0.6, muted: false });
  });

  it("tombol − sampai 0 = BISU, bukan sekadar pelan", () => {
    // Safari iPhone mengabaikan `video.volume`; di sana yang efektif cuma
    // bisu/tidak. Tanpa `muted: true`, menurunkan ke 0 di iPhone tidak
    // membisukan apa pun — suara tetap keras, nol error.
    pasang({
      sound: { volume: 0.1, muted: false, onChange: (n: { volume: number; muted: boolean }) => (terakhir = n) },
    } as never);
    klik(cari('[aria-label="Volume"]'));
    klik(cari('[aria-label="Turunkan volume"]'));
    expect(terakhir).toEqual({ volume: 0, muted: true });
  });

  it("dinaikkan dari keadaan BISU ikut menyalakan suaranya lagi", () => {
    // 🪤 Tanpa `muted: false` di sini, angka persen naik di layar tapi suaranya
    // tetap diam — dan tak ada satu pun yang memberi tahu kenapa.
    pasang({
      sound: { volume: 0, muted: true, onChange: (n: { volume: number; muted: boolean }) => (terakhir = n) },
    } as never);
    klik(cari('[aria-label="Volume"]'));
    klik(cari('[aria-label="Naikkan volume"]'));
    expect(terakhir).toEqual({ volume: 0.1, muted: false });
  });

  it("tombolnya mati di batas: + saat penuh, − saat sudah bisu", () => {
    pasang({
      sound: { volume: 1, muted: false, onChange: (n: { volume: number; muted: boolean }) => (terakhir = n) },
    } as never);
    klik(cari('[aria-label="Volume"]'));
    expect((cari('[aria-label="Naikkan volume"]') as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(
      (cari('[aria-label="Turunkan volume"]') as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it("angka persen ikut berubah — bukti ketukannya berhasil", () => {
    // Di HP, besar-kecil suara diatur tombol fisik, jadi tanpa angka di layar
    // ketukan yang berhasil dan yang mati terasa persis sama.
    pasang({
      sound: { volume: 0.4, muted: false, onChange: () => {} },
    } as never);
    klik(cari('[aria-label="Volume"]'));
    expect(container.textContent).toContain("40%");

    pasang({
      sound: { volume: 0, muted: true, onChange: () => {} },
    } as never);
    expect(container.textContent).toContain("Bisu");
  });

  it("SATU ikon speaker saja di layar — bukan dua yang terbaca terpisah", () => {
    // Owner 2026-11-12: "kenapa itu jadi terpisah". Versi sebelumnya punya
    // ikon speaker kedua DI DALAM panel, dan dua ikon speaker di satu layar
    // terbaca sebagai dua kontrol yang berbeda.
    pasang();
    klik(cari('[aria-label="Volume"]'));
    const ikon = container.querySelectorAll(
      '[aria-label="Volume"], [aria-label="Bisukan"], [aria-label="Nyalakan suara"]',
    );
    expect(ikon.length, "ikon speaker lebih dari satu").toBe(1);
  });

  it("panel tertutup sendiri saat kontrol memudar", () => {
    // Kalau tidak, kotak hitamnya tertinggal menggantung di atas film yang
    // sedang berjalan.
    pasang({ controlsVisible: true });
    klik(cari('[aria-label="Volume"]'));
    expect(container.querySelector('[aria-label="Naikkan volume"]')).toBeTruthy();

    pasang({ controlsVisible: false });
    expect(container.querySelector('[aria-label="Naikkan volume"]')).toBeNull();
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
