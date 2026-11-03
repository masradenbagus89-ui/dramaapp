import { describe, expect, it } from "vitest";
import {
  ALASAN_SUARA_MATI,
  PENGUAT_MAKS,
  SETELAN_VOLUME_STABIL,
  alasanMatiUntuk,
  gainPenguat,
  seOrigin,
  type IzinSuara,
} from "@/lib/olah-suara";

const HALAMAN = "https://dramaapp-production-9e88.up.railway.app/tonton/abc";

describe("seOrigin — jalur cepat tanpa menyentuh jaringan", () => {
  it("berkas dari domain sendiri = boleh diolah", () => {
    expect(seOrigin("/videos/a.mp4", HALAMAN)).toBe(true);
    expect(
      seOrigin("https://dramaapp-production-9e88.up.railway.app/v/a.mp4", HALAMAN),
    ).toBe(true);
  });

  it("berkas dari domain lain BUKAN se-origin", () => {
    expect(
      seOrigin("https://playly-videos.r2.cloudflarestorage.com/a.mp4", HALAMAN),
    ).toBe(false);
  });

  // Alamat belum diambil. Kalau ini memulangkan true, menu sempat menjanjikan
  // fitur yang belum tentu bisa dipakai.
  it("alamat kosong dihitung TIDAK se-origin", () => {
    expect(seOrigin(null, HALAMAN)).toBe(false);
  });

  it("alamat rusak tidak melempar, cukup memulangkan false", () => {
    expect(seOrigin("ini-bukan-url://%%%", HALAMAN)).toBe(false);
  });
});

describe("gerbang izin suara", () => {
  // INI penjaga paling penting di berkas ini. Sumber lintas domain tanpa izin
  // yang tetap disambungkan ke Web Audio menghasilkan VIDEO BISU — bukan
  // error, bukan pesan, cuma suara yang hilang. Kalau tes ini merah, fitur
  // boleh menyala dalam keadaan yang membuat penonton kehilangan suara.
  it("HANYA keadaan 'boleh' yang menghidupkan fitur", () => {
    const semua: IzinSuara[] = ["memeriksa", "boleh", "tidak"];
    const hidup = semua.filter((i) => alasanMatiUntuk(i) === undefined);
    expect(hidup).toEqual(["boleh"]);
  });

  it("saat masih memeriksa, fitur tetap MATI", () => {
    expect(alasanMatiUntuk("memeriksa")).toBe(ALASAN_SUARA_MATI);
  });

  it("alasan yang dibaca penonton tidak memakai istilah teknis", () => {
    expect(ALASAN_SUARA_MATI).not.toMatch(/CORS|cross-origin|header/i);
    expect(ALASAN_SUARA_MATI.length).toBeGreaterThan(10);
  });
});

describe("penguat suara", () => {
  it("mati = suara apa adanya (1x)", () => {
    expect(gainPenguat(false)).toBe(1);
  });

  it("nyala = dikuatkan, tapi tidak melewati batas aman", () => {
    expect(gainPenguat(true)).toBe(PENGUAT_MAKS);
    expect(gainPenguat(true)).toBeLessThanOrEqual(2);
  });

  // Gain berlebihan membuat suara pecah pada film yang aslinya sudah keras,
  // dan penonton akan menyalahkan situsnya. Batas ini sengaja dikunci tes.
  it("batasnya tidak boleh dinaikkan diam-diam", () => {
    expect(PENGUAT_MAKS).toBeLessThanOrEqual(2);
    expect(PENGUAT_MAKS).toBeGreaterThan(1);
  });
});

describe("setelan Volume Stabil", () => {
  it("meratakan, bukan memampatkan habis", () => {
    expect(SETELAN_VOLUME_STABIL.ratio).toBeGreaterThan(1);
    expect(SETELAN_VOLUME_STABIL.ratio).toBeLessThanOrEqual(6);
  });

  // release terlalu pendek = suara terdengar "memompa" naik-turun.
  it("release cukup panjang supaya suara tidak memompa", () => {
    expect(SETELAN_VOLUME_STABIL.release).toBeGreaterThanOrEqual(0.1);
  });

  it("nilainya masuk rentang yang diterima Web Audio", () => {
    const s = SETELAN_VOLUME_STABIL;
    expect(s.threshold).toBeGreaterThanOrEqual(-100);
    expect(s.threshold).toBeLessThanOrEqual(0);
    expect(s.knee).toBeGreaterThanOrEqual(0);
    expect(s.knee).toBeLessThanOrEqual(40);
    expect(s.attack).toBeGreaterThanOrEqual(0);
    expect(s.attack).toBeLessThanOrEqual(1);
  });
});

// -------------------------------------------------------------------------
// PERAKITAN RANTAI — diuji dengan node TIRUAN.
//
// Kenapa tiruan, bukan Web Audio sungguhan: mesin kerja ini server TANPA
// perangkat suara. Diukur 2026-11-03, di browser tanpa layar `AudioContext`
// melaporkan `state: running` tapi grafiknya TIDAK pernah diproses — semua
// pengukuran memulangkan nol, dan itu terbaca persis seperti "fiturnya tidak
// bekerja" padahal bukan. Jadi yang dikunci di sini ATURANNYA; bunyi
// sesungguhnya hanya bisa dinilai manusia di browser biasa.
// -------------------------------------------------------------------------
import { perluRantaiSuara, terapkanSetelanSuara } from "@/lib/olah-suara";

const rantaiTiruan = () => ({
  kompresor: {
    threshold: { value: 999 },
    knee: { value: 999 },
    ratio: { value: 999 },
    attack: { value: 999 },
    release: { value: 999 },
  },
  gain: { gain: { value: 999 } },
});

describe("terapkanSetelanSuara", () => {
  it("Volume Stabil NYALA memasang setelan kompresor yang sebenarnya", () => {
    const r = rantaiTiruan();
    terapkanSetelanSuara(r, { volumeStabil: true, penguatSuara: false });
    expect(r.kompresor.ratio.value).toBe(SETELAN_VOLUME_STABIL.ratio);
    expect(r.kompresor.threshold.value).toBe(SETELAN_VOLUME_STABIL.threshold);
    expect(r.kompresor.knee.value).toBe(SETELAN_VOLUME_STABIL.knee);
  });

  // Kompresor TIDAK dilepas dari rantai saat dimatikan — ia dibuat tidak
  // berpengaruh. Melepas-sambung node saat suara jalan berbunyi "klik".
  it("Volume Stabil MATI membuat kompresor tidak berpengaruh (ratio 1:1)", () => {
    const r = rantaiTiruan();
    terapkanSetelanSuara(r, { volumeStabil: false, penguatSuara: false });
    expect(r.kompresor.ratio.value).toBe(1);
    expect(r.kompresor.threshold.value).toBe(0);
    expect(r.kompresor.knee.value).toBe(0);
  });

  it("Penguat NYALA menaikkan gain; MATI mengembalikannya ke 1", () => {
    const r = rantaiTiruan();
    terapkanSetelanSuara(r, { volumeStabil: false, penguatSuara: true });
    expect(r.gain.gain.value).toBe(PENGUAT_MAKS);
    terapkanSetelanSuara(r, { volumeStabil: false, penguatSuara: false });
    expect(r.gain.gain.value).toBe(1);
  });

  it("gain tidak pernah melewati batas aman", () => {
    const r = rantaiTiruan();
    terapkanSetelanSuara(r, { volumeStabil: true, penguatSuara: true });
    expect(r.gain.gain.value).toBeLessThanOrEqual(PENGUAT_MAKS);
  });

  it("dua sakelar bekerja terpisah, tidak saling mematikan", () => {
    const r = rantaiTiruan();
    terapkanSetelanSuara(r, { volumeStabil: true, penguatSuara: true });
    expect(r.kompresor.ratio.value).toBe(SETELAN_VOLUME_STABIL.ratio);
    expect(r.gain.gain.value).toBe(PENGUAT_MAKS);
  });
});

describe("perluRantaiSuara — kapan Web Audio BOLEH disentuh", () => {
  // Penjaga paling keras di berkas ini. Merakit rantai saat sumber tidak
  // mengizinkan = video bisu, tanpa error, tanpa gejala di layar.
  it("sumber tidak mengizinkan → JANGAN rakit apa pun", () => {
    expect(
      perluRantaiSuara({ bisa: false, volumeStabil: true, penguatSuara: true }),
    ).toBe(false);
  });

  // Kalau ini true, SEMUA penonton suaranya dialihkan lewat AudioContext
  // walau tak memakai fiturnya — menambah risiko bisu tanpa manfaat apa pun.
  it("tak ada sakelar yang nyala → JANGAN rakit apa pun", () => {
    expect(
      perluRantaiSuara({ bisa: true, volumeStabil: false, penguatSuara: false }),
    ).toBe(false);
  });

  it("boleh + salah satu sakelar nyala → baru dirakit", () => {
    expect(
      perluRantaiSuara({ bisa: true, volumeStabil: true, penguatSuara: false }),
    ).toBe(true);
    expect(
      perluRantaiSuara({ bisa: true, volumeStabil: false, penguatSuara: true }),
    ).toBe(true);
  });
});
