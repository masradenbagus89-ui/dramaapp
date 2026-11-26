// Penyimpanan Live Chat — KHUSUS SERVER. Peta dokumen & alasan pemisahannya
// ada di kepala lib/live-chat.ts.
import { createHash, randomUUID } from "node:crypto";
import { ambilDokumen, daftarDokumen, simpanDokumen } from "./kumpulan-dokumen";
import {
  adaPesanBaru,
  idUtasSah,
  type PengirimChat,
  type PesanChat,
  type UtasChat,
} from "./live-chat";

type TandaBaca = { utasId: string; sampai: string };

/** Pesan per utas yang dimuat. Percakapan bantuan jarang sepanjang ini. */
const MAKS_PESAN_DIMUAT = 200;
const MAKS_UTAS_DIMUAT = 300;
const PANJANG_CUPLIKAN = 120;

/** ID utas = 32 hex pertama SHA-256 email (huruf kecil). Stabil & aman untuk kunci. */
export function idUtas(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 32);
}

const kunciUtas = (utasId: string) => `chat-utas:${utasId}`;
const awalanPesan = (utasId: string) => `chat-pesan:${utasId}:`;
const kunciBaca = (pembaca: PengirimChat, utasId: string) => `chat-baca:${pembaca}:${utasId}`;

export async function ambilUtas(utasId: string): Promise<UtasChat | null> {
  if (!idUtasSah(utasId)) return null;
  return ambilDokumen<UtasChat>(kunciUtas(utasId));
}

/** Pesan satu utas, urut lama -> baru. */
export async function daftarPesan(utas: Pick<UtasChat, "id" | "email">): Promise<PesanChat[]> {
  const terbaruDulu = await daftarDokumen<PesanChat>(awalanPesan(utas.id), {
    urutTurunBerdasar: "dikirimPada",
    batas: MAKS_PESAN_DIMUAT,
  });
  // Saring berlapis: kunci sudah memisahkan utas, tapi pesan yang emailnya
  // tak cocok tetap dibuang — kebocoran percakapan tak boleh bergantung pada
  // satu pagar saja.
  return terbaruDulu.filter((p) => p.email === utas.email).reverse();
}

export type KirimPesan = {
  /** Email member pemilik utas. */
  emailMember: string;
  namaMember: string;
  dari: PengirimChat;
  namaPengirim: string;
  teks: string;
};

/** Tulis pesan + perbarui ringkasan utas. */
export async function kirimPesan(
  isian: KirimPesan,
  sekarang: Date = new Date(),
): Promise<PesanChat> {
  const email = isian.emailMember.trim().toLowerCase();
  const utasId = idUtas(email);
  const waktu = sekarang.toISOString();
  const pesan: PesanChat = {
    id: randomUUID(),
    utasId,
    email,
    dari: isian.dari,
    namaPengirim: isian.namaPengirim,
    teks: isian.teks,
    dikirimPada: waktu,
  };
  // Pesan ditulis DULU: kalau ringkasan gagal, pesannya tetap tersimpan dan
  // ringkasan terbarui di pesan berikutnya — kebalikannya meninggalkan
  // ringkasan yang menunjuk pesan yang tak pernah ada.
  await simpanDokumen(`${awalanPesan(utasId)}${pesan.id}`, pesan);

  const lama = await ambilDokumen<UtasChat>(kunciUtas(utasId));
  const utas: UtasChat = {
    id: utasId,
    email,
    namaMember: isian.dari === "member" ? isian.namaMember : (lama?.namaMember ?? isian.namaMember),
    terakhirTeks: isian.teks.slice(0, PANJANG_CUPLIKAN),
    terakhirDari: isian.dari,
    terakhirPada: waktu,
    dibuatPada: lama?.dibuatPada ?? waktu,
  };
  await simpanDokumen(kunciUtas(utasId), utas);
  // Mengirim = sudah membaca semua pesan sebelumnya di utas ini.
  await tandaiDibaca(isian.dari, utasId, sekarang);
  return pesan;
}

export async function tandaiDibaca(
  pembaca: PengirimChat,
  utasId: string,
  sekarang: Date = new Date(),
): Promise<void> {
  if (!idUtasSah(utasId)) return;
  await simpanDokumen<TandaBaca>(kunciBaca(pembaca, utasId), {
    utasId,
    sampai: sekarang.toISOString(),
  });
}

export async function dibacaSampai(
  pembaca: PengirimChat,
  utasId: string,
): Promise<string | null> {
  if (!idUtasSah(utasId)) return null;
  return (await ambilDokumen<TandaBaca>(kunciBaca(pembaca, utasId)))?.sampai ?? null;
}

export type UtasUntukAdmin = UtasChat & { belumDibaca: boolean };

/** Kotak masuk admin: semua utas, terbaru dulu, dengan tanda belum dibaca. */
export async function daftarUtasAdmin(): Promise<UtasUntukAdmin[]> {
  const [semua, tanda] = await Promise.all([
    daftarDokumen<UtasChat>("chat-utas:", { urutTurunBerdasar: "terakhirPada", batas: MAKS_UTAS_DIMUAT }),
    // Dua kueri sekaligus, bukan satu kueri tanda-baca per utas (N+1).
    daftarDokumen<TandaBaca>("chat-baca:admin:", {
      urutTurunBerdasar: "sampai",
      batas: MAKS_UTAS_DIMUAT,
    }),
  ]);
  const bacaPerUtas = new Map(tanda.map((t) => [t.utasId, t.sampai]));
  return semua.map((u) => ({
    ...u,
    belumDibaca: adaPesanBaru(u, "admin", bacaPerUtas.get(u.id) ?? null),
  }));
}
