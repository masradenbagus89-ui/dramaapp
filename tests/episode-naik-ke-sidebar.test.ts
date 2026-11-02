import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";

/**
 * EPISODE ↔ DRAMA TERKAIT BERTUKAR TEMPAT (owner 2026-11-02)
 *
 * *"tukar tempat drama terkait menjadi drama episode, drama episode menjadi
 * drama terkait, ini khusus drama ya — agar ketika di hp penonton tidak
 * scroll ke bawah bisa langsung ditonton."*
 *
 * Yang dijaga berkas ini BUKAN selera tata letak, melainkan satu fakta yang
 * tidak kelihatan dari layar desktop: di bawah `lg` kedua grid halaman drama
 * runtuh jadi satu kolom, dan isinya bertumpuk mengikuti URUTAN TULISAN di
 * berkas sumber. Jadi "siapa duluan di kode" = "siapa duluan dilihat penonton
 * HP". Menggeser blok ke tempat yang terlihat setara di desktop bisa
 * mengembalikan masalahnya di HP tanpa satu pun error.
 */
describe("daftar episode naik ke sidebar halaman drama", () => {
  const DRAMA = readFileSync("app/drama/[id]/page.tsx", "utf-8");

  it("komponen panel episode benar-benar ada", () => {
    expect(existsSync("app/components/film/PanelEpisode.tsx")).toBe(true);
  });

  it("pertukaran hanya untuk SERIAL yang punya episode", () => {
    // `!film` — halaman film tidak boleh ikut berubah (owner: "khusus drama").
    // `episodes > 0` — serial tanpa episode terdaftar akan menukar sidebar
    // berisi daftar dengan sidebar KOSONG.
    expect(DRAMA).toContain(
      "const tukarEpisodeKeSidebar = !film && drama.episodes > 0;",
    );
  });

  it("episode ditulis SEBELUM sinopsis, terkait SESUDAHNYA", () => {
    const panelEpisode = DRAMA.indexOf("<PanelEpisode");
    const sinopsis = DRAMA.indexOf(">\n          Sinopsis");
    const terkaitTerakhir = DRAMA.lastIndexOf("{panelTerkait}");

    expect(panelEpisode, "PanelEpisode tidak dipasang").toBeGreaterThan(-1);
    expect(sinopsis, "judul Sinopsis tidak ketemu").toBeGreaterThan(-1);

    expect(
      panelEpisode,
      "daftar episode turun ke bawah sinopsis — penonton HP harus menggulung " +
        "melewati sinopsis & tabel info sebelum bisa menonton, persis keluhan " +
        "yang membuat blok ini ditukar",
    ).toBeLessThan(sinopsis);

    expect(
      terkaitTerakhir,
      "Drama Terkait naik lagi ke atas sinopsis — ia merebut kembali tempat " +
        "yang sekarang milik daftar episode",
    ).toBeGreaterThan(sinopsis);
  });

  it("panel terkait tetap dirakit SEKALI, bukan disalin ke dua cabang", () => {
    // Halaman ini pernah menggambar film terkait dua kali sekaligus (owner
    // 2026-10-29: "yang bawah kamu hapus"). Satu elemen yang dipasang di salah
    // satu dari dua tempat membuat pengulangan itu mustahil.
    expect((DRAMA.match(/<PanelFilm/g) || []).length).toBe(1);
    expect(DRAMA).toContain("const panelTerkait = (");
  });

  it("saklar tampilan panel terkait mengikuti TEMPATNYA", () => {
    // Gelap+gulung hanya benar di bingkai hero; petak hanya benar di kartu
    // putih yang lebar. Kalau dipisah dari `tukarEpisodeKeSidebar`, daftar
    // bisa tergambar gelap di atas kartu putih tanpa error apa pun.
    expect(DRAMA).toContain("gelap={!tukarEpisodeKeSidebar}");
    expect(DRAMA).toContain("gulung={!tukarEpisodeKeSidebar}");
    expect(DRAMA).toContain("petak={tukarEpisodeKeSidebar}");
  });

  it("daftar terkait dipotong lebih pendek saat turun ke kartu putih", () => {
    // Di sidebar daftarnya punya gulungan sendiri, di kartu putih tidak —
    // 20 judul di sana mendorong kolom nilai & komentar jauh ke bawah.
    expect(DRAMA).toContain("const TERKAIT_BADAN = 12;");
    expect(DRAMA).toContain(
      "tukarEpisodeKeSidebar ? TERKAIT_BADAN : TERKAIT_SIDEBAR,",
    );
  });
});

describe("PanelEpisode aman di layar sempit", () => {
  const PANEL = readFileSync("app/components/film/PanelEpisode.tsx", "utf-8");

  it("gulungan HANYA di layar lebar", () => {
    // Di HP panel ini mengalir mengikuti halaman. Mengunci tingginya di sana
    // memasang area gulung DI DALAM halaman yang juga digulung — gulungan
    // bersarang, hal yang paling sering membuat jari penonton nyangkut.
    // Pagar yang sama sudah dipakai PanelFilm.
    const semua = PANEL.split("overflow-y-auto").length - 1;
    const berprefiks = PANEL.split("lg:overflow-y-auto").length - 1;
    expect(
      semua,
      "ada overflow-y-auto tanpa awalan lg: — daftar episode ikut mengunci " +
        "tinggi di HP",
    ).toBe(berprefiks);
  });

  it("mengunci diri pada tinggi hero, bukan memanjangkan bingkainya", () => {
    // Berpasangan dengan `lg:absolute lg:inset-0` di halaman drama. Tanpa
    // keduanya, serial 40+ episode membuat bingkai hitam memanjang sampai
    // hero terlihat mengambang di kotak kebesaran.
    expect(PANEL).toContain("lg:h-full");
    expect(PANEL).toContain("lg:flex-1 lg:overflow-y-auto");
    expect(
      readFileSync("app/drama/[id]/page.tsx", "utf-8"),
      "induk sidebar kehilangan lg:absolute — panel episode akan " +
        "memanjangkan bingkai hero",
    ).toContain("lg:absolute lg:inset-0");
  });

  it("nol episode = panel tidak digambar sama sekali", () => {
    // Judul "EPISODE" di atas ruang hampa terbaca seperti halaman gagal muat.
    expect(PANEL).toContain("if (episodes <= 0) return null;");
  });
});

describe("saklar baru TIDAK bocor ke pemakai lain", () => {
  it("EpisodeList: bentuk ringkas default MATI", () => {
    // Bentuk ringkas mengecilkan gambar dan membuang badge status. Kalau
    // defaultnya menyala, tampilan lebar ikut menyusut tanpa ada yang meminta.
    expect(
      readFileSync("app/components/EpisodeList.tsx", "utf-8"),
    ).toContain("ringkas = false");
  });

  it("PanelFilm: tata petak default MATI", () => {
    // PanelFilm juga menggambar "Terpopuler" di kolom 300px dan film terkait
    // di /tonton. Petak menyala di kolom sempit = tiga kolom selebar 90px.
    expect(
      readFileSync("app/components/film/PanelFilm.tsx", "utf-8"),
    ).toContain("petak = false");
  });

  it("halaman /tonton tidak ikut tertukar", () => {
    // Owner menyebut eksplisit "ini khusus drama". Halaman tonton memutar
    // video Playly yang memang tidak punya daftar episode.
    const TONTON = readFileSync("app/tonton/[id]/page.tsx", "utf-8");
    expect(TONTON).not.toContain("PanelEpisode");
    expect(TONTON).toContain("items={terkaitSidebar}");
  });
});
