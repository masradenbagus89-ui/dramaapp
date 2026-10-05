// Penjaga ATURAN link unduhan video Playly (videoId × provider × kualitas).
//
// KENAPA diuji: tiga hal di sini rusak SECARA SENYAP.
//
// 1) PAGAR ALAMAT PER PROVIDER. Alamat berakhir di atribut `href` penonton.
//    `javascript:` yang lolos = XSS; domain asing yang lolos = penonton
//    menekan tombol "Mega" lalu dibawa ke situs lain. Tak ada error apa pun.
// 2) KEUNIKAN. Impor/webhook yang diulang harus MEMPERBARUI, bukan menambah
//    baris kembar — kembaran = dua tombol "1080p" yang mungkin beda tujuan.
// 3) SALAH TEMPEL. Link video A muncul di popup video B.
import { describe, it, expect } from "vitest";
import {
  bacaDaftarLinkUnduhan,
  gantiLinkVideo,
  kelompokkanPerProvider,
  normalKualitas,
  normalProvider,
  periksaUrlUnduhan,
  tempelUnduhanPlayly,
  terapkanLinkUnduhan,
  validasiLinkUnduhan,
  type DomainUnduhan,
  type LinkUnduhan,
  type LinkUnduhanMasuk,
  type LinkUnduhanPublik,
} from "../lib/playly-unduhan";
import { bacaDomainUnduhan, DOMAIN_UNDUHAN_BAWAAN } from "../lib/playly-unduhan-domain";

const DOMAIN: DomainUnduhan = bacaDomainUnduhan({});
/** Cast punya domain hanya di tes yang memintanya — bawaannya kosong. */
const DOMAIN_DGN_CAST: DomainUnduhan = bacaDomainUnduhan({
  PLAYLY_UNDUHAN_DOMAIN_CAST: "cast.contoh.id",
});

const GDRIVE = "https://drive.google.com/file/d/abc123/view";
const TELEGRAM = "https://t.me/dramaku/42";
const MEGA = "https://mega.nz/file/xyz#kunci";

describe("periksaUrlUnduhan — domain WAJIB milik provider-nya", () => {
  it.each([
    ["google", GDRIVE],
    ["google", "https://drive.usercontent.google.com/download?id=abc"],
    ["telegram", TELEGRAM],
    ["telegram", "https://telegram.me/dramaku/42"],
    ["mega", MEGA],
  ] as const)("menerima %s: %s", (provider, url) => {
    expect(periksaUrlUnduhan(provider, url, DOMAIN)).toEqual({ ok: true, url });
  });

  it("menolak link provider LAIN (Mega dilabeli Telegram)", () => {
    const hasil = periksaUrlUnduhan("telegram", MEGA, DOMAIN);
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.alasan).toContain('"mega.nz"');
  });

  it("menolak http (wajib https)", () => {
    const hasil = periksaUrlUnduhan("google", "http://drive.google.com/file/d/a", DOMAIN);
    expect(hasil).toEqual({ ok: false, alasan: "alamat wajib diawali https://" });
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "/unduh/1",
    "bukan alamat",
    "",
  ])("menolak skema/bentuk berbahaya: %s", (url) => {
    expect(periksaUrlUnduhan("google", url, DOMAIN).ok).toBe(false);
  });

  it("menolak domain MENIRU (berakhiran / berawalan sama)", () => {
    expect(periksaUrlUnduhan("google", "https://drive.google.com.jahat.id/a", DOMAIN).ok).toBe(false);
    expect(periksaUrlUnduhan("google", "https://palsu-drive.google.com/a", DOMAIN).ok).toBe(false);
    expect(periksaUrlUnduhan("mega", "https://x.mega.nz/a", DOMAIN).ok).toBe(false);
  });

  it("menolak user:pass@ (host aslinya bukan yang terbaca mata)", () => {
    const hasil = periksaUrlUnduhan("google", "https://drive.google.com@jahat.id/a", DOMAIN);
    expect(hasil.ok).toBe(false);
  });

  it("menolak port khusus", () => {
    expect(periksaUrlUnduhan("mega", "https://mega.nz:8443/file/a", DOMAIN).ok).toBe(false);
  });

  it("Cast DITOLAK selama domainnya belum diatur, dan alasannya menyebut env-nya", () => {
    const hasil = periksaUrlUnduhan("cast", "https://cast.contoh.id/v/1", DOMAIN);
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.alasan).toContain("PLAYLY_UNDUHAN_DOMAIN_CAST");
  });

  it("Cast DITERIMA setelah domainnya diisi lewat env", () => {
    expect(periksaUrlUnduhan("cast", "https://cast.contoh.id/v/1", DOMAIN_DGN_CAST).ok).toBe(true);
  });
});

describe("bacaDomainUnduhan — konfigurasi, bukan hardcode tersebar", () => {
  it("tanpa env = bawaan persis", () => {
    expect(DOMAIN.google).toEqual([...DOMAIN_UNDUHAN_BAWAAN.google]);
    expect(DOMAIN.cast).toEqual([]);
  });

  it("env MENAMBAH (bukan mengganti), dirapikan huruf kecil & tanpa skema", () => {
    const d = bacaDomainUnduhan({ PLAYLY_UNDUHAN_DOMAIN_MEGA: "HTTPS://Mega.io/, mega.app" });
    expect(d.mega).toEqual(["mega.nz", "mega.io", "mega.app"]);
  });
});

describe("normalProvider & normalKualitas", () => {
  it("memetakan sebutan manusia ke kode tetap", () => {
    expect(normalProvider("Google Share")).toBe("google");
    expect(normalProvider(" google_drive ")).toBe("google");
    expect(normalProvider("TELEGRAM")).toBe("telegram");
    expect(normalProvider("mega.nz")).toBe("mega");
  });

  it("menolak provider di luar empat yang resmi (termasuk nama properti objek)", () => {
    expect(normalProvider("sendcm")).toBeNull();
    expect(normalProvider("constructor")).toBeNull();
    expect(normalProvider("__proto__")).toBeNull();
    expect(normalProvider(1)).toBeNull();
  });

  it("kualitas: 1080p/480p dengan variasi tulisan; selain itu ditolak", () => {
    expect(normalKualitas("1080P")).toBe("1080p");
    expect(normalKualitas("480")).toBe("480p");
    expect(normalKualitas(1080)).toBe("1080p");
    expect(normalKualitas("720p")).toBeNull();
    expect(normalKualitas("")).toBeNull();
  });
});

describe("validasiLinkUnduhan — satu gerbang untuk webhook, impor, admin", () => {
  it("hanya empat field yang dipungut (anti mass assignment)", () => {
    const hasil = validasiLinkUnduhan(
      { videoId: " v1 ", provider: "Google", quality: "1080", url: GDRIVE, isAdmin: true } as never,
      DOMAIN,
    );
    expect(hasil).toEqual({
      ok: true,
      link: { videoId: "v1", provider: "google", quality: "1080p", url: GDRIVE },
    });
  });

  it("alasan penolakan bisa dibaca manusia", () => {
    const r = (x: Record<string, unknown>) => {
      const h = validasiLinkUnduhan(x, DOMAIN);
      return h.ok ? "ok" : h.alasan;
    };
    expect(r({ provider: "google", quality: "1080p", url: GDRIVE })).toBe("video kosong");
    expect(r({ videoId: "v", provider: "x", quality: "1080p", url: GDRIVE })).toContain("provider");
    expect(r({ videoId: "v", provider: "google", quality: "720p", url: GDRIVE })).toContain("kualitas");
  });
});

const W1 = "2026-10-05T01:00:00.000Z";
const W2 = "2026-10-05T02:00:00.000Z";
const masuk = (m: Partial<LinkUnduhanMasuk> = {}): LinkUnduhanMasuk => ({
  videoId: "v1",
  provider: "google",
  quality: "1080p",
  url: GDRIVE,
  ...m,
});

describe("terapkanLinkUnduhan — videoId + provider + kualitas UNIK", () => {
  it("baris baru diberi createdAt = updatedAt", () => {
    const { daftar, status } = terapkanLinkUnduhan([], [masuk()], W1);
    expect(status).toEqual(["baru"]);
    expect(daftar).toEqual([{ ...masuk(), createdAt: W1, updatedAt: W1 }]);
  });

  it("kombinasi sama + alamat beda = DIPERBARUI, bukan digandakan", () => {
    const awal = terapkanLinkUnduhan([], [masuk()], W1).daftar;
    const baru = "https://drive.google.com/file/d/BARU/view";
    const { daftar, status } = terapkanLinkUnduhan(awal, [masuk({ url: baru })], W2);
    expect(status).toEqual(["diperbarui"]);
    expect(daftar).toHaveLength(1);
    expect(daftar[0]).toMatchObject({ url: baru, createdAt: W1, updatedAt: W2 });
  });

  it("kombinasi sama + alamat sama = 'sama', updatedAt TIDAK bergeser", () => {
    const awal = terapkanLinkUnduhan([], [masuk()], W1).daftar;
    const { daftar, status } = terapkanLinkUnduhan(awal, [masuk()], W2);
    expect(status).toEqual(["sama"]);
    expect(daftar[0].updatedAt).toBe(W1);
  });

  it("kualitas atau provider berbeda = baris terpisah", () => {
    const { daftar } = terapkanLinkUnduhan(
      [],
      [masuk(), masuk({ quality: "480p" }), masuk({ provider: "telegram", url: TELEGRAM })],
      W1,
    );
    expect(daftar).toHaveLength(3);
  });

  it("kembaran DI DALAM satu kiriman: yang terakhir menang, tetap satu baris", () => {
    const kedua = "https://drive.google.com/file/d/KEDUA/view";
    const { daftar, status } = terapkanLinkUnduhan([], [masuk(), masuk({ url: kedua })], W1);
    expect(status).toEqual(["baru", "diperbarui"]);
    expect(daftar).toHaveLength(1);
    expect(daftar[0].url).toBe(kedua);
  });
});

describe("gantiLinkVideo — simpan dari panel admin", () => {
  const awal = terapkanLinkUnduhan(
    [],
    [masuk(), masuk({ quality: "480p" }), masuk({ videoId: "v2" })],
    W1,
  ).daftar;

  it("kombinasi yang tak dikirim DIHAPUS, hanya untuk video itu", () => {
    const hasil = gantiLinkVideo(awal, "v1", [masuk()], W2);
    expect(hasil.filter((l) => l.videoId === "v1").map((l) => l.quality)).toEqual(["1080p"]);
    expect(hasil.some((l) => l.videoId === "v2")).toBe(true);
  });

  it("daftar kosong = semua link video itu dihapus", () => {
    expect(gantiLinkVideo(awal, "v1", [], W2).every((l) => l.videoId === "v2")).toBe(true);
  });
});

describe("bacaDaftarLinkUnduhan — isi dokumen = data tak-tepercaya", () => {
  it("baris yang tak lolos aturan TIDAK ikut terbaca", () => {
    const daftar = bacaDaftarLinkUnduhan(
      [
        { ...masuk(), createdAt: W1, updatedAt: W1 },
        { ...masuk({ quality: "480p" }), url: "javascript:alert(1)" },
        { ...masuk({ provider: "mega" }), url: GDRIVE },
        "bukan objek",
        null,
      ],
      DOMAIN,
    );
    expect(daftar).toEqual([{ ...masuk(), createdAt: W1, updatedAt: W1 }]);
  });

  it("bentuk dokumen lama (peta videoId -> provider) dibaca sebagai kosong", () => {
    expect(bacaDaftarLinkUnduhan({ v1: [{ name: "Telegram", url: TELEGRAM }] }, DOMAIN)).toEqual([]);
    expect(bacaDaftarLinkUnduhan(null, DOMAIN)).toEqual([]);
  });

  it("kembaran di dokumen dirapatkan jadi satu (yang terakhir menang)", () => {
    const kedua = "https://drive.google.com/file/d/KEDUA/view";
    const daftar = bacaDaftarLinkUnduhan([masuk(), masuk({ url: kedua })], DOMAIN);
    expect(daftar).toHaveLength(1);
    expect(daftar[0].url).toBe(kedua);
  });

  it("cap waktu yang rusak jadi string kosong, bukan dipercaya", () => {
    const [l] = bacaDaftarLinkUnduhan([{ ...masuk(), createdAt: "kemarin", updatedAt: 5 }], DOMAIN);
    expect(l.createdAt).toBe("");
    expect(l.updatedAt).toBe("");
  });
});

describe("tempelUnduhanPlayly — link menempel ke video yang BENAR", () => {
  type VideoUji = { id: string; linkUnduhan?: LinkUnduhanPublik[] };
  const videos: VideoUji[] = [{ id: "v1" }, { id: "v2" }];
  const daftar: LinkUnduhan[] = terapkanLinkUnduhan(
    [],
    [
      masuk({ videoId: "v2", provider: "mega", quality: "480p", url: MEGA }),
      masuk({ videoId: "v2", quality: "480p" }),
      masuk({ videoId: "v2" }),
    ],
    W1,
  ).daftar;

  it("hanya video yang punya link yang mendapat field, urut provider lalu kualitas", () => {
    const hasil = tempelUnduhanPlayly(videos, daftar);
    expect(hasil[0]).toBe(videos[0]);
    expect(hasil[1].linkUnduhan).toEqual([
      { provider: "google", quality: "1080p", url: GDRIVE },
      { provider: "google", quality: "480p", url: GDRIVE },
      { provider: "mega", quality: "480p", url: MEGA },
    ]);
  });

  it("link basi yang terbawa kartu (salinan cadangan) DIBUANG, bukan dibiarkan", () => {
    const basi: VideoUji = { id: "v1", linkUnduhan: [{ provider: "mega", quality: "1080p", url: MEGA }] };
    const [hasil] = tempelUnduhanPlayly([basi], []);
    expect(hasil).not.toHaveProperty("linkUnduhan");
    expect(basi.linkUnduhan).toHaveLength(1);
  });
});

describe("kelompokkanPerProvider — bentuk tabel popup", () => {
  it("lengkap: 4 provider × 2 kualitas, urutan tetap", () => {
    const semua = (["mega", "cast", "telegram", "google"] as const).flatMap((provider) =>
      (["480p", "1080p"] as const).map((quality) => ({ provider, quality, url: `https://x/${provider}/${quality}` })),
    );
    const baris = kelompokkanPerProvider(semua);
    expect(baris.map((b) => b.label)).toEqual(["Google Share", "Telegram", "Cast", "Mega"]);
    expect(baris.every((b) => b.tombol.map((t) => t.quality).join() === "1080p,480p")).toBe(true);
  });

  it("sebagian: provider tanpa link tak punya baris, kualitas tanpa link tak punya tombol", () => {
    const baris = kelompokkanPerProvider([
      { provider: "telegram", quality: "480p", url: TELEGRAM },
    ]);
    expect(baris).toEqual([
      { provider: "telegram", label: "Telegram", tombol: [{ quality: "480p", url: TELEGRAM }] },
    ]);
  });

  it("kosong = nol baris", () => {
    expect(kelompokkanPerProvider([])).toEqual([]);
  });
});
