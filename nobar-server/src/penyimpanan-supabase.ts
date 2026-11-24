// PENYIMPANAN SUPABASE — implementasi produksi lewat PostgREST (cukup `fetch`,
// pola yang sama dengan lib/supabase.ts situs utama).
//
// 🔒 Pakai SERVICE ROLE key: tabel watch_* menyalakan RLS tanpa policy
// (supabase_migrations/2026-11-23_nonton_bareng.sql), jadi hanya kunci ini
// yang bisa menyentuhnya. Kunci hidup di env server ini SAJA.
//
// Anti SQL injection: PostgREST tidak menerima SQL mentah; nilai filter
// di-encode lewat `encodeURIComponent` dan dikirim sebagai parameter.
import type { StatusPemutaran } from "./kontrak.ts";
import type {
  AturanBersih,
  DataPesertaBaru,
  DataRuangBaru,
  Penyimpanan,
  PesanDb,
  PesertaDb,
  RuangDb,
} from "./penyimpanan.ts";

const SCHEMA = "dramaapp";
/** Batas tunggu satu permintaan ke Supabase — event socket tak boleh menggantung selamanya. */
const BATAS_TUNGGU_MS = 8000;

type BarisRuang = {
  id: string;
  invite_token_hash: string;
  playly_video_id: string;
  judul: string;
  poster: string | null;
  status: "aktif" | "berakhir";
  last_activity_at: string;
};
type BarisPeserta = {
  id: string;
  room_id: string;
  key_hash: string;
  display_name: string;
  viewer_email: string | null;
  role: "host" | "penonton";
  joined_at: string;
};
type BarisPesan = { id: number; room_id: string; participant_id: string; body: string; created_at: string };
type BarisStatus = { playing: boolean; position_sec: number; seq: number; updated_at: string };

// Kolom dipilih eksplisit (bukan `*`): kolom baru di tabel tidak ikut terbawa diam-diam.
const KOLOM_RUANG = "select=id,invite_token_hash,playly_video_id,judul,poster,status,last_activity_at";
const KOLOM_PESERTA = "select=id,room_id,key_hash,display_name,viewer_email,role,joined_at";
const KOLOM_PESAN = "select=id,room_id,participant_id,body,created_at";
const KOLOM_STATUS = "select=playing,position_sec,seq,updated_at";

const eq = (nilai: string) => `eq.${encodeURIComponent(nilai)}`;
const ms = (iso: string) => new Date(iso).getTime();
const iso = (epoch: number) => new Date(epoch).toISOString();

const keRuang = (b: BarisRuang): RuangDb => ({
  id: b.id,
  tokenHash: b.invite_token_hash,
  videoId: b.playly_video_id,
  judul: b.judul,
  poster: b.poster,
  status: b.status,
  aktivitas: ms(b.last_activity_at),
});
const kePeserta = (b: BarisPeserta): PesertaDb => ({
  id: b.id,
  ruangId: b.room_id,
  kunciHash: b.key_hash,
  nama: b.display_name,
  email: b.viewer_email,
  peran: b.role,
  bergabung: ms(b.joined_at),
});
const kePesan = (b: BarisPesan): PesanDb => ({
  id: String(b.id),
  ruangId: b.room_id,
  pesertaId: b.participant_id,
  isi: b.body,
  dikirim: ms(b.created_at),
});

export class PenyimpananSupabase implements Penyimpanan {
  private readonly dasar: string;
  private readonly kunci: string;

  constructor(url: string, kunciServiceRole: string) {
    this.dasar = `${url.replace(/\/+$/, "")}/rest/v1`;
    this.kunci = kunciServiceRole;
  }

  private async minta<T>(
    jalur: string,
    init: { method?: string; body?: unknown; prefer?: string } = {},
  ): Promise<T> {
    const res = await fetch(`${this.dasar}/${jalur}`, {
      method: init.method ?? "GET",
      headers: {
        apikey: this.kunci,
        Authorization: `Bearer ${this.kunci}`,
        "Accept-Profile": SCHEMA,
        "Content-Profile": SCHEMA,
        "Content-Type": "application/json",
        ...(init.prefer ? { Prefer: init.prefer } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(BATAS_TUNGGU_MS),
    });
    if (!res.ok) {
      // Isi balasan error dicatat terpotong — bisa memuat detail skema, bukan untuk penonton.
      const teks = (await res.text().catch(() => "")).slice(0, 300);
      throw new Error(`Supabase ${res.status} pada ${jalur.split("?")[0]}: ${teks}`);
    }
    if (res.status === 204) return undefined as T;
    const teks = await res.text();
    return (teks ? JSON.parse(teks) : undefined) as T;
  }

  async buatRuang(data: DataRuangBaru) {
    const [b] = await this.minta<BarisRuang[]>(`watch_rooms?${KOLOM_RUANG}`, {
      method: "POST",
      prefer: "return=representation",
      body: {
        invite_token_hash: data.tokenHash,
        playly_video_id: data.videoId,
        judul: data.judul,
        poster: data.poster,
      },
    });
    return keRuang(b);
  }
  async ruangDariToken(tokenHash: string) {
    const [b] = await this.minta<BarisRuang[]>(`watch_rooms?invite_token_hash=${eq(tokenHash)}&limit=1&${KOLOM_RUANG}`);
    return b ? keRuang(b) : null;
  }
  async ruangDariId(id: string) {
    const [b] = await this.minta<BarisRuang[]>(`watch_rooms?id=${eq(id)}&limit=1&${KOLOM_RUANG}`);
    return b ? keRuang(b) : null;
  }
  async catatAktivitas(ruangId: string, pada: number) {
    await this.minta(`watch_rooms?id=${eq(ruangId)}`, {
      method: "PATCH",
      body: { last_activity_at: iso(pada) },
    });
  }
  async akhiriRuang(ruangId: string, pada: number) {
    await this.minta(`watch_rooms?id=${eq(ruangId)}&status=eq.aktif`, {
      method: "PATCH",
      body: { status: "berakhir", ended_at: iso(pada) },
    });
  }

  async buatPeserta(data: DataPesertaBaru) {
    const [b] = await this.minta<BarisPeserta[]>(`watch_participants?${KOLOM_PESERTA}`, {
      method: "POST",
      prefer: "return=representation",
      body: {
        room_id: data.ruangId,
        key_hash: data.kunciHash,
        display_name: data.nama,
        viewer_email: data.email,
        role: data.peran,
      },
    });
    return kePeserta(b);
  }
  async pesertaDariKunci(kunciHash: string) {
    const [b] = await this.minta<BarisPeserta[]>(`watch_participants?key_hash=${eq(kunciHash)}&limit=1&${KOLOM_PESERTA}`);
    return b ? kePeserta(b) : null;
  }
  async daftarPeserta(ruangId: string) {
    const baris = await this.minta<BarisPeserta[]>(
      `watch_participants?room_id=${eq(ruangId)}&order=joined_at.asc&${KOLOM_PESERTA}`,
    );
    return baris.map(kePeserta);
  }
  async ubahNama(pesertaId: string, nama: string) {
    await this.minta(`watch_participants?id=${eq(pesertaId)}`, {
      method: "PATCH",
      body: { display_name: nama },
    });
  }
  async pindahHost(ruangId: string, dariId: string | null, keId: string) {
    // Dua langkah, berurutan: indeks unik "satu Host per Room" menolak dua Host
    // sekaligus. Kalau langkah kedua gagal, Room sementara tanpa Host — server
    // memilih pengganti lagi di pemeriksaan berikutnya (gagal-aman, bukan dua Host).
    if (dariId) {
      await this.minta(`watch_participants?id=${eq(dariId)}&room_id=${eq(ruangId)}`, {
        method: "PATCH",
        body: { role: "penonton" },
      });
    }
    await this.minta(`watch_participants?id=${eq(keId)}&room_id=${eq(ruangId)}`, {
      method: "PATCH",
      body: { role: "host" },
    });
  }

  async simpanPesan(data: Omit<PesanDb, "id" | "dikirim">) {
    const [b] = await this.minta<BarisPesan[]>(`watch_messages?${KOLOM_PESAN}`, {
      method: "POST",
      prefer: "return=representation",
      body: { room_id: data.ruangId, participant_id: data.pesertaId, body: data.isi },
    });
    return kePesan(b);
  }
  async pesanTerakhir(ruangId: string, jumlah: number) {
    const baris = await this.minta<BarisPesan[]>(
      `watch_messages?room_id=${eq(ruangId)}&order=id.desc&limit=${Math.trunc(jumlah)}&${KOLOM_PESAN}`,
    );
    return baris.map(kePesan).reverse();
  }

  async bacaStatus(ruangId: string) {
    const [b] = await this.minta<BarisStatus[]>(`watch_room_states?room_id=${eq(ruangId)}&limit=1&${KOLOM_STATUS}`);
    return b ? { main: b.playing, posisi: b.position_sec, seq: b.seq, pada: ms(b.updated_at) } : null;
  }
  async simpanStatus(ruangId: string, status: StatusPemutaran) {
    await this.minta("watch_room_states?on_conflict=room_id", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=minimal",
      body: {
        room_id: ruangId,
        playing: status.main,
        position_sec: status.posisi,
        seq: status.seq,
        updated_at: iso(status.pada),
      },
    });
  }

  async bersihkan(sekarang: number, aturan: AturanBersih) {
    const diakhiri = await this.minta<{ id: string }[]>(
      `watch_rooms?status=eq.aktif&last_activity_at=lt.${encodeURIComponent(iso(sekarang - aturan.diamMs))}&select=id`,
      { method: "PATCH", prefer: "return=representation", body: { status: "berakhir", ended_at: iso(sekarang) } },
    );
    // ON DELETE CASCADE di skema ikut menghapus peserta, chat, dan status Room-nya.
    const dihapus = await this.minta<{ id: string }[]>(
      `watch_rooms?status=eq.berakhir&ended_at=lt.${encodeURIComponent(iso(sekarang - aturan.simpanMs))}&select=id`,
      { method: "DELETE", prefer: "return=representation" },
    );
    return { diakhiri: diakhiri.length, dihapus: dihapus.length };
  }
}
