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
    pip: { didukung: true, aktif: false, onToggle: vi.fn() },
    volumeStabil: { aktif: false, onUbah: vi.fn() },
    penguatSuara: { aktif: false, onUbah: vi.fn() },
    sinematik: { aktif: false, onUbah: vi.fn() },
    terjemahan: {
      nilai: "mati",
      opsi: [{ nilai: "mati", label: "Mati" }],
      onPilih: vi.fn(),
      catatan: "Sumber video ini tidak menyertakan berkas terjemahan.",
    },
    kecepatan: {
      nilai: "1",
      opsi: [
        { nilai: "0.5", label: "0,5×" },
        { nilai: "1", label: "Normal" },
        { nilai: "2", label: "2×" },
      ],
      onPilih: vi.fn(),
    },
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

  it("menampilkan KETUJUH fitur yang diminta", () => {
    render(propsDasar());
    klik(tombolMenu());

    const teks = container.textContent ?? "";
    for (const label of [
      "PiP / Picture in Picture",
      "Volume Stabil",
      "Penguat suara",
      "Pencahayaan sinematik",
      "Terjemahan",
      "Kecepatan",
      "Kualitas",
    ]) {
      expect(teks).toContain(label);
    }
  });

  it("PiP benar-benar memanggil aksinya lalu menutup menu", () => {
    const onToggle = vi.fn();
    render(propsDasar({ pip: { didukung: true, aktif: false, onToggle } }));
    klik(tombolMenu());
    klik(tombolBerteks("PiP / Picture in Picture"));

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[role="menu"]')).toBeNull();
  });

  it("Pencahayaan sinematik mengirim nilai KEBALIKAN dari keadaan sekarang", () => {
    const onUbah = vi.fn();
    render(propsDasar({ sinematik: { aktif: false, onUbah } }));
    klik(tombolMenu());
    klik(tombolBerteks("Pencahayaan sinematik"));
    expect(onUbah).toHaveBeenCalledWith(true);
  });

  it("Kecepatan membuka submenu dan pilihannya benar-benar terkirim", () => {
    const onPilih = vi.fn();
    const props = propsDasar();
    render(propsDasar({ kecepatan: { ...props.kecepatan, onPilih } }));

    klik(tombolMenu());
    // Nilai sekarang tampil di baris menu, jadi penonton tahu tanpa membuka.
    expect(tombolBerteks("Kecepatan")?.textContent).toContain("Normal");

    klik(tombolBerteks("Kecepatan"));
    klik(tombolBerteks("2×"));
    expect(onPilih).toHaveBeenCalledWith("2");
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

  it("PiP ditandai mati kalau browser penonton tidak mendukungnya", () => {
    const onToggle = vi.fn();
    render(propsDasar({ pip: { didukung: false, aktif: false, onToggle } }));
    klik(tombolMenu());

    const baris = tombolBerteks("PiP / Picture in Picture");
    expect(baris?.disabled).toBe(true);
    expect(baris?.textContent).toContain("tidak didukung browser ini");
    klik(baris);
    expect(onToggle).not.toHaveBeenCalled();
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
