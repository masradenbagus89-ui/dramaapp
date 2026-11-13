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
    subtitle: {
      bahasa: { nilai: "mati", opsi: [{ nilai: "mati", label: "Mati" }], onPilih: vi.fn() },
      ukuran: { nilai: "sedang", opsi: [{ nilai: "sedang", label: "Sedang" }], onPilih: vi.fn() },
      latar: { nilai: "tipis", opsi: [{ nilai: "tipis", label: "Transparan" }], onPilih: vi.fn() },
    },
    kecepatan: {
      nilai: "1",
      opsi: [
        { nilai: "1", label: "Normal" },
        { nilai: "1.5", label: "1,5×" },
      ],
      onPilih: vi.fn(),
    },
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

  it("menampilkan KELIMA fitur menu dengan urutan yang diminta", () => {
    // Susunan 2026-11-07: Subtitle, Kecepatan, Penguat suara, Pencahayaan
    // sinematik, Kualitas video. Urutan ikut dijaga karena urutan itulah yang
    // diminta, bukan sekadar keberadaan barisnya.
    render(propsDasar());
    klik(tombolMenu());

    const label = Array.from(container.querySelectorAll('[role="menu"] button')).map(
      (b) => b.textContent ?? "",
    );
    const urutan = [
      "Subtitle",
      "Kecepatan pemutar",
      "Penguat suara",
      "Pencahayaan sinematik",
      "Kualitas video",
    ];
    expect(label).toHaveLength(urutan.length);
    urutan.forEach((u, i) => expect(label[i]).toContain(u));
  });

  it("Volume Stabil & PiP TIDAK ada di menu", () => {
    // Volume Stabil dikeluarkan (2026-11-07). PiP tetap tombol langsung di
    // baris kontrol — muncul juga di sini berarti ada dua jalan ke pengaturan
    // yang sama.
    render(propsDasar());
    klik(tombolMenu());

    const teks = container.textContent ?? "";
    for (const label of ["Volume Stabil", "PiP", "Pop-up"]) {
      expect(teks).not.toContain(label);
    }
  });

  it("Kecepatan: nilai sekarang terlihat, pilihan baru terkirim", () => {
    const onPilih = vi.fn();
    render(propsDasar({ kecepatan: { ...propsDasar().kecepatan, onPilih } }));

    klik(tombolMenu());
    expect(tombolBerteks("Kecepatan pemutar")?.textContent).toContain("Normal");

    klik(tombolBerteks("Kecepatan pemutar"));
    klik(tombolBerteks("1,5×"));
    expect(onPilih).toHaveBeenCalledWith("1.5");
  });

  it("Subtitle tanpa berkas: alasannya terbaca dan Gaya subtitle terkunci", () => {
    const alasan = "Sumber video ini tidak menyertakan berkas subtitle.";
    render(propsDasar({ subtitle: { ...propsDasar().subtitle, alasanMati: alasan } }));

    klik(tombolMenu());
    klik(tombolBerteks("Subtitle"));
    expect(container.textContent).toContain(alasan);

    const gaya = tombolBerteks("Gaya subtitle");
    expect(gaya?.disabled).toBe(true);
    klik(gaya);
    // Tetap di halaman Subtitle: tombol terkunci tidak boleh membuka apa pun.
    expect(container.textContent).not.toContain("Ukuran teks");
  });

  it("Gaya subtitle (bila tersedia): ukuran & latar bisa dipilih, Kembali ke halaman Subtitle", () => {
    const onUkuran = vi.fn();
    const dasar = propsDasar().subtitle;
    render(propsDasar({ subtitle: { ...dasar, ukuran: {
      nilai: "sedang",
      opsi: [{ nilai: "sedang", label: "Sedang" }, { nilai: "besar", label: "Besar" }],
      onPilih: onUkuran,
    } } }));

    klik(tombolMenu());
    klik(tombolBerteks("Subtitle"));
    klik(tombolBerteks("Gaya subtitle"));
    expect(container.textContent).toContain("Ukuran teks");
    expect(container.textContent).toContain("Latar teks");

    klik(tombolBerteks("Besar"));
    expect(onUkuran).toHaveBeenCalledWith("besar");

    klik(tombolBerteks("Gaya subtitle")); // tombol kembali di kepala halaman
    expect(container.textContent).not.toContain("Ukuran teks");
    expect(tombolBerteks("Gaya subtitle")?.getAttribute("role")).toBe("menuitem");
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
    klik(tombolBerteks("Kualitas video"));
    // Tanpa catatan ini, submenu isi satu terbaca seperti fitur yang gagal muat.
    expect(container.textContent).toContain("hanya menyediakan satu kualitas");
  });

  it("Kualitas: nilai sekarang terlihat tanpa membuka, dan pilihan terkirim", () => {
    const onPilih = vi.fn();
    render(propsDasar({ kualitas: { nilai: "auto", opsi: [
      { nilai: "auto", label: "Auto" },
      { nilai: "720", label: "720p" },
    ], onPilih } }));

    klik(tombolMenu());
    expect(tombolBerteks("Kualitas video")?.textContent).toContain("Auto");

    klik(tombolBerteks("Kualitas video"));
    klik(tombolBerteks("720p"));
    expect(onPilih).toHaveBeenCalledWith("720");
  });

  it("Kualitas: lencana HD tergambar di baris yang punya, tidak di yang lain", () => {
    // Penanda sekilas seperti pemutar pada umumnya (contoh gambar owner
    // 2026-11-13). Lencana yang muncul di SEMUA baris sama tidak bergunanya
    // dengan yang tidak muncul sama sekali.
    render(
      propsDasar({
        kualitas: {
          nilai: "1080p",
          opsi: [
            { nilai: "1080p", label: "1080p", lencana: "HD" },
            { nilai: "720p", label: "720p", lencana: "HD" },
            { nilai: "480p", label: "480p", lencana: null },
          ],
          onPilih: vi.fn(),
        },
      }),
    );
    klik(tombolMenu());
    klik(tombolBerteks("Kualitas video"));

    const baris = (teks: string) =>
      [...container.querySelectorAll('[role="menuitemradio"]')].find((b) =>
        (b.textContent ?? "").includes(teks),
      );
    expect(baris("1080p")?.textContent).toContain("HD");
    expect(baris("720p")?.textContent).toContain("HD");
    expect(baris("480p")?.textContent, "480p tidak boleh berlencana HD").not.toContain("HD");
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
