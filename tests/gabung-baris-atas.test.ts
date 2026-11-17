// Penjaga baris hitam paling atas — owner 2026-11-17: "yang drama tidak
// usah ditaruh di tampilan atas, cukup film saja dan selalu update".
import { describe, it, expect } from "vitest";
import { filmDiLuarBarisAtas, siapkanTampilanDepan } from "../lib/baris-atas";

describe("filmDiLuarBarisAtas", () => {
  it("tidak mengulang film yang sudah ada di baris hitam", () => {
    const film = Array.from({ length: 8 }, (_, i) => ({
      id: `f${i}`,
      title: `Film ${i}`,
      year: "2026",
    }));
    const baris = film.slice(0, 4).map((item) => ({ jenis: "film" as const, item }));
    const sisa = filmDiLuarBarisAtas(film, baris, 20);
    const idDiAtas = new Set(baris.map((b) => b.item.id));

    expect(idDiAtas.size).toBeGreaterThan(0);
    expect(sisa.every((v) => !idDiAtas.has(v.id))).toBe(true);
    expect(sisa.map((v) => v.id)).toEqual(["f4", "f5", "f6", "f7"]);
  });
});

describe("siapkanTampilanDepan", () => {
  const film = (id: string, tahun: string, sampul: string | null) => ({
    id,
    title: id,
    year: tahun,
    thumbnail: sampul,
  });
  const drama = (id: string, poster: string | null) => ({
    id,
    title: id,
    year: "2024",
    posterImage: poster,
  });

  it("baris atas tidak memuat kartu tanpa gambar", () => {
    const hasil = siapkanTampilanDepan({
      film: [film("kosong", "2026", null), film("ada", "2026", "https://contoh.test/a.jpg")],
      series: [],
      drama: [drama("drama-ada", "https://contoh.test/d.jpg"), drama("drama-kosong", null)],
      jumlahBaris: 6,
      jumlahFilm: 10,
    });
    const judulAtas = hasil.barisAtas.map((b) => b.item.id);

    expect(judulAtas).not.toContain("kosong");
    expect(judulAtas).not.toContain("drama-ada");
    expect(judulAtas).not.toContain("drama-kosong");
    expect(judulAtas).toEqual(["ada"]);
  });

  it("judul di baris atas tidak muncul lagi di seksi bawah", () => {
    const hasil = siapkanTampilanDepan({
      film: Array.from({ length: 8 }, (_, i) =>
        film(`f${i}`, "2026", "https://contoh.test/f.jpg"),
      ),
      series: [],
      drama: Array.from({ length: 8 }, (_, i) =>
        drama(`d${i}`, "https://contoh.test/d.jpg"),
      ),
      jumlahBaris: 6,
      jumlahFilm: 10,
    });
    const idFilmAtas = hasil.barisAtas.map((b) => b.item.id);
    expect(idFilmAtas).toEqual(["f0", "f1", "f2", "f3", "f4", "f5"]);
    expect(hasil.barisAtas.every((b) => b.jenis === "film")).toBe(true);
    expect(hasil.filmDiDepan.map((v) => v.id)).toEqual(["f6", "f7"]);
    expect(hasil.dramaSisa.map((d) => d.id)).toEqual(
      Array.from({ length: 8 }, (_, i) => `d${i}`),
    );
  });
});
