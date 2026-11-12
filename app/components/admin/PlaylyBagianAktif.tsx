"use client";

// Penampil BAGIAN halaman Video Playly — satu panel pada satu waktu.
//
// KENAPA ADA (owner 2026-11-06): "sidebar kiri video playly terlalu panjang
// kamu jadikan divider". Tiga panel besar yang dulu bertumpuk kini dipilih
// lewat menu; aturan "alamat mana = panel mana" ada di lib/bagian-playly.ts.
//
// Panel datang sebagai PROP (ReactNode), bukan di-import di sini: ketiganya
// butuh data yang hanya bisa diambil di server (kunci Playly tidak boleh
// sampai ke browser), jadi halaman server yang merakitnya dan komponen ini
// hanya memilih mana yang terlihat.
//
// ⚠️ PANEL YANG TIDAK DIBUKA DISEMBUNYIKAN, BUKAN DILEPAS DARI HALAMAN.
// Bukan pilihan gaya: isian link download yang belum ditekan Simpan hidup di
// memori komponennya sendiri, dan melepas panel dari DOM membuat isian itu
// hilang DIAM-DIAM tiap admin menengok menu lain — tanpa error, tanpa
// peringatan. Jebakan yang sama sudah pernah kena di form Tambah Drama
// (lihat app/admin/page.tsx dan tests/bagian-admin.test.ts).
import { useEffect, useState, type ReactNode } from "react";
import {
  BAGIAN_PLAYLY_BAWAAN,
  JUDUL_BAGIAN_PLAYLY,
  KETERANGAN_BAGIAN_PLAYLY,
  parseBagianPlayly,
  type BagianPlayly,
} from "@/lib/bagian-playly";

export default function PlaylyBagianAktif({
  imdb,
  isiCepat,
  unduhan,
  daftar,
}: {
  imdb: ReactNode;
  /** Nama bagiannya "isi-cepat" (dipakai sebagai hash alamat), tapi propnya
   *  ditulis tanpa tanda hubung — atribut JSX bertanda hubung sah secara
   *  sintaks tapi melewati sebagian pemeriksaan tipe, dan prop yang salah
   *  ketik lalu lolos diam-diam menghasilkan panel KOSONG tanpa error. */
  isiCepat: ReactNode;
  unduhan: ReactNode;
  daftar: ReactNode;
}) {
  const [bagian, setBagian] = useState<BagianPlayly>(BAGIAN_PLAYLY_BAWAAN);

  // Hash dibaca lewat efek, BUKAN saat render: `window` tidak ada saat HTML
  // dibuat di server. `hashchange` saja tidak cukup — mengklik menu yang
  // hash-nya SAMA dengan yang sedang dibuka tidak memicunya, sehingga menu
  // yang diklik terasa "tidak merespons". `click` menutup celah itu.
  useEffect(() => {
    const baca = () => setBagian(parseBagianPlayly(window.location.hash));
    baca();
    window.addEventListener("hashchange", baca);
    window.addEventListener("click", baca);
    return () => {
      window.removeEventListener("hashchange", baca);
      window.removeEventListener("click", baca);
    };
  }, []);

  const panel: Record<BagianPlayly, ReactNode> = {
    imdb,
    "isi-cepat": isiCepat,
    unduhan,
    daftar,
  };

  return (
    <div className="space-y-6">
      {/* Kepala bagian: penanda posisi. Tanpa ini, tiga panel yang bergantian
          di tempat yang sama sulit dibedakan sekilas. */}
      <div>
        <h2 className="text-xl font-bold text-white">
          {JUDUL_BAGIAN_PLAYLY[bagian]}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          {KETERANGAN_BAGIAN_PLAYLY[bagian]}
        </p>
      </div>

      {(Object.keys(panel) as BagianPlayly[]).map((nama) => (
        <div key={nama} className={bagian === nama ? undefined : "hidden"}>
          {panel[nama]}
        </div>
      ))}
    </div>
  );
}
