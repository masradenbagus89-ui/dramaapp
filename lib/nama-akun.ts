// Nama tampilan sebuah akun, dicari di SERVER dari email sesi.
//
// Dipakai fitur yang menyimpan "nama member" (Laporan Video, Live Chat).
// Nama dari body permintaan tidak dipercaya: label yang tersimpan permanen dan
// dibaca admin tak boleh bisa diisi sesukanya ("Admin Layarindo", dsb).
import { getAdmins, getViewerAccount } from "@/lib/store";

export async function namaAkun(email: string, isAdmin: boolean): Promise<string> {
  const e = email.trim().toLowerCase();
  const nama = isAdmin
    ? (await getAdmins()).admins.find((a) => a.email.trim().toLowerCase() === e)?.name
    : (await getViewerAccount(e))?.name;
  return nama?.trim() || e.split("@")[0];
}
