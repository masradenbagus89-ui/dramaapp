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
// ⚠️ KERANGKA INI SENGAJA TANPA KATA-KATA KHAS ADMIN — jangan ditambahi.
// Diukur di produksi 2026-11-11 (versi pertama berkas ini): isi kerangka IKUT
// TERKIRIM ke pengunjung yang BELUM login. Sebabnya kerangka = "static shell"
// yang React kirim DULUAN, sebelum app/admin/layout.tsx selesai memeriksa
// cookie sesi dan menggantinya dengan layar penolakan. Jadi kalimat apa pun di
// sini terbaca siapa saja.
//
// Versi pertama membocorkan judul "Video dari Playly" + kalimat "Daftarnya
// panjang (ratusan video)". Bukan data dan bukan alamat endpoint, tapi tetap
// melemahkan janji yang ditulis app/admin/layout.tsx: "isi panelnya tidak
// pernah ikut terkirim". Sekarang isinya cuma kotak abu-abu + kata "Memuat…"
// yang netral — manfaatnya untuk admin tetap sama (layar langsung merespons),
// kebocorannya nol. Dijaga tests/panel-playly-tanpa-menunggu.test.ts.

/** Berapa baris palsu yang digambar — sekadar memberi bentuk, bukan data. */
const BARIS_CONTOH = 6;

export default function MemuatHalamanPlayly() {
  return (
    <div className="mx-auto max-w-7xl gap-6 px-4 pb-10 pt-6 md:grid md:grid-cols-[220px_1fr] md:px-6">
      {/* Kolom sidebar ditahan bentuknya saja. Sidebar sungguhan TIDAK dipasang
          di sini: isinya nama-nama menu panel admin, dan apa pun di kerangka ini
          terbaca pengunjung yang belum login (lihat catatan di atas). */}
      <div className="hidden md:block" aria-hidden="true">
        <div className="animate-pulse space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-7 rounded bg-zinc-800" />
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {/* Satu kata netral, bukan kotak berkedip tanpa keterangan: layar yang
            sedang sibuk harus bisa dibedakan dari layar yang rusak — dan
            "Memuat…" tidak memberi tahu apa pun tentang isi panelnya. */}
        <p role="status" aria-live="polite" className="text-sm text-zinc-400">
          Memuat…
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
