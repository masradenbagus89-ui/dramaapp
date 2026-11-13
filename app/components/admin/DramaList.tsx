"use client";

// Bagian "Daftar Drama" di halaman admin: daftar semua drama + tombol
// Lihat/Edit/Hapus. Dipisah dari app/admin/page.tsx. Datanya + aksi tombol
// disuplai induk lewat prop (dramas, onEdit, onDelete) supaya komponen ini
// murni menampilkan. Tampilan dirombak ke shadcn/ui (Table, Button, Badge) —
// perilaku & aksi tetap sama persis.
import Link from "next/link";
import { isMovie, type Drama } from "@/lib/types";
import { warnaKategori } from "@/app/admin/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import KotakCariDaftar from "./KotakCariDaftar";
import PaginasiDaftar from "./PaginasiDaftar";
import { useDaftarAdmin } from "./useDaftarAdmin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function DramaList({
  dramas,
  onEdit,
  onDelete,
}: {
  dramas: Drama[];
  onEdit: (drama: Drama) => void;
  onDelete: (id: string, title: string) => void;
}) {
  // Judul & kategori ikut dicari — mencari "action" atau "romance" wajar
  // dilakukan karena kategorinya tertulis di tiap baris. `id` ikut karena itu
  // yang harus sama dengan nama folder di PC backup, jadi admin kadang
  // menelusurinya dari situ.
  const daftar = useDaftarAdmin(dramas, (d) => [d.title, d.category, d.id]);

  return (
    <section id="daftar">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-white">Daftar Drama</h2>
        <KotakCariDaftar
          nilai={daftar.ketikan}
          onNilai={daftar.setKetikan}
          jumlah={daftar.tersaring.length}
          total={dramas.length}
          placeholder="Cari judul, kategori, atau ID…"
        />
      </div>
      <div className="overflow-hidden rounded-2xl border border-zinc-800">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-zinc-400">Drama</TableHead>
              <TableHead className="text-zinc-400">Kategori</TableHead>
              <TableHead className="text-right text-zinc-400">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {daftar.tampil.map((d) => (
              <TableRow
                key={d.id}
                className="border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/70"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-gradient-to-br ${d.gradient}`}>
                      {d.posterImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={d.posterImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-white">{d.title}</div>
                      <div className="text-xs text-zinc-500">
                        {isMovie(d) ? "Film" : `${d.episodes} eps`} · {d.views}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                    <span className={`mr-0.5 inline-block h-2 w-2 rounded-full ${warnaKategori(d.category)}`} />
                    {d.category}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="hidden rounded-md border-zinc-700 text-zinc-300 hover:border-amber-400 hover:text-amber-400 sm:inline-flex"
                    >
                      <Link href={`/drama/${d.id}`}>Lihat</Link>
                    </Button>
                    <Button
                      onClick={() => onEdit(d)}
                      variant="outline"
                      size="sm"
                      className="rounded-md border-amber-700 text-amber-300 hover:border-amber-400 hover:bg-amber-950/40 hover:text-amber-200"
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => onDelete(d.id, d.title)}
                      variant="outline"
                      size="sm"
                      className="rounded-md border-red-900 text-red-400 hover:border-red-500 hover:bg-red-950 hover:text-red-300"
                    >
                      Hapus
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {/* Dua sebab layar kosong, dan keduanya butuh tindakan BERBEDA:
                katalog memang kosong (tambah drama) vs ketikan tak cocok
                (ubah/kosongkan pencarian). Satu pesan untuk keduanya membuat
                admin mengira datanya hilang. */}
            {daftar.tampil.length === 0 && (
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableCell colSpan={3} className="p-6 text-center text-sm text-zinc-500">
                  {daftar.kosongKarenaCari ? (
                    <>
                      Tidak ada drama yang cocok dengan “{daftar.ketikan}”.{" "}
                      <button
                        type="button"
                        onClick={() => daftar.setKetikan("")}
                        className="text-amber-400 underline-offset-2 hover:underline"
                      >
                        Kosongkan pencarian
                      </button>
                    </>
                  ) : (
                    "Belum ada drama. Tambahkan dari form di atas."
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {daftar.tersaring.length > 0 && (
        <PaginasiDaftar
          className="mt-3"
          total={daftar.tersaring.length}
          halaman={daftar.halaman}
          ukuran={daftar.ukuran}
          onHalaman={daftar.setHalaman}
          onUkuran={daftar.setUkuran}
        />
      )}
    </section>
  );
}
