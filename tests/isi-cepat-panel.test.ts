// @vitest-environment jsdom
//
// Penjaga PANEL ISI CEPAT — owner 2026-11-11: "bisa kamu buatkan agar saya bisa
// mengisinya sekali jalan agar tidak perlu isi persatu film".
//
// Empat hal yang dijaga di sini, semuanya rusak SENYAP (nol error di layar):
//
//   A. MENGUNCI NILAI OTOMATIS. Kotak-kotak di panel ini MENAMPILKAN nilai yang
//      datang dari IMDb/Playly supaya admin tahu mana yang sudah terisi. Kalau
//      nilai itu ikut terkirim saat Simpan, film yang tadinya mengikuti IMDb
//      berubah jadi nilai ketikan tetap — ia berhenti ikut IMDb selamanya dan
//      tak ada yang memberi tahu.
//
//   B. ISIAN HILANG SAAT GAGAL. Simpan gagal (server mati, koneksi putus) lalu
//      draft dihapus = kerja mengisi 40 film lenyap persis di saat
//      penyimpanannya tidak berhasil.
//
//   C. PENOLAKAN DITELAN. Nilai yang tak terbaca server harus ditandai di
//      barisnya; kalau cuma dibuang, admin mengira semuanya tersimpan.
//
//   D. BORONGAN LANGSUNG MENULIS. "Terapkan ke N film" sengaja hanya mengisi
//      kotak — menyentuh database langsung berarti salah pilih sudah tayang ke
//      penonton sebelum sempat dilihat.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import PlaylyIsiCepat from "../app/components/admin/PlaylyIsiCepat";
import type { PlaylyVideo } from "../lib/playly";
import type { PetaIsian } from "../lib/isian-massal-video";

function video(id: string, ubah: Partial<PlaylyVideo> = {}): PlaylyVideo {
  return {
    id,
    title: `Film ${id}`,
    durationSeconds: null,
    durationLabel: "-",
    creator: "coklat",
    embedUrl: `https://contoh.test/${id}/embed`,
    thumbnail: null,
    createdAt: null,
    ...ubah,
  } as PlaylyVideo;
}

const petaKosong = (): PetaIsian => ({
  jenis: {},
  kategori: {},
  kualitas: {},
  rating: {},
  meta: {},
});

// React menolak `act()` sampai bendera ini dinyalakan — tanpa itu tiap
// interaksi mencetak peringatan ke stderr dan pembaruan state bisa tertinggal
// di luar act, yang membuat tes hijau karena alasan yang salah.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let dikirim: unknown[] = [];

/** Balasan server yang dipalsukan tes berikutnya. */
let balasan: { status: number; body: unknown } = {
  status: 200,
  body: { ok: true, tersimpan: 1, peta: petaKosong(), ditolak: [] },
};

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  // Simpanan sementara panel hidup di localStorage; tanpa dibersihkan, isian
  // satu tes akan bocor ke tes berikutnya dan membuatnya hijau/merah karena
  // alasan yang salah.
  window.localStorage.clear();
  dikirim = [];
  balasan = {
    status: 200,
    body: { ok: true, tersimpan: 1, peta: petaKosong(), ditolak: [] },
  };

  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, opsi?: { body?: string }) => {
      dikirim.push(JSON.parse(opsi?.body ?? "{}"));
      return {
        ok: balasan.status >= 200 && balasan.status < 300,
        status: balasan.status,
        json: async () => balasan.body,
      };
    }),
  );
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function pasang(props: Parameters<typeof PlaylyIsiCepat>[0]) {
  act(() => {
    root.render(createElement(PlaylyIsiCepat, props));
  });
}

/** Cari kotak isian lewat label aksesibilitasnya — sama seperti cara admin
 *  menemukannya di layar, bukan lewat urutan DOM yang mudah bergeser. */
function kotak(label: string): HTMLInputElement | HTMLSelectElement {
  const el = container.querySelector(`[aria-label="${label}"]`);
  if (!el) throw new Error(`kotak "${label}" tidak ada di layar`);
  return el as HTMLInputElement | HTMLSelectElement;
}

function ketik(label: string, nilai: string) {
  const el = kotak(label) as HTMLInputElement;
  act(() => {
    // React memasang setter-nya sendiri di properti `value`; menulis langsung
    // ke `el.value` tidak terlihat oleh React.
    const setter = Object.getOwnPropertyDescriptor(
      el.tagName === "SELECT"
        ? window.HTMLSelectElement.prototype
        : window.HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(el, nilai);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function tombol(teks: string | RegExp): HTMLButtonElement {
  const semua = Array.from(container.querySelectorAll("button"));
  const cocok = semua.find((b) =>
    typeof teks === "string"
      ? (b.textContent ?? "").includes(teks)
      : teks.test(b.textContent ?? ""),
  );
  if (!cocok) throw new Error(`tombol "${teks}" tidak ada di layar`);
  return cocok as HTMLButtonElement;
}

function klik(el: Element) {
  act(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

describe("PlaylyIsiCepat", () => {
  it("menggambar satu baris per film dengan keenam kotaknya", () => {
    pasang({ videos: [video("a"), video("b")], awal: petaKosong() });
    expect(container.querySelectorAll("[data-baris-isi-cepat]")).toHaveLength(2);
    // Keenam kolom ada untuk film pertama.
    for (const label of ["Jenis", "Kategori", "Kualitas", "Rating", "Tahun", "Durasi"]) {
      expect(() => kotak(`${label} untuk Film a`)).not.toThrow();
    }
  });

  it("tombol Simpan baru muncul setelah ada yang diketik", async () => {
    pasang({ videos: [video("a")], awal: petaKosong() });
    expect(() => tombol("Simpan semua")).toThrow();

    ketik("Rating untuk Film a", "7.4");
    expect(() => tombol("Simpan semua")).not.toThrow();
    expect(container.textContent).toContain("1 isian");
  });

  it("mengirim HANYA kotak yang diketik — bukan seluruh baris", async () => {
    pasang({ videos: [video("a"), video("b")], awal: petaKosong() });

    ketik("Rating untuk Film a", "7.4");
    await act(async () => {
      klik(tombol("Simpan semua"));
    });

    expect(dikirim).toHaveLength(1);
    expect(dikirim[0]).toEqual({
      perubahan: [{ videoId: "a", rating: "7.4" }],
    });
  });

  it("nilai yang datang dari IMDb TIDAK ikut terkirim", async () => {
    // 🪤 Pagar A. Kotak Tahun menampilkan "2024" dari IMDb supaya admin tahu
    // film itu sudah terisi. Mengirimkannya akan MENGUNCI angka itu jadi nilai
    // ketikan — film berhenti mengikuti IMDb selamanya, nol error.
    pasang({
      videos: [video("a")],
      awal: petaKosong(),
      imdb: { a: { year: "2024", rating: "8.1" } } as never,
    });

    expect((kotak("Tahun untuk Film a") as HTMLInputElement).value).toBe("2024");
    expect((kotak("Rating untuk Film a") as HTMLInputElement).value).toBe("8.1");

    // Diubah -> muncul sebagai perubahan.
    ketik("Tahun untuk Film a", "2019");
    expect(() => tombol("Simpan semua")).not.toThrow();

    // 🪤 DIKEMBALIKAN ke angka IMDb semula -> perubahannya HILANG lagi.
    // Inilah pagarnya: tanpa perbandingan terhadap nilai efektif, "2024" ikut
    // terkirim dan film ini BERHENTI mengikuti IMDb — angkanya terlihat sama
    // persis di layar, jadi tidak ada satu pun gejala yang bisa dilaporkan.
    //
    // (Mengetik ulang angka yang sama TANPA mengubahnya dulu bukan uji yang
    // sah: React punya pelacak nilai yang menelan event `change` saat isinya
    // tidak berubah, jadi tesnya akan hijau bahkan kalau pagarnya dicabut.)
    ketik("Tahun untuk Film a", "2024");
    expect(() => tombol("Simpan semua")).toThrow();
  });

  it("borongan ke film yang nilainya SUDAH sama tidak ikut terkirim", async () => {
    // Pagar yang sama dari sisi borongan: centang semua lalu terapkan "HD"
    // ketika sebagian film memang sudah HD. Yang sudah HD tidak boleh ikut
    // dikirim — menulisnya ulang tidak mengubah apa pun bagi penonton, tapi
    // memperbesar tulisan ke dokumen bersama tanpa alasan.
    pasang({
      videos: [video("a"), video("b")],
      awal: { ...petaKosong(), kualitas: { a: "HD" } },
      // Saringan bawaan menyembunyikan film yang sudah lengkap, jadi dibuka
      // lewat tombol "Semua video" supaya kedua film ikut tergambar.
    });
    klik(tombol("Semua video"));

    const centang = container.querySelectorAll<HTMLInputElement>(
      '[data-baris-isi-cepat] input[type="checkbox"]',
    );
    klik(centang[0]);
    klik(centang[1]);
    ketik("Terapkan kualitas ke film tercentang", "HD");
    klik(tombol("Terapkan"));

    await act(async () => {
      klik(tombol("Simpan semua"));
    });

    expect(dikirim[0]).toEqual({
      perubahan: [{ videoId: "b", kualitas: "HD" }],
    });
  });

  it("borongan mengisi kotak banyak film TANPA menyentuh server", () => {
    // 🪤 Pagar D.
    pasang({
      videos: [video("a"), video("b"), video("c")],
      awal: petaKosong(),
    });

    const centang = container.querySelectorAll<HTMLInputElement>(
      '[data-baris-isi-cepat] input[type="checkbox"]',
    );
    klik(centang[0]);
    klik(centang[1]);

    // Kontrol borongan dicari lewat label aksesibilitasnya, BUKAN lewat urutan
    // <select> di DOM: urutan bergeser begitu satu kolom ditambah, dan tes yang
    // bergantung padanya akan menguji kotak yang salah tanpa pernah merah.
    ketik("Terapkan kualitas ke film tercentang", "HD");
    klik(tombol("Terapkan"));

    // Dua film terisi, yang ketiga tidak. NOL permintaan ke server.
    expect((kotak("Kualitas untuk Film a") as HTMLSelectElement).value).toBe("HD");
    expect((kotak("Kualitas untuk Film b") as HTMLSelectElement).value).toBe("HD");
    expect((kotak("Kualitas untuk Film c") as HTMLSelectElement).value).toBe("");
    expect(dikirim).toHaveLength(0);
  });

  it("simpan GAGAL -> isian tetap di layar, bukan hilang", async () => {
    // 🪤 Pagar B.
    balasan = { status: 500, body: { error: "Server sedang bermasalah." } };
    pasang({ videos: [video("a")], awal: petaKosong() });

    ketik("Rating untuk Film a", "7.4");
    await act(async () => {
      klik(tombol("Simpan semua"));
    });

    expect((kotak("Rating untuk Film a") as HTMLInputElement).value).toBe("7.4");
    expect(() => tombol("Simpan semua")).not.toThrow();
    expect(container.textContent).toContain("Server sedang bermasalah.");
  });

  it("nilai yang DITOLAK server ditandai di barisnya dan tidak dibuang", async () => {
    // 🪤 Pagar C.
    balasan = {
      status: 200,
      body: {
        ok: true,
        tersimpan: 0,
        peta: petaKosong(),
        ditolak: [
          { videoId: "a", kolom: "rating", diketik: "abc", alasan: "harus angka 0-10" },
        ],
      },
    };
    pasang({ videos: [video("a")], awal: petaKosong() });

    ketik("Rating untuk Film a", "abc");
    await act(async () => {
      klik(tombol("Simpan semua"));
    });

    expect((kotak("Rating untuk Film a") as HTMLInputElement).value).toBe("abc");
    expect(container.textContent).toContain("harus angka 0-10");
    expect(container.textContent).toContain("1 isian ditolak");
  });

  it("isian yang BERHASIL tersimpan hilang dari daftar belum-tersimpan", async () => {
    balasan = {
      status: 200,
      body: {
        ok: true,
        tersimpan: 1,
        peta: { ...petaKosong(), rating: { a: "7.4" } },
        ditolak: [],
      },
    };
    pasang({ videos: [video("a")], awal: petaKosong() });

    ketik("Rating untuk Film a", "7.4");
    await act(async () => {
      klik(tombol("Simpan semua"));
    });

    // Baris "belum tersimpan" lenyap, dan kotaknya menampilkan nilai tersimpan.
    expect(() => tombol("Simpan semua")).toThrow();
    expect((kotak("Rating untuk Film a") as HTMLInputElement).value).toBe("7.4");
    expect(container.textContent).toContain("1 film tersimpan");
  });

  it("isian yang belum tersimpan SELAMAT dari halaman yang dibongkar", async () => {
    // 🪤 TERBUKTI MENGGIGIT 2026-11-11, pemakaian pertama owner: halaman admin
    // melempar "Supabase tidak menjawab setelah 2 percobaan", React membuang
    // seluruh panel, dan 4 isian yang sudah diketik lenyap. `beforeunload`
    // tidak menolong — yang terjadi bukan tab ditutup, melainkan halamannya
    // sendiri gagal dirender.
    pasang({ videos: [video("a")], awal: petaKosong() });
    ketik("Rating untuk Film a", "7.4");
    ketik("Tahun untuk Film a", "2019");

    // Panelnya dibongkar persis seperti saat halaman error, lalu dipasang lagi.
    act(() => root.unmount());
    container.remove();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    pasang({ videos: [video("a")], awal: petaKosong() });

    expect((kotak("Rating untuk Film a") as HTMLInputElement).value).toBe("7.4");
    expect((kotak("Tahun untuk Film a") as HTMLInputElement).value).toBe("2019");
    // Dikatakan ke admin, bukan dipasang diam-diam: kotak kuning yang muncul
    // sendiri tanpa penjelasan terbaca seperti isian yang sudah tersimpan.
    expect(container.textContent).toContain("dipulihkan");
    expect(container.textContent).toContain("1 film");
  });

  it("simpanan sementara DIBUANG setelah isiannya masuk database", async () => {
    // Kalau tidak dibuang, isian yang sudah tersimpan akan muncul lagi sebagai
    // kotak kuning tiap halaman dibuka — admin menyimpannya berulang kali
    // mengira belum berhasil.
    balasan = {
      status: 200,
      body: {
        ok: true,
        tersimpan: 1,
        peta: { ...petaKosong(), rating: { a: "7.4" } },
        ditolak: [],
      },
    };
    pasang({ videos: [video("a")], awal: petaKosong() });
    ketik("Rating untuk Film a", "7.4");
    expect(window.localStorage.getItem("dramaku:isi-cepat:draft")).toBeTruthy();

    await act(async () => {
      klik(tombol("Simpan semua"));
    });

    expect(window.localStorage.getItem("dramaku:isi-cepat:draft")).toBeNull();
  });

  it("simpanan sementara TIDAK dibuang saat penyimpanan gagal", async () => {
    balasan = { status: 500, body: { error: "Server sedang bermasalah." } };
    pasang({ videos: [video("a")], awal: petaKosong() });
    ketik("Rating untuk Film a", "7.4");

    await act(async () => {
      klik(tombol("Simpan semua"));
    });

    const simpanan = window.localStorage.getItem("dramaku:isi-cepat:draft");
    expect(simpanan, "isian hilang justru saat penyimpanan gagal").toContain(
      "7.4",
    );
  });

  it("saringan bawaan hanya menampilkan film yang datanya belum lengkap", () => {
    const lengkap: PetaIsian = {
      jenis: {},
      kategori: { a: "Action" },
      kualitas: { a: "HD" },
      rating: { a: "7.4" },
      meta: { a: { tahun: "2024", durasiDetik: 6420 } },
    };
    pasang({
      videos: [video("a"), video("b")],
      awal: lengkap,
    });

    // Film a lengkap -> tidak tampil; film b kosong semua -> tampil.
    expect(container.querySelectorAll("[data-baris-isi-cepat]")).toHaveLength(1);
    expect(container.textContent).toContain("Film b");
    expect(container.textContent).not.toContain("Film a");
  });
});
