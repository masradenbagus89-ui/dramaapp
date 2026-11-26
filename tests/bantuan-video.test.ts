// Penjaga fitur Laporan Video + Live Chat (2026-11-25).
//
// Yang dijaga di sini adalah kerusakan yang SENYAP kalau lolos:
//   - member membaca percakapan member lain (kebocoran data pribadi),
//   - non-admin membaca/mengubah laporan,
//   - judul laporan bisa dipalsukan dari browser,
//   - tanda "pesan baru" salah (admin tak pernah tahu ada pesan masuk).
//
// Penyimpanan, sesi, dan katalog dipalsukan (vi.mock) — tak ada berkas atau
// Supabase yang tersentuh.
import { describe, it, expect, beforeEach, vi } from "vitest";

// --- Penyimpanan palsu: meniru semantik awalan + urut lib/kumpulan-dokumen ---
const dokumen = new Map<string, unknown>();
vi.mock("@/lib/kumpulan-dokumen", () => ({
  simpanDokumen: async (k: string, v: unknown) => void dokumen.set(k, structuredClone(v)),
  ambilDokumen: async (k: string) => structuredClone(dokumen.get(k) ?? null),
  daftarDokumen: async (awalan: string, o: { urutTurunBerdasar: string; batas: number }) =>
    [...dokumen.entries()]
      .filter(([k]) => k.startsWith(awalan))
      .map(([, v]) => structuredClone(v) as Record<string, string>)
      .sort((a, b) => String(b[o.urutTurunBerdasar]).localeCompare(String(a[o.urutTurunBerdasar])))
      .slice(0, o.batas),
}));

// --- Sesi palsu: siapa yang "login" diatur per tes ---
let member: { email: string; isAdmin: boolean } | null = null;
let admin: string | null = null;
vi.mock("@/lib/session", () => ({
  resolveUserEmail: async () => member,
  getAdminEmail: async () => admin,
}));
vi.mock("@/lib/nama-akun", () => ({
  namaAkun: async (email: string) => `Nama ${email.split("@")[0]}`,
}));
vi.mock("@/lib/dramas", () => ({
  getDrama: async (id: string) =>
    id === "drama-1" ? { id, title: "Judul Asli Drama", episodes: 10 } : undefined,
}));
vi.mock("@/lib/playly-gabungan", () => ({
  getPlaylyVideosGabunganCached: async () => ({ videos: [{ id: "pv1", title: "Video Playly" }] }),
}));

const laporanMember = await import("../app/api/laporan-video/route");
const laporanAdmin = await import("../app/api/admin/laporan-video/route");
const chatMember = await import("../app/api/chat/route");
const chatAdmin = await import("../app/api/admin/chat/route");
const ringkasan = await import("../app/api/admin/bantuan/route");
const { validasiLaporanMasuk, saringLaporan } = await import("../lib/laporan-video");
const { adaPesanBaru } = await import("../lib/live-chat");
const { idUtas } = await import("../lib/live-chat-simpan");

type Metode = "GET" | "POST" | "PATCH";
function minta(metode: Metode, alamat: string, body?: unknown, origin?: string) {
  // IP per tes: pembatas laju per-IP bersifat global di modul, jadi tanpa ini
  // jatah satu tes ikut habis dipakai tes sebelumnya.
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    host: "localhost",
    "x-forwarded-for": ipTes,
  };
  if (origin) headers.origin = origin;
  // NextRequest dibutuhkan untuk nextUrl; Request biasa cukup ditambal propertinya.
  const req = new Request(`http://localhost${alamat}`, {
    method: metode,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as Request & { nextUrl: URL };
  req.nextUrl = new URL(req.url);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return req as any;
}

let urut = 0;
let ipTes = "10.0.0.0";
/** Email unik per tes supaya pembatas laju per akun tak terbawa antar tes. */
const emailBaru = (awal: string) => `${awal}${++urut}@contoh.com`;

const laporanSah = {
  jenisKonten: "drama",
  kontenId: "drama-1",
  episode: 3,
  server: "cdn.contoh.com 720p",
  masalah: "buffering",
  keterangan: "patah-patah di menit 2",
};

beforeEach(() => {
  ipTes = `10.0.0.${++urut}`;
  dokumen.clear();
  member = null;
  admin = null;
});

describe("validasi laporan (murni)", () => {
  it("menolak masalah yang tak ada di daftar", () => {
    expect(validasiLaporanMasuk({ ...laporanSah, masalah: "hack" }).ok).toBe(false);
  });
  it("'Masalah lainnya' wajib keterangan", () => {
    expect(validasiLaporanMasuk({ ...laporanSah, masalah: "lainnya", keterangan: "" }).ok).toBe(false);
    expect(validasiLaporanMasuk({ ...laporanSah, masalah: "lainnya", keterangan: "suara hilang" }).ok).toBe(true);
  });
  it("keterangan > 500 karakter ditolak", () => {
    expect(validasiLaporanMasuk({ ...laporanSah, keterangan: "x".repeat(501) }).ok).toBe(false);
  });
  it("saring per status + kata kunci", () => {
    const dasar = { judul: "A", kontenId: "a", namaMember: "n", email: "e", server: "s", keterangan: "", masalah: "audio" } as const;
    const daftar = [
      { ...dasar, id: "1", status: "pending", judul: "Cinta Pertama" },
      { ...dasar, id: "2", status: "selesai", judul: "Cinta Kedua" },
    ] as never[];
    expect(saringLaporan(daftar, { status: "pending", q: "cinta" })).toHaveLength(1);
    expect(saringLaporan(daftar, { q: "audio" })).toHaveLength(2); // cari juga di label masalah
  });
});

describe("POST /api/laporan-video", () => {
  it("tamu ditolak 401", async () => {
    const res = await laporanMember.POST(minta("POST", "/api/laporan-video", laporanSah));
    expect(res.status).toBe(401);
  });

  it("tersimpan dengan judul & nama dari SERVER, bukan dari body", async () => {
    member = { email: emailBaru("budi"), isAdmin: false };
    const res = await laporanMember.POST(
      minta("POST", "/api/laporan-video", { ...laporanSah, judul: "JUDUL PALSU", namaMember: "Admin" }),
    );
    expect(res.status).toBe(201);
    const tersimpan = [...dokumen.values()][0] as Record<string, unknown>;
    expect(tersimpan.judul).toBe("Judul Asli Drama");
    expect(tersimpan.namaMember).toBe(`Nama ${member.email.split("@")[0]}`);
    expect(tersimpan.email).toBe(member.email);
    expect(tersimpan.status).toBe("pending");
    expect(tersimpan.server).toBe("cdn.contoh.com 720p");
  });

  it("video / episode yang tak ada -> 404", async () => {
    member = { email: emailBaru("budi"), isAdmin: false };
    expect((await laporanMember.POST(minta("POST", "/api/laporan-video", { ...laporanSah, kontenId: "x" }))).status).toBe(404);
    expect((await laporanMember.POST(minta("POST", "/api/laporan-video", { ...laporanSah, episode: 99 }))).status).toBe(404);
  });

  it("permintaan dari domain lain ditolak 403 (anti-CSRF)", async () => {
    member = { email: emailBaru("budi"), isAdmin: false };
    const res = await laporanMember.POST(minta("POST", "/api/laporan-video", laporanSah, "https://jahat.com"));
    expect(res.status).toBe(403);
  });

  it("laporan ke-6 dalam 10 menit dari akun yang sama -> 429", async () => {
    member = { email: emailBaru("spam"), isAdmin: false };
    const status: number[] = [];
    for (let i = 0; i < 6; i++) {
      status.push((await laporanMember.POST(minta("POST", "/api/laporan-video", laporanSah))).status);
    }
    expect(status.slice(0, 5)).toEqual([201, 201, 201, 201, 201]);
    expect(status[5]).toBe(429);
  });
});

describe("/api/admin/laporan-video", () => {
  it("bukan admin -> 401 untuk baca & ubah", async () => {
    member = { email: emailBaru("budi"), isAdmin: false };
    expect((await laporanAdmin.GET(minta("GET", "/api/admin/laporan-video"))).status).toBe(401);
    expect((await laporanAdmin.PATCH(minta("PATCH", "/api/admin/laporan-video", { id: "x", status: "selesai" }))).status).toBe(401);
  });

  it("admin melihat daftar, menyaring, lalu menandai selesai", async () => {
    member = { email: emailBaru("budi"), isAdmin: false };
    await laporanMember.POST(minta("POST", "/api/laporan-video", laporanSah));
    admin = "admin@dramaku.com";

    const daftar = await (await laporanAdmin.GET(minta("GET", "/api/admin/laporan-video?status=pending"))).json();
    expect(daftar.laporan).toHaveLength(1);
    expect(daftar.jumlah).toEqual({ pending: 1, diproses: 0, selesai: 0 });

    const id = daftar.laporan[0].id;
    const ubah = await laporanAdmin.PATCH(minta("PATCH", "/api/admin/laporan-video", { id, status: "selesai" }));
    expect(ubah.status).toBe(200);
    const sesudah = await (await laporanAdmin.GET(minta("GET", "/api/admin/laporan-video"))).json();
    expect(sesudah.laporan[0].status).toBe("selesai");
    expect(sesudah.laporan[0].ditanganiOleh).toBe("admin@dramaku.com");
  });

  it("status ngawur -> 422, id tak ada -> 404", async () => {
    admin = "admin@dramaku.com";
    const idPalsu = "00000000-0000-0000-0000-000000000000";
    expect((await laporanAdmin.PATCH(minta("PATCH", "/api/admin/laporan-video", { id: idPalsu, status: "hapus" }))).status).toBe(422);
    expect((await laporanAdmin.PATCH(minta("PATCH", "/api/admin/laporan-video", { id: idPalsu, status: "selesai" }))).status).toBe(404);
  });
});

describe("Live Chat", () => {
  it("member hanya melihat percakapannya sendiri", async () => {
    const ani = emailBaru("ani");
    const budi = emailBaru("budi");
    member = { email: ani, isAdmin: false };
    await chatMember.POST(minta("POST", "/api/chat", { teks: "rahasia Ani" }));
    member = { email: budi, isAdmin: false };
    await chatMember.POST(minta("POST", "/api/chat", { teks: "halo dari Budi" }));

    // Budi mencoba menyelundupkan utas Ani lewat query — harus diabaikan.
    const res = await chatMember.GET(minta("GET", `/api/chat?utas=${idUtas(ani)}`));
    const data = await res.json();
    expect(data.pesan.map((p: { teks: string }) => p.teks)).toEqual(["halo dari Budi"]);
  });

  it("tamu ditolak 401; pesan kosong / >1000 karakter -> 422", async () => {
    expect((await chatMember.GET(minta("GET", "/api/chat"))).status).toBe(401);
    member = { email: emailBaru("ani"), isAdmin: false };
    expect((await chatMember.POST(minta("POST", "/api/chat", { teks: "   " }))).status).toBe(422);
    expect((await chatMember.POST(minta("POST", "/api/chat", { teks: "x".repeat(1001) }))).status).toBe(422);
  });

  it("alur lengkap: member kirim -> admin lihat belum dibaca -> balas -> member dapat tanda baru", async () => {
    const ani = emailBaru("ani");
    member = { email: ani, isAdmin: false };
    await chatMember.POST(minta("POST", "/api/chat", { teks: "video tak jalan" }));

    admin = "admin@dramaku.com";
    member = null;
    const kotak = await (await chatAdmin.GET(minta("GET", "/api/admin/chat"))).json();
    expect(kotak.utas).toHaveLength(1);
    expect(kotak.utas[0].belumDibaca).toBe(true);
    expect((await (await ringkasan.GET(minta("GET", "/api/admin/bantuan"))).json()).chatBelumDibaca).toBe(1);

    const utasId = kotak.utas[0].id;
    expect((await chatAdmin.PATCH(minta("PATCH", "/api/admin/chat", { utasId }))).status).toBe(200);
    expect((await (await chatAdmin.GET(minta("GET", "/api/admin/chat"))).json()).utas[0].belumDibaca).toBe(false);

    const balas = await chatAdmin.POST(minta("POST", "/api/admin/chat", { utasId, teks: "sudah kami perbaiki" }));
    expect(balas.status).toBe(201);

    admin = null;
    member = { email: ani, isAdmin: false };
    expect((await (await chatMember.GET(minta("GET", "/api/chat?ringkas=1"))).json()).adaBaru).toBe(true);
    const isi = await (await chatMember.GET(minta("GET", "/api/chat"))).json();
    expect(isi.pesan.map((p: { dari: string }) => p.dari)).toEqual(["member", "admin"]);

    await chatMember.PATCH(minta("PATCH", "/api/chat"));
    expect((await (await chatMember.GET(minta("GET", "/api/chat?ringkas=1"))).json()).adaBaru).toBe(false);
  });

  it("admin tak bisa membuka percakapan ke utas yang belum ada (bukan alat kirim massal)", async () => {
    admin = "admin@dramaku.com";
    const res = await chatAdmin.POST(minta("POST", "/api/admin/chat", { utasId: idUtas("siapa@saja.com"), teks: "promo" }));
    expect(res.status).toBe(404);
  });

  it("non-admin tak bisa membaca kotak masuk admin", async () => {
    member = { email: emailBaru("ani"), isAdmin: false };
    expect((await chatAdmin.GET(minta("GET", "/api/admin/chat"))).status).toBe(401);
    expect((await ringkasan.GET(minta("GET", "/api/admin/bantuan"))).status).toBe(401);
  });

  it("pesan sendiri tak pernah dihitung 'baru' untuk pengirimnya", () => {
    const utas = { terakhirDari: "member" as const, terakhirPada: "2026-11-25T10:00:00.000Z" };
    expect(adaPesanBaru(utas, "member", null)).toBe(false);
    expect(adaPesanBaru(utas, "admin", null)).toBe(true);
    expect(adaPesanBaru(utas, "admin", "2026-11-25T10:00:01.000Z")).toBe(false);
  });
});
