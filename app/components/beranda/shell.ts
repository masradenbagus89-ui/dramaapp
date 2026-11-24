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
 * BADAN SITUS — latar halaman katalog penonton, SEKALIGUS saklar temanya.
 *
 * ⚠️ NAMANYA BERUBAH 2026-11-23, dari `BADAN_TERANG`. Nama lama menyebut
 * warnanya, dan warnanya sudah berganti dua kali: putih-abu (owner 2026-11-05
 * *"aku mau semua seragam backgroundnya jadi sama dengan beranda (putih)"*) →
 * GELAP + emas (owner 2026-11-23 *"warna ini lebih bagus terlihat elegan dan
 * mewah"*). Konstanta bernama TERANG yang isinya gelap adalah nama yang
 * berbohong (§3.7): pembaca berikutnya akan "memperbaiki"-nya kembali ke putih
 * karena namanya bilang begitu. Nama netral bertahan melewati ganti tema.
 *
 * ISINYA MENENTUKAN TEMA, dan dua kemungkinannya HARUS dipasang utuh —
 * mencampurnya adalah kerusakan paling senyap di seluruh berkas ini (nol error,
 * build hijau, halaman 200, cuma teks yang hilang dari layar):
 *   - TEMA GELAP (sekarang) = `"bg-latar latar-bercahaya"`, tanpa
 *     `tema-terang`. Seluruh komponen memang sudah berwarna dasar gelap;
 *     varian `terang:` cuma penimpanya. Begitu saklarnya tidak ada, semuanya
 *     pulang sendiri ke warna dasar itu — nol kelas yang perlu disentuh.
 *     ⚠️ `latar-bercahaya` (app/globals.css) DITAMBAHKAN 2026-11-24 dan
 *     bukan hiasan yang bisa dilepas begitu saja: owner memilihnya setelah
 *     MENOLAK versi rata yang angka warnanya sudah cocok dengan mockup. Ia
 *     cuma mengatur `background-image`, jadi tidak berebut properti dengan
 *     `bg-gelap-950` di sebelahnya — keduanya wajib berpasangan.
 *     🪤 Cahayanya TERTUTUP kalau ada anak yang mengecat latar PEKAT di
 *     atasnya. Tiga seksi sudah dibuat tembus karena itu (`FeaturedRow`,
 *     `TabKatalogTampilan`, `StripKatalog`) — kalau nanti ada yang
 *     "mengembalikan" `bg-gelap-950` ke sana, cahayanya hilang dari sebagian
 *     halaman tanpa satu pun error.
 *   - TEMA TERANG = `"tema-terang bg-zinc-100"`. `tema-terang` saklarnya
 *     (@custom-variant di app/globals.css); tanpa saklar itu `terang:text-...`
 *     DIAM saja, dan `bg-zinc-100` tanpa saklar = tulisan putih di atas putih.
 *
 * ⚠️ VARIAN `terang:` DI 18 BERKAS SENGAJA TIDAK DIHAPUS walau hari ini tak
 * satu pun menyala. Itu BUKAN kelalaian: mereka adalah jalan pulang ke tema
 * terang lewat SATU baris di bawah ini. Owner mengganti tema situs tiga kali
 * dalam satu hari (merah → hijau sage → gelap+emas), jadi membuang 40+ kelas
 * itu berarti membangunnya ulang dari nol pada pergantian berikutnya. Kalau
 * tema gelap sudah final berbulan-bulan, baru hapus — beserta
 * `@custom-variant terang` di app/globals.css dan tes yang memakunya.
 *
 * KENAPA SATU KONSTANTA, bukan diketik ulang di tiap halaman: ia dipakai
 * SEMBILAN halaman (`/`, `/beranda`, `/discover`, `/film`, `/katalog`,
 * `/shorts`, `/history`, `/my-list`). Ganti tema = satu baris ini, bukan
 * sembilan berkas yang salah satunya pasti tertinggal lalu jadi belang tanpa
 * satu pun error yang memberi tahu.
 *
 * ❗ BUKAN saudara `BADAN_TERANG_PENUH` di bawah: halaman masuk/daftar/profil
 * dan dashboard admin masih TERANG hari ini, dan itu keputusan yang belum
 * disentuh owner (pergantian hari ini cuma soal halaman katalog yang dia
 * lihat). Kalau nanti diminta seragam gelap, yang diubah blok itu.
 */
export const BADAN_SITUS = "bg-latar latar-bercahaya";

/**
 * LATAR BAR ATAS — warna identitas situs, dipakai `SearchBar`.
 *
 * ⚠️ NAMANYA BERUBAH 2026-11-23, dari `GRADASI_DRAMAKU`. Isinya sudah bukan
 * gradasi, dan nama yang menjanjikan gradasi membuat pembaca berikutnya
 * mencari arah `to-r` yang tidak ada — nama yang berbohong adalah kerusakan
 * senyap, bukan sekadar tidak rapi.
 *
 * RIWAYAT WARNA dalam SATU hari (2026-11-23): `from-rose-700 via-rose-600
 * to-pink-600` (merah-pink DramaKu, dikunci owner 2026-09-21) → `bg-sage-700`
 * (*"tema warna bisa kamu ubah jadi soft sage"*) → `sage-100` pucat
 * (*"lebih soft"*) → latar bergelombang dari gambar logo → **gelap + emas**
 * (*"warna ini lebih bagus, terlihat elegan dan mewah"*).
 * Titik pulang kalau tema sage mau dikembalikan: commit `25957c7`.
 *
 * ⚠️ GELOMBANGNYA TETAP ADA, cuma ganti warna. Gambar hijau `bar-latar.jpg`
 * diganti `bar-latar-emas.jpg` — bentuk piksel yang SAMA, dipetakan ke palet
 * emas (caranya ditulis di app/globals.css). Bentuk itu lahir dari EMPAT
 * penolakan owner berturut-turut, jadi membuangnya saat ganti tema berarti
 * mengulang empat putaran yang sama dari nol.
 *
 * Kehangatan permukaannya (`gelap-900`, coklat-kemerahan) BUKAN selera: emas
 * di atas abu netral terbaca sebagai kuning biasa; di atas coklat-kemerahan
 * ia terbaca sebagai emas. Kontras teks putih di atasnya **18,62:1**.
 *
 * Paletnya beserta aturan pasangan teksnya ada di app/globals.css — JANGAN
 * tulis nilai warnanya lagi di berkas lain. Dua tes memaku warna ini lewat
 * HTML hasil render (tests/strip-katalog.test.ts), jadi salinan yang
 * menyimpang akan terlihat sebagai kepala situs yang warnanya beda
 * antar-halaman.
 */
export const LATAR_BAR_MEREK = cn(
  // `relative` WAJIB di sini, BUKAN di dalam `.sapuan-gelombang`. Hiasannya
  // dipasang sebagai `::before` ber-`position:absolute`, jadi ia butuh induk
  // ber-posisi. Pernah ditaruh di kelas CSS-nya pada 2026-11-23 dan itu
  // menimpa `fixed` milik BottomNav: barnya lepas dari dasar layar lalu
  // mengalir ke ujung halaman — hilang dari pandangan, NOL error.
  "relative sapuan-gelombang",
  // Warna dasar kalau gambarnya belum/gagal dimuat. Sama dengan warna dasar
  // gambarnya, jadi bar tidak pernah berkedip jadi warna lain.
  "bg-gelap-900",
  // Garis emas tipis di dasar bar — pemisah ke isi halaman, sekaligus satu
  // sentuhan merek. Setipis itu sengaja: garis tebal membuat bar terlihat
  // seperti kotak yang ditempel, bukan bagian dari halaman.
  "border-b border-emas-700/40",
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
export const TEKS_BAR_MEREK = "text-white";

/** Sorotan hover/fokus di atas bar gelap — emas samar, bukan putih polos. */
export const SOROT_BAR_MEREK =
  "hover:bg-emas-500/15 focus-visible:bg-emas-500/15";

/**
 * TOMBOL UTAMA (ajakan bertindak) — "SEMUA", "TEMUKAN TONTONAN FAVORITMU".
 *
 * KENAPA ADA: sebelum 2026-11-23 gradasi `from-fuchsia-600 to-rose-600`
 * ditulis ULANG di TIGA berkas (`FeaturedRow`, `SeksiKatalog`,
 * `TabKatalogTampilan`). Salinan begitu pasti menyimpang cepat atau lambat,
 * dan menyimpangnya nol error — cuma tombol yang warnanya beda antar halaman.
 *
 * ⚠️ TEKSNYA GELAP, BUKAN PUTIH — dan ini titik yang paling gampang dilanggar
 * tanpa sadar. Di dua tema sebelumnya (merah, lalu hijau) tombol berwarna
 * selalu berteks putih, jadi refleksnya terbawa. Tapi amber itu warna TERANG.
 * Diukur pada tema anggur+amber 2026-11-24, teks gelap di sepanjang gradasi:
 * **10,36:1** di ujung terang, **4,95:1** di ujung tergelap — keduanya lolos
 * ambang 4,5:1. Teks putih cuma **1,81–3,79:1**, tulisan tombolnya praktis
 * lenyap. Dihitung, bukan dikira.
 *
 * ⚠️ BERGRADASI SEJAK 2026-11-24, dan itu bukan hiasan: di mockup yang
 * dikirim owner tiap bidang oranye memang gradasi tegak (terukur #fdb239 di
 * pita atas → #ec5706 di pita bawah), dan permintaannya *"sama persis"*.
 * Warna RATA terlihat jelas lebih datar disandingkan dengan contohnya.
 * `bg-gradient-to-b` (bukan `bg-linear-to-b`) dipilih supaya seragam dengan
 * 22 gradasi lain yang sudah ada di project ini.
 */
export const TOMBOL_UTAMA =
  "bg-gradient-to-b from-emas-400 to-emas-700 text-gelap-950 hover:from-emas-300 hover:to-emas-600 focus-visible:ring-2 focus-visible:ring-emas-300";

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
export const LATAR_PANEL_KATALOG_HP = "bg-gelap-900";

/**
 * BADAN TERANG PENUH — paletnya DIBALIK seluruhnya (app/globals.css).
 *
 * BEDANYA dengan `BADAN_SITUS` di atas, dan kapan memakai yang mana:
 *   - `BADAN_SITUS` cuma MENYALAKAN/MEMATIKAN varian `terang:` yang sudah
 *     ditulis satu per satu di komponen. Dipakai halaman KATALOG, yang
 *     komponennya (CatalogCard, FeaturedRow, …) sudah disiapkan untuk dua
 *     tema — hari ini saklarnya MATI, jadi halaman katalog gelap.
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
