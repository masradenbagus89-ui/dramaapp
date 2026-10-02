// @vitest-environment jsdom
//
// Penjaga POPUP pilihan provider di pemutar Playly.
//
// ⚠️ BENTUKNYA DIBALIK 2026-09-30. Versi sebelumnya berkas ini justru MELARANG
// `fixed` ("panel digambar DI DALAM kotak keterangan, bukan sebagai jendela
// mengambang"). Owner memilih popup mengambang sesudah membandingkan keduanya
// langsung, jadi larangan itu diganti penjaga kebalikannya di bawah. Tes lama
// tidak dihapus diam-diam — ia dibalik, supaya sesi berikutnya tahu bentuk ini
// keputusan, bukan kelalaian.
//
// KENAPA diuji: seluruh nilai fitur ini ada di INTERAKSI dan di TUJUAN LINK —
// dua hal yang terlihat sempurna di tangkapan layar walau rusak.
//
// 1) BUKA/TUTUP. Popup yang terbuka sejak halaman dimuat menutupi video; popup
//    yang tidak bisa ditutup membuat penonton terjebak. TIGA jalan keluarnya
//    (× · klik area gelap · Escape) diuji satu-satu.
// 2) rel="noopener noreferrer". Tanpa `noopener`, situs provider yang dibuka
//    bisa menyetir tab DramaKu lewat `window.opener` — kerusakan yang tidak
//    memunculkan error apa pun.
// 3) PERILAKU LAMA. Video yang providernya belum diisi HARUS tetap memakai
//    jalur lamanya. Kalau hilang, itu kemunduran senyap untuk 46 video yang ada.
//
// JSX sengaja tidak dipakai (createElement langsung) supaya berkas ini tetap
// .ts dan cocok dengan `include` di vitest.config.ts — alasan yang sama dengan
// tests/playly-info-video.test.ts.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createElement as h, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import InfoVideoPlayly from "../app/components/player/InfoVideoPlayly";
import { labelTombolProvider } from "../app/components/unduhan-kelas";
import type { DownloadProvider } from "../lib/types";

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

const PROVIDERS: DownloadProvider[] = [
  { name: "Google Share", quality: "1080p", url: "https://drive.test/a" },
  { name: "Telegram", quality: "480p", url: "https://t.me/contoh/2" },
  // Tanpa kualitas — keadaan yang sah, tombolnya harus jadi "DOWNLOAD" polos.
  { name: "Sendcm", url: "https://sendcm.test/c" },
];

function pasang(providers?: DownloadProvider[]) {
  act(() =>
    root.render(
      h(InfoVideoPlayly, { title: "Video Uji", durationLabel: "12:00", providers }),
    ),
  );
}

/** Tombol DOWNLOAD utama di deretan tombol. */
function tombolDownload(): HTMLButtonElement {
  const b = Array.from(container.querySelectorAll("button")).find(
    (el) => el.textContent?.trim() === "DOWNLOAD",
  );
  if (!b) throw new Error("Tombol DOWNLOAD tidak ditemukan");
  return b as HTMLButtonElement;
}

function popup(): HTMLElement | null {
  return container.querySelector('[aria-label="Pilih provider download"]');
}

/**
 * Lapisan gelap di belakang popup — induk langsung kotaknya. Diambil dari
 * `popup()` supaya tes tidak bergantung pada kelas CSS tertentu untuk
 * MENEMUKANNYA (kelasnya justru yang sedang diuji di salah satu tes).
 */
function lapisGelap(): HTMLElement {
  const l = popup()?.parentElement;
  if (!l) throw new Error("Lapisan gelap popup tidak ditemukan");
  return l;
}

function klik(el: Element) {
  act(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

describe("Popup provider — buka & tutup", () => {
  it("TERTUTUP saat kotak pertama digambar", () => {
    pasang(PROVIDERS);
    expect(popup()).toBeNull();
    expect(tombolDownload().getAttribute("aria-expanded")).toBe("false");
  });

  it("klik DOWNLOAD membuka popup", () => {
    pasang(PROVIDERS);
    klik(tombolDownload());
    expect(popup()).not.toBeNull();
    expect(tombolDownload().getAttribute("aria-expanded")).toBe("true");
  });

  it("klik DOWNLOAD lagi menutupnya", () => {
    pasang(PROVIDERS);
    klik(tombolDownload());
    klik(tombolDownload());
    expect(popup()).toBeNull();
  });

  it("tombol × menutupnya", () => {
    pasang(PROVIDERS);
    klik(tombolDownload());
    const tutup = container.querySelector('[aria-label="Tutup"]');
    expect(tutup).not.toBeNull();
    klik(tutup!);
    expect(popup()).toBeNull();
  });

  it("Escape menutupnya", () => {
    pasang(PROVIDERS);
    klik(tombolDownload());
    expect(popup()).not.toBeNull();
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(popup()).toBeNull();
  });

  it("klik area gelap di luar kotak menutupnya", () => {
    pasang(PROVIDERS);
    klik(tombolDownload());
    klik(lapisGelap());
    expect(popup()).toBeNull();
  });

  it("klik DI DALAM kotak TIDAK menutupnya", () => {
    // Tanpa penjaga `stopPropagation`, klik tombol provider pun ikut menutup
    // popup sebelum tautannya sempat terbuka — kerusakan yang cuma terlihat
    // saat benar-benar dicoba, bukan di tangkapan layar.
    pasang(PROVIDERS);
    klik(tombolDownload());
    klik(popup()!.querySelector("tbody a")!);
    expect(popup()).not.toBeNull();
  });

  it("digambar sebagai jendela MENGAMBANG di luar kotak keterangan", () => {
    // ⚠️ Tes ini DIBALIK 2026-09-30 (lihat catatan di kepala berkas). Yang
    // dikunci sekarang: popup bukan anak <section> kotak putih, dan lapisan
    // luarnya memakai `fixed inset-0`. Bersarang di dalam kotak, popupnya
    // berisiko terkurung stacking context induk lalu tergambar di BELAKANG
    // pemutar — gagal tanpa error, cuma "tombolnya tidak berfungsi".
    pasang(PROVIDERS);
    klik(tombolDownload());
    const p = popup()!;
    expect(container.querySelector("section")!.contains(p)).toBe(false);
    expect(lapisGelap().className).toContain("fixed");
    expect(lapisGelap().className).toContain("inset-0");
  });

  it("memberi tahu pembaca layar bahwa ini jendela, bukan isi halaman", () => {
    pasang(PROVIDERS);
    expect(tombolDownload().getAttribute("aria-haspopup")).toBe("dialog");
    klik(tombolDownload());
    expect(popup()!.getAttribute("role")).toBe("dialog");
    expect(popup()!.getAttribute("aria-modal")).toBe("true");
  });
});

describe("Popup provider — isi tabel", () => {
  beforeEach(() => {
    pasang(PROVIDERS);
    klik(tombolDownload());
  });

  it("berjudul 'Pilih provider download' dengan kolom PROVIDER & DOWNLOAD", () => {
    const teks = popup()!.textContent ?? "";
    expect(teks).toContain("Pilih provider download");
    const kolom = Array.from(popup()!.querySelectorAll("th")).map((th) =>
      th.textContent?.trim(),
    );
    expect(kolom).toEqual(["Provider", "Download"]);
  });

  it("menampilkan tiap nama provider apa adanya", () => {
    const nama = Array.from(popup()!.querySelectorAll("tbody td:first-child")).map(
      (td) => td.textContent?.trim(),
    );
    expect(nama).toEqual(["Google Share", "Telegram", "Sendcm"]);
  });

  it("tombol memakai kualitas video ini, dan 'DOWNLOAD' polos saat belum diketahui", () => {
    const label = Array.from(popup()!.querySelectorAll("tbody a")).map((a) =>
      a.textContent?.trim(),
    );
    expect(label).toEqual(["DOWNLOAD 1080p", "DOWNLOAD 480p", "DOWNLOAD"]);
  });

  it("tiap tombol menuju alamat providernya sendiri", () => {
    const href = Array.from(popup()!.querySelectorAll("tbody a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(href).toEqual([
      "https://drive.test/a",
      "https://t.me/contoh/2",
      "https://sendcm.test/c",
    ]);
  });

  it("tab baru dibuka dengan rel='noopener noreferrer'", () => {
    for (const a of Array.from(popup()!.querySelectorAll("tbody a"))) {
      expect(a.getAttribute("target")).toBe("_blank");
      expect(a.getAttribute("rel")).toBe("noopener noreferrer");
    }
  });

  it("TIDAK memasang atribut download (diabaikan browser untuk beda domain)", () => {
    for (const a of Array.from(popup()!.querySelectorAll("tbody a"))) {
      expect(a.hasAttribute("download")).toBe(false);
    }
  });
});

describe("Popup provider — video yang BELUM punya link", () => {
  it("tombol DOWNLOAD tidak membuka popup apa pun", () => {
    pasang([]);
    klik(tombolDownload());
    expect(popup()).toBeNull();
  });

  it("tombolnya TETAP ada (bukan dihilangkan) dan memakai jalur lamanya", () => {
    let dipanggil = 0;
    act(() =>
      root.render(
        h(InfoVideoPlayly, {
          title: "Video Uji",
          onDownload: () => {
            dipanggil++;
          },
        }),
      ),
    );
    klik(tombolDownload());
    expect(dipanggil).toBe(1);
    expect(popup()).toBeNull();
  });

  it("props providers yang tidak dikirim sama sekali = perilaku lama", () => {
    pasang(undefined);
    expect(tombolDownload()).toBeTruthy();
    expect(tombolDownload().hasAttribute("aria-expanded")).toBe(false);
  });
});

describe("Popup provider — aksi lain di kotak tidak rusak", () => {
  // ⚠️ MAKNANYA BERGESER 2026-09-30. Versi panel inline menguji "Simpan tetap
  // bisa ditekan SAAT panel terbuka". Dengan popup `aria-modal="true"` itu
  // justru SALAH: selama jendela terbuka, isi di belakangnya memang tidak
  // boleh dioperasikan. Yang benar untuk dijaga sekarang: tombolnya tidak
  // HILANG, dan kembali berfungsi sesudah popup ditutup.
  const cariTombol = (awalan: string) =>
    Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.trim().startsWith(awalan),
    );

  it("Simpan & Bagikan tidak hilang gara-gara popup dipasang", () => {
    pasang(PROVIDERS);
    expect(cariTombol("Simpan")).toBeTruthy();
    expect(container.textContent ?? "").toContain("Bagikan");
  });

  it("Simpan kembali berfungsi sesudah popup ditutup", () => {
    pasang(PROVIDERS);
    klik(tombolDownload());
    klik(lapisGelap());
    expect(popup()).toBeNull();

    klik(cariTombol("Simpan")!);
    expect(cariTombol("Tersimpan")).toBeTruthy();
  });

  it("membuka popup TIDAK ikut mengubah keadaan tombol Simpan", () => {
    // Popup dan tombol Simpan memakai state terpisah; kalau suatu saat
    // keduanya tertukar, "Tersimpan" akan menyala sendiri tanpa ada yang
    // menekannya — kerusakan senyap yang tak ada yang melapor.
    pasang(PROVIDERS);
    klik(tombolDownload());
    expect(cariTombol("Tersimpan")).toBeUndefined();
    expect(cariTombol("Simpan")).toBeTruthy();
  });
});

describe("labelTombolProvider — aturan label kualitas", () => {
  it("kualitas terisi -> ikut ditulis", () => {
    expect(labelTombolProvider("720p")).toBe("DOWNLOAD 720p");
  });

  it("kualitas kosong/undefined -> 'DOWNLOAD' polos, BUKAN tebakan", () => {
    expect(labelTombolProvider(undefined)).toBe("DOWNLOAD");
    expect(labelTombolProvider("")).toBe("DOWNLOAD");
  });
});
