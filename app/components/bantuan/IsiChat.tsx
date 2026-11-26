"use client";

// Potongan tampilan Live Chat yang dipakai DUA sisi: jendela member
// (PanelLiveChat) dan dashboard admin (AdminLiveChat). Bedanya cuma sudut
// pandang — gelembung "milik sendiri" di kanan berwarna amber.
import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MAKS_PANJANG_PESAN, type PengirimChat, type PesanChat } from "@/lib/live-chat";

export type HasilKirim = { ok: true } | { ok: false; pesan: string };

const FORMAT_JAM = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function DaftarPesanChat({
  pesan,
  sudutPandang,
  kosong,
}: {
  pesan: PesanChat[];
  sudutPandang: PengirimChat;
  kosong: React.ReactNode;
}) {
  const bawahRef = useRef<HTMLDivElement>(null);
  const jumlah = pesan.length;

  // Gulir ke pesan terbaru tiap kali ada pesan masuk/terkirim.
  useEffect(() => {
    bawahRef.current?.scrollIntoView({ block: "end" });
  }, [jumlah]);

  if (jumlah === 0) {
    return <div className="flex-1 p-6 text-center text-sm text-zinc-400">{kosong}</div>;
  }

  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
      {pesan.map((p) => {
        const milikSendiri = p.dari === sudutPandang;
        return (
          <div key={p.id} className={cn("flex flex-col", milikSendiri ? "items-end" : "items-start")}>
            <div
              className={cn(
                "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm",
                milikSendiri
                  ? "rounded-br-sm bg-amber-400 text-zinc-950"
                  : "rounded-bl-sm bg-zinc-800 text-zinc-100",
              )}
            >
              {p.teks}
            </div>
            <span className="mt-1 text-[11px] text-zinc-500">
              {milikSendiri ? "Kamu" : p.namaPengirim}
              {p.dari === "admin" && !milikSendiri && " · Admin"} · {FORMAT_JAM.format(new Date(p.dikirimPada))}
            </span>
          </div>
        );
      })}
      <div ref={bawahRef} />
    </div>
  );
}

export function KotakKetikChat({
  onKirim,
  placeholder = "Tulis pesan…",
}: {
  onKirim: (teks: string) => Promise<HasilKirim>;
  placeholder?: string;
}) {
  const [teks, setTeks] = useState("");
  const [mengirim, setMengirim] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const kirim = async () => {
    const bersih = teks.trim();
    if (!bersih || mengirim) return;
    setMengirim(true);
    setGalat(null);
    const hasil = await onKirim(bersih);
    setMengirim(false);
    // Teks hanya dikosongkan kalau benar terkirim — gagal tak boleh menghapus ketikan.
    if (hasil.ok) setTeks("");
    else setGalat(hasil.pesan);
  };

  return (
    <div className="shrink-0 border-t border-zinc-800 p-3">
      {galat && (
        <p role="alert" className="mb-2 text-xs text-rose-300">
          {galat}
        </p>
      )}
      <div className="flex items-end gap-2">
        <Textarea
          value={teks}
          maxLength={MAKS_PANJANG_PESAN}
          onChange={(e) => setTeks(e.target.value)}
          onKeyDown={(e) => {
            // Enter = kirim, Shift+Enter = baris baru (kebiasaan aplikasi chat).
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void kirim();
            }
          }}
          placeholder={placeholder}
          aria-label="Tulis pesan"
          rows={1}
          className="max-h-32 min-h-10 resize-none border-zinc-800 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500"
        />
        <Button
          type="button"
          size="icon"
          onClick={() => void kirim()}
          disabled={mengirim || !teks.trim()}
          aria-label="Kirim pesan"
          className="size-10 shrink-0 rounded-full bg-amber-400 text-zinc-950 hover:bg-amber-300"
        >
          {mengirim ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
