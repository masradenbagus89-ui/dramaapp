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
    expect(sumber).toMatch(/io\.observe\(box\)[\s\S]{0,200}?\}, \[mulai\]\)/);
  });

  it("label '▶ Cuplikan' sudah TIDAK dipajang lagi", () => {
    // Dibuang owner: menerangkan hal yang sudah jelas dari layar sambil
    // menambah kotak hitam di pojok. Yang tersisa hanya batu nisannya di
    // komentar, jadi yang dilarang adalah teks yang benar-benar dirender.
    expect(sumber).not.toMatch(/>\s*▶ Cuplikan/);
  });
});

// Owner 2026-11-09: "langsung episode 1 saja dan video usahakan jangan
// berhenti". Dua keputusan yang mudah hilang diam-diam saat kode dirapikan.
describe("cuplikan hero: langsung Ep 1 dan tidak berhenti", () => {
  const sumber = readFileSync(
    join(process.cwd(), "app/components/HeroDramaMedia.tsx"),
    "utf8",
  );

  it("memutar Episode 1 langsung, tidak mencoba trailer dulu", () => {
    // Mencoba trailer lebih dulu memakan 1,17 detik (terukur) pada SETIAP
    // kunjungan selama belum ada satu pun berkas trailer dibuat.
    expect(sumber).toContain("teaserSrc(drama.id, 1)");
    expect(sumber).not.toContain("trailerSrc(");
  });

  it("video mengulang, bukan berhenti di tengah jalan", () => {
    expect(sumber).toContain("teaserShouldLoop");
    // `loop` menangani episode yang lebih pendek dari jendela cuplikan.
    expect(sumber).toMatch(/\n\s+loop\n/);
  });

  it("pengulangan tetap DIBATASI supaya unduhan tidak sebesar 1 episode", () => {
    // Tanpa jendela ini browser menyedot seluruh episode (26,8 MB terukur)
    // untuk sesuatu yang cuma hiasan latar. Ini bukan soal rapi — ini kuota
    // PC backup owner.
    expect(sumber).toContain("DETAIL_CUPLIKAN_SEC");
  });
});

describe("judul hero: ukuran HP dikecilkan (owner 2026-11-10)", () => {
  /**
   * Isi atribut `className` milik `<h1>` judul hero, KOMENTAR DIBUANG.
   *
   * ⚠️ Pembuangan komentar bukan kerapian — ini pagar anti hijau-palsu yang
   * sudah pernah menipu berkas ini (lihat catatan di `elemen` di atas).
   * Komentar di atas judul sengaja menyebut angka "20px", "16px", dan kelas
   * `text-base` sebagai catatan pengukuran; tanpa dibuang, pemeriksaan di
   * bawah akan hijau walau kelas aslinya sudah diganti balik.
   */
  const kelasJudul = (() => {
    const bersih = sumberHalaman
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    const cocok = bersih.match(/<h1 className="([^"]*title-gold[^"]*)"/);
    expect(cocok, "<h1> judul hero tidak ditemukan").toBeTruthy();
    return cocok![1];
  })();

  it("di HP judulnya 15px, bukan 20px bawaan desktop", () => {
    // Angkanya ditentukan POSTER di sebelahnya (112px + jarak = ±124px),
    // sehingga kolom judul tinggal ±200px. Disweep di browser pada judul 44
    // huruf: di layar 390px → 15px = 2 baris, 16px = 3, 18px = 3; di 320px →
    // 15px = 3 baris, 18px = 4. Dengan 20px bawaan desktop judul ini pecah
    // jadi 4 baris dan dulu menutupi gambar film.
    expect(kelasJudul).toContain("text-[15px]");
    // Pagar arah-balik: ukuran desktop tak boleh berlaku dari layar terkecil.
    // Batas kata dipakai supaya `sm:text-xl` di bawah tidak ikut kena.
    expect(kelasJudul).not.toMatch(/(^|\s)text-xl(\s|$)/);
  });

  it("layar lebar NOL berubah — 20px mulai 640px, 30px mulai 768px", () => {
    // Keluhannya khusus HP. Tanpa kedua pagar ini, "mengecilkan judul" diam-diam
    // ikut mengecilkan tampilan desktop yang tidak pernah dikeluhkan siapa pun.
    expect(kelasJudul).toContain("sm:text-xl");
    expect(kelasJudul).toContain("md:text-3xl");
  });

  it("judul tetap TIDAK dipotong", () => {
    // Memangkas judul dengan line-clamp memang menghapus tumpukannya, tapi
    // penonton kehilangan sebagian nama drama — dan judul panjang justru lazim
    // di katalog ini (judul terpanjang 89 huruf, terukur dari /api/dramas).
    expect(kelasJudul).not.toContain("line-clamp");
    expect(kelasJudul).not.toContain("truncate");
  });
});

describe("blok judul TIDAK menimpa film di HP (owner 2026-11-10, putaran 2)", () => {
  // Sumber dengan komentar dibuang — alasannya sama dengan `elemen` di atas,
  // dan di sini WAJIB: komentar di sekitar blok ini sengaja menyebut
  // `absolute`, `-bottom-16`, dan `pb-20` sebagai catatan sejarah. Tanpa
  // dibuang, tiap pemeriksaan di bawah hijau walau kodenya sudah kembali
  // menimpa gambar.
  const bersih = sumberHalaman
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  /** className blok poster+judul (dikenali dari `-bottom-16` miliknya). */
  const kelasBlok = (() => {
    const cocok = bersih.match(/<div className="([^"]*-bottom-16[^"]*)"/);
    expect(cocok, "blok judul hero tidak ditemukan").toBeTruthy();
    return cocok![1];
  })();

  /** className pembungkus yang menyediakan ruang untuk blok menggantung. */
  const kelasPembungkus = (() => {
    const cocok = bersih.match(/<div className="([^"]*)">\s*<HeroDrama/);
    expect(cocok, "pembungkus <HeroDrama> tidak ditemukan").toBeTruthy();
    return cocok![1];
  })();

  it("di HP bloknya MENGALIR di bawah gambar, bukan dipasang absolute", () => {
    // Inti keluhan owner. Terukur sebelum perbaikan: blok setinggi 149px
    // dengan `-bottom-16` (64px) SELALU menimpa bingkai video 85px — di
    // ukuran huruf 20/18/16/15/14px, semuanya sama. Jadi yang harus hilang
    // adalah posisi absolute-nya di HP, bukan ukuran hurufnya.
    expect(kelasBlok).toContain("sm:absolute");
    // `absolute` telanjang = berlaku dari layar terkecil → menimpa lagi.
    expect(kelasBlok).not.toMatch(/(^|\s)absolute(\s|$)/);
    // Penempatannya pun ikut ditahan sampai sm:, kalau tidak `-bottom-16`
    // pada elemen yang mengalir biasa jadi perintah yang tak berarti.
    expect(kelasBlok).not.toMatch(/(^|\s)-bottom-16(\s|$)/);
    expect(kelasBlok).toContain("sm:-bottom-16");
  });

  it("layar lebar TETAP memakai susunan lama yang menjorok", () => {
    // Dari 640px bingkai 16/9 sudah ≥360px tinggi, jadi tumpangan 85px itu
    // kecil dan memang bagian dari tampilannya. Owner tidak pernah
    // mengeluhkannya di layar lebar.
    expect(kelasBlok).toContain("sm:left-4");
    expect(kelasBlok).toContain("md:-bottom-20");
  });

  it("ruang gantung 80px hanya dipasang saat bloknya memang menggantung", () => {
    // `pb-20` telanjang di HP = 80px lubang kosong antara keterangan film dan
    // daftar EPISODE, karena di sana tak ada lagi yang menggantung ke bawah.
    expect(kelasPembungkus).toContain("sm:pb-20");
    expect(kelasPembungkus).not.toMatch(/(^|\s)pb-20(\s|$)/);
  });
});

describe("hero HP: nol pengulangan, tepi sejajar (owner 2026-11-10, putaran 3)", () => {
  const bersihSumber = sumberHalaman
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("poster kecil TETAP TAMPIL di HP — keputusan owner, jangan disembunyikan", () => {
    // ⚠️ Pernah saya sembunyikan di HP karena menggandakan gambar hero DAN
    // mengulang lencananya di baris keterangan. Owner melihat hasilnya lalu
    // memintanya kembali: "poster kecil bawah jangan di hilangkan"
    // (2026-11-10). Penjaga ini menahan keputusan itu, bukan selera saya.
    // `[\s{}]*` — bukan `\s*`: pembuangan komentar di atas menyisakan pasangan
    // kurung kurawal kosong bekas `{/* ... */}` di antara kedua tag.
    const cocok = bersihSumber.match(
      /<div className="([^"]*w-28[^"]*)">[\s{}]*<Poster/,
    );
    expect(cocok, "pembungkus <Poster> di hero tidak ditemukan").toBeTruthy();
    const kelas = cocok![1];
    expect(kelas).not.toContain("hidden");
    // 112px (`w-28`) lebar minimum yang memuat lencananya utuh — diuji 96px,
    // dan "43 EPS" langsung pecah jadi dua baris.
    expect(kelas).toContain("w-28");
  });

  it("keterangan dipecah per butir, bukan satu string ber-join", () => {
    // `keterangan.join(" · ")` membuat browser boleh memutus di spasi MANA
    // SAJA — di tangkapan layar owner "IMDb 9.0/10" terbelah jadi "IMDb" di
    // ujung baris dan "9.0/10" di baris berikutnya.
    expect(bersihSumber).not.toContain('keterangan.join(" · ")');
    expect(bersihSumber).toContain("whitespace-nowrap");
  });

  it("antar butir ada SPASI — tanpa itu barisnya tak bisa berganti baris", () => {
    // Cacat nyata yang tertangkap 2026-11-10 saat poster dikembalikan (kolom
    // menyempit ±124px): elemen <span> yang ditempel rapat tanpa spasi tidak
    // memberi browser titik putus, dan karena tiap butir ber-whitespace-nowrap
    // SELURUH baris jadi satu untaian tak terpatahkan. Ia melewati tepi kanan
    // lalu terpotong diam-diam oleh overflow-hidden kartu — halaman tidak
    // melebar, tidak ada error, keterangan penonton cuma hilang separuh.
    expect(bersihSumber).toMatch(/i < semua\.length - 1 && " "/);
  });

  it("tepi kiri hero SEJAJAR dengan panel EPISODE di bawahnya", () => {
    // Kontrak lintas-berkas, dan inilah yang membuat tampilannya terbaca rapi:
    // dua blok yang bertumpuk vertikal harus memulai teksnya di garis yang
    // sama. Sebelum ini hero memakai px-4 (16px) sementara panel episode px-3
    // (12px) — meleset 4px, cukup untuk terbaca "berantakan" tanpa ada yang
    // bisa menunjuk sebabnya.
    const sumberPanel = readFileSync(
      join(process.cwd(), "app/components/film/PanelEpisode.tsx"),
      "utf8",
    );
    const padHero = bersihSumber.match(
      /<div className="[^"]*\b(px-\d+)[^"]*sm:absolute/,
    );
    expect(padHero, "jarak kiri blok judul hero tidak ditemukan").toBeTruthy();

    // Diambil dari ELEMEN JUDULNYA (dikenali lewat garis merah
    // `border-rose-600`), bukan dicari di mana saja dalam berkas. Versi
    // pertama tes ini memakai `sumberPanel.toContain("px-3")` dan terbukti
    // HIJAU PALSU saat diuji-balik: kelas `px-3` juga dipakai daftar episode
    // di baris lain, jadi menggeser judulnya ke `px-5` tetap lolos.
    const padPanel = sumberPanel.match(
      /className="[^"]*border-rose-600[^"]*\b(px-\d+)/,
    );
    expect(padPanel, "jarak kiri judul EPISODE tidak ditemukan").toBeTruthy();
    expect(padPanel![1]).toBe(padHero![1]);
  });
});

describe("keterangan hero: butir pendek utuh, butir panjang boleh membungkus", () => {
  const bersihSumber = sumberHalaman
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("penjagaan keutuhan BERSYARAT panjang, bukan dipasang ke semua butir", () => {
    // Cacat yang pernah terjadi dan ditangkap sebelum rilis (2026-11-10):
    // `whitespace-nowrap` dipasang ke SETIAP butir, lalu daftar negara
    // ko-produksi film ("United States, China, Thailand, Germany, Canada,
    // United Kingdom") tak bisa membungkus. Ia TIDAK memperlebar halaman —
    // pembungkusnya overflow-hidden — melainkan TERPOTONG DIAM-DIAM di tepi
    // kanan. Nol error, nol scrollbar, penonton cuma melihat kalimat terputus.
    expect(bersihSumber).toMatch(
      /butir\.length <= BATAS_BUTIR_UTUH[\s\S]{0,60}?whitespace-nowrap/,
    );
  });

  it("batasnya cukup untuk butir terpanjang yang wajib utuh", () => {
    const cocok = bersihSumber.match(/BATAS_BUTIR_UTUH = (\d+)/);
    expect(cocok, "konstanta BATAS_BUTIR_UTUH tidak ditemukan").toBeTruthy();
    const batas = Number(cocok![1]);
    // Harus menampung butir terpanjang yang harus dibaca sekaligus. Kalau
    // batasnya turun di bawah ini, "IMDb 10.0/10" kembali bisa terbelah jadi
    // "IMDb" dan "10.0/10" di dua baris — keluhan awal owner.
    expect(batas).toBeGreaterThanOrEqual("IMDb 10.0/10".length);
    // Dan tidak boleh longgar sampai ikut menahan daftar negara terpendek yang
    // masih realistis ("United States, China" = 21 huruf).
    expect(batas).toBeLessThan(21);
  });
});
