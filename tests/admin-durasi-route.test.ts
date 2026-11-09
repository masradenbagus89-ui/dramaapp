// Penjaga jalur SIMPAN durasi di /api/admin/durasi (owner 2026-11-09).
//
// Kenapa tes ini ada, dan kenapa ia yang paling penting dari seluruh fitur
// pengisian durasi otomatis: endpoint ini MENULIS ke katalog produksi, dan
// dipakai 40 kali beruntun oleh panel massal. Satu field yang hilang di
// perjalanan = 40 drama rusak diam-diam — tanpa error, tanpa ada yang melapor.
//
// Yang dikunci di sini: body dari klien HANYA boleh menyentuh kolom runtime.
// Isi drama selebihnya dibaca ulang dari database dan ditulis balik apa adanya.
//
// Database & sesi admin dipalsukan (vi.mock) — tes ini tidak menyentuh Supabase
// maupun berkas apa pun. Pola mengikuti tests/admin-drama-route.test.ts.
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Drama } from "../lib/types";

const simpanan = new Map<string, Drama>();
/** Drama terakhir yang dikirim ke database oleh route. */
let tersimpan: Drama | null = null;

vi.mock("@/lib/session", () => ({
  isAdminRequest: async () => true,
}));

vi.mock("@/lib/dramas", async () => {
  const asli = await vi.importActual<typeof import("../lib/dramas")>(
    "../lib/dramas",
  );
  return {
    ...asli,
    getDrama: async (id: string) => simpanan.get(id),
    upsertDrama: async (drama: Drama) => {
      tersimpan = drama;
      simpanan.set(drama.id, drama);
    },
  };
});

const { POST } = await import("../app/api/admin/durasi/route");

function kirim(body: unknown) {
  return POST(
    new Request("http://localhost/api/admin/durasi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any,
  );
}

/** Serial lengkap, meniru baris katalog sungguhan yang kaya field. */
function serialLengkap(): Drama {
  return {
    id: "drama-uji",
    title: "Drama Uji",
    category: "Action",
    episodes: 55,
    views: "12.3K",
    synopsis: "Sinopsis yang tidak boleh hilang.",
    gradient: "from-zinc-800 to-black",
    kind: "series",
    status: "Completed",
    posterImage: "https://contoh.test/poster.jpg",
    heroImage: "https://contoh.test/hero.jpg",
    subtitles: ["id", "en"],
    premium: true,
    exclusive: true,
    year: "2025",
    imdbRating: "8.9",
    country: "China",
    runtime: "119 min",
  } as Drama;
}

beforeEach(() => {
  simpanan.clear();
  tersimpan = null;
});

describe("POST /api/admin/durasi — menulis HANYA kolom durasi", () => {
  it("mengganti runtime dan membiarkan SELURUH field lain utuh", () => {
    const awal = serialLengkap();
    simpanan.set(awal.id, awal);

    return kirim({ id: awal.id, runtime: "1.47" }).then(async (res) => {
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ ok: true, tergambar: "1:47" });

      expect(tersimpan).not.toBeNull();
      expect(tersimpan!.runtime).toBe("1.47");
      // Dibandingkan sebagai SATU objek, bukan field per field: cara itu yang
      // menangkap field yang hilang tanpa harus menyebutkannya satu-satu di
      // sini (dan tanpa ikut basi saat katalog menambah kolom baru).
      expect({ ...tersimpan!, runtime: awal.runtime }).toEqual(awal);
    });
  });

  it("field liar di body TIDAK ikut tersimpan", () => {
    // UI bukan pagar: siapa pun yang memegang sesi admin bisa mengirim body apa
    // saja. Kalau route meneruskan body mentah ke database, endpoint sempit ini
    // justru jadi jalan pintas untuk menimpa seluruh drama.
    const awal = serialLengkap();
    simpanan.set(awal.id, awal);

    return kirim({
      id: awal.id,
      runtime: "2.05",
      title: "JUDUL DIBAJAK",
      premium: false,
      synopsis: "dihapus",
      episodes: 1,
    }).then(async (res) => {
      expect(res.status).toBe(200);
      expect(tersimpan!.runtime).toBe("2.05");
      expect(tersimpan!.title).toBe("Drama Uji");
      expect(tersimpan!.premium).toBe(true);
      expect(tersimpan!.synopsis).toBe("Sinopsis yang tidak boleh hilang.");
      expect(tersimpan!.episodes).toBe(55);
    });
  });

  it("menolak durasi yang tidak akan pernah tergambar (422)", async () => {
    // Durasi yang tersimpan tapi tak pernah muncul di poster = kerusakan
    // senyap. "119 min" pada SERIAL adalah kasus nyatanya — 25 drama di
    // katalog berisi itu, dan tak ada yang sadar selama berbulan-bulan.
    const awal = serialLengkap();
    simpanan.set(awal.id, awal);

    const res = await kirim({ id: awal.id, runtime: "119 min" });
    expect(res.status).toBe(422);
    expect(tersimpan).toBeNull(); // nol penulisan
  });

  it("FILM memakai aturan durasinya sendiri", async () => {
    // Teks yang sama berarti beda per jenis — kalau route memakai satu aturan
    // saja, separuh katalog jadi tak bisa diisi sama sekali.
    const film = { ...serialLengkap(), id: "film-uji", kind: "movie", episodes: 1 } as Drama;
    simpanan.set(film.id, film);

    const res = await kirim({ id: film.id, runtime: "165 min" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ tergambar: "02:45" });
    expect(tersimpan!.runtime).toBe("165 min");
  });

  it("menolak id yang tidak ada, bukan membuat drama baru", async () => {
    // upsertDrama akan MEMBUAT baris kalau id-nya belum ada. Tanpa penjaga
    // ini, salah ketik id menghasilkan drama hantu tanpa judul di katalog.
    const res = await kirim({ id: "tidak-ada", runtime: "1.47" });
    expect(res.status).toBe(404);
    expect(tersimpan).toBeNull();
  });

  it("menolak bentuk id & runtime yang tidak sah (400)", async () => {
    const awal = serialLengkap();
    simpanan.set(awal.id, awal);

    for (const body of [
      { id: "../../etc/passwd", runtime: "1.47" },
      { id: "", runtime: "1.47" },
      { id: awal.id, runtime: "" },
      { id: awal.id, runtime: "   " },
      { id: awal.id }, // runtime hilang
      { id: 42, runtime: "1.47" }, // jenis salah
      { runtime: "1.47" }, // id hilang
    ]) {
      const res = await kirim(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
    }
    expect(tersimpan).toBeNull(); // nol penulisan dari semua percobaan di atas
  });
});
