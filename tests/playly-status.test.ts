// Tes pengunci untuk kartu status Playly di admin (lib/playly-status.ts).
// Fokus: admin harus bisa MEMBEDAKAN "belum dipasang" dari "rusak" — kalau
// pembedaan ini hilang, kartunya kehilangan seluruh gunanya.
import { describe, it, expect } from "vitest";
import { ringkasStatusPlayly } from "../lib/playly-status";

describe("ringkasStatusPlayly", () => {
  it("503 = belum diatur, bukan gagal", () => {
    const r = ringkasStatusPlayly(503, {
      error: "DASHBOARD_API_URL belum di-set.",
    });
    expect(r.status).toBe("belum-diatur");
    expect(r.pesan).toContain("DASHBOARD_API_URL");
  });

  it("502 (kunci ditolak / dashboard mati) = gagal, pesan aslinya dipertahankan", () => {
    const r = ringkasStatusPlayly(502, {
      error: "Dashboard menolak kunci kita (HTTP 401).",
    });
    expect(r.status).toBe("gagal");
    expect(r.pesan).toContain("menolak kunci");
  });

  it("200 + ada video = tersambung dengan jumlahnya", () => {
    const r = ringkasStatusPlayly(200, { ok: true, count: 5, skipped: 2 });
    expect(r).toMatchObject({
      status: "tersambung",
      jumlahVideo: 5,
      dilewati: 2,
    });
  });

  it("200 + dashboard kosong = tetap tersambung, dijelaskan apa adanya", () => {
    const r = ringkasStatusPlayly(200, { ok: true, count: 0 });
    expect(r.status).toBe("tersambung");
    expect(r.jumlahVideo).toBe(0);
    expect(r.pesan).toContain("belum berisi video");
  });

  // Gagal-AMAN: kondisi aneh TIDAK boleh menghasilkan "tersambung".
  it.each([
    ["body kosong", 200, null],
    ["ok:false walau HTTP 200", 200, { ok: false }],
    ["server kita sendiri tak terjangkau (status 0)", 0, null],
    ["500 tanpa pesan", 500, null],
  ])("%s -> gagal, bukan tersambung", (_nama, status, body) => {
    expect(ringkasStatusPlayly(status as number, body as never).status).toBe(
      "gagal",
    );
  });

  // ===== SEBAB VIDEO DILEWATI (2026-10-01) =====
  // Terjadi di produksi: count 0, skipped 20 — seluruh daftar ditolak, dan
  // kartunya menebak "tidak memenuhi syarat keamanan" padahal itu cuma 1 dari 4
  // alasan yang mungkin. Admin jadi mencari kerusakan di tempat yang tidak rusak.

  it("nol video TAPI ada yang dilewati = BUKAN 'dashboard kosong'", () => {
    const r = ringkasStatusPlayly(200, { ok: true, count: 0, skipped: 20 });
    // Inti tes ini: dua keadaan yang berlawanan tidak boleh berbunyi sama.
    // "belum berisi video" akan menyuruh admin mengunggah ulang video yang
    // sebenarnya SUDAH ada, cuma ditolak di sisi kita.
    expect(r.pesan).not.toContain("belum berisi video");
    expect(r.pesan).toContain("20");
    expect(r.pesan.toLowerCase()).toContain("ditolak");
  });

  it("dashboard yang memang kosong tetap berbunyi 'belum berisi video'", () => {
    const r = ringkasStatusPlayly(200, { ok: true, count: 0, skipped: 0 });
    expect(r.pesan).toContain("belum berisi video");
  });

  it("sebab penolakan ditampilkan apa adanya, terbanyak lebih dulu", () => {
    const r = ringkasStatusPlayly(200, {
      ok: true,
      count: 0,
      skipped: 20,
      alasanDilewati: { "alamat video harus https": 5, "tidak ada alamat video": 15 },
    });
    expect(r.rincianDilewati).toBe(
      "tidak ada alamat video (15) · alamat video harus https (5)",
    );
  });

  // PENJAGA ANTI-NEBAK — inti seluruh perbaikan ini.
  it("server tidak mengirim sebab = rincian KOSONG, bukan tebakan 'keamanan'", () => {
    const r = ringkasStatusPlayly(200, { ok: true, count: 0, skipped: 20 });
    expect(r.rincianDilewati).toBe("");
    // Kalimat lama yang salah itu tidak boleh muncul lagi dari fungsi ini,
    // dalam keadaan apa pun, kecuali server sendiri yang mengirimnya.
    expect(`${r.pesan} ${r.rincianDilewati}`.toLowerCase()).not.toContain("keamanan");
  });

  it("bentuk alasan yang ngawur tidak merusak kartu", () => {
    for (const buruk of [null, undefined, "banyak", 42, [], { "": 5 }, { sebab: 0 }, { sebab: -1 }]) {
      const r = ringkasStatusPlayly(200, {
        ok: true,
        count: 1,
        skipped: 1,
        alasanDilewati: buruk as never,
      });
      expect(r.rincianDilewati).toBe("");
      expect(r.status).toBe("tersambung");
    }
  });

  // ===== JUDUL VIDEO YANG DILEWATI =====
  // Tahu "20 ditolak" belum bisa ditindaklanjuti; yang menentukan video MANA,
  // karena hanya owner yang bisa mencocokkannya dengan dashboard miliknya.
  it("judul video yang ditolak diteruskan ke tampilan", () => {
    const r = ringkasStatusPlayly(200, {
      ok: true,
      count: 0,
      skipped: 2,
      contohDilewati: ["Despicable Me 4", "Film B"],
    });
    expect(r.contohDilewati).toEqual(["Despicable Me 4", "Film B"]);
  });

  it("daftar judul dibatasi 5 + isi ngawur disaring", () => {
    const r = ringkasStatusPlayly(200, {
      ok: true,
      count: 0,
      skipped: 20,
      contohDilewati: [
        "A", "B", "C", "D", "E", "F", "G",
        "", "   ", 42 as never, null as never,
      ],
    });
    expect(r.contohDilewati).toEqual(["A", "B", "C", "D", "E"]);
  });

  it("server tidak mengirim judul -> daftar kosong, bukan error", () => {
    for (const buruk of [undefined, null, "bukan array", 42, {}]) {
      const r = ringkasStatusPlayly(200, {
        ok: true,
        count: 0,
        skipped: 3,
        contohDilewati: buruk as never,
      });
      expect(r.contohDilewati).toEqual([]);
      expect(r.status).toBe("tersambung");
    }
  });

  it("angka ngawur dari luar tidak bocor ke tampilan", () => {
    const r = ringkasStatusPlayly(200, {
      ok: true,
      count: -3,
      skipped: Number.NaN,
    });
    expect(r.jumlahVideo).toBe(0);
    expect(r.dilewati).toBe(0);
  });
});
