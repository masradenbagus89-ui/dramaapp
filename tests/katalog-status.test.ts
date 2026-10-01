// Tes pengunci untuk kartu status katalog di admin (lib/katalog-status.ts).
//
// Fokus: kartu ini satu-satunya cara mengetahui bahwa halaman publik sedang
// menyajikan berkas CADANGAN, bukan database. Pada 1 Oktober 2026 keadaan itu
// berlangsung berjam-jam tanpa satu pun tanda — /katalog tampil "sehat" dengan
// 42 judul dari cadangan berumur 20 hari. Yang diuji di sini bukan tampilannya,
// melainkan satu hal yang membuat kartunya berguna: keadaan "cadangan" TIDAK
// BOLEH terlihat sama dengan keadaan sehat.
import { describe, it, expect } from "vitest";
import { ringkasStatusKatalog } from "../lib/katalog-status";

describe("ringkasStatusKatalog", () => {
  it("database menjawab = status database + jumlah judulnya", () => {
    const r = ringkasStatusKatalog({ databaseHidup: true, jumlahTampil: 35 });
    expect(r).toMatchObject({ status: "database", jumlahTampil: 35 });
    // Keadaan normal tidak perlu berpesan — kartu yang selalu berbicara
    // membuat admin berhenti membacanya.
    expect(r.pesan).toBe("");
  });

  it("database menjawab tapi kosong = tetap database, dengan keterangan", () => {
    const r = ringkasStatusKatalog({ databaseHidup: true, jumlahTampil: 0 });
    expect(r.status).toBe("database");
    expect(r.pesan).not.toBe("");
  });

  it("database mati tapi halaman masih berisi = CADANGAN (kasus 1 Okt 2026)", () => {
    const r = ringkasStatusKatalog({ databaseHidup: false, jumlahTampil: 42 });
    expect(r).toMatchObject({ status: "cadangan", jumlahTampil: 42 });
  });

  it("database mati dan cadangan kosong = kosong, bukan cadangan", () => {
    const r = ringkasStatusKatalog({ databaseHidup: false, jumlahTampil: 0 });
    expect(r.status).toBe("kosong");
  });

  it("belum bisa dipastikan (null) TIDAK dilaporkan sebagai database mati", () => {
    const r = ringkasStatusKatalog({ databaseHidup: null, jumlahTampil: 0 });
    expect(r.status).toBe("tak-diketahui");
    // Kenapa dipisah dari "kosong": menuduh database mati padahal yang putus
    // jalur ke server kita sendiri akan mengirim admin memperbaiki hal yang
    // tidak rusak.
    expect(r.status).not.toBe("kosong");
  });

  // ===== PENJAGA ANTI-SENYAP =====
  // Inti seluruh fitur ini. Kalau suatu hari pesan peringatannya dikosongkan
  // (mis. saat merapikan tampilan), kartunya kembali bisu persis seperti
  // keadaan yang membuatnya dibangun — dan tes ini yang MERAH duluan.
  it("status yang butuh tindakan WAJIB berpesan, tidak boleh bisu", () => {
    for (const jumlah of [42, 0]) {
      const r = ringkasStatusKatalog({ databaseHidup: false, jumlahTampil: jumlah });
      expect(r.pesan.trim().length).toBeGreaterThan(0);
    }
  });

  it("peringatan cadangan menyebut angka judul yang sedang dilihat penonton", () => {
    // Angkanya yang membuat admin sadar ada yang salah ("kok 42, bukan 35?").
    const r = ringkasStatusKatalog({ databaseHidup: false, jumlahTampil: 42 });
    expect(r.pesan).toContain("42");
  });

  // ===== JALUR CADANGAN (disimpulkan dari /api/dramas) =====
  // Dipakai saat penjaga admin ikut mati bersama database, sehingga endpoint
  // admin membalas 401. Di jalur ini jumlah judul TIDAK terukur.
  it("database mati + jumlah belum terukur = CADANGAN, bukan kosong", () => {
    const r = ringkasStatusKatalog({
      databaseHidup: false,
      jumlahTampil: 0,
      jumlahTerukur: false,
    });
    // Inti tes ini: tanpa pembedaan "belum diukur" vs "benar-benar nol", angka 0
    // akan dibaca sebagai katalog KOSONG — tuduhan yang jauh lebih menakutkan
    // daripada keadaan sebenarnya (situs tetap berisi, hanya dari cadangan).
    expect(r.status).toBe("cadangan");
    expect(r.status).not.toBe("kosong");
  });

  it("jalur cadangan menahan diri: tidak mengarang angka judul", () => {
    const r = ringkasStatusKatalog({
      databaseHidup: false,
      jumlahTampil: 999,
      jumlahTerukur: false,
    });
    expect(r.jumlahTampil).toBe(0);
    expect(r.pesan).not.toContain("999");
    // Tapi tetap WAJIB berpesan — lihat penjaga anti-senyap di atas.
    expect(r.pesan.trim().length).toBeGreaterThan(0);
  });

  it("jumlahTerukur tidak disebut = dianggap terukur (pemanggil lama aman)", () => {
    const r = ringkasStatusKatalog({ databaseHidup: false, jumlahTampil: 42 });
    expect(r).toMatchObject({ status: "cadangan", jumlahTampil: 42 });
  });

  it("angka tak masuk akal dari luar tidak dipercaya buta", () => {
    for (const buruk of [-5, Number.NaN, "banyak", null, undefined]) {
      const r = ringkasStatusKatalog({ databaseHidup: true, jumlahTampil: buruk });
      expect(r.jumlahTampil).toBe(0);
    }
  });
});
