"use client";

// Halaman AKUN penonton/admin (/profile).
//
// KEPUTUSAN OWNER 2026-11-07: halaman ini murni PENGATURAN AKUN. Tiga baris
// konten yang dulu ada di sini -- "Lanjut Menonton", "Riwayat Terbaru", dan
// "Favorit" -- dipindahkan/dihapus:
//   - Lanjut Menonton + Riwayat Terbaru  -> rumahnya /history ("Riwayat tontonan")
//   - Favorit                            -> rumahnya /my-list ("Daftar Saya")
// Keduanya tetap terjangkau satu klik lewat menu di balik foto profil
// (app/components/MenuAkun.tsx), jadi nol jalan yang hilang.
//
// "Menu Cepat" (DashboardMenu) DIBUANG 2026-11-07 atas permintaan owner: dari
// lima tombolnya, DUA memang rusak -- "Download" menuju /history?tab=downloads
// padahal /history nol menangani parameter `tab`, dan "Bantuan" menuju halaman
// LOGIN. Karena menu itu satu-satunya pintu tersisa ke /my-list, "Favorit"
// dipindahkan ke MenuAkun supaya halamannya tidak jadi yatim.
//
// 🪤 Yang ditemukan saat memindahkannya: "Lanjut Menonton" dan "Riwayat Terbaru"
// sama-sama memanggil getContinueWatching() dengan argumen yang sama, jadi
// keduanya menampilkan daftar yang nyaris identik -- dua judul berbeda untuk isi
// yang sama. Itu sebabnya halaman ini terbaca berulang.
//
// Efek samping yang disengaja: halaman ini TIDAK lagi memanggil /api/dramas.
// Dulu seluruh katalog diunduh hanya untuk menggambar tiga baris kartu; sekarang
// pengaturan akun tidak butuh satu pun data drama.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AVATAR_COLORS,
  clearUser,
  getAvatarClass,
  readUser,
  writeUser,
  type User,
} from "@/lib/auth";
import CoinWallet from "@/app/components/CoinWallet";
import RecoverySection from "@/app/components/RecoverySection";
import AdBanner from "@/app/components/AdBanner";
import AdminPasswordSettings from "@/app/components/admin/AdminPasswordSettings";
import TwoFactorSettings from "@/app/components/TwoFactorSettings";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Check, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { AKUN_PENONTON_ENABLED } from "@/lib/saklar-fitur";
import { BADAN_TERANG_PENUH } from "@/app/components/beranda/shell";

const MAKS_PANJANG_NAMA = 40;

/** Judul seksi, dipakai berulang supaya jarak & ukurannya tidak melenceng. */
function JudulSeksi({
  ikon,
  teks,
  keterangan,
}: {
  ikon: React.ReactNode;
  teks: string;
  keterangan: string;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        <span className="text-amber-400">{ikon}</span>
        <h2 className="text-lg font-bold text-white">{teks}</h2>
      </div>
      <p className="mt-0.5 text-xs text-zinc-400">{keterangan}</p>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string>("");
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    setMounted(true);
    const tersimpan = readUser();
    setUser(tersimpan);
    // Form diisi nilai yang berlaku sejak awal: formnya sekarang SELALU
    // tampil (tidak lagi di balik tombol "Edit"), jadi kotak kosong akan
    // terbaca seperti nama yang hilang.
    if (tersimpan) {
      setEditName(tersimpan.name);
      setEditColor(tersimpan.avatarColor || AVATAR_COLORS[0].className);
    }
  }, []);

  const onLogout = () => {
    if (!confirm("Yakin mau keluar dari akun?")) return;
    clearUser();
    router.push("/");
  };

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      setSaveMsg({ type: "error", text: "Nama tidak boleh kosong." });
      return;
    }
    if (trimmed.length > MAKS_PANJANG_NAMA) {
      setSaveMsg({ type: "error", text: `Nama maksimal ${MAKS_PANJANG_NAMA} karakter.` });
      return;
    }
    const updated: User = {
      ...user,
      name: trimmed,
      avatarColor: editColor || undefined,
    };
    writeUser(updated);
    setUser(updated);
    setSaveMsg({ type: "ok", text: "Perubahan tersimpan." });
  };

  const sudahLogin = mounted && Boolean(user);
  const adalahAdmin = sudahLogin && user?.role === "admin";

  return (
    <div className={BADAN_TERANG_PENUH}>
      <div className="mx-auto max-w-2xl px-4 pb-10 pt-6 md:px-6">
        {/* Kepala: siapa yang sedang masuk */}
        <Card className="border-zinc-800 bg-zinc-900/50 py-4">
          <CardContent className="px-4">
            <div className="flex items-center gap-4">
              <Avatar size="lg" className="h-16 w-16">
                <AvatarFallback
                  className={cn(
                    "bg-gradient-to-br text-2xl font-bold text-black",
                    getAvatarClass(user),
                  )}
                >
                  {sudahLogin && user ? user.name.charAt(0).toUpperCase() : "T"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                {sudahLogin && user ? (
                  <>
                    <div className="flex items-center gap-2">
                      <h1 className="truncate text-lg font-semibold text-white">{user.name}</h1>
                      <Badge
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                          user.role === "admin"
                            ? "bg-amber-400/20 text-amber-300"
                            : "bg-zinc-700 text-zinc-300",
                        )}
                      >
                        {user.role}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-zinc-400">{user.email}</p>
                  </>
                ) : (
                  <>
                    <h1 className="text-lg font-semibold text-white">Tamu</h1>
                    <p className="text-xs text-zinc-400">Belum login · Mode tamu</p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Belum login: katakan apa yang hilang, jangan cuma menyembunyikan
            formnya. Form pengaturan yang lenyap tanpa penjelasan terbaca
            seperti halaman rusak. */}
        {mounted && !user && (
          <Card className="mt-4 border-zinc-800 bg-zinc-900/50">
            <CardContent className="px-4 py-4">
              <p className="text-sm text-zinc-300">
                Pengaturan akun — nama, warna avatar, dan keamanan — baru bisa diubah setelah
                masuk.
              </p>
              {AKUN_PENONTON_ENABLED ? (
                <div className="mt-3 flex gap-2">
                  <Button
                    asChild
                    variant="outline"
                    className="flex-1 rounded-full border-zinc-700 bg-transparent py-3 font-semibold text-white hover:border-amber-400 hover:text-amber-400"
                  >
                    <Link href="/login">Masuk</Link>
                  </Button>
                  <Button
                    asChild
                    className="flex-1 rounded-full bg-amber-400 py-3 font-bold text-black hover:bg-amber-300"
                  >
                    <Link href="/daftar">Daftar</Link>
                  </Button>
                </div>
              ) : (
                /* Pendaftaran penonton sedang DIMATIKAN (lib/saklar-fitur.ts).
                   Menampilkan tombol "Daftar" yang menuju halaman mati lebih
                   buruk daripada mengatakan keadaannya apa adanya. */
                <p className="mt-2 text-xs text-zinc-400">
                  Pendaftaran akun penonton belum dibuka. Pengelola situs masuk lewat halaman
                  login admin.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {sudahLogin && user && (
          <>
            {/* ── Akun ─────────────────────────────────────────────── */}
            <section id="akun" className="mt-6 scroll-mt-20">
              <JudulSeksi
                ikon={<UserRound className="size-5" />}
                teks="Akun"
                keterangan="Nama dan warna avatar yang tampil di seluruh situs."
              />
              <Card className="border-zinc-800 bg-zinc-900/50">
                <CardContent className="px-4 py-4">
                  <form onSubmit={onSave}>
                    <Label htmlFor="profile-name" className="text-zinc-300">
                      Nama
                    </Label>
                    <Input
                      id="profile-name"
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={MAKS_PANJANG_NAMA}
                      className="mt-1 rounded-lg border-zinc-700 bg-zinc-900 text-white focus-visible:border-amber-400 focus-visible:ring-0"
                    />

                    <div className="mt-4">
                      <p className="text-sm font-medium text-zinc-300">Warna avatar</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {AVATAR_COLORS.map((c) => {
                          const active = editColor === c.className;
                          return (
                            <Button
                              key={c.id}
                              type="button"
                              size="icon"
                              onClick={() => setEditColor(c.className)}
                              title={c.label}
                              aria-label={`Warna avatar ${c.label}`}
                              aria-pressed={active}
                              className={cn(
                                "relative h-10 w-10 rounded-full bg-gradient-to-br transition-transform",
                                c.className,
                                active
                                  ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-zinc-900"
                                  : "hover:scale-105",
                              )}
                            >
                              {active && (
                                <Check
                                  className="absolute inset-0 m-auto h-5 w-5 text-white"
                                  strokeWidth={3}
                                />
                              )}
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    {saveMsg && (
                      <div
                        className={cn(
                          "mt-3 rounded-lg border px-3 py-2 text-sm",
                          saveMsg.type === "ok"
                            ? "border-emerald-700 bg-emerald-900/30 text-emerald-300"
                            : "border-red-700 bg-red-900/30 text-red-300",
                        )}
                      >
                        {saveMsg.text}
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="mt-4 w-full rounded-full bg-amber-400 py-2.5 font-bold text-black hover:bg-amber-300"
                    >
                      Simpan perubahan
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </section>

            {/* ── Keamanan ─────────────────────────────────────────── */}
            {adalahAdmin && (
              <section id="keamanan" className="mt-8 scroll-mt-20">
                <JudulSeksi
                  ikon={<ShieldCheck className="size-5" />}
                  teks="Keamanan"
                  keterangan="Password pribadi dan verifikasi 2 langkah untuk akun pengelola."
                />
                {/* Komponen yang SAMA dipakai panel admin -- sengaja dipakai
                    ulang, bukan ditulis ulang. Server mengenali admin dari
                    cookie sesi (bukan dari isian), jadi membukanya di halaman
                    ini tidak menambah satu pun permukaan serangan: permintaan
                    dari sesi non-admin tetap dijawab 403. */}
                <div className="space-y-4">
                  <AdminPasswordSettings />
                  <TwoFactorSettings />
                </div>
              </section>
            )}

            {/* Kode pemulihan hanya relevan untuk akun penonton; admin punya
                jalur password sendiri di seksi Keamanan di atas. */}
            {!adalahAdmin && (
              <section className="mt-8">
                <JudulSeksi
                  ikon={<ShieldCheck className="size-5" />}
                  teks="Keamanan"
                  keterangan="Kode pemulihan untuk masuk kembali kalau password lupa."
                />
                <RecoverySection />
              </section>
            )}
          </>
        )}

        {/* ── Premium / Koin ─────────────────────────────────────── */}
        <section id="premium" className="mt-8 scroll-mt-20">
          <CoinWallet />
        </section>

        {/* Slot iklan otomatis — passive income; fallback iklan manual/promo. */}
        <AdBanner className="mt-8" />

        {sudahLogin && user && (
          <Button
            type="button"
            variant="outline"
            onClick={onLogout}
            className="mt-8 flex h-auto w-full items-center justify-center gap-2 rounded-2xl border-zinc-800 bg-zinc-900/50 py-3 font-semibold text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Keluar dari akun
          </Button>
        )}

        <p className="mt-6 text-center text-[11px] text-zinc-600">DramaKu v0.1 · Prototype</p>
      </div>
    </div>
  );
}
