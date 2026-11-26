"use client";

// Dua tab /admin/bantuan: Laporan Video & Live Chat, dengan angka "perlu
// ditangani" di judul tab (sumber yang sama dengan LencanaBantuan di menu).
//
// Tab yang tak aktif TIDAK dirender (perilaku bawaan Radix Tabs), jadi
// polling-nya ikut berhenti — admin yang membuka Laporan tak ikut membebani
// database dengan pertanyaan chat tiap 5 detik.
import { useCallback, useState } from "react";
import { Flag, MessagesSquare } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePolling } from "@/app/components/usePolling";
import AdminLaporanVideo from "./AdminLaporanVideo";
import AdminLiveChat from "./AdminLiveChat";

const JEDA_RINGKASAN_MS = 15_000;

function Angka({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 text-[11px] font-bold leading-5 text-white">
      {n > 99 ? "99+" : n}
    </span>
  );
}

export default function PusatBantuanAdmin() {
  const [ringkas, setRingkas] = useState({ laporanPending: 0, chatBelumDibaca: 0 });

  const tanya = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/bantuan", { cache: "no-store" });
      if (res.ok) setRingkas(await res.json());
    } catch {
      /* angka tab hanya pengingat; isi tab punya pesan galatnya sendiri */
    }
  }, []);
  usePolling(tanya, JEDA_RINGKASAN_MS, true);

  return (
    <Tabs defaultValue="laporan" className="gap-4">
      <TabsList className="bg-zinc-900">
        <TabsTrigger value="laporan" className="gap-1.5 data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
          <Flag className="size-4" /> Laporan Video
          <Angka n={ringkas.laporanPending} />
        </TabsTrigger>
        <TabsTrigger value="chat" className="gap-1.5 data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
          <MessagesSquare className="size-4" /> Live Chat
          <Angka n={ringkas.chatBelumDibaca} />
        </TabsTrigger>
      </TabsList>
      <TabsContent value="laporan">
        <AdminLaporanVideo />
      </TabsContent>
      <TabsContent value="chat">
        <AdminLiveChat />
      </TabsContent>
    </Tabs>
  );
}
