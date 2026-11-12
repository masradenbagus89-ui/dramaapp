// Penjaga rail kanan pemutar drama: memudar saat video berputar (kontrol
// tersembunyi). Kalau `visible` lepas, rail menutupi film terus-menerus; kalau
// pointer-events tak ikut mati, rail yang tak terlihat masih menelan ketukan
// penonton — dua-duanya senyap.
//
// ⚠️ TOMBOL VOLUME SUDAH TIDAK DI RAIL sejak 2026-11-12 (owner: "volume
// pindahkan ke samping durasi"). Berkas ini kini menjaga arah sebaliknya: rail
// TIDAK boleh menggambarnya lagi. Penjaga sisi satunya —- bahwa tombolnya
// benar-benar ada di panel bawah —- ada di tests/pemutar-eps-volume.test.ts.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";

const { default: ActionRail } = await import("../app/components/ActionRail");

describe("ActionRail — sembunyi saat diputar", () => {
  it("visible=false → transparan DAN tembus ketukan", () => {
    const html = renderToStaticMarkup(
      createElement(ActionRail, { dramaId: "d1", title: "Uji", visible: false }),
    );
    expect(html).toContain("opacity-0");
    expect(html).toContain("pointer-events-none");
  });

  it("default (tanpa prop visible) tetap tampil — pemanggil lama aman", () => {
    const html = renderToStaticMarkup(
      createElement(ActionRail, { dramaId: "d1", title: "Uji" }),
    );
    expect(html).toContain("opacity-100");
  });

  it("ikon ringkas & rapat — rail tidak memanjang menutupi film", () => {
    // Owner 2026-11-12: "untuk komen dan yang lainnya bisa di perkecil lalu di
    // dekatkan jadi tidak terlalu tinggi". Angkanya DIPILIH, bukan kebetulan:
    // 36px kotak sentuh + ikon 20px + jarak 8px antar ikon.
    const html = renderToStaticMarkup(
      createElement(ActionRail, { dramaId: "d1", title: "Uji" }),
    );
    expect(html, "jarak antar ikon melebar lagi").toContain("gap-2 transition-opacity");
    expect(html, "tombol rail membesar lagi ke 44px").not.toContain("h-11 w-11");
    expect(html, "kotak sentuh rail bukan 36px").toContain("h-9 w-9 rounded-full");

    // 🪤 BATAS BAWAH. 36px sudah di bawah ambang sentuh nyaman 44px — itu
    // pertukaran yang owner pilih. Di bawah ±32px jempol mulai sering meleset,
    // dan "Suka" yang meleset ke "Bagikan" membuka panel berbagi tanpa
    // diminta. Mengecilkan lagi menukar tampilan dengan kesalahan tekan.
    for (const kekecilan of ["h-8 w-8 rounded-full", "h-7 w-7 rounded-full"]) {
      expect(html, `tombol rail dikecilkan jadi ${kekecilan}`).not.toContain(
        kekecilan,
      );
    }
  });

  it("🪤 rail TIDAK lagi menggambar tombol volume", () => {
    // Dua tombol volume di satu layar (satu di rail, satu di panel bawah)
    // membuat penonton mengira keduanya mengatur hal yang berbeda. Yang
    // dijaga di sini: TEPAT SATU pintu, dan pintunya ada di panel bawah.
    const html = renderToStaticMarkup(
      createElement(ActionRail, { dramaId: "d1", title: "Uji" }),
    );
    expect(html).not.toContain('aria-label="Volume"');

    // Dicek juga di kodenya: komponen yang masih di-import tapi tak dirender
    // adalah tanda pemindahan yang setengah jalan.
    const SUMBER = readFileSync("app/components/ActionRail.tsx", "utf8");
    const KODE = SUMBER.split("/*")
      .map((b, i) => (i === 0 ? b : b.split("*/").slice(1).join("*/")))
      .join("");
    expect(
      KODE,
      "ActionRail masih memakai VolumeControl — pindahannya setengah jalan",
    ).not.toContain("VolumeControl");
  });
});
