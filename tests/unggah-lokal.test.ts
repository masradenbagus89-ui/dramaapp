// Tes penjaga untuk pagar unggah-ke-disk (lib/unggah-lokal.ts).
//
// Latar: `app/api/admin/upload/route.ts` menulis video ke `public/videos`.
// Selama di Vercel, keselamatannya bersandar pada fakta platform — filesystem
// read-only, jadi di produksi route itu gagal keras. Pindah ke Railway
// MENCABUT fakta itu tanpa satu baris kode pun berubah:
//
//   dulu (Vercel) : unggah GAGAL -> admin langsung tahu
//   kini (Railway): unggah BERHASIL -> berkas hilang saat deploy berikutnya,
//                   entri dramanya tertinggal di database, nol pesan error
//
// Pagar ini menggantikan jaminan platform yang sudah tidak ada. Tes di bawah
// mengunci bahwa ia MEMBEDAKAN — pagar yang tak pernah diberi masukan "produksi"
// tidak membuktikan dirinya bekerja.
import { describe, expect, it } from "vitest";
import { alasanTolakUnggahKeDisk } from "../lib/unggah-lokal";

describe("alasanTolakUnggahKeDisk", () => {
  it("MENOLAK di produksi — ini satu-satunya hal yang wajib benar", () => {
    const alasan = alasanTolakUnggahKeDisk({ produksi: true });
    expect(alasan).not.toBeNull();
  });

  it("alasannya menyebut akibat nyata, bukan sekadar 'tidak diizinkan'", () => {
    // Pesan yang cuma bilang "ditolak" membuat admin mencari cara mengakalinya.
    // Pesan yang menjelaskan AKIBATNYA (berkas hilang, katalog menunjuk video
    // yang tak ada) membuat dia paham kenapa jalur ini memang bukan jalannya.
    const alasan = alasanTolakUnggahKeDisk({ produksi: true }) ?? "";
    expect(alasan).toMatch(/hilang/i);
    expect(alasan).toMatch(/database/i);
  });

  it("alasannya menunjuk jalan yang benar, bukan jalan buntu", () => {
    const alasan = alasanTolakUnggahKeDisk({ produksi: true }) ?? "";
    expect(alasan).toMatch(/\/admin/);
  });

  it("MENGIZINKAN di komputer sendiri — route ini memang berguna di sana", () => {
    // Kalau pagar ikut menolak saat `next dev`, ia bukan memperbaiki apa pun:
    // kemampuan yang sah ikut hilang, dan orang akan mencabut pagarnya.
    expect(alasanTolakUnggahKeDisk({ produksi: false })).toBeNull();
  });
});
