// Penjaga: BAR SITUS TIDAK BOLEH MEMOTONG ISI YANG MENGGANTUNG KELUAR.
//
// KENAPA ADA (owner 2026-11-24, dilaporkan sebagai "tombol search tidak
// berfungsi apakah bug"): kelas `.sapuan-gelombang` — hiasan bergelombang di
// bar atas & bar bawah — sempat membawa `overflow: hidden`. Satu baris itu
// MEMOTONG daftar saran pencarian: bar-nya tinggi 57px, daftar sarannya 355px,
// jadi 348px-nya hilang dan yang tersisa cuma strip putih ~7px di bawah kotak
// cari.
//
// KENAPA INI PANTAS DIJAGA MESIN, bukan diingat orang:
//   1. Gejalanya MENYESATKAN. Yang rusak dropdown-nya, tapi yang dilaporkan
//      "tombolnya mati" — padahal tombol submit, perpindahan halaman, dan
//      halaman hasilnya semua benar (semuanya diukur di browser sungguhan di
//      situs produksi, 2026-11-24).
//   2. Kerusakannya SENYAP TOTAL: nol error di konsol, nol tes merah, build
//      hijau, halaman 200. Hanya terlihat kalau dipandang atau diukur lewat
//      `elementFromPoint`.
//   3. `overflow: hidden` adalah tambahan yang WAJAR DITULIS ULANG oleh siapa
//      pun yang merapikan hiasan pseudo-element — justru karena ia terdengar
//      seperti pengaman. Di sini ia tidak dibutuhkan: hiasannya
//      `position: absolute; inset: 0` + `background-size: 100% 100%`, jadi
//      memang tidak bisa meluber keluar kotaknya.
//
// Dibuktikan sebab-akibat di produksi: dengan `overflow: hidden` → 0 dari 6
// baris saran terlihat; properti itu saja dimatikan → 6 dari 6 terlihat.
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { tanpaKomentar } from "./bantu/tanpa-komentar";

const css = tanpaKomentar(readFileSync("app/globals.css", "utf8"));

/** Isi satu blok CSS `.nama { ... }`, tanpa komentar. */
function blok(nama: string): string {
  const mulai = css.indexOf(`.${nama} {`);
  expect(mulai, `blok .${nama} tidak ada lagi di app/globals.css`).toBeGreaterThan(-1);
  const tutup = css.indexOf("}", mulai);
  return css.slice(mulai, tutup);
}

describe("bar hiasan tidak memotong isi yang menggantung", () => {
  it(".sapuan-gelombang TIDAK memotong isinya", () => {
    // `overflow: hidden|clip|auto|scroll` sama-sama memotong anak yang keluar
    // kotak. Dicegah semuanya, bukan cuma `hidden` — mengganti nilainya ke
    // `clip` akan menghasilkan kerusakan yang sama persis.
    expect(blok("sapuan-gelombang")).not.toMatch(/overflow\s*:\s*(hidden|clip|auto|scroll)/);
  });

  it("isolation: isolate TETAP ada — ini yang justru wajib", () => {
    // Jangan sampai yang dicabut malah yang salah. Hiasan `::before` memakai
    // `z-index: -10`; tanpa kotak tumpukan sendiri ia tenggelam ke belakang
    // LATAR HALAMAN, bukan ke belakang isi bar — hiasannya hilang total.
    expect(blok("sapuan-gelombang")).toMatch(/isolation\s*:\s*isolate/);
  });

  it("hiasannya memang tidak perlu dipotong — ia menempel pas di kotaknya", () => {
    // Inilah alasan `overflow: hidden` aman dibuang. Kalau suatu saat
    // hiasannya diubah jadi lebih besar daripada kotaknya (mis. `inset: -20px`
    // atau `background-size` > 100%), baris ini merah lebih dulu — dan saat
    // itu solusinya BUKAN mengembalikan `overflow: hidden` ke bar, melainkan
    // memotong hiasannya lewat elemen sendiri.
    const hias = blok("sapuan-gelombang::before");
    expect(hias).toMatch(/inset\s*:\s*0/);
    expect(hias).toMatch(/background-size\s*:\s*100%\s+100%/);
  });
});
