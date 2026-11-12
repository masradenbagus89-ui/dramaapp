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

  it("diklik → garis pengatur muncul KE ATAS, diklik lagi tertutup", () => {
    pasang();
    expect(container.querySelector('[aria-label="Atur volume"]')).toBeNull();

    klik(cari('[aria-label="Volume"]'));
    const geser = cari('[aria-label="Atur volume"]');
    // `bottom-full` = berdiri di atas ikonnya. Kalau hilang, panelnya jatuh
    // menimpa angka durasi & garis geser — dua kontrol yang paling sering
    // dipakai justru tertutup.
    const panel = geser.closest("div.absolute");
    expect(panel, "panel volume bukan elemen absolute").toBeTruthy();
    expect(
      panel!.className,
      "panel volume tidak membuka ke atas (bottom-full hilang)",
    ).toContain("bottom-full");
    // Garisnya tegak: diputar -90 derajat.
    expect(geser.className, "garis volume tidak tegak").toContain("-rotate-90");

    klik(cari('[aria-label="Volume"]'));
    expect(container.querySelector('[aria-label="Atur volume"]')).toBeNull();
  });

  it("menggeser garisnya melaporkan volume baru ke pemutar", () => {
    pasang();
    klik(cari('[aria-label="Volume"]'));
    const geser = cari('[aria-label="Atur volume"]') as HTMLInputElement;

    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(geser, "0.3");
      geser.dispatchEvent(new Event("input", { bubbles: true }));
      geser.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(terakhir).toEqual({ volume: 0.3, muted: false });
  });

  it("digeser sampai 0 = BISU, bukan sekadar pelan", () => {
    // Safari iPhone mengabaikan `video.volume`; di sana yang efektif cuma
    // bisu/tidak. Tanpa `muted: true`, menggeser ke 0 di iPhone tidak
    // membisukan apa pun — suara tetap keras, nol error.
    pasang();
    klik(cari('[aria-label="Volume"]'));
    const geser = cari('[aria-label="Atur volume"]') as HTMLInputElement;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(geser, "0");
      geser.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(terakhir).toEqual({ volume: 0, muted: true });
  });

  it("panel tertutup sendiri saat kontrol memudar", () => {
    // Kalau tidak, kotak hitamnya tertinggal menggantung di atas film yang
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
