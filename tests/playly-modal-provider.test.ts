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
// 3) ISI per KASUS (owner 2026-10-05): link lengkap, sebagian (baris/tombol
//    yang tak ada linknya disembunyikan), dan kosong ("Link unduhan belum
//    tersedia" — menggantikan kotak peringatan browser yang dulu dipakai).
//
// JSX sengaja tidak dipakai (createElement langsung) supaya berkas ini tetap
// .ts dan cocok dengan `include` di vitest.config.ts — alasan yang sama dengan
// tests/playly-info-video.test.ts.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createElement as h, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import InfoVideoPlayly from "../app/components/player/InfoVideoPlayly";
import { labelTombolProvider } from "../app/components/unduhan-kelas";
import type { LinkUnduhanPublik } from "../lib/playly-unduhan";

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

/** LENGKAP: 4 provider × 2 kualitas, sengaja diacak urutannya. */
const LENGKAP: LinkUnduhanPublik[] = (["mega", "cast", "telegram", "google"] as const).flatMap(
  (provider) =>
    (["480p", "1080p"] as const).map((quality) => ({
      provider,
      quality,
      url: `https://${provider}.contoh/${quality}`,
    })),
);

/** SEBAGIAN: Telegram cuma 480p, Mega cuma 1080p; Google & Cast tak punya link. */
const SEBAGIAN: LinkUnduhanPublik[] = [
  { provider: "mega", quality: "1080p", url: "https://mega.nz/file/a" },
  { provider: "telegram", quality: "480p", url: "https://t.me/contoh/2" },
];

function pasang(linkUnduhan?: LinkUnduhanPublik[]) {
  act(() =>
    root.render(
      h(InfoVideoPlayly, { title: "Video Uji", durationLabel: "12:00", linkUnduhan }),
    ),
  );
}

/** [label provider, label tombol...] per baris tabel. */
function isiTabel(): string[][] {
  return Array.from(popup()!.querySelectorAll("tbody tr")).map((tr) => [
    tr.querySelector("td")!.textContent!.trim(),
    ...Array.from(tr.querySelectorAll("a")).map((a) => a.textContent!.trim()),
  ]);
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
    pasang(LENGKAP);
    expect(popup()).toBeNull();
    expect(tombolDownload().getAttribute("aria-expanded")).toBe("false");
  });

  it("klik DOWNLOAD membuka popup", () => {
    pasang(LENGKAP);
    klik(tombolDownload());
    expect(popup()).not.toBeNull();
    expect(tombolDownload().getAttribute("aria-expanded")).toBe("true");
  });

  it("klik DOWNLOAD lagi menutupnya", () => {
    pasang(LENGKAP);
    klik(tombolDownload());
    klik(tombolDownload());
    expect(popup()).toBeNull();
  });

  it("tombol × menutupnya", () => {
    pasang(LENGKAP);
    klik(tombolDownload());
    const tutup = container.querySelector('[aria-label="Tutup"]');
    expect(tutup).not.toBeNull();
    klik(tutup!);
    expect(popup()).toBeNull();
  });

  it("Escape menutupnya", () => {
    pasang(LENGKAP);
    klik(tombolDownload());
    expect(popup()).not.toBeNull();
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(popup()).toBeNull();
  });

  it("klik area gelap di luar kotak menutupnya", () => {
    pasang(LENGKAP);
    klik(tombolDownload());
    klik(lapisGelap());
    expect(popup()).toBeNull();
  });

  it("klik DI DALAM kotak TIDAK menutupnya", () => {
    // Tanpa penjaga `stopPropagation`, klik tombol provider pun ikut menutup
    // popup sebelum tautannya sempat terbuka — kerusakan yang cuma terlihat
    // saat benar-benar dicoba, bukan di tangkapan layar.
    pasang(LENGKAP);
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
    pasang(LENGKAP);
    klik(tombolDownload());
    const p = popup()!;
    expect(container.querySelector("section")!.contains(p)).toBe(false);
    expect(lapisGelap().className).toContain("fixed");
    expect(lapisGelap().className).toContain("inset-0");
  });

  it("memberi tahu pembaca layar bahwa ini jendela, bukan isi halaman", () => {
    pasang(LENGKAP);
    expect(tombolDownload().getAttribute("aria-haspopup")).toBe("dialog");
    klik(tombolDownload());
    expect(popup()!.getAttribute("role")).toBe("dialog");
    expect(popup()!.getAttribute("aria-modal")).toBe("true");
  });
});

describe("Popup provider — link LENGKAP", () => {
  beforeEach(() => {
    pasang(LENGKAP);
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

  it("satu baris per provider (urutan tetap), satu tombol per kualitas", () => {
    expect(isiTabel()).toEqual([
      ["Google Share", "1080p", "480p"],
      ["Telegram", "1080p", "480p"],
      ["Cast", "1080p", "480p"],
      ["Mega", "1080p", "480p"],
    ]);
  });

  it("tiap tombol menuju alamat provider × kualitasnya sendiri", () => {
    const baris = popup()!.querySelectorAll("tbody tr")[3];
    const href = Array.from(baris.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(href).toEqual(["https://mega.contoh/1080p", "https://mega.contoh/480p"]);
  });

  it("tab baru dibuka dengan rel='noopener noreferrer'", () => {
    const semua = Array.from(popup()!.querySelectorAll("tbody a"));
    expect(semua).toHaveLength(8);
    for (const a of semua) {
      expect(a.getAttribute("target")).toBe("_blank");
      expect(a.getAttribute("rel")).toBe("noopener noreferrer");
    }
  });

  it("TIDAK memasang atribut download (diabaikan browser untuk beda domain)", () => {
    for (const a of Array.from(popup()!.querySelectorAll("tbody a"))) {
      expect(a.hasAttribute("download")).toBe(false);
    }
  });

  it("isi popup bisa digulir di DALAM kotak (layar HP pendek)", () => {
    expect(popup()!.className).toContain("max-h-");
    expect(popup()!.querySelector(".overflow-y-auto")).not.toBeNull();
  });
});

describe("Popup provider — link SEBAGIAN", () => {
  it("provider tanpa link tak punya baris; kualitas tanpa link tak punya tombol", () => {
    pasang(SEBAGIAN);
    klik(tombolDownload());
    expect(isiTabel()).toEqual([
      ["Telegram", "480p"],
      ["Mega", "1080p"],
    ]);
    expect(popup()!.textContent).not.toContain("belum tersedia");
  });
});

describe("Popup provider — video yang BELUM punya link (KOSONG)", () => {
  it("DOWNLOAD tetap membuka popup, isinya 'Link unduhan belum tersedia'", () => {
    pasang([]);
    klik(tombolDownload());
    expect(popup()).not.toBeNull();
    expect(popup()!.textContent).toContain("Link unduhan belum tersedia");
    expect(popup()!.querySelector("table")).toBeNull();
  });

  it("props linkUnduhan yang tidak dikirim sama sekali = sama dengan kosong", () => {
    pasang(undefined);
    expect(tombolDownload().getAttribute("aria-haspopup")).toBe("dialog");
    klik(tombolDownload());
    expect(popup()!.textContent).toContain("Link unduhan belum tersedia");
  });

  it("popup kosong tetap bisa ditutup dengan × dan Escape", () => {
    pasang([]);
    klik(tombolDownload());
    klik(container.querySelector('[aria-label="Tutup"]')!);
    expect(popup()).toBeNull();
    klik(tombolDownload());
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(popup()).toBeNull();
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
    pasang(LENGKAP);
    expect(cariTombol("Simpan")).toBeTruthy();
    expect(container.textContent ?? "").toContain("Bagikan");
  });

  it("Simpan kembali berfungsi sesudah popup ditutup", () => {
    pasang(LENGKAP);
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
    pasang(LENGKAP);
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
