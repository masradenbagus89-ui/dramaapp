"use client";

// Siapa yang sedang membuka situs — SATU sumber untuk seluruh kepala situs.
//
// Kenapa dipisah ke berkas sendiri: aturan ini tadinya hidup dalam dua salinan
// yang hampir sama (`TopNav` dan `KepalaKatalog`), dan sejak `MenuAkun` lahir
// ia dibutuhkan di tempat ketiga. Tiga salinan dari logika yang sama = cepat
// atau lambat salah satunya tertinggal saat aturannya berubah, dan akibatnya
// SENYAP: kepala situs yang satu menganggap penonton sudah login sementara yang
// lain menganggap belum.
//
// `mounted` WAJIB dipakai pemanggil sebelum menggambar apa pun yang bergantung
// pada `user`: `readUser()` membaca localStorage yang tidak ada di server, jadi
// render pertama HARUS sama dengan hasil server (belum login). Kalau tidak,
// React membuang seluruh pohon dan tampilannya berkedip.
import { useEffect, useState } from "react";
import {
  fetchUserRole,
  needsAdminRelogin,
  readUser,
  type User,
} from "@/lib/auth";

export type Penonton = {
  user: User | null;
  mounted: boolean;
  /** Akunnya sudah diangkat jadi admin, tapi sesi di browser masih penonton. */
  perluMasukUlang: boolean;
};

export function usePenonton(): Penonton {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [perluMasukUlang, setPerluMasukUlang] = useState(false);

  useEffect(() => {
    setMounted(true);
    let batal = false;
    const terapkan = () => {
      const u = readUser();
      setUser(u);
      if (!u || u.role === "admin") {
        setPerluMasukUlang(false);
        return;
      }
      void fetchUserRole(u.email).then((role) => {
        if (batal) return;
        // Dibaca ULANG, bukan memakai `u` dari atas: jawaban server bisa tiba
        // sesudah penonton berganti akun, dan menerapkannya ke akun yang sudah
        // bukan pemilik sesi berarti memasang peringatan milik orang lain.
        const terbaru = readUser();
        if (!terbaru || terbaru.email !== u.email) return;
        setPerluMasukUlang(needsAdminRelogin(terbaru, role === "admin"));
      });
    };
    terapkan();
    const dengar = () => terapkan();
    window.addEventListener("dramaku:auth-changed", dengar);
    return () => {
      batal = true;
      window.removeEventListener("dramaku:auth-changed", dengar);
    };
  }, []);

  return { user, mounted, perluMasukUlang };
}
