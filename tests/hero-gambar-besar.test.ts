// Penjaga FRAMING GAMBAR BESAR halaman drama — owner 2026-11-09
// ("bagian atas tidak kepotong ... kalau mau potong, potong dari bawah agar
// UI tetap enak dilihat, tidak kepala yang terpotong").
//
// KERUSAKAN YANG DIJAGA: kotak hero ber-rasio 16/9, sedangkan poster drama
// hampir selalu lebih TINGGI dari itu. `object-cover` sendirian memotong rata
// atas-bawah, jadi yang hilang justru wajah tokoh — satu hal yang paling
// menentukan orang mengklik atau tidak. `object-top` menempelkan gambar ke
// tepi atas sehingga kelebihannya dibuang dari BAWAH.
//
// ⚠️ KENAPA TES INI MEMBACA SUMBER, BUKAN MERENDER: kerusakannya murni soal
// PEMOTONGAN gambar, dan jsdom tidak punya mesin tata letak — ia tidak
// menghitung object-fit sama sekali, jadi merender komponennya akan hijau
// bahkan saat kepalanya terpotong. Pola yang sama dipakai
// tests/tombol-aksi-drama.test.ts.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sumberHalaman = readFileSync(
  join(process.cwd(), "app/drama/[id]/page.tsx"),
  "utf8",
);
const sumberMedia = readFileSync(
  join(process.cwd(), "app/components/HeroDramaMedia.tsx"),
  "utf8",
);

/**
 * Potongan sumber satu elemen, dari penanda sampai penutup `/>`, dengan
 * KOMENTAR DIBUANG.
 *
 * ⚠️ Pembuangan komentar itu inti tes ini, bukan kerapian. Versi pertama tes
 * ini mengembalikan potongan apa adanya, dan karena komentar di atas
 * `className` ikut menyebut kata "object-top", tes tetap HIJAU walau kelasnya
 * sudah hilang dari kode — hijau palsu yang justru menyembunyikan kerusakan
 * yang mau dijaga. Ketahuan saat tesnya sengaja dirusak untuk diuji-balik.
 */
function elemen(sumber: string, penanda: string): string {
  const mulai = sumber.indexOf(penanda);
  expect(mulai, `penanda "${penanda}" tidak ditemukan`).toBeGreaterThan(-1);
  const akhir = sumber.indexOf("/>", mulai);
  return sumber
    .slice(mulai, akhir)
    .replace(/\/\*[\s\S]*?\*\//g, "") // komentar blok  /* ... */
    .replace(/^\s*\/\/.*$/gm, ""); // komentar baris //
}

describe("gambar besar hero: kepala tidak boleh terpotong", () => {
  it("gambar utama ditempel ke ATAS, bukan dipusatkan", () => {
    const gambarUtama = elemen(sumberHalaman, "alt={drama.title}");
    expect(gambarUtama).toContain("object-cover");
    expect(gambarUtama).toContain("object-top");
  });

  it("video trailer memakai framing yang SAMA dengan gambarnya", () => {
    // Beda framing = tampilan melompat tepat saat video muncul; penonton
    // melihatnya sebagai gambar bergeser, bukan trailer yang mulai.
    const video = elemen(sumberMedia, "<video");
    expect(video).toContain("object-cover");
    expect(video).toContain("object-top");
  });

  it("latar blur SENGAJA tetap dipusatkan", () => {
    // Dia dekoratif (aria-hidden) dan di-blur berat — tak ada wajah untuk
    // diselamatkan, dan menempelkannya ke atas malah menyisakan tepi kosong.
    const latar = elemen(sumberHalaman, "aria-hidden");
    expect(latar).toContain("blur-2xl");
    expect(latar).not.toContain("object-top");
  });
});

// Owner 2026-11-09: "kenapa begitu masuk drama tidak langsung terputar harus
// menggerakkan cursor". Ternyata bukan cursornya — gambar memang baru bergerak
// sesudah ±3,6 detik (diukur di produksi). Tiga penjaga di bawah mengunci
// perbaikannya, karena gejalanya mustahil kelihatan dari tes biasa: tidak ada
// error, tidak ada tes merah, cuma gambar yang diam lebih lama dari yang
// seharusnya.
describe("cuplikan hero harus mulai secepat mungkin", () => {
  const sumber = readFileSync(
    join(process.cwd(), "app/components/HeroDramaMedia.tsx"),
    "utf8",
  );

  it("memanggil play() begitu video siap, tidak hanya mengandalkan autoPlay", () => {
    expect(sumber).toContain("onCanPlay");
  });

  it("pengamat layar dipasang ulang saat sumber video berganti", () => {
    // Versi pertama memakai dependency KOSONG, jadi pengamat terpasang saat
    // <video> belum lahir: panggilan pertamanya menemukan ref kosong lalu
    // keluar, dan sesudah video muncul ia tak pernah dipanggil lagi selama
    // penonton tidak menggulir — play() di sana jadi tak pernah kena sasaran.
    expect(sumber).toMatch(/io\.observe\(box\)[\s\S]{0,200}?\}, \[sumber\]\)/);
  });

  it("label '▶ Cuplikan' sudah TIDAK dipajang lagi", () => {
    // Dibuang owner: menerangkan hal yang sudah jelas dari layar sambil
    // menambah kotak hitam di pojok. Yang tersisa hanya batu nisannya di
    // komentar, jadi yang dilarang adalah teks yang benar-benar dirender.
    expect(sumber).not.toMatch(/>\s*▶ Cuplikan/);
  });
});
