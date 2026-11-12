"use client";

// Menu samping panel admin.
//
// JADI CLIENT COMPONENT sejak 2026-11-05 (owner: "kamu rapikan"): menu yang
// sedang dibuka kini DITANDAI. Sebelumnya seluruh menu tampil seragam, jadi
// admin tak punya petunjuk sedang berada di bagian mana — keluhan yang sama
// akarnya dengan "di-scroll sudah jadi satu".
//
// Penandaannya dihitung dari ALAMAT (pathname + hash), bukan dari prop yang
// dioper pemanggil: sidebar ini dipakai EMPAT halaman, dan menitipkan
// penandaan ke tiap pemanggil berarti halaman yang lupa mengirimnya diam-diam
// kehilangan penanda — tanpa error.
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ADS_ENABLED } from "@/lib/saklar-fitur";
import { parseBagianAdmin } from "@/lib/bagian-admin";
import {
  menuBagianPlayly,
  parseBagianPlayly,
  RUTE_PLAYLY,
} from "@/lib/bagian-playly";
import {
  Home,
  Plus,
  List,
  ListVideo,
  Users,
  Megaphone,
  Film,
  Star,
  Download,
  KeyRound,
  Webhook,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";

/** Satu baris menu yang bisa diklik. */
type MenuAdmin = { href: string; label: string; icon: LucideIcon };

/**
 * Sekelompok menu di bawah satu judul (divider).
 *
 * KENAPA ADA (owner 2026-11-06): "sidebar kiri video playly terlalu panjang
 * kamu jadikan divider". Satu menu "Video Playly" dulu membuka satu halaman
 * berisi TIGA panel besar bertumpuk; sekarang ketiganya punya barisnya sendiri
 * di menu, sehingga admin bisa langsung menuju yang dia cari.
 */
type GrupAdmin = { grup: string; icon: LucideIcon; items: MenuAdmin[] };

type EntriAdmin = MenuAdmin | GrupAdmin;

const adalahGrup = (e: EntriAdmin): e is GrupAdmin => "grup" in e;

// Tautan ditulis ABSOLUT ("/admin#dashboard", bukan "#dashboard") supaya menu
// ini tetap berfungsi saat dipakai di halaman admin lain — mis. setelan Playly
// yang punya alamatnya sendiri. Dari halaman /admin sendiri, hash-nya yang
// menentukan bagian mana yang ditampilkan (lib/bagian-admin.ts); di halaman
// Video Playly aturannya sama lewat lib/bagian-playly.ts.
const NAV_ITEMS: EntriAdmin[] = [
  { href: "/admin#dashboard", label: "Dashboard", icon: Home },
  { href: "/admin#tambah", label: "Tambah Drama", icon: Plus },
  { href: "/admin#daftar", label: "Daftar Drama", icon: List },
  {
    grup: "Video Playly",
    icon: Film,
    items: [
      // Urutannya mengikuti urutan KERJA, bukan abjad: tentukan dulu video
      // mana yang tayang + lengkapi datanya, baru isi link download, baru
      // (opsional) kaitkan ke drama.
      { href: `${RUTE_PLAYLY}#imdb`, label: "IMDb", icon: Star },
      // "Isi manual" (#isi-cepat) SENGAJA TIDAK ada di sini (owner 2026-11-11:
      // "pindahkan isi cepat ke filter yang ada di imdb biar lebih rapi").
      // Pintu masuknya kini duduk sebaris dengan saringan IMDb di
      // PlaylyVisibilityManager.tsx — tepat di sebelah "Belum ada IMDb", yaitu
      // daftar film yang justru butuh panel itu. Menu ini jadi lebih pendek,
      // dan pintunya berdiri di tempat kebutuhannya muncul.
      // 🪤 Jangan tambahkan kembali ke sini tanpa membuang yang di sana: dua
      // pintu ke panel yang sama membuat admin mengira keduanya beda layar.
      { href: `${RUTE_PLAYLY}#unduhan`, label: "Link download", icon: Download },
      { href: `${RUTE_PLAYLY}#daftar`, label: "Daftar video Playly", icon: ListVideo },
    ],
  },
  // Ditaruh tepat di bawah grup "Video Playly" karena keduanya menjawab
  // pertanyaan yang sama ("video Playly mana yang tampil?") lewat dua jalur
  // berbeda: yang atas untuk video yang KITA jemput, yang ini untuk video yang
  // PLAYLY kirim sendiri. Berjauhan di menu = admin mencari di tempat yang
  // salah saat sebuah video tidak muncul.
  { href: "/admin/webhooks/playly", label: "Webhook Playly", icon: Webhook },
  { href: "/admin/settings/playly", label: "Kunci Playly", icon: KeyRound },
  { href: "/admin#kelola-admin", label: "Kelola Admin", icon: Users },
  // "Keamanan (2FA)" DIBUANG dari sini 2026-11-07 atas permintaan owner: panel
  // 2FA-nya kini ada di /profile (seksi Keamanan), jadi menu ini jadi jalan
  // kedua ke pengaturan yang sama. Bagian `#keamanan` di app/admin/page.tsx
  // SENGAJA tidak ikut dihapus -- ia masih dirender saat halaman digulung,
  // dan membuangnya adalah perubahan cakupan yang belum diminta.
  // Menu iklan hanya ada saat saklarnya menyala (lib/saklar-fitur.ts) — kalau
  // tidak, menunya menuju bagian halaman yang sudah tidak digambar.
  ...(ADS_ENABLED
    ? [{ href: "/admin#iklan", label: "Iklan Sponsor", icon: Megaphone }]
    : []),
  { href: "/", label: "← Kembali ke web", icon: ArrowLeft },
];

/**
 * Aturan "hash kosong berarti bagian apa" untuk tiap halaman yang isinya
 * dipecah jadi bagian-bagian.
 *
 * Dikumpulkan di satu peta, bukan ditulis sebagai rentetan `if`: menambah
 * halaman ber-bagian berikutnya cukup menambah satu baris di sini, dan tidak
 * ada cabang yang bisa lupa diperbarui.
 */
const PARSER_BAGIAN: Record<string, (hash: string) => string> = {
  "/admin": parseBagianAdmin,
  [RUTE_PLAYLY]: parseBagianPlayly,
};

/**
 * Bagian yang sedang dibuka → bagian yang MEWAKILINYA di menu. Perlu karena
 * tidak setiap bagian punya baris menu sendiri: "Isi manual" dibuka dari
 * dalam panel IMDb, jadi yang menyala adalah menu IMDb.
 *
 * Halaman yang tidak terdaftar di sini memakai bagiannya apa adanya — jadi
 * menambah halaman ber-bagian berikutnya tidak perlu menyentuh peta ini.
 */
const BAGIAN_KE_MENU: Record<string, (bagian: string) => string> = {
  [RUTE_PLAYLY]: menuBagianPlayly,
};

export default function AdminSidebar() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  // Hash dibaca lewat efek, BUKAN saat render: `window` tidak ada saat HTML
  // dibuat di server, dan membacanya langsung membuat render pertama di browser
  // berbeda dari HTML server (hydration mismatch). Pembacaan awal "" lalu
  // disusul nilai sebenarnya adalah urutan yang aman.
  useEffect(() => {
    const baca = () => setHash(window.location.hash);
    baca();
    // `hashchange` saja tidak cukup: mengklik menu yang hash-nya SAMA dengan
    // yang sedang dibuka tidak memicu event itu. `click` menangkapnya supaya
    // penandaan tidak pernah tertinggal.
    window.addEventListener("hashchange", baca);
    window.addEventListener("click", baca);
    return () => {
      window.removeEventListener("hashchange", baca);
      window.removeEventListener("click", baca);
    };
  }, []);

  /**
   * Apakah sebuah menu sedang dibuka.
   *
   * Dua jenis menu diperlakukan berbeda, dan itu disengaja:
   * - menu ber-hash (`/admin#tambah`, `/admin/videos/playly#unduhan`) aktif
   *   saat kita BERADA di halaman itu DAN bagiannya cocok;
   * - menu biasa (`/admin/webhooks/playly`) aktif saat pathname-nya cocok.
   * Menyamakan keduanya membuat "Dashboard" ikut menyala di halaman Video
   * Playly — penanda yang berbohong, lebih menyesatkan daripada tanpa penanda.
   *
   * Hash yang masih kosong (render pertama) sengaja TIDAK diperlakukan khusus:
   * tiap parser sudah memulangkan bagian bawaan halamannya, jadi menu bawaan
   * langsung menyala tanpa menunggu alamat berisi.
   */
  const sedangDibuka = (href: string) => {
    if (href === "/") return false;
    const [basis, bagian] = href.split("#");
    if (!bagian) return pathname === href;
    if (pathname !== basis) return false;
    const parse = PARSER_BAGIAN[basis];
    if (!parse) return false;
    // Bagian yang sedang dibuka diterjemahkan dulu ke bagian yang mewakilinya
    // di menu; tanpa ini, bagian tanpa baris menu sendiri memadamkan sidebar.
    const keMenu = BAGIAN_KE_MENU[basis];
    const kini = parse(hash);
    return parse(bagian) === (keMenu ? keMenu(kini) : kini);
  };

  /**
   * Gambar satu baris menu. Dipakai baris biasa maupun anak grup — supaya
   * tampilan aktif/tidak aktif mustahil menyimpang antara keduanya.
   *
   * Ditulis sebagai FUNGSI penggambar, bukan komponen di dalam komponen:
   * komponen yang didefinisikan ulang tiap render dianggap React sebagai
   * komponen BARU, sehingga barisnya dibongkar-pasang ulang tanpa perlu.
   */
  const barisMenu = (item: MenuAdmin) => {
    const Icon = item.icon;
    const aktif = sedangDibuka(item.href);
    return (
      <Button
        key={item.href}
        asChild
        variant="ghost"
        className={cn(
          "h-auto justify-start gap-2 rounded-lg px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white",
          // Menu aktif: latar kuning lembut + garis tegas di tepi kiri.
          // Dua penanda sekaligus, bukan warna teks saja — warna tipis
          // mudah luput di daftar 10 baris, dan garis tepi tetap terbaca
          // walau latarnya ikut berubah tema.
          aktif &&
            "border-l-2 border-amber-500 bg-amber-500/15 font-semibold text-amber-700 hover:bg-amber-500/20 hover:text-amber-800",
        )}
      >
        <a href={item.href} aria-current={aktif ? "page" : undefined}>
          <Icon className="size-4" />
          {item.label}
        </a>
      </Button>
    );
  };

  return (
    <Card className="hidden gap-0 self-start rounded-2xl border-zinc-800 bg-zinc-900/40 p-4 py-4 md:sticky md:top-20 md:block">
      <div className="mb-4 px-2">
        <p className="text-xs uppercase tracking-wider text-zinc-500">
          Admin Panel
        </p>
        <p className="mt-1 text-base font-bold text-white">DramaKu</p>
      </div>
      <nav className="flex flex-col gap-1 text-sm">
        {NAV_ITEMS.map((entri) => {
          if (!adalahGrup(entri)) return barisMenu(entri);

          const IconGrup = entri.icon;
          return (
            // Grup dipagari garis atas-bawah supaya batasnya tegas: tanpa itu
            // menu "Webhook Playly" di bawahnya terbaca seolah ikut anggota
            // grup, padahal halamannya lain.
            <div
              key={entri.grup}
              className="my-1 border-y border-zinc-800 py-2"
            >
              <p className="flex items-center gap-2 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                <IconGrup className="size-3.5" aria-hidden="true" />
                {entri.grup}
              </p>
              {/* Anak grup di-indent + bergaris kiri: penanda hierarki yang
                  tetap terbaca walau judul grupnya tergulung dari layar. */}
              <div className="ml-4 flex flex-col gap-1 border-l border-zinc-800 pl-1">
                {entri.items.map(barisMenu)}
              </div>
            </div>
          );
        })}
      </nav>
    </Card>
  );
}
