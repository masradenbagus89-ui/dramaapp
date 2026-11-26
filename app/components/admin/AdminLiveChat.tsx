"use client";

// Tab "Live Chat" di /admin/bantuan: kotak masuk percakapan member + balas.
// Layar lebar = daftar di kiri, percakapan di kanan. HP = bergantian.
//
// Utas yang sedang dibuka ditandai dibaca (PATCH) saat dibuka DAN tiap kali
// ada pesan member baru masuk selama terbuka — admin memang sedang melihatnya.
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePolling } from "@/app/components/usePolling";
import { DaftarPesanChat, KotakKetikChat, type HasilKirim } from "@/app/components/bantuan/IsiChat";
import type { PesanChat, UtasChat } from "@/lib/live-chat";

const JEDA_KOTAK_MASUK_MS = 10_000;
const JEDA_UTAS_TERBUKA_MS = 5_000;

type UtasAdmin = UtasChat & { belumDibaca: boolean };

const FORMAT_WAKTU = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function tandaiDibaca(utasId: string) {
  void fetch("/api/admin/chat", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ utasId }),
  }).catch(() => {});
}

export default function AdminLiveChat() {
  const [kotak, setKotak] = useState<UtasAdmin[] | null>(null);
  const [dipilih, setDipilih] = useState<string | null>(null);
  const [pesan, setPesan] = useState<PesanChat[]>([]);
  const [memuatUtas, setMemuatUtas] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  // Utas yang SEKARANG dibuka — jawaban yang tiba untuk utas sebelumnya
  // (admin keburu pindah) dibuang, bukan ditampilkan sebagai percakapan ini.
  const dipilihRef = useRef<string | null>(null);
  const jumlahPesanRef = useRef(0);

  const muatKotak = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/chat", { cache: "no-store" });
      const data = (await res.json()) as { utas?: UtasAdmin[]; error?: string };
      if (!res.ok || !data.utas) return setGalat(data.error ?? `Gagal memuat (HTTP ${res.status}).`);
      setGalat(null);
      setKotak(data.utas);
    } catch {
      setGalat("Koneksi terputus. Mencoba lagi otomatis…");
    }
  }, []);

  const muatUtas = useCallback(async () => {
    const utasId = dipilih;
    if (!utasId) return;
    try {
      const res = await fetch(`/api/admin/chat?utas=${utasId}`, { cache: "no-store" });
      const data = (await res.json()) as { pesan?: PesanChat[] };
      if (dipilihRef.current !== utasId || !res.ok || !data.pesan) return;
      const isi = data.pesan;
      // Pesan member baru masuk saat utas terbuka -> admin sedang melihatnya.
      if (jumlahPesanRef.current > 0 && isi.length > jumlahPesanRef.current && isi.at(-1)?.dari === "member") {
        tandaiDibaca(utasId);
      }
      jumlahPesanRef.current = isi.length;
      setPesan(isi);
    } catch {
      /* jaringan putus sesaat: tanya lagi di giliran berikutnya */
    } finally {
      if (dipilihRef.current === utasId) setMemuatUtas(false);
    }
  }, [dipilih]);

  usePolling(muatKotak, JEDA_KOTAK_MASUK_MS, true);
  usePolling(muatUtas, JEDA_UTAS_TERBUKA_MS, dipilih !== null);

  useEffect(() => {
    dipilihRef.current = dipilih;
    jumlahPesanRef.current = 0;
    setPesan([]);
    if (!dipilih) return;
    setMemuatUtas(true);
    tandaiDibaca(dipilih);
    // Hilangkan tanda "belum dibaca" seketika, tak menunggu giliran segar.
    setKotak((lama) => lama?.map((u) => (u.id === dipilih ? { ...u, belumDibaca: false } : u)) ?? lama);
    // Muat SEKARANG: jadwal berkala tak dimulai ulang saat pindah utas.
    void muatUtas();
  }, [dipilih, muatUtas]);

  const balas = useCallback(
    async (teks: string): Promise<HasilKirim> => {
      if (!dipilih) return { ok: false, pesan: "Pilih percakapan dulu." };
      try {
        const res = await fetch("/api/admin/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ utasId: dipilih, teks }),
        });
        const data = (await res.json().catch(() => ({}))) as { pesan?: PesanChat; error?: string };
        if (!res.ok || !data.pesan) return { ok: false, pesan: data.error ?? "Balasan gagal terkirim." };
        const baru = data.pesan;
        jumlahPesanRef.current += 1;
        setPesan((lama) => [...lama, baru]);
        void muatKotak();
        return { ok: true };
      } catch {
        return { ok: false, pesan: "Koneksi terputus. Coba lagi." };
      }
    },
    [dipilih, muatKotak],
  );

  const utasAktif = kotak?.find((u) => u.id === dipilih) ?? null;

  return (
    <div className="space-y-3">
      {galat && (
        <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {galat}
        </p>
      )}
      <div className="grid h-[70dvh] min-h-[420px] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 md:grid-cols-[280px_1fr]">
        {/* Daftar percakapan — di HP disembunyikan saat satu utas dibuka. */}
        <div className={cn("overflow-y-auto border-zinc-800 md:border-r", dipilih && "hidden md:block")}>
          {kotak === null ? (
            <div className="flex justify-center py-12 text-zinc-500">
              <Loader2 className="size-5 animate-spin" aria-label="Memuat percakapan" />
            </div>
          ) : kotak.length === 0 ? (
            <p className="p-6 text-center text-sm text-zinc-500">Belum ada member yang mengirim pesan.</p>
          ) : (
            <ul>
              {kotak.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => setDipilih(u.id)}
                    className={cn(
                      "w-full border-b border-zinc-900 px-4 py-3 text-left transition-colors hover:bg-zinc-900",
                      dipilih === u.id && "bg-zinc-900",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("truncate text-sm", u.belumDibaca ? "font-bold text-white" : "text-zinc-200")}>
                        {u.namaMember}
                      </span>
                      {u.belumDibaca && (
                        <span className="size-2.5 shrink-0 rounded-full bg-rose-500" aria-label="Belum dibaca" />
                      )}
                    </div>
                    <p className="truncate text-xs text-zinc-500">{u.email}</p>
                    <p className={cn("mt-1 truncate text-xs", u.belumDibaca ? "text-zinc-200" : "text-zinc-500")}>
                      {u.terakhirDari === "admin" ? "Kamu: " : ""}
                      {u.terakhirTeks}
                    </p>
                    <p className="mt-0.5 text-[11px] text-zinc-600">{FORMAT_WAKTU.format(new Date(u.terakhirPada))}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Isi percakapan. */}
        <div className={cn("flex min-h-0 flex-col", !dipilih && "hidden md:flex")}>
          {!dipilih ? (
            <p className="m-auto p-6 text-center text-sm text-zinc-500">Pilih percakapan di sebelah kiri.</p>
          ) : (
            <>
              <div className="flex shrink-0 items-center gap-2 border-b border-zinc-800 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => setDipilih(null)}
                  className="rounded-full p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white md:hidden"
                  aria-label="Kembali ke daftar percakapan"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{utasAktif?.namaMember ?? "Percakapan"}</p>
                  <p className="truncate text-xs text-zinc-500">{utasAktif?.email}</p>
                </div>
              </div>
              {memuatUtas ? (
                <div className="flex flex-1 items-center justify-center text-zinc-500">
                  <Loader2 className="size-5 animate-spin" aria-label="Memuat pesan" />
                </div>
              ) : (
                <DaftarPesanChat pesan={pesan} sudutPandang="admin" kosong="Belum ada pesan." />
              )}
              <KotakKetikChat onKirim={balas} placeholder="Balas member…" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
