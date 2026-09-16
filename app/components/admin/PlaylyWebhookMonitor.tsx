"use client";

// Daftar video yang DIDORONG Playly lewat POST /api/webhooks/playly.
//
// Bedanya dengan PlaylyVisibilityManager (yang di halaman "Video Playly"):
// komponen itu menampilkan katalog yang KITA JEMPUT ke Playly tiap 300 detik;
// yang ini menampilkan baris yang PLAYLY KIRIM sendiri. Sumbernya beda, jadi
// daftarnya dipisah — menggabungkan keduanya di satu layar membuat admin tidak
// bisa tahu jalur mana yang sedang bermasalah saat sebuah video tidak muncul.
//
// Tombol sembunyikan memakai endpoint yang SUDAH ADA (/api/admin/playly/hidden)
// — bukan endpoint baru. Daftar sembunyi memang satu untuk kedua sumber, karena
// ruang id-nya sama (dua-duanya id video Playly); aturan itu ditegakkan di
// lib/playly-gabungan.ts dan dijaga tests/playly-gabungan.test.ts.
import { useState } from "react";
import { Eye, EyeOff, Loader2, Inbox } from "lucide-react";
import type { WebhookVideoTampil } from "@/lib/playly-webhook-status";

type Pesan = { jenis: "ok" | "gagal"; teks: string };

export default function PlaylyWebhookMonitor({
  videos,
  initialHidden,
}: {
  /** Seluruh baris webhook, termasuk yang sudah ditarik Playly. Terbaru di depan. */
  videos: WebhookVideoTampil[];
  /** Id video yang sedang disembunyikan admin — satu daftar untuk kedua sumber. */
  initialHidden: string[];
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set(initialHidden));
  const [sedangProses, setSedangProses] = useState<string | null>(null);
  const [pesan, setPesan] = useState<Pesan | null>(null);

  const ubah = async (videoId: string, jadikanTersembunyi: boolean) => {
    setSedangProses(videoId);
    setPesan(null);
    try {
      const res = await fetch("/api/admin/playly/hidden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, hidden: jadikanTersembunyi }),
      });
      const data = (await res.json().catch(() => null)) as {
        hidden?: string[];
        error?: string;
      } | null;
      if (!res.ok) {
        setPesan({
          jenis: "gagal",
          teks: data?.error ?? "Gagal menyimpan perubahan.",
        });
        return;
      }
      // Daftar terbaru datang dari server dan dipakai apa adanya — layar tidak
      // menebak hasilnya sendiri, jadi tetap benar walau ada admin lain yang
      // mengubah daftar yang sama di saat bersamaan.
      setHidden(new Set(data?.hidden ?? []));
      setPesan({
        jenis: "ok",
        teks: jadikanTersembunyi
          ? "Video disembunyikan dari halaman penonton."
          : "Video ditampilkan lagi.",
      });
    } catch {
      setPesan({
        jenis: "gagal",
        teks: "Tidak bisa menghubungi server. Cek koneksi internet lalu coba lagi.",
      });
    } finally {
      setSedangProses(null);
    }
  };

  if (videos.length === 0) {
    // Sengaja TIDAK menulis "belum ada video" saja. Kalimat itu membuat admin
    // menunggu; keadaan sebenarnya diterangkan kartu status di atas komponen
    // ini, dan di sini cukup ditegaskan bahwa kosong itu bukan kerusakan.
    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-base font-semibold text-white">
          Video yang dikirim Playly
        </h2>
        <p className="mt-4 flex items-start gap-2 rounded-lg border border-zinc-700 bg-zinc-800/40 p-3 text-sm text-zinc-300">
          <Inbox className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Belum ada satu pun notifikasi yang masuk. Daftar ini terisi{" "}
            <strong className="text-zinc-100">otomatis</strong> begitu Playly
            mengirim notifikasi video baru — tidak ada yang perlu ditambahkan
            dengan tangan di sini.
          </span>
        </p>
      </section>
    );
  }

  const jumlahTampil = videos.filter(
    (v) => v.status === "published" && !hidden.has(v.videoId),
  ).length;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h2 className="text-base font-semibold text-white">
        Video yang dikirim Playly
      </h2>
      <p className="mt-1 text-sm text-zinc-400">
        {jumlahTampil} dari {videos.length} video tampil di halaman{" "}
        <strong className="text-zinc-200">Video Playly</strong>. Video masuk ke
        daftar ini sendiri; yang bisa diatur di sini hanya menyembunyikannya dari
        penonton.
      </p>

      {pesan && (
        <p
          role="status"
          className={`mt-3 text-sm ${
            pesan.jenis === "ok" ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {pesan.teks}
        </p>
      )}

      <ul className="mt-4 divide-y divide-zinc-800">
        {videos.map((v) => {
          const tersembunyi = hidden.has(v.videoId);
          const ditarik = v.status === "unpublished";
          const proses = sedangProses === v.videoId;
          // Status bisa menumpuk (ditarik Playly DAN disembunyikan admin), jadi
          // catatannya dirangkai dari daftar — rantai ternary akan menutupi
          // salah satunya dan admin kehilangan separuh alasan.
          const catatan = [
            `diterima ${v.diterimaLabel}`,
            v.creator || null,
            v.durasiLabel,
            tersembunyi ? "disembunyikan admin" : null,
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <li
              key={v.videoId}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={`truncate text-sm font-medium ${
                      tersembunyi || ditarik
                        ? "text-zinc-500 line-through"
                        : "text-zinc-100"
                    }`}
                  >
                    {v.title}
                  </p>
                  {ditarik && (
                    <span className="inline-flex shrink-0 items-center rounded-full border border-zinc-600 bg-zinc-800 px-2 py-0.5 text-[11px] font-semibold text-zinc-400">
                      ditarik Playly
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-zinc-500">{catatan}</p>
              </div>
              {/* Tombol tetap aktif untuk video yang ditarik: kalau Playly
                  menerbitkannya lagi nanti, keputusan sembunyi yang sudah dibuat
                  admin tetap berlaku — tak perlu diingat dan diulang. */}
              <button
                type="button"
                onClick={() => ubah(v.videoId, !tersembunyi)}
                disabled={proses}
                className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition disabled:opacity-50 ${
                  tersembunyi
                    ? "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                    : "border-amber-500/50 text-amber-300 hover:border-amber-400"
                }`}
              >
                {proses ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : tersembunyi ? (
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {tersembunyi ? "Tampilkan" : "Sembunyikan"}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
