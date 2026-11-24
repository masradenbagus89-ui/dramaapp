// Penjaga BARIS TAB YANG SEJAJAR — owner 2026-11-23, dua permintaan sekaligus:
//
//   1. *"untuk versi HP filter disitu kamu hapus saja karena sudah ada di
//      bawah"* → tombol FILTER di baris tab hanya tergambar di layar komputer.
//   2. *"series terbaru, unggulan, update kamu hapus saja karena sudah ada,
//      biar bisa sejajar"* → tiga tombol tab terpanjang dilepas dari baris atas
//      di halaman depan & /beranda, supaya sisanya muat satu baris di HP.
//
// ⚠️ KENAPA PENJAGA INI WAJIB ADA, dan ini bukan jaga-jaga: kedua perubahan di
// atas MENIMPA keputusan owner yang lebih tua, dan alasan keputusan lama masih
// tertulis rapi di komentar kode ("ia tergambar di SEMUA ukuran layar lagi",
// "membawa SEMUA label tab yang diminta"). Sesi berikutnya yang membaca
// komentar itu akan menyimpulkan keadaan sekarang sebagai REGRESI lalu
// "memperbaikinya" — tepat seperti yang sudah berkali-kali terjadi di repo ini.
//
// ⚠️ JEBAKAN YANG DIJAGA TES TERAKHIR: tab yang tombolnya dilepas TIDAK boleh
// ikut dibuang dari `daftarTab`/`parseTab`. Empat tautan menu "Series" di bar
// atas menunjuk `/katalog?tab=…` (lib/nav-katalog.ts:502). Kalau kuncinya
// hilang, `tabAktif` jatuh DIAM-DIAM ke tab pertama — tautan menunya mendarat
// di daftar yang salah tanpa satu pun error.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import TabKatalogTampilan from "../app/components/beranda/TabKatalogTampilan";
import { TAB_TANPA_TOMBOL } from "../app/components/beranda/BadanKatalog";
import { TAB_BAWAAN, daftarTab, parseTab } from "../lib/tab-katalog";
import { tanpaKomentar } from "./bantu/tanpa-komentar";
import type { Drama } from "../lib/types";

function drama(p: Partial<Drama> & Pick<Drama, "id" | "title">): Drama {
  return {
    category: "Action",
    episodes: 10,
    views: "1.2K",
    synopsis: "",
    gradient: "from-zinc-800 to-black",
    ...p,
  };
}

const KATALOG: Drama[] = Array.from({ length: 12 }, (_, i) =>
  drama({ id: `d${i}`, title: `Drama ${i}`, year: "2026", imdbRating: "8.0" }),
);

/**
 * Tab yang tombolnya dilepas — DIIMPOR dari keputusannya sendiri, bukan disalin.
 *
 * ⚠️ Daftar salinan sudah sempat basi dalam hitungan jam: putaran kedua owner
 * (sketsa di tangkapan layar) menambahkan "terpopuler" ke daftar aslinya,
 * sedangkan salinan di berkas ini tetap berisi tiga — tesnya tetap HIJAU
 * sambil tak lagi memeriksa tab keempat. Tes yang basi memberi rasa aman palsu,
 * dan itu lebih berbahaya daripada tes yang merah.
 */
const DISEMBUNYIKAN = TAB_TANPA_TOMBOL;

const render = (sembunyikan: readonly string[] = []) =>
  renderToStaticMarkup(
    createElement(TabKatalogTampilan, {
      dramas: KATALOG,
      tab: TAB_BAWAAN,
      semua: false,
      tabDisembunyikan: [...sembunyikan] as never,
    }),
  );

describe("1. tombol FILTER: layar komputer saja", () => {
  const sumber = tanpaKomentar(
    readFileSync("app/components/beranda/TabKatalogTampilan.tsx", "utf-8"),
  );

  it("dibungkus pemisah ukuran layar, bukan tergambar di semua layar", () => {
    // `hidden md:flex` = sembunyi di HP, muncul dari 768px ke atas. Dicari
    // sebagai PASANGAN: `hidden` sendirian akan menyembunyikannya di SEMUA
    // layar — tombolnya lenyap total, dan itu tak memunculkan error apa pun.
    expect(sumber).toMatch(/hidden md:flex[\s\S]{0,200}<FilterKatalog/);
  });

  it("bar bawah HP tetap punya tombol Filter penggantinya", () => {
    // Inti alasan owner: di HP tombolnya DIPINDAH, bukan dihapus. Kalau bar
    // bawah suatu saat kehilangan tombol itu, penonton HP tidak punya satu pun
    // jalan ke penyaring — dan tes nomor 1 di atas tetap hijau.
    const bottom = tanpaKomentar(
      readFileSync("app/components/BottomNav.tsx", "utf-8"),
    );
    expect(bottom, "tombol Filter hilang dari bar bawah HP").toContain(
      '"Filter"',
    );
  });
});

describe("2. tiga tab terpanjang dilepas dari baris atas", () => {
  it("tombolnya tidak tergambar saat disembunyikan", () => {
    const html = render(DISEMBUNYIKAN);
    for (const key of DISEMBUNYIKAN) {
      const label = daftarTab(KATALOG).find((t) => t.key === key)!.label;
      expect(html, `tombol tab "${label}" masih tergambar`).not.toContain(
        `>${label}<`,
      );
    }
  });

  it("tab yang TIDAK disembunyikan tetap tergambar", () => {
    // Penjaga arah sebaliknya: penyaringnya tidak boleh kebablasan membuang
    // semua tombol — baris tab yang kosong melompong juga kerusakan senyap.
    const html = render(DISEMBUNYIKAN);
    const tersisa = daftarTab(KATALOG).filter(
      (t) => !DISEMBUNYIKAN.includes(t.key),
    );
    expect(tersisa.length, "tak ada tab tersisa untuk diperiksa").toBeGreaterThan(0);
    for (const t of tersisa) {
      expect(html, `tab ${t.label} ikut hilang padahal tidak diminta`).toContain(
        t.label,
      );
    }
  });

  it("tanpa daftar sembunyi, SELURUH tombol kembali tergambar", () => {
    // Inilah yang menjaga /katalog: halaman itu tujuan tautan menu "Series",
    // jadi tombol tab yang sedang dipakai harus tetap terlihat menyala di sana.
    const html = render();
    for (const t of daftarTab(KATALOG)) {
      expect(html, `tab ${t.label} hilang di halaman tanpa daftar sembunyi`).toContain(
        t.label,
      );
    }
  });

  it("/katalog memang TIDAK menyembunyikan tab apa pun", () => {
    const halaman = tanpaKomentar(readFileSync("app/katalog/page.tsx", "utf-8"));
    expect(
      halaman,
      "/katalog ikut menyembunyikan tab — tautan menu Series kehilangan sorotannya",
    ).not.toContain("tabDisembunyikan");
  });
});

describe("3. judul + chip SEDERET dengan tombol tab", () => {
  // Owner 2026-11-23 putaran kedua, lewat sketsa di tangkapan layar: judul
  // "Layarindo Menawarkan" + tiga chip + REKOMENDASI + 2026 jadi SATU baris.
  // Sebelumnya dua baris bertumpuk.
  const tampilan = tanpaKomentar(
    readFileSync("app/components/beranda/TabKatalogTampilan.tsx", "utf-8"),
  );

  it("isi titipan digambar DI DALAM kotak baris tab", () => {
    // Harus berada di wadah yang SAMA dengan tombol tab — kalau digambar di
    // luar kotak, ia kembali jadi baris sendiri dan permintaan owner batal
    // tanpa satu pun error.
    //
    // ⚠️ YANG DIPERIKSA KINI "bersebelahan dengan {tabs", bukan "sesudah
    // overflow-x-auto" (2026-11-24). Wadahnya berganti dari baris yang
    // membungkus jadi KISI dua kolom supaya kelima chip bisa seragam, jadi
    // patokan lama menguji kelas yang sudah tidak menentukan apa-apa.
    // Bersebelahan dengan `{tabs` adalah syarat yang SEBENARNYA: hanya
    // sebagai saudara sekandung mereka bisa berbagi kolom yang sama.
    expect(tampilan).toMatch(/\{slotBarisTab\}[\s\S]{0,400}\{tabs/);
  });

  it("judulnya punya baris sendiri, di ATAS deret chip", () => {
    // Owner 2026-11-24: *"ubah layarindo menawarkan, letakan ditengah"*.
    // Ini MEMBATALKAN permintaannya sendiri 2026-11-23 (sederet satu baris) —
    // disengaja, jangan dikembalikan karena menemukan catatan yang lebih tua.
    // Diperiksa lewat URUTAN, bukan regex berjarak: jarak antar keduanya ikut
    // berubah tiap kali kelas tata letak disunting, jadi angka jarak berapa
    // pun akan merah suatu hari karena alasan yang salah. Yang benar-benar
    // dijaga cuma satu hal — judulnya digambar LEBIH DULU.
    const posJudul = tampilan.indexOf("{slotJudulBaris}");
    const posChip = tampilan.indexOf("{slotBarisTab}");
    expect(posJudul, "`{slotJudulBaris}` tidak digambar sama sekali").toBeGreaterThan(-1);
    expect(posChip, "`{slotBarisTab}` tidak digambar sama sekali").toBeGreaterThan(-1);
    expect(posJudul, "judul harus SEBELUM deret chip").toBeLessThan(posChip);
  });

  it("barisnya MEMBUNGKUS di HP, bukan digeser menyamping", () => {
    // ⚠️ Ini bukan kerapian. Dengan judul + tiga chip ikut masuk, barisnya
    // jauh lebih panjang dari layar HP. Versi tergeser hanya menampilkan judul
    // + SATU chip, tanpa tanda apa pun bahwa masih ada isi di sebelah kanan —
    // terbukti saat mock-nya dipotret sebelum dipasang.
    expect(tampilan).toContain("max-md:flex-wrap");
  });

  it("di HP chip jadi SATU baris yang digeser + panah, bukan bertumpuk", () => {
    // Masalah yang dijaga TETAP SAMA sejak 2026-11-23: deret chip lebih
    // panjang dari layar HP, dan penonton butuh tahu masih ada isi di kanan.
    //
    // ⚠️ CARANYA SUDAH BERGANTI DUA KALI DALAM SATU HARI (2026-11-24), jadi
    // jangan heran menemukan catatan yang bertentangan:
    //   1. pagi  — baris `flex-wrap` + `min-w-0` di dalam LayarindoMenawarkan
    //   2. siang — kisi DUA KOLOM (lebar chip jadi sama persis)
    //   3. sore  — SATU baris digeser + panah  ← yang berlaku sekarang
    // Owner menolak (2) karena menumpuk jadi tiga baris dan kotaknya tumbuh
    // tinggi: *"kasih tanda panah aja (khusus HP) jadi tidak bertumpuk"*.
    // Keseragamannya pindah ke BENTUK (tinggi/sudut/garis/huruf, semuanya
    // dari `KELAS_CHIP_BARIS`), bukan ke lebar — persis gambar acuan owner.
    expect(tampilan).toContain("overflow-x-auto");
    expect(
      tampilan,
      "tanpa `shrink-0` chip dipepetkan agar muat dan tulisannya terpotong, bukan digeser",
    ).toContain("[&>*]:shrink-0");
    expect(
      tampilan,
      "kisi dua kolom dipasang lagi — itu yang owner tolak karena bertumpuk",
    ).not.toContain("grid-cols-2");
  });

  it("panah gesernya nyata: punya tujuan, dan HP saja", () => {
    const panah = tanpaKomentar(
      readFileSync("app/components/beranda/PanahGeserBaris.tsx", "utf-8"),
    );
    // Panah yang tampak tombol tapi diam saat diketuk lebih buruk daripada
    // tidak ada — penonton menyimpulkan bagian itu rusak.
    expect(panah, "panahnya tidak menggeser apa pun").toContain("scrollBy");
    expect(panah, "tujuan gesernya tidak disebut").toContain("getElementById");
    // `md:hidden` — di layar komputer barisnya memang muat, jadi panahnya
    // tidak akan menggeser apa pun kalau tetap tergambar.
    expect(panah).toContain("md:hidden");
    // Dipasang DI baris chip, dan hanya di sana.
    expect(tampilan).toContain("PanahGeserBaris");
    expect(tampilan).toContain("ID_BARIS_CHIP");
  });

  it("chip pintasan TANPA pembungkus — syarat lebarnya bisa seragam", () => {
    const strip = tanpaKomentar(
      readFileSync("app/components/beranda/LayarindoMenawarkan.tsx", "utf-8"),
    );
    // Begitu chip dibungkus lagi (<ul>/<div>), ketiganya kembali membungkus
    // baris terpisah dari REKOMENDASI & <tahun> — persis ketidakseragaman
    // yang dikeluhkan owner, dan nol error yang memberi tahu.
    expect(strip, "pembungkus <ul> dipasang lagi").not.toContain("<ul");
    expect(
      strip,
      "pembungkus bergaris dipasang lagi — hasilnya kotak di dalam kotak",
    ).not.toContain("border-y");
    // Bentuknya WAJIB datang dari konstanta bersama, bukan ditulis ulang.
    expect(strip).toContain("KELAS_CHIP_BARIS");
  });
});

describe("4. yang disembunyikan cuma TOMBOLNYA, bukan tabnya", () => {
  it("ketiga kunci masih dikenali parseTab", () => {
    // Kalau ini merah, empat tautan menu "Series" (/katalog?tab=…) mendarat di
    // daftar yang SALAH — `tabAktif` jatuh diam-diam ke tab pertama.
    for (const key of DISEMBUNYIKAN) {
      expect(parseTab(key), `/katalog?tab=${key} tak lagi dikenali`).toBe(key);
    }
  });

  it("ketiga kunci masih ada di daftarTab", () => {
    const kunci = daftarTab(KATALOG).map((t) => t.key);
    for (const key of DISEMBUNYIKAN) {
      expect(kunci, `tab ${key} dibuang dari daftar, bukan disembunyikan`).toContain(
        key,
      );
    }
  });

  it("menu Series di bar atas masih menunjuk ketiganya", () => {
    // Sumber "sudah ada" yang owner maksud. Diperiksa dari lib/nav-katalog.ts
    // supaya kalau menunya dirombak, keputusan menyembunyikan tombol tab ikut
    // ditinjau ulang — bukan meninggalkan tiga tab tanpa jalan sama sekali.
    const nav = tanpaKomentar(readFileSync("lib/nav-katalog.ts", "utf-8"));
    expect(nav).toContain("/katalog?tab=unggulan");
    expect(nav).toContain("/katalog?tab=update");
    // "Terbaru" memakai alamat polos /katalog — itu memang tab bawaannya.
    expect(nav).toContain('{ label: "Terbaru", href: "/katalog" }');
  });

  it("isi seksinya tetap digambar di halaman depan", () => {
    // "karena sudah ada" yang kedua: judul seksinya sendiri ada tepat di bawah
    // baris tab. Kalau seksinya ikut hilang, yang terjadi bukan "merapikan
    // baris" melainkan MEMBUANG tiga daftar film dari halaman depan.
    const badan = tanpaKomentar(
      readFileSync("app/components/beranda/BadanKatalog.tsx", "utf-8"),
    );
    expect(badan).toContain("seksiLengkap");
    expect(
      badan,
      "daftar tab yang disembunyikan tidak lagi dipasang — periksa ulang",
    ).toContain("TAB_TANPA_TOMBOL");
  });
});
