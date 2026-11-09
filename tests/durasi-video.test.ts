// Penjaga pembaca durasi dari header MP4 (lib/durasi-video.ts).
//
// Kenapa bisa diuji tanpa video sungguhan: atom `mvhd` punya tata letak byte
// yang BAKU, jadi potongannya bisa dirakit di sini. Itu sekaligus yang membuat
// tes ini berarti — video asli hanya tersedia lewat tunnel PC backup yang
// butuh VIDEO_SIGNING_SECRET, jadi tes yang bergantung padanya akan merah
// karena jaringan, bukan karena kodenya salah.
import { describe, it, expect } from "vitest";
import {
  BYTE_HEADER_DIBACA,
  JANGKAUAN_DICOBA,
  detikDariHeaderMp4,
  detikKeDurasiEpisode,
  dramaButuhDurasi,
  durasinyaSudahBenar,
} from "../lib/durasi-video";
import type { Drama } from "../lib/types";

/**
 * Rakit potongan byte berisi satu atom `mvhd`, diselipkan di antara isi lain
 * supaya tesnya membuktikan PENCARIAN atomnya bekerja — bukan cuma pembacaan
 * di offset 0 yang kebetulan pas.
 *
 * ⚠️ OFFSET DI SINI DITULIS DARI SPESIFIKASI (ISO/IEC 14496-12), BUKAN dari
 * kode yang diuji. Itu bukan kerewelan: versi pertama tes ini menyalin offset
 * dari implementasinya, jadi ketika implementasinya meleset 4 byte, tesnya
 * ikut meleset dan tetap HIJAU — cacatnya baru ketahuan setelah TAYANG, saat
 * berkas produksi sungguhan dibaca. Tes yang merakit data dengan asumsi yang
 * sama dengan kodenya tidak menguji apa pun.
 *
 *   ukuran(4) | "mvhd" | versi(1) | flags(3)
 *   v0: creation(4) @+8  · modification(4) @+12 · timescale(4) @+16 · duration(4) @+20
 *   v1: creation(8) @+8  · modification(8) @+16 · timescale(4) @+24 · duration(8) @+28
 */
function mvhd(
  versi: 0 | 1,
  timescale: number,
  duration: number,
  depan = 48,
  /** Ukuran atom yang ditulis di header — bisa dipalsukan untuk menguji penjaga. */
  ukuranAtom = versi === 1 ? 120 : 108,
): Uint8Array {
  const buf = new Uint8Array(depan + 160);
  const view = new DataView(buf.buffer);
  // Isi pembuka ala berkas nyata ("ftyp..."), supaya bukan nol semua.
  buf.set([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], 0);

  // Ukuran atom duduk 4 byte SEBELUM namanya — itu yang dipakai penjaga
  // kecocokan-palsu di lib/durasi-video.ts.
  view.setUint32(depan - 4, ukuranAtom);
  buf.set([0x6d, 0x76, 0x68, 0x64], depan); // "mvhd"
  buf[depan + 4] = versi;
  // Stempel waktu diisi angka BESAR yang mirip nilai nyata (detik sejak 1904).
  // Kalau offsetnya bergeser, angka inilah yang akan terbaca sebagai timescale
  // — persis kegagalan nyata 2026-11-09 — sehingga tesnya merah, bukan hijau.
  if (versi === 1) {
    view.setBigUint64(depan + 8, BigInt(3_865_645_486)); // creation
    view.setBigUint64(depan + 16, BigInt(3_865_645_486)); // modification
    view.setUint32(depan + 24, timescale);
    view.setBigUint64(depan + 28, BigInt(duration));
  } else {
    view.setUint32(depan + 8, 3_865_645_486); // creation
    view.setUint32(depan + 12, 3_865_645_486); // modification
    view.setUint32(depan + 16, timescale);
    view.setUint32(depan + 20, duration);
  }
  return buf;
}

describe("detikDariHeaderMp4 — baca durasi dari byte berkas", () => {
  it("PENJAGA OFFSET: angka NYATA dari berkas produksi terbaca benar", () => {
    // timescale 1000 & duration 135600 diambil dari berkas sungguhan
    // permaisuri-bangkit-di-dunia-modern/1.mp4 (diukur 2026-11-09) = 2:16.
    //
    // Tes ini ada karena versi pertama kode membaca offset +12/+16 (meleset
    // 4 byte) dan memulangkan 0,00000026 detik dari berkas yang sama. Angka
    // itu tidak melempar error — ia cuma salah, dan lolos ke produksi.
    const detik = detikDariHeaderMp4(mvhd(0, 1000, 135_600));
    expect(detik).toBeCloseTo(135.6);
    expect(detikKeDurasiEpisode(detik!)).toBe("2.16");
  });

  it("membaca mvhd versi 0 (bentuk paling umum)", () => {
    // 107 detik @ timescale 1000 = 107000 satuan → 1 menit 47 detik, nilai
    // drama "Putrinya Disakiti, Dewa Perang Akhirnya Bangkit".
    expect(detikDariHeaderMp4(mvhd(0, 1000, 107_000))).toBeCloseTo(107);
    expect(detikDariHeaderMp4(mvhd(0, 600, 64_200))).toBeCloseTo(107);
  });

  it("kecocokan PALSU 'mvhd' di tengah data video tidak dipakai", () => {
    // Pencarian 4 huruf pasti sesekali menabrak data gambar yang kebetulan
    // berbunyi sama. Penjaganya: ukuran atom WAJIB 108 (v0) / 120 (v1).
    // Tanpa ini, berkas produksi menghasilkan timescale 3.865.645.486.
    expect(detikDariHeaderMp4(mvhd(0, 1000, 135_600, 48, 9999))).toBeNull();
    expect(detikDariHeaderMp4(mvhd(1, 1000, 135_600, 48, 108))).toBeNull();
  });

  it("melewati kecocokan palsu lalu menemukan atom yang ASLI di belakangnya", () => {
    // `continue`, bukan `return`: atom sungguhan sering duduk SESUDAH
    // kecocokan palsu — di berkas produksi, mvhd asli ada di byte ke-108.132.
    const palsu = mvhd(0, 1000, 135_600, 48, 9999);
    const asli = mvhd(0, 1000, 107_000);
    const gabung = new Uint8Array(palsu.length + asli.length);
    gabung.set(palsu, 0);
    gabung.set(asli, palsu.length);
    expect(detikDariHeaderMp4(gabung)).toBeCloseTo(107);
  });

  it("membaca mvhd versi 1 (durasi 64-bit)", () => {
    // Tata letak versi 1 BERBEDA. Kalau versi diabaikan dan selalu dibaca
    // sebagai versi 0, hasilnya angka sampah yang tetap terlihat seperti
    // durasi — kerusakan senyap, bukan error.
    expect(detikDariHeaderMp4(mvhd(1, 90_000, 9_630_000))).toBeCloseTo(107);
  });

  it("menemukan mvhd walau letaknya jauh di dalam berkas", () => {
    expect(detikDariHeaderMp4(mvhd(0, 1000, 107_000, 4096))).toBeCloseTo(107);
  });

  it("durasi 'tidak diketahui' DITOLAK, bukan dihitung", () => {
    // 0xFFFFFFFF adalah penanda baku "panjang tak diketahui" (siaran langsung,
    // rekaman terputus). Dibagi timescale, angkanya jadi durasi raksasa yang
    // terlihat sah — persis jenis angka bohong yang poster tidak boleh pajang.
    expect(detikDariHeaderMp4(mvhd(0, 1000, 0xffffffff))).toBeNull();
  });

  it("byte tanpa mvhd memulangkan null, bukan menebak", () => {
    expect(detikDariHeaderMp4(new Uint8Array(512))).toBeNull();
    expect(detikDariHeaderMp4(new Uint8Array([1, 2, 3]))).toBeNull();
    expect(detikDariHeaderMp4(new Uint8Array(0))).toBeNull();
  });

  it("timescale atau duration nol tidak menghasilkan pembagian nol", () => {
    expect(detikDariHeaderMp4(mvhd(0, 0, 107_000))).toBeNull();
    expect(detikDariHeaderMp4(mvhd(0, 1000, 0))).toBeNull();
  });

  it("potongan yang terpotong tepat di tengah mvhd tidak melempar error", () => {
    // Tanpa penjaga panjang, DataView melempar RangeError dan endpoint balas
    // 500 — padahal yang benar adalah "tidak terbaca" (422).
    const penuh = mvhd(0, 1000, 107_000);
    for (let potong = 48; potong < 60; potong++) {
      expect(() => detikDariHeaderMp4(penuh.slice(0, potong))).not.toThrow();
    }
  });
});

describe("detikKeDurasiEpisode — detik jadi bentuk kolom Durasi", () => {
  it("memakai bentuk M.SS yang sama dengan ketikan owner", () => {
    // Owner mengetik "1.47" sendiri di panel admin. Hasil pengukuran memakai
    // bentuk yang sama supaya terlihat seperti isian yang boleh disunting,
    // bukan format asing.
    expect(detikKeDurasiEpisode(107)).toBe("1.47");
    expect(detikKeDurasiEpisode(89)).toBe("1.29");
    expect(detikKeDurasiEpisode(45)).toBe("0.45");
    expect(detikKeDurasiEpisode(60)).toBe("1.00");
  });

  it("dibulatkan ke detik terdekat", () => {
    expect(detikKeDurasiEpisode(106.6)).toBe("1.47");
    expect(detikKeDurasiEpisode(107.4)).toBe("1.47");
  });

  it("nilai tak masuk akal ditolak, tidak disimpan diam-diam", () => {
    expect(detikKeDurasiEpisode(0)).toBeNull();
    expect(detikKeDurasiEpisode(-5)).toBeNull();
    expect(detikKeDurasiEpisode(NaN)).toBeNull();
    expect(detikKeDurasiEpisode(Infinity)).toBeNull();
    // Lebih dari 999 menit = pembacaan yang hampir pasti salah.
    expect(detikKeDurasiEpisode(1000 * 60)).toBeNull();
  });

  it("hasilnya BENAR-BENAR terbaca kembali oleh lib/format.ts", () => {
    // Ini yang membuat rantainya utuh: angka yang diukur harus bisa dibaca
    // ulang oleh aturan yang menggambar poster. Kalau salah satu sisi diubah
    // tanpa yang lain, hasil pengukuran tersimpan tapi tidak pernah tergambar.
    return import("../lib/format").then(({ durasiTayangan }) => {
      expect(durasiTayangan(detikKeDurasiEpisode(107), false)).toBe("1:47");
      expect(durasiTayangan(detikKeDurasiEpisode(45), false)).toBe("0:45");
      expect(durasiTayangan(detikKeDurasiEpisode(1342), false)).toBe("22:22");
    });
  });
});

describe("dramaButuhDurasi — pagar 'jangan timpa isian tangan'", () => {
  const d = (p: Partial<Drama>): Drama =>
    ({
      id: "d",
      title: "Drama",
      category: "Action",
      episodes: 10,
      views: "0",
      synopsis: "",
      gradient: "from-zinc-800 to-black",
      ...p,
    }) as Drama;

  it("serial ber-'119 min' DIANGGAP belum benar", () => {
    // Inti masalahnya: "119 min" lolos sebagai teks tapi TIDAK PERNAH
    // tergambar di poster serial. Kalau pagar ini menganggapnya sudah benar,
    // 25 drama itu tidak akan pernah ikut dicentang dan pengisian massal jadi
    // tak ada gunanya untuk kasus yang justru memicunya.
    expect(durasinyaSudahBenar(d({ runtime: "119 min" }))).toBe(false);
    expect(dramaButuhDurasi([d({ runtime: "119 min" })])).toHaveLength(1);
  });

  it("serial yang durasinya SUDAH tergambar tidak ikut dicentang", () => {
    // Ini sisi yang melindungi pekerjaan tangan owner: "1.47" sudah benar,
    // jadi hasil ukur tidak boleh menimpanya tanpa dia centang sendiri.
    expect(durasinyaSudahBenar(d({ runtime: "1.47" }))).toBe(true);
    expect(dramaButuhDurasi([d({ runtime: "1.47" })])).toHaveLength(0);
  });

  it("FILM memakai aturannya sendiri, bukan aturan episode", () => {
    // Teks yang sama berarti beda per jenis. Kalau pagar ini memakai satu
    // aturan saja, SELURUH film akan terus-menerus dianggap "belum benar"
    // (atau sebaliknya) dan ikut ditimpa tiap kali massal dijalankan.
    const film = { kind: "movie", episodes: 1 } as const;
    expect(durasinyaSudahBenar(d({ ...film, runtime: "119 min" }))).toBe(true);
    expect(durasinyaSudahBenar(d({ ...film, runtime: "1.47" }))).toBe(true);
    // Serial dengan teks film = belum benar; film dengan teks episode = benar
    // (dibaca 1 jam 47 menit). Keduanya dikunci berdampingan di sini.
    expect(durasinyaSudahBenar(d({ runtime: "119 min" }))).toBe(false);
  });

  it("durasi kosong selalu masuk daftar yang perlu diisi", () => {
    expect(durasinyaSudahBenar(d({}))).toBe(false);
    expect(durasinyaSudahBenar(d({ runtime: "" }))).toBe(false);
    expect(durasinyaSudahBenar(d({ runtime: "N/A" }))).toBe(false);
  });

  it("menyaring daftar campuran apa adanya", () => {
    const daftar = [
      d({ id: "a", runtime: "119 min" }), // serial, belum benar
      d({ id: "b", runtime: "1.47" }), // serial, sudah benar
      d({ id: "c" }), // kosong
      d({ id: "d", kind: "movie", episodes: 1, runtime: "165 min" }), // film OK
    ];
    expect(dramaButuhDurasi(daftar).map((x) => x.id)).toEqual(["a", "c"]);
  });
});

describe("BYTE_HEADER_DIBACA — batas unduhan", () => {
  it("cukup besar untuk header, jauh lebih kecil dari satu episode", () => {
    expect(BYTE_HEADER_DIBACA).toBe(262_144);
  });
});

describe("JANGKAUAN_DICOBA — awal DAN ekor berkas", () => {
  it("mencoba ekor berkas, bukan cuma awalnya", () => {
    // PENJAGA KEGAGALAN NYATA 2026-11-09: versi pertama cuma membaca awal
    // berkas, dan "Hasil ukur" gagal pada 41 dari 41 judul. Seluruh video
    // DramaKu berbentuk `ftyp · free · mdat` — `moov` (tempat durasi) ada di
    // paling belakang. Kalau baris ini hilang, fiturnya mati total lagi.
    expect(JANGKAUAN_DICOBA).toEqual([
      "bytes=0-262143",
      "bytes=-262144",
    ]);
  });

  it("awal dicoba LEBIH DULU", () => {
    // Berkas ber-faststart jauh lebih murah dibaca dari awal, dan tiap
    // percobaan = satu permintaan ke tunnel PC backup rumahan.
    expect(JANGKAUAN_DICOBA[0]).toMatch(/^bytes=0-/);
    expect(JANGKAUAN_DICOBA[1]).toMatch(/^bytes=-/);
  });
});
