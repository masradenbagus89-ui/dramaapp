"use client";

// Status Live Chat member: isi percakapan, tanda "ada balasan baru", kirim.
//
// Jendela terbuka -> tanya isi tiap JEDA_TERBUKA_MS dan tandai dibaca begitu
// ada balasan admin. Tertutup -> hanya tanya ringkas (ada balasan baru?) tiap
// JEDA_TERTUTUP_MS, supaya ikon Chat bisa memberi titik notifikasi tanpa
// mengunduh isi percakapan. Tamu tidak bertanya sama sekali.
import { useCallback, useState } from "react";
import { usePolling } from "../usePolling";
import { usePenonton } from "../usePenonton";
import type { PesanChat } from "@/lib/live-chat";
import type { HasilKirim } from "./IsiChat";

const JEDA_TERBUKA_MS = 5_000;
const JEDA_TERTUTUP_MS = 60_000;

export function useLiveChatMember(terbuka: boolean) {
  const { user, mounted } = usePenonton();
  const login = mounted && Boolean(user);
  const [pesan, setPesan] = useState<PesanChat[]>([]);
  const [adaBaru, setAdaBaru] = useState(false);
  const [dimuat, setDimuat] = useState(false);
  const [perluMasuk, setPerluMasuk] = useState(false);

  const tandaiDibaca = useCallback(() => {
    setAdaBaru(false);
    void fetch("/api/chat", { method: "PATCH" }).catch(() => {});
  }, []);

  const muatIsi = useCallback(async () => {
    try {
      const res = await fetch("/api/chat", { cache: "no-store" });
      if (res.status === 401) return setPerluMasuk(true);
      if (!res.ok) return;
      const data = (await res.json()) as { pesan: PesanChat[]; adaBaru: boolean };
      setPesan(data.pesan);
      setPerluMasuk(false);
      setDimuat(true);
      // Jendela sedang terbuka = member sedang melihatnya.
      if (data.adaBaru) tandaiDibaca();
    } catch {
      /* jaringan putus sesaat: biarkan isi lama, tanya lagi di giliran berikutnya */
    }
  }, [tandaiDibaca]);

  const muatRingkas = useCallback(async () => {
    try {
      const res = await fetch("/api/chat?ringkas=1", { cache: "no-store" });
      if (!res.ok) return;
      setAdaBaru(((await res.json()) as { adaBaru: boolean }).adaBaru);
    } catch {
      /* sama seperti di atas */
    }
  }, []);

  usePolling(muatIsi, JEDA_TERBUKA_MS, login && terbuka);
  usePolling(muatRingkas, JEDA_TERTUTUP_MS, login && !terbuka);

  const kirim = useCallback(async (teks: string): Promise<HasilKirim> => {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teks }),
      });
      const data = (await res.json().catch(() => ({}))) as { pesan?: PesanChat; error?: string };
      if (res.status === 401) {
        setPerluMasuk(true);
        return { ok: false, pesan: "Sesi habis. Masuk lagi." };
      }
      if (!res.ok || !data.pesan) return { ok: false, pesan: data.error ?? "Pesan gagal terkirim." };
      const baru = data.pesan;
      setPesan((lama) => [...lama, baru]);
      return { ok: true };
    } catch {
      return { ok: false, pesan: "Koneksi terputus. Coba lagi." };
    }
  }, []);

  return { login, mounted, pesan, adaBaru, dimuat, perluMasuk: perluMasuk || (mounted && !user), kirim };
}
