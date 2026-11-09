// Penjaga KESERAGAMAN panel massal di tab IMDb (owner 2026-11-09: "yang lain
// rapi kenapa Cocokkan semua ke IMDb sekaligus tidak kamu buat rapi juga").
//
// Tiga panel di halaman itu — Cocokkan semua · Isi kategori otomatis ·
// Ringkasan kualitas & rating — harus memakai pola yang sama: angka terlihat
// langsung, keterangan panjang di balik tombol "?" (BantuanSingkat).
//
// Kenapa diuji dengan RENDER, bukan cuma membaca berkas: panel "Cocokkan
// semua" TIDAK bisa dilihat di localhost (tersembunyi oleh pagar `fetchError`
// karena kunci Playly tidak ada di komputer owner), jadi tanpa tes ini
// satu-satunya cara memeriksanya adalah merilis dulu lalu berharap.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { PlaylyVideo } from "../lib/playly";

const { default: PlaylyCocokkanSemua } = await import(
  "../app/components/admin/PlaylyCocokkanSemua"
);

function videos(jumlah: number): PlaylyVideo[] {
  return Array.from({ length: jumlah }, (_, i) => ({
    id: String(i + 1),
    title: `Film Nomor ${i + 1} (2024)`,
    durationLabel: "1:30:00",
    creator: "coklat",
    embedUrl: "https://contoh.test/e/" + (i + 1),
    thumbnail: "",
  })) as unknown as PlaylyVideo[];
}

function render(jumlah: number): string {
  return renderToStaticMarkup(
    createElement(PlaylyCocokkanSemua, {
      videos: videos(jumlah),
      imdb: {},
      onPerbarui: () => {},
    }),
  );
}

describe("PlaylyCocokkanSemua — panel ringkas seperti dua panel tetangganya", () => {
  it("menggambar tombol '?' untuk keterangan panjang", () => {
    const html = render(50);
    expect(html).toContain("Bagaimana pencocokan massal bekerja");
    // aria-expanded = penanda BantuanSingkat; tanpa itu tombolnya cuma ikon
    // yang tidak mengumumkan keadaannya ke pembaca layar.
    expect(html).toContain('aria-expanded="false"');
  });

  it("angka tetap TERLIHAT, tidak ikut disembunyikan", () => {
    // Inti perapiannya: yang disembunyikan cuma kalimatnya. Kalau angkanya
    // ikut masuk ke balik tombol, panel jadi rapi tapi tidak berguna —
    // admin harus mengklik dulu untuk tahu ada berapa yang perlu dikerjakan.
    const html = render(50);
    const sebelumKotak = html.slice(0, html.indexOf("hidden"));
    expect(sebelumKotak).toContain("50");
    expect(sebelumKotak).toContain("belum punya data");
  });

  it("menyebut ongkos OMDb di ringkasan, bukan cuma di dalam keterangan", () => {
    // Angka ini yang menentukan apakah admin jadi mengklik atau tidak —
    // 50 video = 100 permintaan dari jatah 1.000/hari.
    const html = render(50);
    expect(html).toContain("100");
    expect(html).toContain("jatah 1.000/hari");
  });

  it("keterangan panjangnya TERTUTUP saat panel dibuka", () => {
    // Kotak keterangan ada di DOM tapi berkelas `hidden` — disembunyikan lewat
    // CSS, bukan dilepas, supaya angka di dalamnya tetap ikut dihitung ulang.
    const html = render(50);
    expect(html).toContain("hidden");
    expect(html).toContain("Tiap video memakai");
  });

  it("katalog kosong: panel tidak digambar sama sekali", () => {
    expect(render(0)).toBe("");
  });
});
