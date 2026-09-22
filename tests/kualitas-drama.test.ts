// Penjaga simpanan kualitas video yang ditaruh TERPISAH dari tabel `dramas`
// (lihat alasan lengkapnya di kepala lib/kualitas-drama.ts: akses DDL tertutup
// 2026-09-22, jadi kualitas disimpan sebagai satu dokumen di `app_data`).
//
// Yang diuji di sini fungsi MURNI-nya saja — penyaring isi dokumen dan
// penggabung ke katalog. Bagian yang menyentuh jaringan tidak diuji di sini.
//
// Kenapa penyaringnya penting: dokumen `app_data` TIDAK dijaga CHECK constraint
// database (itu harga yang dibayar karena tak bisa menambah kolom). Satu-satunya
// pagar isinya adalah penyaring ini, jadi kalau ia bocor, poster memajang label
// ngawur dan tak ada error apa pun yang muncul.
import { describe, it, expect } from "vitest";
import { bacaPetaKualitas, gabungKualitas } from "../lib/kualitas-drama";
import type { Drama } from "../lib/types";

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

describe("bacaPetaKualitas — dokumen app_data = data tak-tepercaya", () => {
  it("menerima nilai yang sah apa adanya", () => {
    expect(bacaPetaKualitas({ a: "HD", b: "CAM", c: "WEB-DL" })).toEqual({
      a: "HD",
      b: "CAM",
      c: "WEB-DL",
    });
  });

  it("membuang nilai di luar daftar resmi, bukan meneruskannya", () => {
    expect(
      bacaPetaKualitas({
        a: "HD",
        b: "hd", // beda huruf besar
        c: "SUPER HD",
        d: "",
        e: null,
        f: 7,
        g: { nested: true },
        h: "DROP TABLE dramas",
      }),
    ).toEqual({ a: "HD" });
  });

  it("bentuk dokumen yang sama sekali salah tidak membuat aplikasi jatuh", () => {
    // Dokumen bisa saja diisi alat lain atau rusak; jatuh ke peta kosong = situs
    // tetap tayang tanpa lencana kualitas, bukan halaman error.
    for (const rusak of [null, undefined, "teks", 42, [], [1, 2], true]) {
      expect(bacaPetaKualitas(rusak)).toEqual({});
    }
  });
});

describe("gabungKualitas — menempelkan kualitas ke katalog", () => {
  it("menempel ke drama yang id-nya ada di peta", () => {
    const hasil = gabungKualitas([stub({ id: "a" }), stub({ id: "b" })], {
      a: "CAM",
    });
    expect(hasil[0].quality).toBe("CAM");
    expect(hasil[1].quality).toBeUndefined();
  });

  it("TIDAK menimpa kualitas yang sudah menempel (mode berkas lokal)", () => {
    // data/dramas.json menyimpan `quality` langsung di judulnya, dan di mode itu
    // petanya memang kosong. Satu fungsi melayani dua mode tanpa percabangan.
    const hasil = gabungKualitas([stub({ id: "a", quality: "BluRay" })], {});
    expect(hasil[0].quality).toBe("BluRay");
  });

  it("peta MENANG atas nilai bawaan drama", () => {
    const hasil = gabungKualitas([stub({ id: "a", quality: "BluRay" })], {
      a: "CAM",
    });
    expect(hasil[0].quality).toBe("CAM");
  });

  it("tidak mengubah objek drama aslinya", () => {
    // Katalog dipakai bersama beberapa halaman; mengubah objeknya di tempat
    // membuat perubahan bocor ke pemanggil lain tanpa jejak.
    const asli = stub({ id: "a" });
    const hasil = gabungKualitas([asli], { a: "HD" });
    expect(asli.quality).toBeUndefined();
    expect(hasil[0]).not.toBe(asli);
  });

  it("peta kosong = katalog lewat apa adanya", () => {
    const daftar = [stub({ id: "a" }), stub({ id: "b" })];
    expect(gabungKualitas(daftar, {})).toEqual(daftar);
  });
});
