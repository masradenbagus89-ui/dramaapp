// Penjaga ATURAN "unduh langsung dari Playly" (lib/playly-unduh-langsung.ts).
//
// KENAPA diuji seketat ini walau fiturnya belum kelihatan: isi `unduh` datang
// dari pihak LUAR dan berakhir di atribut `href` penonton. Dua kerusakannya
// sama-sama SENYAP — tak ada error, tak ada yang melapor:
//   (a) alamat domain asing lolos  -> penonton diantar ke situs orang lain dari
//       dalam popup DramaKu;
//   (b) bentuk yang tak dikenali disamakan dengan "tidak ada unduhan" -> kalau
//       kelak Playly mengubah kontraknya, barisnya cuma hilang tanpa sebab.
//
// Per 2026-11-06 field `unduh` masih null di 200 dari 200 video kita (diperiksa
// langsung ke /api/public-video), jadi tes inilah satu-satunya tempat bentuk
// terisinya pernah dijalankan. Kalau suatu saat ada contoh NYATA dari Playly,
// tambahkan di sini apa adanya — jangan hapus yang lama.
import { describe, it, expect } from "vitest";
import {
  RESOLUSI_MAKS,
  bacaUnduhLangsung,
  labelTombolUnduhPlayly,
  urlUnduhResolusi,
  warnaTombolResolusi,
} from "../lib/playly-unduh-langsung";

const DOMAIN = ["playly-hosting-video.up.railway.app", "playly-dashboard.vercel.app"];
const BASE = "https://playly-hosting-video.up.railway.app";
const OPSI = { domainPlayly: DOMAIN, baseUrl: BASE };

/** Balasan /api/public-video versi pendek — hanya field yang dibaca penyaring. */
function balasan(unduh: unknown): Record<string, unknown> {
  return { ok: true, id: 1788093325344, title: "Video Uji", unduh };
}

describe("bacaUnduhLangsung — bentuk yang DITERIMA", () => {
  it("alamat lengkap + daftar resolusi -> alasan 'ada'", () => {
    const hasil = bacaUnduhLangsung(
      balasan({ url: `${BASE}/unduh/1788093325344`, resolusi: ["480p", "720p", "asli"] }),
      OPSI,
    );
    expect(hasil.alasan).toBe("ada");
    expect(hasil.unduh).toEqual({
      url: `${BASE}/unduh/1788093325344`,
      resolusi: ["480p", "720p", "asli"],
    });
  });

  it("alamat RELATIF dilengkapi dengan alamat dasar Playly", () => {
    // Playly memang mengirim bentuk relatif di field lain ("/id/{id}/embed"),
    // jadi "/unduh/123" wajar muncul dan tidak boleh dibuang.
    const hasil = bacaUnduhLangsung(
      balasan({ url: "/unduh/1788093325344", resolusi: ["480p"] }),
      OPSI,
    );
    expect(hasil.unduh?.url).toBe(`${BASE}/unduh/1788093325344`);
  });

  it("subdomain Playly ikut diterima", () => {
    const hasil = bacaUnduhLangsung(
      balasan({ url: "https://cdn.playly-hosting-video.up.railway.app/unduh/9", resolusi: ["480p"] }),
      OPSI,
    );
    expect(hasil.alasan).toBe("ada");
  });

  it("resolusi dirapikan: huruf besar -> kecil, spasi dibuang, kembar jadi satu", () => {
    const hasil = bacaUnduhLangsung(
      balasan({ url: `${BASE}/unduh/9`, resolusi: [" 480P ", "480p", "720p"] }),
      OPSI,
    );
    expect(hasil.unduh?.resolusi).toEqual(["480p", "720p"]);
  });

  it("urutan dari Playly DIPERTAHANKAN (bukan diurutkan sendiri)", () => {
    const hasil = bacaUnduhLangsung(
      balasan({ url: `${BASE}/unduh/9`, resolusi: ["asli", "360p", "1080p"] }),
      OPSI,
    );
    expect(hasil.unduh?.resolusi).toEqual(["asli", "360p", "1080p"]);
  });

  it("isi yang bukan teks / berkarakter aneh dibuang, sisanya tetap dipakai", () => {
    const hasil = bacaUnduhLangsung(
      balasan({
        url: `${BASE}/unduh/9`,
        resolusi: ["480p", 1080, null, "", "720p<script>", "bagus sekali", "asli"],
      }),
      OPSI,
    );
    expect(hasil.unduh?.resolusi).toEqual(["480p", "asli"]);
  });

  it(`daftar resolusi dipotong di ${RESOLUSI_MAKS} tombol`, () => {
    const panjang = ["144p", "240p", "360p", "480p", "720p", "1080p", "1440p", "2160p", "asli", "4k"];
    const hasil = bacaUnduhLangsung(balasan({ url: `${BASE}/unduh/9`, resolusi: panjang }), OPSI);
    expect(hasil.unduh?.resolusi).toHaveLength(RESOLUSI_MAKS);
  });
});

describe("bacaUnduhLangsung — Playly bilang TIDAK BOLEH (keadaan normal hari ini)", () => {
  it("unduh: null -> 'tidak-diizinkan', bukan dianggap kontrak rusak", () => {
    const hasil = bacaUnduhLangsung(balasan(null), OPSI);
    expect(hasil).toEqual({ alasan: "tidak-diizinkan", unduh: null });
  });

  it("alamat sah tapi NOL resolusi -> 'tidak-diizinkan'", () => {
    const hasil = bacaUnduhLangsung(balasan({ url: `${BASE}/unduh/9`, resolusi: [] }), OPSI);
    expect(hasil).toEqual({ alasan: "tidak-diizinkan", unduh: null });
  });
});

describe("bacaUnduhLangsung — alamat yang WAJIB DITOLAK (keamanan)", () => {
  const ditolak: Array<[string, unknown]> = [
    ["domain asing", "https://jahat.example/unduh/9"],
    ["domain yang cuma MIRIP", "https://playly-hosting-video.up.railway.app.jahat.example/unduh/9"],
    ["induk Railway tanpa subdomain Playly", "https://lain.up.railway.app/unduh/9"],
    ["http (bukan https)", "http://playly-hosting-video.up.railway.app/unduh/9"],
    ["javascript:", "javascript:alert(1)"],
    ["data:", "data:text/html,<script>alert(1)</script>"],
    ["protokol-relatif", "//playly-hosting-video.up.railway.app/unduh/9"],
    ["bukan teks", 12345],
    ["teks kosong", "   "],
  ];

  for (const [nama, url] of ditolak) {
    it(`${nama} -> 'bentuk-tak-dikenali', unduh null`, () => {
      const hasil = bacaUnduhLangsung(balasan({ url, resolusi: ["480p"] }), OPSI);
      expect(hasil).toEqual({ alasan: "bentuk-tak-dikenali", unduh: null });
    });
  }

  it("daftar domain KOSONG = tolak semua (gagal-AMAN, bukan gagal-terbuka)", () => {
    const hasil = bacaUnduhLangsung(
      balasan({ url: `${BASE}/unduh/9`, resolusi: ["480p"] }),
      { domainPlayly: [], baseUrl: BASE },
    );
    expect(hasil.unduh).toBeNull();
  });
});

describe("bacaUnduhLangsung — bentuk DI LUAR kontrak dilaporkan apa adanya", () => {
  it("field `unduh` HILANG dari balasan -> 'bentuk-tak-dikenali'", () => {
    // Dibedakan tegas dari `unduh: null`. Per 2026-11-06 field ini selalu ikut
    // terkirim, jadi hilangnya = kontrak Playly berubah dan kita harus tahu.
    const hasil = bacaUnduhLangsung({ ok: true, id: 9, title: "Tanpa field" }, OPSI);
    expect(hasil.alasan).toBe("bentuk-tak-dikenali");
  });

  const bukanObjek: Array<[string, unknown]> = [
    ["balasan null", null],
    ["balasan teks", "ok"],
    ["balasan array", [{ url: `${BASE}/unduh/9` }]],
  ];
  for (const [nama, nilai] of bukanObjek) {
    it(`${nama} -> 'bentuk-tak-dikenali'`, () => {
      expect(bacaUnduhLangsung(nilai, OPSI).alasan).toBe("bentuk-tak-dikenali");
    });
  }

  it("`unduh` berupa teks (bukan objek) -> 'bentuk-tak-dikenali'", () => {
    expect(bacaUnduhLangsung(balasan(`${BASE}/unduh/9`), OPSI).alasan).toBe(
      "bentuk-tak-dikenali",
    );
  });

  it("`resolusi` bukan array -> 'bentuk-tak-dikenali'", () => {
    const hasil = bacaUnduhLangsung(balasan({ url: `${BASE}/unduh/9`, resolusi: "480p" }), OPSI);
    expect(hasil.alasan).toBe("bentuk-tak-dikenali");
  });

  it("`resolusi` hilang -> 'bentuk-tak-dikenali'", () => {
    expect(bacaUnduhLangsung(balasan({ url: `${BASE}/unduh/9` }), OPSI).alasan).toBe(
      "bentuk-tak-dikenali",
    );
  });
});

describe("urlUnduhResolusi", () => {
  it("menempelkan ?res=", () => {
    expect(urlUnduhResolusi(`${BASE}/unduh/9`, "480p")).toBe(`${BASE}/unduh/9?res=480p`);
  });

  it("alamat yang SUDAH punya query tidak jadi rusak (bukan '?v=2?res=')", () => {
    expect(urlUnduhResolusi(`${BASE}/unduh/9?v=2`, "720p")).toBe(
      `${BASE}/unduh/9?v=2&res=720p`,
    );
  });

  it("res yang sudah ada DIGANTI, tidak ditumpuk", () => {
    expect(urlUnduhResolusi(`${BASE}/unduh/9?res=360p`, "asli")).toBe(
      `${BASE}/unduh/9?res=asli`,
    );
  });

  it("alamat tak sah dikembalikan apa adanya, tidak melempar", () => {
    expect(urlUnduhResolusi("bukan-alamat", "480p")).toBe("bukan-alamat");
  });
});

describe("labelTombolUnduhPlayly", () => {
  it("'asli' ditulis ASLI supaya terbaca sebagai pilihan", () => {
    expect(labelTombolUnduhPlayly("asli")).toBe("DOWNLOAD ASLI");
  });

  it("resolusi lain dibiarkan apa adanya (480p tetap huruf kecil)", () => {
    expect(labelTombolUnduhPlayly("480p")).toBe("DOWNLOAD 480p");
  });
});

describe("warnaTombolResolusi", () => {
  it("yang tajam biru: asli, 1080p, 720p, 4k", () => {
    for (const r of ["asli", "1080p", "720p", "4k"]) {
      expect(warnaTombolResolusi(r)).toBe("blue");
    }
  });

  it("yang ringan oranye: 480p, 360p, 240p", () => {
    for (const r of ["480p", "360p", "240p"]) {
      expect(warnaTombolResolusi(r)).toBe("orange");
    }
  });

  it("nilai tak terbaca tetap dapat warna (tombol tak pernah tergambar pucat)", () => {
    expect(warnaTombolResolusi("entah")).toBe("orange");
  });
});
