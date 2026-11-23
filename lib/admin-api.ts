// Helper jaringan khusus admin: panggil endpoint "scan" & "auto-hardlink" yang
// berkomunikasi dengan PC backup. Dipisah dari app/admin/page.tsx supaya logika
// jaringan terpusat & komponen halaman lebih ringkas. Fungsi-fungsi ini HANYA
// memanggil API lalu mengembalikan hasilnya (tidak menyentuh state komponen);
// pemanggil (onScan di page.tsx) yang mengatur tampilan/pesan. Perilaku sama
// persis seperti versi sebelumnya yang menyatu di page.tsx.
//
// ⛔ JANGAN kirim identitas admin dari sini (dulu: header `x-admin-email`).
// Dihapus audit keamanan 2026-11-14 (SEC-004) sesudah diverifikasi NOL kode
// yang membacanya: otorisasi admin sepenuhnya dari cookie HttpOnly bertanda
// tangan HMAC (lib/session.ts — `isAdminRequest`), dan cookie itu ikut
// terkirim sendiri oleh browser. Header tadi tinggal dua akibat, keduanya
// buruk: alamat email admin ikut melintas di tiap permintaan (bisa mendarat di
// log proxy/hosting), dan pembaca kode berikutnya mengira jalur ini memakai
// auth berbasis header — padahal header kiriman klien memang tak bisa
// dipercaya. Migrasinya sendiri sudah dicatat tuntas di HANDOFF.md:7138;
// yang tertinggal hanya pembersihan ini.

export type ScanResult = {
  count: number;
  min: number;
  max: number;
  missing: number[];
  folderUrl: string;
};

export type ScanResponse =
  | { ok: true; result: ScanResult }
  | { ok: false; status: number; error: string };

export type HardlinkResponse = { ok: boolean; message?: string; error?: string };

/** Scan folder drama di PC backup: hitung jumlah episode (file N.mp4). */
export async function scanDrama(
  id: string,
): Promise<ScanResponse> {
  const res = await fetch(`/api/admin/scan?id=${encodeURIComponent(id)}`);
  const data = await res.json();
  if (!res.ok || !data.ok) {
    return {
      ok: false,
      status: res.status,
      error: data.error ?? `HTTP ${res.status}`,
    };
  }
  return {
    ok: true,
    result: {
      count: data.count,
      min: data.min,
      max: data.max,
      missing: data.missing ?? [],
      folderUrl: data.folderUrl,
    },
  };
}

export type DurasiResponse =
  | { ok: true; teks: string; detik: number; ep: number }
  | { ok: false; error: string };

/**
 * Ukur durasi satu drama dari berkas videonya di PC backup (owner 2026-11-09).
 *
 * Yang dipulangkan sudah berbentuk kolom Durasi ("1.47"), siap ditaruh di form.
 * Endpoint-nya MEMBACA saja — tidak menyimpan apa pun; penyimpanan tetap lewat
 * tombol Simpan biasa supaya angkanya dilihat manusia dulu.
 */
export async function ukurDurasiDrama(
  id: string,
  ep = 1,
): Promise<DurasiResponse> {
  const res = await fetch(
    `/api/admin/durasi?id=${encodeURIComponent(id)}&ep=${ep}`,
  );
  const data = await res.json();
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error ?? `HTTP ${res.status}` };
  }
  return { ok: true, teks: data.teks, detik: data.detik, ep: data.ep };
}

export type SimpanDurasiResponse =
  | { ok: true; tergambar: string }
  | { ok: false; error: string };

/**
 * Simpan HANYA kolom durasi satu drama (owner 2026-11-09, pengisian massal).
 *
 * Sengaja TIDAK lewat endpoint simpan drama biasa: yang itu menerima seluruh
 * data drama, jadi memakainya untuk satu kolom berarti mengirim ulang isi
 * lengkap tiap drama — satu field terlewat = data benar terhapus diam-diam.
 */
export async function simpanDurasiDrama(
  id: string,
  runtime: string,
): Promise<SimpanDurasiResponse> {
  const res = await fetch("/api/admin/durasi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, runtime }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error ?? `HTTP ${res.status}` };
  }
  return { ok: true, tergambar: data.tergambar };
}

/** Minta agent PC backup bikin hardlink (rename file mentah -> 1.mp4 2.mp4 ...). */
export async function hardlinkDrama(
  id: string,
): Promise<HardlinkResponse> {
  const res = await fetch(`/api/admin/hardlink`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dramaId: id }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    return {
      ok: false,
      error:
        data.error ??
        `Hardlink gagal (HTTP ${res.status}). Pastikan agent jalan di PC backup.`,
    };
  }
  return { ok: true, message: data.message };
}
