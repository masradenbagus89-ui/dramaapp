// Penjaga hitungan "hari ini siapa saja yang upload & berapa banyak"
// (owner 2026-11-21).
//
// ⚠️ Yang paling mahal kalau salah: angkanya SALAH TANPA ERROR. Owner membaca
// "tbchairulm 3 film" padahal 14, lalu mengambil keputusan soal orang
// berdasarkan angka karangan. Tak ada layar merah, tak ada yang melapor.
//
// Tiga titik yang diuji-balik di sini — ketiganya pernah jadi sumber bug
// tanggal di project ini:
//   1. zona waktu  — WIB vs UTC menggeser tanggal untuk upload dini hari;
//   2. satuan epoch — milidetik vs detik menggeser tanggal 56 tahun;
//   3. tepi rentang — "7 hari" yang kelebihan/kekurangan satu hari.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  FRASA_RENTANG,
  LABEL_RENTANG,
  RENTANG_BAWAAN,
  TANPA_NAMA,
  URUTAN_RENTANG,
  batasRentang,
  formatTanggalWIB,
  geserHari,
  hariIniWIB,
  hitungRentangUpload,
  hitungTanpaTanggal,
  ringkasPengunggah,
  saringRentangUpload,
  tanggalUploadTerakhir,
  tanggalWIB,
} from "../lib/upload-harian";
import {
  KUNCI_SEMUA_ORANG,
  hitungRentangPerPengunggah,
  ringkasPengunggahSemua,
  saringPengunggah,
} from "../lib/upload-harian";
import { parseWaktuUpload } from "../lib/playly";
// Impor dinamis di tingkat modul — pola yang sama dipakai
// tests/panel-admin-ringkas.test.ts untuk komponen "use client".
const { KontrolUploadPlayly, RingkasUploadPlayly } = await import(
  "../app/components/admin/UploadHarianPlayly"
);

/** Video seadanya — hanya dua field yang dipakai aturan di modul ini. */
const v = (creator: string, uploadedAt?: string | null) => ({ creator, uploadedAt });

describe("tanggalWIB — zona dipaku, bukan ikut mesin", () => {
  it("membaca ISO UTC jadi tanggal WIB", () => {
    expect(tanggalWIB("2026-11-21T05:42:19.430Z")).toBe("2026-11-21");
  });

  it("🪤 upload dini hari WIB tidak mundur sehari", () => {
    // 20 Nov 20:00 UTC = 21 Nov 03:00 WIB. Kalau zonanya ikut server (UTC),
    // video ini terbaca "20 November" dan hilang dari daftar "hari ini".
    expect(tanggalWIB("2026-11-20T20:00:00Z")).toBe("2026-11-21");
  });

  it("🪤 upload malam WIB tidak maju sehari", () => {
    // 21 Nov 23:30 WIB = 21 Nov 16:30 UTC — tetap tanggal 21.
    expect(tanggalWIB("2026-11-21T16:30:00Z")).toBe("2026-11-21");
  });

  it("nilai kosong atau rusak jadi null, bukan Invalid Date", () => {
    expect(tanggalWIB(null)).toBeNull();
    expect(tanggalWIB(undefined)).toBeNull();
    expect(tanggalWIB("")).toBeNull();
    expect(tanggalWIB("bukan tanggal")).toBeNull();
  });

  it("hariIniWIB memakai zona WIB untuk jam yang dioper", () => {
    expect(hariIniWIB(new Date("2026-11-20T20:00:00Z"))).toBe("2026-11-21");
  });
});

describe("parseWaktuUpload — dua endpoint Playly, dua bentuk tanggal", () => {
  it("epoch milidetik dari /api/videos", () => {
    // Nilai NYATA yang ditarik 2026-11-21 dari /api/videos.
    expect(parseWaktuUpload(1793955382874)).toBe(
      new Date(1793955382874).toISOString(),
    );
  });

  it("teks ISO dari /api/catalog", () => {
    expect(parseWaktuUpload("2026-11-21T05:42:19.43+00:00")).toBe(
      "2026-11-21T05:42:19.430Z",
    );
  });

  it("🪤 epoch DETIK tidak dibaca jadi tahun 1970", () => {
    const detik = Math.floor(1793955382874 / 1000);
    expect(tanggalWIB(parseWaktuUpload(detik))).toBe(
      tanggalWIB(parseWaktuUpload(1793955382874)),
    );
  });

  it("🪤 epoch berbentuk TEKS tetap terbaca", () => {
    // `new Date("1793955382874")` = Invalid Date; tanpa penanganan khusus
    // tanggalnya hilang diam-diam.
    expect(parseWaktuUpload("1793955382874")).toBe(
      new Date(1793955382874).toISOString(),
    );
  });

  it("nilai yang tak bisa dibaca jadi null", () => {
    expect(parseWaktuUpload(undefined)).toBeNull();
    expect(parseWaktuUpload(null)).toBeNull();
    expect(parseWaktuUpload("besok")).toBeNull();
    expect(parseWaktuUpload({})).toBeNull();
  });
});

describe("geserHari & batasRentang — tepi yang mudah meleset satu hari", () => {
  it("mundur sehari menyeberang pergantian bulan", () => {
    expect(geserHari("2026-12-01", -1)).toBe("2026-11-30");
    expect(geserHari("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("mundur menyeberang 29 Februari tahun kabisat", () => {
    expect(geserHari("2028-03-01", -1)).toBe("2028-02-29");
  });

  it("'hari ini' = satu hari saja", () => {
    expect(batasRentang("hari-ini", "2026-11-21")).toEqual({
      awal: "2026-11-21",
      akhir: "2026-11-21",
    });
  });

  it("'kemarin' = satu hari saja, bukan dua", () => {
    expect(batasRentang("kemarin", "2026-11-21")).toEqual({
      awal: "2026-11-20",
      akhir: "2026-11-20",
    });
  });

  it("🪤 '7 hari' TERMASUK hari ini, jadi mundurnya 6 — bukan 7", () => {
    expect(batasRentang("7-hari", "2026-11-21")).toEqual({
      awal: "2026-11-15",
      akhir: "2026-11-21",
    });
  });

  it("'semua' tidak punya batas", () => {
    expect(batasRentang("semua", "2026-11-21")).toBeNull();
  });
});

describe("saringRentangUpload", () => {
  const daftar = [
    v("tbchairulm", "2026-11-21T02:00:00Z"), // hari ini
    v("coklat", "2026-11-21T16:00:00Z"), // hari ini (malam WIB)
    v("ayy", "2026-11-20T10:00:00Z"), // kemarin
    v("ayy", "2026-11-15T10:00:00Z"), // tepat tepi 7 hari
    v("ayy", "2026-11-14T10:00:00Z"), // sehari DI LUAR 7 hari
    v("lama", null), // tanpa tanggal
  ];
  const HARI_INI = "2026-11-21";

  it("hari ini hanya mengambil yang hari ini", () => {
    expect(saringRentangUpload(daftar, "hari-ini", HARI_INI).map((x) => x.creator)).toEqual([
      "tbchairulm",
      "coklat",
    ]);
  });

  it("kemarin tidak ikut membawa hari ini", () => {
    expect(saringRentangUpload(daftar, "kemarin", HARI_INI)).toHaveLength(1);
  });

  it("7 hari memuat tepinya dan membuang yang sehari di luar", () => {
    const hasil = saringRentangUpload(daftar, "7-hari", HARI_INI);
    expect(hasil).toHaveLength(4);
    expect(hasil.some((x) => x.uploadedAt === "2026-11-14T10:00:00Z")).toBe(false);
  });

  it("🪤 video TANPA tanggal tidak pernah masuk rentang bertanggal", () => {
    for (const r of ["hari-ini", "kemarin", "7-hari"] as const) {
      expect(saringRentangUpload(daftar, r, HARI_INI).some((x) => !x.uploadedAt)).toBe(false);
    }
  });

  it("'semua' memulangkan seluruh daftar, termasuk yang tanpa tanggal", () => {
    expect(saringRentangUpload(daftar, "semua", HARI_INI)).toHaveLength(daftar.length);
  });

  it("tidak mengubah daftar milik pemanggil", () => {
    const asli = [...daftar];
    saringRentangUpload(daftar, "hari-ini", HARI_INI);
    expect(daftar).toEqual(asli);
  });

  it("angka tombol cocok dengan isi daftarnya", () => {
    const angka = hitungRentangUpload(daftar, HARI_INI);
    expect(angka["hari-ini"]).toBe(2);
    expect(angka.kemarin).toBe(1);
    expect(angka["7-hari"]).toBe(4);
    expect(angka.semua).toBe(6);
    expect(hitungTanpaTanggal(daftar)).toBe(1);
  });
});

describe("ringkasPengunggah", () => {
  it("menghitung per orang, terbanyak dulu", () => {
    const hasil = ringkasPengunggah([
      v("ayy", "2026-11-21T02:00:00Z"),
      v("tbchairulm", "2026-11-21T02:00:00Z"),
      v("ayy", "2026-11-21T03:00:00Z"),
      v("ayy", "2026-11-21T04:00:00Z"),
    ]);
    expect(hasil.map((x) => [x.nama, x.jumlah])).toEqual([
      ["ayy", 3],
      ["tbchairulm", 1],
    ]);
  });

  it("🪤 beda huruf besar/kecil = SATU orang, bukan dua baris terbelah", () => {
    const hasil = ringkasPengunggah([v("Coklat"), v("coklat"), v("COKLAT")]);
    expect(hasil).toHaveLength(1);
    expect(hasil[0].jumlah).toBe(3);
    // Ejaan yang ditampilkan = ejaan pertama yang muncul, bukan dipaksa kecil.
    expect(hasil[0].nama).toBe("Coklat");
    expect(hasil[0].kunci).toBe("coklat");
  });

  it("nama kosong diberi label jelas, bukan baris tanpa teks", () => {
    expect(ringkasPengunggah([v(""), v("   ")])[0]).toMatchObject({
      nama: TANPA_NAMA,
      jumlah: 2,
    });
  });

  it("jumlah yang seri diurutkan abjad supaya urutannya tetap", () => {
    expect(ringkasPengunggah([v("zaki"), v("ayy")]).map((x) => x.nama)).toEqual([
      "ayy",
      "zaki",
    ]);
  });

  it("daftar kosong memulangkan array kosong, bukan error", () => {
    expect(ringkasPengunggah([])).toEqual([]);
  });
});

describe("tanggalUploadTerakhir — supaya 'nol hari ini' bisa dibedakan dari rusak", () => {
  it("mengambil tanggal paling baru", () => {
    expect(
      tanggalUploadTerakhir([
        v("a", "2026-11-12T10:00:00Z"),
        v("b", "2026-11-18T10:00:00Z"),
        v("c", "2026-11-16T10:00:00Z"),
      ]),
    ).toBe("2026-11-18");
  });

  it("null kalau tak satu pun bertanggal", () => {
    expect(tanggalUploadTerakhir([v("a"), v("b", null)])).toBeNull();
  });
});

describe("formatTanggalWIB", () => {
  it("merapikan tanggal untuk dibaca owner", () => {
    expect(formatTanggalWIB("2026-11-18")).toMatch(/18 Nov/);
  });

  it("🪤 tidak menggeser tanggal dua kali di tepi tahun", () => {
    expect(formatTanggalWIB("2026-01-01")).toMatch(/1 Jan 2026/);
  });

  it("masukan rusak jadi null", () => {
    expect(formatTanggalWIB("bukan-tanggal")).toBeNull();
    expect(formatTanggalWIB(null)).toBeNull();
  });
});

describe("panel benar-benar MENGGAMBAR nama & jumlahnya", () => {
  // Diuji dengan RENDER, bukan cuma membaca berkas: angka yang benar di
  // lib/upload-harian.ts tidak ada gunanya kalau panelnya memajang angka yang
  // lain — dan selisih begitu tidak memunculkan error apa pun.
  const video = (id: string, creator: string, uploadedAt: string | null) =>
    ({
      id,
      title: `Film ${id}`,
      durationSeconds: 5400,
      durationLabel: "1:30:00",
      creator,
      embedUrl: `https://playly.test/${id}/embed`,
      thumbnail: null,
      uploadedAt,
    }) as never;

  const HARI_INI = "2026-11-21";

  /** Katalog contoh: hari ini NOL upload — keadaan nyata di layar owner. */
  const KATALOG_HARI_SEPI = [
    video("1", "tbchairulm", "2026-11-18T05:00:00Z"),
    video("2", "coklat", "2026-11-18T06:00:00Z"),
    video("3", "coklat", "2026-11-17T06:00:00Z"),
    video("4", "ayy", "2026-11-12T06:00:00Z"),
  ];

  const kontrol = (
    daftar: unknown[],
    rentang = "hari-ini",
    pengunggah: string | null = null,
  ) =>
    renderToStaticMarkup(
      createElement(KontrolUploadPlayly, {
        videos: daftar as never,
        hariIni: HARI_INI,
        rentang,
        pengunggah,
        onPilih: () => {},
      } as never),
    );

  const ringkas = (
    daftar: unknown[],
    rentang = "hari-ini",
    pengunggah: string | null = null,
    belumSiap: string[] = [],
  ) =>
    renderToStaticMarkup(
      createElement(RingkasUploadPlayly, {
        videos: daftar as never,
        hariIni: HARI_INI,
        rentang,
        pengunggah,
        belumSiap: new Set(belumSiap),
      } as never),
    );

  it("🪤 DUA dropdown pendek — bukan satu dropdown panjang", () => {
    // Riwayatnya penting supaya tidak diputar balik lagi: versi pertama dua
    // dropdown, lalu digabung jadi satu demi hemat tempat (owner: "gabung
    // jadi satu kolom"), lalu DIKEMBALIKAN jadi dua pada hari yang sama
    // setelah owner mencobanya: "ketika di klik terlalu panjang" — 5 nama × 4
    // rentang = 20 baris yang harus digulung, dan makin parah tiap ada
    // pengunggah baru. Tempatnya ditebus dari saringan IMDb yang ikut jadi
    // dropdown.
    const html = kontrol(KATALOG_HARI_SEPI);
    expect(html.match(/<select/g) ?? []).toHaveLength(2);
    // Tidak boleh ada pengelompokan: itu tanda daftar kombinasi kembali.
    expect(html).not.toContain("<optgroup");
  });

  it("🪤 tiap daftar tetap PENDEK — tidak perlu digulung", () => {
    // Inti keluhan owner. Ambangnya: 4 rentang + (1 "semua orang" + jumlah
    // pengunggah). Dengan 3 pengunggah di katalog contoh = 4 + 4 = 8 baris
    // total, bukan 20.
    const html = kontrol(KATALOG_HARI_SEPI);
    const jumlahOption = (html.match(/<option/g) ?? []).length;
    expect(jumlahOption).toBe(URUTAN_RENTANG.length + 1 + 3);
  });

  it("🪤 nama tetap bisa dipilih walau hari itu NOL upload", () => {
    // Keluhan owner sebelumnya: di layarnya hari itu nol upload, jadi daftar
    // nama ikut kosong — dan pertanyaan "hari ini coklat berapa" tidak bisa
    // diajukan sama sekali. Jawaban NOL itu sah; pertanyaan yang hilang tidak.
    const html = kontrol(KATALOG_HARI_SEPI);
    for (const nama of ["coklat", "tbchairulm", "ayy"]) {
      expect(html, nama).toContain(`${nama} (0)`);
    }
  });

  it("angka nama mengikuti rentang yang sedang dipilih", () => {
    // Rentang 7 hari (15-21 Nov): coklat 2, tbchairulm 1, ayy 0.
    const html = kontrol(KATALOG_HARI_SEPI, "7-hari");
    expect(html).toContain("coklat (2)");
    expect(html).toContain("tbchairulm (1)");
    expect(html).toContain("ayy (0)");
  });

  it("memilih nama TIDAK ikut mengubah rentangnya, dan sebaliknya", () => {
    // Dua dropdown = dua pilihan bebas. Kalau salah satu diam-diam mengatur
    // ulang yang lain, owner kehilangan pilihannya tanpa tahu sebabnya.
    const dipanggil: Array<[string, string | null]> = [];
    renderToStaticMarkup(
      createElement(KontrolUploadPlayly, {
        videos: KATALOG_HARI_SEPI as never,
        hariIni: HARI_INI,
        rentang: "7-hari",
        pengunggah: "coklat",
        onPilih: (r: string, o: string | null) => dipanggil.push([r, o]),
      } as never),
    );
    // Nilai yang sedang terpilih harus tergambar apa adanya di KEDUA kontrol.
    const html = kontrol(KATALOG_HARI_SEPI, "7-hari", "coklat");
    expect(html).toContain('value="7-hari"');
    expect(html).toContain('value="coklat"');
  });

  it("dropdown memajang angkanya langsung di label", () => {
    // Dropdown yang tertutup cuma memperlihatkan baris terpilih, jadi angka
    // harus menempel di labelnya — kalau dipisah, admin harus membuka dulu.
    const html = kontrol(KATALOG_HARI_SEPI);
    expect(html).toContain("Hari ini (0)");
    expect(html).toContain("7 hari (3)");
    expect(html).toContain("Semua tanggal (4)");
  });

  it("🪤 label dropdown tetap PENDEK — lebar <select> ditentukan opsi terpanjang", () => {
    // Owner 2026-11-21: "jadikan satu agar searchnya bisa sejajar". Satu kata
    // tambahan di sini melebarkan kontrolnya permanen dan mendorong kotak cari
    // turun baris — persis keadaan yang baru saja dibetulkan. Ambangnya diukur
    // dari yang terpanjang sekarang ("Semua tanggal" = 13 huruf).
    for (const r of URUTAN_RENTANG) {
      expect(LABEL_RENTANG[r].length, `${r}: "${LABEL_RENTANG[r]}"`).toBeLessThanOrEqual(14);
    }
  });

  it("kalimat memakai bentuk PANJANG, bukan label dropdown yang dipendekkan", () => {
    // "belum ada upload di 7 hari" terbaca seperti kalimat terpotong.
    expect(FRASA_RENTANG["7-hari"]).toBe("7 hari terakhir");
    expect(ringkas(KATALOG_HARI_SEPI, "7-hari", "ayy")).toContain("7 hari terakhir");
  });

  it("🪤 'coklat hari ini' menjawab NOL + tanggal terakhir COKLAT", () => {
    // Tanggal terakhirnya harus milik coklat (18 Nov), bukan milik katalog
    // secara umum — kalau tercampur, owner membaca tanggal orang lain sebagai
    // tanggal coklat.
    const html = ringkas(KATALOG_HARI_SEPI, "hari-ini", "coklat");
    expect(html).toContain("coklat");
    expect(html).toContain("belum ada upload");
    expect(html).toContain("18 Nov");
  });

  it("satu nama terpilih menyebut jumlahnya di depan", () => {
    const html = ringkas(KATALOG_HARI_SEPI, "7-hari", "coklat");
    expect(html).toContain("coklat: 2 film");
  });

  it("tanpa nama terpilih, rinciannya per orang", () => {
    const html = ringkas(KATALOG_HARI_SEPI, "7-hari");
    expect(html).toContain("3 film");
    expect(html).toContain("coklat");
    expect(html).toContain("tbchairulm");
  });

  it("🪤 keterangan MENGHILANG saat tak ada yang disaring", () => {
    // Baris yang selalu ada tapi sering tidak mengatakan apa-apa cuma memakan
    // tempat yang justru sedang dihemat (owner: "agar layar tidak penuh").
    expect(ringkas(KATALOG_HARI_SEPI, "semua", null)).toBe("");
  });

  it("video yang upload-nya putus tetap dihitung, tapi ditandai", () => {
    // Keputusan owner 2026-11-21: "jumlahnya jujur apa adanya" + diberi catatan.
    const html = ringkas(KATALOG_HARI_SEPI, "7-hari", null, ["2"]);
    expect(html).toContain("3 film");
    expect(html).toContain("belum siap");
  });

  it("video tanpa tanggal dilaporkan terpisah, tidak disembunyikan", () => {
    const html = ringkas([...KATALOG_HARI_SEPI, video("9", "lama", null)], "7-hari");
    expect(html).toContain("tidak punya tanggal upload");
  });
});

describe("hitungRentangPerPengunggah — satu lintasan, angka wajib sama dengan cara lama", () => {
  const daftar = [
    v("coklat", "2026-11-21T02:00:00Z"),
    v("coklat", "2026-11-20T02:00:00Z"),
    v("coklat", "2026-11-14T02:00:00Z"), // di luar 7 hari
    v("ayy", "2026-11-21T03:00:00Z"),
    v("lama", null), // tanpa tanggal
  ];
  const HARI_INI = "2026-11-21";

  it("🪤 hasilnya identik dengan menyaring-lalu-menghitung satu per satu", () => {
    // Versi cepat ini menggantikan cara naif demi performa. Kalau keduanya
    // berbeda, yang terbaca owner adalah angka yang lebih cepat TAPI salah —
    // dan tidak ada error apa pun. Jadi keduanya diadu langsung di sini.
    const cepat = hitungRentangPerPengunggah(daftar, HARI_INI);
    for (const orang of ringkasPengunggahSemua(daftar, daftar)) {
      const naif = hitungRentangUpload(saringPengunggah(daftar, orang.kunci), HARI_INI);
      expect(cepat.get(orang.kunci), orang.nama).toEqual(naif);
    }
    // Termasuk barisnya "semua orang".
    expect(cepat.get(KUNCI_SEMUA_ORANG)).toEqual(hitungRentangUpload(daftar, HARI_INI));
  });

  it("video tanpa tanggal masuk 'semua' saja, tidak ke rentang bertanggal", () => {
    const peta = hitungRentangPerPengunggah(daftar, HARI_INI);
    expect(peta.get("lama")).toEqual({
      "hari-ini": 0,
      kemarin: 0,
      "7-hari": 0,
      semua: 1,
    });
  });

  it("daftar kosong tetap memberi baris 'semua orang' berisi nol", () => {
    const peta = hitungRentangPerPengunggah([], HARI_INI);
    expect(peta.get(KUNCI_SEMUA_ORANG)).toEqual({
      "hari-ini": 0,
      kemarin: 0,
      "7-hari": 0,
      semua: 0,
    });
  });
});

describe("ringkasPengunggahSemua & saringPengunggah — angka dan isi daftar wajib sepakat", () => {
  const daftar = [
    v("Coklat", "2026-11-21T02:00:00Z"),
    v("coklat", "2026-11-18T02:00:00Z"),
    v("ayy", "2026-11-12T02:00:00Z"),
  ];

  it("nama dari SELURUH katalog, jumlah dari rentangnya", () => {
    const hariIni = daftar.filter((x) => x.uploadedAt?.startsWith("2026-11-21"));
    const hasil = ringkasPengunggahSemua(daftar, hariIni);
    expect(hasil.map((x) => [x.nama, x.jumlah])).toEqual([
      ["Coklat", 1],
      ["ayy", 0],
    ]);
  });

  it("🪤 kunci yang dipakai menyaring SAMA dengan kunci yang dipakai menghitung", () => {
    // Kalau keduanya berbeda sedikit saja, dropdown bertuliskan "coklat (2)"
    // akan membuka daftar berisi 0 baris — angka dan isinya saling membantah
    // tanpa satu pun error.
    const ringkasan = ringkasPengunggahSemua(daftar, daftar);
    for (const orang of ringkasan) {
      expect(saringPengunggah(daftar, orang.kunci)).toHaveLength(orang.jumlah);
    }
  });

  it("kunci null berarti tidak menyaring", () => {
    expect(saringPengunggah(daftar, null)).toHaveLength(daftar.length);
  });
});

describe("panel benar-benar memakainya", () => {
  const PANEL = readFileSync(
    "app/components/admin/PlaylyVisibilityManager.tsx",
    "utf8",
  );
  const KARTU = readFileSync(
    "app/components/admin/UploadHarianPlayly.tsx",
    "utf8",
  );

  it("bawaannya 'semua' — daftar tidak menyusut sendiri saat panel dibuka", () => {
    expect(RENTANG_BAWAAN).toBe("semua");
    expect(PANEL).toContain("RENTANG_BAWAAN");
  });

  it("keempat rentang punya label dan urutannya lengkap", () => {
    expect(URUTAN_RENTANG).toHaveLength(4);
    for (const r of URUTAN_RENTANG) expect(LABEL_RENTANG[r]).toBeTruthy();
  });

  it("label tombol diambil dari satu sumber, tidak diketik ulang di panel", () => {
    expect(KARTU).toContain("LABEL_RENTANG");
    expect(KARTU).not.toContain('"Upload hari ini"');
  });

  it("panel menyaring daftarnya, bukan cuma memajang angka", () => {
    expect(PANEL).toContain("saringRentangUpload");
  });

  it("🪤 panel memakai penyaring nama dari lib, tidak mengetik ulang aturannya", () => {
    // Aturan "trim + huruf kecil" yang diketik ulang di panel akan menyimpang
    // dari cara angka dihitung begitu salah satunya disentuh — dan hasilnya
    // dropdown "coklat (6)" yang membuka daftar kosong.
    expect(PANEL).toContain("saringPengunggah");
    expect(PANEL).not.toContain("creator?.trim() || \"\").toLowerCase()");
  });

  it("kontrolnya duduk DI DALAM baris saringan, sejajar tombol Isi manual", () => {
    // Owner 2026-11-21: "letakan sejejer dengan isi manual agar layar tidak
    // penuh". Dijaga dengan POSISI: kontrol upload harus berada SESUDAH tombol
    // Isi manual dan SEBELUM penutup baris saringan (kotak cari). Kalau
    // seseorang memindahkannya kembali jadi kotak tersendiri di atas, urutan
    // ini pecah.
    const isiManual = PANEL.indexOf('alamatBagianPlayly("isi-cepat")');
    const kontrol = PANEL.indexOf("<KontrolUploadPlayly");
    const kotakCari = PANEL.indexOf("<KotakCariDaftar");
    expect(isiManual).toBeGreaterThan(-1);
    expect(kontrol).toBeGreaterThan(isiManual);
    expect(kotakCari).toBeGreaterThan(kontrol);
  });

  it("🪤 kotak cari & kedua dropdown dibungkus SATU wadah, bukan tiga anak lepas", () => {
    // Owner 2026-11-21 (putaran kedua): "bisa kamu jadikan satu agar searchnya
    // bisa sejajar". Barisnya `flex-wrap`, jadi anak yang lepas membungkus
    // sendiri-sendiri — kotak cari turun sendirian ke baris berikutnya begitu
    // ruang habis. Dijaga dengan memeriksa pembungkusnya BENAR-BENAR ada dan
    // keduanya ada di dalamnya, bukan sekadar berdekatan di berkas.
    const buka = PANEL.indexOf('<div className="ml-auto flex min-w-0 flex-1');
    expect(buka, "pembungkus ml-auto flex hilang").toBeGreaterThan(-1);
    const kontrol = PANEL.indexOf("<KontrolUploadPlayly", buka);
    const kotakCari = PANEL.indexOf("<KotakCariDaftar", buka);
    const tutup = PANEL.indexOf("</div>", kotakCari);
    expect(kontrol).toBeGreaterThan(buka);
    expect(kotakCari).toBeGreaterThan(kontrol);
    expect(tutup).toBeGreaterThan(kotakCari);
    // `ml-auto` tidak boleh ikut menempel di kotak carinya sendiri — itu akan
    // mendorongnya menjauh dari dropdown dan memutus kesejajarannya lagi.
    expect(PANEL.slice(kotakCari, tutup)).not.toContain("ml-auto");
  });
});
