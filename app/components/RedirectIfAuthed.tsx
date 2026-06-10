"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { readUser } from "@/lib/auth";

// Dipasang di halaman publik (landing). Kalau ternyata user sudah login,
// lempar ke halaman app — supaya link nyasar ke "/" tidak terasa "logout".
export default function RedirectIfAuthed({ to = "/beranda" }: { to?: string }) {
  const router = useRouter();
  useEffect(() => {
    if (readUser()) router.replace(to);
  }, [router, to]);
  return null;
}
