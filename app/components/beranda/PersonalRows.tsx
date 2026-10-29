"use client";

import { useEffect, useMemo, useState } from "react";
import type { Drama } from "@/lib/types";
import { alamatCari } from "@/lib/nav-katalog";
import { readMyList } from "@/lib/myList";
import { readHistory, type HistoryItem } from "@/lib/progress";
import {
  latestHistoryDrama,
  recommendDramas,
  similarToDrama,
  trendingInGenre,
} from "@/lib/recommend";
import ContentRow from "../ContentRow";

/**
 * Baris carousel yang isinya BEDA per penonton: lanjut menonton, drama serupa,
 * rekomendasi, favorit.
 *
 * Sengaja terpisah dari grid katalog (CatalogBrowser). Bedanya bukan gaya,
 * tapi SUMBER data: baris di sini dibaca dari localStorage browser, jadi hanya
 * bisa dihitung SESUDAH komponen menempel (mounted) — kalau digabung ke grid,
 * seluruh katalog ikut tertunda menunggu data yang cuma milik satu orang.
 *
 * Baris generik (Trending / Terbaru / Populer / Rating tertinggi) TIDAK ada di
 * sini lagi: semuanya sudah jadi pilihan "Urutkan" di grid katalog, dan dua
 * tempat yang menampilkan daftar sama hanya membuat beranda memanjang.
 */
export default function PersonalRows({
  dramas,
  hanyaLanjut = false,
  tanpaJudul = false,
}: {
  dramas: Drama[];
  /**
   * true = HANYA baris "Lanjut Menonton" yang digambar.
   *
   * Dipakai `/beranda` sejak 2026-10-28, saat halaman itu disamakan dengan
   * landing page `/`: owner memilih membuang baris saran ("Karena kamu
   * menonton", "Trending di <genre>") dan Favorit Saya, tapi MENAHAN
   * lanjut-menonton — itu satu-satunya cara penonton meneruskan episode yang
   * tertinggal di tengah tanpa harus mengingat sendiri sampai episode berapa.
   *
   * Prop, bukan komponen baru: pembacaan riwayat & pencocokan ke katalog di
   * berkas ini tetap SATU: dua salinan logika riwayat akan melenceng diam-diam.
   */
  hanyaLanjut?: boolean;
  /**
   * Lepas judul "Lanjut Menonton" dari barisnya.
   *
   * Dipakai saat baris ini berada DI DALAM `PanelLipat` yang tombolnya sudah
   * bertuliskan "Lanjutkan Menonton" (owner 2026-10-29) — tanpa ini judulnya
   * tergambar dua kali berturut-turut.
   */
  tanpaJudul?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
    const loadProgress = () => setHistory(readHistory());
    const loadSaved = () => setSaved(readMyList());
    loadProgress();
    loadSaved();
    window.addEventListener("dramaku:progress-changed", loadProgress);
    window.addEventListener("dramaku:my-list-changed", loadSaved);
    return () => {
      window.removeEventListener("dramaku:progress-changed", loadProgress);
      window.removeEventListener("dramaku:my-list-changed", loadSaved);
    };
  }, []);

  const byId = useMemo(() => new Map(dramas.map((d) => [d.id, d])), [dramas]);

  const continueWatching = useMemo(() => {
    if (!mounted) return [];
    return history
      .map((h) => byId.get(h.dramaId))
      .filter((d): d is Drama => Boolean(d));
  }, [mounted, history, byId]);

  const continueMap = useMemo(() => {
    const map: Record<string, { episode: number; positionSec: number }> = {};
    for (const h of history) {
      map[h.dramaId] = { episode: h.episode, positionSec: h.positionSec };
    }
    return map;
  }, [history]);

  const savedDramas = useMemo(() => {
    if (!mounted) return [];
    return saved.map((id) => byId.get(id)).filter((d): d is Drama => Boolean(d));
  }, [mounted, saved, byId]);

  const latestDrama = useMemo(() => {
    if (!mounted || history.length === 0) return null;
    return latestHistoryDrama(
      dramas,
      history.map((h) => h.dramaId),
    );
  }, [mounted, dramas, history]);

  const similar = useMemo(() => {
    if (!mounted || !latestDrama)
      return { base: null as Drama | null, items: [] as Drama[] };
    return similarToDrama(
      latestDrama.id,
      dramas,
      history.map((h) => h.dramaId),
      saved,
    );
  }, [mounted, latestDrama, dramas, history, saved]);

  const recommended = useMemo(() => {
    if (!mounted) return { genre: null as string | null, items: [] as Drama[] };
    return recommendDramas(
      dramas,
      history.map((h) => h.dramaId),
      saved,
    );
  }, [mounted, dramas, history, saved]);

  const trendingGenre = useMemo(() => {
    if (!mounted) return [] as Drama[];
    return trendingInGenre(recommended.genre, dramas, 12);
  }, [mounted, recommended.genre, dramas]);

  // Penonton baru (belum pernah menonton & belum menyimpan apa pun) tidak punya
  // satu baris pun di sini. Kembalikan null supaya beranda tidak menyisakan
  // jarak kosong yang tak jelas asalnya.
  if (!mounted) return null;

  return (
    <div className="space-y-7 md:space-y-9">
      {continueWatching.length > 0 && (
        <ContentRow
          title={tanpaJudul ? "" : "Lanjut Menonton"}
          subtitle={tanpaJudul ? undefined : "Teruskan dari menit terakhir"}
          dramas={continueWatching}
          continueMap={continueMap}
          href="/history"
        />
      )}

      {/* Di bawah ini baris SARAN. Semuanya dilewati saat `hanyaLanjut`. */}
      {!hanyaLanjut && similar.base && similar.items.length > 0 && (
        <ContentRow
          title={`Karena kamu menonton ${similar.base.title}`}
          subtitle="Drama serupa yang belum kamu tonton"
          accent={similar.base.category}
          dramas={similar.items}
          href="/discover"
        />
      )}

      {/* ⚠️ BARIS "Rekomendasi Untuk Kamu" DIHAPUS (owner 2026-09-26: "ada 2
          rekomendasi, jadikan satu saja pilih salah satu").

          Kenapa YANG INI yang dilepas, bukan tabnya: baris tab REKOMENDASI
          adalah bentuk yang owner minta ditiru dari situs katalog pembanding,
          dan di katalog 35 judul kedua daftar ini praktis sama isinya —
          "rating tertinggi" dan "saran dari riwayat tontonan" menghasilkan
          poster yang itu-itu juga, jadi penonton melihat dua bagian kembar.

          Yang HILANG dan harus diketahui: saran yang menyesuaikan diri dengan
          tontonan tiap penonton. Kalau suatu hari katalog sudah besar dan
          keduanya tak lagi kembar, baris ini layak dihidupkan lagi — dengan
          NAMA yang berbeda dari tabnya. `recommended` sengaja TIDAK ikut
          dihapus: nilainya masih dipakai baris "Trending di <genre>" di bawah.
          Penjaganya: tests/tab-katalog-beranda.test.ts. */}

      {!hanyaLanjut && trendingGenre.length > 0 && recommended.genre && (
        <ContentRow
          title={`Trending di ${recommended.genre}`}
          subtitle="Paling banyak ditonton di genre favoritmu"
          accent={recommended.genre}
          dramas={trendingGenre}
          href={alamatCari(recommended.genre)}
        />
      )}

      {!hanyaLanjut && savedDramas.length > 0 && (
        <ContentRow title="Favorit Saya" dramas={savedDramas} href="/my-list" />
      )}
    </div>
  );
}
