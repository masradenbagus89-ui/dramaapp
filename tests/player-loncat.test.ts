// @vitest-environment jsdom
//
// Penjaga untuk tombol loncat ±10 detik di pemutar video Playly (2026-09-28).
//
// KENAPA fungsi ini yang diuji, bukan tombolnya: menggambar tombol tidak bisa
// salah diam-diam — kalau hilang, langsung kelihatan di layar. Yang BISA rusak
// tanpa terlihat adalah penjagaan tepinya. Posisi negatif membuat browser
// me-reset video ke awal, dan posisi melewati durasi dianggap "selesai" lalu
// memicu 'ended' — keduanya terlihat seperti video yang loncat sendiri, bukan
// seperti tombol yang rusak, jadi sulit dilacak saat dilaporkan penonton.
//
// jsdom dipakai (bukan node polos) karena modulnya ikut memuat React + ikon
// lucide saat diimpor, sama seperti tests/player-menu.test.ts.
import { describe, it, expect } from "vitest";
import { posisiSesudahLoncat } from "../app/components/player/PlaylyPlayer";

const DURASI = 600; // video 10 menit

describe("posisiSesudahLoncat", () => {
  it("maju dan mundur 10 detik di tengah video", () => {
    expect(posisiSesudahLoncat(300, 10, DURASI)).toBe(310);
    expect(posisiSesudahLoncat(300, -10, DURASI)).toBe(290);
  });

  it("mundur di awal video berhenti di 0, tidak jadi negatif", () => {
    expect(posisiSesudahLoncat(3, -10, DURASI)).toBe(0);
    expect(posisiSesudahLoncat(0, -10, DURASI)).toBe(0);
  });

  it("maju di ujung video berhenti di durasi, tidak melewatinya", () => {
    expect(posisiSesudahLoncat(595, 10, DURASI)).toBe(DURASI);
    expect(posisiSesudahLoncat(DURASI, 10, DURASI)).toBe(DURASI);
  });

  it("durasi belum terbaca (0/NaN/Infinity): cukup dijaga tidak negatif", () => {
    // Terjadi nyata saat penonton menekan tombol sebelum metadata video dimuat.
    expect(posisiSesudahLoncat(5, 10, 0)).toBe(15);
    expect(posisiSesudahLoncat(5, -10, 0)).toBe(0);
    expect(posisiSesudahLoncat(5, 10, Number.NaN)).toBe(15);
    expect(posisiSesudahLoncat(5, 10, Number.POSITIVE_INFINITY)).toBe(15);
  });
});
