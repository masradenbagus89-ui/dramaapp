// @vitest-environment jsdom
//
// Penjaga untuk menu titik tiga di pemutar (dipasang 2026-09-09).
//
// KENAPA diuji sungguhan, bukan dibaca saja: seluruh nilai fitur ini ada di
// INTERAKSInya. Menu yang ter-render rapi tapi tombolnya tidak memanggil apa
// pun terlihat sempurna di layar dan tetap tidak berguna — persis keluhan yang
// memulai pekerjaan ini (menu bawaan Chrome yang isinya cuma dua baris).
//
// JSX sengaja tidak dipakai (createElement langsung) supaya berkas ini tetap
// .ts dan cocok dengan `include` di vitest.config.ts, tanpa perlu mengubah
// setelan alat tes milik project.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createElement as h, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import PlayerMenu, { type PlayerMenuProps } from "../app/components/player/PlayerMenu";

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
function propsDasar(timpa: Partial<PlayerMenuProps> = {}): PlayerMenuProps {
  return {
    volumeStabil: { aktif: false, onUbah: vi.fn() },
    penguatSuara: { aktif: false, onUbah: vi.fn() },
    sinematik: { aktif: false, onUbah: vi.fn() },
    kualitas: {
      nilai: "auto",
      opsi: [{ nilai: "auto", label: "Auto" }],
      onPilih: vi.fn(),
      catatan:
        "Sumber video ini hanya menyediakan satu kualitas, jadi tidak ada pilihan lain.",
    },
    ...timpa,
  };
}

function render(props: PlayerMenuProps) {
  act(() => {
    root.render(h(PlayerMenu, props));
  });
}

function klik(el: Element | null | undefined) {
  if (!el) throw new Error("Elemen yang mau diklik tidak ditemukan.");
  act(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

/** Cari tombol berdasarkan teks yang terlihat penonton. */
function tombolBerteks(teks: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes(teks),
  );
}

const tombolMenu = () => container.querySelector<HTMLButtonElement>('[aria-label="Menu pemutar"]');

describe("PlayerMenu — popup titik tiga", () => {
  it("tertutup dulu, lalu terbuka saat titik tiga diklik", () => {
    render(propsDasar());
    expect(container.querySelector('[role="menu"]')).toBeNull();

    klik(tombolMenu());
    expect(container.querySelector('[role="menu"]')).not.toBeNull();
  });

  it("menampilkan KEEMPAT fitur yang tersisa di menu", () => {
    render(propsDasar());
    klik(tombolMenu());

    const teks = container.textContent ?? "";
    for (const label of [
      "Volume Stabil",
      "Penguat suara",
      "Pencahayaan sinematik",
      "Kualitas",
    ]) {
      expect(teks).toContain(label);
    }
  });

  it("TIDAK lagi memuat kontrol yang naik jadi tombol langsung", () => {
    // Penjaga anti-dobel (owner 2026-09-28): PiP, Terjemahan, dan Kecepatan
    // sekarang ada di baris kontrol pemutar. Kalau suatu saat ada yang
    // menambahkannya kembali ke sini, penonton punya dua jalan ke pengaturan
    // yang sama — dan keduanya bisa menampilkan keadaan yang berbeda.
    render(propsDasar());
    klik(tombolMenu());

    const teks = container.textContent ?? "";
    for (const label of ["PiP", "Terjemahan", "Kecepatan"]) {
      expect(teks).not.toContain(label);
    }
  });

  it("Pencahayaan sinematik mengirim nilai KEBALIKAN dari keadaan sekarang", () => {
    const onUbah = vi.fn();
    render(propsDasar({ sinematik: { aktif: false, onUbah } }));
    klik(tombolMenu());
    klik(tombolBerteks("Pencahayaan sinematik"));
    expect(onUbah).toHaveBeenCalledWith(true);
  });

  it("fitur yang tidak tersedia: TIDAK bisa diklik dan alasannya ditulis apa adanya", () => {
    const onUbah = vi.fn();
    const alasan = "tidak tersedia untuk video ini — sumbernya tidak mengizinkan suara diolah";
    render(propsDasar({ penguatSuara: { aktif: false, onUbah, alasanMati: alasan } }));

    klik(tombolMenu());
    const baris = tombolBerteks("Penguat suara");
    expect(baris?.disabled).toBe(true);
    expect(baris?.textContent).toContain(alasan);

    klik(baris);
    // Inti kejujurannya: tombol mati tidak boleh diam-diam memanggil apa pun.
    expect(onUbah).not.toHaveBeenCalled();
  });

  it("submenu berisi satu pilihan tetap menjelaskan KENAPA cuma satu", () => {
    render(propsDasar());
    klik(tombolMenu());
    klik(tombolBerteks("Kualitas"));
    // Tanpa catatan ini, submenu isi satu terbaca seperti fitur yang gagal muat.
    expect(container.textContent).toContain("hanya menyediakan satu kualitas");
  });

  it("Kualitas: nilai sekarang terlihat tanpa membuka, dan pilihan terkirim", () => {
    // Kualitas kini SATU-SATUNYA submenu, jadi jalur buka -> pilih -> kirim
    // hanya teruji di sini. Sebelumnya jalur itu ikut terjaga lewat submenu
    // Kecepatan yang sudah pindah ke baris kontrol.
    const onPilih = vi.fn();
    render(propsDasar({ kualitas: { nilai: "auto", opsi: [
      { nilai: "auto", label: "Auto" },
      { nilai: "720", label: "720p" },
    ], onPilih } }));

    klik(tombolMenu());
    expect(tombolBerteks("Kualitas")?.textContent).toContain("Auto");

    klik(tombolBerteks("Kualitas"));
    klik(tombolBerteks("720p"));
    expect(onPilih).toHaveBeenCalledWith("720");
  });

  it("menutup saat tombol Escape ditekan", () => {
    render(propsDasar());
    klik(tombolMenu());
    expect(container.querySelector('[role="menu"]')).not.toBeNull();

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(container.querySelector('[role="menu"]')).toBeNull();
  });
});
