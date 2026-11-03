"use client";

import { useEffect, useRef } from "react";
import { perluRantaiSuara, terapkanSetelanSuara } from "@/lib/olah-suara";

/**
 * Menyambungkan suara <video> ke Web Audio untuk "Volume Stabil" & "Penguat
 * suara". Aturan & angkanya ada di lib/olah-suara.ts — di sini murni
 * perakitannya.
 *
 * RANTAINYA:  video → [kompresor] → [penguat] → speaker
 *
 * ⚠️ TIGA HAL YANG MERUSAK SENYAP KALAU DILANGGAR — semuanya sudah memakan
 * korban di luar sana, dan tidak satu pun memunculkan error di layar:
 *
 * 1. `createMediaElementSource` hanya boleh dipanggil SEKALI seumur hidup satu
 *    elemen <video>. Panggilan kedua melempar, dan di beberapa browser malah
 *    membuat videonya bisu permanen sampai halaman dimuat ulang. Karena itu
 *    sumber disimpan di ref dan dirakit sekali saja.
 *
 * 2. Begitu disambungkan, suara TIDAK lagi keluar lewat jalur normal — semua
 *    harus lewat AudioContext. Kalau context-nya "suspended" (browser menunggu
 *    interaksi penonton), videonya **bisu padahal gambarnya jalan**. Karena itu
 *    ada `resume()` di tiap perubahan dan saat video mulai diputar.
 *
 * 3. `bisa` WAJIB sudah bernilai true sebelum hook ini merakit apa pun. Sumber
 *    lintas domain tanpa izin CORS menghasilkan SUNYI, bukan error. Gerbangnya
 *    diputuskan di luar (PlaylyPlayer) dan hook ini tidak pernah menebak.
 */
export function useOlahSuara(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  opsi: { bisa: boolean; volumeStabil: boolean; penguatSuara: boolean },
) {
  const { bisa, volumeStabil, penguatSuara } = opsi;

  const ctxRef = useRef<AudioContext | null>(null);
  const sumberRef = useRef<MediaElementAudioSourceNode | null>(null);
  const kompresorRef = useRef<DynamicsCompressorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  /** Elemen yang sudah terlanjur disambungkan — penjaga aturan nomor 1 di atas. */
  const elemenTersambung = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    // Tidak ada yang dinyalakan = JANGAN sentuh apa pun. Merakit rantai audio
    // "untuk berjaga-jaga" berarti semua penonton melewati AudioContext
    // walaupun tak memakai fiturnya — menambah risiko bisu tanpa manfaat.
    if (!video || !perluRantaiSuara({ bisa, volumeStabil, penguatSuara })) return;

    try {
      if (!ctxRef.current) {
        const Ctx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!Ctx) return; // Browser lama tanpa Web Audio: fitur diam, video utuh.
        ctxRef.current = new Ctx();
      }
      const ctx = ctxRef.current;

      if (!sumberRef.current || elemenTersambung.current !== video) {
        // Elemen berganti (video lain diputar) sesudah rantai lama dirakit:
        // sumber lama tidak bisa dipakai ulang dan elemen baru belum pernah
        // disambungkan, jadi rakit ulang untuk elemen ini.
        sumberRef.current = ctx.createMediaElementSource(video);
        elemenTersambung.current = video;

        const kompresor = ctx.createDynamicsCompressor();
        const gain = ctx.createGain();
        kompresorRef.current = kompresor;
        gainRef.current = gain;

        sumberRef.current.connect(kompresor);
        kompresor.connect(gain);
        gain.connect(ctx.destination);
      }

      const kompresor = kompresorRef.current;
      const gain = gainRef.current;
      if (!kompresor || !gain) return;

      // Nilai setelannya diputuskan di lib/olah-suara.ts — SATU tempat, dan
      // tempat itu yang diuji (tests/olah-suara.test.ts). Mesin ini cuma
      // menerapkannya.
      terapkanSetelanSuara({ kompresor, gain }, { volumeStabil, penguatSuara });

      // Dinaikkan HALUS (0,15 detik) dari nilai yang baru saja ditetapkan,
      // bukan melompat: perubahan gain mendadak terdengar sebagai letupan di
      // speaker.
      const target = gain.gain.value;
      gain.gain.value = 1;
      gain.gain.setTargetAtTime(target, ctx.currentTime, 0.15);

      // Lihat aturan nomor 2: context yang tertidur = video bisu.
      if (ctx.state === "suspended") void ctx.resume();
      const bangunkan = () => {
        if (ctxRef.current?.state === "suspended") void ctxRef.current.resume();
      };
      video.addEventListener("play", bangunkan);
      return () => video.removeEventListener("play", bangunkan);
    } catch {
      // Gagal merakit = fitur diam saja. JANGAN melempar: pemutar yang rusak
      // gara-gara fitur tambahan jauh lebih merugikan daripada fitur yang
      // tidak menyala.
      return;
    }
  }, [videoRef, bisa, volumeStabil, penguatSuara]);

  // Tutup AudioContext saat pemutar dilepas — context yang menumpuk membuat
  // tab memakan memori dan, di Chrome, kena batas jumlah context per halaman.
  useEffect(() => {
    return () => {
      const ctx = ctxRef.current;
      ctxRef.current = null;
      sumberRef.current = null;
      kompresorRef.current = null;
      gainRef.current = null;
      elemenTersambung.current = null;
      if (ctx && ctx.state !== "closed") void ctx.close();
    };
  }, []);
}
