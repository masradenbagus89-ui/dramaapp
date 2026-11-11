// Kerangka halaman Video Playly — tampil SEKETIKA saat menunya diklik.
//
// KENAPA ADA (owner 2026-11-11: "kenapa ketika saya klik IMDb lama terbukanya").
// page.tsx mengumpulkan seluruh datanya di server DULU, dan bagian terberatnya
// menanyakan SETIAP video ke Playly satu per satu (489 video, maksimal 4
// sekaligus = ~123 giliran berurutan; satu perjalanan ke Playly terukur ≥0,39
// detik). Selama itu browser masih menggambar halaman LAMA tanpa tanda apa pun,
// jadi menunya terasa tidak merespons dan admin mengkliknya berkali-kali.
//
// CARA KERJANYA: Next.js memakai berkas ini sebagai isi <Suspense> otomatis
// untuk page.tsx di folder yang sama — kerangka ini dikirim lebih dulu, lalu
// ditukar dengan halaman sungguhan begitu datanya siap.
// (node_modules/next/dist/docs/01-app/02-guides/streaming.md)
//
// AKSES TETAP TERJAGA: berkas ini dirender DI DALAM app/admin/layout.tsx, yang
// menolak sesi non-admin sebelum children-nya digambar. Jadi kerangka ini tidak
// pernah sampai ke pengunjung yang belum login — ia tidak memuat data apa pun.
import AdminSidebar from "@/app/components/admin/AdminSidebar";

/** Berapa baris palsu yang digambar — sekadar memberi bentuk, bukan data. */
const BARIS_CONTOH = 6;

export default function MemuatHalamanPlayly() {
  return (
    <div className="mx-auto max-w-7xl gap-6 px-4 pb-10 pt-6 md:grid md:grid-cols-[220px_1fr] md:px-6">
      {/* Sidebar sengaja ikut digambar: menunya tetap terbaca dan bisa diklik
          selama menunggu, jadi admin tidak terjebak di layar kosong. */}
      <AdminSidebar />

      <div className="space-y-6">
        <header>
          <p className="text-xs uppercase tracking-wider text-zinc-500">Konten</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Video dari Playly</h1>
        </header>

        {/* Dikatakan apa adanya, bukan cuma kotak abu-abu berkedip: layar yang
            sedang sibuk harus bisa dibedakan dari layar yang rusak. */}
        <p
          role="status"
          aria-live="polite"
          className="flex items-start gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-xs leading-relaxed text-sky-100"
        >
          <span>
            Memuat daftar video dari Playly… Daftarnya panjang (ratusan video),
            jadi bagian ini butuh beberapa detik. Menu di samping sudah bisa
            diklik.
          </span>
        </p>

        <section className="animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="h-5 w-48 rounded bg-zinc-800" />

          <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2"
              >
                <div className="h-3 w-20 rounded bg-zinc-800" />
                <div className="mt-2 h-5 w-12 rounded bg-zinc-800" />
              </div>
            ))}
          </dl>

          <ul className="mt-6 space-y-3">
            {Array.from({ length: BARIS_CONTOH }, (_, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="h-10 w-16 shrink-0 rounded bg-zinc-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 rounded bg-zinc-800" />
                  <div className="h-3 w-1/3 rounded bg-zinc-800" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
