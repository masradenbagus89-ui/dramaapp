// Kelas-kelas tata letak & warna yang dipakai BERSAMA beberapa komponen.
// `cn` dipakai di sini supaya konstanta yang berisi banyak kelas tetap enak
// dibaca sebagai daftar berbaris, bukan satu string raksasa.
import { cn } from "@/lib/utils";

/**
 * Pembatas lebar isi + padding tepi, dipakai bersama oleh bar cari, strip genre,
 * baris unggulan, dan grid katalog.
 *
 * KENAPA satu tempat: `shell-wide` (1440px, didefinisikan di app/globals.css)
 * juga dipakai navbar. Kalau angkanya ditulis ulang di tiap berkas, salah satu
 * pasti tertinggal saat diubah dan tepi kiri antar-baris tidak lagi sejajar —
 * putus TANPA error, jadi tak ada yang melapor.
 */
export const SHELL = "shell-wide mx-auto px-4 md:px-6";

/**
 * BADAN TERANG — latar putih-abu yang menyalakan seluruh aturan tema terang di
 * dalamnya (owner 2026-11-05: "aku mau semua seragam backgroundnya jadi sama
 * dengan beranda (putih)").
 *
 * Dua kelas ini SELALU berpasangan dan itu bukan kebetulan:
 *   - `tema-terang` = saklarnya. Varian `terang:` di seluruh komponen hanya
 *     menyala di dalam pembungkus ber-class ini (lihat @custom-variant di
 *     app/globals.css). Tanpa kelas ini, `terang:text-zinc-900` DIAM saja.
 *   - `bg-zinc-100` = latarnya sendiri. Tanpa ini, `<body className="bg-black">`
 *     (app/layout.tsx:53) tetap terlihat menembus dari belakang.
 * Memasang salah satunya saja menghasilkan kerusakan SENYAP: saklar tanpa latar
 * = tulisan gelap di atas hitam (tak terbaca), latar tanpa saklar = tulisan
 * putih di atas putih (hilang sama sekali).
 *
 * KENAPA ditulis di sini, bukan diketik ulang di tiap halaman: sejak 2026-11-05
 * ia dipakai LIMA halaman (`/`, `/beranda`, `/discover`, `/film`, `/katalog`).
 * Kalau owner minta ganti warnanya nanti, satu baris ini yang diubah — bukan
 * lima berkas yang salah satunya pasti tertinggal lalu jadi belang tanpa error.
 */
export const BADAN_TERANG = "tema-terang bg-zinc-100";

/**
 * LATAR BAR ATAS — warna identitas situs, dipakai `SearchBar`.
 *
 * ⚠️ NAMANYA BERUBAH 2026-11-23, dari `GRADASI_DRAMAKU`. Isinya sudah bukan
 * gradasi, dan nama yang menjanjikan gradasi membuat pembaca berikutnya
 * mencari arah `to-r` yang tidak ada — nama yang berbohong adalah kerusakan
 * senyap, bukan sekadar tidak rapi.
 *
 * RIWAYAT WARNA: `from-rose-700 via-rose-600 to-pink-600` (merah-pink DramaKu,
 * dikunci owner 2026-09-21) → `bg-sage-700` (owner 2026-11-23: *"tema warna
 * bisa kamu ubah jadi soft sage"*, menunjuk contoh gambar).
 *
 * ⚠️ BERGRADASI + BERSAPUAN, dan itu permintaan eksplisit. Riwayatnya dalam
 * satu hari: warna RATA → ditolak (*"ada seperti gradasi jadi lebih hidup
 * warnanya tidak polos"*) → gradasi lurus `to-br` → DITOLAK LAGI (*"gradasi
 * warna saya kan minta seperti ini, kenapa masih polos"*) → bentuk sekarang.
 * Pelajarannya: gradasi lurus antar dua nada yang berdekatan memang nyaris
 * tak terbaca mata. Yang terbaca sebagai "hidup" adalah BENTUK, bukan
 * perbedaan nada — karena itu ditambahkan sapuan lengkung.
 *
 * Rentang nadanya sengaja SEMPIT — `sage-100 → sage-200` plus sapuan yang
 * justru MENERANGKAN. Bar ini memuat teks, dan teks hanya aman kalau SELURUH
 * rentang latarnya aman: `sage-900` di atas nada tergelap (`sage-200`) =
 * **10,34:1**, di atas yang terterang = **13,83:1**. Gradasi yang melebar ke
 * nada gelap akan membuat teks lulus di satu ujung dan gagal di ujung lain —
 * dan ujung yang gagal itu tidak memunculkan error apa pun.
 *
 * RIWAYAT kontras: saat bar masih `sage-700` (gelap), teksnya putih dengan
 * rasio 7,58:1. Begitu bar jadi pucat, putih jatuh ke 1,20:1 — lihat
 * `TEKS_BAR_MEREK` di bawah.
 * Paletnya beserta aturan pasangan teksnya ada di app/globals.css — JANGAN
 * tulis nilai warnanya lagi di berkas lain. Dua tes memaku warna ini lewat
 * HTML hasil render (tests/strip-katalog.test.ts), jadi salinan yang
 * menyimpang akan terlihat sebagai kepala situs yang warnanya beda
 * antar-halaman.
 */
export const LATAR_BAR_MEREK = cn(
  // Dasar: gradasi mendatar sage-100 → sage-200.
  // Warna dasar kalau gambar latarnya belum termuat — bukan gradasi lagi.
  // GELOMBANG di atasnya — inilah yang membuatnya "tidak polos".
  // Definisinya CSS sungguhan di app/globals.css (`.sapuan-gelombang`), bukan
  // kelas arbitrer, sebab gambar SVG-nya ber-spasi dan spasi di dalam
  // `className` memecah nama kelas. Dua percobaan sebelumnya gagal justru di
  // situ — alasan lengkapnya ada di komentar globals.css.
  // `relative` sebagai POSISI CADANGAN untuk pemanggil yang tidak membawa
  // posisinya sendiri. Pemanggil yang membawa `sticky top-0` tetap menang,
  // sebab `cn()` (twMerge) tahu keduanya satu kelompok dan yang BELAKANGAN
  // dipakai — dan `className` pemanggil selalu digabung paling akhir.
  "relative sapuan-gelombang",
);

/**
 * TEKS & IKON DI ATAS BAR MEREK — pasangan wajib `LATAR_BAR_MEREK`.
 *
 * ⚠️ KENAPA JADI TOKEN TERSENDIRI, bukan ditulis di tiap komponen: bar ini
 * berubah dari GELAP (`sage-700`) ke PUCAT (`sage-100`) pada 2026-11-23, dan
 * di saat itu SETIAP `text-white` di dalamnya berubah dari terbaca jelas jadi
 * nyaris tak terlihat — teks putih di atas `sage-100` = **1,20:1**, jauh di
 * bawah ambang 4,5:1. Enam titik tersebar di lima berkas (`SearchBar`,
 * `NavMenus`, `KepalaKatalog`, `MenuAkun`). Dengan dua token berpasangan,
 * mengganti nada bar memaksa warna teksnya ikut — satu keputusan, bukan enam
 * yang salah satunya pasti tertinggal.
 *
 * `sage-900` di atas `sage-100` = **12,51:1**.
 */
export const TEKS_BAR_MEREK = "text-sage-50";

/** Sorotan hover/fokus di atas bar merek yang pucat (hitam-transparan hilang di sini). */
export const SOROT_BAR_MEREK =
  "hover:bg-white/15 focus-visible:bg-white/15";

/**
 * TOMBOL UTAMA (ajakan bertindak) — "SEMUA", "TEMUKAN TONTONAN FAVORITMU".
 *
 * KENAPA ADA: sebelum 2026-11-23 gradasi `from-fuchsia-600 to-rose-600`
 * ditulis ULANG di TIGA berkas (`FeaturedRow`, `SeksiKatalog`,
 * `TabKatalogTampilan`). Salinan begitu pasti menyimpang cepat atau lambat,
 * dan menyimpangnya nol error — cuma tombol yang warnanya beda antar halaman.
 *
 * `sage-600` + teks putih = kontras 5,67:1, di atas ambang 4,5:1 untuk teks
 * normal (dihitung, lihat komentar palet di app/globals.css). JANGAN
 * diturunkan ke `sage-500`: di sana rasionya 4,03:1 dan tombol ini memuat
 * teks kecil huruf besar.
 */
export const TOMBOL_UTAMA =
  "bg-sage-600 text-white hover:bg-sage-700 focus-visible:ring-2 focus-visible:ring-sage-800";

/**
 * LATAR PANEL MENU KATALOG DI HP — abu kehitaman RATA, tanpa gradasi.
 *
 * RIWAYAT WARNANYA, ditulis supaya tak ada yang memutarnya balik mengira
 * sedang memperbaiki: gradasi DramaKu (21 Nov) → merah tua rata `rose-700`
 * (23 Nov pagi) → warna ini (23 Nov, owner memilih dari 4 pratinjau gambar).
 *
 * KENAPA BUKAN MERAH LAGI (owner: *"warna ganti yang soft jadi tidak bikin
 * sakit mata"*). Merah pekat seluas panel itu bidang jenuh yang melelahkan
 * mata, dan masalahnya makin terasa karena badan situs kini TERANG — merah
 * pekat di atas latar terang adalah lompatan kontras paling keras yang bisa
 * dibuat. Abu kehitaman memberi kontras yang tegas (panel jelas terpisah dari
 * halaman di belakangnya) tanpa bidang warna jenuh.
 *
 * KENAPA WARNA RATA, bukan gradasi: kepala grup di dalam panel itu `sticky`,
 * jadi ia melayang di atas latar panel saat digulir. Dengan gradasi ia hanya
 * sewarna selama arah gradasinya mendatar — pagar yang gampang patah diam-diam
 * karena belang TIDAK memunculkan error. Warna rata menghapus kelas bug itu
 * seluruhnya, bukan menghindarinya.
 *
 * Identitas situs tetap hadir sebagai AKSEN, bukan bidang: garis judul
 * `amber-400` dan kotak ikon `sage-800` berisi ikon `sage-300`. ⚠️ Kotak ikon
 * itu sempat `rose-950`/`rose-400` selama beberapa jam pada 2026-11-23 —
 * aksen dari tema merah yang lama; begitu tema situs jadi sage ia jadi warna
 * nyasar. Kalau warna merah muncul lagi di panel ini, kemungkinan besar itu
 * sisa yang terlewat, bukan keputusan.
 *
 * Hanya latar PANEL-nya yang jadi konstanta, karena cuma itu yang dipakai dua
 * berkas (pemanggil di `SearchBar.tsx` + kepala grup `sticky` di
 * `MenuKatalogHp.tsx`) dan karena itu bisa menyimpang. Warna isi panel —
 * chip `stone-800`, garis `stone-700` — ditulis langsung di tempatnya: satu
 * berkas, satu pemakai, jadi konstanta cuma menambah lompatan baca.
 */
export const LATAR_PANEL_KATALOG_HP = "bg-stone-900";

/**
 * BADAN TERANG PENUH — paletnya DIBALIK seluruhnya (app/globals.css).
 *
 * BEDANYA dengan `BADAN_TERANG` di atas, dan kapan memakai yang mana:
 *   - `BADAN_TERANG` cuma MENYALAKAN varian `terang:` yang sudah ditulis satu
 *     per satu di komponen. Dipakai halaman KATALOG, yang komponennya
 *     (CatalogCard, FeaturedRow, …) memang sudah disiapkan untuk dua tema.
 *   - `BADAN_TERANG_PENUH` membalik PALETNYA. Dipakai halaman yang komponennya
 *     TIDAK PERNAH disiapkan untuk terang — panel admin dan halaman akun
 *     (/profile, /login, /daftar, /lupa-password), yang penuh `Card`, `Input`,
 *     dan `Label` dari `components/ui/*`. Komponen itu memakai TOKEN shadcn,
 *     bukan kelas zinc, jadi varian `terang:` tak pernah menyentuhnya.
 *
 * ⚠️ JANGAN pakai yang ini di halaman katalog: ia membalik `--color-zinc-*`,
 * sehingga `bg-zinc-100` yang dipakai sebagai latar TERANG di beberapa
 * komponen katalog justru berubah jadi gelap.
 */
export const BADAN_TERANG_PENUH = "tema-terang-penuh";

/**
 * Grid poster: jumlah kolom MENYESUAIKAN SENDIRI — sebanyak mungkin kolom
 * selebar minimal sekian piksel.
 *
 * KENAPA bukan `sm:grid-cols-4 md:grid-cols-6 …`: patokan ukuran layar terbesar
 * Tailwind berhenti di 1536px. Di layar yang lebih lebar jumlah kolomnya TIDAK
 * bertambah — yang terjadi tiap poster justru MELAR jadi raksasa. `auto-fill`
 * menambah kolom sendiri berapa pun lebar layarnya.
 *
 * KENAPA angka minimalnya BERTINGKAT (owner 2026-09-11: "cover/katalog agak
 * kecil, mau seperti LK21"): satu angka untuk semua layar tak bisa dipakai.
 * 104px yang pas di HP (3 kolom) berubah jadi belasan poster mungil di layar
 * 1920; sebaliknya 172px yang enak dilihat di desktop memaksa HP turun ke 2
 * kolom raksasa. Jadi patokannya naik mengikuti lebar layar.
 */
export const GRID_CLASS =
  "grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-x-2 gap-y-5 pt-4 " +
  "sm:grid-cols-[repeat(auto-fill,minmax(124px,1fr))] " +
  "md:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] " +
  "lg:grid-cols-[repeat(auto-fill,minmax(172px,1fr))]";

/**
 * Lebar SATU kartu di baris geser (FeaturedRow).
 *
 * Sengaja disimpan bersebelahan dengan GRID_CLASS: di /beranda kedua bentuk itu
 * tampil di halaman yang SAMA (baris geser di atas, grid di bawah). Kalau
 * ukurannya diubah sendiri-sendiri, poster baris atas dan poster grid bawah jadi
 * beda besar — terbaca seperti halaman yang belum selesai dirapikan, dan tak ada
 * error yang memberi tahu. Angkanya sengaja dibuat sejajar dengan tangga
 * GRID_CLASS di atas.
 */
export const ROW_CARD_CLASS =
  "w-[116px] shrink-0 sm:w-[132px] md:w-[150px] lg:w-[172px]";

/**
 * Lebar SATU kartu di baris KATEGORI /beranda (Drama Terbaru, Drama Action, …).
 *
 * SENGAJA lebih kecil dari `ROW_CARD_CLASS` di atas — itu permintaan owner
 * 2026-09-15: "buat tampilan poster berbentuk grid horizontal kecil", mencontoh
 * Layarkaca21. Dipisah, bukan mengubah `ROW_CARD_CLASS`, karena angka itu masih
 * dipakai baris UNGGULAN di halaman depan `/`; mengubahnya di satu tempat akan
 * ikut mengecilkan halaman yang tidak diminta owner.
 *
 * Patokan angkanya: pada layar 1440px baris ini memuat ±10 poster sekaligus
 * (128px + jarak antar-kartu), sedangkan `ROW_CARD_CLASS` memuat ±7. Di HP
 * 360px tetap 3 poster per layar — di bawah ±90px judul dua baris di bawah
 * poster mulai terpotong, jadi 92px adalah batas kecil yang masih terbaca.
 */
export const ROW_KATEGORI_CARD_CLASS =
  "w-[92px] shrink-0 sm:w-[104px] md:w-[116px] lg:w-[128px]";

/**
 * Lebar satu poster di baris hitam paling atas.
 *
 * Lebih kecil dari `ROW_CARD_CLASS` supaya di layar lebar muat belasan poster
 * sekaligus, seperti deretan unggulan LK21. Tidak mengubah `ROW_CARD_CLASS`
 * karena angka itu masih dipakai baris lain.
 */
export const HERO_CARD_CLASS =
  "w-[104px] shrink-0 sm:w-[116px] md:w-[124px] lg:w-[132px]";

/** Bentuk seragam untuk dropdown penyaring yang dititipkan ke bar cari. */
export const TRIGGER_CLASS =
  "h-9 w-full rounded-sm border-black/20 bg-black/25 text-xs font-semibold text-white focus:ring-0 md:w-auto [&>span]:text-white";
