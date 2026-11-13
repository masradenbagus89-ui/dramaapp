// @vitest-environment jsdom
// Penjaga kolom cari kategori (app/components/admin/PilihKategori.tsx).
//
// KENAPA ADA: komponen ini menggantikan <select> bawaan browser, dan begitu
// kita mengganti alat bawaan dengan buatan sendiri, SELURUH perilaku yang dulu
// gratis jadi tanggung jawab kita — keyboard, menutup saat klik di luar, dan
// daftar kosong yang tetap bersuara. Ketiganya rusak SENYAP: tidak ada error,
// kotaknya cuma berhenti bisa dipakai dengan cara tertentu.
import { describe, it, expect, afterEach, vi } from "vitest";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import PilihKategori from "../app/components/admin/PilihKategori";
import { KATEGORI_ISI } from "../lib/types";
import { labelGenre } from "../lib/genre";
import { diawaliKetikan } from "../lib/pencarian";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

async function render(props: Record<string, unknown>) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(createElement(PilihKategori, props as never));
  });
  return container;
}

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  container?.remove();
  root = null;
  container = null;
});

/** Tombol pembuka (role combobox). */
function tombol(): HTMLButtonElement {
  return container!.querySelector('[role="combobox"]') as HTMLButtonElement;
}

function kotakKetik(): HTMLInputElement | null {
  return container!.querySelector("input");
}

/** Teks tiap baris pilihan yang sedang tergambar. */
function opsi(): string[] {
  return [...container!.querySelectorAll('[role="option"]')].map((e) =>
    (e.textContent ?? "").trim(),
  );
}

async function klik(el: Element) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

async function ketik(teks: string) {
  const input = kotakKetik()!;
  await act(async () => {
    // Setter asli dipakai supaya React melihat perubahannya — menyetel
    // `.value` langsung tidak memicu onChange di React.
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )!.set!;
    setter.call(input, teks);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function tekan(key: string) {
  await act(async () => {
    kotakKetik()!.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true }),
    );
  });
}

describe("PilihKategori — tertutup", () => {
  it("menampilkan nilai terpilih, bukan daftar", async () => {
    await render({ nilai: "Horror", onPilih: vi.fn(), label: "Kategori" });
    expect(tombol().textContent).toContain("Horror");
    expect(opsi()).toHaveLength(0);
  });

  it("nilai kosong tampil sebagai teks bawaan", async () => {
    await render({ nilai: "", onPilih: vi.fn(), label: "Kategori" });
    expect(tombol().textContent).toContain("Tanpa kategori");
  });

  it("teksKosong bisa diganti — 'tidak diubah' BUKAN 'tanpa kategori'", async () => {
    // Di kotak borongan, string kosong berarti "jangan sentuh kolom ini".
    // Memakai teks yang sama dengan kotak per-baris akan membuat tombolnya
    // berbohong tentang apa yang terjadi saat ditekan.
    await render({
      nilai: "",
      onPilih: vi.fn(),
      label: "Borongan",
      teksKosong: "— tidak diubah —",
    });
    expect(tombol().textContent).toContain("— tidak diubah —");
    expect(tombol().textContent).not.toContain("Tanpa kategori");
  });
});

describe("PilihKategori — dibuka", () => {
  it("menawarkan SELURUH kategori + baris mengosongkan", async () => {
    await render({ nilai: "", onPilih: vi.fn(), label: "Kategori" });
    await klik(tombol());
    // +1 untuk baris "Tanpa kategori". Dihitung dari KATEGORI_ISI, bukan
    // angka tetap: begitu owner menambah kategori lagi, tes ini ikut.
    expect(opsi()).toHaveLength(KATEGORI_ISI.length + 1);
  });

  it("memberi kotak ketik yang siap diisi", async () => {
    await render({ nilai: "", onPilih: vi.fn(), label: "Kategori" });
    await klik(tombol());
    expect(kotakKetik()).toBeTruthy();
  });
});

describe("PilihKategori — PREFIX SEARCH", () => {
  it("menyaring dari AWAL kata", async () => {
    await render({ nilai: "", onPilih: vi.fn(), label: "Kategori" });
    await klik(tombol());
    await ketik("hor");
    expect(opsi().join(" ")).toContain("Horror");
    expect(opsi().join(" ")).not.toContain("Thriller");
  });

  it("potongan TENGAH kata tidak memulangkan apa-apa", async () => {
    // Pembeda prefix search dari pencocokan bebas. Kalau baris ini hijau
    // dengan "orror" ikut menemukan Horror, berarti aturannya diam-diam
    // kembali ke `includes` mentah.
    await render({ nilai: "", onPilih: vi.fn(), label: "Kategori" });
    await klik(tombol());
    await ketik("orror");
    expect(opsi().join(" ")).not.toContain("Horror");
  });

  it("label Indonesia TIDAK ikut dicari — yang tampil harus cocok", async () => {
    // Owner 2026-11-13: "begitu ketik ro, yang muncul pun harus ro".
    // Label Indonesia sempat ikut dicari, dan itu membuat "ro" memunculkan
    // "Historical Romance" (labelnya "Romansa Sejarah"). Di layar barisnya
    // terbaca diawali "Hi" — daftar yang tak terlihat nyambung dengan
    // ketikan terbaca seperti pencarian rusak.
    //
    // Harganya, dan ini memang disengaja: "horor" tak lagi menemukan
    // "Horror". Yang menemukan cuma "hor" — potongan dari nama yang tampil.
    await render({ nilai: "", onPilih: vi.fn(), label: "Kategori" });
    await klik(tombol());
    await ketik("horor");
    expect(opsi()).toHaveLength(0);
  });

  it("'ro' TIDAK memunculkan Historical Romance — keluhan asli owner", async () => {
    // Patokannya persis baris yang owner tunjuk di gambarnya.
    await render({ nilai: "", onPilih: vi.fn(), label: "Kategori" });
    await klik(tombol());
    await ketik("ro");

    const nama = opsi().join(" ");
    expect(nama).toContain("Romance");
    expect(nama).toContain("Romantic Comedy");
    expect(nama).toContain("Road Trip");
    expect(nama).not.toContain("Historical Romance");
  });

  it("ketik 's' HANYA memunculkan yang namanya berawalan s", async () => {
    // Keluhan owner 2026-11-13: "saya mau ketika ketik s muncul semua yang
    // berawalan s". Sebelum diperbaiki, kolom ini memakai aturan pencarian
    // JUDUL FILM yang mengizinkan tiap kata jadi titik awal — jadi "s" ikut
    // memunculkan "Talk-Show" dan "Game-Show" (kata keduanya diawali s,
    // namanya tidak). Keduanya dijadikan patokan di sini justru karena
    // merekalah yang dulu salah muncul.
    await render({ nilai: "", onPilih: vi.fn(), label: "Kategori" });
    await klik(tombol());
    await ketik("s");

    const nama = opsi();
    expect(nama.length).toBeGreaterThan(0);
    expect(nama.join(" ")).toContain("Sci-Fi");
    expect(nama.join(" ")).toContain("Sport");
    expect(nama.join(" ")).not.toContain("Talk-Show");
    expect(nama.join(" ")).not.toContain("Game-Show");
  });

  it("tiap baris hasil benar-benar diawali ketikan, tak ada yang menyelinap", () => {
    // Versi menyeluruh dari tes di atas: bukan cuma dua nama yang dicek,
    // tapi SELURUH kategori diuji terhadap aturannya. Kalau suatu saat
    // aturannya dilonggarkan, baris ini menyebut persis nama yang bocor.
    for (const huruf of ["s", "m", "d", "w"]) {
      const bocor = KATEGORI_ISI.filter(
        (k) => diawaliKetikan(huruf, k) && !k.toLowerCase().startsWith(huruf),
      );
      expect(bocor, `ketik "${huruf}" memunculkan nama yang tidak diawali itu`).toEqual([]);
    }
  });

  it("ketikan tanpa hasil tetap BERSUARA, bukan panel kosong", async () => {
    // Panel yang tiba-tiba kosong terbaca seperti komponennya rusak.
    await render({ nilai: "", onPilih: vi.fn(), label: "Kategori" });
    await klik(tombol());
    await ketik("zzzz");
    expect(opsi()).toHaveLength(0);
    expect(container!.textContent).toContain("Tidak ada genre");
  });
});

describe("PilihKategori — memilih", () => {
  it("klik baris memulangkan nilai TERSIMPAN (Inggris), bukan labelnya", async () => {
    // Yang masuk database harus "Horror". Kalau yang terkirim label
    // Indonesianya ("Horor"), parseKategoriVideo menolaknya dan kategorinya
    // diam-diam jadi kosong — rusak tanpa satu pun error.
    const onPilih = vi.fn();
    await render({ nilai: "", onPilih, label: "Kategori" });
    await klik(tombol());
    await ketik("horror");
    await klik(container!.querySelector('[role="option"]')!);
    expect(onPilih).toHaveBeenCalledWith("Horror");
  });

  it("Enter memilih baris yang sedang disorot", async () => {
    const onPilih = vi.fn();
    await render({ nilai: "", onPilih, label: "Kategori" });
    await klik(tombol());
    await ketik("hor");
    await tekan("Enter");
    expect(onPilih).toHaveBeenCalledWith("Horror");
  });

  it("panah bawah memindah sorotan sebelum Enter", async () => {
    const onPilih = vi.fn();
    await render({ nilai: "", onPilih, label: "Kategori" });
    await klik(tombol());
    // Tanpa ketikan: baris 0 = "Tanpa kategori", baris 1 = kategori pertama.
    await tekan("ArrowDown");
    await tekan("Enter");
    expect(onPilih).toHaveBeenCalledWith(KATEGORI_ISI[0]);
  });

  it("Enter saat NOL hasil tidak memilih apa pun", async () => {
    // Dulu sumber bug senyap: sorot tertinggal di indeks yang sudah tidak
    // ada, lalu Enter mengirim `undefined` ke penyimpanan.
    const onPilih = vi.fn();
    await render({ nilai: "", onPilih, label: "Kategori" });
    await klik(tombol());
    await ketik("zzzz");
    await tekan("Enter");
    expect(onPilih).not.toHaveBeenCalled();
  });

  it("Escape menutup tanpa mengubah apa pun", async () => {
    const onPilih = vi.fn();
    await render({ nilai: "Horror", onPilih, label: "Kategori" });
    await klik(tombol());
    await tekan("Escape");
    expect(opsi()).toHaveLength(0);
    expect(onPilih).not.toHaveBeenCalled();
  });

  it("klik di LUAR menutup panel", async () => {
    await render({ nilai: "", onPilih: vi.fn(), label: "Kategori" });
    await klik(tombol());
    expect(opsi().length).toBeGreaterThan(0);
    await act(async () => {
      document.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    });
    expect(opsi()).toHaveLength(0);
  });
});

describe("PilihKategori — dimatikan", () => {
  it("tidak bisa dibuka saat disabled", async () => {
    // Dipakai saat barisnya sedang menyimpan ke server. Membiarkannya terbuka
    // mengundang pilihan kedua yang membalap penyimpanan pertama.
    await render({
      nilai: "",
      onPilih: vi.fn(),
      label: "Kategori",
      disabled: true,
    });
    await klik(tombol());
    expect(opsi()).toHaveLength(0);
  });
});
