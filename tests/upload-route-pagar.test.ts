// Tes penjaga: route unggah BENAR-BENAR memanggil pagarnya, bukan sekadar
// punya fungsi pagar yang menganggur di lib.
//
// Kenapa terpisah dari tests/unggah-lokal.test.ts: yang di sana menguji
// KEPUTUSANNYA (boleh/tidak), yang di sini menguji PEMASANGANNYA (route
// memakainya, dan pada urutan yang benar). Pagar yang benar tapi tak dipanggil
// adalah kegagalan yang tak satu pun unit test fungsi bisa tangkap.
//
// `lib/session` di-mock supaya cek admin lolos — tanpa itu route berhenti di
// 401 dan pagar lingkungan tak pernah tercapai, sehingga tesnya hijau tanpa
// membuktikan apa pun.
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/session", () => ({
  isAdminRequest: vi.fn(async () => true),
  sessionCookieOptions: () => ({}),
  adminCookieOptions: () => ({}),
}));

describe("POST /api/admin/upload — pagar lingkungan terpasang di jalurnya", () => {
  beforeEach(() => {
    // resetModules supaya route dimuat ulang dengan env yang baru di-stub.
    vi.resetModules();
    // vi.stubEnv = cara resmi vitest menulis NODE_ENV; menulis langsung ke
    // process.env ditolak Node ("only accepts a configurable, writable, and
    // enumerable data descriptor").
    vi.stubEnv("NODE_ENV", "production");
    // Route ini mengimpor lib/dramas -> lib/supabase, yang MELEMPAR saat
    // NODE_ENV=production sementara env Supabase kosong. Itu pagar lain yang
    // memang bekerja (dan tes ini sempat merah karenanya — bukti berlapis).
    // ALLOW_FILE_MODE=1 adalah saklar resmi untuk "produksi tanpa database"
    // yang disediakan lib/supabase.ts:62 — dipakai di sini daripada mengakali.
    vi.stubEnv("ALLOW_FILE_MODE", "1");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("DITOLAK saat berjalan sebagai produksi, walau penggunanya admin sah", async () => {
    const { POST } = await import("../app/api/admin/upload/route");

    const res = await POST(
      new Request("http://localhost/api/admin/upload", {
        method: "POST",
      }) as never,
    );

    expect(res.status).toBe(503);
    const body = (await res.json()) as { error?: string };
    // Pesannya harus menjelaskan AKIBAT, bukan cuma "ditolak" — admin yang tak
    // paham kenapa akan mencari cara mengakalinya.
    expect(body.error).toMatch(/hilang/i);
  });

  it("ditolak SEBELUM badan permintaan dibaca — unggahan video bisa ratusan MB", async () => {
    const { POST } = await import("../app/api/admin/upload/route");

    // Kalau route membaca formData lebih dulu, formData() di bawah terpanggil
    // dan tesnya gagal di sini — itulah yang dikunci.
    let badanDibaca = false;
    const req = {
      headers: new Headers(),
      formData: async () => {
        badanDibaca = true;
        return new FormData();
      },
    };

    const res = await POST(req as never);

    expect(res.status).toBe(503);
    expect(badanDibaca).toBe(false);
  });

  it("di komputer sendiri pagar TIDAK menghalangi — route lanjut membaca badan", async () => {
    // Sisi sebaliknya, dan ini yang membuat tes di atas berarti: tanpa kasus
    // ini, pagar yang keliru dan SELALU menolak pun akan tampak hijau.
    // Badan sengaja FormData kosong -> route lewat pagar, baca badan, lalu
    // berhenti di validasi "Judul wajib diisi" (400). Nol berkas ditulis.
    vi.stubEnv("NODE_ENV", "development");
    const { POST } = await import("../app/api/admin/upload/route");

    const req = {
      headers: new Headers(),
      formData: async () => new FormData(),
    };

    const res = await POST(req as never);

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toMatch(/judul/i);
  });
});
