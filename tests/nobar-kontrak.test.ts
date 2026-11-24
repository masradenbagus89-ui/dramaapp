import { describe, expect, it } from "vitest";
import {
  MAKS_PANJANG_PESAN,
  TOLERANSI_SELISIH_DETIK,
  posisiSeharusnya,
  putuskanKoreksi,
  rapikanNama,
  selisihJam,
  validasiChat,
  validasiKontrol,
  validasiLaporan,
} from "../nobar-server/src/kontrak";
import { bacaTiket, bentukRahasiaSah, buatRahasiaAcak, buatTiket, UMUR_TIKET_MS } from "../nobar-server/src/tiket";
import { RuangAktif } from "../nobar-server/src/ruang";

// Kontrak Nonton Bareng dipakai browser DAN server. Kalau rumus di sini
// menyimpang, penonton melihat video "loncat-loncat" tanpa satu pun error.

describe("hitungan sinkron", () => {
  it("video berjalan: posisi maju sesuai jam server", () => {
    const st = { main: true, posisi: 100, pada: 1_000_000, seq: 1 };
    expect(posisiSeharusnya(st, 1_000_000 + 5_500)).toBeCloseTo(105.5);
  });

  it("video dijeda: posisi diam berapa lama pun", () => {
    const st = { main: false, posisi: 42, pada: 0, seq: 1 };
    expect(posisiSeharusnya(st, 99_999_999)).toBe(42);
  });

  it("jam browser di belakang server tidak membuat posisi mundur", () => {
    const st = { main: true, posisi: 10, pada: 5_000, seq: 1 };
    expect(posisiSeharusnya(st, 4_000)).toBe(10);
  });

  it("selisih kecil dibiarkan, selisih besar dikoreksi", () => {
    expect(putuskanKoreksi(50, 50 + TOLERANSI_SELISIH_DETIK - 0.1).jenis).toBe("diam");
    expect(putuskanKoreksi(50, 50 + TOLERANSI_SELISIH_DETIK + 0.1)).toEqual({ jenis: "loncat", ke: 50 + TOLERANSI_SELISIH_DETIK + 0.1 });
  });

  it("selisih jam = jam server dikurangi titik tengah perjalanan", () => {
    // kirim 1000, terima 1200 → tengah 1100; server bilang 6100 → browser tertinggal 5000 ms.
    expect(selisihJam(1000, 1200, 6100)).toBe(5000);
  });
});

describe("validasi event dari browser", () => {
  it("kontrol: hanya aksi & posisi yang sah", () => {
    expect(validasiKontrol({ aksi: "putar", posisi: 3 })).toEqual({ aksi: "putar", posisi: 3 });
    expect(validasiKontrol({ aksi: "hapus", posisi: 3 })).toBeNull();
    expect(validasiKontrol({ aksi: "geser", posisi: Number.NaN })).toBeNull();
    expect(validasiKontrol({ aksi: "geser", posisi: -1 })).toBeNull();
    expect(validasiKontrol("putar")).toBeNull();
    expect(validasiKontrol(null)).toBeNull();
  });

  it("laporan: main wajib boolean", () => {
    expect(validasiLaporan({ posisi: 1, main: "ya" })).toBeNull();
    expect(validasiLaporan({ posisi: 1, main: false })).toEqual({ posisi: 1, main: false });
  });

  it("chat: dirapikan, batas dihitung per huruf (emoji = 1)", () => {
    expect(validasiChat({ isi: "  halo\n\n dunia  " })).toBe("halo dunia");
    expect(validasiChat({ isi: "   " })).toBeNull();
    expect(validasiChat({ isi: "😀".repeat(MAKS_PANJANG_PESAN) })).not.toBeNull();
    expect(validasiChat({ isi: "a".repeat(MAKS_PANJANG_PESAN + 1) })).toBeNull();
  });

  it("nama: penanda arah teks (RTL) dibuang supaya nama tak bisa menyamar", () => {
    expect(rapikanNama("Budi‮HOST")).toBe("Budi HOST");
    expect(rapikanNama("x".repeat(25))).toBeNull();
  });
});

describe("tiket socket", () => {
  const RAHASIA = "rahasia-uji-yang-panjangnya-lebih-dari-32";

  it("tiket sah terbaca, dan basi sesudah umurnya", () => {
    const t = buatTiket(RAHASIA, "abc", 1000);
    expect(bacaTiket(RAHASIA, t, 1000 + UMUR_TIKET_MS - 1)).toBe("abc");
    expect(bacaTiket(RAHASIA, t, 1000 + UMUR_TIKET_MS)).toBeNull();
  });

  it("tiket yang isinya diubah atau ditandatangani rahasia lain ditolak", () => {
    const t = buatTiket(RAHASIA, "abc", 1000);
    const [, tanda] = t.split(".");
    const palsu = `${Buffer.from(JSON.stringify({ k: "orang-lain", exp: 9e15 })).toString("base64url")}.${tanda}`;
    expect(bacaTiket(RAHASIA, palsu, 1000)).toBeNull();
    expect(bacaTiket("rahasia-lain-yang-juga-panjang-sekali-ya", t, 1000)).toBeNull();
    expect(bacaTiket("", t, 1000)).toBeNull();
  });

  it("rahasia acak berbentuk token yang sah", () => {
    expect(bentukRahasiaSah(buatRahasiaAcak())).toBe(true);
    expect(bentukRahasiaSah("../../etc/passwd")).toBe(false);
  });
});

describe("aturan Room", () => {
  const ruang = { id: "r1", tokenHash: "h", videoId: "v", judul: "J", poster: null, status: "aktif" as const, aktivitas: 0 };
  const p = (id: string, peran: "host" | "penonton", bergabung: number) => ({
    id, ruangId: "r1", kunciHash: id, nama: id, email: null, peran, bergabung,
  });

  it("pengganti Host = penonton ONLINE yang paling lama ikut", () => {
    const r = new RuangAktif(ruang, { main: false, posisi: 0, pada: 0, seq: 0 }, [
      p("host", "host", 1), p("lama-offline", "penonton", 2), p("lama", "penonton", 3), p("baru", "penonton", 4),
    ], 0);
    r.sambung(p("baru", "penonton", 4), "s1");
    r.sambung(p("lama", "penonton", 3), "s2");
    expect(r.pilihPengganti()).toBe("lama");
  });

  it("dua tab peserta yang sama: offline baru saat tab terakhir tertutup", () => {
    const r = new RuangAktif(ruang, { main: false, posisi: 0, pada: 0, seq: 0 }, [p("a", "penonton", 1)], 0);
    r.sambung(p("a", "penonton", 1), "tab1");
    r.sambung(p("a", "penonton", 1), "tab2");
    expect(r.putus("a", "tab1", 0)).toBe(false);
    expect(r.online("a")).toBe(true);
    expect(r.putus("a", "tab2", 0)).toBe(true);
  });

  it("laporan Host yang cocok perkiraan tidak memicu siaran baru", () => {
    const r = new RuangAktif(ruang, { main: true, posisi: 10, pada: 0, seq: 1 }, [], 0);
    expect(r.terapkanLaporan(14.2, true, 4000)).toBeNull();
    expect(r.terapkanLaporan(20, true, 4000)?.seq).toBe(2);
  });
});
