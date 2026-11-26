"use client";

// Satu sumber status tombol Report Video + Live Chat di bawah pemutar.
//
// Dipakai DUA tempat dengan gaya tombol berbeda — rail ikon di pemutar drama
// (ActionRail) dan baris tombol di halaman Playly (BarisBantuanVideo). Yang
// sama (status buka/tutup + kedua jendelanya) ditaruh di sini supaya keduanya
// tak punya salinan aturan sendiri-sendiri.
import { useCallback, useState } from "react";
import type { VideoDilaporkan } from "@/lib/laporan-video";
import ModalLaporanVideo from "./ModalLaporanVideo";
import PanelLiveChat from "./PanelLiveChat";
import { useLiveChatMember } from "./useLiveChatMember";

export function useBantuanVideo(video: VideoDilaporkan) {
  const [laporanOpen, setLaporanOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const chat = useLiveChatMember(chatOpen);

  const tutupLaporan = useCallback(() => setLaporanOpen(false), []);
  const tutupChat = useCallback(() => setChatOpen(false), []);

  const jendela = (
    <>
      <ModalLaporanVideo open={laporanOpen} onClose={tutupLaporan} video={video} />
      <PanelLiveChat open={chatOpen} onClose={tutupChat} chat={chat} />
    </>
  );

  return {
    bukaLaporan: () => setLaporanOpen(true),
    bukaChat: () => setChatOpen(true),
    /** Titik notifikasi di tombol Chat (hanya saat jendelanya tertutup). */
    adaBalasanBaru: chat.adaBaru && !chatOpen,
    /** Render SEKALI oleh pemanggil, di luar elemen ber-z-index (lihat ActionRail). */
    jendela,
  };
}
