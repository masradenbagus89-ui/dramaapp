// Penjaga DUA pekerjaan 2026-09-26 (putaran kedua):
//
//  A. Halaman daftar video pindah /playly -> /film, dengan redirect PERMANEN
//     supaya tautan yang sudah tersebar & hasil Google tidak mati.
//  B. Penanda VIDEO (JSON-LD) di halaman tonton, supaya Google tahu isi
//     halamannya video — bukan tulisan biasa.
//
// Keduanya punya jenis kerusakan yang sama: SENYAP. Redirect yang hilang tidak
// memunculkan error apa pun di sisi kita — yang rusak adalah tautan di ponsel
// orang lain. Penanda video yang salah bentuk juga tak terlihat di layar sama
// sekali; yang membacanya cuma mesin pencari.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  durasiIso8601,
  toJsonLdScript,
  videoJsonLd,
} from "../lib/structured-data";

// ===========================================================================
// A. ALAMAT PINDAH
// ===========================================================================
describe("halaman daftar video pindah ke /film", () => {
  it("halamannya benar-benar ada di alamat baru", () => {
    const sumber = readFileSync("app/film/page.tsx", "utf-8");
    expect(sumber).toContain("export default async function PlaylyPage");
  });

  it("canonical-nya ikut pindah, bukan tertinggal di alamat lama", () => {
    // Canonical yang masih menunjuk /playly memberi tahu Google "alamat
    // resminya yang lama" — persis kebalikan dari maksud pemindahan ini, dan
    // Google akan terus menampilkan alamat lama di hasil pencarian.
    const sumber = readFileSync("app/film/page.tsx", "utf-8");
    expect(sumber).toContain('canonical: "/film"');
    expect(sumber).not.toContain('canonical: "/playly"');
  });

  it("navigasi mengenali /film, bukan /playly", async () => {
    const { punyaNavbarAtas } = await import("../lib/navigasi-halaman");
    expect(
      punyaNavbarAtas("/film"),
      "/film tak punya navbar — penonton yang mendarat dari Google terkurung " +
        "tanpa jalan ke katalog",
    ).toBe(true);
  });

  it("tak ada lagi tautan penonton yang menunjuk /playly", () => {
    // Endpoint API & panel admin SENGAJA tidak ikut pindah, jadi yang
    // diperiksa hanya bentuk tautan halaman (`href`).
    for (const berkas of [
      "lib/beranda-video.ts",
      "app/components/beranda/HasilPlayly.tsx",
    ]) {
      const sumber = readFileSync(berkas, "utf-8");
      expect(sumber, `${berkas} masih menautkan ke alamat lama`).not.toMatch(
        /href[:=]\s*["'{]?\/playly["'}]/,
      );
    }
  });
});

describe("tautan lama TIDAK boleh mati — redirect permanen", () => {
  const konfig = readFileSync("next.config.ts", "utf-8");

  it("memasang pengalihan /playly -> /film", () => {
    expect(
      konfig,
      "redirect hilang — SEMUA tautan /playly yang sudah dibagikan dan " +
        "sudah terindeks Google berubah jadi 404 seketika, dan kita tidak " +
        "tahu siapa saja yang menyimpannya",
    ).toMatch(/source:\s*["']\/playly["']/);
    expect(konfig).toMatch(/destination:\s*["']\/film["']/);
  });

  it("pengalihannya PERMANEN, bukan sementara", () => {
    // permanent: true = HTTP 308. Itulah yang memberi tahu Google "halaman
    // ini PINDAH" sehingga nilai pencarian alamat lama ikut berpindah.
    // Dengan sementara (307), Google menahan nilainya di alamat lama.
    const blok = konfig.slice(konfig.indexOf("async redirects()"));
    expect(blok).toMatch(/permanent:\s*true/);
    expect(blok).not.toMatch(/permanent:\s*false/);
  });

  it("alamat panel admin & API SENGAJA tidak ikut dipindah", () => {
    // Pagar arah sebaliknya: kalau suatu saat ada yang "merapikan" dengan
    // memindahkan semuanya, panel admin dan seluruh pemanggil API ikut putus.
    const blok = konfig.slice(konfig.indexOf("async redirects()"));
    expect(blok).not.toContain("/api/playly");
    expect(blok).not.toContain("/admin/videos/playly");
  });
});

// ===========================================================================
// B. PENANDA VIDEO UNTUK GOOGLE
// ===========================================================================
describe("durasiIso8601 — format yang dipahami Google", () => {
  it("mengubah detik jadi bentuk PT…H…M…S", () => {
    expect(durasiIso8601(5506)).toBe("PT1H31M46S"); // 1:31:46, durasi nyata di katalog
    expect(durasiIso8601(1088)).toBe("PT18M8S"); // 18:08
  });

  it("membuang bagian yang nilainya nol", () => {
    expect(durasiIso8601(90)).toBe("PT1M30S");
    expect(durasiIso8601(3600)).toBe("PT1H");
    expect(durasiIso8601(45)).toBe("PT45S");
  });

  it("memulangkan null untuk nilai yang tak masuk akal", () => {
    // "PT0S" adalah pernyataan SALAH tentang videonya. Field yang salah lebih
    // merugikan di mata Google daripada field yang tidak ada.
    for (const buruk of [null, undefined, 0, -10, NaN, Infinity]) {
      expect(durasiIso8601(buruk as number), String(buruk)).toBeNull();
    }
  });
});

describe("videoJsonLd", () => {
  const video = {
    title: "Arcadian",
    thumbnail: "https://contoh.test/sampul.jpg",
    durationSeconds: 5506,
  };
  const URL_HALAMAN = "https://dramaapp.vercel.app/tonton/arcadian-98765";
  const KETERANGAN = "Nonton Arcadian gratis di DramaKu.";

  it("menyatakan halamannya VIDEO, lengkap dengan judul & alamat", () => {
    const data = videoJsonLd(video, URL_HALAMAN, KETERANGAN);
    expect(data["@type"]).toBe("VideoObject");
    expect(data["@context"]).toBe("https://schema.org");
    expect(data.name).toBe("Arcadian");
    expect(data.url).toBe(URL_HALAMAN);
    expect(data.description).toBe(KETERANGAN);
  });

  it("membawa gambar & durasi kalau datanya ada", () => {
    const data = videoJsonLd(video, URL_HALAMAN, KETERANGAN);
    expect(data.thumbnailUrl).toBe("https://contoh.test/sampul.jpg");
    expect(data.duration).toBe("PT1H31M46S");
  });

  it("MENGHILANGKAN field yang datanya kosong, bukan mengisi nilai hampa", () => {
    // Pembanding untuk tes di atas. Aturan yang sama dengan lencana poster:
    // lebih baik diam daripada memajang keterangan yang tak dinilai siapa pun.
    const data = videoJsonLd(
      { title: "Tanpa Apa-apa", thumbnail: null, durationSeconds: null },
      URL_HALAMAN,
      KETERANGAN,
    );
    expect("thumbnailUrl" in data).toBe(false);
    expect("duration" in data).toBe(false);
    // Yang wajib tetap ada.
    expect(data.name).toBe("Tanpa Apa-apa");
  });

  it("TIDAK mengarang tanggal unggah maupun alamat berkas video", () => {
    // BATAS JUJUR yang disengaja. `uploadDate` memang tidak kita punya, dan
    // alamat berkas videonya bertanda tangan + berumur ~6 jam sehingga sudah
    // mati saat Google mengunjunginya. Markup yang menunjuk alamat mati
    // dinilai rusak; tanggal karangan berisiko penalti.
    const data = videoJsonLd(video, URL_HALAMAN, KETERANGAN);
    expect("uploadDate" in data).toBe(false);
    expect("contentUrl" in data).toBe(false);
    expect("embedUrl" in data).toBe(false);
  });

  it("aman ditanam di dalam <script> walau judulnya jahat", () => {
    // Judul datang dari pihak luar. Tanpa escape, "</script>" menutup tag
    // lebih awal lalu menyuntikkan HTML (XSS).
    const jahat = videoJsonLd(
      { ...video, title: '</script><img src=x onerror=alert(1)>' },
      URL_HALAMAN,
      KETERANGAN,
    );
    const teks = toJsonLdScript(jahat);
    expect(teks).not.toContain("</script>");
    expect(teks).not.toContain("<img");
    // Tetap JSON yang sah — escape-nya tidak merusak isinya.
    expect(() => JSON.parse(teks)).not.toThrow();
  });
});

describe("penanda video benar-benar DIPASANG di halaman tonton", () => {
  // Pelajaran 2026-09-23: fungsi bisa sempurna dan teruji sementara nol
  // halaman memakainya — dan build, tsc, serta npm test semuanya diam.
  const sumber = readFileSync("app/tonton/[id]/page.tsx", "utf-8");

  it("halaman tonton mengimpor & merendernya", () => {
    const impor = sumber.match(/^import[\s\S]*?;$/gm)?.join(" ") ?? "";
    expect(impor).toContain("videoJsonLd");
    expect(sumber).toContain('type="application/ld+json"');
    expect(sumber).toContain("videoJsonLd(");
  });

  it("ditanam lewat toJsonLdScript, bukan JSON.stringify polos", () => {
    // JSON.stringify polos TIDAK meng-escape "</script>" — lubang XSS yang
    // sudah ditutup untuk halaman drama, jangan dibuka lagi di sini.
    expect(sumber).toContain("toJsonLdScript(");
    expect(sumber).not.toMatch(/__html:\s*JSON\.stringify/);
  });

  it("keterangan halaman punya SATU sumber untuk Google & penanda", () => {
    // Google membandingkan meta description dengan isi penanda; dua kalimat
    // yang ditulis terpisah pasti menyimpang cepat atau lambat.
    expect(sumber).toContain("const keteranganVideo =");
    expect((sumber.match(/keteranganVideo\(/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});

describe("/film terdaftar di sitemap", () => {
  it("masuk daftar halaman tetap", () => {
    // Halaman ini tak lagi punya tombol di navbar, jadi tanpa sitemap ia
    // praktis tak punya jalan masuk dari luar.
    const sumber = readFileSync("app/sitemap.ts", "utf-8");
    expect(sumber).toMatch(/path:\s*["']\/film["']/);
  });
});
