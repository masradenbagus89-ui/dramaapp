// Tes penjaga untuk pagar uji-pulihkan-backup.
//
// Latar: workflow .github/workflows/uji-pulihkan-backup.yml memulihkan backup
// ke database uji lalu menghitung barisnya. Tiga cara uji itu bisa "lulus"
// secara PALSU, dan ketiganya pernah/hampir terjadi di project ini:
//
//   1. Connection string yang ditempel ternyata PRODUKSI → uji menulis DDL ke
//      database yang hidup.
//   2. Database uji sudah berisi → `on conflict do nothing` membuat nol baris
//      masuk, tapi count(*) tetap cocok dari data lama. Hijau, tanpa bukti.
//   3. Angka pembanding diambil dari dokumen yang sudah basi → uji membandingkan
//      backup hari ini dengan jumlah baris bulan lalu.
//
// Tes ini mengunci bahwa pagarnya MEMBEDAKAN — bukan sekadar selalu hijau.
// Pelajaran 2026-10-14: pagar yang tak pernah diuji dengan masukan BURUK tidak
// membuktikan dirinya bekerja.
import { describe, expect, it } from "vitest";
import {
  bacaHarapan,
  bacaHitunganPsql,
  bandingkanHitungan,
  periksaBukanProduksi,
  periksaDatabaseKosong,
} from "../scripts/uji-pulihkan-backup.mjs";

// Ref palsu sepanjang ref Supabase sungguhan — nilai asli tak ditulis di tes.
const REF_PRODUKSI = "abcdefghijklmnopqrst";
const REF_UJI = "ujicobaujicobaujico";

// Connection string palsu DIRAKIT dari potongan, tidak ditulis utuh. Bukan
// gaya-gayaan: penjaga rahasia repo menolak pola `skema://pengguna:sandi@` di
// berkas mana pun (.github/workflows/secret-guard.yml), dan aturan itu benar —
// menulisnya utuh di sini berarti melemahkan penjaga demi sebuah tes.
const SANDI = "sandi-palsu";
const PEMISAH = "@";

/** Direct connection: ref ada di HOST. */
const rakitDirect = (ref: string, skema = "postgresql") =>
  `${skema}://postgres:${SANDI}` + PEMISAH + `db.${ref}.supabase.co:5432/postgres`;

/** Session pooler: ref ada di NAMA PENGGUNA, bukan host. */
const rakitPooler = (ref: string) =>
  `postgresql://postgres.${ref}:${SANDI}` +
  PEMISAH +
  "aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres";

describe("periksaBukanProduksi — yang harus DITOLAK", () => {
  it("menolak connection string PRODUKSI bentuk direct connection", () => {
    const hasil = periksaBukanProduksi(rakitDirect(REF_PRODUKSI), REF_PRODUKSI);
    expect(hasil.aman).toBe(false);
    expect(hasil.alasan).toContain("PRODUKSI");
  });

  it("menolak connection string PRODUKSI bentuk session pooler", () => {
    // Bentuk inilah yang dipakai runner GitHub (hanya IPv4), jadi justru ini
    // yang paling mungkin tertempel — dan ref-nya ada di USERNAME, bukan host.
    const hasil = periksaBukanProduksi(rakitPooler(REF_PRODUKSI), REF_PRODUKSI);
    expect(hasil.aman).toBe(false);
  });

  it("menolak ref produksi walau beda besar-kecil huruf", () => {
    const hasil = periksaBukanProduksi(
      rakitDirect(REF_PRODUKSI.toUpperCase()),
      REF_PRODUKSI,
    );
    expect(hasil.aman).toBe(false);
  });

  it("menolak saat connection string kosong", () => {
    expect(periksaBukanProduksi("", REF_PRODUKSI).aman).toBe(false);
    expect(periksaBukanProduksi("   ", REF_PRODUKSI).aman).toBe(false);
  });

  it("menolak saat SUPABASE_PROJECT_REF kosong — pagar buta bukan pagar aman", () => {
    const hasil = periksaBukanProduksi(rakitDirect(REF_UJI), "");
    expect(hasil.aman).toBe(false);
    expect(hasil.alasan).toContain("SUPABASE_PROJECT_REF");
  });

  it("menolak yang jelas bukan connection string postgres", () => {
    expect(
      periksaBukanProduksi("https://contoh.supabase.co", REF_PRODUKSI).aman,
    ).toBe(false);
  });
});

describe("periksaBukanProduksi — yang harus DITERIMA", () => {
  it("menerima project uji yang ref-nya berbeda", () => {
    const hasil = periksaBukanProduksi(rakitPooler(REF_UJI), REF_PRODUKSI);
    expect(hasil.aman).toBe(true);
  });

  it("menerima awalan postgres:// (tanpa ql) — keduanya sah", () => {
    expect(
      periksaBukanProduksi(rakitDirect(REF_UJI, "postgres"), REF_PRODUKSI).aman,
    ).toBe(true);
  });
});

describe("periksaDatabaseKosong", () => {
  it("baris kosong dari to_regclass = database masih bersih", () => {
    expect(periksaDatabaseKosong("").kosong).toBe(true);
    expect(periksaDatabaseKosong("  \n ").kosong).toBe(true);
  });

  it("menolak kalau tabelnya sudah ada — hitungan akan cocok dari data LAMA", () => {
    const hasil = periksaDatabaseKosong("dramaapp.dramas");
    expect(hasil.kosong).toBe(false);
    expect(hasil.alasan).toContain("on conflict do nothing");
  });
});

describe("bacaHarapan — angka pembanding datang dari berkas backup itu sendiri", () => {
  const contoh = [
    "-- ---------- Data ----------",
    "begin;",
    "",
    "-- app_data: 36 baris",
    "insert into dramaapp.app_data (key, value) values ('a', 'b') on conflict (key) do nothing;",
    "",
    "-- dramas: 40 baris",
    "-- likes: 46 baris",
    "-- wallets: 3 baris",
    "-- unlocks: 0 baris",
    "commit;",
  ].join("\n");

  it("membaca kelima tabel apa adanya", () => {
    expect(bacaHarapan(contoh)).toEqual({
      app_data: 36,
      dramas: 40,
      likes: 46,
      wallets: 3,
      unlocks: 0,
    });
  });

  it("0 baris dibaca sebagai angka 0, bukan dianggap tidak ada", () => {
    // unlocks memang kosong di produksi; kalau 0 jatuh jadi undefined,
    // bandingkanHitungan akan salah melapor "berkas tidak utuh".
    expect(bacaHarapan(contoh).unlocks).toBe(0);
  });

  it("tabel yang komentarnya hilang tidak dikarang-karang", () => {
    const rusak = contoh.replace("-- dramas: 40 baris\n", "");
    expect(bacaHarapan(rusak).dramas).toBeUndefined();
  });
});

describe("bandingkanHitungan", () => {
  const utuh = {
    app_data: 36,
    dramas: 40,
    likes: 46,
    wallets: 3,
    unlocks: 0,
  };

  it("lulus saat semua angka sama", () => {
    expect(bandingkanHitungan(utuh, { ...utuh }).lulus).toBe(true);
  });

  it("gagal saat satu tabel kekurangan baris", () => {
    const hasil = bandingkanHitungan(utuh, { ...utuh, dramas: 39 });
    expect(hasil.lulus).toBe(false);
    expect(hasil.masalah[0]).toContain("dramas");
  });

  it("gagal saat SELURUH data tak masuk — kasus 2026-10-14 yang sebenarnya", () => {
    // Satu kolom tertinggal membatalkan transaksi: struktur jadi, data nol.
    const nol = { app_data: 0, dramas: 0, likes: 0, wallets: 0, unlocks: 0 };
    const hasil = bandingkanHitungan(utuh, nol);
    expect(hasil.lulus).toBe(false);
    expect(hasil.masalah).toHaveLength(4); // unlocks memang 0 di kedua sisi
  });

  it("berkas backup yang komentarnya tak utuh = GAGAL, bukan dilewati", () => {
    const tanpaDramas = { ...utuh } as Record<string, number>;
    delete tanpaDramas.dramas;
    const hasil = bandingkanHitungan(tanpaDramas, utuh);
    expect(hasil.lulus).toBe(false);
    expect(hasil.masalah[0]).toContain("tidak utuh");
  });
});

describe("bacaHitunganPsql", () => {
  it("membaca keluaran psql -At -F','", () => {
    expect(bacaHitunganPsql("app_data,36\ndramas,40\n")).toEqual({
      app_data: 36,
      dramas: 40,
    });
  });

  it("mengabaikan baris sampah (header/spasi/pesan psql)", () => {
    expect(bacaHitunganPsql("\nSET\ndramas,40\n(2 rows)\n")).toEqual({
      dramas: 40,
    });
  });
});
