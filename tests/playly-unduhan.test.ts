// Penjaga ATURAN provider unduhan video Playly.
//
// KENAPA diuji: dua hal di sini rusak SECARA SENYAP.
//
// 1) PAGAR ALAMAT. Alamat provider dipasang di atribut `href` halaman penonton.
//    Alamat berawalan `javascript:` atau `data:` yang lolos = kode asing
//    berjalan di situs kita (XSS), dan TIDAK ada error apa pun yang muncul —
//    halamannya kelihatan normal. Tes ini mengunci pagar itu tetap tertutup.
//
// 2) JALUR DRAMA IKUT TERSENGGOL. `parseDownloadProviders` dipakai bersama oleh
//    halaman detail drama. Kelonggaran "kualitas boleh kosong" yang dibuat
//    untuk Playly TIDAK boleh menular ke sana: kalau menular, baris drama yang
//    dulu dibuang mulai bermunculan di modal tanpa ada yang mengubahnya.
import { describe, it, expect } from "vitest";
import { parseDownloadProviders, type DownloadProvider } from "../lib/types";
import {
  bacaPetaUnduhanPlayly,
  tempelUnduhanPlayly,
} from "../lib/playly-unduhan";

const SAH = {
  name: "Telegram",
  quality: "1080p",
  url: "https://t.me/contoh/1",
};

describe("parseDownloadProviders — pagar alamat (berlaku dua jalur)", () => {
  it("menolak skema javascript: dan data:", () => {
    const hasil = parseDownloadProviders(
      [
        { name: "Jahat", quality: "1080p", url: "javascript:alert(1)" },
        { name: "Jahat2", quality: "1080p", url: "data:text/html,<script>" },
        SAH,
      ],
      { kualitasOpsional: true },
    );
    expect(hasil.map((p) => p.name)).toEqual(["Telegram"]);
  });

  it("menolak alamat relatif & teks bukan alamat", () => {
    const hasil = parseDownloadProviders(
      [
        { name: "A", url: "/unduh/1" },
        { name: "B", url: "bukan alamat" },
        { name: "C", url: "" },
      ],
      { kualitasOpsional: true },
    );
    expect(hasil).toEqual([]);
  });

  it("membuang baris tanpa nama, walau alamatnya sah", () => {
    const hasil = parseDownloadProviders(
      [{ name: "   ", url: "https://contoh.test/a" }],
      { kualitasOpsional: true },
    );
    expect(hasil).toEqual([]);
  });

  it("field asing di body TIDAK ikut tersimpan (anti mass assignment)", () => {
    const [p] = parseDownloadProviders(
      [{ ...SAH, isAdmin: true, __proto__: { jahat: 1 } }],
      { kualitasOpsional: true },
    );
    expect(Object.keys(p).sort()).toEqual(["name", "quality", "url"]);
  });
});

describe("parseDownloadProviders — kualitas: dua jalur, dua aturan", () => {
  it("TANPA opsi (jalur DRAMA): baris tanpa kualitas tetap DIBUANG", () => {
    // Inilah perilaku lama halaman detail drama. Kalau tes ini merah, artinya
    // kelonggaran Playly bocor ke drama.
    const hasil = parseDownloadProviders([
      { name: "Mega", url: "https://mega.test/a" },
    ]);
    expect(hasil).toEqual([]);
  });

  it("DENGAN kualitasOpsional (jalur PLAYLY): baris tanpa kualitas DITERIMA", () => {
    const hasil = parseDownloadProviders(
      [{ name: "Mega", url: "https://mega.test/a" }],
      { kualitasOpsional: true },
    );
    expect(hasil).toHaveLength(1);
    expect(hasil[0].name).toBe("Mega");
    // Tidak disimpan sebagai string kosong — "tidak tahu" bukan "kosong".
    expect(hasil[0].quality).toBeUndefined();
  });

  it("kualitas yang memang diisi tetap terbawa apa adanya", () => {
    const hasil = parseDownloadProviders([SAH], { kualitasOpsional: true });
    expect(hasil[0].quality).toBe("1080p");
  });
});

describe("bacaPetaUnduhanPlayly — isi dokumen = data tak-tepercaya", () => {
  it("memetakan videoId -> daftar provider yang sudah disaring", () => {
    const peta = bacaPetaUnduhanPlayly({
      "vid-1": [SAH, { name: "Mega", url: "https://mega.test/a" }],
    });
    expect(peta["vid-1"].map((p) => p.name)).toEqual(["Telegram", "Mega"]);
  });

  it("video yang SEMUA barisnya ditolak tidak menyisakan entri kosong", () => {
    // Entri kosong = tombol DOWNLOAD membuka panel nol baris. Yang benar:
    // video itu dianggap "belum diisi" dan tombolnya kembali ke perilaku lama.
    const peta = bacaPetaUnduhanPlayly({
      "vid-1": [{ name: "Jahat", url: "javascript:alert(1)" }],
    });
    expect(Object.keys(peta)).toEqual([]);
  });

  it("bentuk dokumen yang salah tidak membuat apa pun meledak", () => {
    expect(bacaPetaUnduhanPlayly(null)).toEqual({});
    expect(bacaPetaUnduhanPlayly("teks")).toEqual({});
    expect(bacaPetaUnduhanPlayly([SAH])).toEqual({});
    expect(bacaPetaUnduhanPlayly({ "vid-1": "bukan array" })).toEqual({});
  });

  it("kunci __proto__ tidak mencemari objek hasilnya", () => {
    const peta = bacaPetaUnduhanPlayly(
      JSON.parse('{"__proto__": [{"name":"X","url":"https://a.test/b"}]}'),
    );
    expect(Object.keys(peta)).toEqual([]);
    // Yang paling berbahaya: objek LAIN ikut punya field yang tak pernah ditulis.
    expect(({} as Record<string, unknown>).name).toBeUndefined();
    expect(Array.isArray(Object.getPrototypeOf(peta))).toBe(false);
  });
});

describe("tempelUnduhanPlayly — provider menempel ke video yang BENAR", () => {
  // Bentuk paling sempit yang diterima fungsinya: cukup `id` + field opsional
  // tempat hasilnya ditaruh. Sengaja BUKAN PlaylyVideoPublik utuh — mengimpor
  // tipe itu menyeret modul server-only ke dalam tes fungsi murni.
  type VideoUji = { id: string; downloadProviders?: DownloadProvider[] };
  const videos: VideoUji[] = [{ id: "vid-1" }, { id: "vid-2" }];

  it("hanya video yang punya entri yang dapat daftar provider", () => {
    const peta = bacaPetaUnduhanPlayly({ "vid-2": [SAH] });
    const hasil = tempelUnduhanPlayly(videos, peta);

    // Salah-tempel = penonton menekan DOWNLOAD di video A dan mendapat berkas
    // video B. Tidak ada error, tidak ada yang melapor.
    expect(hasil[0].downloadProviders).toBeUndefined();
    expect(hasil[1].downloadProviders?.[0].url).toBe("https://t.me/contoh/1");
  });

  it("peta kosong = semua video dibiarkan apa adanya", () => {
    const hasil = tempelUnduhanPlayly(videos, {});
    expect(hasil.every((v) => v.downloadProviders === undefined)).toBe(true);
  });

  it("entri untuk video yang sudah tidak ada diabaikan diam-diam", () => {
    const peta = bacaPetaUnduhanPlayly({ "sudah-dihapus": [SAH] });
    const hasil = tempelUnduhanPlayly(videos, peta);
    expect(hasil).toHaveLength(2);
    expect(hasil.every((v) => v.downloadProviders === undefined)).toBe(true);
  });

  it("video lain TIDAK ikut berubah objeknya (tidak ada efek samping)", () => {
    const peta = bacaPetaUnduhanPlayly({ "vid-2": [SAH] });
    const hasil = tempelUnduhanPlayly(videos, peta);
    expect(hasil[0]).toBe(videos[0]);
    expect(videos[1]).not.toHaveProperty("downloadProviders");
  });
});
