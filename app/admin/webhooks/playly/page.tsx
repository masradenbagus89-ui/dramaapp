// Halaman pantau webhook Playly — /admin/webhooks/playly
//
// PENJAGA AKSES: sama seperti dua halaman admin Playly lainnya, halaman ini
// dijaga DI SERVER lewat cookie sesi admin yang ditandatangani saat login.
// Orang yang belum login tidak pernah menerima isinya — bukan sekadar
// "disembunyikan" sesudah halaman terkirim.
//
// KENAPA halaman ini ada: endpoint POST /api/webhooks/playly bekerja tanpa
// tampilan apa pun, jadi sebelumnya satu-satunya cara mengetahui ia hidup atau
// mati adalah mengetuknya lewat terminal. Yang paling sering perlu dijawab
// justru "kenapa daftarnya kosong?" — dan dua sebabnya (kunci belum dipasang
// vs Playly belum pernah mengirim) terlihat sama di layar padahal langkah
// perbaikannya berbeda total. Itulah yang dibedakan kartu status di bawah.
import type { Metadata } from "next";
import Link from "next/link";
import { cookies, headers } from "next/headers";
import { ADMIN_COOKIE, verifyAdminSessionToken } from "@/lib/session";
import { readWebhookSecret } from "@/lib/playly-webhook";
import { getPlaylyHiddenIds, getPlaylyWebhookVideos } from "@/lib/store";
import {
  keBentukTampil,
  ringkasWebhookPlayly,
} from "@/lib/playly-webhook-status";
import AdminAccessDenied from "@/app/components/admin/AdminAccessDenied";
import AdminSidebar from "@/app/components/admin/AdminSidebar";
import PlaylyWebhookMonitor from "@/app/components/admin/PlaylyWebhookMonitor";
import { AlertTriangle, CheckCircle2, Clock, Webhook } from "lucide-react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Webhook Playly — Admin DramaKu",
  description: "Pantau notifikasi video baru yang dikirim Playly ke DramaKu.",
  robots: { index: false, follow: false }, // halaman admin: jangan masuk Google
};

/** Jalur endpoint webhook. Satu tempat, supaya yang ditampilkan tak bisa meleset dari yang asli. */
const JALUR_WEBHOOK = "/api/webhooks/playly";

export default async function PlaylyWebhookPage() {
  const jar = await cookies();
  const email = await verifyAdminSessionToken(jar.get(ADMIN_COOKIE)?.value);
  if (!email) return <AdminAccessDenied />;

  // 🔒 Yang diambil hanya JAWABAN "ada isinya atau tidak" (boolean) — nilai
  // PLAYLY_WEBHOOK_SECRET tidak pernah menyentuh variabel yang ikut dirender.
  const kunciTerpasang = readWebhookSecret() !== null;

  const [semua, hidden] = await Promise.all([
    getPlaylyWebhookVideos(),
    getPlaylyHiddenIds(),
  ]);

  const ringkasan = ringkasWebhookPlayly(kunciTerpasang, semua, hidden);
  const daftar = semua.map(keBentukTampil);

  // Alamat yang harus didaftarkan di sisi Playly. Diambil dari header host
  // supaya yang tertulis persis domain yang sedang dibuka admin (produksi vs
  // preview vs localhost) — bukan domain yang dihardcode lalu salah diam-diam.
  // Header host bisa dipalsukan, tapi di sini ia hanya DITAMPILKAN ke admin
  // yang sudah lolos gerbang; tidak ada keputusan keamanan yang bergantung padanya.
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const alamatWebhook = host ? `${proto}://${host}${JALUR_WEBHOOK}` : JALUR_WEBHOOK;

  return (
    <div className="mx-auto max-w-7xl gap-6 px-4 pb-10 pt-6 md:grid md:grid-cols-[220px_1fr] md:px-6">
      <AdminSidebar />

      <div className="space-y-6">
        <header>
          <p className="text-xs uppercase tracking-wider text-zinc-500">Konten</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Webhook Playly</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            <strong className="text-zinc-200">Webhook</strong> artinya Playly yang{" "}
            <strong className="text-zinc-200">mengirim kabar ke kita</strong> begitu
            ada video baru — kebalikan dari cara biasa, di mana DramaKu yang
            menanyakan daftar video ke Playly tiap 5 menit. Bedanya terasa di
            kecepatan: lewat webhook video muncul seketika, tanpa menunggu giliran
            tanya berikutnya. Halaman ini memperlihatkan apakah jalur itu hidup dan
            apa saja yang sudah masuk lewatnya.
          </p>
        </header>

        {/* Kartu status — bagian terpenting halaman ini. Ia menjawab "kenapa
            daftarnya begini", yang tak bisa dijawab daftar videonya sendiri. */}
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
                  di Vercel, lalu{" "}
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

        {/* Alamat endpoint selalu ditampilkan, di keadaan apa pun: inilah satu
            hal yang perlu diserahkan admin ke pengelola Playly, dan mencarinya
            di kode bukan pekerjaan yang masuk akal untuk diminta dari owner. */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <Webhook className="h-4 w-4 shrink-0 text-violet-400" aria-hidden="true" />
            Alamat yang didaftarkan di Playly
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Serahkan alamat ini ke pengelola Playly. Merekalah yang mengetuknya —
            alamat ini tidak untuk dibuka di browser (dibuka langsung akan ditolak,
            karena ia hanya menerima kiriman ber-kunci).
          </p>
          <p className="mt-3 overflow-x-auto rounded-lg border border-zinc-700 bg-black/40 px-3 py-2 font-mono text-sm text-zinc-200">
            {alamatWebhook}
          </p>
          <p className="mt-3 text-xs text-zinc-500">
            Kunci rahasianya sengaja <strong className="text-zinc-400">tidak</strong>{" "}
            ditampilkan di layar mana pun — termasuk halaman ini. Yang bisa
            diketahui dari sini hanya sudah terpasang atau belum. Kunci yang pernah
            tampil di layar berarti pernah keluar dari server, dan itu tak bisa
            ditarik kembali. Kalau kuncinya lupa, ganti dengan yang baru di Vercel
            lalu beri tahu Playly — jangan mencari yang lama.
          </p>
        </section>

        <PlaylyWebhookMonitor videos={daftar} initialHidden={hidden} />

        <p className="text-xs text-zinc-500">
          Video di daftar ini digabung dengan katalog Playly biasa saat ditampilkan
          di halaman{" "}
          <Link href="/film" className="text-amber-400 underline">
            Video Playly
          </Link>
          . Untuk mengatur video katalog, buka{" "}
          <Link href="/admin/videos/playly" className="text-amber-400 underline">
            Video Playly
          </Link>{" "}
          di menu admin.
        </p>
      </div>
    </div>
  );
}
