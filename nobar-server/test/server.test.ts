// Tes integrasi: server sungguhan + beberapa klien Socket.IO sungguhan.
// Jalankan: `npm test` di folder nobar-server (Node ≥22.18).
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { io as sambungKlien, type Socket } from "socket.io-client";
import { buatServerNobar } from "../src/server.ts";
import { PenyimpananMemori } from "../src/penyimpanan.ts";
import { buatTiket, hashRahasia } from "../src/tiket.ts";
import { EVENT, MAKS_PESERTA, type PesertaPublik, type Snapshot } from "../src/kontrak.ts";

const RAHASIA = "rahasia-tes-yang-panjangnya-lebih-dari-32-huruf";
const ASAL = "https://dramaku.test";
const MASA_TUNGGU_HOST_MS = 300;

let alamat = "";
let server: ReturnType<typeof buatServerNobar>;
const klien: Socket[] = [];

async function internal(jalur: string, badan: unknown, kunci = RAHASIA) {
  const res = await fetch(`${alamat}${jalur}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${kunci}`, "Content-Type": "application/json" },
    body: JSON.stringify(badan),
  });
  return { kode: res.status, isi: (await res.json()) as Record<string, string> };
}

function sambung(kunci: string, opsi: { asal?: string; tiket?: string } = {}) {
  const s = sambungKlien(alamat, {
    transports: ["websocket"],
    reconnection: false,
    forceNew: true,
    extraHeaders: { origin: opsi.asal ?? ASAL },
    auth: { tiket: opsi.tiket ?? buatTiket(RAHASIA, hashRahasia(kunci)) },
  });
  klien.push(s);
  return s;
}

function tunggu<T>(s: Socket, event: string, syarat: (x: T) => boolean = () => true, ms = 2000): Promise<T> {
  return new Promise((selesai, gagal) => {
    const batas = setTimeout(() => gagal(new Error(`tak menerima "${event}" dalam ${ms} ms`)), ms);
    const dengar = (x: T) => {
      if (!syarat(x)) return;
      clearTimeout(batas);
      s.off(event, dengar);
      selesai(x);
    };
    s.on(event, dengar);
  });
}

const tidakMenerima = (s: Socket, event: string, ms = 300) =>
  new Promise<void>((selesai, gagal) => {
    const dengar = () => gagal(new Error(`"${event}" seharusnya TIDAK diterima`));
    s.once(event, dengar);
    setTimeout(() => {
      s.off(event, dengar);
      selesai();
    }, ms);
  });

async function buatRoom() {
  const { kode, isi } = await internal("/internal/ruang", { videoId: "vid_123", judul: "Film Uji", nama: "Hana", poster: null });
  assert.equal(kode, 201);
  return isi as { token: string; kunci: string };
}

async function gabung(token: string, nama: string) {
  const { kode, isi } = await internal("/internal/gabung", { token, nama });
  assert.equal(kode, 201, JSON.stringify(isi));
  return isi.kunci;
}

before(async () => {
  server = buatServerNobar({
    penyimpanan: new PenyimpananMemori(),
    rahasia: RAHASIA,
    asalDiizinkan: [ASAL],
    masaTungguHostMs: MASA_TUNGGU_HOST_MS,
    catat: () => undefined,
  });
  await new Promise<void>((ok) => server.httpServer.listen(0, "127.0.0.1", ok));
  alamat = `http://127.0.0.1:${(server.httpServer.address() as AddressInfo).port}`;
});

after(async () => {
  for (const s of klien) s.disconnect();
  await server.tutup();
});

describe("jalur internal", () => {
  it("menolak tanpa NOBAR_SECRET yang benar", async () => {
    const { kode } = await internal("/internal/ruang", { videoId: "x", judul: "y", nama: "z" }, "salah");
    assert.equal(kode, 401);
  });

  it("token tebakan → 404, bukan Room orang lain", async () => {
    const { kode } = await internal("/internal/gabung", { token: "A".repeat(43), nama: "Iseng" });
    assert.equal(kode, 404);
  });

  it(`Room penuh di ${MAKS_PESERTA} peserta`, async () => {
    const { token } = await buatRoom();
    for (let i = 1; i < MAKS_PESERTA; i++) await gabung(token, `P${i}`);
    const { kode } = await internal("/internal/gabung", { token, nama: "Kelebihan" });
    assert.equal(kode, 409);
  });
});

describe("koneksi socket", () => {
  it("tiket palsu ditolak", async () => {
    const s = sambung("", { tiket: "palsu.palsu" });
    const err = await tunggu<Error>(s, "connect_error");
    assert.equal(err.message, "tiket");
  });

  it("origin asing ditolak (anti CSWSH)", async () => {
    const { kunci } = await buatRoom();
    const s = sambung(kunci, { asal: "https://situs-jahat.test" });
    await tunggu(s, "connect_error");
    assert.equal(s.connected, false);
  });
});

describe("sinkron, izin Host, chat", () => {
  it("alur lengkap Host + 2 penonton", async () => {
    const room = await buatRoom();
    const host = sambung(room.kunci);
    const snapHost = await tunggu<Snapshot>(host, EVENT.snapshot);
    assert.equal(snapHost.saya.peran, "host");
    assert.equal(snapHost.ruang.judul, "Film Uji");

    const kunciA = await gabung(room.token, "Budi");
    const a = sambung(kunciA);
    const snapA = await tunggu<Snapshot>(a, EVENT.snapshot);
    assert.equal(snapA.saya.peran, "penonton");

    // Host memutar dari detik 10 → penonton menerima status yang sama.
    const statusDiA = tunggu<{ main: boolean; posisi: number }>(a, EVENT.status);
    host.emit(EVENT.kontrol, { aksi: "putar", posisi: 10 });
    const st = await statusDiA;
    assert.deepEqual([st.main, st.posisi], [true, 10]);

    // Penonton mencoba mengendalikan video → ditolak, status tidak berubah.
    const tolak = tunggu<{ alasan: string }>(a, EVENT.ditolak);
    const hostTakTerima = tidakMenerima(host, EVENT.status);
    a.emit(EVENT.kontrol, { aksi: "jeda", posisi: 0 });
    assert.match((await tolak).alasan, /Hanya Host/);
    await hostTakTerima;

    // Payload rusak dari Host pun ditolak (bukan menjatuhkan server).
    const tolakBentuk = tunggu<{ alasan: string }>(host, EVENT.ditolak);
    host.emit(EVENT.kontrol, { aksi: "geser", posisi: -5 });
    assert.match((await tolakBentuk).alasan, /tidak sah/);

    // Penonton yang telat masuk langsung mendapat posisi terkini dari snapshot.
    const kunciB = await gabung(room.token, "Citra");
    const b = sambung(kunciB);
    const snapB = await tunggu<Snapshot>(b, EVENT.snapshot);
    assert.equal(snapB.status.main, true);
    assert.equal(snapB.status.posisi, 10);

    // Chat: teks berbahaya disimpan apa adanya sebagai TEKS (escape terjadi di React).
    const diHost = tunggu<{ nama: string; isi: string }>(host, EVENT.pesan);
    a.emit(EVENT.chat, { isi: "  <img src=x onerror=alert(1)>‮  " });
    const m = await diHost;
    assert.equal(m.nama, "Budi");
    assert.equal(m.isi, "<img src=x onerror=alert(1)>");

    // Anti flood: pesan ke-6 dalam 10 detik ditolak.
    for (let i = 2; i <= 5; i++) a.emit(EVENT.chat, { isi: `pesan ${i}` });
    const flood = tunggu<{ alasan: string }>(a, EVENT.ditolak, (x) => /Pelan-pelan/.test(x.alasan));
    a.emit(EVENT.chat, { isi: "pesan 6" });
    await flood;

    // Pesan terlalu panjang ditolak.
    const panjang = tunggu<{ alasan: string }>(b, EVENT.ditolak);
    b.emit(EVENT.chat, { isi: "x".repeat(301) });
    assert.match((await panjang).alasan, /terlalu panjang/);

    // Host menyerahkan peran ke Budi → kini Budi yang boleh mengatur video.
    const budiHost = tunggu<PesertaPublik[]>(a, EVENT.peserta, (d) => d.find((p) => p.nama === "Budi")?.peran === "host");
    host.emit(EVENT.serahkanHost, { pesertaId: snapA.saya.id });
    await budiHost;
    const tolakHostLama = tunggu<{ alasan: string }>(host, EVENT.ditolak);
    host.emit(EVENT.kontrol, { aksi: "jeda", posisi: 1 });
    assert.match((await tolakHostLama).alasan, /Hanya Host/);

    // Host (Budi) keluar → sesudah masa tunggu, penonton online paling lama ikut jadi Host.
    const pengganti = tunggu<PesertaPublik[]>(
      b,
      EVENT.peserta,
      (d) => d.find((p) => p.peran === "host")?.nama !== "Budi",
      MASA_TUNGGU_HOST_MS + 1500,
    );
    a.disconnect();
    const daftar = await pengganti;
    assert.equal(daftar.find((p) => p.peran === "host")?.nama, "Hana");
    assert.equal(daftar.find((p) => p.nama === "Budi")?.online, false);

    // Budi kembali lewat kunci yang sama → peserta yang sama, bukan peserta baru.
    const kembali = await internal("/internal/gabung", { token: room.token, nama: "Budi", kunci: kunciA });
    assert.equal(kembali.kode, 200);

    // Host mengakhiri Room → semua menerima "berakhir", link tak bisa dipakai lagi.
    const selesai = tunggu<{ alasan: string }>(b, EVENT.berakhir);
    host.emit(EVENT.akhiri);
    await selesai;
    const telat = await internal("/internal/gabung", { token: room.token, nama: "Telat" });
    assert.equal(telat.kode, 410);
  });
});
