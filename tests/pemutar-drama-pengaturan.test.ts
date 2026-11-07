// @vitest-environment jsdom
//
// Penjaga untuk menu PENGATURAN pemutar drama berepisode (PlayerSettings),
// dipasang 2026-11-07.
//
// KENAPA BERKAS INI ADA: sampai hari ini `PlayerSettings` tidak disebut oleh
// satu pun tes — nol. Itu celah yang sama persis dengan yang baru terbukti
// memakan korban di pemutar Playly hari ini: dua tombol langsung di
// `PlaylyPlayer` bisa dihapus dengan 2.040 tes tetap hijau, karena tak ada
// yang me-render komponennya (lihat tests/pemutar-playly-kontrol.test.ts
// dan HANDOFF seksi 2026-11-07). Menu ini dipakai pemutar episode drama —
// jalur tontonan UTAMA situs — jadi celahnya lebih mahal, bukan lebih murah.
//
// Yang dijaga di sini sengaja dipilih dari hal yang kalau rusak TIDAK
// mengeluarkan error apa pun; tata letak dan warna sengaja TIDAK diuji
// (itu berubah sah tiap kali owner minta perapian tampilan).
//
// JSX sengaja tidak dipakai (createElement langsung) supaya berkas ini tetap
// .ts dan cocok dengan `include` di vitest.config.ts — alasan yang sama
// dengan tests/player-menu.test.ts.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createElement as h, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import PlayerSettings, {
  type PlayerSettingsProps,
} from "../app/components/player/PlayerSettings";
import { OFF } from "../lib/subtitles";

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

/** Props lengkap dengan aksi tiruan; tiap tes menimpa yang ia perlukan saja. */
function propsDasar(timpa: Partial<PlayerSettingsProps> = {}): PlayerSettingsProps {
  return {
    open: true,
    speed: 1,
    resolution: "",
    subtitles: [],
    subLang: OFF,
    isFullscreen: false,
    onToggle: vi.fn(),
    onSpeed: vi.fn(),
    onResolution: vi.fn(),
    onSubtitle: vi.fn(),
    onDownload: vi.fn(),
    onToggleFullscreen: vi.fn(),
    ...timpa,
  };
}

function render(props: PlayerSettingsProps) {
  act(() => {
    root.render(h(PlayerSettings, props));
  });
}

function klik(el: Element | null | undefined) {
  if (!el) throw new Error("Elemen yang mau diklik tidak ditemukan.");
  act(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

const semuaTombol = () => Array.from(container.querySelectorAll("button"));

/** Cari tombol dari teks yang betul-betul dibaca penonton. */
function tombolBerteks(teks: string): HTMLButtonElement | undefined {
  return semuaTombol().find((b) => b.textContent?.trim() === teks);
}

const tombolPengaturan = () =>
  container.querySelector<HTMLButtonElement>('[aria-label="Pengaturan"]');

describe("PlayerSettings — menu pengaturan pemutar drama", () => {
  it("isi menu TERSEMBUNYI saat open=false, dan tombol pengaturannya tetap ada", () => {
    render(propsDasar({ open: false }));

    // Tombolnya harus tetap digambar — kalau ikut hilang, penonton tak punya
    // jalan membuka pengaturan sama sekali.
    expect(tombolPengaturan()).toBeTruthy();
    expect(container.textContent).not.toContain("Resolusi");
  });

  it("tombol pengaturan melaporkan ke PEMANGGIL, tidak menyimpan keadaan sendiri", () => {
    // `open` datang dari pemutar (PlayerControls), bukan dari state di dalam
    // komponen ini. Kalau suatu saat ada yang memberinya state sendiri, akan
    // ada DUA sumber kebenaran untuk "menu terbuka atau tidak" dan keduanya
    // bisa menyimpang — tanpa error apa pun.
    const onToggle = vi.fn();
    render(propsDasar({ open: false, onToggle }));

    klik(tombolPengaturan());
    expect(onToggle).toHaveBeenCalledTimes(1);
    // Masih tertutup: yang membuka adalah pemanggil lewat prop, bukan klik ini.
    expect(container.textContent).not.toContain("Resolusi");
  });

  it("KELIMA pilihan kecepatan ada, dan nilainya dikirim sebagai ANGKA", () => {
    const onSpeed = vi.fn();
    render(propsDasar({ onSpeed }));

    for (const label of ["0.5×", "1×", "1.25×", "1.5×", "2×"]) {
      expect(tombolBerteks(label)).toBeTruthy();
    }

    klik(tombolBerteks("1.5×"));
    // Angka, BUKAN string "1.5": video.playbackRate menolak teks, dan
    // kerusakannya tidak kelihatan sampai ada yang benar-benar memutar video.
    expect(onSpeed).toHaveBeenCalledWith(1.5);
  });

  it('PENJAGA POLA BERKAS: pilihan "Asli" mengirim string KOSONG, bukan kata', () => {
    // Resolusi dipakai menyusun nama berkas di PC backup: `<ep>.<res>.mp4`
    // (mis. `1.720p.mp4`), dan "" berarti berkas aslinya `1.mp4`. Kalau nilai
    // ini diganti jadi "asli"/"original" supaya "lebih rapi", pemutar akan
    // mencari `1.asli.mp4` yang tidak pernah ada — video gagal diputar, dan
    // tak ada satu pun pesan yang menyebut sebabnya.
    const onResolution = vi.fn();
    render(propsDasar({ onResolution }));

    for (const label of ["Asli", "1080p", "720p", "480p", "360p"]) {
      expect(tombolBerteks(label)).toBeTruthy();
    }

    klik(tombolBerteks("Asli"));
    expect(onResolution).toHaveBeenCalledWith("");

    klik(tombolBerteks("720p"));
    expect(onResolution).toHaveBeenCalledWith("720p");
  });

  it("blok Subtitle TIDAK digambar kalau episodenya tidak punya subtitle", () => {
    // Sengaja disembunyikan, bukan ditampilkan kosong: daftar pilihan hampa
    // terbaca seperti fitur yang rusak.
    render(propsDasar({ subtitles: [] }));

    expect(container.textContent).not.toContain("Subtitle");
    expect(tombolBerteks("Mati")).toBeFalsy();
  });

  it("subtitle tersedia: tiap bahasa tergambar dengan NAMA bahasanya + ada pilihan Mati", () => {
    const onSubtitle = vi.fn();
    render(propsDasar({ subtitles: ["id", "en"], onSubtitle }));

    // Nama bahasa, bukan kode mentah — "id"/"en" di layar tidak terbaca
    // penonton sebagai Indonesia/English.
    expect(tombolBerteks("Indonesia")).toBeTruthy();
    expect(tombolBerteks("English")).toBeTruthy();
    expect(tombolBerteks("Mati")).toBeTruthy();

    klik(tombolBerteks("Indonesia"));
    expect(onSubtitle).toHaveBeenCalledWith("id");

    klik(tombolBerteks("Mati"));
    expect(onSubtitle).toHaveBeenCalledWith(OFF);
  });

  it("tombol Unduh & Layar penuh benar-benar memanggil aksinya", () => {
    // Tombol yang tergambar rapi tapi tidak memanggil apa pun terlihat
    // sempurna di layar dan tetap tidak berguna.
    const onDownload = vi.fn();
    const onToggleFullscreen = vi.fn();
    render(propsDasar({ onDownload, onToggleFullscreen }));

    klik(tombolBerteks("Unduh"));
    expect(onDownload).toHaveBeenCalledTimes(1);

    klik(tombolBerteks("Layar penuh"));
    expect(onToggleFullscreen).toHaveBeenCalledTimes(1);
  });

  it("label layar penuh ikut keadaan: 'Keluar' saat sedang layar penuh", () => {
    render(propsDasar({ isFullscreen: true }));

    expect(tombolBerteks("Keluar")).toBeTruthy();
    expect(tombolBerteks("Layar penuh")).toBeFalsy();
  });
});
