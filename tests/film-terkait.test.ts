// Penjaga "FILM TERKAIT" + kolom komentar di halaman film (owner 2026-10-29:
// *"di halaman film kamu tambahkan kolom komentar dan related film"*).
//
// Aturan pemilihannya diuji sebagai fungsi MURNI — tanpa browser, tanpa
// database. Itu sengaja: yang mudah rusak di seksi seperti ini bukan
// tampilannya (langsung kelihatan mata), melainkan ISInya — judul yang sedang
// dibuka ikut ditawarkan, grid yang separuh kosong, atau urutan yang
// berubah-ubah tiap halaman dibangun ulang. Ketiganya tidak menimbulkan error
// apa pun.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { pilihTerkait, type CiriTerkait } from "../lib/film-terkait";

type Uji = { id: string; label: string };
const ciri = (x: Uji): CiriTerkait => ({ id: x.id, label: x.label });

const KATALOG: Uji[] = [
  { id: "a", label: "Action, Thriller, United States" },
  { id: "b", label: "Romance, Korea" },
  { id: "c", label: "Action, Crime, United States" },
  { id: "d", label: "Comedy, Japan" },
  { id: "e", label: "Thriller, United States" },
  { id: "f", label: "Horror, Indonesia" },
];

describe("pilihTerkait — aturan isi seksi Film Terkait", () => {
  it("TIDAK pernah menawarkan judul yang sedang dibuka", () => {
    const hasil = pilihTerkait(KATALOG, ciri(KATALOG[0]), ciri, 5);
    expect(
      hasil.some((x) => x.id === "a"),
      "judul yang sedang dibuka ikut ditawarkan — tautan yang memulangkan " +
        "penonton ke halaman yang sama persis terbaca seperti tautan rusak",
    ).toBe(false);
  });

  it("mendahulukan yang paling banyak beririsan genre/negara", () => {
    // Acuan "a" = Action, Thriller, United States.
    //   c = Action + United States  -> 2
    //   e = Thriller + United States -> 2
    //   b,d,f                        -> 0
    const hasil = pilihTerkait(KATALOG, ciri(KATALOG[0]), ciri, 2);
    expect(hasil.map((x) => x.id).sort()).toEqual(["c", "e"]);
  });

  it("mengisi grid sampai penuh walau tak ada yang segenre", () => {
    // Acuan tanpa kecocokan sama sekali. Seksi yang separuh kosong terbaca
    // seperti halaman gagal muat, jadi sisanya diisi judul lain — tapi yang
    // benar-benar mirip (tak ada di sini) tetap akan didahulukan.
    const hasil = pilihTerkait(
      KATALOG,
      { id: "z", label: "Dokumenter, Antartika" },
      ciri,
      5,
    );
    expect(hasil).toHaveLength(5);
  });

  it("tidak memulangkan lebih banyak daripada yang diminta", () => {
    expect(pilihTerkait(KATALOG, ciri(KATALOG[0]), ciri, 3)).toHaveLength(3);
    expect(pilihTerkait(KATALOG, ciri(KATALOG[0]), ciri, 0)).toHaveLength(0);
  });

  it("aman saat katalog cuma berisi judul itu sendiri", () => {
    // Katalog baru / hasil saringan sempit. Harus memulangkan daftar KOSONG,
    // bukan melempar — komponennya lalu tidak menggambar seksinya sama sekali.
    expect(pilihTerkait([KATALOG[0]], ciri(KATALOG[0]), ciri, 5)).toEqual([]);
  });

  it("urutannya STABIL — hasil sama untuk masukan sama", () => {
    // Urutan yang berubah tiap halaman dibangun ulang membuat penonton merasa
    // daftarnya acak, dan membuat perbandingan HTML antar-rilis mustahil.
    const a = pilihTerkait(KATALOG, ciri(KATALOG[0]), ciri, 4).map((x) => x.id);
    const b = pilihTerkait(KATALOG, ciri(KATALOG[0]), ciri, 4).map((x) => x.id);
    expect(a).toEqual(b);
  });

  it("label kosong tidak membuatnya jatuh", () => {
    const tanpaLabel: Uji[] = [
      { id: "x", label: "" },
      { id: "y", label: "" },
    ];
    expect(pilihTerkait(tanpaLabel, { id: "x", label: "" }, ciri, 5)).toEqual([
      tanpaLabel[1],
    ]);
  });

  it("huruf besar/kecil & spasi tidak mengacaukan pencocokan", () => {
    const hasil = pilihTerkait(
      [{ id: "p", label: "  ACTION ,  thriller " }],
      { id: "q", label: "Action, Thriller" },
      ciri,
      1,
    );
    expect(hasil.map((x) => x.id)).toEqual(["p"]);
  });
});

describe("halaman film memasang komentar & film terkait", () => {
  const DRAMA = readFileSync("app/drama/[id]/page.tsx", "utf-8");
  const TONTON = readFileSync("app/tonton/[id]/page.tsx", "utf-8");

  it("/drama/[id] punya komentar DAN film terkait", () => {
    expect(DRAMA).toContain("<Comments dramaId={drama.id} terang />");
    // Film terkait kini HANYA di kolom kanan (owner 2026-10-29: *"cukup satu
    // di sidebar kanan atas, yang bawah kamu hapus"*).
    expect(DRAMA).toContain("items={terkaitSidebar}");
  });

  it("/tonton/[id] punya komentar DAN film terkait", () => {
    // Sampai 2026-10-29 halaman ini satu-satunya halaman tonton TANPA kolom
    // komentar, padahal /drama/[id] punya sejak lama.
    expect(
      TONTON,
      "/tonton kehilangan kolom komentar — padahal owner memintanya eksplisit",
    ).toContain("<Comments dramaId={video.id} terang />");
    expect(TONTON).toContain("items={terkaitSidebar}");
  });

  it("komentar di halaman TERANG wajib dioper prop `terang`", () => {
    // Nilai bawaan `Comments` adalah GELAP (ia juga dipakai dua layar pemutar).
    // Lupa mengopernya = kotak komentar hitam di tengah halaman putih — jelek,
    // tapi tidak menimbulkan error apa pun.
    for (const [nama, sumber] of [
      ["drama", DRAMA],
      ["tonton", TONTON],
    ] as const) {
      expect(sumber, `${nama}: Comments tanpa prop terang`).toMatch(
        /<Comments dramaId=\{[^}]+\} terang \/>/,
      );
    }
  });

  it("terkait dihitung di SERVER, bukan mengirim seluruh katalog ke browser", () => {
    // `pilihTerkait` dipanggil di komponen server (halaman), lalu hasilnya yang
    // sudah dipotong 5 yang dioper. Kalau pemilihan pindah ke komponen browser,
    // seluruh katalog ikut terkirim ke tiap pengunjung.
    for (const [nama, sumber] of [
      ["drama", DRAMA],
      ["tonton", TONTON],
    ] as const) {
      expect(sumber, `${nama}: tidak memanggil pilihTerkait`).toContain(
        "pilihTerkait(",
      );
      expect(sumber, `${nama}: halaman jadi komponen browser`).not.toMatch(
        /^"use client"/m,
      );
    }
  });

  it("/tonton memakai sumber VIDEO, bukan katalog drama", () => {
    // Penonton di halaman ini sedang menonton film Playly. Menawarkan judul
    // drama sebagai "terkait" membawanya ke jenis halaman yang berbeda tanpa
    // aba-aba.
    const blok = TONTON.slice(TONTON.indexOf("const semuaTerkait"));
    expect(blok).toContain("semuaVideo");
    expect(blok).toContain("/tonton/");
  });
});

// ===========================================================================
// SIDEBAR DUA SEKSI + pagar anti-dobel (owner 2026-10-29, putaran kelima)
// ===========================================================================
describe("kolom kanan: Film Terkait di atas, Terpopuler di bawah", () => {
  const DRAMA = readFileSync("app/drama/[id]/page.tsx", "utf-8");
  const TONTON = readFileSync("app/tonton/[id]/page.tsx", "utf-8");
  const SIDEBAR_MENTAH =
    readFileSync("app/components/film/PanelFilm.tsx", "utf-8") +
    readFileSync("app/components/film/PanelPopuler.tsx", "utf-8");
  /** Komentar dibuang: di sana judul LAMA disebut untuk menjelaskan apa yang
   *  digantikan, dan itu penjelasan yang benar — bukan pelanggaran. */
  const SIDEBAR = SIDEBAR_MENTAH.replace(/\/\*[\s\S]*?\*\//g, "").replace(
    /^\s*\/\/.*$/gm,
    "",
  );

  it("menggambar DUA seksi dengan judul yang diminta owner", () => {
    // Judulnya kini dioper dari halaman (Film Terkait) dan dari PanelPopuler
    // (Terpopuler) — keduanya memakai komponen tampilan yang SAMA.
    expect(
      readFileSync("app/drama/[id]/page.tsx", "utf-8") +
        readFileSync("app/tonton/[id]/page.tsx", "utf-8"),
    ).toContain('judul="Film Terkait"');
    expect(SIDEBAR).toContain('judul="Terpopuler"');
    // "Paling Banyak Ditonton" adalah judul LAMA — kalau muncul lagi berarti
    // seksinya tertukar balik.
    expect(SIDEBAR).not.toContain("Paling Banyak Ditonton");
  });

  it("seksi kosong TIDAK digambar sebagai judul di atas ruang hampa", () => {
    expect(SIDEBAR).toContain("if (items.length === 0) return null;");
  });

  it("film terkait digambar di SATU tempat saja", () => {
    // Owner 2026-10-29 (putaran keenam): *"film terkait cukup satu di sidebar
    // kanan atas, yang bawah kamu hapus."* Grid 5 poster di bawah komentar
    // DIBUANG, beserta komponennya.
    //
    // Ini sekaligus menutup masalah dobel yang sempat ditambal dengan
    // pembagian 6+5: dengan satu tempat, tidak ada lagi yang bisa kembar.
    for (const [nama, sumber] of [
      ["drama", DRAMA],
      ["tonton", TONTON],
    ] as const) {
      expect(
        (sumber.match(/pilihTerkait\(/g) || []).length,
        `${nama}: pilihTerkait dipanggil lebih dari sekali`,
      ).toBe(1);
      expect(
        sumber,
        `${nama}: grid "Film Terkait" di bawah komentar muncul lagi — owner ` +
          `meminta film terkait HANYA ada di kolom kanan`,
      ).not.toContain("<FilmTerkait");
    }
  });

  it("komponen grid benar-benar DIHAPUS, bukan ditinggal tak terpakai", async () => {
    // Berkas yatim yang tak dipanggil siapa pun adalah jebakan untuk sesi
    // berikutnya: ia terbaca seperti fitur yang masih hidup.
    const { existsSync } = await import("node:fs");
    expect(existsSync("app/components/film/FilmTerkait.tsx")).toBe(false);
  });

  it("seksi Terpopuler membuang judul yang sudah tampil di seksi atas", () => {
    // Satu judul muncul dua kali dalam SATU kolom jauh lebih mencolok
    // daripada dobel antar-seksi yang berjauhan.
    expect(SIDEBAR).toContain("dibuang.has(d.id)");
  });

  it("judul yang sedang dibuka tetap dikeluarkan dari Terpopuler", () => {
    expect(SIDEBAR).toContain("d.id !== kecualiId");
    expect(DRAMA).toContain("kecualiId={drama.id}");
  });
});

// ===========================================================================
// BINGKAI PEMUTAR — pemutar/hero + "Film Terkait" dalam SATU kotak
// (owner 2026-10-29: *"film yang diputar jadi satu bingkai dengan film
// terkait"*)
// ===========================================================================
describe("bingkai pemutar + film terkait", () => {
  const DRAMA = readFileSync("app/drama/[id]/page.tsx", "utf-8");
  const TONTON = readFileSync("app/tonton/[id]/page.tsx", "utf-8");
  /**
   * Komentar kode DIBUANG sebelum diperiksa.
   *
   * Pemeriksaan di bawah mencari KELAS CSS, sedangkan komentar di berkas
   * sumber menyebut kelas-kelas itu untuk menjelaskan kenapa dipakai/dihindari
   * — penjelasan yang benar justru terbaca sebagai pelanggaran. Jebakan ini
   * sudah tiga kali kena di sesi yang sama, jadi dibuat satu pembantu.
   */
  const tanpaKomentar = (teks: string) =>
    teks
      // Blok /* … */ dibuang dengan split, BUKAN regex: pola regex untuk
      // komentar harus memuat banyak backslash, dan itu berulang kali rusak
      // saat berkas ini disunting lewat skrip. Split jauh lebih tahan banting
      // dan maksudnya terbaca sekali pandang.
      .split("/*")
      .map((bagian, i) => (i === 0 ? bagian : bagian.split("*/").slice(1).join("*/")))
      .join("")
      // Sisa baris yang diawali // (sesudah spasi) ikut dibuang.
      .split("\n")
      .filter((baris) => !baris.trim().startsWith("//"))
      .join("\n");

  const PANEL = tanpaKomentar(
    readFileSync("app/components/film/PanelFilm.tsx", "utf-8"),
  );

  it("keduanya memakai grid dua kolom berlatar gelap", () => {
    for (const [nama, sumber] of [
      ["drama", DRAMA],
      ["tonton", TONTON],
    ] as const) {
      expect(sumber, `${nama}: bingkai gelap hilang`).toContain("bg-black");
      expect(sumber, `${nama}: kolom panel hilang`).toContain(
        "lg:grid-cols-[minmax(0,1fr)_320px]",
      );
    }
  });

  it("panel digulung SENDIRI, bukan memanjangkan bingkai", () => {
    // Inti permintaan: daftar sepanjang apa pun harus mengunci diri pada
    // tinggi pemutar dan punya gulungan sendiri — scrollbar yang owner tandai
    // di tangkapan layarnya. Tanpa `lg:overflow-y-auto`, bingkainya ikut
    // memanjang dan pemutar terlihat mengambang di kotak kebesaran.
    expect(PANEL).toContain("lg:flex-1 lg:overflow-y-auto");
    expect(PANEL).toContain("lg:h-full");
  });

  it("gulungan HANYA di layar lebar", () => {
    // Di HP panel turun ke bawah pemutar. Mengunci tinggi di sana memasang
    // area gulung DI DALAM halaman yang juga digulung — dua gulungan
    // bersarang, salah satu hal paling membingungkan di layar sentuh.
    // Karena itu `overflow-y-auto` HANYA boleh muncul berawalan `lg:`.
    const semua = PANEL.split("overflow-y-auto").length - 1;
    const berprefiks = PANEL.split("lg:overflow-y-auto").length - 1;
    expect(
      semua,
      "ada overflow-y-auto tanpa awalan lg: — panel ikut mengunci tinggi di HP",
    ).toBe(berprefiks);
    expect(berprefiks).toBeGreaterThan(0);
  });

  it("panel dikeluarkan dari perhitungan tinggi baris grid", () => {
    // Owner 2026-10-29: panelnya *"stuck tidak bisa di-scroll"*.
    //
    // Sebabnya BUKAN `overflow-y-auto` yang hilang, melainkan tinggi baris
    // grid yang mengikuti item TERTINGGI: selama panel item biasa, daftar
    // panjang MEMANJANGKAN barisnya sehingga tak ada yang terlampaui.
    // `lg:absolute lg:inset-0` mengeluarkannya dari perhitungan itu, jadi
    // tinggi bingkai ditentukan murni oleh pemutar.
    for (const [nama, sumber] of [
      ["drama", DRAMA],
      ["tonton", TONTON],
    ] as const) {
      expect(
        tanpaKomentar(sumber),
        `${nama}: panel masih item grid biasa — daftar panjang akan ` +
          `memanjangkan bingkai, dan gulungannya tak pernah muncul`,
      ).toContain("lg:absolute lg:inset-0");
    }
  });

  it("daftarnya MEMANG lebih panjang daripada pemutar", () => {
    // Pagar kedua, dan sama pentingnya: mekanisme gulung yang benar tetap
    // terasa "macet" kalau isinya cuma beberapa baris. 20 judul (±76px/baris)
    // jauh melampaui tinggi pemutar 16:9 pada lebar kolom mana pun.
    for (const [nama, sumber] of [
      ["drama", DRAMA],
      ["tonton", TONTON],
    ] as const) {
      const m = sumber.match(/const TERKAIT_SIDEBAR = (\d+);/);
      expect(m, `${nama}: TERKAIT_SIDEBAR tidak ketemu`).toBeTruthy();
      expect(
        Number(m![1]),
        `${nama}: isinya terlalu sedikit — panel tak akan pernah terlihat ` +
          `bisa digulung`,
      ).toBeGreaterThanOrEqual(15);
    }
  });

  it("judul panel tetap terlihat saat daftarnya digulung", () => {
    // `shrink-0` pada judul + area gulung terpisah. Kalau judulnya ikut
    // tergulung, penonton kehilangan konteks begitu menggulir satu baris.
    expect(PANEL).toContain("shrink-0 border-b-2");
  });

  it("🪤 bingkai /drama TIDAK boleh overflow-hidden — poster menjorok keluar", () => {
    // Poster judul dipasang `absolute -bottom-16`, jadi ia KELUAR dari kotak
    // gambar hero. Dengan `overflow-hidden` di bingkai, poster itu terpotong
    // rapi — dan tidak ada error apa pun yang memberi tahu; yang hilang cuma
    // separuh gambar. Ruangnya disediakan `pb-20` di kolom kiri.
    const bersih = tanpaKomentar(DRAMA);
    const bingkai = bersih.slice(
      bersih.indexOf("bg-black shadow-lg"),
      bersih.indexOf("grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]"),
    );
    expect(bingkai).not.toContain("overflow-hidden");
    expect(bingkai).toContain("pb-20");
    expect(bingkai.length).toBeGreaterThan(50); // potongannya benar-benar kena
  });

  it("hero /drama tetap punya induk ber-posisi `relative`", () => {
    // Poster & judulnya `absolute`. Tanpa induk `relative`, keduanya mengacu
    // ke elemen ber-posisi terdekat BERIKUTNYA dan melompat ke tempat yang
    // sama sekali salah.
    const hero = DRAMA.slice(DRAMA.indexOf("function HeroDrama"));
    expect(hero).toContain('<div className="relative">');
  });

  it("kolom kanan bawah hanya TERPOPULER, tanpa Film Terkait lagi", () => {
    for (const [nama, sumber] of [
      ["drama", DRAMA],
      ["tonton", TONTON],
    ] as const) {
      expect(
        (sumber.match(/<PanelFilm/g) || []).length,
        `${nama}: PanelFilm digambar lebih dari sekali`,
      ).toBe(1);
      expect(sumber).toContain("sudahTampil={terkaitSidebar.map((t) => t.id)}");
    }
  });
});
