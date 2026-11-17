import {
  getPlaylyHiddenIds,
  getPlaylyWebhookVideos,
  type PlaylyWebhookVideo,
} from "@/lib/store";
import { ringkasWebhookPlayly } from "@/lib/playly-webhook-status";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";

/**
 * Kartu "jalur hidup atau tidak".
 *
 * Ini BUKAN webhook pembayaran. Layar ini hanya membaca notifikasi video
 * Playly yang sudah tersimpan, lalu menampilkan keadaannya. Tidak menandai
 * apa pun lunas dan tidak menerima panggilan dari luar.
 */
export default async function IsiStatusWebhook({
  kunciTerpasang,
}: {
  /** Sudah boolean. Nilai PLAYLY_WEBHOOK_SECRET tidak pernah sampai ke sini. */
  kunciTerpasang: boolean;
}) {
  let semua: PlaylyWebhookVideo[] = [];
  let hidden: string[] = [];
  try {
    // Tanpa kunci, kartunya tidak memakai jumlah video. Jangan menahan layar
    // pada pembacaan database yang hasilnya tidak ditampilkan.
    if (kunciTerpasang) {
      [semua, hidden] = await Promise.all([
        getPlaylyWebhookVideos(),
        getPlaylyHiddenIds(),
      ]);
    } else {
      semua = [];
      hidden = [];
    }
  } catch (err) {
    console.warn(
      "[admin] status webhook gagal dibaca:",
      err instanceof Error ? err.name : "unknown",
    );
    return (
      <p role="alert" className="text-sm text-rose-300">
        Status jalur belum terbaca. Muat ulang halaman ini.
      </p>
    );
  }

  const ringkasan = ringkasWebhookPlayly(kunciTerpasang, semua, hidden);

  return (
    <>
      {ringkasan.status === "kunci-belum-dipasang" && (
        <section className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-rose-100">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            Jalur webhook belum menyala
          </h2>
          <p className="mt-2 text-sm text-rose-100/90">{ringkasan.pesan}</p>
          <div className="mt-4 space-y-2 text-sm text-rose-100/90">
            <p className="font-semibold text-rose-100">Dua langkah perbaikannya:</p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Buat kunci acak, lalu simpan sebagai Environment Variable{" "}
                <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs">
                  PLAYLY_WEBHOOK_SECRET
                </code>{" "}
                di panel hosting (Railway), lalu{" "}
                <strong className="text-rose-50">deploy ulang</strong> — env baru
                tidak aktif sampai situsnya dibangun ulang.
              </li>
              <li>
                Beri kunci yang <strong className="text-rose-50">sama persis</strong>{" "}
                ke pengelola Playly, bersama alamat di bawah, dan minta mereka
                menyalakan pengiriman notifikasi ke sana.
              </li>
            </ol>
          </div>
        </section>
      )}

      {ringkasan.status === "belum-ada-kiriman" && (
        <section className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-amber-100">
            <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
            Siap menerima, tapi belum ada yang masuk
          </h2>
          <p className="mt-2 text-sm text-amber-100/90">{ringkasan.pesan}</p>
          <p className="mt-3 text-sm text-amber-100/90">
            Kalau ini bertahan lama, kemungkinan besar pengiriman{" "}
            <strong className="text-amber-50">belum dinyalakan di sisi Playly</strong>
            . Pastikan pengelola Playly sudah mendaftarkan alamat di bawah dan
            memakai kunci yang sama dengan yang terpasang di sini.
          </p>
        </section>
      )}

      {ringkasan.status === "menerima" && (
        <section className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-emerald-100">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            Jalur webhook hidup
          </h2>
          <dl className="mt-3 grid gap-3 text-sm text-emerald-100/90 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wider text-emerald-200/70">
                Notifikasi terakhir
              </dt>
              <dd className="mt-0.5 font-semibold text-emerald-50">
                {ringkasan.terakhirLabel ?? "belum tercatat"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-emerald-200/70">
                Video tampil ke penonton
              </dt>
              <dd className="mt-0.5 font-semibold text-emerald-50">
                {ringkasan.jumlahTampil} video
                {ringkasan.jumlahDisembunyikan > 0 &&
                  ` · ${ringkasan.jumlahDisembunyikan} disembunyikan`}
                {ringkasan.jumlahDitarik > 0 &&
                  ` · ${ringkasan.jumlahDitarik} ditarik Playly`}
              </dd>
            </div>
          </dl>
        </section>
      )}
    </>
  );
}
