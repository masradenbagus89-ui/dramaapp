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
// DUA BENTUK yang didukung, keduanya kontrak dari potongan kode yang diserahkan
// owner 2026-11-06 (bukan dari balasan Playly yang pernah terlihat terisi):
//   putaran 1  `resolusi: string[]`          -- tulisan tombol = nilainya sendiri
//   putaran 2  `pilihan: {res,label}[]`      -- tulisan BOLEH beda dari nilainya
// Per hari itu `unduh` masih null di semua video kita (diperiksa langsung ke
// /api/public-video: 200 video, lalu 40 video lagi sesudah putaran 2 masuk), jadi
// berkas inilah satu-satunya tempat bentuk TERISI pernah dijalankan. Kalau suatu
// saat ada contoh NYATA dari Playly, tambahkan di sini apa adanya — jangan hapus
// yang lama.
import { describe, it, expect } from "vitest";
import {
  PILIHAN_MAKS,
  bacaUnduhLangsung,
  labelTombolUnduhPlayly,
  urlUnduhResolusi,
  warnaTombolUnduhPlayly,
} from "../lib/playly-unduh-langsung";

const DOMAIN = ["playly-hosting-video.up.railway.app", "playly-dashboard.vercel.app"];
const BASE = "https://playly-hosting-video.up.railway.app";
const OPSI = { domainPlayly: DOMAIN, baseUrl: BASE };

/** Balasan /api/public-video versi pendek — hanya field yang dibaca penyaring. */
function balasan(unduh: unknown): Record<string, unknown> {
  return { ok: true, id: 1788093325344, title: "Video Uji", unduh };
}

describe("bacaUnduhLangsung — bentuk putaran 1 (`resolusi`)", () => {
  it("alamat lengkap + daftar resolusi -> alasan 'ada', tulisan = nilainya sendiri", () => {
    const hasil = bacaUnduhLangsung(
      balasan({ url: `${BASE}/unduh/1788093325344`, resolusi: ["480p", "720p", "asli"] }),
      OPSI,
    );
    expect(hasil.alasan).toBe("ada");
    expect(hasil.unduh).toEqual({
      url: `${BASE}/unduh/1788093325344`,
      pilihan: [
        { res: "480p", label: "480p" },
        { res: "720p", label: "720p" },
        { res: "asli", label: "asli" },
      ],
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

  it("nilai res TIDAK diubah huruf besar/kecilnya, tapi kembar tetap jadi satu", () => {
    // Nilai ini DIKIRIM BALIK ke Playly lewat ?res=, jadi mengubahnya berarti
    // meminta sesuatu yang mungkin tak mereka kenali. Yang pertama datang yang
    // dipakai; pembandingan kembarnya mengabaikan huruf besar/kecil.
    const hasil = bacaUnduhLangsung(
      balasan({ url: `${BASE}/unduh/9`, resolusi: [" 480P ", "480p", "720p"] }),
      OPSI,
    );
    expect(hasil.unduh?.pilihan.map((p) => p.res)).toEqual(["480P", "720p"]);
  });

  it("urutan dari Playly DIPERTAHANKAN (bukan diurutkan sendiri)", () => {
    const hasil = bacaUnduhLangsung(
      balasan({ url: `${BASE}/unduh/9`, resolusi: ["asli", "360p", "1080p"] }),
      OPSI,
    );
    expect(hasil.unduh?.pilihan.map((p) => p.res)).toEqual(["asli", "360p", "1080p"]);
  });

  it("isi yang bukan teks / berkarakter aneh dibuang, sisanya tetap dipakai", () => {
    const hasil = bacaUnduhLangsung(
      balasan({
        url: `${BASE}/unduh/9`,
        resolusi: ["480p", 1080, null, "", "720p<script>", "bagus sekali", "1080p-hdr"],
      }),
      OPSI,
    );
    expect(hasil.unduh?.pilihan.map((p) => p.res)).toEqual(["480p", "1080p-hdr"]);
  });

  it(`daftar dipotong di ${PILIHAN_MAKS} tombol`, () => {
    const panjang = ["144p", "240p", "360p", "480p", "720p", "1080p", "1440p", "2160p", "asli", "4k"];
    const hasil = bacaUnduhLangsung(balasan({ url: `${BASE}/unduh/9`, resolusi: panjang }), OPSI);
    expect(hasil.unduh?.pilihan).toHaveLength(PILIHAN_MAKS);
  });
});

describe("bacaUnduhLangsung — bentuk putaran 2 (`pilihan`)", () => {
  it("tulisan tombol boleh BEDA dari nilai yang dikirim ke Playly", () => {
    const hasil = bacaUnduhLangsung(
      balasan({
        url: `${BASE}/unduh/9`,
        pilihan: [
          { res: "orig", label: "Asli" },
          { res: "hd", label: "1080p" },
        ],
      }),
      OPSI,
    );
    expect(hasil.alasan).toBe("ada");
    expect(hasil.unduh?.pilihan).toEqual([
      { res: "orig", label: "Asli" },
      { res: "hd", label: "1080p" },
    ]);
  });

  it("`pilihan` MENANG atas `resolusi` kalau keduanya dikirim", () => {
    const hasil = bacaUnduhLangsung(
      balasan({
        url: `${BASE}/unduh/9`,
        pilihan: [{ res: "orig", label: "Asli" }],
        resolusi: ["480p", "720p"],
      }),
      OPSI,
    );
    expect(hasil.unduh?.pilihan).toEqual([{ res: "orig", label: "Asli" }]);
  });

  it("`pilihan` array KOSONG turun ke `resolusi` (bukan baris tanpa tombol)", () => {
    // Array kosong itu "truthy" di JavaScript, jadi contoh kode owner
    // (`pilihan || resolusi.map(...)`) akan menggambar baris TANPA tombol.
    const hasil = bacaUnduhLangsung(
      balasan({ url: `${BASE}/unduh/9`, pilihan: [], resolusi: ["480p"] }),
      OPSI,
    );
    expect(hasil.unduh?.pilihan).toEqual([{ res: "480p", label: "480p" }]);
  });

  it("`pilihan` yang semua isinya ditolak juga turun ke `resolusi`", () => {
    const hasil = bacaUnduhLangsung(
      balasan({
        url: `${BASE}/unduh/9`,
        pilihan: [{ label: "tanpa res" }, "bukan objek", { res: "ada spasi di sini" }],
        resolusi: ["480p"],
      }),
      OPSI,
    );
    expect(hasil.unduh?.pilihan).toEqual([{ res: "480p", label: "480p" }]);
  });

  it("label kosong/bukan teks -> tulisan tombol jatuh ke nilai res-nya", () => {
    const hasil = bacaUnduhLangsung(
      balasan({
        url: `${BASE}/unduh/9`,
        pilihan: [
          { res: "480p", label: "   " },
          { res: "720p", label: 720 },
          { res: "1080p" },
        ],
      }),
      OPSI,
    );
    expect(hasil.unduh?.pilihan).toEqual([
      { res: "480p", label: "480p" },
      { res: "720p", label: "720p" },
      { res: "1080p", label: "1080p" },
    ]);
  });

  it("label kepanjangan dipotong supaya tabel sempit di HP tak melebar", () => {
    const hasil = bacaUnduhLangsung(
      balasan({
        url: `${BASE}/unduh/9`,
        pilihan: [{ res: "480p", label: "A".repeat(200) }],
      }),
      OPSI,
    );
    expect(hasil.unduh?.pilihan[0].label.length).toBeLessThanOrEqual(24);
  });

  it("label berbaris-baris dirapikan jadi satu baris", () => {
    const hasil = bacaUnduhLangsung(
      balasan({
        url: `${BASE}/unduh/9`,
        pilihan: [{ res: "480p", label: "1080p\n\n  (Asli)" }],
      }),
      OPSI,
    );
    expect(hasil.unduh?.pilihan[0].label).toBe("1080p (Asli)");
  });

  it("res kembar di `pilihan` jadi satu tombol", () => {
    const hasil = bacaUnduhLangsung(
      balasan({
        url: `${BASE}/unduh/9`,
        pilihan: [
          { res: "480p", label: "480p" },
          { res: "480P", label: "480p lagi" },
        ],
      }),
      OPSI,
    );
    expect(hasil.unduh?.pilihan).toEqual([{ res: "480p", label: "480p" }]);
  });

  it(`\`pilihan\` juga dipotong di ${PILIHAN_MAKS} tombol`, () => {
    const panjang = Array.from({ length: 12 }, (_, i) => ({ res: `r${i}`, label: `R${i}` }));
    const hasil = bacaUnduhLangsung(balasan({ url: `${BASE}/unduh/9`, pilihan: panjang }), OPSI);
    expect(hasil.unduh?.pilihan).toHaveLength(PILIHAN_MAKS);
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

  it("kedua daftar ada tapi dua-duanya nol isi sah -> 'tidak-diizinkan'", () => {
    const hasil = bacaUnduhLangsung(
      balasan({ url: `${BASE}/unduh/9`, pilihan: [], resolusi: ["ada spasi"] }),
      OPSI,
    );
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

  it("`pilihan` bukan array -> 'bentuk-tak-dikenali' walau `resolusi` sah", () => {
    // Contoh kode owner memanggil .forEach di atas `pilihan`; bentuk begini akan
    // meledak di sana, jadi di sini ia dilaporkan, bukan dilewati diam-diam.
    const hasil = bacaUnduhLangsung(
      balasan({ url: `${BASE}/unduh/9`, pilihan: { res: "480p" }, resolusi: ["480p"] }),
      OPSI,
    );
    expect(hasil.alasan).toBe("bentuk-tak-dikenali");
  });

  it("kedua daftar hilang -> 'bentuk-tak-dikenali'", () => {
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
  it("'asli' DAN 'Asli' sama-sama ditulis ASLI", () => {
    // Putaran 1 owner mengirim "asli", putaran 2 mengirim label "Asli".
    expect(labelTombolUnduhPlayly("asli")).toBe("DOWNLOAD ASLI");
    expect(labelTombolUnduhPlayly("Asli")).toBe("DOWNLOAD ASLI");
  });

  it("tulisan lain dibiarkan apa adanya (480p tetap huruf kecil)", () => {
    expect(labelTombolUnduhPlayly("480p")).toBe("DOWNLOAD 480p");
    expect(labelTombolUnduhPlayly("1080p (Asli)")).toBe("DOWNLOAD 1080p (Asli)");
  });
});

describe("warnaTombolUnduhPlayly", () => {
  it("yang tajam biru: asli, Asli, 1080p, 720p, 4k", () => {
    for (const r of ["asli", "Asli", "1080p", "720p", "4k"]) {
      expect(warnaTombolUnduhPlayly(r)).toBe("blue");
    }
  });

  it("yang ringan oranye: 480p, 360p, 240p", () => {
    for (const r of ["480p", "360p", "240p"]) {
      expect(warnaTombolUnduhPlayly(r)).toBe("orange");
    }
  });

  it("nilai tak terbaca tetap dapat warna (tombol tak pernah tergambar pucat)", () => {
    expect(warnaTombolUnduhPlayly("entah")).toBe("orange");
  });
});
