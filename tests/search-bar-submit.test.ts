// Tes penjaga: TIDAK ADA bar cari yang tombolnya diam.
//
// Latar (owner 2026-10-16): "tombol search belum berfungsi" di /beranda.
// Sebabnya bukan di SearchBar — komponennya sudah benar, tombol submit-nya
// memanggil `onSubmit?.()`. Masalahnya di PEMANGGIL: `CatalogBrowser` dan
// `DramaBrowser` tidak mengoper `onSubmit` sama sekali, jadi `preventDefault()`
// menelan kiriman form dan tidak ada apa pun yang terjadi sesudahnya.
//
// Kenapa tes ini membaca BERKAS SUMBER, bukan merender komponennya: yang rusak
// adalah "satu pemanggil lupa menyambungkan", dan itu tak bisa ditangkap dengan
// menguji SearchBar sendirian — SearchBar-nya memang sudah benar. Merender
// keempat halaman penuh jauh lebih mahal dan rapuh daripada memeriksa satu
// aturan yang sebenarnya sederhana: setiap pemakai wajib menyambungkan
// kirimannya ke suatu tempat.
//
// Dua cara sah menyambungkannya, dan keduanya diterima di sini:
//   - `onSubmit`  -> ditangani JavaScript (gulir ke hasil, atau pindah halaman)
//   - `action`    -> pengiriman form bawaan browser, untuk sebelum JS aktif
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const AKAR = join(__dirname, "..", "app");

/** Semua berkas .tsx di bawah app/, ditelusuri rekursif. */
function berkasTsx(dir: string): string[] {
  const hasil: string[] = [];
  for (const entri of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entri.name);
    if (entri.isDirectory()) hasil.push(...berkasTsx(p));
    else if (entri.name.endsWith(".tsx")) hasil.push(p);
  }
  return hasil;
}

/** Potongan JSX `<SearchBar ... />` apa adanya, untuk tiap kemunculan. */
function blokSearchBar(isi: string): string[] {
  const blok: string[] = [];
  let dari = isi.indexOf("<SearchBar");
  while (dari !== -1) {
    const tutup = isi.indexOf("/>", dari);
    blok.push(isi.slice(dari, tutup === -1 ? dari + 2000 : tutup));
    dari = isi.indexOf("<SearchBar", dari + 1);
  }
  return blok;
}

const pemakai = berkasTsx(AKAR)
  .map((p) => ({ path: p, isi: readFileSync(p, "utf-8") }))
  .filter((f) => f.isi.includes("<SearchBar"))
  .map((f) => ({
    // relative(AKAR, …) — BUKAN indexOf("app"): path absolutnya memuat
    // "dramaapp", jadi indexOf menemukan "app" di dalam nama folder project
    // dan labelnya jadi "app/app/components/…".
    nama: "app/" + relative(AKAR, f.path).replace(/\\/g, "/"),
    blok: blokSearchBar(f.isi),
  }));

describe("SearchBar — tiap pemakai menyambungkan kirimannya", () => {
  it("ada pemakainya, jadi tes ini benar-benar memeriksa sesuatu", () => {
    // Tanpa ini, perubahan nama komponen membuat daftar jadi kosong dan
    // seluruh tes di bawah lulus tanpa memeriksa apa pun.
    expect(pemakai.length).toBeGreaterThanOrEqual(4);
  });

  it.each(pemakai.map((p) => [p.nama, p] as const))(
    "%s menyambungkan onSubmit atau action",
    (_nama, p) => {
      for (const blok of p.blok) {
        const tersambung = blok.includes("onSubmit") || blok.includes("action=");
        expect(tersambung).toBe(true);
      }
    },
  );
});
