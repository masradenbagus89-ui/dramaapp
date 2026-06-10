// Pembungkus sisi-klien untuk API koin. Mengirim email user (dari localStorage
// auth) sebagai identitas viewer; admin dikenali via cookie sesi di server.

import { readUser } from "@/lib/auth";

export const WALLET_EVENT = "dramaku:wallet-changed";

function email(): string {
  return readUser()?.email ?? "";
}

/** Beritahu komponen lain (mis. badge saldo) agar refresh. */
export function announceWalletChange(balance?: number): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(WALLET_EVENT, { detail: { balance } }),
  );
}

export type WalletStatus = {
  loggedIn: boolean;
  isAdmin: boolean;
  balance: number;
  unlockedEps: number[];
  config: {
    freeEpisodes: number;
    coinPerEpisode: number;
    rewardPerAd: number;
    checkinBonus: number;
    dailyAdLimit: number;
  };
};

export async function fetchWallet(dramaId?: string): Promise<WalletStatus> {
  const qs = new URLSearchParams();
  const e = email();
  if (e) qs.set("email", e);
  if (dramaId) qs.set("dramaId", dramaId);
  const res = await fetch(`/api/coins?${qs.toString()}`, { cache: "no-store" });
  return res.json();
}

type MutationResult = {
  ok?: boolean;
  error?: string;
  message?: string;
  balance?: number;
  reward?: number;
  bonus?: number;
  coins?: number;
  demo?: boolean;
  remaining?: number;
  needed?: number;
  already?: boolean;
  // Midtrans (top-up)
  mode?: "midtrans" | "demo";
  token?: string;
  clientKey?: string;
  snapUrl?: string;
  orderId?: string;
};

async function post(path: string, extra: Record<string, unknown> = {}) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email(), ...extra }),
  });
  const data = (await res.json()) as MutationResult;
  if (typeof data.balance === "number") announceWalletChange(data.balance);
  return { status: res.status, data };
}

export function unlockEpisode(dramaId: string, ep: number) {
  return post("/api/coins/unlock", { dramaId, ep });
}
export function claimReward() {
  return post("/api/coins/reward");
}
export function claimCheckin() {
  return post("/api/coins/checkin");
}
export function topup(packId: string) {
  return post("/api/coins/topup", { packId });
}
