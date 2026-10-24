// Penjaga permanen untuk header keamanan + CSP (dipasang 2026-10-24).
//
// BUG YANG DIJAGA — temuan audit 2026-10-24 (S-1). Produksi mengirim NOL header
// keamanan: diukur langsung ke host Railway, tidak ada CSP, HSTS,
// X-Frame-Options, X-Content-Type-Options, Referrer-Policy, maupun
// Permissions-Policy.
//
// Tapi penjaga ini menjaga DUA arah, dan arah kedua yang lebih mudah terlupa:
// CSP yang TERLALU KETAT mematikan iklan AdSense dan tombol bayar Midtrans
// TANPA memunculkan error apa pun di layar. Pendapatan berhenti, tak ada yang
// melapor. Jadi tes di bawah mengunci host-host yang WAJIB tetap diizinkan —
// kalau suatu hari ada yang "merapikan" daftarnya dan membuang salah satunya,
// berkas inilah yang berteriak, bukan laporan sponsor di akhir bulan.
import { describe, it, expect } from "vitest";
import nextConfig from "../next.config";

type Header = { key: string; value: string };

async function ambilHeader(): Promise<Header[]> {
  expect(typeof nextConfig.headers).toBe("function");
  const aturan = await nextConfig.headers!();
  expect(aturan.length).toBeGreaterThan(0);
  // Aturan pertama berlaku untuk "/:path*" — seluruh situs.
  expect(aturan[0].source).toBe("/:path*");
  return aturan[0].headers as Header[];
}

function nilai(headers: Header[], key: string): string | undefined {
  return headers.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value;
}

describe("Header keamanan — yang dulu NOL harus ada semua", () => {
  it("keenam header terpasang untuk seluruh jalur", async () => {
    const h = await ambilHeader();
    for (const key of [
      "Strict-Transport-Security",
      "X-Content-Type-Options",
      "X-Frame-Options",
      "Referrer-Policy",
      "Permissions-Policy",
    ]) {
      expect(nilai(h, key), `${key} hilang`).toBeTruthy();
    }
    // CSP boleh dalam salah satu dari dua bentuk: laporkan-saja (tahap
    // sekarang) atau menegakkan (sesudah daftarnya dirapikan dari laporan
    // nyata). Yang TIDAK boleh: dua-duanya hilang.
    const csp =
      nilai(h, "Content-Security-Policy-Report-Only") ??
      nilai(h, "Content-Security-Policy");
    expect(csp, "CSP hilang sama sekali").toBeTruthy();
  });

  it("HSTS TIDAK memakai preload", async () => {
    // `preload` = pendaftaran permanen ke daftar bawaan browser, sangat sulit
    // dicabut. Jangan dipasang selama situs masih di host sementara
    // *.up.railway.app yang memang akan ditinggalkan kalau domain sendiri jadi.
    const v = nilai(await ambilHeader(), "Strict-Transport-Security")!;
    expect(v).toContain("max-age=");
    expect(v).not.toContain("preload");
  });

  it("Permissions-Policy TIDAK mematikan fullscreen & payment", async () => {
    // fullscreen dipakai pemutar video; payment bisa dipakai Midtrans.
    // Mematikan keduanya = fitur hilang diam-diam.
    const v = nilai(await ambilHeader(), "Permissions-Policy")!;
    expect(v).not.toContain("fullscreen=()");
    expect(v).not.toContain("payment=()");
  });

  it("X-Frame-Options SAMEORIGIN, bukan DENY", async () => {
    // DENY juga memblokir halaman kita membingkai dirinya sendiri.
    expect(nilai(await ambilHeader(), "X-Frame-Options")).toBe("SAMEORIGIN");
  });
});

describe("CSP — host yang WAJIB tetap diizinkan (arah 'jangan merusak')", () => {
  async function csp(): Promise<string> {
    const h = await ambilHeader();
    return (
      nilai(h, "Content-Security-Policy-Report-Only") ??
      nilai(h, "Content-Security-Policy")!
    );
  }

  it("AdSense boleh memuat script — kalau hilang, iklan mati diam-diam", async () => {
    expect(await csp()).toContain("pagead2.googlesyndication.com");
  });

  it("Midtrans Snap boleh script DAN frame — kalau hilang, penonton tak bisa bayar", async () => {
    const v = await csp();
    expect(v).toContain("app.midtrans.com");
    // Snap membuka jendela pembayaran di dalam <iframe>; script saja tak cukup.
    const frameSrc = v.split(";").find((d) => d.trim().startsWith("frame-src"));
    expect(frameSrc, "frame-src hilang").toBeTruthy();
    expect(frameSrc).toContain("app.midtrans.com");
  });

  it("sumber video boleh diputar — tunnel PC dan Playly", async () => {
    const mediaSrc = (await csp())
      .split(";")
      .find((d) => d.trim().startsWith("media-src"));
    expect(mediaSrc, "media-src hilang").toBeTruthy();
    expect(mediaSrc).toContain("trycloudflare.com");
    expect(mediaSrc).toContain("amasyaforum.com");
    expect(mediaSrc).toContain("playly-hosting-video.up.railway.app");
  });

  it("style inline diizinkan — tanpa ini seluruh tampilan Tailwind rusak", async () => {
    expect(await csp()).toContain("style-src 'self' 'unsafe-inline'");
  });

  it("gambar poster tidak dipagari ketat — sumbernya berubah tiap admin menambah", async () => {
    const imgSrc = (await csp())
      .split(";")
      .find((d) => d.trim().startsWith("img-src"));
    expect(imgSrc).toContain("https:");
    expect(imgSrc).toContain("data:");
  });
});

describe("CSP — pagar yang harus TETAP ketat", () => {
  async function csp(): Promise<string> {
    const h = await ambilHeader();
    return (
      nilai(h, "Content-Security-Policy-Report-Only") ??
      nilai(h, "Content-Security-Policy")!
    );
  }

  it("default-src dikunci ke 'self', bukan '*'", async () => {
    const v = await csp();
    expect(v).toContain("default-src 'self'");
    expect(v).not.toContain("default-src *");
  });

  it("object-src 'none' — nol plugin lawas", async () => {
    expect(await csp()).toContain("object-src 'none'");
  });

  it("frame-ancestors 'self' — situs ini tak boleh dibingkai orang lain", async () => {
    expect(await csp()).toContain("frame-ancestors 'self'");
  });

  it("script-src TIDAK boleh membuka 'unsafe-eval'", async () => {
    // 'unsafe-inline' terpaksa ada (Next.js menyisipkan script hydration dan
    // project ini belum memakai nonce) — itu dicatat jujur di next.config.ts.
    // Tapi 'unsafe-eval' TIDAK dibutuhkan apa pun di sini, dan membukanya
    // berarti mengizinkan string apa pun dieksekusi sebagai kode.
    const scriptSrc = (await csp())
      .split(";")
      .find((d) => d.trim().startsWith("script-src"));
    expect(scriptSrc).not.toContain("unsafe-eval");
  });

  it("script-src TIDAK boleh memakai wildcard telanjang", async () => {
    // Diperiksa per-TOKEN, bukan per-substring: `https://pagead2...` itu sah,
    // sedangkan `https:` telanjang berarti "script dari host HTTPS mana pun
    // boleh" — nyaris sama longgarnya dengan tidak punya CSP. Versi pertama
    // tes ini memeriksa substring dan salah menuduh daftar yang benar.
    const scriptSrc = (await csp())
      .split(";")
      .find((d) => d.trim().startsWith("script-src"))!;
    const token = scriptSrc.trim().split(/\s+/).slice(1); // buang "script-src"
    for (const longgar of ["*", "https:", "http:", "data:"]) {
      expect(token, `script-src memuat sumber longgar: ${longgar}`).not.toContain(
        longgar,
      );
    }
  });
});
