// Penjaga ALAMAT halaman tonton — perakit & pembacanya wajib selalu cocok.
//
// Kenapa ini yang paling mahal kalau salah: alamat yang sudah dibagikan
// penonton ke WhatsApp dan sudah terindeks Google TIDAK bisa ditarik kembali.
// Perakit yang bergeser sedikit dari pembacanya membuat seluruh tautan lama
// membalas 404, dan tidak ada error apa pun di sisi kita yang melaporkannya.
import { describe, it, expect } from "vitest";
import { alamatTonton, cariVideoDariSegmen, slugJudul } from "../lib/tonton";

const video = (id: string, title: string) => ({ id, title });

describe("slugJudul", () => {
  it("mengubah judul jadi potongan alamat yang bersih", () => {
    expect(slugJudul("Napi Baru, Jurus Master")).toBe("napi-baru-jurus-master");
  });

  it("membuang emoji dan huruf non-latin, bukan menyandikannya", () => {
    // Judul NYATA dari katalog produksi 2026-09-26.
    expect(slugJudul("🔥 KONG VS EVERY TITAN (2026) 🦍💥")).toBe(
      "kong-vs-every-titan-2026",
    );
    expect(slugJudul("Me ordenaron matar a la Reina Alienígena")).toBe(
      "me-ordenaron-matar-a-la-reina-alien-gena",
    );
  });

  it("tidak meninggalkan tanda hubung menggantung di ujung", () => {
    expect(slugJudul("--- Halo ---")).toBe("halo");
    // Judul panjang dipotong di tengah kata; ujungnya tetap harus bersih.
    const panjang = slugJudul("a".repeat(58) + " bcdefgh");
    expect(panjang.endsWith("-")).toBe(false);
  });

  it("judul yang habis tersaring memulangkan kosong (keadaan SAH)", () => {
    expect(slugJudul("🔥💥😱")).toBe("");
  });
});

describe("alamatTonton", () => {
  it("merangkai judul + id", () => {
    expect(alamatTonton(video("98765", "Arcadian"))).toBe(
      "/tonton/arcadian-98765",
    );
  });

  it("jatuh ke id saja kalau judulnya tidak menyisakan huruf", () => {
    expect(alamatTonton(video("98765", "🔥💥"))).toBe("/tonton/98765");
  });
});

describe("cariVideoDariSegmen — kebalikan alamatTonton", () => {
  const daftar = [
    video("123", "Judul A"),
    video("9123", "Judul B"),
    video("abc-def", "Judul Berhubung"),
    video("kosong", "🔥💥"),
  ];

  it("menemukan kembali tiap video dari alamat yang dirakit sendiri", () => {
    // Inilah inti berkas ini: apa pun yang dirakit perakit HARUS terbaca
    // pembaca. Diuji untuk SELURUH daftar, bukan satu contoh.
    for (const v of daftar) {
      const segmen = alamatTonton(v).replace("/tonton/", "");
      expect(cariVideoDariSegmen(daftar, segmen)?.id, v.title).toBe(v.id);
    }
  });

  it("id yang memuat tanda hubung tetap terbaca utuh", () => {
    // Jebakan yang dihindari: memotong di tanda hubung TERAKHIR akan membaca
    // id "abc-def" jadi "def" dan videonya hilang walau alamatnya benar.
    expect(cariVideoDariSegmen(daftar, "judul-berhubung-abc-def")?.id).toBe(
      "abc-def",
    );
  });

  it("memilih id TERPANJANG saat satu id jadi akhiran id lain", () => {
    // "123" adalah akhiran "9123". Yang benar adalah yang panjang — itulah
    // yang dirakit alamatTonton untuk Judul B.
    expect(cariVideoDariSegmen(daftar, "judul-b-9123")?.id).toBe("9123");
    // Pembanding: alamat milik Judul A tetap mendarat di "123".
    expect(cariVideoDariSegmen(daftar, "judul-a-123")?.id).toBe("123");
  });

  it("memulangkan null untuk alamat asing, bukan menebak yang terdekat", () => {
    // GERBANG: pemanggil mengubah null jadi 404. Kalau fungsi ini menebak,
    // penonton bisa mendarat di video yang bukan miliknya.
    expect(cariVideoDariSegmen(daftar, "video-yang-tidak-ada-999")).toBeNull();
    expect(cariVideoDariSegmen(daftar, "")).toBeNull();
    expect(cariVideoDariSegmen([], "judul-a-123")).toBeNull();
  });

  it("TIDAK cocok kalau id cuma kebetulan jadi bagian tengah alamat", () => {
    // "123" ada di dalam "x123y", tapi itu bukan alamat video ini.
    expect(cariVideoDariSegmen(daftar, "judul-x123y")).toBeNull();
  });
});
