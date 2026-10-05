// -------------------------------------------------------------------------
// LINK UNDUHAN per VIDEO PLAYLY — aturan murninya (tanpa jaringan, tanpa env).
// Penyimpanannya di lib/store.ts; daftar domain per provider di
// lib/playly-unduhan-domain.ts (server-only, karena membaca env).
//
// BENTUK DATA (owner 2026-10-05): satu BARIS = satu kombinasi
//   videoId × provider (google|telegram|cast|mega) × kualitas (1080p|480p)
// dan kombinasi itu UNIK. Mengirim kombinasi yang sama lagi (impor ulang,
// webhook dikirim ulang) MEMPERBARUI barisnya, bukan menambah kembaran — itu
// yang membuat impor & webhook aman diulang.
//
// Berkas ini SENGAJA bebas env & bebas modul server: komponen popup di browser
// ikut mengimpor konstanta & pengelompokannya dari sini.
//
// UTANG TEKNIS YANG DISENGAJA: tempat yang benar untuk baris-baris ini adalah
// tabel sendiri ber-UNIQUE (sudah disiapkan:
// supabase_migrations/2026-10-05_playly_link_unduhan.sql). Akses DDL masih
// tertutup sejak 2026-09-22, jadi untuk sekarang barisnya disimpan sebagai
// SATU dokumen `app_data`. Akibatnya keunikan dijaga KODE (`terapkanLinkUnduhan`),
// bukan database — dan isi dokumen diperlakukan DATA TAK-TEPERCAYA: disaring
// ulang tiap dibaca, karena alamatnya berakhir di atribut `href` penonton.
// -------------------------------------------------------------------------

/** Urutan di sini = urutan baris di popup. */
export const PROVIDER_UNDUHAN = ["google", "telegram", "cast", "mega"] as const;
export type ProviderUnduhan = (typeof PROVIDER_UNDUHAN)[number];

/** Nama yang dibaca penonton. Kodenya (`google`) tetap dipakai di data. */
export const LABEL_PROVIDER: Record<ProviderUnduhan, string> = {
  google: "Google Share",
  telegram: "Telegram",
  cast: "Cast",
  mega: "Mega",
};

/** Urutan di sini = urutan tombol dalam satu baris provider. */
export const KUALITAS_UNDUHAN = ["1080p", "480p"] as const;
export type KualitasUnduhan = (typeof KUALITAS_UNDUHAN)[number];

/** Kunci dokumen di tabel `app_data`. */
export const KUNCI_LINK_UNDUHAN = "playly:link-unduhan";

/** Domain yang diizinkan per provider. Isinya dibaca dari env oleh server. */
export type DomainUnduhan = Record<ProviderUnduhan, string[]>;

export type LinkUnduhan = {
  videoId: string;
  provider: ProviderUnduhan;
  quality: KualitasUnduhan;
  url: string;
  /** ISO UTC. Tidak berubah saat barisnya diperbarui. */
  createdAt: string;
  /** ISO UTC. Hanya bergeser kalau alamatnya benar-benar berubah. */
  updatedAt: string;
};

/** Baris yang sudah lolos validasi, sebelum diberi cap waktu oleh penyimpanan. */
export type LinkUnduhanMasuk = Pick<LinkUnduhan, "videoId" | "provider" | "quality" | "url">;

/** Yang dikirim ke browser — tanpa cap waktu yang tak dipakai tampilan. */
export type LinkUnduhanPublik = Pick<LinkUnduhan, "provider" | "quality" | "url">;

export type HasilValidasi =
  | { ok: true; link: LinkUnduhanMasuk }
  | { ok: false; alasan: string };

/** Hasil menulis satu baris — dipakai laporan impor & balasan webhook. */
export type StatusTulis = "baru" | "diperbarui" | "sama";

/** Batas panjang: alamat Drive/Mega wajar < 300 huruf; 2048 = batas aman URL. */
const URL_MAKS = 2048;
const VIDEO_ID_MAKS = 200;

/**
 * Sebutan lain yang lazim ditulis manusia di CSV ("Google Drive", "gdrive").
 * Dipetakan ke SATU kode tetap supaya data tak punya dua nama untuk satu
 * provider (§3.3). Pencocokannya persis per kata, bukan "mengandung".
 */
const ALIAS_PROVIDER: Record<string, ProviderUnduhan> = {
  google: "google",
  "google share": "google",
  "google drive": "google",
  gdrive: "google",
  drive: "google",
  telegram: "telegram",
  tg: "telegram",
  cast: "cast",
  mega: "mega",
  "mega.nz": "mega",
};

/** "Google_Share" / " GOOGLE  drive " -> kode provider, atau null. */
export function normalProvider(value: unknown): ProviderUnduhan | null {
  if (typeof value !== "string") return null;
  const kunci = value.trim().toLowerCase().replace(/[\s_-]+/g, " ");
  return Object.hasOwn(ALIAS_PROVIDER, kunci) ? ALIAS_PROVIDER[kunci] : null;
}

/** "1080P" / "1080" / 1080 -> "1080p"; selain dua kualitas resmi -> null. */
export function normalKualitas(value: unknown): KualitasUnduhan | null {
  const teks = typeof value === "number" ? String(value) : value;
  if (typeof teks !== "string") return null;
  const s = teks.trim().toLowerCase().replace(/p$/, "");
  return KUALITAS_UNDUHAN.find((k) => k === `${s}p`) ?? null;
}

/**
 * Periksa alamat terhadap provider-nya. Mengembalikan alamat yang sudah
 * dirapikan, atau ALASAN penolakan dalam bahasa awam (masuk laporan impor).
 *
 * PAGAR KEAMANAN, bukan kerapian — tiap syarat menutup satu celah:
 *   - wajib https       : `javascript:`/`data:` di `href` = XSS; http = mixed content.
 *   - tanpa user:pass@  : `https://drive.google.com@jahat.com` MENIPU mata
 *                         (host aslinya jahat.com) — dibuang total.
 *   - tanpa port khusus : layanan resmi tak pernah memakainya.
 *   - domain PERSIS     : bukan "berakhiran", supaya `drive.google.com.jahat.com`
 *                         atau subdomain buatan orang lain tak ikut lolos.
 *                         Domain tambahan ditulis eksplisit lewat env.
 *   - domain milik provider-NYA : link Mega yang dilabeli "Telegram" ditolak,
 *                         karena penonton memilih tombol berdasarkan labelnya.
 */
export function periksaUrlUnduhan(
  provider: ProviderUnduhan,
  value: unknown,
  domain: DomainUnduhan,
): { ok: true; url: string } | { ok: false; alasan: string } {
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false, alasan: "alamat (url) kosong" };
  }
  const teks = value.trim();
  if (teks.length > URL_MAKS) {
    return { ok: false, alasan: `alamat lebih dari ${URL_MAKS} huruf` };
  }

  let u: URL;
  try {
    u = new URL(teks);
  } catch {
    return { ok: false, alasan: "alamat bukan URL yang sah" };
  }
  if (u.protocol !== "https:") return { ok: false, alasan: "alamat wajib diawali https://" };
  if (u.username || u.password) {
    return { ok: false, alasan: "alamat tidak boleh memuat nama pengguna/kata sandi" };
  }
  if (u.port) return { ok: false, alasan: "alamat tidak boleh memakai port khusus" };

  const label = LABEL_PROVIDER[provider];
  const diizinkan = domain[provider];
  if (diizinkan.length === 0) {
    return {
      ok: false,
      alasan: `domain untuk ${label} belum diatur (isi env PLAYLY_UNDUHAN_DOMAIN_${provider.toUpperCase()})`,
    };
  }
  const host = u.hostname.toLowerCase();
  if (!diizinkan.includes(host)) {
    return {
      ok: false,
      alasan: `domain "${host}" bukan domain ${label} yang diizinkan (${diizinkan.join(", ")})`,
    };
  }
  return { ok: true, url: u.href };
}

/**
 * SATU-SATUNYA gerbang validasi baris — dipakai webhook, skrip impor, panel
 * admin, dan pembacaan ulang dokumen. Hanya empat field yang dipungut, jadi
 * field asing di masukan tak pernah ikut tersimpan (anti mass assignment).
 */
export function validasiLinkUnduhan(
  raw: { videoId?: unknown; provider?: unknown; quality?: unknown; url?: unknown },
  domain: DomainUnduhan,
): HasilValidasi {
  const videoId = typeof raw.videoId === "string" ? raw.videoId.trim() : "";
  if (!videoId) return { ok: false, alasan: "video kosong" };
  if (videoId.length > VIDEO_ID_MAKS) return { ok: false, alasan: "id video terlalu panjang" };

  const provider = normalProvider(raw.provider);
  if (!provider) {
    return {
      ok: false,
      alasan: `provider "${String(raw.provider ?? "")}" tidak dikenal (pilih: ${PROVIDER_UNDUHAN.join(", ")})`,
    };
  }
  const quality = normalKualitas(raw.quality);
  if (!quality) {
    return {
      ok: false,
      alasan: `kualitas "${String(raw.quality ?? "")}" tidak dikenal (pilih: ${KUALITAS_UNDUHAN.join(", ")})`,
    };
  }
  const url = periksaUrlUnduhan(provider, raw.url, domain);
  if (!url.ok) return url;

  return { ok: true, link: { videoId, provider, quality, url: url.url } };
}

/** Identitas unik satu baris. `\u0000` tak mungkin muncul di id/provider. */
function kunciBaris(l: Pick<LinkUnduhan, "videoId" | "provider" | "quality">): string {
  return `${l.videoId}\u0000${l.provider}\u0000${l.quality}`;
}

function waktuSah(value: unknown): string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : "";
}

/**
 * Saring isi dokumen mentah jadi daftar baris yang sah.
 *
 * Disaring ULANG tiap dibaca (bukan dipercaya karena "sudah disaring waktu
 * disimpan"): dokumen bisa ditulis versi kode lama, tangan manusia, atau
 * daftar domain di env bisa saja sudah dipersempit sejak itu. Kembaran
 * kombinasi yang sama dirapatkan — yang TERAKHIR menang.
 */
export function bacaDaftarLinkUnduhan(raw: unknown, domain: DomainUnduhan): LinkUnduhan[] {
  if (!Array.isArray(raw)) return [];
  const peta = new Map<string, LinkUnduhan>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const hasil = validasiLinkUnduhan(r, domain);
    if (!hasil.ok) continue;
    peta.set(kunciBaris(hasil.link), {
      ...hasil.link,
      createdAt: waktuSah(r.createdAt),
      updatedAt: waktuSah(r.updatedAt),
    });
  }
  return [...peta.values()];
}

/**
 * Upsert murni: tulis `masuk` ke `lama` berdasar kunci unik.
 *
 * - kombinasi belum ada       -> "baru"       (createdAt = updatedAt = waktu)
 * - ada, alamatnya berubah     -> "diperbarui" (createdAt tetap, updatedAt = waktu)
 * - ada, alamatnya sama persis -> "sama"       (TIDAK disentuh sama sekali, supaya
 *   webhook yang dikirim ulang tak menggeser updatedAt tanpa ada yang berubah)
 */
export function terapkanLinkUnduhan(
  lama: LinkUnduhan[],
  masuk: LinkUnduhanMasuk[],
  waktu: string,
): { daftar: LinkUnduhan[]; status: StatusTulis[] } {
  const peta = new Map(lama.map((l) => [kunciBaris(l), l]));
  const status: StatusTulis[] = masuk.map((m) => {
    const kunci = kunciBaris(m);
    const ada = peta.get(kunci);
    if (!ada) {
      peta.set(kunci, { ...m, createdAt: waktu, updatedAt: waktu });
      return "baru";
    }
    if (ada.url === m.url) return "sama";
    peta.set(kunci, { ...ada, url: m.url, updatedAt: waktu });
    return "diperbarui";
  });
  return { daftar: [...peta.values()], status };
}

/**
 * Ganti SELURUH link satu video (dipakai panel admin): kombinasi yang tak ada
 * di `masuk` DIHAPUS, sisanya di-upsert. Video lain tidak tersentuh.
 */
export function gantiLinkVideo(
  lama: LinkUnduhan[],
  videoId: string,
  masuk: LinkUnduhanMasuk[],
  waktu: string,
): LinkUnduhan[] {
  const dipertahankan = new Set(masuk.map(kunciBaris));
  const sisa = lama.filter((l) => l.videoId !== videoId || dipertahankan.has(kunciBaris(l)));
  return terapkanLinkUnduhan(sisa, masuk, waktu).daftar;
}

/** Urut tetap: provider sesuai PROVIDER_UNDUHAN, lalu kualitas sesuai KUALITAS_UNDUHAN. */
function bandingkan(a: LinkUnduhanPublik, b: LinkUnduhanPublik): number {
  return (
    PROVIDER_UNDUHAN.indexOf(a.provider) - PROVIDER_UNDUHAN.indexOf(b.provider) ||
    KUALITAS_UNDUHAN.indexOf(a.quality) - KUALITAS_UNDUHAN.indexOf(b.quality)
  );
}

/**
 * Tempelkan link ke kartu video (field `linkUnduhan`). Murni supaya bisa diuji.
 * Generik atas `{ id }` karena dipanggil untuk video katalog MAUPUN webhook.
 *
 * Field lama di kartu SELALU diganti, tak pernah dibiarkan: kartu dari salinan
 * cadangan (`playly:cadangan`) membawa `linkUnduhan` dari saat salinan dibuat —
 * link yang sejak itu dihapus admin, atau tak lagi lolos daftar domain, akan
 * ikut tampil tanpa pernah lewat penyaring. Video tanpa link: field-nya dibuang,
 * bukan diisi array kosong.
 */
export function tempelUnduhanPlayly<T extends { id: string; linkUnduhan?: LinkUnduhanPublik[] }>(
  videos: T[],
  daftar: LinkUnduhan[],
): T[] {
  const perVideo = new Map<string, LinkUnduhanPublik[]>();
  for (const l of daftar) {
    const isi = perVideo.get(l.videoId) ?? [];
    isi.push({ provider: l.provider, quality: l.quality, url: l.url });
    perVideo.set(l.videoId, isi);
  }
  return videos.map((v) => {
    const links = perVideo.get(v.id);
    if (links?.length) return { ...v, linkUnduhan: [...links].sort(bandingkan) };
    if (!("linkUnduhan" in v)) return v;
    const salinan = { ...v };
    delete salinan.linkUnduhan;
    return salinan;
  });
}

export type BarisProvider = {
  provider: ProviderUnduhan;
  label: string;
  /** Hanya kualitas yang ADA linknya, urut 1080p lalu 480p. */
  tombol: { quality: KualitasUnduhan; url: string }[];
};

/**
 * Bentuk tabel popup: satu baris per provider, tombol per kualitas.
 * Provider tanpa link sama sekali TIDAK menghasilkan baris; kualitas tanpa link
 * TIDAK menghasilkan tombol. Kembaran kombinasi (tak seharusnya ada) -> yang
 * pertama dipakai, supaya tak muncul dua tombol berlabel sama.
 */
export function kelompokkanPerProvider(links: LinkUnduhanPublik[]): BarisProvider[] {
  return PROVIDER_UNDUHAN.flatMap((provider) => {
    const tombol = KUALITAS_UNDUHAN.flatMap((quality) => {
      const l = links.find((x) => x.provider === provider && x.quality === quality);
      return l ? [{ quality, url: l.url }] : [];
    });
    return tombol.length ? [{ provider, label: LABEL_PROVIDER[provider], tombol }] : [];
  });
}
