// @vitest-environment jsdom
//
// Penjaga daftar "Perlu dicek" — owner 2026-11-15: film bertanda segitiga
// (berkasnya belum ada di Playly) tercampur di daftar berhalaman, jadi susah
// dicek. Lalu owner melihat 59 baris penuh menumpuk di atas daftar biasa
// ("jangan menumpuk seperti itu"). Jadi judul itu TIDAK digambar sebagai
// tabel kedua. Tombol "Perlu dicek" menukar isi tabel yang sama.
//
// ⚠️ Kerusakan yang dijaga SENYAP: filmnya hilang, muncul dua kali, atau
// kembali menumpuk sebagai daftar kedua. Semuanya tanpa error.
import { describe, it, expect, afterEach } from "vitest";
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import PlaylyVisibilityManager from "../app/components/admin/PlaylyVisibilityManager";
import { UKURAN_BAWAAN } from "../lib/paginasi";

const film = (n: number) => ({
  id: `v${n}`,
  // Angka dipatok 3 digit supaya "002" tidak ikut ketemu di dalam "020".
  title: `Film nomor ${String(n).padStart(3, "0")}`,
  durationSeconds: 120,
  durationLabel: "2:00",
  creator: "coklat",
  embedUrl: `https://playly.test/${n}/embed`,
  thumbnail: null,
});

const gambar = (jumlah: number, belumSiapIds: string[]) =>
  renderToStaticMarkup(
    createElement(PlaylyVisibilityManager, {
      videos: Array.from({ length: jumlah }, (_, i) => film(i + 1)),
      initialHidden: [],
      belumSiapIds,
      fetchError: null,
      source: "mitra" as const,
      creators: ["dramaku"],
    }),
  );

/** Isi satu daftar, dari penandanya sampai penanda daftar berikutnya. */
const isiDaftar = (html: string, mulai: string, selesai: string | null) => {
  const a = html.indexOf(mulai);
  if (a < 0) return "";
  const b = selesai ? html.indexOf(selesai, a + mulai.length) : -1;
  return html.slice(a, b < 0 ? html.length : b);
};

describe("film bertanda segitiga tidak menumpuk di atas daftar", () => {
  it("awal: yang bertanda tidak ikut tergambar, yang lain tetap di tabel", () => {
    const html = gambar(3, ["v2"]);
    const biasa = isiDaftar(html, "data-daftar-video", null);

    expect(html, "kotak kedua tidak boleh kembali").not.toContain(
      "data-daftar-perlu-cek",
    );
    expect(html).toContain("Perlu dicek");
    expect(html, "penjelasan belum siap tidak menempel sebelum diklik").not.toContain(
      "video belum siap",
    );
    expect(html).not.toContain("Video lain");
    expect(biasa).toContain("Film nomor 001");
    expect(biasa).toContain("Film nomor 003");
    expect(html, "film bertanda tidak boleh menumpuk sebelum diklik").not.toContain(
      "Film nomor 002",
    );
  });

  it("judul bertanda tidak memakan jatah halaman daftar biasa", () => {
    const html = gambar(60, ["v2", "v59"]);
    const biasa = isiDaftar(html, "data-daftar-video", null);

    expect(biasa.match(/data-baris-video/g) ?? []).toHaveLength(UKURAN_BAWAAN);
    expect(html).not.toContain("Film nomor 002");
    expect(html).not.toContain("Film nomor 059");
    expect(biasa).toContain("Film nomor 001");
  });

  it("tanpa tanda: tombol Perlu dicek tidak digambar", () => {
    const html = gambar(7, []);
    expect(html).not.toContain("Perlu dicek");
    expect(html).not.toContain("Video lain");
    expect(html.match(/data-baris-video/g) ?? []).toHaveLength(7);
  });

  it("klik Perlu dicek menukar tabel, bukan menambah tabel kedua", async () => {
    const wadah = document.createElement("div");
    document.body.appendChild(wadah);
    const akar: Root = createRoot(wadah);
    await act(async () => {
      akar.render(
        createElement(PlaylyVisibilityManager, {
          videos: [film(1), film(2), film(3)],
          initialHidden: [],
          belumSiapIds: ["v2"],
          fetchError: null,
          source: "mitra" as const,
          creators: ["dramaku"],
        }),
      );
    });

    // 2026-11-21: "Perlu dicek" BUKAN tombol lagi — ia jadi salah satu baris
    // di dropdown saringan IMDb (owner meringkas empat tombol jadi satu
    // dropdown karena barisnya tidak muat dan menimpa kotak cari). Yang
    // DIJAGA tes ini tidak berubah sedikit pun: memilihnya harus MENUKAR isi
    // tabel yang sama, bukan menambah tabel kedua. Hanya cara menekannya yang
    // disesuaikan.
    const pilihan = [...wadah.querySelectorAll("option")].find((o) =>
      o.textContent?.includes("Perlu dicek"),
    );
    expect(pilihan, "pilihan Perlu dicek tidak ada").toBeTruthy();
    const dropdown = pilihan!.closest("select")!;
    await act(async () => {
      dropdown.value = pilihan!.value;
      dropdown.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const tabel = wadah.querySelector("[data-daftar-video]")?.textContent ?? "";
    expect(tabel).toContain("Film nomor 002");
    expect(tabel).not.toContain("Film nomor 001");
    expect(wadah.textContent).toContain("1 video belum siap");
    expect(wadah.querySelectorAll("[data-daftar-video]")).toHaveLength(1);
    expect(wadah.querySelector("[data-daftar-perlu-cek]")).toBeNull();

    await act(async () => {
      akar.unmount();
    });
    wadah.remove();
  });
});

afterEach(() => {
  document.body.innerHTML = "";
});
