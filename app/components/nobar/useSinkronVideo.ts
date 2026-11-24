"use client";

// Menyamakan <video> dengan status Room.
//
//   HOST     → mendengarkan play/pause/seeked di videonya sendiri lalu
//              menyiarkannya, plus laporan posisi berkala (sumber koreksi).
//   PENONTON → mengikuti status: putar/jeda, dan loncat kalau selisihnya
//              melewati toleransi. Diperiksa ulang tiap detik (koreksi selisih).
import { useCallback, useEffect, useRef, useState } from "react";
import {
  INTERVAL_LAPORAN_HOST_MS,
  posisiSeharusnya,
  putuskanKoreksi,
  type AksiKontrol,
  type StatusPemutaran,
} from "@/nobar-server/src/kontrak";

/** Penonton diperiksa ulang tiap sekian ms — cukup sering untuk koreksi, cukup jarang untuk baterai. */
const INTERVAL_PERIKSA_MS = 1000;
/**
 * ⚠️ JALAN PINTAS SENGAJA: event `seeked`/`play` dari perubahan yang KITA buat
 * sendiri datang belakangan (asinkron), tak bisa dibedakan dari klik Host.
 * Selama jendela ini event Host diabaikan supaya tidak memantul jadi siaran.
 * Batasnya: klik Host tepat di jendela 800 ms itu ikut terlewat — tertutup
 * laporan berkala berikutnya (≤4 detik). Cara upgrade: tandai tiap perubahan
 * dengan nilai currentTime yang diharapkan lalu cocokkan di handler.
 */
const JENDELA_GEMA_MS = 800;

type Opsi = {
  video: HTMLVideoElement | null;
  host: boolean;
  status: StatusPemutaran | null;
  jamServer: () => number;
  kontrol: (aksi: AksiKontrol, posisi: number) => void;
  laporan: (posisi: number, main: boolean) => void;
};

export function useSinkronVideo({ video, host, status, jamServer, kontrol, laporan }: Opsi) {
  const [selisih, setSelisih] = useState<number | null>(null);
  const [dibisukanBrowser, setDibisukanBrowser] = useState(false);
  const gemaSampai = useRef(0);
  const sudahSelaras = useRef(false);
  const statusRef = useRef(status);
  // Dideklarasikan PERTAMA: efek berjalan sesuai urutan tulis, jadi efek di
  // bawah yang memanggil `terapkan` sudah membaca status terbaru.
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Elemen baru (mis. "Coba lagi" sesudah alamat basi) → perlu diselaraskan lagi.
  useEffect(() => {
    sudahSelaras.current = false;
  }, [video]);

  const terapkan = useCallback(async () => {
    const st = statusRef.current;
    if (!video || !st || video.readyState < 1) return;
    let target = posisiSeharusnya(st, jamServer());
    if (Number.isFinite(video.duration)) target = Math.min(target, video.duration);

    const koreksi = putuskanKoreksi(video.currentTime, target);
    const perluMain = st.main && !(video.ended && target >= video.duration);
    const berubah = koreksi.jenis === "loncat" || perluMain === video.paused;
    if (berubah) gemaSampai.current = Date.now() + JENDELA_GEMA_MS;
    if (koreksi.jenis === "loncat") video.currentTime = koreksi.ke;

    if (perluMain && video.paused) {
      try {
        await video.play();
      } catch {
        // Browser melarang video BERSUARA mulai tanpa sentuhan pengguna. Video
        // bisu boleh — jadi tetap ikut sinkron, lalu penonton diminta menyalakan suara.
        video.muted = true;
        setDibisukanBrowser(true);
        await video.play().catch(() => undefined);
      }
    } else if (!perluMain && !video.paused) {
      video.pause();
    }
    setSelisih(Math.abs(video.currentTime - target));
  }, [video, jamServer]);

  // HOST: siarkan aksi sendiri + laporan berkala.
  useEffect(() => {
    if (!video || !host) return;
    const siar = (aksi: AksiKontrol) => () => {
      if (Date.now() < gemaSampai.current) return;
      kontrol(aksi, video.currentTime);
    };
    const padaPutar = siar("putar");
    const padaJeda = siar("jeda");
    const padaGeser = siar("geser");
    video.addEventListener("play", padaPutar);
    video.addEventListener("pause", padaJeda);
    video.addEventListener("seeked", padaGeser);
    const t = setInterval(() => {
      if (video.readyState > 0 && Date.now() >= gemaSampai.current) laporan(video.currentTime, !video.paused);
    }, INTERVAL_LAPORAN_HOST_MS);
    return () => {
      video.removeEventListener("play", padaPutar);
      video.removeEventListener("pause", padaJeda);
      video.removeEventListener("seeked", padaGeser);
      clearInterval(t);
    };
  }, [video, host, kontrol, laporan]);

  // HOST: sekali per elemen video, ikut posisi Room dulu — Host yang memuat
  // ulang halaman (atau baru menerima peran) melanjutkan dari titik tontonan
  // bersama, bukan menyeret semua orang kembali ke detik 0.
  useEffect(() => {
    if (!video || !host || !status || sudahSelaras.current) return;
    const selaraskan = () => {
      if (sudahSelaras.current || video.readyState < 1) return;
      sudahSelaras.current = true;
      void terapkan();
    };
    selaraskan();
    video.addEventListener("loadedmetadata", selaraskan);
    return () => video.removeEventListener("loadedmetadata", selaraskan);
  }, [video, host, status, terapkan]);

  // PENONTON: ikuti tiap status baru + periksa selisih berkala.
  useEffect(() => {
    if (!video || host) return;
    void terapkan();
    const t = setInterval(() => void terapkan(), INTERVAL_PERIKSA_MS);
    const segera = () => void terapkan();
    video.addEventListener("loadedmetadata", segera);
    return () => {
      clearInterval(t);
      video.removeEventListener("loadedmetadata", segera);
    };
  }, [video, host, status, terapkan]);

  const nyalakanSuara = useCallback(() => {
    if (!video) return;
    video.muted = false;
    setDibisukanBrowser(false);
    void video.play().catch(() => undefined);
  }, [video]);

  return { selisih: host ? null : selisih, dibisukanBrowser, nyalakanSuara };
}
