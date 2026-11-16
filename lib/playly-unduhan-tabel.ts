// -------------------------------------------------------------------------
// TABEL CEPAT link unduhan: semua video di satu layar, tempel link ke
// kolomnya, lalu "Simpan semua" sekali (2026-11-16) — supaya admin tak perlu
// buka-tutup panel per video.
//
// Murni (tanpa jaringan/env) — dipakai komponen browser & tes.
// Penyimpanannya tetap lewat POST /api/admin/playly/unduhan per video, jadi
// pemeriksaan https + domain di server tetap jadi gerbang terakhir.
// -------------------------------------------------------------------------
import {
  KUALITAS_UNDUHAN,
  periksaUrlUnduhan,
  type DomainUnduhan,
  type KualitasUnduhan,
  type LinkUnduhan,
  type LinkUnduhanMasuk,
  type ProviderUnduhan,
} from "./playly-unduhan";

/** Provider yang dipakai owner (Google Drive, Telegram, Mega). Sisanya tetap diatur per video. */
export const PROVIDER_TABEL = ["google", "telegram", "mega"] as const satisfies readonly ProviderUnduhan[];

export type KunciSel = `${(typeof PROVIDER_TABEL)[number]}|${KualitasUnduhan}`;
export type BarisTabel = Partial<Record<KunciSel, string>>;

export const KOLOM_TABEL = PROVIDER_TABEL.flatMap((provider) =>
  KUALITAS_UNDUHAN.map((quality) => ({ provider, quality, kunci: `${provider}|${quality}` as KunciSel })),
);

const DI_TABEL = new Set<ProviderUnduhan>(PROVIDER_TABEL);

/** Isi sel yang sudah tersimpan untuk satu video. */
export function barisTersimpan(links: LinkUnduhan[], videoId: string): BarisTabel {
  const baris: BarisTabel = {};
  for (const l of links) {
    if (l.videoId === videoId && DI_TABEL.has(l.provider)) baris[`${l.provider}|${l.quality}` as KunciSel] = l.url;
  }
  return baris;
}

/** true kalau ada sel yang isinya beda dari yang tersimpan (spasi di tepi diabaikan). */
export function barisBerubah(tersimpan: BarisTabel, sekarang: BarisTabel): boolean {
  return KOLOM_TABEL.some(({ kunci }) => (tersimpan[kunci] ?? "").trim() !== (sekarang[kunci] ?? "").trim());
}

/** Alasan sel ditolak, atau null kalau kosong/sah. Aturan sama dengan server. */
export function cekSel(
  provider: ProviderUnduhan,
  isi: string | undefined,
  domain: DomainUnduhan,
): string | null {
  if (!isi?.trim()) return null;
  const hasil = periksaUrlUnduhan(provider, isi, domain);
  return hasil.ok ? null : hasil.alasan;
}

/**
 * Kiriman simpan untuk satu video. Simpanan server MENGGANTI seluruh link
 * video itu, jadi link provider di LUAR tabel (mis. Send.cm) wajib ikut
 * dikirim apa adanya — kalau tidak, link itu terhapus diam-diam.
 */
export function kirimanBaris(
  links: LinkUnduhan[],
  videoId: string,
  baris: BarisTabel,
): Omit<LinkUnduhanMasuk, "videoId">[] {
  const luarTabel = links
    .filter((l) => l.videoId === videoId && !DI_TABEL.has(l.provider))
    .map(({ provider, quality, url }) => ({ provider, quality, url }));
  const dariTabel = KOLOM_TABEL.filter(({ kunci }) => baris[kunci]?.trim()).map(({ provider, quality, kunci }) => ({
    provider,
    quality,
    url: baris[kunci]!.trim(),
  }));
  return [...luarTabel, ...dariTabel];
}
