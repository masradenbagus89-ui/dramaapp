// @vitest-environment jsdom
//
// Penjaga pekerjaan 2026-10-29 — LOGIN & DAFTAR DIHAPUS UNTUK PENONTON, tapi
// komentar & rating TETAP BISA DIPAKAI.
//
// Arahan Kang Dedi lewat owner: *"hapus fitur login/daftar, karena orang lain
// tidak perlu login, mereka tinggal nonton gratis saja."* Lalu owner menambahkan
// syaratnya: *"cuma login dan daftar aja yang dihapus, sisanya biarkan saja —
// jadi viewer masih bisa kasih rating komen."*
//
// Dua kalimat itu BERTABRAKAN di kode, dan di situlah letak risikonya: sebelum
// hari ini, POST komentar dan POST rating sama-sama menolak 401 tanpa sesi
// login. Jadi "hapus login, biarkan sisanya" apa adanya akan MEMATIKAN keduanya
// untuk semua orang — tanpa error yang terlihat dari sisi kita, sebab 401 itu
// jawaban yang sah. Yang ketahuan cuma kalau ada penonton mencoba berkomentar.
// Berkas ini yang memastikan maksud owner benar-benar terjadi, bukan sekadar
// diniatkan.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement as h, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextRequest } from "next/server";

// Kunci tanda tangan WAJIB ada sebelum modul mana pun dimuat: identitas tamu
// memakai HMAC yang sama dengan sesi, dan tanpa kunci ia GAGAL-MENGUNCI
// (menolak permintaan) — perilaku yang justru ikut diuji di bawah.
process.env.AUTH_SECRET = "kunci-uji-jangan-dipakai-di-produksi";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Lapisan data ditiru supaya tes tak butuh database. Komentar & rating disimpan
 * di objek dalam memori, jadi tes bisa memeriksa APA yang benar-benar tersimpan
 * — bukan cuma kode status balasannya.
 */
const simpanan = vi.hoisted(() => ({
  komentar: [] as Array<Record<string, unknown>>,
  rating: {} as Record<string, number>,
}));

vi.mock("@/lib/store", () => ({
  getCommentsFor: async () => simpanan.komentar,
  addComment: async (_id: string, c: Record<string, unknown>) => {
    simpanan.komentar.unshift(c);
  },
  setCommentsFor: async (_id: string, list: Array<Record<string, unknown>>) => {
    simpanan.komentar = list;
  },
  getRatingsFor: async () => simpanan.rating,
  setRating: async (_id: string, kunci: string, bintang: number) => {
    simpanan.rating[kunci.toLowerCase()] = bintang;
    return simpanan.rating;
  },
  summarizeRatings: (map: Record<string, number>) => {
    const nilai = Object.values(map);
    return {
      average: nilai.length
        ? nilai.reduce((a, b) => a + b, 0) / nilai.length
        : 0,
      count: nilai.length,
    };
  },
  RATING_MIN: 1,
  RATING_MAX: 5,
  // Dipakai lib/session saat memverifikasi cookie admin. Tak ada admin di tes
  // ini, jadi selalu false — identitas yang lolos pasti identitas TAMU.
  isAdminEmail: async () => false,
}));

const { POST: postKomentar, GET: getKomentar, DELETE: hapusKomentar } =
  await import("../app/api/comments/route");
const { POST: postRating, GET: getRating } = await import(
  "../app/api/ratings/route"
);
const {
  bacaKunciTamu,
  bersihkanNamaTamu,
  identitasInteraksi,
  kunciTamu,
  NAMA_TAMU_BAWAAN,
  TAMU_COOKIE,
  terbitkanTamu,
} = await import("../lib/tamu");
const { AKUN_PENONTON_ENABLED } = await import("../lib/saklar-fitur");

/** Permintaan dari domain sendiri, supaya yang menolak bukan penjaga CSRF. */
function minta(
  path: string,
  { method = "GET", body, cookie }: {
    method?: string;
    body?: unknown;
    cookie?: string;
  } = {},
) {
  const headers: Record<string, string> = {
    origin: "http://localhost",
    host: "localhost",
    "Content-Type": "application/json",
  };
  if (cookie) headers.cookie = cookie;
  // Tiap tes memakai IP berbeda supaya pembatas laju per-IP (20/menit) tidak
  // menumpuk antar-kasus uji dan membuat tes belakangan merah tanpa sebab.
  headers["x-forwarded-for"] = `10.0.0.${Math.floor(Math.random() * 250) + 1}`;
  // NextRequest, bukan Request polos: handler GET membaca `req.nextUrl`, yang
  // hanya ada di pembungkus milik Next. Dengan Request biasa tesnya gagal
  // dengan "cannot read properties of undefined" — kegagalan alat uji, bukan
  // kegagalan kode yang sedang diuji.
  return new NextRequest("http://localhost" + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}

/** Ambil isi cookie tamu dari balasan, supaya bisa dipakai permintaan berikutnya. */
function cookieDari(res: Response): string | null {
  const raw = res.headers.get("set-cookie");
  if (!raw) return null;
  const cocok = raw.match(new RegExp(`${TAMU_COOKIE}=([^;]+)`));
  return cocok ? `${TAMU_COOKIE}=${cocok[1]}` : null;
}

beforeEach(() => {
  simpanan.komentar = [];
  simpanan.rating = {};
});

// ===========================================================================
// 1. TRIPWIRE — keadaan yang sedang berlaku
// ===========================================================================
describe("TRIPWIRE saklar akun penonton", () => {
  it("akun penonton sedang DIJEDA (keputusan owner 2026-10-29)", () => {
    // 🔴 TES INI MERAH = saklarnya dinyalakan kembali.
    //
    // Itu BOLEH, tapi harus disengaja. Kalau memang sedang menyalakan lagi
    // (`AKUN_PENONTON_ENABLED` di lib/saklar-fitur.ts), ubah harapan di bawah
    // jadi `true` — dan uji ulang komentar/rating, sebab identitas penonton
    // kembali memakai sesi akun, bukan nomor tamu.
    expect(AKUN_PENONTON_ENABLED).toBe(false);
  });

  it("ADA JALAN ke /login dari dalam situs — bukan cuma halamannya hidup", async () => {
    // 🔴 PELAJARAN MAHAL (owner 2026-10-29, sesudah rilis):
    //
    // Tes "halaman /login tetap hidup" di bawah SELALU HIJAU — dan tetap hijau
    // ketika SELURUH tautan menuju ke sana sudah hilang. Owner kehilangan jalan
    // ke panel admin-nya sendiri dan harus mengetik alamat manual.
    //
    // Berkas ADA != ada JALAN ke sana. Tes keberadaan berkas tidak pernah bisa
    // membuktikan sebuah halaman masih bisa dicapai. Ini penjaga yang kurang
    // waktu itu.
    const { readFileSync } = await import("node:fs");

    // Dua jalan, SENGAJA, karena masing-masing punya lubang sendiri:
    //   • kaki situs — tidak digambar di /beranda (owner melepasnya 28 Okt);
    //   • menu garis-tiga — hadir di /beranda, /discover, dan halaman film.
    // Kalau salah satu hilang, yang lain masih menyelamatkan.
    const kaki = readFileSync(
      "app/components/beranda/FooterSitus.tsx",
      "utf-8",
    );
    const menu = readFileSync(
      "app/components/beranda/KepalaKatalog.tsx",
      "utf-8",
    );

    expect(
      kaki,
      "kaki situs kehilangan jalan masuk pengelola",
    ).toContain('href="/login"');
    expect(
      menu,
      "menu garis-tiga kehilangan jalan masuk pengelola — di /beranda " +
        "(tanpa kaki situs) owner tak punya jalan ke dashboard sama sekali",
    ).toContain("Masuk sebagai pengelola");
  });

  it("jalan pengelola TIDAK ikut dijeda saklar penonton", async () => {
    // Justru saat `AKUN_PENONTON_ENABLED` MATI-lah tautan ini paling
    // dibutuhkan. Menggerbanginya dengan saklar yang sama = mengulang persis
    // kesalahan yang baru diperbaiki.
    const { readFileSync } = await import("node:fs");
    const menu = readFileSync(
      "app/components/beranda/KepalaKatalog.tsx",
      "utf-8",
    );
    const i = menu.indexOf("Masuk sebagai pengelola");
    // Ambil blok cabang tempat tautan itu hidup; `AKUN_PENONTON_ENABLED`
    // tidak boleh menjadi syaratnya.
    const blok = menu.slice(Math.max(0, i - 600), i);
    expect(
      blok.includes("AKUN_PENONTON_ENABLED ?"),
      "tautan pengelola berada di cabang yang digerbangi saklar penonton",
    ).toBe(false);
  });

  it("halaman /login & /daftar TETAP hidup — itu pintu ADMIN", async () => {
    const { existsSync } = await import("node:fs");
    expect(
      existsSync("app/login/page.tsx"),
      "halaman login dihapus — admin kehilangan SATU-SATUNYA jalan masuk, " +
        "dan katalog tak bisa dikelola lagi",
    ).toBe(true);
    // /daftar dibiarkan hidup supaya tautan lama & bookmark tidak jadi 404.
    expect(existsSync("app/daftar/page.tsx")).toBe(true);
  });
});

// ===========================================================================
// 2. INTI PERMINTAAN OWNER — komentar & rating tanpa akun
// ===========================================================================
describe("penonton TANPA akun bisa berkomentar", () => {
  it("komentar pertamanya diterima, bukan ditolak 401", async () => {
    const res = await postKomentar(
      minta("/api/comments", {
        method: "POST",
        body: { dramaId: "d1", user: "Budi", text: "Seru banget!" },
      }),
    );
    expect(
      res.status,
      "penonton tanpa akun ditolak — inilah kegagalan yang dikhawatirkan: " +
        "login dihapus TAPI komentar masih menuntut sesi login",
    ).toBe(200);
    expect(simpanan.komentar).toHaveLength(1);
    expect(simpanan.komentar[0].text).toBe("Seru banget!");
    expect(simpanan.komentar[0].user).toBe("Budi");
  });

  it("dapat nomor tamu lewat cookie, dan nomornya TETAP di komentar kedua", async () => {
    const pertama = await postKomentar(
      minta("/api/comments", {
        method: "POST",
        body: { dramaId: "d1", user: "Budi", text: "satu" },
      }),
    );
    const cookie = cookieDari(pertama);
    expect(cookie, "cookie tamu tidak dipasang — penonton akan dapat nomor " +
      "baru tiap komentar, dan kehilangan hak hapus atas tulisannya sendiri")
      .toBeTruthy();

    await postKomentar(
      minta("/api/comments", {
        method: "POST",
        body: { dramaId: "d1", user: "Budi", text: "dua" },
        cookie: cookie!,
      }),
    );
    const kunci = simpanan.komentar.map((c) => c.email);
    expect(kunci[0]).toBe(kunci[1]);
    expect(kunciTamu(String(kunci[0]))).toBe(true);
  });

  it("nama kosong tidak membuat komentarnya gagal", async () => {
    const res = await postKomentar(
      minta("/api/comments", {
        method: "POST",
        body: { dramaId: "d1", text: "tanpa nama" },
      }),
    );
    expect(res.status).toBe(200);
    expect(simpanan.komentar[0].user).toBe(NAMA_TAMU_BAWAAN);
  });

  it("tamu TIDAK pernah mendapat lencana admin", async () => {
    await postKomentar(
      minta("/api/comments", {
        method: "POST",
        // Mencoba menitipkan peran lewat body — harus diabaikan total.
        body: { dramaId: "d1", user: "Penyusup", role: "admin", text: "halo" },
      }),
    );
    expect(simpanan.komentar[0].role).toBe("viewer");
  });

  it("bisa menghapus komentarnya SENDIRI, tapi bukan milik orang lain", async () => {
    const res = await postKomentar(
      minta("/api/comments", {
        method: "POST",
        body: { dramaId: "d1", user: "Budi", text: "punyaku" },
      }),
    );
    const cookie = cookieDari(res)!;
    const idKomentar = String(simpanan.komentar[0].id);

    // Komentar milik orang lain, ditanam langsung ke simpanan.
    simpanan.komentar.push({
      id: "milik-orang-lain",
      user: "Siti",
      email: "tamu:ffffffffffffffffffffffffffffffff",
      role: "viewer",
      text: "punya Siti",
      time: new Date().toISOString(),
    });

    const ditolak = await hapusKomentar(
      minta("/api/comments", {
        method: "DELETE",
        body: { dramaId: "d1", commentId: "milik-orang-lain" },
        cookie,
      }),
    );
    expect(
      ditolak.status,
      "satu tamu bisa menghapus komentar tamu lain — nomor tamu tidak " +
        "berfungsi sebagai pembatas kepemilikan",
    ).toBe(403);

    const diterima = await hapusKomentar(
      minta("/api/comments", {
        method: "DELETE",
        body: { dramaId: "d1", commentId: idKomentar },
        cookie,
      }),
    );
    expect(diterima.status).toBe(200);
  });

  it("pengunjung TANPA cookie tak bisa menghapus apa pun", async () => {
    simpanan.komentar.push({
      id: "k1",
      user: "Siti",
      email: "tamu:ffffffffffffffffffffffffffffffff",
      role: "viewer",
      text: "halo",
      time: new Date().toISOString(),
    });
    const res = await hapusKomentar(
      minta("/api/comments", {
        method: "DELETE",
        body: { dramaId: "d1", commentId: "k1" },
      }),
    );
    expect(res.status).toBe(403);
    expect(simpanan.komentar).toHaveLength(1);
  });
});

describe("penonton TANPA akun bisa memberi bintang", () => {
  it("bintangnya tersimpan, bukan ditolak 401", async () => {
    const res = await postRating(
      minta("/api/ratings", {
        method: "POST",
        body: { dramaId: "d1", stars: 4 },
      }),
    );
    expect(res.status).toBe(200);
    expect(Object.values(simpanan.rating)).toEqual([4]);
  });

  it("menilai ulang MENGGANTI suara lama, bukan menambah penilai baru", async () => {
    const pertama = await postRating(
      minta("/api/ratings", { method: "POST", body: { dramaId: "d1", stars: 2 } }),
    );
    const cookie = cookieDari(pertama)!;
    const kedua = await postRating(
      minta("/api/ratings", {
        method: "POST",
        body: { dramaId: "d1", stars: 5 },
        cookie,
      }),
    );
    const data = await kedua.json();
    expect(
      data.count,
      "satu browser terhitung dua penilai — rata-ratanya bisa digeser " +
        "sesuka hati hanya dengan mengklik dua kali",
    ).toBe(1);
    expect(data.mine).toBe(5);
  });

  it("GET memulangkan suara sendiri untuk pemilik cookienya", async () => {
    const post = await postRating(
      minta("/api/ratings", { method: "POST", body: { dramaId: "d1", stars: 3 } }),
    );
    const cookie = cookieDari(post)!;
    const res = await getRating(minta("/api/ratings?dramaId=d1", { cookie }));
    expect((await res.json()).mine).toBe(3);
  });

  it("GET TIDAK menerbitkan cookie — halaman ini ber-cache", async () => {
    // Menerbitkan identitas pada permintaan BACA berarti tiap pengunjung yang
    // cuma melihat halaman ikut dapat nomor, dan Set-Cookie pada balasan yang
    // di-cache bisa tersaji ke orang lain.
    const res = await getRating(minta("/api/ratings?dramaId=d1"));
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("nilai di luar 1-5 tetap ditolak — pagar lama tidak ikut longgar", async () => {
    for (const buruk of [0, 6, 2.5, -1]) {
      const res = await postRating(
        minta("/api/ratings", {
          method: "POST",
          body: { dramaId: "d1", stars: buruk },
        }),
      );
      expect(res.status, `stars=${buruk}`).toBe(400);
    }
  });
});

// ===========================================================================
// 3. PRIVASI — email penulis berhenti disiarkan
// ===========================================================================
describe("GET komentar tidak membocorkan identitas penulis", () => {
  it("tidak mengirim field email sama sekali", async () => {
    simpanan.komentar.push({
      id: "k1",
      user: "Budi",
      email: "budi@contoh.test",
      role: "viewer",
      text: "halo",
      time: new Date().toISOString(),
    });
    const res = await getKomentar(minta("/api/comments?dramaId=d1"));
    const teks = JSON.stringify(await res.json());
    expect(
      teks,
      "alamat email penulis ikut terkirim ke browser SEMUA pengunjung — " +
        "data pribadi yang tak pernah perlu diketahui pembaca komentar",
    ).not.toContain("budi@contoh.test");
    expect(teks).not.toContain('"email"');
    // Yang memang perlu tampil tetap ada.
    expect(teks).toContain("Budi");
    expect(teks).toContain("halo");
  });

  it("menandai mana komentar milik si pembaca lewat `milikku`", async () => {
    const post = await postKomentar(
      minta("/api/comments", {
        method: "POST",
        body: { dramaId: "d1", user: "Budi", text: "punyaku" },
      }),
    );
    const cookie = cookieDari(post)!;
    simpanan.komentar.push({
      id: "lain",
      user: "Siti",
      email: "tamu:ffffffffffffffffffffffffffffffff",
      role: "viewer",
      text: "punya Siti",
      time: new Date().toISOString(),
    });

    const res = await getKomentar(minta("/api/comments?dramaId=d1", { cookie }));
    const { comments } = (await res.json()) as {
      comments: Array<{ text: string; milikku: boolean }>;
    };
    const punyaku = comments.find((c) => c.text === "punyaku");
    const punyaSiti = comments.find((c) => c.text === "punya Siti");
    expect(punyaku?.milikku).toBe(true);
    expect(punyaSiti?.milikku).toBe(false);
  });
});

// ===========================================================================
// 4. IDENTITAS TAMU — tanda tangan & pembersihan nama
// ===========================================================================
describe("nomor tamu bertanda tangan", () => {
  it("cookie yang dikarang sendiri DITOLAK", async () => {
    const palsu = `${TAMU_COOKIE}=bukan-token-sungguhan.tandatanganngawur`;
    expect(
      bacaKunciTamu(minta("/api/comments", { cookie: palsu })),
      "nomor tamu karangan diterima — siapa pun bisa mengaku pemilik komentar " +
        "orang lain hanya dengan menyetel cookie sendiri",
    ).toBeNull();
  });

  it("tanda tangan yang diutak-atik satu huruf pun DITOLAK", () => {
    const tamu = terbitkanTamu()!;
    const rusak = tamu.token.slice(0, -1) + (tamu.token.endsWith("A") ? "B" : "A");
    expect(
      bacaKunciTamu(minta("/api/comments", { cookie: `${TAMU_COOKIE}=${rusak}` })),
    ).toBeNull();
  });

  it("nomornya HEX — kebal terhadap penurunan huruf di lapisan penyimpanan", () => {
    // `setRating` melewatkan kuncinya ke `normEmail` yang menurunkan huruf.
    // Kalau nomornya base64url (ada huruf besar), nomor yang sama berubah
    // bentuk saat disimpan dan penonton kehilangan suaranya sendiri.
    for (let i = 0; i < 20; i++) {
      const { kunci } = terbitkanTamu()!;
      expect(kunci).toMatch(/^tamu:[0-9a-f]{32}$/);
      expect(kunci.toLowerCase()).toBe(kunci);
    }
  });

  it("dua tamu berbeda tidak pernah mendapat nomor yang sama", () => {
    const kumpulan = new Set(
      Array.from({ length: 200 }, () => terbitkanTamu()!.kunci),
    );
    expect(kumpulan.size).toBe(200);
  });

  it("sesi akun sungguhan DIDAHULUKAN daripada cookie tamu", async () => {
    // Penting saat saklar akun dinyalakan lagi: penonton yang login harus
    // kembali memakai identitas akunnya, bukan nomor tamu yang masih nyangkut
    // di browsernya — kalau tidak, komentar & rating lamanya terlihat milik
    // orang lain.
    const { signViewerSession, VIEWER_COOKIE } = await import("../lib/session");
    const tamu = terbitkanTamu()!;
    const req = minta("/api/comments", {
      cookie: `${TAMU_COOKIE}=${tamu.token}; ${VIEWER_COOKIE}=${signViewerSession("budi@contoh.test")}`,
    });
    const id = await identitasInteraksi(req);
    expect(id?.kunci).toBe("budi@contoh.test");
    expect(id?.tamu).toBe(false);
  });
});

describe("bersihkanNamaTamu", () => {
  it("memakai nama bawaan kalau kosong / cuma spasi", () => {
    for (const kosong of ["", "   ", null, undefined, "\t\n"]) {
      expect(bersihkanNamaTamu(kosong)).toBe(NAMA_TAMU_BAWAAN);
    }
  });

  it("membuang penanda arah teks yang dipakai menyamarkan nama", () => {
    // U+202E membalik arah tulisan di layar, sehingga sebuah nama bisa
    // terbaca seperti nama orang lain tanpa satu pun karakter mencurigakan
    // yang terlihat.
    const hasil = bersihkanNamaTamu("Bu‮di");
    expect(hasil).toBe("Budi");
    expect(hasil).not.toContain("‮");
  });

  it("merapatkan spasi beruntun", () => {
    expect(bersihkanNamaTamu("Budi      Santoso")).toBe("Budi Santoso");
  });

  it("memotong nama yang kepanjangan supaya tata letak tak rusak", () => {
    expect(bersihkanNamaTamu("A".repeat(200)).length).toBeLessThanOrEqual(24);
  });

  it("membiarkan nama biasa apa adanya", () => {
    expect(bersihkanNamaTamu("Kang Dedi")).toBe("Kang Dedi");
  });
});

// ===========================================================================
// 5. TAMPILAN — jalan masuk akun benar-benar hilang dari layar
// ===========================================================================
describe("tampilan penonton tak lagi menawarkan Masuk / Daftar", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("bar 'Lanjutkan Menonton' diam total — bukan tombol ke panel kosong", async () => {
    const { default: LanjutMenonton } = await import(
      "../app/components/beranda/LanjutMenonton"
    );
    act(() => root.render(h(LanjutMenonton)));
    expect(
      container.innerHTML,
      "barnya masih tergambar padahal isinya cuma tombol Masuk/Daftar — " +
        "penonton mengklik lalu tak terjadi apa-apa",
    ).toBe("");
  });

  it("tak ada satu pun tautan /login atau /daftar di komponen penonton", async () => {
    const { readFileSync } = await import("node:fs");
    // Diperiksa dari SUMBER, bukan hasil render: tombolnya kini berada di balik
    // `AKUN_PENONTON_ENABLED`, jadi yang dijaga adalah tak ada tautan yang
    // lolos TANPA saklar itu. Komponen di daftar ini murni tampilan penonton —
    // AdminAccessDenied & halaman login sendiri sengaja TIDAK ikut.
    for (const berkas of [
      "app/components/Comments.tsx",
      "app/components/RatingStars.tsx",
    ]) {
      const sumber = readFileSync(berkas, "utf-8");
      expect(
        sumber,
        `${berkas} masih menautkan ke /login — penonton diajak ke halaman ` +
          `yang sudah tidak berlaku untuknya`,
      ).not.toMatch(/href=["']\/(login|daftar)["']/);
    }
  });

  it("komponen yang masih punya tombolnya menjaganya di balik saklar", async () => {
    const { readFileSync } = await import("node:fs");
    for (const berkas of [
      "app/components/TopNav.tsx",
      "app/components/beranda/KepalaKatalog.tsx",
      "app/components/beranda/LanjutMenonton.tsx",
      "app/profile/page.tsx",
    ]) {
      const sumber = readFileSync(berkas, "utf-8");
      expect(
        sumber,
        `${berkas} menyimpan tautan akun tanpa gerbang AKUN_PENONTON_ENABLED`,
      ).toContain("AKUN_PENONTON_ENABLED");
    }
  });
});
