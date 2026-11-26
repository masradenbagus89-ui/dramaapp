import Link from "next/link";
import { BADAN_TERANG_PENUH } from "@/app/components/beranda/shell";
import { cn } from "@/lib/utils";
import { nextAman, pesanGalatLogin } from "@/lib/tujuan-login";
import FormMasuk, { TautanBawahLogin } from "./FormMasuk";

function satu(nilai: string | string[] | undefined): string | undefined {
  return Array.isArray(nilai) ? nilai[0] : nilai;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ galat?: string | string[]; next?: string | string[] }>;
}) {
  const sp = await searchParams;
  const next = nextAman(satu(sp.next));
  const pesan = pesanGalatLogin(satu(sp.galat));

  return (
    <div className={cn("min-h-screen", BADAN_TERANG_PENUH)}>
      <header className="border-b border-zinc-900">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            {/* Lambang LAYARINDO (alasan lengkap di TopNav.tsx) — `/logo-mark.png`
                lama isinya huruf "D" bermahkota milik nama DramaKu. `w-auto`
                karena lambang baru mendatar (134×96), bukan persegi. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-layarindo-lambang.png" alt="Layarindo" width={50} height={36} className="h-9 w-auto object-contain" />
            <span className="text-lg font-bold text-white">Layarindo</span>
          </Link>
          <Link href="/" className="text-sm text-zinc-400 hover:text-white">
            ← Kembali
          </Link>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            {/* Logo LAYARINDO penuh — `/logo.png` lama bertuliskan "DRAMA KU"
                besar-besar, jadi orang yang mendaftar justru melihat nama lama.
                ⚠️ `h-14`, bukan `h-28`: logo lama POTRET (640×704), yang baru
                MENDATAR (423×96). Pada `h-28` lebarnya jadi ~493px — melewati
                kartu `max-w-md` (448px). `h-14` memberi lebar ~247px, seimbang
                di dalam kartu. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-layarindo.png" alt="Layarindo" className="mx-auto mb-4 h-14 w-auto max-w-full" />
            <h1 className="title-gold text-3xl leading-tight md:text-4xl">
              Selamat datang
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Masuk ke akun Layarindo kamu untuk lanjut menonton.
            </p>
          </div>

          <FormMasuk pesan={pesan} next={next} />
          <TautanBawahLogin />

          <p className="mt-6 text-center text-[11px] text-zinc-600">
            Baru diangkat jadi admin? Keluar dari sesi penonton dulu tidak wajib
            — cukup masuk lagi di sini dengan password admin, yang berbeda dari
            password akun penontonmu. Belum bisa masuk sebagai penonton? Akun
            penonton kini butuh password; kalau kamu memakai situs ini sebelum
            password diberlakukan, daftar ulang dengan email yang sama.
          </p>
        </div>
      </div>
    </div>
  );
}
