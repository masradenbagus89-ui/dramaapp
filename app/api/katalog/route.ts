import { NextResponse } from "next/server";
import { getAllDramasCachedSafe } from "@/lib/dramas";

/**
 * Katalog drama ber-cache untuk halaman PENONTON (riwayat tonton, daftar saya).
 *
 * KENAPA TIDAK MEMAKAI /api/dramas: endpoint itu SENGAJA tanpa cache. Kartu
 * status katalog di Dashboard admin (KatalogStatusCard) dan robot pemantau
 * database membacanya untuk tahu apakah database hidup — jawaban ber-cache akan
 * melaporkan "sehat" padahal database mati.
 *
 * Isinya sama persis dengan yang sudah tampil di /katalog (data publik), jadi
 * aman disimpan di cache bersama. Saat database mati, jatuh ke berkas cadangan
 * seperti halaman publik lain — riwayat tonton tetap tergambar.
 *
 * Simpan di panel admin membuang cache ini seketika (lib/cache-publik.ts).
 */

// Samakan dengan CATALOG_TTL_SECONDS (lib/dramas.ts). Next.js mensyaratkan
// angka literal di sini, bukan konstanta impor.
export const revalidate = 60;

export async function GET() {
  return NextResponse.json(await getAllDramasCachedSafe());
}
