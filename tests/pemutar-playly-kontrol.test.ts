// @vitest-environment jsdom
//
// Penjaga untuk BARIS KONTROL pemutar Playly (PlaylyPlayer), dipasang
// 2026-11-07.
//
// KENAPA BERKAS INI ADA: sampai hari ini tidak ada satu pun tes yang me-render
// `PlaylyPlayer`. tests/player-loncat.test.ts hanya menguji fungsi murni
// `posisiSesudahLoncat`, dan tests/player-menu.test.ts me-render `PlayerMenu`
// SENDIRIAN — lepas dari pemutarnya. Akibatnya dua tombol di baris kontrol
// bisa dihapus dengan 2.040 tes tetap hijau, dan itu betul-betul terjadi
// 2026-11-06 tanpa satu pun peringatan mesin.
//
// Yang dijaga di sini adalah keputusan owner 2026-11-07, diambil SESUDAH
// melihat kedua versi di layar: Subtitle & Kecepatan cukup di menu titik tiga
// saja, TIDAK dinaikkan jadi tombol langsung. Jadi penjaga ini menjaga dua
// arah sekaligus — yang harus ADA, dan yang sengaja TIDAK ada.
//
// JSX sengaja tidak dipakai (createElement langsung) supaya berkas ini tetap
// .ts dan cocok dengan `include` di vitest.config.ts — alasan yang sama dengan
// tests/player-menu.test.ts.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createElement as h, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import PlaylyPlayer from "../app/components/player/PlaylyPlayer";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

/**
 * Alamat video uji SENGAJA se-origin dengan halaman tes. Itu membuat
 * periksaIzinSuara() memulangkan "boleh" lewat cabang `seOrigin` tanpa
 * menembak jaringan sama sekali, jadi tes ini tidak perlu memalsukan
 * permintaan kedua (`Range: bytes=0-0`).
 */
const videoUji = () => new URL("/uji.mp4", window.location.href).toString();

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  // Satu-satunya permintaan jaringan di jalur ini: gerbang izin
  // /api/playly/video. Balasannya dibuat seperti aslinya (ok + videoUrl),
  // sebab baris kontrol HANYA dirender setelah videoUrl terisi.
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, videoUrl: videoUji() }),
    })),
  );
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function renderPemutar() {
  await act(async () => {
    root.render(h(PlaylyPlayer, { videoId: "uji-1", title: "Video Uji" }));
  });
}

function klik(el: Element | null | undefined) {
  if (!el) throw new Error("Elemen yang mau diklik tidak ditemukan.");
  act(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

const semuaTombol = () => Array.from(container.querySelectorAll("button"));

const tombolMenu = () =>
  container.querySelector<HTMLButtonElement>('[aria-label="Menu pemutar"]');

/** Cari tombol dari aria-label-nya — itu yang dibaca pembaca layar. */
function tombolBerlabel(awalan: string): HTMLButtonElement | undefined {
  return semuaTombol().find((b) => b.getAttribute("aria-label")?.startsWith(awalan));
}

describe("PlaylyPlayer — baris kontrol", () => {
  it("baris kontrol & menu titik tiga tergambar sesudah alamat video didapat", async () => {
    // Penjaga paling dasar, dan justru inilah yang selama ini tidak ada:
    // kontrol HANYA dirender kalau videoUrl terisi, jadi kalau suatu saat
    // gerbang /api/playly/video berubah bentuk balasannya, SELURUH baris
    // kontrol lenyap — video jalan tanpa satu tombol pun.
    await renderPemutar();

    expect(tombolMenu()).toBeTruthy();
    expect(tombolBerlabel("Layar penuh") ?? tombolBerlabel("Keluar layar penuh")).toBeTruthy();
  });

  it("SATU JALAN SAJA: Subtitle & Kecepatan TIDAK dinaikkan jadi tombol langsung", async () => {
    // Keputusan owner 2026-11-07, diambil sesudah melihat kedua versi di
    // layar: keduanya cukup di menu titik tiga. Ini membalik permintaan
    // 2026-09-28 (39be664) yang dulu menaikkan keduanya ke baris kontrol.
    //
    // Kenapa dijaga, bukan dibiarkan: menambahkan kembali tombol pintas itu
    // terasa seperti "perbaikan" bagi siapa pun yang tidak tahu sejarahnya,
    // dan hasilnya dua jalan ke pengaturan yang sama.
    await renderPemutar();

    expect(tombolBerlabel("Kecepatan")).toBeFalsy();
    expect(tombolBerlabel("Terjemahan")).toBeFalsy();
  });

  it("memilih kecepatan DARI MENU benar-benar menyetel playbackRate videonya", async () => {
    // Celah yang tidak tertutup tests/player-menu.test.ts: tes itu me-render
    // PlayerMenu sendirian dengan onPilih TIRUAN, jadi ia membuktikan menunya
    // memanggil sesuatu — bukan bahwa pilihan itu SAMPAI ke elemen video.
    // Sambungan yang putus di antara keduanya tidak menimbulkan error apa pun:
    // menu tetap menampilkan "1,5×" sementara videonya berjalan normal.
    await renderPemutar();

    const video = container.querySelector("video");
    expect(video).toBeTruthy();
    expect(video?.playbackRate).toBe(1);

    klik(tombolMenu());
    const barisKecepatan = semuaTombol().find((b) =>
      b.textContent?.includes("Kecepatan pemutar"),
    );
    klik(barisKecepatan);
    klik(semuaTombol().find((b) => b.textContent?.trim() === "1,5×"));

    expect(video?.playbackRate).toBe(1.5);
  });

  it("nilai kecepatan yang dipilih ikut terbaca di baris menunya", async () => {
    // Satu state, satu sumber bacaan: kalau baris menu suatu saat membaca
    // nilainya dari tempat lain, angka di layar bisa menyimpang dari kecepatan
    // video yang sebenarnya.
    await renderPemutar();

    klik(tombolMenu());
    // Halaman utama → submenu Kecepatan.
    klik(semuaTombol().find((b) => b.textContent?.includes("Kecepatan pemutar")));
    klik(semuaTombol().find((b) => b.textContent?.trim() === "2×"));

    // Memilih opsi SENGAJA tidak menutup submenu — penonton boleh mencoba
    // beberapa kecepatan berturut-turut. Jadi untuk membaca barisnya, kembali
    // dulu lewat judul halaman (KepalaLaman merangkap tombol Kembali).
    klik(semuaTombol().find((b) => b.textContent?.includes("Kecepatan pemutar")));

    const barisKecepatan = semuaTombol().find((b) =>
      b.textContent?.includes("Kecepatan pemutar"),
    );
    expect(barisKecepatan?.textContent).toContain("2×");
  });
});
