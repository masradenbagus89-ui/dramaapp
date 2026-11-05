// Penjaga PANEL ADMIN PLAYLY saat Playly sedang bermasalah — owner 2026-11-05:
// "Dropdown paling kiri aku tidak ketemu".
//
// 🪤 KENAPA TES INI ADA. Panel pengaturan video dulu menyembunyikan DIRINYA
// SENDIRI begitu pengambilan daftar gagal (`if (fetchError) return <peringatan>`).
// Playly telat menjawab 10 detik → seluruh panel diganti kotak kuning → daftar
// video beserta KETIGA dropdown-nya (Jenis, Kategori, Kualitas) lenyap, dan owner
// tidak bisa menandai apa pun sampai Playly kebetulan sedang cepat.
//
// Yang membuatnya mahal: tidak ada error di mana pun. Halaman admin tetap 200,
// build hijau, tes hijau — yang hilang cuma alat kerjanya. Owner yang menemukan,
// bukan mesin, dan baru SESUDAH fiturnya dirilis.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import PlaylyVisibilityManager from "../app/components/admin/PlaylyVisibilityManager";
import { LABEL_JENIS } from "../lib/jenis-video";

const video = (id: string, title: string) => ({
  id,
  title,
  durationSeconds: 120,
  durationLabel: "2:00",
  creator: "cokiel",
  embedUrl: "https://playly-hosting-video.up.railway.app/179342855458/embed",
  thumbnail: null,
});

const render = (videos: ReturnType<typeof video>[], fetchError: string | null) =>
  renderToStaticMarkup(
    createElement(PlaylyVisibilityManager, {
      videos,
      initialHidden: [],
      belumSiapIds: [],
      fetchError,
      source: "mitra" as const,
      creators: ["dramaku"],
    }),
  );

const PESAN_GANGGUAN = "Playly tidak menjawab dalam 10 detik.";

describe("panel admin tetap bisa dipakai saat Playly bermasalah", () => {
  it("dropdown Jenis TETAP tergambar walau pengambilan gagal", () => {
    const html = render([video("v1", "Pemuda Miskin Mata Tembus Pandang")], PESAN_GANGGUAN);

    // Inilah yang hilang dari layar owner. Kalau assert ini merah lagi,
    // artinya panel kembali menyandera dirinya sendiri.
    expect(html).toContain(`>${LABEL_JENIS.series}</option>`);
    expect(html).toContain(`>${LABEL_JENIS.film}</option>`);
    expect(html).toContain("Pemuda Miskin Mata Tembus Pandang");
  });

  it("peringatannya tetap tampil — jujur bahwa daftarnya bisa ketinggalan", () => {
    // Menampilkan daftar TANPA peringatan sama buruknya: owner akan mengira
    // daftar itu mutakhir, lalu bingung kenapa video yang baru di-upload tak
    // ada. Dua-duanya harus muncul bersamaan.
    const html = render([video("v1", "Judul Apa Saja")], PESAN_GANGGUAN);
    expect(html).toContain(PESAN_GANGGUAN);
    expect(html).toContain("salinan terakhir");
  });

  it("menyerah HANYA kalau benar-benar tak ada video untuk ditampilkan", () => {
    // Daftar kosong + gangguan = tak ada yang bisa dikerjakan, jadi peringatan
    // saja sudah benar. Yang dilarang adalah menyerah padahal videonya ADA.
    const html = render([], PESAN_GANGGUAN);
    expect(html).toContain(PESAN_GANGGUAN);
    expect(html).not.toContain(`>${LABEL_JENIS.series}</option>`);
  });

  it("tanpa gangguan: panel normal, tanpa spanduk peringatan", () => {
    const html = render([video("v1", "Judul Apa Saja")], null);
    expect(html).toContain(`>${LABEL_JENIS.series}</option>`);
    expect(html).not.toContain("salinan terakhir");
  });
});

describe("halaman admin menyediakan daftar cadangan", () => {
  it("memakai salinan terakhir saat pengambilan gagal DAN daftarnya kosong", () => {
    const isi = readFileSync("app/admin/videos/playly/page.tsx", "utf8");

    // Syaratnya WAJIB "gagal DAN kosong", bukan "gagal" saja: kalau pengambilan
    // bermasalah tapi masih membawa video, data segar itu yang harus dipakai —
    // salinan tidak boleh menggeser yang lebih baru.
    expect(isi).toMatch(/mitra\.error\s*&&\s*mitra\.videos\.length === 0/);
    expect(isi).toContain("getPlaylyVideosGabunganCached");

    // Panel WAJIB menerima daftar yang sudah berjaring, bukan mitra.videos
    // mentah — kalau tidak, jaringnya terpasang tapi tak tersambung ke mana pun.
    expect(isi).toContain("videos={videoPanel}");
    expect(isi).not.toContain("videos={mitra.videos}");
  });
});
