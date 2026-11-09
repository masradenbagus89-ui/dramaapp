// Helper jaringan khusus admin: panggil endpoint "scan" & "auto-hardlink" yang
// berkomunikasi dengan PC backup. Dipisah dari app/admin/page.tsx supaya logika
// jaringan terpusat & komponen halaman lebih ringkas. Fungsi-fungsi ini HANYA
// memanggil API lalu mengembalikan hasilnya (tidak menyentuh state komponen);
// pemanggil (onScan di page.tsx) yang mengatur tampilan/pesan. Perilaku sama
// persis seperti versi sebelumnya yang menyatu di page.tsx.

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
  adminEmail: string,
): Promise<ScanResponse> {
  const res = await fetch(`/api/admin/scan?id=${encodeURIComponent(id)}`, {
    headers: { "x-admin-email": adminEmail },
  });
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
  adminEmail: string,
  ep = 1,
): Promise<DurasiResponse> {
  const res = await fetch(
    `/api/admin/durasi?id=${encodeURIComponent(id)}&ep=${ep}`,
    { headers: { "x-admin-email": adminEmail } },
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
  adminEmail: string,
): Promise<SimpanDurasiResponse> {
  const res = await fetch("/api/admin/durasi", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-email": adminEmail },
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
  adminEmail: string,
): Promise<HardlinkResponse> {
  const res = await fetch(`/api/admin/hardlink`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-email": adminEmail,
    },
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
