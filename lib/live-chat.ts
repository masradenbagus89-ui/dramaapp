// -------------------------------------------------------------------------
// Live Chat member <-> admin — tipe & aturan MURNI (aman diimpor browser).
// Penyimpanan + idUtas (butuh node:crypto) ada di lib/live-chat-simpan.ts.
// Satu member = satu "utas" (percakapan).
//
// Dokumen app_data (lib/kumpulan-dokumen.ts):
//   chat-utas:<utasId>               ringkasan utas (pesan terakhir) untuk kotak masuk admin
//   chat-pesan:<utasId>:<uuid>       satu pesan
//   chat-baca:admin:<utasId>         kapan admin terakhir membaca utas ini
//   chat-baca:member:<utasId>        kapan member terakhir membaca utas ini
//
// Tanda-baca sengaja dokumen TERPISAH dari ringkasan: ringkasan ditulis
// pengirim, tanda-baca ditulis pembaca — dijadikan satu, "admin menandai
// dibaca" bisa menimpa ringkasan berisi pesan member yang baru masuk.
//
// 🔒 utasId diturunkan dari email SESI di server (hash), tak pernah diterima
// dari member — member tak bisa memilih membuka utas orang lain.
// -------------------------------------------------------------------------
import { bersihkanTeks, type HasilValidasi } from "./laporan-video";

export type PengirimChat = "member" | "admin";

export type PesanChat = {
  id: string;
  utasId: string;
  /** Email member pemilik utas (BUKAN pengirim) — dipakai saring berlapis. */
  email: string;
  dari: PengirimChat;
  namaPengirim: string;
  teks: string;
  dikirimPada: string;
};

export type UtasChat = {
  id: string;
  email: string;
  namaMember: string;
  terakhirTeks: string;
  terakhirDari: PengirimChat;
  terakhirPada: string;
  dibuatPada: string;
};


export const MAKS_PANJANG_PESAN = 1000;

const POLA_UTAS = /^[0-9a-f]{32}$/;

export function idUtasSah(id: unknown): id is string {
  return typeof id === "string" && POLA_UTAS.test(id);
}

export function validasiTeksChat(nilai: unknown): HasilValidasi<string> {
  const teks = bersihkanTeks(nilai);
  if (!teks) return { ok: false, pesan: "Pesan masih kosong." };
  if (teks.length > MAKS_PANJANG_PESAN) {
    return { ok: false, pesan: `Pesan maksimal ${MAKS_PANJANG_PESAN} karakter.` };
  }
  return { ok: true, data: teks };
}

/**
 * Ada pesan dari PIHAK LAIN yang lebih baru dari tanda-baca `pembaca`?
 * Pesan sendiri tak pernah dihitung "baru" untuk pengirimnya.
 */
export function adaPesanBaru(
  utas: Pick<UtasChat, "terakhirDari" | "terakhirPada"> | null,
  pembaca: PengirimChat,
  dibacaSampai: string | null,
): boolean {
  if (!utas || utas.terakhirDari === pembaca) return false;
  return !dibacaSampai || utas.terakhirPada > dibacaSampai;
}
