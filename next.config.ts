import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Izinkan dev server diakses dari PC lain di jaringan lokal yang sama.
  // Tambahkan IP/hostname laptop Anda di sini supaya HMR (auto-reload) jalan
  // saat dibuka dari PC kedua.
  allowedDevOrigins: [
    "192.168.1.4",
    "192.168.1.7",
    "192.168.1.10",
    "192.168.1.11",
    "*.local",
  ],

  images: {
    // Domain gambar yang boleh dioptimalkan next/image. Host di luar daftar ini
    // akan DITOLAK (gambar gagal tampil), jadi tiap sumber poster baru wajib
    // ditambahkan di sini.
    remotePatterns: [
      // Poster/hero katalog yang sudah ada di data.
      { protocol: "https", hostname: "i.imgur.com" },
      // Poster dari OMDb — lihat lib/imdb-tool.ts:153.
      { protocol: "https", hostname: "m.media-amazon.com" },
      // Banner dari TMDB — lihat lib/imdb-tool.ts:327.
      { protocol: "https", hostname: "image.tmdb.org" },
    ],
    // Format modern: ukuran berkas jauh lebih kecil pada mutu yang sama.
    formats: ["image/avif", "image/webp"],
  },

  /**
   * Alamat lama yang sudah tersebar, diarahkan ke alamat barunya.
   *
   * KENAPA WAJIB ADA (owner 2026-09-26): halaman daftar video pindah dari
   * `/playly` ke `/film` supaya nama penyedia tidak lagi terlihat penonton —
   * termasuk di kotak alamat browser. Tanpa pengalihan ini, SEMUA tautan yang
   * terlanjur tersebar (dikirim di chat, di-bookmark, dan yang sudah terindeks
   * Google) berubah jadi 404 seketika. Itu kerusakan yang tak bisa ditarik
   * kembali: kita tidak tahu siapa saja yang menyimpannya.
   *
   * `permanent: true` = HTTP 308. Bukan sekadar teknis: kode itulah yang
   * memberi tahu Google "halaman ini PINDAH, bukan sedang mampir" sehingga
   * nilai pencarian yang sudah dikumpulkan `/playly` ikut berpindah ke `/film`.
   * Dengan 307 (sementara), Google menahan nilainya di alamat lama.
   *
   * ⚠️ Hanya halaman PENONTON yang pindah. Alamat panel admin
   * (`/admin/videos/playly`, `/admin/webhooks/playly`) dan seluruh endpoint API
   * (`/api/playly/*`, `/api/admin/playly/*`) SENGAJA dibiarkan: admin memang
   * perlu tahu nama penyedianya, dan mengubah alamat API berarti menyentuh
   * pemanggil di banyak berkas tanpa manfaat apa pun bagi penonton.
   */
  async redirects() {
    return [
      {
        source: "/playly",
        destination: "/film",
        permanent: true,
      },
    ];
  },

  /**
   * Header keamanan — temuan audit 2026-10-24 (S-1): sebelum ini NOL header
   * keamanan terkirim dari produksi. Diukur langsung ke host Railway: tidak ada
   * CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
   * maupun Permissions-Policy.
   *
   * ⚠️ CSP SENGAJA DIPASANG SEBAGAI `Report-Only` LEBIH DULU, dan ini bukan
   * kehati-hatian berlebihan. CSP yang salah setel TIDAK memunculkan error di
   * layar — iklan AdSense dan tombol bayar Midtrans Snap cuma berhenti muncul,
   * dan tak ada yang melapor. `Report-Only` membuat browser MENCATAT apa yang
   * AKAN diblokir tanpa benar-benar memblokir, jadi daftarnya bisa dirapikan
   * dulu dari kenyataan, bukan dari tebakan.
   *
   * CARA MENEGAKKANNYA nanti: buka situs + halaman drama + modal top-up koin
   * dengan DevTools Console terbuka, kumpulkan baris "[Report Only] Refused
   * to ...", tambahkan host yang sah ke daftar di bawah, baru ganti nama
   * headernya dari `Content-Security-Policy-Report-Only` menjadi
   * `Content-Security-Policy`.
   */
  async headers() {
    // Sumber luar yang BENAR-BENAR dipakai, dikumpulkan dari kode (bukan daftar
    // umum dari internet):
    //   AdSense       app/components/AdBanner.tsx:74
    //   Midtrans Snap lib/midtrans.ts:29-30 (dipasang CoinWallet.tsx:54)
    //   Poster        next.config.ts remotePatterns + i.ytimg.com
    //   Video         tunnel PC (lib/video-base.ts:23) + Playly
    //                 (lib/playly-alamat.ts:24)
    //   Font          TIDAK ADA — next/font/google menyimpan fontnya sendiri
    //                 saat build (self-host), jadi nol sambungan font ke luar.
    const iklan = [
      "https://pagead2.googlesyndication.com",
      "https://*.googlesyndication.com",
      "https://*.googleadservices.com",
      "https://*.doubleclick.net",
      "https://*.google.com",
    ];
    const midtrans = [
      "https://app.midtrans.com",
      "https://app.sandbox.midtrans.com",
    ];
    const sumberVideo = [
      "https://*.trycloudflare.com",
      "https://*.amasyaforum.com",
      "https://playly-hosting-video.up.railway.app",
    ];
    const embedVideo = [
      "https://www.youtube-nocookie.com",
      "https://player.vimeo.com",
    ];

    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      // Nol plugin lawas (Flash dsb) — tak ada yang memakainya di sini.
      "object-src 'none'",
      // Situs ini tidak boleh dipasang di dalam halaman orang lain
      // (anti-clickjacking). Nol tanda ada pihak yang sengaja meng-embed kita.
      "frame-ancestors 'self'",
      "form-action 'self'",
      // ⚠️ 'unsafe-inline' pada script TERPAKSA: Next.js App Router menyisipkan
      // script inline untuk hydration, dan project ini belum memakai nonce.
      // Artinya CSP di sini BUKAN penghenti XSS yang utuh — nilainya ada pada
      // pembatasan ASAL script (hanya host di daftar ini yang boleh memuat
      // script). Audit 2026-10-24 menemukan nol sink XSS di kode (dua
      // dangerouslySetInnerHTML keduanya JSON-LD yang sudah di-escape), jadi
      // ini lapis tambahan, bukan satu-satunya pagar.
      `script-src 'self' 'unsafe-inline' ${[...iklan, ...midtrans].join(" ")}`,
      // Tailwind & Next menyuntik style inline; tanpa ini tampilan rusak total.
      "style-src 'self' 'unsafe-inline'",
      // Poster datang dari beberapa host dan daftarnya berubah tiap sumber baru
      // ditambahkan. `https:` sengaja longgar — gambar adalah permukaan serang
      // paling rendah di sini, dan daftar ketat akan membuat poster hilang
      // diam-diam tiap kali admin menambah sumber baru.
      "img-src 'self' data: blob: https:",
      `media-src 'self' blob: ${sumberVideo.join(" ")}`,
      "font-src 'self' data:",
      `connect-src 'self' ${[...sumberVideo, ...iklan].join(" ")}`,
      `frame-src 'self' ${[...midtrans, ...embedVideo, ...iklan, "https://playly-hosting-video.up.railway.app"].join(" ")}`,
      "worker-src 'self' blob:",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          // Tegakkan HTTPS. Tanpa `preload` DENGAN SENGAJA: preload itu
          // pendaftaran permanen ke daftar bawaan browser dan sangat sulit
          // dicabut — jangan dipasang di host sementara seperti *.up.railway.app
          // yang memang akan ditinggalkan kalau domain sendiri jadi dibeli.
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // Browser dilarang menebak-nebak jenis berkas. Tanpa ini, berkas yang
          // terunggah/tersaji dengan tipe keliru bisa dieksekusi sebagai script.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Pendamping `frame-ancestors` untuk browser lama.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Alamat halaman kita tidak ikut bocor ke situs tujuan saat penonton
          // mengklik tautan keluar.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Matikan izin perangkat yang memang tak dipakai situs ini.
          // `fullscreen` & `payment` SENGAJA TIDAK dimatikan: yang pertama
          // dipakai pemutar video, yang kedua bisa dipakai Midtrans.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Content-Security-Policy-Report-Only", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
