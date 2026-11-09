// Penjaga PAGINASI daftar panel admin — owner 2026-11-06: "buatkan pagination
// dimana setiap halaman bisa kita adjust (25,50,100,150,200, dst) ada
// sebelumnya - berikutnya".
//
// ⚠️ Yang dijaga di sini adalah kerusakan SENYAP. Nomor halaman yang keluar
// rentang TIDAK memunculkan error apa pun — daftarnya cuma kosong, dan layar
// kosong terbaca seperti panel rusak. Tiga kejadian nyata membuat nomor
// halaman jadi kedaluwarsa tanpa ada yang menyentuh tombol halaman:
//   1. saringan diganti (359 video -> 61 video, halaman 3 lenyap);
//   2. video terakhir di saringan "Belum" selesai dicocokkan lalu keluar;
//   3. "baris per halaman" dinaikkan 25 -> 200.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import PlaylyVisibilityManager from "../app/components/admin/PlaylyVisibilityManager";
import {
  HALAMAN_PERTAMA,
  UKURAN_BAWAAN,
  UKURAN_HALAMAN,
  daftarNomorHalaman,
  hitungJumlahHalaman,
  jepitHalaman,
  potongHalaman,
} from "../lib/paginasi";

const PANEL = readFileSync(
  "app/components/admin/PlaylyVisibilityManager.tsx",
  "utf8",
);
const KONTROL = readFileSync(
  "app/components/admin/PaginasiDaftar.tsx",
  "utf8",
);

const daftar = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

/**
 * Gambar panel sungguhan ke HTML.
 *
 * Fungsi murni di atas membuktikan HITUNGANNYA benar; ini membuktikan
 * hitungan itu benar-benar sampai ke layar. Keduanya perlu: paginasi bisa
 * saja dihitung dengan sempurna lalu daftarnya tetap menggambar semua video.
 */
const renderPanel = (jumlahVideo: number) =>
  renderToStaticMarkup(
    createElement(PlaylyVisibilityManager, {
      videos: daftar(jumlahVideo).map((n) => ({
        id: `v${n}`,
        title: `Video ${n}`,
        durationSeconds: 120,
        durationLabel: "2:00",
        creator: "coklat",
        embedUrl: `https://playly.test/${n}/embed`,
        thumbnail: null,
      })),
      initialHidden: [],
      belumSiapIds: [],
      fetchError: null,
      source: "mitra" as const,
      creators: ["dramaku"],
    }),
  );

describe("aturan paginasi (fungsi murni)", () => {
  it("menghitung jumlah halaman, termasuk sisa yang tidak bulat", () => {
    expect(hitungJumlahHalaman(359, 50)).toBe(8); // 7 penuh + 9 sisa
    expect(hitungJumlahHalaman(100, 50)).toBe(2);
    expect(hitungJumlahHalaman(1, 50)).toBe(1);
  });

  it("daftar kosong tetap 1 halaman, bukan 0", () => {
    // "Hal 1 / 0" mustahil dibaca, dan pembagian terhadap 0 halaman
    // menghasilkan angka liar.
    expect(hitungJumlahHalaman(0, 50)).toBe(1);
  });

  it("🪤 ganti saringan: halaman 3 dari 359 video dijepit saat sisa 61", () => {
    // Kejadian nyata #1. Tanpa penjepit, potongannya kosong tanpa error.
    expect(jepitHalaman(3, 61, 50)).toBe(2);
    expect(potongHalaman(daftar(61), 3, 50)).toHaveLength(11);
  });

  it("🪤 video terakhir selesai dicocokkan: halaman terakhir ikut menyusut", () => {
    // Kejadian nyata #2 — saringan "Belum", 51 video, sedang di halaman 2
    // (berisi 1 video). Video itu dicocokkan -> tinggal 50 -> halaman 2 lenyap.
    expect(potongHalaman(daftar(51), 2, 50)).toHaveLength(1);
    expect(jepitHalaman(2, 50, 50)).toBe(1);
    expect(potongHalaman(daftar(50), 2, 50)).toHaveLength(50);
  });

  it("🪤 baris per halaman dinaikkan 25 -> 200 saat di halaman 10", () => {
    // Kejadian nyata #3 — baris ke-1800 tidak ada di daftar 359 video.
    expect(jepitHalaman(10, 359, 200)).toBe(2);
    expect(potongHalaman(daftar(359), 10, 200)).toHaveLength(159);
  });

  it("nomor halaman ngawur jatuh ke halaman pertama, bukan kosong", () => {
    for (const ngawur of [0, -5, NaN, Infinity, 1.7]) {
      const hasil = jepitHalaman(ngawur, 359, 50);
      expect(hasil, `halaman ${ngawur}`).toBeGreaterThanOrEqual(HALAMAN_PERTAMA);
      expect(hasil).toBeLessThanOrEqual(8);
    }
  });

  it("memotong halaman yang benar, tanpa baris bocor atau hilang", () => {
    const isi = daftar(359);
    expect(potongHalaman(isi, 1, 50)[0]).toBe(1);
    expect(potongHalaman(isi, 2, 50)[0]).toBe(51);
    expect(potongHalaman(isi, 8, 50)).toEqual(daftar(359).slice(350));

    // Seluruh halaman digabung HARUS memulangkan daftar aslinya — tidak ada
    // satu baris pun yang terlewat di perbatasan halaman.
    const gabung = [1, 2, 3, 4, 5, 6, 7, 8].flatMap((h) =>
      potongHalaman(isi, h, 50),
    );
    expect(gabung).toEqual(isi);
  });

  it("deretan nomor halaman: tanpa kembar, dan halaman aktif SELALU ada", () => {
    // Owner 2026-11-06: "halamannya tertera juga misal 1,2,3,4 dst jadi kalau
    // mau halaman 3 tinggal klik saja".
    //
    // 🪤 Dua kerusakan senyap yang dijaga di sini: nomor yang muncul dua kali
    // (dua tombol menuju halaman sama, dan React menolak key kembar), dan
    // halaman yang sedang dibuka tidak ikut tergambar — orang kehilangan
    // jejak posisinya tanpa satu pun error.
    for (const aktif of [1, 2, 3, 8, 13, 14, 15]) {
      const petak = daftarNomorHalaman(aktif, 15);
      const nomor = petak.filter((x): x is number => x !== "…");
      expect(new Set(nomor).size, `nomor kembar saat aktif=${aktif}`).toBe(
        nomor.length,
      );
      expect(nomor, `halaman aktif ${aktif} tidak tergambar`).toContain(aktif);
      expect(nomor[0], "halaman pertama harus selalu ada").toBe(1);
      expect(nomor[nomor.length - 1], "halaman terakhir harus selalu ada").toBe(
        15,
      );
    }
  });

  it("deretan pendek digambar utuh, tanpa '…' yang sia-sia", () => {
    expect(daftarNomorHalaman(1, 1)).toEqual([1]);
    expect(daftarNomorHalaman(2, 3)).toEqual([1, 2, 3]);
    expect(daftarNomorHalaman(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);

    // 🪤 "…" yang cuma melompati SATU halaman menghilangkan tombolnya tanpa
    // menghemat tempat sama sekali — nomornya yang digambar, bukan titiknya.
    for (const aktif of [1, 2, 3, 4, 5, 8, 11, 12, 13, 14, 15]) {
      const petak = daftarNomorHalaman(aktif, 15);
      petak.forEach((x, i) => {
        if (x !== "…") return;
        const kiri = petak[i - 1];
        const kanan = petak[i + 1];
        expect(typeof kiri === "number" && typeof kanan === "number").toBe(true);
        expect(
          (kanan as number) - (kiri as number),
          `"…" di antara ${kiri} dan ${kanan} cuma melompati satu halaman`,
        ).toBeGreaterThan(2);
      });
    }
  });

  it("deretannya tidak melebar tak terkendali saat halaman banyak", () => {
    // Tanpa batas, 60 halaman jadi 60 tombol yang membungkus ke baris baru
    // dan merusak satu-barisnya kontrol halaman.
    for (const total of [15, 40, 200]) {
      expect(daftarNomorHalaman(5, total).length).toBeLessThanOrEqual(9);
    }
  });

  it("pilihan ukuran memuat yang diminta owner dan bawaannya salah satunya", () => {
    for (const n of [25, 50, 100, 150, 200]) {
      expect(UKURAN_HALAMAN, `ukuran ${n} hilang dari pilihan`).toContain(n);
    }
    expect(UKURAN_HALAMAN).toContain(UKURAN_BAWAAN);
  });
});

describe("panel admin memakai aturan itu, bukan versi sendiri", () => {
  it("daftar menggambar POTONGAN halaman, bukan seluruh hasil saringan", () => {
    // 🪤 Kalau ini kembali ke `videoTampil.map`, paginasi tetap TERLIHAT
    // berfungsi (angka & tombolnya bergerak) tapi daftarnya menggambar semua
    // video — persis keluhan yang sedang diperbaiki, tanpa gejala.
    expect(PANEL).toContain("videoHalaman.map(");
    expect(
      PANEL,
      "daftar tidak boleh memetakan videoTampil langsung",
    ).not.toMatch(/\{videoTampil\.map\(/);
  });

  it("memotong SESUDAH menyaring, bukan sebelum", () => {
    // Memotong dulu lalu menyaring menghasilkan halaman yang jumlah barisnya
    // berubah-ubah (halaman 1 berisi 12 baris, halaman 2 berisi 40).
    const posSaring = PANEL.indexOf("saringVideoImdb(videos");
    const posPotong = PANEL.indexOf("potongHalaman(videoTampil");
    expect(posSaring).toBeGreaterThan(-1);
    expect(posPotong).toBeGreaterThan(-1);
    expect(posSaring, "saring HARUS mendahului potong").toBeLessThan(posPotong);
  });

  it("mengganti saringan memulangkan ke halaman pertama", () => {
    // Lihat kejadian nyata #1 di kepala berkas ini.
    const blok = PANEL.slice(PANEL.indexOf("setSaring(pilihan)"));
    expect(
      blok.slice(0, 600),
      "setSaring tidak diikuti setHalaman(HALAMAN_PERTAMA)",
    ).toContain("setHalaman(HALAMAN_PERTAMA)");
  });

  it("nomor halaman dijepit saat render, bukan dibetulkan lewat efek", () => {
    // Membetulkannya lewat useEffect berarti ada satu render di mana
    // daftarnya KOSONG lebih dulu — dan kosong itulah yang terbaca rusak.
    expect(PANEL).toContain("jepitHalaman(halaman, videoTampil.length, ukuran)");
    expect(KONTROL).toContain("jepitHalaman(halaman, total, ukuran)");
  });

  it("kontrol halaman tidak menyimpan nomor halamannya sendiri", () => {
    // Nomor halaman milik DAFTARNYA, bukan milik tombolnya: saringan yang
    // berubah dan video yang selesai dicocokkan juga menggesernya. Dua
    // ingatan untuk satu keadaan pasti menyimpang.
    expect(KONTROL, "PaginasiDaftar tidak boleh punya useState").not.toContain(
      "useState",
    );
  });

  it("kontrol halaman dipasang TEPAT SEKALI, di bawah daftar", () => {
    // Owner 2026-11-06: "keterangan pagination ada 2 (atas dan bawah) yang di
    // atas kamu hapus". Dijaga supaya tidak diam-diam kembali jadi dua saat
    // panel ini disunting lagi.
    const pasang = PANEL.match(/<PaginasiDaftar/g) ?? [];
    expect(pasang).toHaveLength(1);

    // Dan posisinya SESUDAH daftar — bukan sebelumnya.
    expect(PANEL.indexOf("<PaginasiDaftar")).toBeGreaterThan(
      PANEL.indexOf("videoHalaman.map("),
    );
  });

  it("tombol Sebelumnya/Berikutnya mati di ujung, bukan menembus rentang", () => {
    expect(KONTROL).toContain("disabled={!adaSebelumnya}");
    expect(KONTROL).toContain("disabled={!adaBerikutnya}");
  });

  it("nomor halaman bisa diklik, dan yang aktif ditandai", () => {
    // Owner 2026-11-06. Penanda halaman aktif wajib: deretan nomor tanpa
    // penanda tidak memberi tahu sedang di halaman mana.
    expect(KONTROL).toContain("daftarNomorHalaman(aman, jumlahHalaman)");
    expect(KONTROL).toContain("onClick={() => onHalaman(petak)}");
    expect(KONTROL).toContain('aria-current={petak === aman ? "page" : undefined}');
    // "…" bukan tombol — mengkliknya tidak menuju ke mana pun.
    expect(KONTROL).toMatch(/petak === "…" \?/);
  });
});

describe("daftar video berbaris kolom (owner: 'di bikin chart')", () => {
  it("judul kolom dan baris video memakai SATU template kolom", () => {
    // 🪤 Dua salinan template kolom pasti menyimpang saat salah satunya
    // disunting, dan kolom yang menyimpang membuat judul kolom menunjuk
    // kontrol yang salah — tanpa satu pun error, cuma salah baca.
    expect(PANEL).toContain("const KOLOM_BARIS =");

    // Dua pemakaiannya dituntut SATU PER SATU, bukan sekadar dihitung:
    // hitungan ikut terpenuhi oleh penyebutan di komentar, jadi ia bisa hijau
    // walau salah satu barisnya sudah tidak memakai konstanta itu lagi.
    expect(
      PANEL,
      "baris judul kolom tidak memakai KOLOM_BARIS",
    ).toMatch(/sm:grid",\s*\n\s*KOLOM_BARIS,/);
    expect(
      PANEL,
      "baris kontrol tiap video tidak memakai KOLOM_BARIS",
    ).toContain('cn("grid py-1.5", KOLOM_BARIS)');

    // Template tidak boleh ditulis ulang sebagai kelas mentah di tempat lain.
    // Dicocokkan tanpa menyebut angka lebarnya: angka itu memang disetel ulang
    // tiap kali tata letaknya diukur dari potret, dan tes yang mengunci angka
    // akan merah karena alasan yang salah.
    const mentah = PANEL.match(/grid-cols-\[/g) ?? [];
    expect(
      mentah,
      "template kolom ditulis ulang di luar konstanta KOLOM_BARIS",
    ).toHaveLength(1);
  });

  it("HTML yang digambar benar-benar cuma satu halaman", () => {
    // Bukti di tampilan, bukan cuma di hitungan: 60 video masuk, halaman
    // pertama (bawaan 50 baris) yang keluar.
    const html = renderPanel(60);
    const baris = html.match(/data-baris-video/g) ?? [];
    expect(baris).toHaveLength(50);
    expect(html).toContain("Video 50");
    expect(html, "video ke-51 bocor ke halaman pertama").not.toContain(
      "Video 51",
    );
  });

  it("HTML-nya memuat judul kolom dan TEPAT SATU kontrol halaman", () => {
    const html = renderPanel(60);
    // Dicocokkan sebagai `>Teks</span>`, bukan `<span>Teks</span>`: judul
    // kolom terakhir punya kelas sendiri (rata kanan), dan pola yang menuntut
    // span polos membuat tes ini merah karena alasan yang salah.
    for (const kolom of ["Jenis", "Kategori", "Kualitas", "IMDb", "Aksi"]) {
      expect(html, `judul kolom "${kolom}" tidak tergambar`).toContain(
        `>${kolom}</span>`,
      );
    }
    // Owner: "yang di atas kamu hapus". Dihitung dari dropdown "Baris:" yang
    // hanya ada di kontrol halaman.
    const kontrol = html.match(/Baris:/g) ?? [];
    expect(kontrol, "kontrol halaman tergambar lebih dari sekali").toHaveLength(
      1,
    );
  });

  it("daftar pendek tidak kehilangan satu baris pun", () => {
    // Jaring untuk kesalahan off-by-one: 7 video harus tergambar tujuh-tujuhnya.
    const html = renderPanel(7);
    expect(html.match(/data-baris-video/g) ?? []).toHaveLength(7);
    expect(html).toContain("Video 7");
  });

  it("panel pencarian IMDb MELAYANG, tidak mendorong lebar baris", () => {
    // 🪤 Panel selebar 420px yang ikut alur baris membuat kolomnya melebar
    // dan mendorong kontrol di sebelahnya turun — seluruh daftar bergoyang
    // tiap satu pencarian dibuka. Itu akar "tinggi baris tidak seragam".
    const PICKER = readFileSync(
      "app/components/admin/PlaylyImdbPicker.tsx",
      "utf8",
    );
    expect(PICKER).toContain("absolute right-0 top-full z-20");
    expect(
      PICKER,
      "pembungkus picker harus relative — jangkar panel melayangnya",
    ).toContain('className="relative w-full min-w-0 text-left"');
  });

  it("isi kolom IMDb rata KIRI, bukan didorong ke kanan", () => {
    // 🪤 Inilah yang membuat daftar terbaca acak walau tingginya sudah
    // seragam (owner 2026-11-06: "masih terlihat acak acakan"). Rata kanan
    // membuat titik mulai isi kolom berpindah tiap baris: video yang sudah
    // punya data IMDb mulai di posisi yang bergantung panjang judul filmnya,
    // yang belum punya mulai di posisi tombol "Cari di IMDb". Tidak ada satu
    // pun garis tegak yang konsisten — dan nol error memberi tahu.
    const PICKER = readFileSync(
      "app/components/admin/PlaylyImdbPicker.tsx",
      "utf8",
    );
    expect(PICKER, "kolom IMDb tidak boleh rata kanan").not.toContain(
      "justify-end",
    );
    expect(PICKER, "kolom IMDb tidak boleh rata kanan").not.toContain(
      "text-right",
    );
  });

  it("judul video adalah KOLOM PERTAMA, satu baris per video", () => {
    // Owner 2026-11-06: "ubah seperti image 1" — contoh tabel ber-kolom yang
    // dia kirim, judul sebagai kolom pertama. Sebelum ini judul ditaruh di
    // tingkat atas dan kontrolnya di tingkat bawah; owner lebih memilih
    // tabel yang lurus walau judulnya harus dipotong.
    const html = renderPanel(3);

    // Enam judul kolom, Judul paling depan.
    for (const kolom of ["Judul", "Jenis", "Kategori", "Kualitas", "IMDb", "Aksi"]) {
      expect(html, `judul kolom "${kolom}" tidak tergambar`).toContain(
        `>${kolom}</span>`,
      );
    }
    expect(html.indexOf(">Judul</span>")).toBeLessThan(
      html.indexOf(">Jenis</span>"),
    );

    // Satu baris grid per video — bukan dua tingkat.
    expect(PANEL).toContain('cn("grid py-1.5", KOLOM_BARIS)');
    expect(
      PANEL,
      "judul tidak boleh kembali jadi tingkat sendiri di atas kontrol",
    ).not.toContain('cn("mt-2 grid", KOLOM_BARIS)');
  });

  it("kolom Rating ada, dan video tanpa data IMDb tidak meninggalkan sel kosong", () => {
    // Owner 2026-11-06: "kamu tambahkan juga untuk rating".
    // 🪤 Sel kosong terbaca seperti kolomnya rusak; yang benar adalah tanda
    // pisah yang berarti "belum dicocokkan".
    const html = renderPanel(2);
    expect(html).toContain(">Rating</span>");
    // Sejak 2026-11-06 selnya KOTAK ISIAN (owner: "kalau yang belum ada
    // ratingnya bisa kita edit kan?"). Yang dijaga tetap sama — sel tidak
    // boleh terbaca kosong — hanya bentuknya yang berubah jadi placeholder.
    expect(html, "video tanpa rating harus menggambar tanda pisah").toContain(
      'placeholder="–"',
    );

    // Rating tidak boleh digambar dua kali (kolom sendiri + menempel di
    // tombol IMDb) — mengulangnya memakan ruang yang dibutuhkan nama film.
    const PICKER = readFileSync(
      "app/components/admin/PlaylyImdbPicker.tsx",
      "utf8",
    );
    expect(PICKER, "rating tidak boleh ikut di tombol IMDb").not.toContain(
      "{meta.rating}",
    );
  });

  it("judul panjang dipotong DAN tetap bisa dibaca utuh", () => {
    // 🪤 Memotong judul tanpa menyediakan cara membaca utuhnya berarti dua
    // video berjudul mirip ("Americana" vs "American Siege") jadi mustahil
    // dibedakan — dan salah menyembunyikan video itu kerusakan senyap.
    // Owner: "bisa kamu kasih titik atau apa dan begitu klik muncul judul
    // lengkap". Jadi tiga hal wajib ada bersamaan: truncate, title, dan
    // tombol yang membuka judul penuh.
    const blok = PANEL.slice(PANEL.indexOf("setDetail(detail === v.id"));
    expect(blok.slice(0, 900), "judul tidak dipotong").toContain("truncate");
    expect(blok.slice(0, 900), "judul tanpa tooltip").toContain("title={v.title}");
    expect(PANEL, "tidak ada blok judul lengkap").toContain("{detail === v.id && (");
  });

  it("kolom IMDb menampilkan NAMA FILM yang tercocok, bukan sekadar 'Ganti'", () => {
    // Nama film itulah satu-satunya cara memeriksa pencocokannya benar.
    // Tombolnya sekaligus jadi pintu untuk mengganti/melepas, karena satu
    // kolom sempit tidak muat untuk lencana + dua tombol terpisah.
    const PICKER = readFileSync(
      "app/components/admin/PlaylyImdbPicker.tsx",
      "utf8",
    );
    expect(PICKER).toContain("{meta.title}");
    expect(PICKER).toMatch(/title=\{`\$\{meta\.title\}/);
  });

  it("teks tombol tidak boleh membungkus jadi beberapa baris", () => {
    // 🪤 Terbukti di potret: tanpa `whitespace-nowrap`, tombol "Cari di IMDb"
    // terbungkus jadi TIGA baris ("Cari / di / IMDb") di kolom sempit, dan
    // tinggi barisnya kembali tak seragam — persis keluhan yang diperbaiki.
    const PICKER = readFileSync(
      "app/components/admin/PlaylyImdbPicker.tsx",
      "utf8",
    );
    expect(PICKER).toMatch(/whitespace-nowrap[^"]*border-sky-500/);
  });

  it("tombol sembunyikan berupa IKON, tapi tetap menyebut fungsinya", () => {
    // Owner 2026-11-06: "sembunyikan kamu jadikan icon saja jadi lebih irit
    // tempat". Tombol berteks memakan ±110px di TIAP baris.
    //
    // 🪤 Begitu teksnya hilang dari layar, satu-satunya cara tahu tombol ini
    // mengerjakan apa adalah tooltip — dan pembaca layar hanya punya
    // aria-label. Ikon tanpa keduanya = tombol yang fungsinya cuma bisa
    // ditebak, dan menebak salah di sini berarti video tak sengaja hilang
    // dari situs.
    const blok = PANEL.slice(PANEL.indexOf("onClick={() => ubah(v.id,"));
    expect(blok.slice(0, 1400), "ikon tanpa title").toContain("title={");
    expect(blok.slice(0, 1400), "ikon tanpa aria-label").toContain(
      "aria-label={",
    );
    expect(blok.slice(0, 1400)).toContain("size-9");
    expect(
      blok.slice(0, 1400),
      "teks tombol tidak boleh kembali — itu yang memakan tempat",
    ).not.toContain('"Tampilkan" : "Sembunyikan"');
  });

  it("padding samping hanya di SATU pembungkus, bukan di dua tempat", () => {
    // 🪤 Sebelumnya baris judul kolom dan tiap baris video sama-sama
    // ber-`px-2` di tempatnya masing-masing. Keduanya memang sejajar — tapi
    // sejajar karena dua nilai yang KEBETULAN sama, dan nilai yang kebetulan
    // sama adalah nilai yang menyimpang begitu salah satunya disunting.
    // Sekarang paddingnya satu, di pembungkus daftar, jadi header dan baris
    // mulai dari tepi yang sama persis dan mustahil meleset.
    expect(PANEL).toContain('<div className="mt-4 px-1">');

    const header = PANEL.slice(PANEL.indexOf("border-b border-zinc-800"));
    expect(
      header.slice(0, 200),
      "baris judul kolom tidak boleh punya padding samping sendiri",
    ).not.toMatch(/\bpx-\d/);

    const li = PANEL.slice(PANEL.indexOf("transition even:bg-zinc-900"));
    expect(
      li.slice(0, 120),
      "baris video tidak boleh punya padding samping sendiri",
    ).not.toMatch(/\bpx-\d/);
  });

  it("template kolom tidak boleh ikut membawa kelas `grid`", () => {
    // 🪤 `cn()` memakai tailwind-merge: `grid` di dalam KOLOM_BARIS MENIMPA
    // `hidden` milik baris judul kolom, karena keduanya utilitas `display` dan
    // konstanta itu dioper belakangan. Terukur di viewport 560px — judul kolom
    // yang seharusnya tersembunyi justru tergambar menumpuk jadi dua kolom,
    // menunjuk kontrol yang salah, tanpa satu pun error.
    const baris = PANEL.slice(PANEL.indexOf("const KOLOM_BARIS"));
    const nilai = baris.slice(0, baris.indexOf(";"));
    expect(nilai, "KOLOM_BARIS tidak boleh memuat kelas `grid`").not.toMatch(
      /"grid |\bgrid"/,
    );
    // Pemakainya yang menyebut display-nya sendiri.
    expect(PANEL).toMatch(/text-zinc-500 sm:grid",/);
    expect(PANEL).toContain('cn("grid py-1.5", KOLOM_BARIS)');
  });
});
