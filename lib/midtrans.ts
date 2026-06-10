// Integrasi Midtrans (Snap) — tanpa dependency, pakai REST API + node:crypto.
//
// Env var yang dibutuhkan (di Vercel):
//   MIDTRANS_SERVER_KEY      : Server Key dari dashboard Midtrans (RAHASIA)
//   MIDTRANS_CLIENT_KEY      : Client Key (dipakai snap.js di browser; tidak rahasia)
//   MIDTRANS_IS_PRODUCTION   : "1" untuk akun production, kosong/0 untuk sandbox
//
// Daftar gratis di https://midtrans.com → ambil 2 key di Settings > Access Keys.
import crypto from "node:crypto";

export function midtransConfig() {
  return {
    serverKey: process.env.MIDTRANS_SERVER_KEY ?? "",
    clientKey: process.env.MIDTRANS_CLIENT_KEY ?? "",
    isProduction:
      process.env.MIDTRANS_IS_PRODUCTION === "1" ||
      process.env.MIDTRANS_IS_PRODUCTION === "true",
  };
}

/** True kalau Midtrans siap dipakai (server key ada). */
export function midtransConfigured(): boolean {
  return Boolean(process.env.MIDTRANS_SERVER_KEY);
}

/** URL snap.js untuk dimuat di browser (beda sandbox vs production). */
export function snapJsUrl(isProduction: boolean): string {
  return isProduction
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";
}

function snapApiUrl(isProduction: boolean): string {
  return isProduction
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";
}

/** Buat transaksi Snap; balikan token untuk snap.pay() di browser. */
export async function createSnapTransaction(params: {
  orderId: string;
  grossAmount: number; // Rupiah, bilangan bulat
  email: string;
  itemName: string;
}): Promise<{ token: string; redirectUrl: string }> {
  const { serverKey, isProduction } = midtransConfig();
  if (!serverKey) throw new Error("MIDTRANS_SERVER_KEY belum di-set.");

  const auth = Buffer.from(`${serverKey}:`).toString("base64");
  const payload = {
    transaction_details: {
      order_id: params.orderId,
      gross_amount: Math.round(params.grossAmount),
    },
    item_details: [
      {
        id: "coins",
        price: Math.round(params.grossAmount),
        quantity: 1,
        name: params.itemName.slice(0, 50),
      },
    ],
    customer_details: { email: params.email },
    credit_card: { secure: true },
  };

  const res = await fetch(snapApiUrl(isProduction), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Midtrans error ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { token: string; redirect_url: string };
  return { token: data.token, redirectUrl: data.redirect_url };
}

/**
 * Verifikasi signature notifikasi (webhook) Midtrans:
 *   sha512(order_id + status_code + gross_amount + server_key)
 * Wajib dicek sebelum mengkredit koin — jangan percaya body mentah.
 */
export function verifyNotificationSignature(n: {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
}): boolean {
  const { serverKey } = midtransConfig();
  if (!serverKey || !n.signature_key) return false;
  const expected = crypto
    .createHash("sha512")
    .update(
      String(n.order_id) +
        String(n.status_code) +
        String(n.gross_amount) +
        serverKey,
    )
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(n.signature_key);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
