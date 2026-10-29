// Penjaga kolom komentar lengkap (owner 2026-10-29: *"komentarnya tambahin
// yang lengkap nama, email, website kasih optional juga"*).
//
// Dua di antaranya menyentuh titik risiko, dan di situlah berat berkas ini:
//
//   EMAIL   = data pribadi. Kalau ikut terkirim ke browser, SEMUA pembaca
//             komentar bisa memanennya dari panel jaringan — dan kita
//             terlanjur menulis janji "Email kamu tidak akan ditampilkan"
//             tepat di bawah kolomnya.
//   WEBSITE = alamat yang diketik orang luar lalu DIGAMBAR SEBAGAI TAUTAN.
//             `javascript:` yang lolos ke sini bukan bug biasa: ia tersimpan
//             permanen di database dan menyerang SETIAP pembaca komentar itu.
//
// Keduanya rusak tanpa suara — halaman tetap 200, build tetap hijau.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";

process.env.AUTH_SECRET = "kunci-uji-jangan-dipakai-di-produksi";

const simpanan = vi.hoisted(() => ({ komentar: [] as Record<string, unknown>[] }));

vi.mock("@/lib/store", () => ({
  getCommentsFor: async () => simpanan.komentar,
  addComment: async (_id: string, c: Record<string, unknown>) => {
    simpanan.komentar.unshift(c);
  },
  setCommentsFor: async (_id: string, l: Record<string, unknown>[]) => {
    simpanan.komentar = l;
  },
  isAdminEmail: async () => false,
}));

const { POST, GET } = await import("../app/api/comments/route");
const { bersihkanEmailTamu, bersihkanWebsiteTamu } = await import("../lib/tamu");

function minta(body: unknown, method = "POST", path = "/api/comments") {
  return new NextRequest("http://localhost" + path, {
    method,
    headers: {
      origin: "http://localhost",
      host: "localhost",
      "Content-Type": "application/json",
      "x-forwarded-for": `10.1.0.${Math.floor(Math.random() * 250) + 1}`,
    },
    body: method === "GET" ? undefined : JSON.stringify(body),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}

beforeEach(() => {
  simpanan.komentar = [];
});

// ===========================================================================
// 1. WEBSITE — pagar XSS & spam
// ===========================================================================
describe("bersihkanWebsiteTamu — pagar keamanan", () => {
  it("MENOLAK skema berbahaya", () => {
    // Masing-masing pernah jadi celah XSS nyata di kolom komentar berbagai
    // produk. Varian huruf besar-kecil & spasi ikut diuji karena penyaring
    // berbasis teks berulang kali kalah justru di situ.
    const jahat = [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "  javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
    ];
    for (const x of jahat) {
      expect(
        bersihkanWebsiteTamu(x),
        `"${x}" LOLOS — ini XSS tersimpan: ia menyerang setiap pembaca ` +
          `komentar itu, bukan satu orang`,
      ).toBeNull();
    }
  });

  it("menerima http & https", () => {
    expect(bersihkanWebsiteTamu("https://contoh.com")).toBe("https://contoh.com/");
    expect(bersihkanWebsiteTamu("http://contoh.com/a")).toBe("http://contoh.com/a");
  });

  it("menambahkan https:// untuk yang diketik tanpa skema", () => {
    // Kebiasaan wajar penonton — ditolak berarti kolomnya terasa rusak.
    expect(bersihkanWebsiteTamu("contoh.com")).toBe("https://contoh.com/");
  });

  it("menolak yang jelas bukan alamat situs", () => {
    for (const x of ["", "   ", "bukan alamat", "http://localhost", "@@@"]) {
      expect(bersihkanWebsiteTamu(x), JSON.stringify(x)).toBeNull();
    }
  });

  it("memotong alamat yang kepanjangan", () => {
    const panjang = "https://contoh.com/" + "a".repeat(500);
    const hasil = bersihkanWebsiteTamu(panjang);
    expect(hasil === null || hasil.length <= 220).toBe(true);
  });
});

describe("bersihkanEmailTamu", () => {
  it("menerima email wajar & menurunkan hurufnya", () => {
    expect(bersihkanEmailTamu("Budi@Contoh.Test")).toBe("budi@contoh.test");
  });

  it("menolak yang jelas bukan email, TANPA menolak permintaannya", () => {
    for (const x of ["", "budi", "budi@", "@contoh.test", "a b@c.test"]) {
      expect(bersihkanEmailTamu(x), JSON.stringify(x)).toBeNull();
    }
  });
});

// ===========================================================================
// 2. JALUR PENUH — kolom opsional tidak boleh membuang komentar
// ===========================================================================
describe("komentar dengan kolom lengkap", () => {
  it("menyimpan email & website yang sah", async () => {
    const res = await POST(
      minta({
        dramaId: "d1",
        user: "Budi",
        text: "halo",
        emailKontak: "budi@contoh.test",
        website: "contoh.com",
      }),
    );
    expect(res.status).toBe(200);
    expect(simpanan.komentar[0].emailKontak).toBe("budi@contoh.test");
    expect(simpanan.komentar[0].website).toBe("https://contoh.com/");
  });

  it("KOMENTARNYA TETAP TERSIMPAN walau email/website salah ketik", async () => {
    // Inti "opsional": kolom pelengkap yang bentuknya salah TIDAK boleh
    // membuang isi utama yang sudah susah payah ditulis penonton.
    const res = await POST(
      minta({
        dramaId: "d1",
        user: "Budi",
        text: "isi penting",
        emailKontak: "bukan-email",
        website: "javascript:alert(1)",
      }),
    );
    expect(res.status).toBe(200);
    expect(simpanan.komentar[0].text).toBe("isi penting");
    // Yang salah cukup TIDAK disimpan — bukan disimpan sebagai string kosong,
    // dan terutama bukan disimpan apa adanya.
    expect(simpanan.komentar[0].emailKontak).toBeUndefined();
    expect(simpanan.komentar[0].website).toBeUndefined();
  });

  it("kolom kosong = field tidak ditulis sama sekali", async () => {
    await POST(minta({ dramaId: "d1", user: "Budi", text: "tanpa apa-apa" }));
    expect("emailKontak" in simpanan.komentar[0]).toBe(false);
    expect("website" in simpanan.komentar[0]).toBe(false);
  });
});

// ===========================================================================
// 3. PRIVASI — janji di layar harus benar
// ===========================================================================
describe("email TIDAK pernah sampai ke browser", () => {
  it("GET membuang emailKontak, tapi MEMPERTAHANKAN website", async () => {
    simpanan.komentar.push({
      id: "k1",
      user: "Budi",
      email: "tamu:ffffffffffffffffffffffffffffffff",
      emailKontak: "rahasia@contoh.test",
      website: "https://contoh.com/",
      role: "viewer",
      text: "halo",
      time: new Date().toISOString(),
    });
    const teks = JSON.stringify(
      await (await GET(minta(null, "GET", "/api/comments?dramaId=d1"))).json(),
    );
    expect(
      teks,
      "alamat email penulis ikut terkirim ke browser SEMUA pengunjung — dan " +
        'formulirnya terlanjur berjanji "Email kamu tidak akan ditampilkan"',
    ).not.toContain("rahasia@contoh.test");
    expect(teks).not.toContain("emailKontak");
    // Website memang untuk dipajang — pastikan ia TIDAK ikut terbuang.
    expect(teks).toContain("https://contoh.com/");
  });

  it("balasan POST juga tidak membocorkannya", async () => {
    const res = await POST(
      minta({
        dramaId: "d1",
        user: "Budi",
        text: "halo",
        emailKontak: "rahasia@contoh.test",
      }),
    );
    expect(JSON.stringify(await res.json())).not.toContain("rahasia@contoh.test");
  });
});

// ===========================================================================
// 4. TAMPILAN — pagar yang hanya terlihat di markup
// ===========================================================================
describe("tampilan kolom komentar", () => {
  const SUMBER = readFileSync("app/components/Comments.tsx", "utf-8");

  it("tautan website memakai rel lengkap", () => {
    // nofollow+ugc = anti spam backlink · noopener = anti tabnabbing ·
    // noreferrer = alamat kita tidak bocor. Melepas salah satunya membuka
    // lubang yang berbeda, jadi keempatnya dijaga satu per satu.
    for (const r of ["nofollow", "ugc", "noopener", "noreferrer"]) {
      expect(SUMBER, `rel="${r}" hilang dari tautan website komentar`).toMatch(
        new RegExp(`rel="[^"]*${r}[^"]*"`),
      );
    }
  });

  it("ketiga kolom identitas ditandai OPSIONAL", () => {
    // Owner meminta ketiganya opsional — berbeda dari contoh yang menandai
    // Name & Email dengan bintang WAJIB.
    for (const t of ["Nama (opsional)", "Email (opsional)", "Website (opsional)"]) {
      expect(SUMBER, `kolom "${t}" tidak ada`).toContain(t);
    }
  });

  it("janji privasi tertulis di dekat kolomnya", () => {
    expect(SUMBER).toContain("Email kamu tidak akan ditampilkan");
  });

  it("centang 'simpan di browser' default MATI", () => {
    // Mengingat email orang harus pilihan sadar, bukan nyala diam-diam.
    expect(SUMBER).toMatch(/useState\(false\)[^\n]*\n?/);
    expect(SUMBER).toContain("KUNCI_SIMPAN_TAMU");
    // Dimatikan = yang tersimpan DIHAPUS, bukan ditinggal.
    expect(SUMBER).toContain("localStorage.removeItem(KUNCI_EMAIL_TAMU)");
  });
});

// ===========================================================================
// 5. KAKI SITUS halaman film
// ===========================================================================
describe("kaki situs halaman film", () => {
  const DRAMA = readFileSync("app/drama/[id]/page.tsx", "utf-8");
  const TONTON = readFileSync("app/tonton/[id]/page.tsx", "utf-8");

  it("dipasang di KEDUA halaman film", () => {
    for (const [nama, sumber] of [
      ["drama", DRAMA],
      ["tonton", TONTON],
    ] as const) {
      expect(sumber, `${nama} tanpa kaki situs`).toContain("<KakiFilm");
    }
  });

  it("berada DI LUAR kartu putih & grid dua kolom", () => {
    // Inti permintaan owner: *"biar tidak menyatu dengan yang di atas"*.
    // Kalau `<KakiFilm` berada SEBELUM penutup grid, ia ikut menyempit
    // mengikuti kolom isi dan kehilangan latar gelapnya yang membentang penuh
    // — keluhan yang persis membuatnya diubah. Diperiksa dari URUTAN: kaki
    // situs harus muncul SESUDAH sidebar (anak terakhir grid).
    for (const [nama, sumber] of [
      ["drama", DRAMA],
      ["tonton", TONTON],
    ] as const) {
      const sidebar = sumber.indexOf("<PanelPopuler");
      const kaki = sumber.indexOf("<KakiFilm");
      expect(sidebar, `${nama}: kolom Terpopuler tidak ada`).toBeGreaterThan(-1);
      expect(
        kaki,
        `${nama}: kaki situs digambar di DALAM grid — ia akan menyempit ` +
          `mengikuti kolom isi, bukan membentang selebar layar`,
      ).toBeGreaterThan(sidebar);
    }
  });

  it("kolom pertamanya memuat judul yang sedang dibuka", () => {
    // Mencontoh kaki situs pembanding: tiap halaman menutup dengan teks yang
    // berbeda, bukan paragraf sama yang diulang di seluruh situs (yang juga
    // merugikan di mata mesin pencari).
    expect(DRAMA).toMatch(/judul: `Nonton \$\{drama\.title\}`/);
    expect(TONTON).toMatch(/judul: `Nonton \$\{video\.title\}`/);
  });

  it("memakai FooterSitus yang SUDAH ada, bukan footer kedua", () => {
    // Dua kaki situs = dua tempat yang harus selalu sepakat, dan pasti
    // menyimpang. Repo ini sudah tiga kali kena masalah itu pada KEPALA situs
    // (lihat KepalaKatalog.tsx), jadi jangan diulang di kaki.
    const kaki = readFileSync("app/components/film/KakiFilm.tsx", "utf-8");
    expect(kaki).toContain("beranda/FooterSitus");
    expect(kaki, "KakiFilm merakit kolomnya sendiri").not.toContain("<footer");
  });

  it("landing page TIDAK ikut berubah", () => {
    // `tentang` opsional; tanpa prop itu FooterSitus berperilaku persis
    // seperti sebelumnya. Pagar supaya penambahan ini tak menyenggol `/`.
    const badan = readFileSync(
      "app/components/beranda/BadanKatalog.tsx",
      "utf-8",
    );
    expect(badan).toContain("<FooterSitus genres={genres} />");
  });
});
