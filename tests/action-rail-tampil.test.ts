// Penjaga rail kanan pemutar drama: memudar saat video berputar (kontrol
// tersembunyi) dan punya tombol Volume. Kalau `visible` lepas, rail menutupi
// film terus-menerus; kalau pointer-events tak ikut mati, rail yang tak
// terlihat masih menelan ketukan penonton — dua-duanya senyap.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const { default: ActionRail } = await import("../app/components/ActionRail");

const sound = { volume: 0.5, muted: false, onChange: () => {} };

describe("ActionRail — sembunyi saat diputar + volume", () => {
  it("visible=false → transparan DAN tembus ketukan", () => {
    const html = renderToStaticMarkup(
      createElement(ActionRail, { dramaId: "d1", title: "Uji", visible: false, sound }),
    );
    expect(html).toContain("opacity-0");
    expect(html).toContain("pointer-events-none");
  });

  it("default (tanpa prop visible) tetap tampil — pemanggil lama aman", () => {
    const html = renderToStaticMarkup(createElement(ActionRail, { dramaId: "d1", title: "Uji" }));
    expect(html).toContain("opacity-100");
    expect(html).not.toContain('aria-label="Volume"');
  });

  it("prop sound → tombol Volume digambar dengan persennya", () => {
    const html = renderToStaticMarkup(
      createElement(ActionRail, { dramaId: "d1", title: "Uji", sound }),
    );
    expect(html).toContain('aria-label="Volume"');
    expect(html).toContain("50%");
  });
});
