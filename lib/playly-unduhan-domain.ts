// -------------------------------------------------------------------------
// DAFTAR DOMAIN yang diizinkan per provider link unduhan — SATU tempat.
//
// Dipisah dari lib/playly-unduhan.ts karena berkas ini membaca env dan memakai
// lib/playly.ts (modul server); berkas yang satunya ikut terbundel ke browser.
//
// ATURAN ENV (sama dengan PLAYLY_EMBED_HOSTS di lib/playly.ts): env hanya
// MENAMBAH ke daftar bawaan, tidak menggantinya. Pisahkan dengan koma.
//   PLAYLY_UNDUHAN_DOMAIN_GOOGLE   PLAYLY_UNDUHAN_DOMAIN_TELEGRAM
//   PLAYLY_UNDUHAN_DOMAIN_CAST     PLAYLY_UNDUHAN_DOMAIN_MEGA
// Domain dicocokkan PERSIS (lihat periksaUrlUnduhan) — subdomain yang mau
// diizinkan wajib ditulis satu-satu.
// -------------------------------------------------------------------------
import { parseAllowedHosts } from "./playly";
import { PROVIDER_UNDUHAN, type DomainUnduhan, type ProviderUnduhan } from "./playly-unduhan";

/**
 * Bawaan yang diketahui pasti dipakai layanan resminya.
 *
 * Cast SENGAJA kosong: domain layanannya belum diketahui (2026-10-05), dan
 * menebaknya = membuka pintu ke domain yang belum tentu milik mereka. Selama
 * kosong, link Cast DITOLAK dengan alasan yang menyebut env-nya.
 */
export const DOMAIN_UNDUHAN_BAWAAN: Readonly<Record<ProviderUnduhan, readonly string[]>> = {
  google: ["drive.google.com", "drive.usercontent.google.com"],
  telegram: ["t.me", "telegram.me"],
  cast: [],
  mega: ["mega.nz"],
};

export function bacaDomainUnduhan(
  env: Record<string, string | undefined> = process.env,
): DomainUnduhan {
  const hasil = {} as DomainUnduhan;
  for (const p of PROVIDER_UNDUHAN) {
    const tambahan = parseAllowedHosts(env[`PLAYLY_UNDUHAN_DOMAIN_${p.toUpperCase()}`]);
    hasil[p] = Array.from(new Set([...DOMAIN_UNDUHAN_BAWAAN[p], ...tambahan]));
  }
  return hasil;
}
