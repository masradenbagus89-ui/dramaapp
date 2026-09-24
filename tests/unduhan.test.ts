// Penjaga daftar provider unduhan yang ditaruh TERPISAH dari tabel `dramas`
// (alasan lengkapnya di kepala lib/unduhan.ts: akses DDL tertutup 2026-09-22,
// jadi daftarnya disimpan sebagai satu dokumen di `app_data`).
//
// Yang diuji di sini fungsi MURNI-nya saja: penyaring isi dokumen dan
// penggabung ke katalog. Bagian yang menyentuh jaringan tidak diuji di sini.
//
// KENAPA PENYARINGNYA LEBIH PENTING daripada penyaring kualitas: dokumen
// `app_data` tidak dijaga CHECK constraint database, dan isi dokumen INI
// dipasang ke atribut `href` yang diklik penonton. Penyaring yang bocor bukan
// cuma memajang label ngawur — ia menjalankan kode asing di halaman penonton
// (XSS). Tes `javascript:` di bawah adalah inti berkas ini; kalau ia merah,
// jangan dilonggarkan.
import { describe, it, expect } from "vitest";
import { parseDownloadProviders, type Drama } from "../lib/types";
import { bacaPetaUnduhan, gabungUnduhan } from "../lib/unduhan";

const SAH = {
  name: "Telegram",
  quality: "480p",
  url: "https://t.me/contoh",
};

function stub(partial: Partial<Drama> & Pick<Drama, "id">): Drama {
  return {
    title: "Drama",
    category: "Action",
    episodes: 10,
    views: "0",
    synopsis: "",
    gradient: "from-zinc-800 to-black",
    ...partial,
  };
}

describe("parseDownloadProviders — alamat: PAGAR KEAMANAN, bukan kerapian", () => {
  it("menolak javascript: — kalau lolos, ini XSS di halaman penonton", () => {
    expect(
      parseDownloadProviders([
        { name: "Jahat", quality: "1080p", url: "javascript:alert(1)" },
      ]),
    ).toEqual([]);
  });

  it("menolak juga skema lain yang bisa dieksekusi/disamarkan", () => {
    const skema = [
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "file:///C:/Windows/system32",
      "  JavaScript:alert(1)",
      "//tanpa-skema.example.com/berkas.mp4",
      "t.me/tanpa-skema",
    ];
    for (const url of skema) {
      expect(
        parseDownloadProviders([{ name: "X", quality: "1080p", url }]),
      ).toEqual([]);
    }
  });

  it("menerima http dan https apa adanya", () => {
    expect(parseDownloadProviders([SAH])).toEqual([SAH]);
    expect(
      parseDownloadProviders([{ ...SAH, url: "http://contoh.test/a.mp4" }]),
    ).toEqual([{ ...SAH, url: "http://contoh.test/a.mp4" }]);
  });

  it("alamat tutorial disaring dengan aturan yang sama, tanpa menjatuhkan barisnya", () => {
    // Tutorial cuma pelengkap: alamat tutorial yang jahat dibuang, tapi baris
    // providernya sendiri tetap berguna dan tidak ikut dihapus.
    expect(
      parseDownloadProviders([{ ...SAH, tutorialUrl: "javascript:alert(1)" }]),
    ).toEqual([SAH]);
    expect(
      parseDownloadProviders([{ ...SAH, tutorialUrl: "https://youtu.be/x" }]),
    ).toEqual([{ ...SAH, tutorialUrl: "https://youtu.be/x" }]);
  });
});

describe("parseDownloadProviders — kelengkapan baris", () => {
  it("membuang baris tanpa nama atau tanpa kualitas", () => {
    expect(
      parseDownloadProviders([
        { ...SAH, name: "" },
        { ...SAH, name: "   " },
        { ...SAH, quality: "" },
        { name: "Cuma nama", quality: "1080p" },
      ]),
    ).toEqual([]);
  });

  it("bukan array = daftar kosong, bukan error", () => {
    for (const nilai of [null, undefined, {}, "https://a.test", 7, true]) {
      expect(parseDownloadProviders(nilai)).toEqual([]);
    }
  });

  it("isi yang bukan objek di dalam array dilewati, sisanya tetap terpakai", () => {
    expect(parseDownloadProviders([null, "x", 5, SAH])).toEqual([SAH]);
  });

  it("warna di luar daftar resmi diabaikan (tombol jatuh ke biru)", () => {
    expect(
      parseDownloadProviders([{ ...SAH, buttonColor: "merah-ngawur" }]),
    ).toEqual([SAH]);
    expect(
      parseDownloadProviders([{ ...SAH, buttonColor: "orange" }]),
    ).toEqual([{ ...SAH, buttonColor: "orange" }]);
  });

  it("spasi di ujung dirapikan & teks kepanjangan dipotong", () => {
    const hasil = parseDownloadProviders([
      {
        name: "  Mega  ",
        quality: " 1080p ",
        url: "  https://mega.test/a  ",
        note: "x".repeat(400),
      },
    ]);
    expect(hasil[0].name).toBe("Mega");
    expect(hasil[0].quality).toBe("1080p");
    expect(hasil[0].url).toBe("https://mega.test/a");
    expect(hasil[0].note?.length).toBe(300);
  });

  it("catatan kosong tidak disimpan sebagai field kosong", () => {
    expect(parseDownloadProviders([{ ...SAH, note: "   " }])).toEqual([SAH]);
  });
});

describe("bacaPetaUnduhan — dokumen app_data = data tak-tepercaya", () => {
  it("menyaring per drama, bukan memercayai isi dokumen", () => {
    expect(
      bacaPetaUnduhan({
        a: [SAH],
        b: [{ name: "Jahat", quality: "1080p", url: "javascript:alert(1)" }],
        c: "bukan array",
      }),
    ).toEqual({ a: [SAH] });
  });

  it("id yang daftarnya habis disaring TIDAK menyisakan array kosong", () => {
    // Kunci yang ada tapi isinya nol akan membuat tombol DOWNLOAD membuka modal
    // kosong, padahal yang benar jatuh ke perilaku unduh lama.
    const peta = bacaPetaUnduhan({ a: [{ name: "X", quality: "", url: "" }] });
    expect(Object.keys(peta)).toEqual([]);
  });

  it("bukan objek = peta kosong", () => {
    for (const nilai of [null, undefined, [], "x", 7]) {
      expect(bacaPetaUnduhan(nilai)).toEqual({});
    }
  });
});

describe("gabungUnduhan — menempel ke katalog", () => {
  it("menempelkan daftar dari peta app_data", () => {
    const hasil = gabungUnduhan([stub({ id: "a" })], { a: [SAH] });
    expect(hasil[0].downloadProviders).toEqual([SAH]);
  });

  it("drama tanpa entri dibiarkan apa adanya (fallback unduh lama)", () => {
    const hasil = gabungUnduhan([stub({ id: "b" })], { a: [SAH] });
    expect(hasil[0].downloadProviders).toBeUndefined();
  });

  it("mode file lokal: daftar yang sudah menempel di drama tetap dipakai", () => {
    const hasil = gabungUnduhan([stub({ id: "a", downloadProviders: [SAH] })], {});
    expect(hasil[0].downloadProviders).toEqual([SAH]);
  });

  it("daftar yang sudah menempel pun DISARING, bukan diteruskan", () => {
    // data/dramas.json ikut tayang di produksi saat Supabase tak terjangkau
    // (getAllDramasCachedSafe), jadi salah ketik di sana bisa sampai ke href.
    const jahat = [
      { name: "Jahat", quality: "1080p", url: "javascript:alert(1)" },
    ] as unknown as Drama["downloadProviders"];
    const hasil = gabungUnduhan(
      [stub({ id: "a", downloadProviders: jahat })],
      {},
    );
    expect(hasil[0].downloadProviders).toBeUndefined();
    expect("downloadProviders" in hasil[0]).toBe(false);
  });

  it("peta menang atas daftar yang menempel di drama", () => {
    const dariPeta = { ...SAH, name: "Mega", url: "https://mega.test/a" };
    const hasil = gabungUnduhan([stub({ id: "a", downloadProviders: [SAH] })], {
      a: [dariPeta],
    });
    expect(hasil[0].downloadProviders).toEqual([dariPeta]);
  });

  it("tidak mengubah objek drama aslinya (bikin salinan)", () => {
    const asli = stub({ id: "a" });
    gabungUnduhan([asli], { a: [SAH] });
    expect(asli.downloadProviders).toBeUndefined();
  });
});
