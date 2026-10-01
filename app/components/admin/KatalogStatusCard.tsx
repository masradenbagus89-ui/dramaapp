"use client";

// Kartu status katalog drama di Dashboard admin.
//
// KENAPA ADA (2026-10-01): situs punya pengaman yang membuat halaman publik
// diam-diam beralih ke berkas cadangan saat database tak terjangkau
// (lib/dramas.ts `getAllDramasCachedSafe`). Pengaman itu benar — ia menahan
// situs supaya tidak mati total. Tapi peralihannya tak meninggalkan jejak yang
// bisa dilihat: hari itu database Supabase mati berjam-jam, /katalog tetap
// tampil "sehat" dengan 42 judul dari cadangan berumur 20 hari, dan tak ada
// satu pun tanda di layar. Kartu ini matanya.
//
// Bersaudara dengan PlaylyStatusCard dan sengaja dibuat semirip mungkin
// (Card, titik warna, tombol Cek ulang, jam cek): admin cukup belajar satu pola
// untuk membaca keduanya.
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Database, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ringkasStatusKatalog,
  type RingkasanKatalog,
  type StatusKatalog,
} from "@/lib/katalog-status";

const GAYA: Record<StatusKatalog, { titik: string; teks: string; label: string }> = {
  database: {
    titik: "bg-emerald-400",
    teks: "text-emerald-300",
    label: "Dari database",
  },
  cadangan: {
    titik: "bg-rose-400",
    teks: "text-rose-300",
    label: "Memakai cadangan — isinya bisa basi",
  },
  kosong: {
    titik: "bg-rose-400",
    teks: "text-rose-300",
    label: "Katalog kosong",
  },
  "tak-diketahui": {
    titik: "bg-zinc-500",
    teks: "text-zinc-300",
    label: "Belum bisa dipastikan",
  },
};

/** Status yang perlu admin bertindak — dipakai memilih ikon peringatan. */
const PERLU_TINDAKAN: ReadonlySet<StatusKatalog> = new Set<StatusKatalog>([
  "cadangan",
  "kosong",
]);

/**
 * Jalur CADANGAN: simpulkan keadaan katalog dari /api/dramas.
 *
 * KENAPA PERLU: endpoint admin di atas dijaga `isAdminRequest`, dan penjaga itu
 * memastikan "email masih terdaftar admin" lewat pembacaan DATABASE
 * (lib/store.ts:116, tanpa penangkap). Artinya tepat ketika database mati —
 * satu-satunya saat kartu ini benar-benar dibutuhkan — penjaganya ikut gagal
 * dan endpoint membalas 401. Tanpa jalur ini kartu cuma bisa angkat tangan.
 *
 * KENAPA /api/dramas yang dipakai: ia SUDAH publik sejak lama dan sudah
 * memulangkan 500 persis saat database tak menjawab (terukur di produksi
 * 2026-10-01, bersamaan dengan /api/likes dan /api/ads). Jadi tak ada satu pun
 * data baru yang dibuka dan tak ada pengaman yang dilonggarkan — keputusan
 * owner 2026-10-01, memilih ini di atas usul melonggarkan cek admin.
 *
 * BATAS JUJUR: jalur ini tahu database hidup atau mati, tapi TIDAK tahu berapa
 * judul yang sedang dilihat penonton — karena itu `jumlahTerukur: false`,
 * supaya kartunya menahan diri menyebut angka alih-alih mengarang.
 */
async function tanyaLewatEndpointPublik(): Promise<RingkasanKatalog> {
  try {
    const res = await fetch("/api/dramas", { cache: "no-store" });
    if (!res.ok) {
      return ringkasStatusKatalog({
        databaseHidup: false,
        jumlahTampil: 0,
        jumlahTerukur: false,
      });
    }
    // Sampai di sini database menjawab. Panjang daftarnya sah dipakai sebagai
    // jumlah yang dilihat penonton: saat database sehat, halaman publik membaca
    // sumber yang sama.
    const data = (await res.json().catch(() => null)) as unknown;
    return ringkasStatusKatalog({
      databaseHidup: true,
      jumlahTampil: Array.isArray(data) ? data.length : 0,
    });
  } catch {
    // Gagal-AMAN: server kita sendiri tak terjangkau -> laporkan BELUM PASTI,
    // jangan menuduh database mati (itu mengirim admin memperbaiki hal yang
    // mungkin tidak rusak), dan jangan menampilkan status lama yang bisa basi.
    return ringkasStatusKatalog({ databaseHidup: null, jumlahTampil: 0 });
  }
}

export default function KatalogStatusCard() {
  const [hasil, setHasil] = useState<RingkasanKatalog | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [jamCek, setJamCek] = useState("");

  const cek = useCallback(async () => {
    setMemuat(true);
    try {
      const res = await fetch("/api/admin/status-katalog", { cache: "no-store" });
      // Balasan bisa saja bukan JSON (mis. halaman error proxy) — jangan sampai
      // itu melempar dan menghapus seluruh kartu dari layar.
      const data = (await res.json().catch(() => null)) as
        | (RingkasanKatalog & { ok?: boolean })
        | null;
      if (res.ok && data?.ok === true) {
        setHasil({
          status: data.status,
          jumlahTampil: data.jumlahTampil,
          pesan: data.pesan,
        });
      } else {
        setHasil(await tanyaLewatEndpointPublik());
      }
    } catch {
      setHasil(await tanyaLewatEndpointPublik());
    } finally {
      setJamCek(new Date().toLocaleTimeString("id-ID"));
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    void cek();
  }, [cek]);

  const gaya = hasil ? GAYA[hasil.status] : null;

  return (
    <Card className="mt-3 rounded-2xl border-zinc-800 bg-zinc-900/40">
      <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
              <Database className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                Katalog drama — sumber data
              </p>

              {memuat && !hasil ? (
                <p className="mt-1 text-sm text-zinc-400">Mengecek katalog…</p>
              ) : (
                hasil &&
                gaya && (
                  <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
                    <span
                      className={`inline-block h-2 w-2 shrink-0 rounded-full ${gaya.titik}`}
                      aria-hidden="true"
                    />
                    <span className={gaya.teks}>
                      {gaya.label}
                      {hasil.status === "database" &&
                        hasil.jumlahTampil > 0 &&
                        ` — ${hasil.jumlahTampil} judul`}
                    </span>
                  </p>
                )
              )}
            </div>
          </div>

          {hasil?.pesan && (
            <p className="mt-2 flex items-start gap-2 text-xs text-zinc-400">
              {PERLU_TINDAKAN.has(hasil.status) && (
                <AlertTriangle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400"
                  aria-hidden="true"
                />
              )}
              <span>{hasil.pesan}</span>
            </p>
          )}

          {jamCek && (
            <p className="mt-2 text-xs text-zinc-600">Terakhir dicek {jamCek}</p>
          )}
        </div>

        <Button
          onClick={() => void cek()}
          disabled={memuat}
          variant="outline"
          className="min-h-9 shrink-0 rounded-full px-4 text-xs font-semibold"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${memuat ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Cek ulang
        </Button>
      </CardContent>
    </Card>
  );
}
