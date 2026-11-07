// @vitest-environment jsdom
//
// Penjaga untuk SARAN-SAAT-MENGETIK di kotak cari (owner 2026-11-07: "aku juga
// mau ketika kita sedang mengetik akan muncul pilihan").
//
// Dua lapis diuji: ATURANNYA (lib/saran-cari.ts, murni) dan PERILAKUNYA di
// layar (SearchBar me-render daftarnya + papan ketik). Aturan yang benar tapi
// tak pernah tergambar sama tak bergunanya dengan daftar yang tergambar tapi
// isinya salah.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createElement as h, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  MAKS_SARAN,
  MIN_HURUF_SARAN,
  pilihSaran,
  rakitIndeksSaran,
  type SaranCari,
} from "../lib/saran-cari";
import type { Drama } from "../lib/types";

const dorong = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: dorong, replace: () => {}, refresh: () => {}, back: () => {} }),
}));

import SearchBar from "../app/components/beranda/SearchBar";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/** Drama seadanya — hanya field yang dipakai indeks yang berarti di sini. */
function drama(id: string, title: string, year?: string): Drama {
  return {
    id,
    title,
    // "Action", bukan "Aksi": `Category` memakai nama Inggris di DATA, dan
    // label Indonesianya dirakit terpisah (lib/genre.ts). Salah di sini
    // ketahuan hanya lewat `npm run build` — vitest tidak memeriksa tipe.
    category: "Action",
    episodes: 10,
    views: "1K",
    synopsis: "sinopsis",
    gradient: "",
    year,
  };
}

describe("rakitIndeksSaran — alamat tiap judul", () => {
  it("drama memakai /drama/<id>", () => {
    const [s] = rakitIndeksSaran([drama("d1", "Naga Terakhir", "2024")]);
    expect(s.href).toBe("/drama/d1");
    expect(s.judul).toBe("Naga Terakhir");
    expect(s.tahun).toBe("2024");
  });

  it("video Playly TIDAK memakai /drama/ — itu akan mendarat di 404", () => {
    // 🪤 Inilah kesalahan paling mudah dibuat di fitur ini: dua sumber judul
    // yang bentuk datanya mirip, tapi alamatnya beda. Saran yang diklik lalu
    // membuka halaman kosong lebih buruk daripada tidak ada saran.
    const [s] = rakitIndeksSaran([], [
      { id: "99", title: "Kota Hujan", year: "2023", thumbnail: "x.jpg" },
    ]);
    expect(s.href).not.toContain("/drama/");
    expect(s.href).toContain("/tonton/");
    expect(s.href).toContain("99");
  });

  it("tahun & poster yang kosong tidak jadi string kosong", () => {
    // `""` di poster membuat <Image src=""> yang di sebagian browser memicu
    // permintaan ke halaman itu sendiri; `undefined` membuat kotaknya polos.
    const [s] = rakitIndeksSaran([], [
      { id: "1", title: "Tanpa Data", year: null, thumbnail: null },
    ]);
    expect(s.tahun).toBeUndefined();
    expect(s.poster).toBeUndefined();
  });
});

describe("pilihSaran — aturan memilih baris", () => {
  const indeks = rakitIndeksSaran([
    drama("a", "Diremehkan Sebagai Gadis Desa"),
    drama("b", "Master Pedang yang Diremehkan"),
    drama("c", "Kota Hujan"),
  ]);

  it("DIAM selama ketikan belum cukup panjang", () => {
    // Satu huruf mencocokkan ratusan judul, jadi barisnya praktis acak — dan
    // daftar yang terasa acak mengajarkan orang mengabaikannya.
    expect(pilihSaran("d", indeks)).toEqual([]);
    expect(MIN_HURUF_SARAN).toBe(2);
    expect(pilihSaran("di", indeks).length).toBeGreaterThan(0);
  });

  it("mencocokkan semua kata, di mana pun letaknya dalam judul", () => {
    const hasil = pilihSaran("pedang diremehkan", indeks);
    expect(hasil.map((s) => s.judul)).toEqual(["Master Pedang yang Diremehkan"]);
  });

  it("judul yang tidak cocok tidak ikut terbawa", () => {
    expect(pilihSaran("hujan", indeks).map((s) => s.judul)).toEqual(["Kota Hujan"]);
  });

  it("judul kembar dari dua sumber hanya muncul SEKALI", () => {
    // Satu film bisa hadir sebagai drama DAN video Playly. Dua baris identik
    // dengan alamat berbeda membuat penonton menebak mana yang benar.
    const campur = rakitIndeksSaran(
      [drama("a", "Kota Hujan")],
      [{ id: "9", title: "KOTA  hujan", year: "2023" }],
    );
    expect(pilihSaran("kota", campur)).toHaveLength(1);
  });

  it("dibatasi MAKS_SARAN baris", () => {
    const banyak = rakitIndeksSaran(
      Array.from({ length: 20 }, (_, i) => drama(`x${i}`, `Naga Nomor ${i}`)),
    );
    expect(pilihSaran("naga", banyak)).toHaveLength(MAKS_SARAN);
    expect(MAKS_SARAN).toBe(6);
  });
});

describe("SearchBar — daftar saran di layar", () => {
  let container: HTMLDivElement;
  let root: Root;

  const INDEKS: SaranCari[] = rakitIndeksSaran([
    drama("a", "Diremehkan Sebagai Gadis Desa", "2022"),
    drama("b", "Master Pedang yang Diremehkan", "2026"),
  ]);

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    dorong.mockClear();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  async function render(props: Record<string, unknown> = {}) {
    await act(async () => {
      root.render(
        h(SearchBar, {
          value: "diremehkan",
          onValueChange: () => {},
          indeksSaran: INDEKS,
          ...props,
        }),
      );
    });
  }

  const kotak = () => container.querySelector("input")!;
  const teks = () => container.textContent ?? "";

  /** `cancelable` WAJIB: tanpanya `defaultPrevented` selalu false dan penjaga
   *  "Enter tidak dibajak" di bawah jadi hijau palsu. */
  function tekan(key: string) {
    const ev = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
    act(() => {
      kotak().dispatchEvent(ev);
    });
    return ev;
  }

  it("menggambar judul yang cocok beserta tahunnya", async () => {
    await render();
    expect(teks()).toContain("Diremehkan Sebagai Gadis Desa");
    expect(teks()).toContain("2022");
    // Jalan keluar wajib: saran dibatasi 6 baris, jadi tanpa baris ini judul
    // ke-7 jadi tak terjangkau.
    expect(teks()).toContain("Lihat semua hasil");
  });

  it("TIDAK menggambar apa pun kalau indeksnya tidak diberikan", async () => {
    // Fitur ini opsional per-pemakai; pemakai yang tak mengirim indeks harus
    // berperilaku persis seperti sebelum fitur ini ada.
    await render({ indeksSaran: undefined });
    expect(teks()).not.toContain("Lihat semua hasil");
  });

  it("panah bawah lalu Enter membuka judul yang disorot", async () => {
    await render();
    tekan("ArrowDown");
    tekan("Enter");
    expect(dorong).toHaveBeenCalledWith("/drama/a");
  });

  it("Enter TANPA sorotan tidak dibajak — itu pencarian biasa", async () => {
    // Kalau Enter polos ikut dicegat, penonton kehilangan cara membuka halaman
    // hasil LENGKAP, dan itu kemunduran dari sebelum fitur ini ada.
    //
    // 🪤 Diperketat 2026-11-07 SETELAH uji-balik membuktikan versi lamanya
    // hijau palsu: dengan Enter yang selalu dibajak, `saran[-1].href` melempar
    // TypeError sehingga `router.push` memang tidak terpanggil — tesnya lulus
    // karena handler-nya CRASH, bukan karena perilakunya benar. Yang diperiksa
    // sekarang kontrak yang sesungguhnya: event-nya tidak di-preventDefault,
    // sehingga pengiriman form tetap jalan.
    await render();
    const ev = tekan("Enter");
    expect(
      ev.defaultPrevented,
      "Enter polos dicegat — form tak lagi terkirim, jadi halaman hasil " +
        "lengkap tidak bisa dibuka",
    ).toBe(false);
    expect(dorong).not.toHaveBeenCalled();
  });

  it("Escape menutup daftarnya", async () => {
    await render();
    expect(teks()).toContain("Lihat semua hasil");
    tekan("Escape");
    expect(teks()).not.toContain("Lihat semua hasil");
  });
});
