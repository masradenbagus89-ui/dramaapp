// Konfigurasi ekonomi koin — dipakai di client (UI) maupun server (API).
// Tidak ada dependency node/react di sini, jadi aman diimpor dari mana saja.
//
// Model ala Melolo/DramaBox: beberapa episode awal GRATIS, sisanya dibuka
// dengan koin. Koin didapat dari: nonton iklan (rewarded), check-in harian,
// atau beli paket (top-up via payment gateway — lihat catatan di /api/coins/topup).

/**
 * SAKLAR UTAMA MONETISASI.
 * true  = toko koin tampil & paywall aktif — TAPI hanya untuk drama yang
 *         ditandai `premium`. Drama lama (tanpa flag) tetap gratis.
 * false = semua episode gratis, toko koin disembunyikan total.
 */
export const PAYWALL_ENABLED = true;

/** Episode 1..FREE_EPISODES gratis tanpa koin (berlaku saat PAYWALL_ENABLED). */
export const FREE_EPISODES = 3;

/** Biaya membuka 1 episode terkunci. */
export const COIN_PER_EPISODE = 8;

/** Koin yang didapat tiap selesai menonton 1 iklan. */
export const REWARD_PER_AD = 4;

/** Maksimum iklan berhadiah per hari (anti-abuse). */
export const DAILY_AD_LIMIT = 12;

/** Bonus check-in harian (sekali per hari). */
export const CHECKIN_BONUS = 15;

export type CoinPack = {
  id: string;
  coins: number;
  priceIDR: number;
  badge?: string;
};

/** Paket top-up. Harga kecil ramah QRIS/e-wallet Indonesia. */
export const COIN_PACKS: CoinPack[] = [
  { id: "starter", coins: 60, priceIDR: 5000 },
  { id: "popular", coins: 130, priceIDR: 10000, badge: "+8% bonus" },
  { id: "value", coins: 350, priceIDR: 25000, badge: "+17% bonus" },
  { id: "best", coins: 750, priceIDR: 50000, badge: "Paling hemat" },
];

export function getPack(id: string): CoinPack | undefined {
  return COIN_PACKS.find((p) => p.id === id);
}

export function isFreeEpisode(ep: number): boolean {
  return ep <= FREE_EPISODES;
}

/** Token unik untuk 1 episode milik 1 user di penyimpanan unlock. */
export function unlockToken(dramaId: string, ep: number): string {
  return `${dramaId}:${ep}`;
}

/** Format harga Rupiah, mis. 10000 -> "Rp10.000". */
export function formatIDR(n: number): string {
  return "Rp" + n.toLocaleString("id-ID");
}
