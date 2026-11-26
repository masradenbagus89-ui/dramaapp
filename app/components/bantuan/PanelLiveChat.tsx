"use client";

// Jendela Live Chat member -> admin. Status percakapannya datang dari
// useLiveChatMember milik pemanggil (bukan dibuat di sini) supaya tombol
// pembukanya bisa menampilkan titik "ada balasan baru" walau jendela tertutup.
import { Loader2 } from "lucide-react";
import JendelaBantuan, { PerluMasuk } from "./JendelaBantuan";
import { DaftarPesanChat, KotakKetikChat } from "./IsiChat";
import type { useLiveChatMember } from "./useLiveChatMember";

export default function PanelLiveChat({
  open,
  onClose,
  chat,
}: {
  open: boolean;
  onClose: () => void;
  chat: ReturnType<typeof useLiveChatMember>;
}) {
  return (
    <JendelaBantuan
      open={open}
      onClose={onClose}
      judul="Live Chat Admin"
      subjudul="Balasan biasanya muncul di sini dalam beberapa menit"
    >
      {chat.perluMasuk ? (
        <PerluMasuk alasan="Masuk dulu untuk mengobrol dengan admin. Riwayat chat tersimpan di akunmu." />
      ) : !chat.dimuat ? (
        <div className="flex flex-1 items-center justify-center p-8 text-zinc-400">
          <Loader2 className="size-5 animate-spin" aria-label="Memuat percakapan" />
        </div>
      ) : (
        <>
          <div className="flex min-h-64 flex-1 flex-col overflow-hidden">
            <DaftarPesanChat
              pesan={chat.pesan}
              sudutPandang="member"
              kosong="Ada kendala atau pertanyaan? Tulis pesan — admin akan membalas di sini."
            />
          </div>
          <KotakKetikChat onKirim={chat.kirim} />
        </>
      )}
    </JendelaBantuan>
  );
}
